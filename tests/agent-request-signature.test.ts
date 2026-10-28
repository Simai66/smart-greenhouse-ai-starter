import assert from "node:assert/strict";
import test from "node:test";
import { agentRequestLimits, canonicalAgentQuery, canonicalAgentRequest, decodeAgentBody, isAllowedAgentRequest, isFreshAgentTimestamp, readBoundedAgentBody } from "../lib/server/agent-request-signature.ts";

test("matches the GH-01 Worker/Pi HMAC canonical byte vector", async () => {
  const key = new TextEncoder().encode("0123456789abcdef0123456789abcdef");
  const request = new Request("https://greenhouse.invalid/api/agent/heartbeat", {
    method: "POST",
    body: '{"agentId":"PI-GH-01","greenhouseId":"GH-01"}',
  });
  const canonical = canonicalAgentRequest(request, new TextEncoder().encode(await request.clone().text()), "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff");
  assert.ok(canonical instanceof Uint8Array);
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, canonical);
  assert.equal([...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join(""), "bd589190aa7b42dfb53dc24fbb20a743508d71272c32bd7dc82259e2294cb54f");
});

test("allows only exact agent routes and declared, unique canonical query values", () => {
  assert.equal(isAllowedAgentRequest("POST", "/api/agent/heartbeat"), true);
  assert.equal(isAllowedAgentRequest("POST", "/api/agent/heartbeat/"), false);
  assert.equal(isAllowedAgentRequest("POST", "/api/agent/heartbeat/../config"), false);
  assert.equal(canonicalAgentQuery(new URL("https://x/api/agent/config?greenhouseId=GH-01&agentId=PI-GH-01")), "agentId=PI-GH-01&greenhouseId=GH-01");
  for (const query of ["agentId=PI-GH-01&agentId=PI-GH-02&greenhouseId=GH-01", "agentId=PI-GH-01&greenhouseId=GH-01&extra=x", "agentId=PI+GH&greenhouseId=GH-01", "agentId=PI%2DGH&greenhouseId=GH-01"]) {
    assert.equal(canonicalAgentQuery(new URL(`https://x/api/agent/config?${query}`)), null);
  }
  assert.equal(canonicalAgentQuery(new URL("https://x/api/agent/heartbeat?agentId=PI-GH-01")), null);
});

test("binds canonical bytes to method, route, query, timestamp, nonce, and exact body", () => {
  const baselineRequest = new Request("https://greenhouse.invalid/api/agent/config?greenhouseId=GH-01&agentId=PI-GH-01", { method: "GET" });
  const baseline = canonicalAgentRequest(baselineRequest, new TextEncoder().encode(""), "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff");
  assert.ok(baseline);
  const variants = [
    canonicalAgentRequest(new Request("https://greenhouse.invalid/api/agent/commands?greenhouseId=GH-01&agentId=PI-GH-01", { method: "GET" }), new Uint8Array(), "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff"),
    canonicalAgentRequest(new Request("https://greenhouse.invalid/api/agent/config?greenhouseId=GH-02&agentId=PI-GH-01", { method: "GET" }), new Uint8Array(), "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff"),
    canonicalAgentRequest(baselineRequest, new Uint8Array(), "2026-10-28T00:00:01.000Z", "00112233445566778899aabbccddeeff"),
    canonicalAgentRequest(baselineRequest, new Uint8Array(), "2026-10-28T00:00:00.000Z", "10112233445566778899aabbccddeeff"),
    canonicalAgentRequest(baselineRequest, new TextEncoder().encode("\n"), "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff"),
  ];
  for (const variant of variants) {
    assert.ok(variant);
    assert.notDeepEqual(variant, baseline);
  }
});

test("sets bounded body size per route and signs exact method/path/query/body", () => {
  const body = new TextEncoder().encode("{}\n");
  const request = new Request("https://greenhouse.invalid/api/agent/config?greenhouseId=GH-01&agentId=PI-GH-01", { method: "GET" });
  assert.equal(agentRequestLimits("POST", "/api/agent/heartbeat"), 16 * 1024);
  assert.equal(agentRequestLimits("GET", "/api/agent/config"), 0);
  const canonical = canonicalAgentRequest(request, body, "2026-10-28T00:00:00.000Z", "00112233445566778899aabbccddeeff");
  assert.ok(canonical instanceof Uint8Array);
  assert.match(new TextDecoder().decode(canonical), /^GET\n\/api\/agent\/config\nagentId=PI-GH-01&greenhouseId=GH-01\n2026-10-28T00:00:00\.000Z\n00112233445566778899aabbccddeeff\n\{\}\n$/);
});

test("counts streamed body bytes and rejects oversized bodies before buffering", async () => {
  const exact = new Request("https://greenhouse.invalid/api/agent/heartbeat", { method: "POST", body: "1234" });
  assert.deepEqual(await readBoundedAgentBody(exact, 4), new TextEncoder().encode("1234"));
  const oversized = new Request("https://greenhouse.invalid/api/agent/heartbeat", { method: "POST", body: "12345" });
  const rejected = await readBoundedAgentBody(oversized, 4);
  assert.ok(rejected instanceof Response);
  assert.equal(rejected.status, 413);
});

test("rejects stale/noncanonical timestamps, malformed nonce, and invalid UTF-8", () => {
  const now = Date.parse("2026-10-28T00:00:00.000Z");
  assert.equal(isFreshAgentTimestamp("2026-10-28T00:00:00.000Z", now), true);
  assert.equal(isFreshAgentTimestamp("2026-10-28T00:05:01.000Z", now), false);
  assert.equal(isFreshAgentTimestamp("1700000000", now), false);
  assert.equal(decodeAgentBody(new Uint8Array([0xc3, 0x28])), null);
  const invalidNonce = canonicalAgentRequest(new Request("https://greenhouse.invalid/api/agent/heartbeat", { method: "POST" }), new Uint8Array(), "2026-10-28T00:00:00.000Z", "not-a-nonce");
  assert.equal(invalidNonce, null);
});
