import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function batch(db, statements) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const results = statements.map(([sql, params]) => {
      db.prepare(sql).run(...params);
      return db.prepare("SELECT changes() AS changes").get().changes;
    });
    db.exec("COMMIT");
    return results;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

const acknowledge = (db, commandId, state, occurredAt) => batch(db, [
  ["UPDATE device_commands SET state = ?, acknowledged_at = ? WHERE id = ? AND state IN ('requested', 'dispatched') AND (expires_at IS NULL OR expires_at > ?)", [state, occurredAt, commandId, occurredAt]],
  ["INSERT INTO device_command_events (id, command_id, state, occurred_at) SELECT ?, ?, ?, ? WHERE changes() = 1", [`event-${state}`, commandId, state, occurredAt]],
]);

test("command state and audit event commit atomically; terminal ACK cannot be overwritten", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(`CREATE TABLE device_commands (id TEXT PRIMARY KEY, state TEXT NOT NULL, acknowledged_at TEXT, expires_at TEXT);
      CREATE TABLE device_command_events (id TEXT PRIMARY KEY, command_id TEXT NOT NULL, state TEXT NOT NULL, occurred_at TEXT NOT NULL);
      INSERT INTO device_commands VALUES ('cmd-1', 'requested', NULL, '2099-01-01T00:00:00.000Z');
      CREATE TRIGGER reject_event BEFORE INSERT ON device_command_events BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END;`);

    assert.throws(() => acknowledge(db, "cmd-1", "acknowledged", "2026-11-02T00:00:00.000Z"), /audit unavailable/);
    assert.equal(db.prepare("SELECT state FROM device_commands WHERE id = 'cmd-1'").get().state, "requested");
    assert.equal(db.prepare("SELECT count(*) AS count FROM device_command_events").get().count, 0);

    db.exec("DROP TRIGGER reject_event");
    assert.deepEqual(acknowledge(db, "cmd-1", "acknowledged", "2026-11-02T00:00:00.000Z"), [1, 1]);
    assert.deepEqual(acknowledge(db, "cmd-1", "failed", "2026-11-02T00:00:01.000Z"), [0, 0]);
    assert.equal(db.prepare("SELECT state FROM device_commands WHERE id = 'cmd-1'").get().state, "acknowledged");
    assert.deepEqual(db.prepare("SELECT state FROM device_command_events").all().map((row) => row.state), ["acknowledged"]);
  } finally {
    db.close();
  }
});

test("all command lifecycle routes use D1 batch for state plus audit writes", () => {
  for (const path of [
    "../app/api/device-commands/route.ts",
    "../app/api/agent/commands/route.ts",
    "../app/api/agent/commands/[commandId]/ack/route.ts",
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(source, /getD1\(\)\.batch\(/, path);
    assert.match(source, /WHERE changes\(\) = 1/, path);
  }
});
