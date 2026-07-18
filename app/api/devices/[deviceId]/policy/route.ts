import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { devicePolicies, devicePolicyRevisions, devices } from "@/db/schema";
import { authorizeApiRole } from "@/lib/server/access-control";
import { parseCapabilities, validateDevicePolicy } from "@/lib/server/device-policy";

type PolicyPayload = { greenhouseId?: unknown; policy?: unknown };

async function registeredDevice(deviceId: string, greenhouseId: string) {
  return getDb().select().from(devices).where(and(eq(devices.id, deviceId), eq(devices.greenhouseId, greenhouseId))).limit(1).get();
}

export async function GET(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;
  const greenhouseId = new URL(request.url).searchParams.get("greenhouseId");
  const { deviceId } = await context.params;
  if (!greenhouseId) return Response.json({ error: "greenhouseId is required." }, { status: 400 });
  try {
    if (!await registeredDevice(deviceId, greenhouseId)) return Response.json({ error: "Device was not found." }, { status: 404 });
    const revisions = await getDb().select().from(devicePolicyRevisions).where(eq(devicePolicyRevisions.deviceId, deviceId)).orderBy(desc(devicePolicyRevisions.version)).limit(50).all();
    return Response.json({ deviceId, revisions: revisions.map((revision) => ({ ...revision, policy: JSON.parse(revision.policyJson) })) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Policy history is temporarily unavailable." }, { status: 503 }); }
}

export async function PUT(request: Request, context: { params: Promise<{ deviceId: string }> }) {
  const authorization = await authorizeApiRole("admin");
  if ("response" in authorization) return authorization.response;
  const { deviceId } = await context.params;
  let payload: PolicyPayload;
  try { payload = await request.json(); } catch { return Response.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  if (typeof payload.greenhouseId !== "string") return Response.json({ error: "greenhouseId is required." }, { status: 400 });
  try {
    const db = getDb();
    const device = await registeredDevice(deviceId, payload.greenhouseId);
    if (!device) return Response.json({ error: "Device was not found." }, { status: 404 });
    const validated = validateDevicePolicy(payload.policy, parseCapabilities(device.capabilitiesJson));
    if (!validated.policy) return Response.json({ error: validated.error }, { status: 400 });
    const current = await db.select().from(devicePolicies).where(eq(devicePolicies.deviceId, deviceId)).limit(1).get();
    const version = (current?.version ?? 0) + 1;
    const updatedAt = new Date().toISOString();
    const policyJson = JSON.stringify(validated.policy);
    await db.insert(devicePolicies).values({ deviceId, greenhouseId: payload.greenhouseId, version, policyJson, updatedBy: authorization.user.email, updatedAt }).onConflictDoUpdate({ target: devicePolicies.deviceId, set: { version, policyJson, updatedBy: authorization.user.email, updatedAt } }).run();
    await db.insert(devicePolicyRevisions).values({ id: crypto.randomUUID(), deviceId, version, policyJson, updatedBy: authorization.user.email, updatedAt }).run();
    return Response.json({ deviceId, version, policy: validated.policy, updatedAt });
  } catch { return Response.json({ error: "Policy could not be stored." }, { status: 503 }); }
}
