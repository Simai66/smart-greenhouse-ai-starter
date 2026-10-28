const agentRoutes = [
  ["POST", "/api/agent/heartbeat"],
  ["POST", "/api/agent/telemetry"],
  ["POST", "/api/agent/detections"],
  ["POST", "/api/agent/images/upload-url"],
  ["POST", "/api/agent/images/complete"],
  ["GET", "/api/agent/config"],
  ["GET", "/api/agent/commands"],
] as const;

const ACK_PATH = /^\/api\/agent\/commands\/[A-Za-z0-9_-]{3,128}\/ack$/;
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{1,64}$/;
const TIMESTAMP_PATTERN = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const NONCE_PATTERN = /^[0-9a-f]{32}$/;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export function isFreshAgentTimestamp(timestamp: string, now = Date.now()): boolean {
  if (!TIMESTAMP_PATTERN.test(timestamp)) return false;
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === timestamp && Math.abs(now - parsed) <= MAX_CLOCK_SKEW_MS;
}

export function decodeAgentBody(rawBytes: Uint8Array): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(rawBytes);
  } catch {
    return null;
  }
}

export function isAllowedAgentRequest(method: string, pathname: string): boolean {
  return (agentRoutes as readonly (readonly [string, string])[]).some(([allowedMethod, allowedPath]) => method === allowedMethod && pathname === allowedPath)
    || (method === "POST" && ACK_PATH.test(pathname));
}

export function agentRequestLimits(method: string, pathname: string): number | null {
  if (!isAllowedAgentRequest(method, pathname)) return null;
  if (method === "GET") return 0;
  if (pathname === "/api/agent/telemetry" || pathname === "/api/agent/detections") return 128 * 1024;
  if (pathname === "/api/agent/heartbeat") return 16 * 1024;
  if (pathname === "/api/agent/images/upload-url") return 16 * 1024;
  return 8 * 1024;
}

export function canonicalAgentQuery(url: URL): string | null {
  const route = url.pathname;
  const queryRoutes = route === "/api/agent/config" || route === "/api/agent/commands";
  const rawQuery = url.search.slice(1);
  if (!queryRoutes) return rawQuery === "" ? "" : null;
  if (!rawQuery || rawQuery.includes("%") || rawQuery.includes("+")) return null;
  const allowedKeys = new Set(["agentId", "greenhouseId"]);
  const entries = rawQuery.split("&").map((part) => {
    const separator = part.indexOf("=");
    if (separator < 1) return null;
    const key = part.slice(0, separator);
    const value = part.slice(separator + 1);
    return allowedKeys.has(key) && TOKEN_PATTERN.test(value) ? [key, value] as const : null;
  });
  if (entries.some((entry) => entry === null) || entries.length !== 2 || new Set(entries.map((entry) => entry![0])).size !== 2) return null;
  return entries.map((entry) => entry!).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, value]) => `${key}=${value}`).join("&");
}

export function canonicalAgentRequest(request: Request, rawBody: Uint8Array<ArrayBufferLike>, timestamp: string, nonce: string): Uint8Array<ArrayBuffer> | null {
  const url = new URL(request.url);
  if (!isAllowedAgentRequest(request.method, url.pathname) || url.pathname.includes("%") || !TIMESTAMP_PATTERN.test(timestamp) || !Number.isFinite(Date.parse(timestamp)) || !NONCE_PATTERN.test(nonce)) return null;
  const query = canonicalAgentQuery(url);
  if (query === null) return null;
  const prefix = new TextEncoder().encode(`${request.method}\n${url.pathname}\n${query}\n${timestamp}\n${nonce}\n`);
  const canonical = new Uint8Array(prefix.length + rawBody.length);
  canonical.set(prefix);
  canonical.set(rawBody, prefix.length);
  return canonical;
}

export async function readBoundedAgentBody(request: Request, maxBytes: number): Promise<Uint8Array | Response> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null && (!/^\d+$/.test(contentLength) || Number(contentLength) > maxBytes)) {
    return Response.json({ error: "Agent request body exceeds the allowed size." }, { status: /^\d+$/.test(contentLength) ? 413 : 400 });
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        return Response.json({ error: "Agent request body exceeds the allowed size." }, { status: 413 });
      }
      chunks.push(value);
    }
  } catch {
    return Response.json({ error: "Agent request body could not be read." }, { status: 400 });
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
