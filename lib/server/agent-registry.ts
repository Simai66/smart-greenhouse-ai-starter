import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { edgeAgents } from "@/db/schema";

/** A valid signature is not enough: an agent must be registered to the greenhouse it claims. */
export async function assertRegisteredAgent(agentId: string, greenhouseId: string): Promise<Response | null> {
  const agent = await getDb().select({ id: edgeAgents.id })
    .from(edgeAgents)
    .where(and(eq(edgeAgents.id, agentId), eq(edgeAgents.greenhouseId, greenhouseId)))
    .limit(1)
    .get();
  if (!agent) return Response.json({ error: "Agent is not registered for this greenhouse." }, { status: 403 });
  return null;
}

export async function markAgentOnline(agentId: string, now: string) {
  await getDb().update(edgeAgents).set({ status: "online", lastSeenAt: now }).where(eq(edgeAgents.id, agentId)).run();
}
