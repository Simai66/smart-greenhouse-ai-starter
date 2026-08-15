import { apiError } from "@/lib/server/api-error";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";
import { completeImageUpload } from "@/lib/server/inspection-images";

export async function POST(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<{ imageId?: unknown }>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  try {
    const result = await completeImageUpload(payload.imageId, { kind: "agent", agentId: authenticated.agentId });
    return "response" in result ? result.response : Response.json(result.data);
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "Image completion service is temporarily unavailable.", 503);
  }
}
