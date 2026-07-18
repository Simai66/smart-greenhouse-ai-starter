import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devices } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";

type HeartbeatPayload = { greenhouseId?: unknown; agentId?: unknown; devices?: Array<{ deviceId?: unknown; status?: unknown; configVersion?: unknown }> };
const statuses = new Set(["on", "off", "offline"]);

export async function POST(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<HeartbeatPayload>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  if (typeof payload.greenhouseId !== "string" || payload.agentId !== authenticated.agentId || !Array.isArray(payload.devices) || payload.devices.length > 50) return Response.json({ error: "Invalid heartbeat envelope." }, { status: 400 });
  if (payload.devices.some((device) => typeof device.deviceId !== "string" || !statuses.has(device.status as string) || (device.configVersion !== undefined && (!Number.isInteger(device.configVersion) || (device.configVersion as number) < 1)))) return Response.json({ error: "Invalid heartbeat device status." }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, payload.greenhouseId);
    if (forbidden) return forbidden;
    const db = getDb();
    for (const device of payload.devices) {
      const registered = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.id, device.deviceId as string), eq(devices.greenhouseId, payload.greenhouseId), eq(devices.agentId, authenticated.agentId))).limit(1).get();
      if (!registered) return Response.json({ error: "Heartbeat contains an unregistered device." }, { status: 403 });
      await db.update(devices).set({ reportedStatus: device.status as string, lastSeenAt: now, updatedAt: now }).where(eq(devices.id, device.deviceId as string)).run();
    }
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ receivedAt: now, deviceCount: payload.devices.length }, { status: 202 });
  } catch {
    return Response.json({ error: "Heartbeat storage is temporarily unavailable." }, { status: 503 });
  }
}
