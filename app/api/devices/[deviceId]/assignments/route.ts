import { and, asc, desc, eq, gt, isNull, lte, or } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "@/db";
import { devices, measurementPoints, plantAssignments, plants } from "@/db/schema";
import { isDeviceIdentity, isPlantIdentity, plantForSample } from "@/lib/measurement-identity";
import { authorizeApiRole } from "@/lib/server/access-control";
import { apiError } from "@/lib/server/api-error";

type AssignmentChange = { pointId: string; plantId: string | null };

export async function GET(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const { deviceId } = await context.params;
  const url = new URL(request.url);
  const greenhouseId = url.searchParams.get("greenhouseId");
  const rawSampledAt = url.searchParams.get("sampledAt");
  if (!greenhouseId || !isDeviceIdentity(deviceId) || (rawSampledAt !== null && !Number.isFinite(Date.parse(rawSampledAt)))) return apiError("INVALID_SCOPE", "Valid deviceId, greenhouseId, and sampledAt are required.", 400);
  const sampledAt = rawSampledAt === null ? null : new Date(rawSampledAt).toISOString();
  try {
    const db = getDb();
    const device = await db.select({ id: devices.id, assignmentVersion: devices.assignmentVersion }).from(devices)
      .where(and(eq(devices.id, deviceId), eq(devices.greenhouseId, greenhouseId), eq(devices.category, "sensor-node"))).limit(1).get();
    if (!device) return apiError("DEVICE_NOT_FOUND", "Registered sensor node was not found.", 404);
    const points = await db.select().from(measurementPoints).where(and(eq(measurementPoints.deviceId, deviceId), eq(measurementPoints.greenhouseId, greenhouseId))).orderBy(asc(measurementPoints.portKey)).all();
    const assignments = await Promise.all(points.map(async (point) => {
      const conditions = [eq(plantAssignments.pointId, point.id), eq(plantAssignments.greenhouseId, greenhouseId)];
      if (sampledAt) conditions.push(lte(plantAssignments.assignedAt, sampledAt), or(isNull(plantAssignments.unassignedAt), gt(plantAssignments.unassignedAt, sampledAt))!);
      const history = await db.select().from(plantAssignments)
        .where(and(...conditions))
        .orderBy(desc(plantAssignments.assignedAt)).limit(sampledAt ? 2 : 100).all();
      return { pointId: point.id, portKey: point.portKey, history, plantIdAtSample: sampledAt ? plantForSample(history, sampledAt) : undefined };
    }));
    return Response.json({ deviceId, greenhouseId, assignmentVersion: device.assignmentVersion, sampledAt, assignments }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("ASSIGNMENTS_UNAVAILABLE", "Assignment history is temporarily unavailable.", 503);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  const { deviceId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Request body must be valid JSON.", 400); }
  if (!isDeviceIdentity(deviceId) || !body || typeof body !== "object" || Array.isArray(body)) return apiError("INVALID_BODY", "Valid deviceId and request body are required.", 400);
  const value = body as Record<string, unknown>;
  if (typeof value.greenhouseId !== "string" || value.greenhouseId.length > 64 || !Number.isInteger(value.expectedVersion) || (value.expectedVersion as number) < 0 || !Array.isArray(value.assignments) || value.assignments.length !== 2) {
    return apiError("INVALID_ASSIGNMENTS", "greenhouseId, expectedVersion, and both A/B assignments are required.", 400);
  }
  const rawRequested = value.assignments as Array<Record<string, unknown>>;
  if (rawRequested.some((item) => !item || typeof item !== "object" || typeof item.pointId !== "string" || (item.plantId !== null && !isPlantIdentity(item.plantId))) || new Set(rawRequested.map((item) => item.pointId)).size !== 2) {
    return apiError("INVALID_ASSIGNMENTS", "Each point needs one valid plantId or null for unassigned.", 400);
  }
  const requested: AssignmentChange[] = rawRequested.map((item) => ({ pointId: item.pointId as string, plantId: item.plantId as string | null }));
  const reasonValue = value.reason === undefined ? null : value.reason;
  if (reasonValue !== null && (typeof reasonValue !== "string" || reasonValue.trim().length > 300)) return apiError("INVALID_REASON", "reason must be at most 300 characters.", 400);
  const reason = reasonValue as string | null;
  const receivedAt = new Date();
  let effectiveAt = receivedAt.toISOString();
  if (value.effectiveAt !== undefined) {
    if (typeof value.effectiveAt !== "string" || !Number.isFinite(Date.parse(value.effectiveAt))) return apiError("INVALID_EFFECTIVE_TIME", "effectiveAt must be a valid ISO timestamp.", 400);
    const parsed = new Date(value.effectiveAt);
    if (parsed.getTime() > receivedAt.getTime()) return apiError("FUTURE_EFFECTIVE_TIME", "effectiveAt cannot be in the future.", 400);
    effectiveAt = parsed.toISOString();
    if (parsed.getTime() < receivedAt.getTime() - 30_000 && (!reason || !reason.trim())) return apiError("BACKDATED_REASON_REQUIRED", "A reason is required for a backdated physical move.", 400);
  }

  const greenhouseId = value.greenhouseId as string;
  const expectedVersion = value.expectedVersion as number;
  const requestId = crypto.randomUUID();
  try {
    const db = getDb();
    const device = await db.select().from(devices).where(and(eq(devices.id, deviceId), eq(devices.greenhouseId, greenhouseId), eq(devices.category, "sensor-node"))).limit(1).get();
    if (!device) return apiError("DEVICE_NOT_FOUND", "Registered sensor node was not found.", 404);
    if (device.assignmentVersion !== expectedVersion) return apiError("VERSION_CONFLICT", "Assignments changed; reload A/B points and try again.", 409);
    const points = await db.select().from(measurementPoints).where(and(eq(measurementPoints.deviceId, deviceId), eq(measurementPoints.greenhouseId, greenhouseId))).all();
    const byId = new Map(points.map((point) => [point.id, point]));
    if (points.length !== 2 || requested.some((item) => !byId.has(item.pointId))) return apiError("POINT_SCOPE_MISMATCH", "Both assignments must target this device's registered A/B points.", 409);
    const plantIds = requested.flatMap((item) => item.plantId === null ? [] : [item.plantId as string]);
    if (plantIds.length) {
      const registeredPlants = await db.select({ id: plants.id }).from(plants)
        .where(and(eq(plants.greenhouseId, greenhouseId), eq(plants.status, "active"))).all();
      const allowed = new Set(registeredPlants.map((plant) => plant.id));
      if (plantIds.some((plantId) => !allowed.has(plantId))) return apiError("PLANT_SCOPE_MISMATCH", "Every assigned plant must be active in this greenhouse.", 409);
    }
    const changes: Array<AssignmentChange & { activeId: string | null }> = [];
    for (const item of requested) {
      const point = byId.get(item.pointId)!;
      const active = await db.select().from(plantAssignments).where(and(eq(plantAssignments.pointId, point.id), eq(plantAssignments.greenhouseId, greenhouseId), isNull(plantAssignments.unassignedAt))).limit(1).get();
      const targetPlantId = item.plantId as string | null;
      if ((active?.plantId ?? null) === targetPlantId) continue;
      const latest = await db.select({ assignedAt: plantAssignments.assignedAt, unassignedAt: plantAssignments.unassignedAt }).from(plantAssignments)
        .where(eq(plantAssignments.pointId, point.id)).orderBy(desc(plantAssignments.assignedAt)).limit(1).get();
      const boundary = active?.assignedAt ?? latest?.unassignedAt ?? latest?.assignedAt;
      if (boundary && Date.parse(effectiveAt) < Date.parse(boundary)) return apiError("MOVE_TIME_CONFLICT", "effectiveAt cannot precede the current assignment interval.", 409);
      changes.push({ pointId: point.id, plantId: targetPlantId, activeId: active?.id ?? null });
    }
    if (!changes.length) return Response.json({ deviceId, greenhouseId, assignmentVersion: expectedVersion, changed: false, effectiveAt });

    const statements = [env.DB.prepare("UPDATE devices SET assignment_version = assignment_version + 1, last_assignment_request_id = ?, updated_at = ? WHERE id = ? AND greenhouse_id = ? AND category = 'sensor-node' AND assignment_version = ?")
      .bind(requestId, receivedAt.toISOString(), deviceId, greenhouseId, expectedVersion)];
    const committed = "EXISTS (SELECT 1 FROM devices WHERE id = ? AND greenhouse_id = ? AND last_assignment_request_id = ?)";
    for (const change of changes) {
      if (change.activeId) {
        statements.push(env.DB.prepare(`UPDATE plant_assignments SET unassigned_at = ? WHERE id = ? AND point_id = ? AND greenhouse_id = ? AND unassigned_at IS NULL AND ${committed}`)
          .bind(effectiveAt, change.activeId, change.pointId, greenhouseId, deviceId, greenhouseId, requestId));
      }
      if (change.plantId) {
        statements.push(env.DB.prepare(`INSERT INTO plant_assignments (id, greenhouse_id, point_id, plant_id, assigned_at, unassigned_at, assigned_by, reason) SELECT ?, ?, ?, ?, ?, NULL, ?, ? WHERE ${committed}`)
          .bind(crypto.randomUUID(), greenhouseId, change.pointId, change.plantId, effectiveAt, authorization.user.email, reason, deviceId, greenhouseId, requestId));
      }
    }
    const results = await env.DB.batch(statements);
    if ((results[0]?.meta.changes ?? 0) !== 1) return apiError("VERSION_CONFLICT", "Assignments changed concurrently; reload A/B points and try again.", 409);
    return Response.json({ deviceId, greenhouseId, assignmentVersion: expectedVersion + 1, changed: true, effectiveAt });
  } catch {
    return apiError("ASSIGNMENT_STORE_UNAVAILABLE", "Assignments could not be saved atomically.", 503);
  }
}
