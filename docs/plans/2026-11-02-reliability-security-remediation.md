# Reliability and Security Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close six code-review findings across telemetry delivery, audit consistency, LAN transport, and inspection-image privacy.

**Architecture:** Preserve current Next.js/Cloudflare Worker, D1, Pi agent, ESP32, and Supabase design. Make retries and D1 state changes recoverable, encrypt the local device link, and move image reads behind authorization with short-lived signed URLs. Keep deployment and hardware changes staged with rollback evidence.

**Tech Stack:** TypeScript, Next.js App Router, Cloudflare Workers/D1, Drizzle, Python 3, ESP32 Arduino, Supabase Storage.

---

## Governing feature card

`docs/feature-cards/2026-11-02-reliability-security-remediation.md`

## Execution checkpoint — 2026-11-02

- Tasks 1–3 implemented and locally verified; see feature card for checks.
- Task 4 waiting on stable Pi hostname and certificate/rotation owner.
- Task 5 waiting on Supabase project/bucket access and approved legacy-link cutover.
- Task 6 remains open until Tasks 4–5 have staging evidence.

## Current findings covered

1. Pi outbox discards non-retryable 4xx records, despite local dedupe already marking source readings as received.
2. Telemetry persists before threshold-alert updates; retries can leave alerts permanently absent.
3. Command state and audit-event writes are separate; ACK update has no conditional terminal-state guard.
4. ESP32 sends LAN token over HTTP to a Pi server bound to all interfaces.
5. Inspection objects expose public URLs without app authorization.
6. Command creation persists command before its audit event.

## Task 1: Preserve rejected Pi outbox records

**Owner:** Edge

**Files:**
- Modify: `edge-agent/greenhouse_agent.py` (`retryable_http`, `flush_queue`, queue storage)
- Modify: `edge-agent/test_greenhouse_agent.py`
- Modify: `docs/api/edge-agent-v1.md` and `README.md` if disposition/runbook changes

**Steps:**

1. Add tests for 400, 404, 413, 401/403, 429, and 5xx responses from queue flush.
2. Define explicit disposition: retry transient/auth failures; quarantine permanent client rejections with status, response summary, timestamp, and original payload; never silently delete telemetry/ACK records.
3. Implement durable quarantine or a terminal queue state in existing SQLite store; bound stored error text and avoid logging credentials or full image URLs.
4. Keep image cleanup behavior explicit: delete local image only after successful upload or an operator-visible permanent rejection policy; do not delete on transient errors.
5. Document operator inspection/replay/removal steps and idempotency behavior.
6. Run `python3 -m unittest discover -s edge-agent -p 'test_greenhouse_agent.py'`.

**Acceptance:** A permanent 4xx remains visible and recoverable; retryable failures remain queued; success removes only delivered item; restarting Pi preserves queue/quarantine state.

**Status:** Implemented. Tests cover permanent telemetry and image rejection, transactional quarantine failure, and queue visibility. Python suite: 23 passed. Restart persistence follows SQLite-backed queue/quarantine storage; no separate process-restart test added.

## Task 2: Make telemetry and threshold alerts retry-safe

**Owner:** Backend

**Files:**
- Modify: `app/api/agent/telemetry/route.ts`
- Modify: `lib/server/sensor-telemetry.ts` only if extracting a pure transition helper is needed
- Modify: `tests/sensor-telemetry.test.ts`; add a focused route/store test if current test harness can simulate D1 failure

**Steps:**

1. Add a regression case: reading insert succeeds, alert persistence fails, identical telemetry retries, and final alert state is correct.
2. Move reading inserts and threshold-alert transitions into one D1 batch/transaction, using D1-native conditional statements to avoid read-then-write races.
3. Preserve duplicate reading semantics and ensure duplicate retries still repair any derived alert state if atomic transaction cannot cover it.
4. Verify valid, suspect, and invalid quality behavior; invalid readings must not open or resolve threshold alerts.
5. Run `node --experimental-strip-types --test tests/sensor-telemetry.test.ts` and relevant route tests.

**Acceptance:** A failed request leaves either both reading and alert transition committed or neither; retry produces one reading and correct alert lifecycle.

**Status:** Implemented. D1 batch keeps reading insert and alert transition atomic. Route transaction tests cover rollback, retry, duplicate, and resolve paths. Targeted route tests passed.

## Task 3: Make command state and audit writes atomic

**Owner:** Backend

**Files:**
- Modify: `app/api/device-commands/route.ts`
- Modify: `app/api/agent/commands/route.ts`
- Modify: `app/api/agent/commands/[commandId]/ack/route.ts`
- Modify: `db/schema.ts` or `drizzle/` only if a uniqueness constraint is needed
- Add/update: focused command lifecycle tests under `tests/`

**Steps:**

1. Add tests for create/event partial failure, ACK/event partial failure, duplicate ACK, concurrent ACK with opposite outcomes, and expired command ACK.
2. Batch command insert with initial `requested` event.
3. Use conditional state transitions from allowed nonterminal states; atomically write terminal state, event, and reported device status.
4. Return idempotent ACK only when stored terminal state matches requested outcome; reject conflicting terminal ACK without overwriting prior state.
5. Ensure poll dispatch and timeout transitions each write state plus matching event atomically and only once.
6. Run focused command tests and `node --experimental-strip-types --test tests/device-policy.test.ts`.

