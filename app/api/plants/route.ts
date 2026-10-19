import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { greenhouses, plants } from "@/db/schema";
import { authorizeApiRole } from "@/lib/server/access-control";
import { apiError } from "@/lib/server/api-error";
import { isPlantIdentity } from "@/lib/measurement-identity";

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const greenhouseId = new URL(request.url).searchParams.get("greenhouseId");
  if (!greenhouseId || greenhouseId.length > 64) return apiError("GREENHOUSE_REQUIRED", "A valid greenhouseId is required.", 400);
  try {
    const rows = await getDb().select().from(plants)
      .where(and(eq(plants.greenhouseId, greenhouseId), eq(plants.status, "active")))
      .orderBy(asc(plants.displayName)).limit(500).all();
    return Response.json({ greenhouseId, plants: rows }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return apiError("PLANTS_UNAVAILABLE", "Plant registry is temporarily unavailable.", 503);
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("INVALID_JSON", "Request body must be valid JSON.", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("INVALID_BODY", "Request body must be an object.", 400);
  const value = body as Record<string, unknown>;
  if (typeof value.greenhouseId !== "string" || value.greenhouseId.length < 1 || value.greenhouseId.length > 64 || !isPlantIdentity(value.plantId) || typeof value.displayName !== "string" || !value.displayName.trim() || value.displayName.trim().length > 120) {
    return apiError("INVALID_PLANT", "greenhouseId, plantId, and displayName are required and must be valid.", 400);
  }
  const now = new Date().toISOString();
  try {
    const db = getDb();
    const greenhouse = await db.select({ id: greenhouses.id }).from(greenhouses).where(eq(greenhouses.id, value.greenhouseId)).limit(1).get();
    if (!greenhouse) return apiError("GREENHOUSE_NOT_FOUND", "Greenhouse was not found.", 404);
    const existing = await db.select().from(plants).where(eq(plants.id, value.plantId)).limit(1).get();
    if (existing) return apiError("PLANT_ID_CONFLICT", "Plant ID is already registered.", 409);
    const row = { id: value.plantId, greenhouseId: value.greenhouseId, displayName: value.displayName.trim(), status: "active", createdAt: now, updatedAt: now };
    await db.insert(plants).values(row).run();
    return Response.json({ plant: row }, { status: 201 });
  } catch {
    return apiError("PLANT_STORE_UNAVAILABLE", "Plant could not be registered.", 503);
  }
}
