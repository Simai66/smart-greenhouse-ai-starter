import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deviceCommandEvents, deviceCommands, devices } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest } from "@/lib/server/agent-auth";

function event(commandId: string, state: string, occurredAt: string, metadata?: Record<string, unknown>) {
  return { id: crypto.randomUUID(), commandId, state, occurredAt, metadataJson: metadata ? JSON.stringify(metadata) : null };
}

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
    for (const command of commands.filter((item) => item.expiresAt && item.expiresAt <= now)) {
      await db.update(deviceCommands).set({ state: "timed_out", failureReason: "Command expired before edge execution." }).where(eq(deviceCommands.id, command.id)).run();
      await db.insert(deviceCommandEvents).values(event(command.id, "timed_out", now, { reason: "expired" })).run();
    }
    const deliverable = commands.filter((command) => !command.expiresAt || command.expiresAt > now);
    for (const command of deliverable.filter((item) => item.state === "requested")) {
      await db.update(deviceCommands).set({ state: "dispatched", dispatchedAt: now }).where(eq(deviceCommands.id, command.id)).run();
      await db.insert(deviceCommandEvents).values(event(command.id, "dispatched", now, { agentId: authenticated.agentId })).run();
    }
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ commands: deliverable.map((command) => ({ commandId: command.id, deviceId: command.deviceId, action: command.action, correlationId: command.correlationId, idempotencyKey: command.idempotencyKey, expiresAt: command.expiresAt, maxRuntimeSeconds: command.maxRuntimeSeconds })) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Command queue is temporarily unavailable." }, { status: 503 });
  }
}