**Acceptance:** Every committed command transition has exactly one matching event; partial writes roll back; concurrent ACK cannot change terminal outcome; poll retries remain safe.

**Status:** Implemented. Command route transaction tests cover rollback, matching event, conflicting ACK protection, and batch usage in create/poll/ACK paths. Targeted tests passed.

## Task 4: Encrypt and authenticate ESP32-to-Pi traffic

**Owner:** Edge + Hardware; DevOps owns certificate lifecycle

**Files:**
- Modify: `firmware/esp32/src/main.cpp`
- Modify: `firmware/esp32/README.md` and `platformio.ini` only if required for CA provisioning
- Modify: `edge-agent/greenhouse_agent.py`
- Modify: `edge-agent/docker-compose.example.yml`
- Modify: `edge-agent/test_greenhouse_agent.py`; add firmware verification notes/tests where feasible

**Steps:**

1. Confirm Pi DNS name/IP, certificate authority, certificate renewal method, and hardware owner for CA trust updates.
2. Add a failure test/check showing an untrusted or expired Pi certificate blocks config and telemetry requests.
3. Serve the Pi local API over TLS and retain per-node token authentication; use a project-controlled CA or equivalent verified certificate chain.
4. Replace ESP32 `WiFiClient` with certificate-validating `WiFiClientSecure`; do not use insecure mode or disable hostname validation.
5. Keep LAN token out of logs and document provisioning, renewal, and recovery when certificates expire.
6. Run Python edge tests; compile firmware with PlatformIO if available; perform staging LAN smoke with invalid-certificate negative case.

**Acceptance:** ESP32 rejects wrong-host, expired, and untrusted certificates; valid certificate plus valid node token succeeds; plaintext endpoint cannot receive credentials.

## Task 5: Move inspection images to private storage

**Owner:** Backend + DevOps; QA validates access

**Files:**
- Modify: `lib/server/supabase-storage.ts`
- Modify: `lib/server/inspection-images.ts`
- Modify: `app/api/images/route.ts` or add `app/api/images/[imageId]/read-url/route.ts`
- Modify: `lib/inspection-images-api.ts` and image view components
- Add/update: `tests/inspection-images.test.ts`, `tests/image-reservation.test.mjs`, API auth tests
- Modify: `README.md`, `docs/api/images-v1.md`, staging runbook

**Steps:**

1. Inventory current bucket privacy, object count, public URLs, retention dates, and consumers; record legacy URL exposure and proposed cutover window.
2. Add tests proving unauthenticated/cross-greenhouse readers cannot obtain signed URLs and authorized readers receive short-lived URLs only for ready, unexpired images.
3. Add server helper to create signed read URLs for private bucket; never return permanent public URL from APIs.
4. Update image-list/read client to use signed URLs and handle expiry by refetching metadata.
5. Provision private bucket in staging; copy existing in-scope objects and verify count/size or checksum before updating D1 records.
6. Switch staging API to private bucket, test upload/completion/read/retention, and verify old public URLs no longer expose images after approved cutover.
7. Keep legacy bucket read-only during rollback window; document exact restore and cleanup steps before deleting any old objects.
8. Run image tests and staging auth/privacy smoke tests.

**Acceptance:** Public anonymous read fails; authorized same-greenhouse user gets expiring signed URL; cross-scope access fails; upload, retry, completion, and retention remain correct; object migration reconciles fully.

## Task 6: Integrated QA and release evidence

**Owner:** QA; Backend, Edge, DevOps, Hardware provide evidence

**Files:**
- Update: `docs/feature-cards/2026-11-02-reliability-security-remediation.md`
- Update: `docs/feature-cards/2026-10-28-tech-lead-live-readiness.md` and active release evidence as results become available
- Update: `README.md` rollback/runbook sections

**Steps:**

1. Run targeted Python and TypeScript tests from Tasks 1–5.
2. Run file-scoped lint, `npx tsc --noEmit`, and `npm run build`.
3. Exercise staging: Pi offline/restart/flush; rejected payload quarantine; threshold alert retry; duplicate/concurrent command ACK; TLS negative paths; private image upload/read/expiry.
4. Confirm rollback for D1 code, Pi/ESP32 certificate config, and private bucket cutover without discarding queues, audit events, or image objects.
5. Record commands, outputs, timestamps, owners, residual risks, and monitoring in the feature card.
6. Close release gate only after QA pass and hardware interlock review; keep dashboard labeled demo until broader real-operation gate passes.

**Acceptance:** All targeted gates pass; no unresolved blocker/major without written owner acceptance; staging evidence and rollback owner recorded.

## Dependency order

1. Feature card and contract decisions.
2. Tasks 1–3 backend/edge reliability work; can proceed independently after contract alignment.
3. Task 4 certificate and hardware ownership decision, then coordinated Pi/ESP32 rollout.
4. Task 5 private bucket provisioning and staged data migration.
5. Task 6 integrated QA and release decision.

## Risks and decisions to confirm before implementation

- The user's report says Pi telemetry connection passed; current repository readiness docs still say commissioning evidence is missing. Update those records only after receiving/collecting real staging evidence.
- TLS needs a stable Pi hostname and certificate rotation owner. Without these, firmware rollout can strand ESP32 nodes.
- Private bucket migration can break previously shared public links; retain rollback window and do not remove old objects before reconciliation.
- Queue quarantine needs retention and operator permissions so it does not become an unbounded disk-growth path.
- Relay adapter remains simulator; no plan task enables physical relay operation.
