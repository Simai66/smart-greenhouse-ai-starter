# GH-01 security design

**Status:** Approved by product owner for repository implementation; external rollout requires a separate verified operational gate.
**Decision:** GH-01 single-greenhouse pilot, private image storage, Google login for
people, Cloudflare Access Service Auth plus existing HMAC for Pi requests.
**Scope boundary:** This document authorizes repository implementation only. It
does not authorize Cloudflare/Supabase changes, remote D1 migrations, deploys,
or relay/hardware operations.

## User outcome

Only approved GH-01 users and the registered Pi can read or change pilot data.
Sensor/image traffic stays scoped to GH-01; image contents are private; device
commands remain auditable and cannot report success without a device
acknowledgement. Unauthorized access, replay, stale device data, and provider
outages fail closed or remain visibly pending.

## Acceptance criteria for a later implementation

1. Browser APIs require a verified Cloudflare Access JWT and application role;
   missing, invalid, expired, wrong-audience, and unapproved identities fail
   closed. GH-01 remains the only authorized greenhouse.
2. `/api/agent/*` requires both a verified Access service-token assertion bound
   to the registered Pi and the current per-agent HMAC. The public `workers.dev`
   origin cannot bypass either check.
3. Replayed signed requests are rejected; the signature covers HTTP method,
   exact allowlisted route path, canonical query, timestamp, one-time nonce,
   and exact raw body bytes. Request size is bounded before buffering, hashing,
   JSON parsing, or persistence. Retried mutations with a new nonce remain
   business-idempotent.
4. Inspection images are stored in a private bucket. Browser reads require
   application authorization and use short-lived signed download URLs; neither
   D1 metadata nor logs expose a reusable public URL.
5. Pi-to-cloud secrets stay on Pi/Worker; ESP32 credentials remain unique per
   node and are accepted only on the greenhouse LAN. No inbound Internet path
   to Pi is required.
6. Operator authorization, command idempotency, freshness/policy checks,
   pending/acknowledged/failed lifecycle, emergency-stop confirmation, and
   audit evidence remain intact. No real relay is enabled by this work.
7. QA verifies positive and negative auth paths, scope isolation, replay,
   payload limits, private image access/expiry, rate limits, audit evidence,
   and rollback. Cloudflare/Supabase staging evidence is recorded before pilot.

## Scope and roles

**In scope:** GH-01 browser identity and roles; Pi service identity; agent HMAC
and replay protection; private image reads; API resource limits; LAN device
boundary; command/audit safeguards; staging verification and rollback.

**Out of scope:** multiple greenhouses or membership schema; public user
registration; mobile app; MQTT/cloud-initiated Pi connections; ESP32 public
Internet access; AI-model security claims; real relay enablement; production
deployment.

**Owners and dependency order:**

1. Backend publishes auth, signed-request, replay, image and error contracts;
   additive D1 migration and rollback design required before implementation.
2. DevOps configures exact-path Cloudflare Access policies, secret storage,
   private bucket, rate limits, monitoring, and recovery procedure.
3. Edge updates Pi service-token headers, canonical HMAC, nonce/idempotency
   persistence, and secret permissions. Firmware remains LAN-only.
4. Frontend preserves role/scope behavior and obtains authorized image reads;
   no public URL caching.
5. QA validates integrated staging behavior and accessibility of denied,
   expired, offline, and pending states. Hardware owner separately reviews any
   future relay proposal.

## Current system and trust boundaries

- **Browser → Worker:** `authorizeApiRole` validates browser identity only when
  `GREENHOUSE_AUTH_MODE=cloudflare-access`; `cloudflare-access-auth.ts` verifies
  signed user assertions. GH-01 scope is enforced in server helpers. Roles map
  from configured email lists.
- **Pi → Worker:** `/api/agent/*` currently authenticates timestamped HMAC over
  timestamp and body, then checks registered agent/greenhouse. It does not yet
  require an Access service-token assertion, bind HMAC to method/path, or keep a
  one-time replay nonce.
- **Worker → D1:** Drizzle-backed parameterized queries hold greenhouse,
  device, telemetry, commands, image metadata, and audit records. Agent writes
  use the same staging Worker/D1 trust boundary.
- **Worker → Supabase Storage:** Worker uses the service-role key to create
  signed upload URLs. Current setup/runbook specifies a public image bucket and
  stores public URLs. A public object URL is usable by anyone who has it.
