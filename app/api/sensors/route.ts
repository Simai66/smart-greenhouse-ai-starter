import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devices, edgeAgents, greenhouses, sensorConfigs, sensorReadings } from "@/db/schema";
import { authorizeApiRole } from "@/lib/server/access-control";
import { parseSensorConfigInput, sensorCapabilities, sensorConfigPayload } from "@/lib/server/sensor-config";

function greenhouseIdFrom(request: Request): string | null {
  const value = new URL(request.url).searchParams.get("greenhouseId");
  return value && value.length <= 64 ? value : null;
}

async function sensorRows(greenhouseId: string) {
  const db = getDb();
  const rows = await db.select().from(sensorConfigs).where(eq(sensorConfigs.greenhouseId, greenhouseId)).all();
  return Promise.all(rows.map(async (row) => {
    const device = await db.select({ agentId: devices.agentId }).from(devices).where(eq(devices.id, row.sensorId)).limit(1).get();
    const latest = await db.select().from(sensorReadings)
      .where(and(eq(sensorReadings.sensorId, row.sensorId), eq(sensorReadings.greenhouseId, greenhouseId)))
      .orderBy(desc(sensorReadings.sampledAt))
      .limit(1)
      .get();
    return sensorConfigPayload(row, latest ?? null, device?.agentId ?? null);
  }));
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const greenhouseId = greenhouseIdFrom(request);
  if (!greenhouseId) return Response.json({ error: "greenhouseId is required." }, { status: 400 });
  try {
    return Response.json({ greenhouseId, collectedAt: new Date().toISOString(), sensors: await sensorRows(greenhouseId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Sensor configuration is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  let payload: unknown;
  try { payload = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = parseSensorConfigInput(payload);
  if (!parsed.value) return Response.json({ error: parsed.error }, { status: 400 });
  const value = parsed.value;
  const now = new Date().toISOString();
  try {
    const db = getDb();
    if (!await db.select({ id: greenhouses.id }).from(greenhouses).where(eq(greenhouses.id, value.greenhouseId)).limit(1).get()) return Response.json({ error: "Greenhouse was not found." }, { status: 404 });
    if (await db.select({ sensorId: sensorConfigs.sensorId }).from(sensorConfigs).where(eq(sensorConfigs.sensorId, value.sensorId)).limit(1).get()) return Response.json({ error: "Sensor is already registered." }, { status: 409 });
    const existing = await db.select().from(devices).where(eq(devices.id, value.sensorId)).limit(1).get();
    if (existing && existing.greenhouseId !== value.greenhouseId) return Response.json({ error: "Sensor is registered to another greenhouse." }, { status: 409 });
    if (existing && existing.category.toLowerCase() !== "sensor") return Response.json({ error: "A non-sensor device already uses this ID." }, { status: 409 });
    if (value.agentId && !await db.select({ id: edgeAgents.id }).from(edgeAgents).where(and(eq(edgeAgents.id, value.agentId), eq(edgeAgents.greenhouseId, value.greenhouseId))).limit(1).get()) return Response.json({ error: "Agent is not registered for this greenhouse." }, { status: 400 });
    const agentId = value.agentId ?? existing?.agentId ?? null;
    if (existing && existing.agentId && value.agentId && existing.agentId !== value.agentId) return Response.json({ error: "Sensor is assigned to another agent." }, { status: 409 });
    if (existing) {
      await db.update(devices).set({ name: value.name, category: "sensor", agentId, capabilitiesJson: JSON.stringify(sensorCapabilities(value.metric, value.unit)), updatedAt: now }).where(eq(devices.id, value.sensorId)).run();
    } else {
      await db.insert(devices).values({ id: value.sensorId, greenhouseId: value.greenhouseId, agentId, name: value.name, category: "sensor", capabilitiesJson: JSON.stringify(sensorCapabilities(value.metric, value.unit)), reportedStatus: "offline", updatedAt: now }).run();
    }
    const row = {
      sensorId: value.sensorId,
      greenhouseId: value.greenhouseId,
      name: value.name,
      metric: value.metric,
      unit: value.unit,
      samplingIntervalSeconds: value.samplingIntervalSeconds,
      calibrationScale: String(value.calibration.scale),
      calibrationOffset: String(value.calibration.offset),
      enabled: value.enabled,
      minThreshold: value.thresholds.min === null ? null : String(value.thresholds.min),
      maxThreshold: value.thresholds.max === null ? null : String(value.thresholds.max),
      configVersion: 1,
      createdBy: authorization.user.email,
      updatedBy: authorization.user.email,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(sensorConfigs).values(row).run();
    return Response.json({ sensor: sensorConfigPayload(row, null, agentId) }, { status: 201 });
  } catch {
    return Response.json({ error: "Sensor configuration could not be stored." }, { status: 503 });
  }
}
