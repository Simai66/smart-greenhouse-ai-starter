import { authorizeApiRole } from "@/lib/server/access-control";
import { parseImageListQuery, listImages } from "@/lib/server/inspection-images";
import { apiError } from "@/lib/server/api-error";

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const query = parseImageListQuery(request);
  if (query.response || !query.greenhouseId) return query.response ?? apiError("GREENHOUSE_REQUIRED", "greenhouseId is required.", 400);
  try {
    return Response.json({ greenhouseId: query.greenhouseId, images: await listImages(query.greenhouseId, query.cameraId, query.limit) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("IMAGE_LIST_UNAVAILABLE", "Image list is temporarily unavailable.", 503);
  }
}
