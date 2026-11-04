# Feature card: Reliability and security remediation

Status: Active — audit follow-up approved 2026-11-04

## Outcome

Preserve accepted greenhouse telemetry, keep command audit evidence consistent,
protect Pi-to-ESP32 credentials in transit, and serve inspection images only to
authorized users.

## Acceptance criteria

- Rejected outbound queue records remain inspectable and cannot disappear without an explicit, recorded disposition; accepted records remain idempotent across retries.
- Persisted telemetry and threshold-alert lifecycle recover together after partial failure or retry.
- Command state transitions and matching audit events commit atomically; concurrent acknowledgements cannot overwrite terminal state.
- LAN node credentials travel over authenticated encrypted transport, with documented certificate provisioning and rotation.
- Inspection objects use private storage; only authorized image readers receive short-lived signed read URLs.
- Existing images remain accounted for during bucket cutover; migration has verified evidence and actionable rollback.
- Targeted edge/backend tests, lint, typecheck, build, staging smoke, and QA negative paths pass before release gate closes.

## Scope

In scope: Pi outbox handling, telemetry alert persistence, command/event persistence,
LAN transport, Supabase image privacy, API response paths, tests, runbook,
staging verification and rollback.

Out of scope: enabling physical relay control, production rollout, changing sensor
hardware, model inference, or unrelated dashboard redesign.

## Affected areas

- API/database: `app/api/agent/telemetry/route.ts`, command routes, `db/schema.ts`,
  migrations if quarantine/audit storage requires a new table.
- Edge/hardware: `edge-agent/greenhouse_agent.py`, `firmware/esp32/`.
- Images: `lib/server/supabase-storage.ts`, `lib/server/inspection-images.ts`,
  `app/api/images/`, related client API and image views.
- Docs/deployment: README, API contract, staging runbook, Supabase bucket setup.

## Assumptions, unknowns, and risks

- User reports Pi-to-real-telemetry path has passed; code and deployment evidence still need QA readback before this remediation is marked complete.
- Recommend TLS with a project-controlled CA trust chain for LAN requests. Confirm Pi DNS/IP and certificate issuance/rotation owner before implementation.
- Private image cutover needs Supabase project access, private bucket provisioning, inventory of existing objects, and agreed retention for legacy public URLs.
- Hardware commissioning and emergency interlock remain separate release blockers.

## Owner and dependency order

1. Backend + Edge: agree queue rejection disposition and retry/ack semantics.
2. Backend: make telemetry/alert and command/event state changes atomic.
3. Edge + Hardware: provision TLS identity and move ESP32-to-Pi requests to verified HTTPS.
4. DevOps + Backend: provision private bucket, migrate/verify objects, issue authorized signed reads.
5. QA: exercise failure/restart/concurrency, auth boundaries, privacy, and staging rollback.

## Release gate

No queue data loss; no missing audit event for committed command state; no
unauthenticated public image reads; TLS identity and rotation verified; all
targeted checks and staging evidence recorded; rollback owner named. Physical
actuator pilot remains gated by hardware review and interlock evidence.

## Implementation checkpoint — 2026-11-02

- Complete: Pi permanent-rejection quarantine; telemetry/alert atomic batch;
  command/audit atomic transitions and ACK guard.
- Verification: Python edge suite 23 passed; unit suite 80 passed; targeted
  transaction tests 3 passed; file-scoped ESLint clean; production build passed.
- Existing typecheck baseline remains: 7 Cloudflare worker type/global errors
  in pre-existing files; no new errors from this change.
- Waiting: Pi hostname and certificate rotation owner for TLS work; Supabase
  project/bucket access, object inventory, and legacy public-link cutover for
  private image storage.
- Release remains open. No staging TLS, bucket migration, or integrated QA
  evidence collected in this checkpoint.

## Audit follow-up — 2026-11-04

- Outcome: close verified audit defects in image privacy, mixed telemetry batches,
  and edge-agent Python compatibility while preserving queued data and API auth.
- Acceptance: image APIs return only short-lived `readUrl` values for ready,
  unexpired objects; clients and contract use `readUrl`; responses containing
  signed URLs are `no-store`; storage signing failures return service errors.
- Acceptance: telemetry validates readings independently, stores valid readings
  atomically with their threshold effects, reports rejected indexes, and edge
  agent atomically quarantines rejected items from HTTP 202 batches; malformed
  envelope and storage failures still fail closed.
- Acceptance: edge agent imports UTC compatibly and tests run on supported Python;
  command, ACK, and telemetry storage failures emit safe diagnostic event names.
- Audit dispositions: retain 401/403 outbox retries because tests and data-safety
  contract require preserving queued readings during credential recovery. Keep
  fixed GH-01 scope fail-closed until membership authorization is implemented;
  environment override alone would not safely enable multiple greenhouses.
- Typecheck item: verify current `@cloudflare/workers-types` dependency and
  `npx tsc --noEmit` before changing config; avoid duplicate dependency.
- Cutover evidence — 2026-11-04: Supabase project ref `idzdofvqwtkusxnwlefj`
  reports `ACTIVE_HEALTHY`; bucket `greenhouse-images` now has `public=false`.
  Pre/post object count: 1; object was not moved or deleted. Anonymous HEAD to
  its former public URL returned HTTP 400. Environment label was not confirmed.
- Remaining image gate: QA must verify authorized signed reads through the
  deployed Worker and check old public URLs/CDN behavior before release. Local
  code tests do not prove deployed integration.
- Owner/order: Backend updates signed image and telemetry APIs; Frontend updates
  image client and view; Edge keeps UTC compatibility; QA reviews integrated
  behavior; DevOps completes private bucket cutover before release.
