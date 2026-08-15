import { authorizeApiRole } from "@/lib/server/access-control";
import { apiError } from "@/lib/server/api-error";
import { createImageUpload } from "@/lib/server/inspection-images";

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("operator");
  if ("response" in authorization) return authorization.response;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  try {
    const result = await createImageUpload(payload, "dashboard", { kind: "browser", createdBy: authorization.user.email });
    return "response" in result ? result.response : Response.json(result.data, { status: 201 });
  } catch {
    return apiError("STORAGE_UNAVAILABLE", "Image upload service is temporarily unavailable.", 503);
  }
}
