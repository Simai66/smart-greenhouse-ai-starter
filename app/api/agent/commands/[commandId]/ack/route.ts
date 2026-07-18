import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { deviceCommandEvents, deviceCommands, devices } from "@/db/schema";
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
    if (command.state === "acknowledged" || command.state === "failed") return Response.json({ commandId, state: command.state, idempotent: true });
    if (command.expiresAt && command.expiresAt <= now) return Response.json({ error: "Command has expired." }, { status: 409 });
    const state = payload.status;
    const failureReason = state === "failed" ? (payload.reason as string).trim() : null;
    await db.update(deviceCommands).set({ state, acknowledgedAt: now, failureReason }).where(eq(deviceCommands.id, commandId)).run();
    await db.insert(deviceCommandEvents).values({ id: crypto.randomUUID(), commandId, state, occurredAt: now, metadataJson: JSON.stringify({ agentId: authenticated.agentId, reason: failureReason }) }).run();
    if (command.deviceId !== "ALL" && payload.reportedStatus) await db.update(devices).set({ reportedStatus: payload.reportedStatus as string, lastSeenAt: now, updatedAt: now }).where(eq(devices.id, command.deviceId)).run();
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ commandId, state, acknowledgedAt: now });
  } catch {
    return Response.json({ error: "Command acknowledgement could not be stored." }, { status: 503 });
  }
}
