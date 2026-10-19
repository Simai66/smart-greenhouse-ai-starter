import { authorizeApiRole } from "@/lib/server/access-control";
import { apiError } from "@/lib/server/api-error";
import { completeImageUpload } from "@/lib/server/inspection-images";

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("operator");
  if ("response" in authorization) return authorization.response;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const imageId = payload && typeof payload === "object" && !Array.isArray(payload) ? (payload as { imageId?: unknown }).imageId : undefined;
  try {
    const result = await completeImageUpload(imageId, { kind: "browser", createdBy: authorization.user.email });
    return "response" in result ? result.response : Response.json(result.data);
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "Image completion service is temporarily unavailable.", 503);
  }
}
