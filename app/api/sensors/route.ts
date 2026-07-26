import { sensors } from "@/lib/mock-data";
import { authorizeApiRole } from "@/lib/server/access-control";

export async function GET() {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;

  return Response.json({
    greenhouseId: "GH-01",
    collectedAt: new Date().toISOString(),
    connection: "unconfigured",
    source: "none",
    sensors,
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
