import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devices, sensorConfigs, sensorReadings } from "@/db/schema";
import { authorizeApiRole } from "@/lib/server/access-control";
import { parseSensorConfigInput, sensorCapabilities, sensorConfigPayload } from "@/lib/server/sensor-config";
import type { SensorMetric } from "@/lib/server/sensor-telemetry";

export async function PUT(request: Request, context: { params: Promise<{ sensorId: string }> }) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  const { sensorId } = await context.params;
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  try {
    const db = getDb();
    const current = await db.select().from(sensorConfigs).where(eq(sensorConfigs.sensorId, sensorId)).limit(1).get();
    if (!current) return Response.json({ error: "Sensor was not found." }, { status: 404 });
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "Request body must be an object." }, { status: 400 });
    const body = payload as Record<string, unknown>;
    if (body.greenhouseId !== undefined && body.greenhouseId !== current.greenhouseId) return Response.json({ error: "Sensor cannot move between greenhouses." }, { status: 409 });
    const parsed = parseSensorConfigInput({ ...body, greenhouseId: current.greenhouseId, sensorId }, {
      greenhouseId: current.greenhouseId,
      sensorId,
      name: current.name,
      metric: current.metric as SensorMetric,
      unit: current.unit,
      samplingIntervalSeconds: current.samplingIntervalSeconds,
      calibration: { scale: Number(current.calibrationScale), offset: Number(current.calibrationOffset) },
      thresholds: { min: current.minThreshold === null ? null : Number(current.minThreshold), max: current.maxThreshold === null ? null : Number(current.maxThreshold) },
      enabled: current.enabled,
    });
    if (!parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
    const value = parsed.value;
    const now = new Date().toISOString();
    const device = await db.select({ agentId: devices.agentId }).from(devices).where(and(eq(devices.id, sensorId), eq(devices.greenhouseId, current.greenhouseId))).limit(1).get();
    if (!device) return Response.json({ error: "Sensor registry entry was not found." }, { status: 409 });
    if (body.agentId !== undefined && body.agentId !== device.agentId) return Response.json({ error: "Sensor agent assignment is managed during registration." }, { status: 409 });
    await db.update(sensorConfigs).set({ name: value.name, metric: value.metric, unit: value.unit, samplingIntervalSeconds: value.samplingIntervalSeconds, calibrationScale: String(value.calibration.scale), calibrationOffset: String(value.calibration.offset), enabled: value.enabled, minThreshold: value.thresholds.min === null ? null : String(value.thresholds.min), maxThreshold: value.thresholds.max === null ? null : String(value.thresholds.max), configVersion: current.configVersion + 1, updatedBy: authorization.user.email, updatedAt: now }).where(eq(sensorConfigs.sensorId, sensorId)).run();
    await db.update(devices).set({ name: value.name, capabilitiesJson: JSON.stringify(sensorCapabilities(value.metric, value.unit)), updatedAt: now }).where(eq(devices.id, sensorId)).run();
    const updated = { ...current, name: value.name, metric: value.metric, unit: value.unit, samplingIntervalSeconds: value.samplingIntervalSeconds, calibrationScale: String(value.calibration.scale), calibrationOffset: String(value.calibration.offset), enabled: value.enabled, minThreshold: value.thresholds.min === null ? null : String(value.thresholds.min), maxThreshold: value.thresholds.max === null ? null : String(value.thresholds.max), configVersion: current.configVersion + 1, updatedBy: authorization.user.email, updatedAt: now };
    const latest = await db.select().from(sensorReadings).where(and(eq(sensorReadings.sensorId, sensorId), eq(sensorReadings.greenhouseId, current.greenhouseId))).orderBy(desc(sensorReadings.sampledAt)).limit(1).get();
    return Response.json({ sensor: sensorConfigPayload(updated, latest ?? null, device.agentId) });
  } catch {
    return Response.json({ error: "Sensor configuration could not be updated." }, { status: 503 });
  }
}
