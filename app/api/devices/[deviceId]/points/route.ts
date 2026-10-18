import { and, asc, eq, isNull } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { devices, edgeAgents, greenhouses, measurementPoints, plantAssignments, plants, sensorConfigs } from "@/db/schema";
import { isDeviceIdentity, isMeasurementPortKey, measurementPointId } from "@/lib/measurement-identity";
import { authorizeApiRole } from "@/lib/server/access-control";
import { apiError } from "@/lib/server/api-error";

async function loadPoints(deviceId: string, greenhouseId: string) {
  const db = getDb();
  const device = await db.select().from(devices).where(and(eq(devices.id, deviceId), eq(devices.greenhouseId, greenhouseId))).limit(1).get();
  if (!device || device.category !== "sensor-node") return null;
  const points = await db.select().from(measurementPoints).where(and(eq(measurementPoints.deviceId, deviceId), eq(measurementPoints.greenhouseId, greenhouseId))).orderBy(asc(measurementPoints.portKey)).all();
  const result = await Promise.all(points.map(async (point) => {
    const [active, channels] = await Promise.all([
      db.select({ plantId: plantAssignments.plantId, displayName: plants.displayName, assignedAt: plantAssignments.assignedAt })
        .from(plantAssignments).innerJoin(plants, eq(plants.id, plantAssignments.plantId))
        .where(and(eq(plantAssignments.pointId, point.id), eq(plantAssignments.greenhouseId, greenhouseId), eq(plants.greenhouseId, greenhouseId), isNull(plantAssignments.unassignedAt))).limit(1).get(),
      db.select({ sensorId: sensorConfigs.sensorId, name: sensorConfigs.name, metric: sensorConfigs.metric, unit: sensorConfigs.unit, enabled: sensorConfigs.enabled })
        .from(sensorConfigs).where(eq(sensorConfigs.measurementPointId, point.id)).all(),
    ]);
    return { ...point, assignment: active ?? null, channels };
  }));
  return { device: { id: device.id, greenhouseId, agentId: device.agentId, assignmentVersion: device.assignmentVersion }, points: result };
}

export async function GET(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const { deviceId } = await context.params;
  const greenhouseId = new URL(request.url).searchParams.get("greenhouseId");
  if (!greenhouseId || !isDeviceIdentity(deviceId)) return apiError("INVALID_SCOPE", "Valid deviceId and greenhouseId are required.", 400);
  try {
    const result = await loadPoints(deviceId, greenhouseId);
    if (!result) return apiError("DEVICE_NOT_FOUND", "Registered sensor node was not found.", 404);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("POINTS_UNAVAILABLE", "Measurement points are temporarily unavailable.", 503);
  }
}

export async function POST(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  const { deviceId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Request body must be valid JSON.", 400); }
  if (!isDeviceIdentity(deviceId) || !body || typeof body !== "object" || Array.isArray(body)) return apiError("INVALID_BODY", "Valid deviceId and request body are required.", 400);
  const value = body as Record<string, unknown>;
  const greenhouseId = value.greenhouseId;
  const agentId = value.agentId;
  if (typeof greenhouseId !== "string" || greenhouseId.length > 64 || typeof agentId !== "string" || !/^[A-Z0-9_-]{3,64}$/.test(agentId) || (value.portKeys !== undefined && (!Array.isArray(value.portKeys) || value.portKeys.length !== 2 || new Set(value.portKeys).size !== 2 || !value.portKeys.every(isMeasurementPortKey)))) {
    return apiError("INVALID_NODE", "greenhouseId, registered agentId, and ports A/B are required.", 400);
  }
  const now = new Date().toISOString();
  try {
    const db = getDb();
    const [greenhouse, agent, existing] = await Promise.all([
      db.select({ id: greenhouses.id }).from(greenhouses).where(eq(greenhouses.id, greenhouseId)).limit(1).get(),
      db.select({ id: edgeAgents.id }).from(edgeAgents).where(and(eq(edgeAgents.id, agentId), eq(edgeAgents.greenhouseId, greenhouseId))).limit(1).get(),
      db.select().from(devices).where(eq(devices.id, deviceId)).limit(1).get(),
    ]);
    if (!greenhouse) return apiError("GREENHOUSE_NOT_FOUND", "No registered device belongs to this greenhouse.", 404);
    if (!agent) return apiError("AGENT_NOT_FOUND", "Edge agent is not registered for this greenhouse.", 404);
    if (existing && (existing.greenhouseId !== greenhouseId || existing.category !== "sensor-node" || (existing.agentId && existing.agentId !== agentId))) return apiError("DEVICE_ID_CONFLICT", "Device ID is already used by another registered resource.", 409);
    const deviceRow = { id: deviceId, greenhouseId, agentId, name: deviceId, category: "sensor-node", capabilitiesJson: JSON.stringify({ sensorNode: true, measurementPoints: ["A", "B"] }), reportedStatus: existing?.reportedStatus ?? "offline", lastSeenAt: existing?.lastSeenAt ?? null, assignmentVersion: existing?.assignmentVersion ?? 0, lastAssignmentRequestId: existing?.lastAssignmentRequestId ?? null, updatedAt: now };
    const pointRows = (["A", "B"] as const).map((portKey) => ({ id: measurementPointId(deviceId, portKey), greenhouseId, deviceId, portKey, displayName: `${deviceId} ${portKey}`, enabled: true, createdAt: now, updatedAt: now }));
    const statements = [
      env.DB.prepare("INSERT INTO devices (id, greenhouse_id, agent_id, name, category, capabilities_json, reported_status, last_seen_at, assignment_version, last_assignment_request_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET agent_id=excluded.agent_id, updated_at=excluded.updated_at WHERE devices.greenhouse_id=excluded.greenhouse_id AND devices.category='sensor-node' AND (devices.agent_id IS NULL OR devices.agent_id=excluded.agent_id)").bind(deviceRow.id, deviceRow.greenhouseId, deviceRow.agentId, deviceRow.name, deviceRow.category, deviceRow.capabilitiesJson, deviceRow.reportedStatus, deviceRow.lastSeenAt, deviceRow.assignmentVersion, deviceRow.lastAssignmentRequestId, deviceRow.updatedAt),
      ...pointRows.map((point) => env.DB.prepare("INSERT INTO measurement_points (id, greenhouse_id, device_id, port_key, display_name, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(point.id, point.greenhouseId, point.deviceId, point.portKey, point.displayName, 1, point.createdAt, point.updatedAt)),
    ];
    await env.DB.batch(statements);
    const result = await loadPoints(deviceId, greenhouseId);
    if (!result || result.points.length !== 2 || result.points.some((point, index) => point.portKey !== (["A", "B"] as const)[index])) return apiError("POINT_REGISTRATION_CONFLICT", "Could not register both A/B measurement points.", 409);
    return Response.json(result, { status: 201 });
  } catch {
    return apiError("POINT_REGISTRATION_FAILED", "Measurement points could not be registered.", 503);
  }
}
