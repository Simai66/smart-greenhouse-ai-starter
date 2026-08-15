import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { edgeAgents } from "@/db/schema";
import { apiError } from "@/lib/server/api-error";
import { assertRegisteredAgent } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";
import { createImageUpload } from "@/lib/server/inspection-images";

export async function POST(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<unknown>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  const greenhouseId = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { greenhouseId?: unknown }).greenhouseId : undefined;
  if (typeof greenhouseId !== "string") return apiError("GREENHOUSE_REQUIRED", "greenhouseId is required.", 400);
  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, greenhouseId);
    if (forbidden) return forbidden;
    const registered = await getDb().select({ id: edgeAgents.id }).from(edgeAgents).where(and(eq(edgeAgents.id, authenticated.agentId), eq(edgeAgents.greenhouseId, greenhouseId))).limit(1).get();
    if (!registered) return apiError("AGENT_NOT_REGISTERED", "Agent is not registered for this greenhouse.", 403);
    const result = await createImageUpload(payload, "pi", { kind: "agent", agentId: authenticated.agentId });
    return "response" in result ? result.response : Response.json(result.data, { status: 201 });
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "Image upload service is temporarily unavailable.", 503);
  }
}
