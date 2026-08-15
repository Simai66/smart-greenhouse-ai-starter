import { env } from "cloudflare:workers";

const AGENT_ID_PATTERN = /^[A-Z0-9_-]{3,64}$/;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function bytesToBase64(bytes: ArrayBuffer) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function equalSignature(actual: string, expected: string) {
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export type SignedAgentRequest = { agentId: string; rawBody: string };

function secretBindingName(agentId: string) {
  return `GREENHOUSE_AGENT_SECRET_${agentId.replace(/[^A-Za-z0-9_]/g, "_")}`;
}

/** Verifies the edge identity before any request JSON is parsed or persisted. */
export async function authenticateAgentRequest(request: Request): Promise<SignedAgentRequest | Response> {
  const agentId = request.headers.get("X-Greenhouse-Agent") ?? "";
  const timestamp = request.headers.get("X-Greenhouse-Timestamp") ?? "";
  const signature = request.headers.get("X-Greenhouse-Signature") ?? "";
  const rawBody = request.method === "GET" ? "" : await request.text();
  const parsedTimestamp = Date.parse(timestamp);

  if (!AGENT_ID_PATTERN.test(agentId) || !Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > MAX_CLOCK_SKEW_MS || !signature) {
    return Response.json({ error: "Invalid edge-agent authentication headers." }, { status: 401 });
  }

  const secretName = secretBindingName(agentId);
  const secret = (env as unknown as Record<string, unknown>)[secretName];
  if (typeof secret !== "string" || secret.length < 32) {
    return Response.json({ error: "This edge agent is not provisioned." }, { status: 401 });
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const expected = bytesToBase64(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`)));
  if (!equalSignature(signature, expected)) {
    return Response.json({ error: "Invalid edge-agent signature." }, { status: 401 });
  }

  return { agentId, rawBody };
}

export function jsonBody<T>(rawBody: string): T | Response {
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
}
