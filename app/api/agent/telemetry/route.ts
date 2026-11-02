import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "@/db";
import { devices, sensorConfigs, sensorReadings } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";
import { deterministicReadingId, isFiniteNumber, isSensorMetric, isSensorQuality, isValidReadingId, isValidSensorId, isOutsideThreshold, MAX_TELEMETRY_AGE_MS, MAX_TELEMETRY_FUTURE_MS, SENSOR_UNITS } from "@/lib/server/sensor-telemetry";

type TelemetryReading = {
  readingId?: unknown;
  sensorId?: unknown;
  metric?: unknown;
  value?: unknown;
  unit?: unknown;
  sampledAt?: unknown;
  quality?: unknown;
  configVersion?: unknown;
};

type TelemetryPayload = { greenhouseId?: unknown; agentId?: unknown; readings?: TelemetryReading[] };

function validString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function capabilitiesSupport(raw: string, metric: string, unit: string): boolean {
  try {
    const capabilities = JSON.parse(raw) as { sensor?: unknown; metrics?: unknown; units?: unknown };
    if (capabilities.sensor === false) return false;
    if (capabilities.sensor !== true && !Array.isArray(capabilities.metrics) && !Array.isArray(capabilities.units)) return false;
    if (Array.isArray(capabilities.metrics) && !capabilities.metrics.includes(metric)) return false;
    if (Array.isArray(capabilities.units) && !capabilities.units.includes(unit)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<TelemetryPayload>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  if (!validString(payload.greenhouseId, 64) || payload.agentId !== authenticated.agentId || !Array.isArray(payload.readings) || payload.readings.length === 0 || payload.readings.length > 100) {
    return Response.json({ error: "Invalid telemetry envelope." }, { status: 400 });
  }

  const now = new Date();
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, payload.greenhouseId);
    if (forbidden) return forbidden;
    const db = getDb();
    const registeredDevices = await db.select({ id: devices.id, capabilitiesJson: devices.capabilitiesJson }).from(devices).where(and(eq(devices.greenhouseId, payload.greenhouseId), eq(devices.agentId, authenticated.agentId))).all();
    const deviceMap = new Map(registeredDevices.map((device) => [device.id, device]));
    const configs = await db.select().from(sensorConfigs).where(eq(sensorConfigs.greenhouseId, payload.greenhouseId)).all();
    const configMap = new Map(configs.map((config) => [config.sensorId, config]));
    const values: Array<typeof sensorReadings.$inferInsert> = [];
    const thresholdChecks: Array<{ readingId: string; sensorId: string; name: string; breached: boolean }> = [];

    for (const reading of payload.readings) {
      const sensorId = reading.sensorId;
      const metric = reading.metric;
      const unit = reading.unit;
      const sampledAt = typeof reading.sampledAt === "string" ? Date.parse(reading.sampledAt) : Number.NaN;
      if (!isValidSensorId(sensorId) || !isSensorMetric(metric) || typeof unit !== "string" || unit !== SENSOR_UNITS[metric] || !isFiniteNumber(reading.value) || !isSensorQuality(reading.quality) || !Number.isFinite(sampledAt) || sampledAt < now.getTime() - MAX_TELEMETRY_AGE_MS || sampledAt > now.getTime() + MAX_TELEMETRY_FUTURE_MS) {
        return Response.json({ error: "A telemetry reading is invalid, stale, or from the future." }, { status: 400 });
      }
      const device = deviceMap.get(sensorId);
      const config = configMap.get(sensorId);
      if (!device || !config) return Response.json({ error: "Telemetry contains an unregistered sensor." }, { status: 403 });
      if (!capabilitiesSupport(device.capabilitiesJson, metric, unit) || config.metric !== metric || config.unit !== unit) return Response.json({ error: "Telemetry metric or unit does not match the registered sensor capability." }, { status: 400 });
      if (reading.configVersion !== undefined && (!Number.isInteger(reading.configVersion) || (reading.configVersion as number) < 1)) return Response.json({ error: "configVersion must be a positive integer." }, { status: 400 });
      if (reading.readingId !== undefined && !isValidReadingId(reading.readingId)) return Response.json({ error: "readingId is invalid." }, { status: 400 });
      const normalizedSampledAt = new Date(sampledAt).toISOString();
      const readingId = isValidReadingId(reading.readingId)
        ? reading.readingId
        : await deterministicReadingId([authenticated.agentId, sensorId, metric, unit, normalizedSampledAt, String(reading.value)].join("\u001f"));
      values.push({ id: crypto.randomUUID(), readingId, greenhouseId: payload.greenhouseId, sensorId, metric, value: String(reading.value), unit, sampledAt: normalizedSampledAt, receivedAt: now.toISOString(), quality: reading.quality, configVersion: reading.configVersion as number | undefined });
      const min = config.minThreshold === null ? null : Number(config.minThreshold);
      const max = config.maxThreshold === null ? null : Number(config.maxThreshold);
      if (reading.quality !== "invalid") {
        thresholdChecks.push({ readingId, sensorId, name: config.name, breached: isOutsideThreshold(reading.value, { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null }) });
      }
    }

    const thresholdChecksByReadingId = new Map<string, (typeof thresholdChecks)[number]>();
    for (const check of thresholdChecks) if (!thresholdChecksByReadingId.has(check.readingId)) thresholdChecksByReadingId.set(check.readingId, check);
    const thresholdByReadingId = new Map<string, (typeof thresholdChecks)[number] | null>();
    for (const value of values) if (!thresholdByReadingId.has(value.readingId ?? "")) thresholdByReadingId.set(value.readingId ?? "", thresholdChecksByReadingId.get(value.readingId ?? "") ?? null);
    const statements = values.flatMap((value) => {
      const readingId = value.readingId ?? "";
      const reading = getD1().prepare("INSERT INTO sensor_readings (id, reading_id, greenhouse_id, sensor_id, metric, value, unit, sampled_at, received_at, quality, config_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(reading_id) DO NOTHING")
        .bind(value.id, value.readingId, value.greenhouseId, value.sensorId, value.metric, value.value, value.unit, value.sampledAt, value.receivedAt, value.quality, value.configVersion ?? null);
      const check = thresholdByReadingId.get(readingId);
      if (!check) return [reading, getD1().prepare("SELECT changes()")];
      const source = `sensor-threshold:${check.sensorId}`;
      const alert = check.breached
        ? getD1().prepare("INSERT INTO alerts (id, greenhouse_id, source, severity, title, status, opened_at, resolved_at, resolved_by) SELECT ?, ?, ?, 'warning', ?, 'open', ?, NULL, NULL WHERE changes() = 1 AND NOT EXISTS (SELECT 1 FROM alerts WHERE greenhouse_id = ? AND source = ? AND status = 'open')")
          .bind(crypto.randomUUID(), payload.greenhouseId, source, `${check.name} อยู่นอกเกณฑ์ที่ตั้งไว้`, now.toISOString(), payload.greenhouseId, source)
        : getD1().prepare("UPDATE alerts SET status = 'resolved', resolved_at = ?, resolved_by = 'system:sensor-threshold' WHERE greenhouse_id = ? AND source = ? AND status = 'open' AND changes() = 1")
          .bind(now.toISOString(), payload.greenhouseId, source);
      return [reading, alert];
    });
    const results: Array<{ meta?: { changes?: number } }> = statements.length ? await getD1().batch(statements) : [];
    const accepted = results.reduce((total, result, index) => total + (index % 2 === 0 ? result.meta?.changes ?? 0 : 0), 0);
    await markAgentOnline(authenticated.agentId, now.toISOString());
    return Response.json({ accepted, duplicates: values.length - accepted, receivedAt: now.toISOString() }, { status: 202 });
  } catch {
    return Response.json({ error: "Telemetry storage is temporarily unavailable." }, { status: 503 });
  }
}
