import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devicePolicies, devices } from "@/db/schema";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest } from "@/lib/server/agent-auth";

export async function GET(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const url = new URL(request.url);
  const greenhouseId = url.searchParams.get("greenhouseId");
  if (!greenhouseId || url.searchParams.get("agentId") !== authenticated.agentId) return Response.json({ error: "Invalid configuration parameters." }, { status: 400 });
  const now = new Date().toISOString();
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, greenhouseId);
    if (forbidden) return forbidden;
    const db = getDb();
    const agentDevices = await db.select({ id: devices.id, capabilitiesJson: devices.capabilitiesJson }).from(devices).where(and(eq(devices.greenhouseId, greenhouseId), eq(devices.agentId, authenticated.agentId))).all();
    const config = [] as Array<{ deviceId: string; version: number; policy: unknown; capabilities: unknown }>;
    for (const device of agentDevices) {
      const policy = await db.select().from(devicePolicies).where(eq(devicePolicies.deviceId, device.id)).limit(1).get();
      if (policy) config.push({ deviceId: device.id, version: Number(policy.version), policy: JSON.parse(policy.policyJson), capabilities: JSON.parse(device.capabilitiesJson) });
    }
    await markAgentOnline(authenticated.agentId, now);
    return Response.json({ greenhouseId, agentId: authenticated.agentId, config }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Device configuration is temporarily unavailable." }, { status: 503 });
  }
}
