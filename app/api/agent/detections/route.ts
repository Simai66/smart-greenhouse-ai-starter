import { apiError } from "@/lib/server/api-error";
import { assertRegisteredAgent } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";
import { insertDetectionBatch } from "@/lib/server/inspection-images";

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
    const result = await insertDetectionBatch(payload, authenticated.agentId);
    return "response" in result ? result.response : Response.json(result.data, { status: 201 });
  } catch {
    return apiError("DETECTION_UNAVAILABLE", "Detection results could not be stored.", 503);
  }
}
