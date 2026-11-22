import { env } from "cloudflare:workers";
import { getCloudflareAccessServiceIdentity } from "@/lib/server/cloudflare-access-auth";
import { reserveAgentRequestNonce } from "@/lib/server/agent-request-nonces";
import { agentRequestLimits, canonicalAgentQuery, canonicalAgentRequest, decodeAgentBody, isFreshAgentTimestamp, readBoundedAgentBody } from "@/lib/server/agent-request-signature";

const AGENT_ID_PATTERN = /^[A-Z0-9_-]{3,64}$/;
function bytesToHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
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
  const nonce = request.headers.get("X-Greenhouse-Nonce") ?? "";
  const signature = request.headers.get("X-Greenhouse-Signature") ?? "";
  const url = new URL(request.url);
  const bodyLimit = agentRequestLimits(request.method, url.pathname);

  if (bodyLimit === null || canonicalAgentQuery(url) === null) {
    return Response.json({ error: "Invalid agent route or query." }, { status: 400 });
  }
  if (!AGENT_ID_PATTERN.test(agentId) || !isFreshAgentTimestamp(timestamp) || !/^[0-9a-f]{32}$/.test(nonce) || !signature) {
    return Response.json({ error: "Invalid edge-agent authentication headers." }, { status: 401 });
  }

  const access = await getCloudflareAccessServiceIdentity(request.headers, env as unknown as Record<string, string | undefined>, agentId);
  if (access.status === "unavailable") return Response.json({ error: "Agent authentication is temporarily unavailable." }, { status: 503 });
  if (access.status !== "authenticated") return Response.json({ error: "Invalid edge-agent authentication." }, { status: 401 });

  const rawBytes = await readBoundedAgentBody(request, bodyLimit);
  if (rawBytes instanceof Response) return rawBytes;
  const canonical = canonicalAgentRequest(request, rawBytes, timestamp, nonce);
  if (!canonical) return Response.json({ error: "Invalid edge-agent request signature fields." }, { status: 401 });

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
  const expected = bytesToHex(await crypto.subtle.sign("HMAC", key, canonical));
  if (!equalSignature(signature, expected)) {
    return Response.json({ error: "Invalid edge-agent signature." }, { status: 401 });
  }

  try {
    if (!await reserveAgentRequestNonce(agentId, nonce)) return Response.json({ error: "Edge-agent request has already been used." }, { status: 401 });
  } catch {
    return Response.json({ error: "Agent replay protection is temporarily unavailable." }, { status: 503 });
  }

  const rawBody = decodeAgentBody(rawBytes);
  if (rawBody === null) return Response.json({ error: "Agent request body must be valid UTF-8." }, { status: 400 });

  return { agentId, rawBody };
}

export function jsonBody<T>(rawBody: string): T | Response {
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
}