- **ESP32 → Pi LAN:** Pi listens on its LAN HTTP port; ESP32 sends a node ID and
  token. Current example binds `0.0.0.0`; network segmentation/firewall remains
  an operator responsibility.
- **Commands → relay:** relay adapter remains a simulator. Software command
  acknowledgement is not proof of physical state.

Current repository evidence: `lib/server/access-control.ts`,
`lib/server/cloudflare-access-auth.ts`, `lib/server/agent-auth.ts`,
`lib/server/inspection-images.ts`, `lib/server/supabase-storage.ts`,
`edge-agent/greenhouse_agent.py`, `edge-agent/docker-compose.example.yml`,
`firmware/esp32/`, `app/api/device-commands/route.ts`, `README.md`, and the
active release card. README currently documents `/api/agent/*` as Access
Bypass and image bucket as public; that runbook must be revised as part of an
approved implementation, before the changed controls are relied on.

## Chosen architecture

### Human identity and API authorization

- Cloudflare Access Google identity policy permits named pilot users only.
- Worker independently validates the Access assertion: signature, issuer,
  audience, expiry/not-before, and verified email; app role mapping still
  decides admin/operator/viewer. Access admission alone grants no operator
  capability.
- Keep GH-01 allow-scope and fail-closed behavior. No client-supplied role,
  email, or greenhouse ID can override server authorization.
- Validate at Worker even when requests arrive through `workers.dev`; Access
  hostname protection alone does not protect the alternate origin.

### Pi machine identity and signed request

- Replace Access Bypass with the narrowest `/api/agent/*` Service Auth policy.
  Keep browser app policy separate. No `Everyone` Bypass rule.
- Pi sends `CF-Access-Client-Id` and `CF-Access-Client-Secret` plus existing
  agent identity and HMAC headers. Keep the service-token secret in Pi-only
  secret storage; Worker stores the expected service-token identity and
  validates the signed Access assertion as a service token. Store its app-path
  audience separately as `CLOUDFLARE_ACCESS_SERVICE_AUD` because the `/api/agent/*`
  Access application may have a different AUD tag from the browser app.
