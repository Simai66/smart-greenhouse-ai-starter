import { sensorReadings } from "@/db/schema";
import { getDb } from "@/db";
import { assertRegisteredAgent, markAgentOnline } from "@/lib/server/agent-registry";
import { authenticateAgentRequest, jsonBody } from "@/lib/server/agent-auth";

const metrics = new Set(["temperature", "humidity", "soil_moisture", "light"]);
const qualities = new Set(["valid", "suspect", "invalid"]);
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_MS = 5 * 60 * 1000;

type TelemetryPayload = {
  greenhouseId?: unknown;
  agentId?: unknown;
  readings?: Array<{ sensorId?: unknown; metric?: unknown; value?: unknown; unit?: unknown; sampledAt?: unknown; quality?: unknown }>;
};

function validString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export async function POST(request: Request) {
  const authenticated = await authenticateAgentRequest(request);
  if (authenticated instanceof Response) return authenticated;
  const payload = jsonBody<TelemetryPayload>(authenticated.rawBody);
  if (payload instanceof Response) return payload;
  if (!validString(payload.greenhouseId) || payload.agentId !== authenticated.agentId || !Array.isArray(payload.readings) || payload.readings.length === 0 || payload.readings.length > 100) {
    return Response.json({ error: "Invalid telemetry envelope." }, { status: 400 });
  }

  const now = new Date();
  const values = [] as Array<typeof sensorReadings.$inferInsert>;
  for (const reading of payload.readings) {
    const sampledAt = typeof reading.sampledAt === "string" ? Date.parse(reading.sampledAt) : Number.NaN;
    if (!validString(reading.sensorId) || !metrics.has(reading.metric as string) || typeof reading.value !== "number" || !Number.isFinite(reading.value) || !validString(reading.unit, 32) || !qualities.has(reading.quality as string) || !Number.isFinite(sampledAt) || sampledAt < now.getTime() - MAX_AGE_MS || sampledAt > now.getTime() + MAX_FUTURE_MS) {
      return Response.json({ error: "A telemetry reading is invalid, stale, or from the future." }, { status: 400 });
    }
    values.push({
      id: crypto.randomUUID(), greenhouseId: payload.greenhouseId, sensorId: reading.sensorId,
      metric: reading.metric as string, value: String(reading.value), unit: reading.unit,
      sampledAt: new Date(sampledAt).toISOString(), receivedAt: now.toISOString(), quality: reading.quality as string,
    });
  }

  try {
    const forbidden = await assertRegisteredAgent(authenticated.agentId, payload.greenhouseId);
    if (forbidden) return forbidden;
    await getDb().insert(sensorReadings).values(values).run();
    await markAgentOnline(authenticated.agentId, now.toISOString());
    return Response.json({ accepted: values.length, receivedAt: now.toISOString() }, { status: 202 });
  } catch {
    return Response.json({ error: "Telemetry storage is temporarily unavailable." }, { status: 503 });
  }
}
