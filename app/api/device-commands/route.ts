import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deviceCommandEvents, deviceCommands, devicePolicies, devices, edgeAgents } from "@/db/schema";
import { authorizeApiRole } from "@/lib/server/access-control";
import { policyAllowsManualCommand } from "@/lib/server/device-policy";
import type { DeviceCommandAction, DeviceCommandResult, DeviceCommandState } from "@/types/greenhouse";

const actions = new Set<DeviceCommandAction>(["turn_on", "turn_off", "emergency_stop"]);
const FRESH_DEVICE_MS = 2 * 60 * 1000;
const COMMAND_TTL_MS = 2 * 60 * 1000;
type Payload = { greenhouseId?: unknown; deviceId?: unknown; command?: unknown; maxRuntimeSeconds?: unknown };

function string(value: unknown, max = 128): value is string { return typeof value === "string" && value.trim().length > 0 && value.length <= max; }
function commandResult(row: { id: string; deviceId: string; action: string; state: string; requestedAt: string; correlationId: string | null; expiresAt: string | null; maxRuntimeSeconds: number | null; failureReason: string | null }): DeviceCommandResult {
  return { commandId: row.id, deviceId: row.deviceId, command: row.action as DeviceCommandAction, state: row.state as DeviceCommandState, requestedAt: row.requestedAt, correlationId: row.correlationId ?? undefined, expiresAt: row.expiresAt ?? undefined, maxRuntimeSeconds: row.maxRuntimeSeconds, message: row.failureReason ?? (row.state === "acknowledged" ? "Edge agent acknowledgement verified." : "Command is queued for the edge agent.") };
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const greenhouseId = new URL(request.url).searchParams.get("greenhouseId");
  if (!string(greenhouseId)) return Response.json({ error: "greenhouseId is required." }, { status: 400 });
  try {
    const rows = await getDb().select().from(deviceCommands).where(eq(deviceCommands.greenhouseId, greenhouseId)).orderBy(desc(deviceCommands.requestedAt)).limit(50).all();
    return Response.json({ commands: rows.map(commandResult) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Command history is temporarily unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("operator");
  if ("response" in authorization) return authorization.response;
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!string(idempotencyKey, 128)) return Response.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  let payload: Payload;
  try { payload = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (!string(payload.greenhouseId) || !string(payload.deviceId) || !actions.has(payload.command as DeviceCommandAction) || (payload.maxRuntimeSeconds !== undefined && (!Number.isInteger(payload.maxRuntimeSeconds) || (payload.maxRuntimeSeconds as number) < 1 || (payload.maxRuntimeSeconds as number) > 3600))) return Response.json({ error: "Invalid device command payload." }, { status: 400 });
  const action = payload.command as DeviceCommandAction;
  if ((action === "emergency_stop") !== (payload.deviceId === "ALL")) return Response.json({ error: "The command and device target do not match." }, { status: 400 });
  try {
    const db = getDb();
    const existing = await db.select().from(deviceCommands).where(eq(deviceCommands.idempotencyKey, idempotencyKey)).limit(1).get();
    if (existing) return Response.json(commandResult(existing));
    if (action !== "emergency_stop") {
      const device = await db.select().from(devices).where(and(eq(devices.id, payload.deviceId), eq(devices.greenhouseId, payload.greenhouseId))).limit(1).get();
      if (!device) return Response.json({ error: "The requested device is not registered for this greenhouse." }, { status: 404 });
      const lastSeen = device.lastSeenAt ? Date.parse(device.lastSeenAt) : Number.NaN;
      if (device.reportedStatus === "offline" || !Number.isFinite(lastSeen) || Date.now() - lastSeen > FRESH_DEVICE_MS) return Response.json({ error: "The edge device is offline or telemetry is stale; command was not queued." }, { status: 409 });
      const policy = await db.select({ policyJson: devicePolicies.policyJson }).from(devicePolicies).where(eq(devicePolicies.deviceId, device.id)).limit(1).get();
      const allowed = policyAllowsManualCommand(policy?.policyJson ?? null, action, payload.maxRuntimeSeconds as number | undefined);
      if (!allowed.allowed) return Response.json({ error: allowed.error }, { status: 409 });
    } else {
      const activeAgents = await db.select().from(edgeAgents).where(eq(edgeAgents.greenhouseId, payload.greenhouseId)).all();
      const freshAgents = activeAgents.filter((agent) => agent.status === "online" && agent.lastSeenAt && Date.now() - Date.parse(agent.lastSeenAt) <= FRESH_DEVICE_MS);
      if (freshAgents.length !== 1) return Response.json({ error: "Emergency stop requires exactly one fresh edge agent for this greenhouse; no command was queued." }, { status: 409 });
    }
    const requestedAt = new Date();
    const commandId = crypto.randomUUID();
    const correlationId = crypto.randomUUID();
    const expiresAt = new Date(requestedAt.getTime() + COMMAND_TTL_MS).toISOString();
    await db.insert(deviceCommands).values({ id: commandId, greenhouseId: payload.greenhouseId, deviceId: payload.deviceId, action, state: "requested", idempotencyKey, requestedBy: authorization.user.email, requestedAt: requestedAt.toISOString(), correlationId, expiresAt, maxRuntimeSeconds: payload.maxRuntimeSeconds as number | undefined }).run();
    await db.insert(deviceCommandEvents).values({ id: crypto.randomUUID(), commandId, state: "requested", occurredAt: requestedAt.toISOString(), metadataJson: JSON.stringify({ requestedBy: authorization.user.email, correlationId }) }).run();
    return Response.json(commandResult({ id: commandId, deviceId: payload.deviceId, action, state: "requested", requestedAt: requestedAt.toISOString(), correlationId, expiresAt, maxRuntimeSeconds: (payload.maxRuntimeSeconds as number | undefined) ?? null, failureReason: null }), { status: 202 });
  } catch { return Response.json({ error: "Unable to queue the device command." }, { status: 503 }); }
}