- Worker verifies signature, issuer, audience, expiry and `type: "app"`; for a
  service token require `sub: ""` and `common_name` equal to the configured
  `CF-Access-Client-Id` for that Pi. The JWT does not use
  `service_token_status` or `service_token_id` claims; `service_token_status`
  belongs to the separate `get-identity` response. Reject user JWTs on agent
  routes and service JWTs on browser routes. Both the Access assertion and
  registered-agent HMAC/scope checks are mandatory. [Cloudflare's application
  token contract](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
  documents these service-token claims.
- HMAC input is byte-exact. Every field delimiter is exactly one LF byte
  (`0x0A`), not the two printable characters `\\` and `n`:
  `ASCII(method) + LF + ASCII(exactRoutePath) + LF + ASCII(canonicalQuery) + LF + ASCII(timestamp) + LF + ASCII(nonce) + LF + rawBodyBytes`.
  Match path against the fixed agent-route allowlist before signing. Routes
  without query parameters reject them. `/api/agent/commands` and
  `/api/agent/config` allow only their declared `agentId` and `greenhouseId`
  parameters; reject duplicate/unknown keys and values outside `[A-Za-z0-9._~-]`,
  then sort key/value pairs lexically and serialize each as `key=value` joined
  by `&` (empty query serializes as empty string). Reject percent escapes,
  `+`, encoded paths, and unknown routes. Reject stale timestamps and malformed
  nonces. Read body stream once, count bytes against route cap, then buffer for
  HMAC and strict UTF-8/JSON parse; never call unbounded `request.text()` before
  the cap. D1 failure reserving nonce fails closed.
- Insert `(agent_id, nonce)` into an additive D1 table with a unique constraint
  before mutation; duplicate insert means replay. Retain nonce rows beyond the
  accepted timestamp window, then delete by expiry in scheduled cleanup. Nonce
  blocks exact request replay; it does not make a new-nonce retry idempotent.
  Preserve stable reading IDs, image IDs, detection identities, command
  idempotency keys, and equivalent dedupe for every retried mutation.
- Cross-language conformance vector for Pi and Worker tests: key bytes
  `0123456789abcdef0123456789abcdef`; method `POST`; path
  `/api/agent/heartbeat`; empty canonical query; timestamp
  `2026-10-28T00:00:00.000Z`; nonce
  `00112233445566778899aabbccddeeff`; body UTF-8 bytes
  `{"agentId":"PI-GH-01","greenhouseId":"GH-01"}`; expected HMAC-SHA256
  hex `bd589190aa7b42dfb53dc24fbb20a743508d71272c32bd7dc82259e2294cb54f`.
  This vector checks canonical bytes only; test freshness separately with a
  controlled clock because its timestamp is intentionally historical.

### Private inspection images

- Make `greenhouse-images` private before any sensitive pilot upload. Worker
  service role remains server-only; Pi/browser receive time-limited upload URLs
  and authorized reads receive short-lived signed download URLs.
- Authenticate and authorize every metadata/list/read request before signing.
  Use `Cache-Control: private, no-store` for API responses; never place signed
  URLs in logs, analytics, error messages, or durable D1 rows. URL is a bearer
  credential until expiry, so choose the shortest TTL compatible with viewing
  and avoid third-party referrers.
- Remove public-URL generation from new writes. Additive migration first; do
  not delete historical image metadata. Inventory old public objects, switch
  bucket privacy, invalidate/replace public URL references, and verify direct
  unauthenticated fetch fails before calling storage private. Supabase notes
  signed URLs stay usable until expiry; a bucket privacy change and CDN behavior
  must be tested against existing URLs during staging cutover.
- Restrict content types and 10 MiB file ceiling at app and bucket boundaries;
  validate upload completion against reserved metadata. Keep current retention
  policy unless separately approved.

### Pi/ESP32 network boundary

- Pi makes outbound HTTPS requests only. No cloud-to-Pi listener or router port
  forward. Host firewall allows TCP 8080 only from the greenhouse subnet and
  enrolled ESP32 addresses; isolate IoT SSID/VLAN from guest and office clients.
- Use distinct high-entropy node tokens per ESP32, constant-time comparison,
  rotation procedure, and restrictive Pi environment-file permissions. Do not
  put cloud HMAC or Access service-token credentials in firmware.
- Plain HTTP is acceptable only inside a controlled isolated LAN. If the pilot
  LAN cannot be isolated/trusted, do not treat node token as confidentiality or
  transport integrity; add authenticated TLS before connecting it.

### Commands, availability, and audit

- Preserve operator-only command creation, server-side GH-01 check,
  idempotency, freshness/policy limits, emergency-stop confirmation, and
  `pending → acknowledged | failed`. Never equate command queue acceptance with
  physical relay state.
- Apply Cloudflare rate limits separately to browser and Pi endpoints; keep
  bounded D1 writes and per-agent request limits. Rate-limit responses remain
  retryable only under documented `Retry-After` behavior.
- Record actor/agent identity, greenhouse, route/action, decision, request ID,
  command/image IDs, timestamp, and outcome. Do not record secrets, raw image
  data, authorization headers, signed URLs, or unnecessary plant/person data.
  Alert on repeated auth/replay failures, rate-limit spikes, agent silence,
  cleanup failures, and command timeout/failure.
- Keep D1 migrations additive. Rollback means restoring prior Worker and edge
  release while retaining new tables/history; disable new enforcement only by
  returning to a reviewed safe staging configuration, never by opening a
  bypass. Document emergency secret rotation and restoration from backups.

## Threat model (GH-01 pilot)

**Assets:** user sessions and roles; greenhouse telemetry/configuration;
inspection images; Pi and per-node credentials; D1 command/audit history; safe
physical greenhouse operation.

**Attacker goal:** read private images/data, impersonate a user/Pi/ESP32, alter
telemetry or commands, replay requests, exhaust Worker/D1/storage, or make an
unsafe relay action appear successful.

| Attack path (AND/OR leaves) | Cost / skill / time / detectability | Primary control | Residual risk |
|---|---|---|---|
| Steal/reuse public image URL OR enumerate object paths | Low / low / minutes / low | Private bucket; auth before short-lived signing; no-store; remove old public references | Signed URL remains bearer access until expiry; CDN cache needs staging test |
| Call public `workers.dev` directly OR forge identity headers | Low / low / minutes / medium | Verify Access assertion in Worker for every route; roles and GH-01 scope server-side | Access identity-provider/account compromise |
| Obtain Pi HMAC key OR steal Access service token | Medium / medium / hours / medium | Two independent credentials, restricted Pi storage, allowed token identity, rotation and failure alerts | Pi compromise exposes both local credentials |
| Replay valid captured request within timestamp window | Low / low / minutes / low | Signature binds method/path/body plus one-time D1 nonce; idempotency for retries | D1 outage must fail closed; request/nonce table capacity |
| Change body/path or claim another agent/greenhouse | Low / medium / minutes / medium | Canonical HMAC, exact registered-agent secret, schema validation, GH-01 scope | Canonicalization bugs; test all query/path encodings |
| Flood huge/rapid payloads to exhaust Worker/D1/storage | Low / low / minutes / high | Streaming body cap, endpoint rate limits, per-agent quotas, image ceiling, alerts | Provider limit/price changes; tune from staging load evidence |
| Reach Pi port from guest/WAN OR steal ESP32 token | Medium / low / minutes-hours / medium | No port forward; firewall/VLAN allowlist; unique node token; restrict file access | Physical LAN access or unsegmented Wi-Fi defeats network assumption |
| Trick operator into unsafe command OR spoof success | Medium / medium / minutes / high | Operator role, policy/freshness, confirmation, audit, ack-only success, simulator-only | Software cannot prove wiring, relay polarity, or fail-safe behavior |
| Modify/deplete audit evidence | Medium / medium / hours / medium | Least-privileged Worker binding, backups, append-only event pattern, restore drill | D1 account/admin compromise; backup restore not yet evidenced |

The trust boundaries and attacks are in scope for the authorized GH-01 pilot.
Do not perform public scanning, credential guessing, or real relay tests as part
of verification.

## Decisions and unknowns

**User-approved:** one greenhouse only, GH-01. Earlier user confirmed staging
and a real sensor are available; this design does not assume that Access,
Supabase, LAN segmentation, or commissioning have been configured or verified.

**Builder decisions:** use Cloudflare Access Service Auth and Worker-side
assertion verification for Pi; keep existing HMAC as a second gate; use private
image storage and short-lived signed reads; enforce a one-time replay nonce;
keep real relay disabled.

**Must verify before implementation/runbook:**

- Cloudflare Access application/audience and assertion claims for the actual
  service token; policy precedence for the exact staging paths; whether current
  Worker verifier needs a service-token validation branch.
- Supabase project/bucket configuration, current public objects and URL reuse,
  signed URL TTL, CDN cache invalidation behavior, and rollback procedure.
- Pi secret store/file ownership, greenhouse subnet, firewall/VLAN, ESP32 source
  IP stability, and whether local HTTP is acceptable on the actual LAN.
- D1 unique-insert semantics and write volume for nonce enforcement; scheduled
  cleanup and retention under staging traffic.
- Cloudflare rate-limit availability/plan and limits; request body ceilings per
  route; alert destinations and backup/restore owner.
- Staging smoke evidence: approved Google user, denied user, direct `workers.dev`
  denial, valid/invalid Pi credentials, replay rejection, authenticated/private
  image fetch, telemetry freshness, and no relay activation.

No user decision blocks this design draft. Implementation must stop for a
product/security decision if staging cannot validate both Access identities,
private storage cutover could expose existing images, or network isolation is
not available. Do not compensate by weakening auth or restoring public access.

## Rollout and rollback gates

1. Build and test verifier, API contracts, additive nonce schema, image signing,
   and runbook in local test environment. Existing clients remain compatible
   only where feature contract explicitly permits; Pi token migration is a
   coordinated release.
2. Provision staging secrets/policies, private bucket, firewall and distinct
   Pi/ESP32 credentials. Back up staging D1 and inventory public image URLs
   before switching storage.
3. Deploy Worker and Pi in staging; verify positive/negative matrix above,
   command pending/ack/failure truth, logs, alerts, rate limits, and recovery.
   Do not test a real relay.
4. Roll back Worker/edge versions if smoke fails; keep additive schema and
   audit/nonce history. Keep new Access and bucket controls closed. Existing
   Worker image flows that expect `publicUrl` will fail while bucket stays
   private; treat this as a temporary image-service outage and forward-fix by
   restoring private signed reads. Never make images public as routine rollback.
   Verify old public URLs against origin and CDN/cache behavior before declaring
   cutover complete. If cached copies remain, treat affected images as exposed
   until purge, expiry, or replacement is proven.
5. Production and physical actuation require separate approval, hardware
   commissioning, independent safety review, and a tested physical stop.

## Security references

- [Cloudflare Access Service Tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/)
- [Cloudflare Access application token claims](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
- [Validate Access JWT in a Worker](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Cloudflare Access application paths](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [Supabase bucket access control](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Supabase private downloads and signed URLs](https://supabase.com/docs/guides/storage/serving/downloads)
- [OWASP ASVS](https://asvs.owasp.org/) (control checklist; not a certification claim)
