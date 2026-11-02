import { and, eq } from "drizzle-orm";
import { getD1, getDb } from "@/db";
import { deviceCommands, devices } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest } from "@/lib/server/agent-auth";

export async function GET(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const url = new URL(request.url);
  const greenhouseId = url.searchParams.get("greenhouseId");
  const agentId = url.searchParams.get("agentId");
  if (!greenhouseId || agentId !== authenticated.agentId) return Response.json({ error: "Invalid command poll parameters." }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, greenhouseId);
    if (forbidden) return forbidden;
    const db = getDb();
    const ownedDevices = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.greenhouseId, greenhouseId), eq(devices.agentId, authenticated.agentId))).all();
    const deviceIds = ownedDevices.map((device) => device.id);
    const candidates = await db.select().from(deviceCommands).where(eq(deviceCommands.greenhouseId, greenhouseId)).all();
    const commands = candidates.filter((command) => (deviceIds.includes(command.deviceId) || command.deviceId === "ALL") && (command.state === "requested" || command.state === "dispatched"));
    const transitions = [];
    for (const command of commands.filter((item) => item.expiresAt && item.expiresAt <= now)) {
      transitions.push(
        getD1().prepare("UPDATE device_commands SET state = 'timed_out', failure_reason = 'Command expired before edge execution.' WHERE id = ? AND state IN ('requested', 'dispatched') AND expires_at <= ?").bind(command.id, now),
        getD1().prepare("INSERT INTO device_command_events (id, command_id, state, occurred_at, metadata_json) SELECT ?, ?, 'timed_out', ?, ? WHERE changes() = 1").bind(crypto.randomUUID(), command.id, now, JSON.stringify({ reason: "expired" })),
      );
    }
    const deliverable = commands.filter((command) => !command.expiresAt || command.expiresAt > now);
    for (const command of deliverable.filter((item) => item.state === "requested")) {
      transitions.push(
        getD1().prepare("UPDATE device_commands SET state = 'dispatched', dispatched_at = ? WHERE id = ? AND state = 'requested' AND (expires_at IS NULL OR expires_at > ?)").bind(now, command.id, now),
        getD1().prepare("INSERT INTO device_command_events (id, command_id, state, occurred_at, metadata_json) SELECT ?, ?, 'dispatched', ?, ? WHERE changes() = 1").bind(crypto.randomUUID(), command.id, now, JSON.stringify({ agentId: authenticated.agentId })),
      );
    }
    if (transitions.length) await getD1().batch(transitions);
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ commands: deliverable.map((command) => ({ commandId: command.id, deviceId: command.deviceId, action: command.action, correlationId: command.correlationId, idempotencyKey: command.idempotencyKey, expiresAt: command.expiresAt, maxRuntimeSeconds: command.maxRuntimeSeconds })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Command queue is temporarily unavailable." }, { status: 503 });
  }
}
