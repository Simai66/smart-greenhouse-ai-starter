import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function load(path, mocks) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, require: (id) => mocks[id], crypto, Response, URL, TextEncoder, Date, Map, Set, Number, String, JSON, Math });
  return exports;
}

test("telemetry reading and threshold alert commit or roll back together and retries repair nothing twice", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(`CREATE TABLE devices (id TEXT, greenhouse_id TEXT, agent_id TEXT, capabilities_json TEXT);
      INSERT INTO devices VALUES ('SEN-01', 'GH-01', 'PI-GH-01', '{"sensor":true,"metrics":["temperature"],"units":["celsius"]}');
      CREATE TABLE sensor_configs (sensor_id TEXT, greenhouse_id TEXT, name TEXT, metric TEXT, unit TEXT, min_threshold TEXT, max_threshold TEXT, config_version INTEGER);
      INSERT INTO sensor_configs VALUES ('SEN-01', 'GH-01', 'Temp', 'temperature', 'celsius', '18', '35', 1);
      CREATE TABLE sensor_readings (id TEXT PRIMARY KEY, reading_id TEXT UNIQUE, greenhouse_id TEXT, sensor_id TEXT, metric TEXT, value TEXT, unit TEXT, sampled_at TEXT, received_at TEXT, quality TEXT, config_version INTEGER);
      CREATE TABLE alerts (id TEXT PRIMARY KEY, greenhouse_id TEXT, source TEXT, severity TEXT, title TEXT, status TEXT, opened_at TEXT, resolved_at TEXT, resolved_by TEXT);`);

    const env = { DB: {
      prepare(sql) { return { bind(...params) { return { sql, params }; } }; },
      batch(statements) {
        sqlite.exec("BEGIN IMMEDIATE");
        try {
          const result = statements.map(({ sql, params }) => {
            const statement = sqlite.prepare(sql);
            if (/^\s*SELECT\b/.test(sql)) statement.get(...params);
            else statement.run(...params);
            return { meta: { changes: sqlite.prepare("SELECT changes() AS changes").get().changes } };
          });
          sqlite.exec("COMMIT");
          return result;
        } catch (error) {
          sqlite.exec("ROLLBACK");
          throw error;
        }
      },
    } };
    const db = {
      select() {
        let table;
        let filters = [];
        const query = {
          from(value) { table = value; return query; },
          where(value) { filters = Array.isArray(value) ? value : [value]; return query; },
          all() {
            const names = filters.map(({ column }) => column.name);
            const values = filters.map(({ value }) => value);
            if (table.name === "devices") return sqlite.prepare("SELECT id, capabilities_json AS capabilitiesJson FROM devices WHERE greenhouse_id = ? AND agent_id = ?").all(...values);
            if (table.name === "sensor_configs") return sqlite.prepare("SELECT sensor_id AS sensorId, greenhouse_id AS greenhouseId, name, metric, unit, min_threshold AS minThreshold, max_threshold AS maxThreshold, config_version AS configVersion FROM sensor_configs WHERE greenhouse_id = ?").all(...values);
            throw new Error(`Unexpected table ${table.name}: ${names}`);
          },
        };
        return query;
      },
    };
    const column = (table, name) => ({ table, name });
    const schema = {
      devices: { name: "devices", id: column("devices", "id"), greenhouseId: column("devices", "greenhouse_id"), agentId: column("devices", "agent_id"), capabilitiesJson: column("devices", "capabilities_json") },
      sensorConfigs: { name: "sensor_configs", sensorId: column("sensor_configs", "sensor_id"), greenhouseId: column("sensor_configs", "greenhouse_id") },
      sensorReadings: {},
    };
    let authenticated = { agentId: "PI-GH-01", rawBody: "" };
    const route = load("../app/api/agent/telemetry/route.ts", {
      "drizzle-orm": { and: (...conditions) => conditions, eq: (column, value) => ({ column, value }) },
      "cloudflare:workers": { env },
      "@/db": { getDb: () => db, getD1: () => env.DB },
      "@/db/schema": schema,
      "@/lib/server/agent-registry": { assertRegisteredAgent: async () => null, markAgentOnline: async () => {} },
      "@/lib/server/agent-auth": { authenticateAgentRequest: async () => authenticated, jsonBody: (raw) => JSON.parse(raw) },
      "@/lib/server/sensor-telemetry": {
        deterministicReadingId: async (value) => `reading-${value}`,
        isFiniteNumber: (value) => typeof value === "number" && Number.isFinite(value),
        isSensorMetric: (value) => value === "temperature",
        isSensorQuality: (value) => ["valid", "suspect", "invalid"].includes(value),
        isValidReadingId: (value) => typeof value === "string" && value.length > 2,
        isValidSensorId: (value) => value === "SEN-01",
        isOutsideThreshold: (value, { min, max }) => (min !== null && value < min) || (max !== null && value > max),
        MAX_TELEMETRY_AGE_MS: 86_400_000,
        MAX_TELEMETRY_FUTURE_MS: 300_000,
        SENSOR_UNITS: { temperature: "celsius" },
      },
    });

    const makeRequest = (readingId, value, quality = "valid") => new Request("https://greenhouse.invalid/api/agent/telemetry", {
      method: "POST",
      body: JSON.stringify({ greenhouseId: "GH-01", agentId: "PI-GH-01", readings: [{ readingId, sensorId: "SEN-01", metric: "temperature", value, unit: "celsius", sampledAt: new Date().toISOString(), quality }] }),
    });
    const post = async (readingId, value, quality) => {
      const request = makeRequest(readingId, value, quality);
      authenticated = { agentId: "PI-GH-01", rawBody: await request.clone().text() };
      return route.POST(request);
    };

    sqlite.exec("CREATE TRIGGER fail_alert BEFORE INSERT ON alerts BEGIN SELECT RAISE(ABORT, 'alert storage failure'); END");
    assert.equal((await post("reading-001", 10)).status, 503);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM sensor_readings").get().n, 0);
    sqlite.exec("DROP TRIGGER fail_alert");

    const accepted = await post("reading-001", 10);
    assert.equal(accepted.status, 202);
    const acceptedBody = await accepted.json();
    assert.equal(acceptedBody.accepted, 1);
    assert.equal(acceptedBody.duplicates, 0);
    assert.ok(acceptedBody.receivedAt);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM alerts WHERE status = 'open'").get().n, 1);
    const duplicate = await post("reading-001", 10);
    const duplicateBody = await duplicate.json();
    assert.equal(duplicateBody.accepted, 0);
    assert.equal(duplicateBody.duplicates, 1);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM alerts WHERE status = 'open'").get().n, 1);

    const recovered = await post("reading-002", 25);
    assert.equal(recovered.status, 202);
    assert.equal(sqlite.prepare("SELECT status FROM alerts").get().status, "resolved");
  } finally {
    sqlite.close();
  }
});
