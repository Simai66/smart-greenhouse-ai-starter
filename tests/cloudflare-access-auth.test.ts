import assert from "node:assert/strict";
import test from "node:test";
import { getCloudflareAccessIdentity, getCloudflareAccessServiceIdentity } from "../lib/server/cloudflare-access-auth.ts";

const teamDomain = "https://greenhouse-test.cloudflareaccess.com";
const audience = "greenhouse-app-audience";
const pair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"],
);
const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);

function encode(value: unknown): string {
  return btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function token(claims: Record<string, unknown> = {}, header: Record<string, unknown> = {}) {
  const signingInput = [
    encode({ alg: "RS256", kid: "test-key", ...header }),
    encode({ iss: teamDomain, aud: audience, email: "operator@example.com", exp: Math.floor(Date.now() / 1000) + 300, ...claims }),
  ].join(".");
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(signingInput));
  return `${signingInput}.${btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")}`;
}

function headers(assertion?: string) {
  const result = new Headers({ "oai-authenticated-user-email": "admin@example.com" });
  if (assertion) result.set("cf-access-jwt-assertion", assertion);
  return result;
}

function installJwks(status = 200) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ keys: [{ ...jwk, kid: "test-key", alg: "RS256", use: "sig" }] }, { status });
  return () => { globalThis.fetch = originalFetch; };
}

const env = {
  GREENHOUSE_AUTH_MODE: "cloudflare-access",
  CLOUDFLARE_ACCESS_TEAM_DOMAIN: teamDomain,
  CLOUDFLARE_ACCESS_AUD: audience,
  CLOUDFLARE_ACCESS_SERVICE_AUD: "greenhouse-agent-audience",
};

test("accepts signed Access JWT and returns verified email", async () => {
  const restore = installJwks();
  try {
    assert.deepEqual(await getCloudflareAccessIdentity(headers(await token()), env), {
      status: "authenticated",
      email: "operator@example.com",
    });
  } finally { restore(); }
});

test("accepts only signed Service Auth app JWT bound to expected token ID", async () => {
  const restore = installJwks();
  try {
    const appAssertion = await token({ aud: "greenhouse-agent-audience", email: undefined, type: "app", sub: "", common_name: "pi-token-id" });
    assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(appAssertion), { ...env, CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01: "pi-token-id" }, "PI-GH-01"), {
      status: "authenticated",
      serviceTokenId: "pi-token-id",
    });
    assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(appAssertion), { ...env, CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01: "other-token-id" }, "PI-GH-01"), { status: "unauthenticated" });
    assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(await token()), { ...env, CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01: "pi-token-id" }, "PI-GH-01"), { status: "unauthenticated" });
  } finally { restore(); }
});

test("fails closed for missing service token mapping or invalid app claims", async () => {
  const restore = installJwks();
  try {
    const appAssertion = await token({ aud: "greenhouse-agent-audience", email: undefined, type: "app", sub: "", common_name: "pi-token-id" });
    const mappedEnv = { ...env, CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_PI_GH_01: "pi-token-id" };
    assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(appAssertion), env, "PI-GH-01"), { status: "unavailable" });
    assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(appAssertion), { ...mappedEnv, CLOUDFLARE_ACCESS_SERVICE_AUD: undefined }, "PI-GH-01"), { status: "unavailable" });
    for (const claims of [
      { email: undefined, type: "app", sub: "not-empty", common_name: "pi-token-id" },
      { email: undefined, type: "user", sub: "", common_name: "pi-token-id" },
      { email: undefined, type: "app", sub: "", common_name: "" },
      { email: undefined, type: "app", sub: "", common_name: "pi-token-id", exp: Math.floor(Date.now() / 1000) - 60 },
      { aud: "wrong-agent-audience", email: undefined, type: "app", sub: "", common_name: "pi-token-id" },
    ]) {
      assert.deepEqual(await getCloudflareAccessServiceIdentity(headers(await token(claims)), mappedEnv, "PI-GH-01"), { status: "unauthenticated" });
    }
  } finally { restore(); }
});

test("refreshes cached signing keys when Cloudflare rotates the key ID", async () => {
  const originalFetch = globalThis.fetch;
  const rotationDomain = "https://rotation.cloudflareaccess.com";
  let activeKid = "old-key";
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount++;
    if (activeKid === "new-key") await new Promise((resolve) => setTimeout(resolve, 10));
    return Response.json({ keys: [{ ...jwk, kid: activeKid, alg: "RS256", use: "sig" }] });
  };
  const rotationEnv = { ...env, CLOUDFLARE_ACCESS_TEAM_DOMAIN: rotationDomain };
  try {
    const oldAssertion = await token({ iss: rotationDomain }, { kid: "old-key" });
    assert.equal((await getCloudflareAccessIdentity(headers(oldAssertion), rotationEnv)).status, "authenticated");
    activeKid = "new-key";
    const newAssertion = await token({ iss: rotationDomain }, { kid: "new-key" });
    const results = await Promise.all([
      getCloudflareAccessIdentity(headers(newAssertion), rotationEnv),
      getCloudflareAccessIdentity(headers(newAssertion), rotationEnv),
    ]);
    assert.deepEqual(results.map((result) => result.status), ["authenticated", "authenticated"]);
    assert.equal(fetchCount, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test("does not trust caller email header without Access assertion", async () => {
  assert.deepEqual(await getCloudflareAccessIdentity(headers(), env), { status: "unauthenticated" });
});

test("rejects malformed or tampered assertions", async () => {
  const restore = installJwks();
  try {
    assert.deepEqual(await getCloudflareAccessIdentity(headers("not-a-jwt"), env), { status: "unauthenticated" });
    const signed = await token();
    const [header, payload, signature] = signed.split(".");
    const tampered = `${header}.${payload}.${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    assert.deepEqual(await getCloudflareAccessIdentity(headers(tampered), env), { status: "unauthenticated" });
  } finally { restore(); }
});

test("rejects wrong issuer, audience, expiry, not-before, and missing email", async () => {
  const restore = installJwks();
  const now = Math.floor(Date.now() / 1000);
  try {
    assert.deepEqual(
      await getCloudflareAccessIdentity(headers(await token({}, { alg: "HS256" })), env),
      { status: "unauthenticated" },
    );
    for (const claims of [
      { iss: "https://other.cloudflareaccess.com" },
      { aud: "another-app" },
      { exp: now - 60 },
      { nbf: now + 60 },
      { email: "" },
      { type: "app", sub: "" },
    ]) {
      assert.deepEqual(await getCloudflareAccessIdentity(headers(await token(claims)), env), { status: "unauthenticated" });
    }
  } finally { restore(); }
});

test("fails closed when Access configuration or signing keys are unavailable", async () => {
  assert.deepEqual(await getCloudflareAccessIdentity(headers("token"), { ...env, CLOUDFLARE_ACCESS_AUD: "" }), { status: "unavailable" });
  const restore = installJwks(503);
  const unavailableEnv = { ...env, CLOUDFLARE_ACCESS_TEAM_DOMAIN: "https://unavailable.cloudflareaccess.com" };
  try {
    assert.deepEqual(await getCloudflareAccessIdentity(headers(await token({ iss: unavailableEnv.CLOUDFLARE_ACCESS_TEAM_DOMAIN })), unavailableEnv), { status: "unavailable" });
  } finally { restore(); }
});
