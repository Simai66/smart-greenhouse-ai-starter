import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { alerts, devices, sensorConfigs, sensorReadings } from "@/db/schema";
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

async function ensureThresholdAlert(
  greenhouseId: string,
  sensorId: string,
  sensorName: string,
  breached: boolean,
  occurredAt: string,
) {
  const db = getDb();
  const source = `sensor-threshold:${sensorId}`;
  const open = await db.select({ id: alerts.id }).from(alerts).where(and(eq(alerts.greenhouseId, greenhouseId), eq(alerts.source, source), eq(alerts.status, "open"))).limit(1).get();
  if (breached && !open) {
    await db.insert(alerts).values({ id: crypto.randomUUID(), greenhouseId, source, severity: "warning", title: `${sensorName} อยู่นอกเกณฑ์ที่ตั้งไว้`, status: "open", openedAt: occurredAt, resolvedAt: null, resolvedBy: null }).run();
  } else if (!breached && open) {
    await db.update(alerts).set({ status: "resolved", resolvedAt: occurredAt, resolvedBy: "system:sensor-threshold" }).where(eq(alerts.id, open.id)).run();
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
    const readingIds: string[] = [];

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
      readingIds.push(readingId);
      values.push({ id: crypto.randomUUID(), readingId, greenhouseId: payload.greenhouseId, sensorId, metric, value: String(reading.value), unit, sampledAt: normalizedSampledAt, receivedAt: now.toISOString(), quality: reading.quality, configVersion: reading.configVersion as number | undefined });
      const min = config.minThreshold === null ? null : Number(config.minThreshold);
      const max = config.maxThreshold === null ? null : Number(config.maxThreshold);
      if (reading.quality !== "invalid") {
        thresholdChecks.push({ readingId, sensorId, name: config.name, breached: isOutsideThreshold(reading.value, { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null }) });
      }
    }

    const existing = readingIds.length ? await db.select({ readingId: sensorReadings.readingId }).from(sensorReadings).where(inArray(sensorReadings.readingId, readingIds)).all() : [];
    const existingIds = new Set(existing.map((row) => row.readingId).filter((value): value is string => Boolean(value)));
    const insertedIds = new Set<string>();
    const newValues = values.filter((value) => {
      const readingId = value.readingId ?? "";
      if (existingIds.has(readingId) || insertedIds.has(readingId)) return false;
      insertedIds.add(readingId);
      return true;
    });
    if (newValues.length) await db.insert(sensorReadings).values(newValues).onConflictDoNothing({ target: sensorReadings.readingId }).run();
    const checkedReadingIds = new Set<string>();
    for (const check of thresholdChecks) {
      if (insertedIds.has(check.readingId) && !checkedReadingIds.has(check.readingId)) {
        checkedReadingIds.add(check.readingId);
        await ensureThresholdAlert(payload.greenhouseId, check.sensorId, check.name, check.breached, now.toISOString());
      }
    }
    await markAgentOnline(authenticated.agentId, now.toISOString());
    return Response.json({ accepted: newValues.length, duplicates: values.length - newValues.length, receivedAt: now.toISOString() }, { status: 202 });
  } catch {
    return Response.json({ error: "Telemetry storage is temporarily unavailable." }, { status: 503 });
  }
}
