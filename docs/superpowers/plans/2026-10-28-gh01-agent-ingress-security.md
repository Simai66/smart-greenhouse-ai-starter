# GH-01 agent ingress security implementation plan

**Goal:** Enforce the approved Service Auth + HMAC + one-time nonce boundary for Pi requests to GH-01 agent APIs.

**Spec:** `docs/superpowers/specs/2026-10-28-greenhouse-security-design.md`. The spec is binding. One correction before implementation: its static HMAC vector timestamp `1700000000` is not valid ISO time for the existing freshness parser; replace with `2026-10-28T00:00:00.000Z`, keep freshness tests under an injected/current clock, expected MAC `bd589190aa7b42dfb53dc24fbb20a743508d71272c32bd7dc82259e2294cb54f`.

**Global constraints:** GH-01 only; additive D1 change; no cloud secrets in source; fail closed; preserve stable request/business idempotency; no external config, migration, deploy, image-bucket change, or relay operation. Do not claim staging acceptance without readback and live evidence.

## File map

- `lib/server/cloudflare-access-auth.ts`, `tests/cloudflare-access-auth.test.ts`: distinguish signed user JWT from signed Service Auth app JWT and bind `common_name` to configured service-token ID.
- `lib/server/agent-auth.ts` and agent route callers: canonical HMAC, route/query/body bounds, nonce reservation, JSON decoding only after authentication.
- `db/schema.ts`, `drizzle/0005_agent_request_nonces.sql`, `worker/index.ts`: unique nonce persistence and indexed expiry cleanup. Existing Drizzle journal lists only `0000` while numbered SQL migrations `0001–0004` exist; do not invent missing migration history rows.
- `edge-agent/greenhouse_agent.py`, `edge-agent/test_greenhouse_agent.py`, `edge-agent/docker-compose.example.yml`: matching signatures and Service Auth headers from Pi-only env.
- `docs/api/edge-agent-v1.md`, `README.md`: exact contract, configuration, phased rollout and rollback; remove stale Access Bypass advice.

## Task 1 — Define and test Service Auth assertion

1. Add tests using the existing generated RSA/JWKS fixture: accept a signed app token only when issuer, audience, expiry, `type=app`, empty `sub`, and exact configured `common_name` match; reject user JWTs, wrong token ID/audience/issuer/expiry and unavailable keys.
2. Run `node --experimental-strip-types --test tests/cloudflare-access-auth.test.ts`; confirm new cases fail because service identity is unsupported.
3. Add a service-identity verifier returning only authenticated/unauthenticated/unavailable plus verified service-token ID. Keep user verifier requirements unchanged.
4. Re-run the test file and existing user-path cases.

## Task 2 — Canonical signed-request and replay contract

1. Add focused tests for the cross-language HMAC vector, method/path/body tampering, unknown route/query key, duplicate and encoded query values, malformed nonce, stale timestamp, body cap, invalid UTF-8/JSON, and replay/D1 failure.
2. Verify RED before implementation with the project test runner.
3. Implement exact agent-route allowlist and per-route body caps. Stream-read/count bytes before allocating full body; bind method, exact path, sorted declared query, ISO timestamp, 16-byte hex nonce, and raw bytes using LF separators. Use raw bytes for signature; decode strict UTF-8 only after verification.
4. Require a valid service assertion whose `common_name` matches the ID binding `CLOUDFLARE_ACCESS_SERVICE_TOKEN_ID_<NORMALIZED_AGENT_ID>`, then existing per-agent HMAC secret and registered greenhouse checks. Unknown/malformed configuration fails closed.
5. Insert nonce before mutation; unique collision returns replay rejection. D1 insert errors return 503. Preserve business-level dedupe for retries with fresh nonces.
6. Run focused TypeScript tests and verify each route caller still handles the returned raw body and errors.

## Task 3 — Add additive nonce storage and cleanup

1. Add schema and migration for `(agent_id, nonce)` primary key, expiry timestamp, and expiry index. No existing rows/tables are deleted.
2. Add test that applies migrations to local D1, verifies duplicate insert fails, and expired cleanup only removes eligible rows.
3. Add indexed expiry cleanup to the existing scheduled Worker handler alongside image retention; keep current schedule so daily cleanup drains the full prior-day request volume.
4. Run migration/schema tests; document rollback as restoring old Worker while retaining new table/history.

## Task 4 — Update Pi signer and tests

1. Add Python tests for the shared vector, canonical query, exact method/path, nonce uniqueness per attempt, Access headers, and required/missing Service Auth env.
2. Run `python3 -m unittest edge-agent.test_greenhouse_agent` and confirm RED.
3. Update `CloudClient.signed_request` to sign the final requested URL path/query, raw compact UTF-8 JSON, ISO timestamp, and fresh nonce. Send Access client ID/secret headers from env only; never include them in firmware or queued payloads.
4. Preserve mutation retry idempotency IDs already stored by the agent; every transport retry gets a new nonce.
5. Run Python tests, including existing image retry and queue tests.

## Task 5 — Contract, rollout, and QA

1. Update API contract and README for Service Auth (no Bypass), Worker bindings/secrets, Pi environment file permissions, exact allowlisted paths/query, body caps, nonce semantics, rate limit follow-up, rollout order and rollback. Do not claim Cloudflare/Supabase state was changed.
2. Run `npm run test:unit`, `npm run test:python`, lint on changed TypeScript, `npx tsc --noEmit`, `npm run build`, `git diff --check`; report any pre-existing or environment failures accurately.
3. Review the feature card acceptance matrix and route callers. Complete fresh code review; fix Critical/Important findings with RED→GREEN. Commit only verified repository changes; do not push/deploy.

## Review focus

- Access JWT service token claim shape vs user JWT separation.
- HMAC exact bytes and URL canonicalization agree between Python and Worker.
- D1 nonce reservation precedes any mutation and fails closed on storage outage.
- Request stream is bounded before buffering/parsing; all eight agent routes enforce policy.
- New-nonce transport retries retain existing business idempotency.
- Staging deployment remains blocked until both Access policy/secrets and Pi env are coordinated; no claim of real sensor pass from unit tests.

## Deferred security slice

Private image storage/read URLs, external rate limits, LAN segmentation and staging integration are independent follow-up work. Keep public image exposure recorded as a major residual risk until that slice and verified staging bucket cutover complete.
