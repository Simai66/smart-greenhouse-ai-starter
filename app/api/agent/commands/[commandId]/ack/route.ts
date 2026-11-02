import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "@/db";
import { deviceCommands, devices } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";

type AckPayload = { greenhouseId?: unknown; agentId?: unknown; status?: unknown; reportedStatus?: unknown; reason?: unknown };
const statuses = new Set(["on", "off", "offline"]);

export async function POST(request: Request, context: { params: Promise<{ commandId: string }> }) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<AckPayload>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  const { commandId } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(commandId) || typeof payload.greenhouseId !== "string" || payload.agentId !== authenticated.agentId || (payload.status !== "acknowledged" && payload.status !== "failed") || (payload.reportedStatus !== undefined && !statuses.has(payload.reportedStatus as string)) || (payload.status === "failed" && (typeof payload.reason !== "string" || payload.reason.trim().length === 0 || payload.reason.length > 300))) return Response.json({ error: "Invalid command acknowledgement." }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, payload.greenhouseId);
    if (forbidden) return forbidden;
    const db = getDb();
    const command = await db.select().from(deviceCommands).where(and(eq(deviceCommands.id, commandId), eq(deviceCommands.greenhouseId, payload.greenhouseId))).limit(1).get();
    if (!command) return Response.json({ error: "Command was not found." }, { status: 404 });
    if (command.deviceId !== "ALL") {
      const device = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, command.deviceId), eq(devices.agentId, authenticated.agentId))).limit(1).get();
      if (!device) return Response.json({ error: "Agent does not own this command target." }, { status: 403 });
    }
    if (command.state === payload.status) return Response.json({ commandId, state: command.state, idempotent: true });
    if (command.state === "acknowledged" || command.state === "failed" || command.state === "timed_out") return Response.json({ error: "Command already has a conflicting terminal state." }, { status: 409 });
    if (command.expiresAt && command.expiresAt <= now) return Response.json({ error: "Command has expired." }, { status: 409 });
    const state = payload.status;
    const failureReason = state === "failed" ? (payload.reason as string).trim() : null;
    const transition = getD1().prepare("UPDATE device_commands SET state = ?, acknowledged_at = ?, failure_reason = ? WHERE id = ? AND state IN ('requested', 'dispatched') AND (expires_at IS NULL OR expires_at > ?)")
      .bind(state, now, failureReason, commandId, now);
    const event = getD1().prepare("INSERT INTO device_command_events (id, command_id, state, occurred_at, metadata_json) SELECT ?, ?, ?, ?, ? WHERE changes() = 1")
      .bind(crypto.randomUUID(), commandId, state, now, JSON.stringify({ agentId: authenticated.agentId, reason: failureReason }));
    const statements = [transition, event];
    if (command.deviceId !== "ALL" && payload.reportedStatus) {
      statements.push(getD1().prepare("UPDATE devices SET reported_status = ?, last_seen_at = ?, updated_at = ? WHERE id = ? AND EXISTS (SELECT 1 FROM device_commands WHERE id = ? AND state = ? AND acknowledged_at = ?)")
        .bind(payload.reportedStatus, now, now, command.deviceId, commandId, state, now));
    }
    const [result] = await getD1().batch(statements);
    if ((result?.meta.changes ?? 0) !== 1) {
      const latest = await db.select().from(deviceCommands).where(eq(deviceCommands.id, commandId)).limit(1).get();
      if (latest?.state === state) return Response.json({ commandId, state, idempotent: true });
      return Response.json({ error: "Command changed before the acknowledgement was committed." }, { status: 409 });
    }
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ commandId, state, acknowledgedAt: now });
  } catch {
    return Response.json({ error: "Command acknowledgement could not be stored." }, { status: 503 });
  }
}
