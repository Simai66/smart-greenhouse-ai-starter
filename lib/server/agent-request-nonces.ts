import { lte } from "drizzle-orm";
import { getDb } from "@/db";
import { agentRequestNonces } from "@/db/schema";

export async function reserveAgentRequestNonce(agentId: string, nonce: string, now = new Date()): Promise<boolean> {
  const inserted = await getDb().insert(agentRequestNonces).values({
    agentId,
    nonce,
    expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }).onConflictDoNothing().returning({ nonce: agentRequestNonces.nonce }).get();
  return inserted !== undefined;
}

export async function runAgentNonceRetention(now = new Date()): Promise<void> {
  await getDb().delete(agentRequestNonces).where(lte(agentRequestNonces.expiresAt, now.toISOString())).run();
}
