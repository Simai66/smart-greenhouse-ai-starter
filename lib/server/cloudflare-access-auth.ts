type AccessJwk = JsonWebKey & { kid?: string; alg?: string; use?: string; kty?: string };
type AccessAuthEnvironment = Record<string, string | undefined>;

export type CloudflareAccessIdentity =
  | { status: "authenticated"; email: string }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

let cachedJwks: { url: string; expiresAt: number; keys: AccessJwk[]; lastUnknownKidRefreshAt: number } | undefined;
let refreshingJwks: { url: string; promise: Promise<AccessJwk[]> } | undefined;

function normalizedTeamDomain(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(".cloudflareaccess.com") ||
      url.port || url.username || url.password || url.pathname !== "/" || url.search || url.hash
    ) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error("Malformed base64url value.");
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64 + "=".repeat((4 - base64.length % 4) % 4));
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

function decodeJsonSegment(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Malformed JWT object.");
  return parsed as Record<string, unknown>;
}

async function accessKeys(teamDomain: string, unknownKid = false): Promise<AccessJwk[]> {
  const url = `${teamDomain}/cdn-cgi/access/certs`;
  const now = Date.now();
  if (cachedJwks?.url === url && cachedJwks.expiresAt > now) {
    if (!unknownKid) return cachedJwks.keys;
    if (now - cachedJwks.lastUnknownKidRefreshAt < 30_000) {
      return refreshingJwks?.url === url ? refreshingJwks.promise : cachedJwks.keys;
    }
    cachedJwks.lastUnknownKidRefreshAt = now;
  }

  if (refreshingJwks?.url === url) return refreshingJwks.promise;
  const promise = (async () => {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error("Cloudflare Access signing keys are unavailable.");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !Array.isArray((body as { keys?: unknown }).keys)) {
      throw new Error("Cloudflare Access signing keys are invalid.");
    }
    const keys = (body as { keys: AccessJwk[] }).keys;
    cachedJwks = { url, expiresAt: Date.now() + 5 * 60 * 1000, keys, lastUnknownKidRefreshAt: cachedJwks?.url === url ? cachedJwks.lastUnknownKidRefreshAt : 0 };
    return keys;
  })();
  refreshingJwks = { url, promise };
  try {
    return await promise;
  } finally {
    if (refreshingJwks?.promise === promise) refreshingJwks = undefined;
  }
}

export async function verifyCloudflareAccessJwt(
  token: string,
  teamDomain: string,
  audience: string,
): Promise<{ email: string } | null> {
  const issuer = normalizedTeamDomain(teamDomain);
  if (!issuer || !audience || token.length > 16_384) return null;

  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  let signature: Uint8Array<ArrayBuffer>;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    header = decodeJsonSegment(parts[0]);
    payload = decodeJsonSegment(parts[1]);
    signature = decodeBase64Url(parts[2]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = payload.exp;
  const notBefore = payload.nbf;
  const audiences = typeof payload.aud === "string" ? [payload.aud] : payload.aud;
  const email = payload.email;
  if (
    payload.iss !== issuer ||
    !Array.isArray(audiences) || !audiences.includes(audience) ||
    typeof expiresAt !== "number" || !Number.isFinite(expiresAt) || expiresAt <= now - 30 ||
    (notBefore !== undefined && (typeof notBefore !== "number" || !Number.isFinite(notBefore) || notBefore > now + 30)) ||
    typeof email !== "string" || email.length > 254 || !email.trim() || !email.includes("@")
  ) return null;

  const findKey = (keys: AccessJwk[]) => keys.find((key) =>
    key.kid === header.kid && key.kty === "RSA" && key.alg === "RS256" && (!key.use || key.use === "sig"),
  );
  let jwk = findKey(await accessKeys(issuer));
  if (!jwk) jwk = findKey(await accessKeys(issuer, true));
  if (!jwk) return null;
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signingInput)) return null;
  return { email: email.trim().toLowerCase() };
}

export async function getCloudflareAccessIdentity(
  requestHeaders: Headers,
  env: AccessAuthEnvironment,
): Promise<CloudflareAccessIdentity> {
  if (env.GREENHOUSE_AUTH_MODE !== "cloudflare-access") return { status: "unavailable" };
  const teamDomain = env.CLOUDFLARE_ACCESS_TEAM_DOMAIN;
  const audience = env.CLOUDFLARE_ACCESS_AUD;
  if (!teamDomain || !audience || !normalizedTeamDomain(teamDomain)) return { status: "unavailable" };
  const token = requestHeaders.get("cf-access-jwt-assertion");
  if (!token) return { status: "unauthenticated" };
  try {
    const identity = await verifyCloudflareAccessJwt(token, teamDomain, audience);
    return identity ? { status: "authenticated", ...identity } : { status: "unauthenticated" };
  } catch {
    return { status: "unavailable" };
  }
}
