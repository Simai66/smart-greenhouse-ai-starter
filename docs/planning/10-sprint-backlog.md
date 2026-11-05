# 10 — Sprint backlog

Effort uses person-days as planning assumptions. Each task uses the same DoD: acceptance criteria pass, listed checks run with evidence, QA finding is pass or documented residual risk, and owning specialist returns Thai handoff. Hardware-dependent values stay `REQUIRES_CONFIGURATION`; S1-02 does not enable actuation.

## Sprint 1 — Baseline and hardware reliability

### S1-01 Repository baseline
- **Status:** Complete 2026-11-05. Automated QA checks pass; hardware and deployment remain unverified.
- **Description / owner:** Produce evidence-backed baseline for current GH-01 implementation. Main agent; QA reviews.
- **Priority / dependencies / effort:** P0 / none / 2–3d.
- **Files/modules:** `docs/feature-cards/`, `docs/planning/`, `README.md`, tests, firmware and gateway.
- **Steps:** Inspect status and source; classify requirements; run current checks; record unverified hardware/deployment claims.
- **Acceptance:** Every status points to repository evidence or says unverified; working tree changes preserved.
- **Tests:** Existing unit, Python, typecheck and build baseline; no claim of hardware test.
- **DoD:** Audit and feature card reviewed; evidence/results/date recorded.

**Baseline evidence — 2026-11-05:** Current worktree changes preserved. Repository
docs keep dashboard demo-only; exact ESP32 board, relay wiring, calibration,
physical emergency-off, and actuator behavior remain unverified. Initial unit
failure came from a stale palette assertion; updated `tests/design-system-contract.test.mjs`
to match current `design.md` and CSS tokens. S1-01 completion gate: `npm test`
passed with 81 unit, 36 Python, build, and 3 rendered HTML checks. `npx tsc --noEmit`, targeted
ESLint, and `git diff --check` passed. Full lint had 0 errors and 7 existing
warnings. Build reports a >500 kB chunk and routes it cannot classify statically.
An earlier local Worker run returned intermittent HTTP 500; repeated smoke and
full `npm test` passed. No hardware/deployment tests ran.

### S1-02 Hardware map and safety requirements
- **Status:** Repository source audit recorded 2026-11-05; bench verification blocked pending hardware-owner inputs. See `docs/feature-cards/2026-11-04-hybrid-edge-cloud-gh01.md`.
- **Description / owner:** Verify board, sensors, pins, relay wiring and calibration method. Hardware owner with Edge specialist.
- **Priority / dependencies / effort:** P0 / S1-01 / 3–5d.
- **Files/modules:** `firmware/esp32/`, wiring diagrams, sensor configuration, hardware test notes.
- **Steps:** Inspect physical parts; map each sensor/output; define invalid-reading behavior; record candidate limits and owner decisions.
- **Acceptance:** Wiring/mapping is bench-verified; every unknown limit remains `REQUIRES_CONFIGURATION`; actuator remains disabled until values and interlock are approved.
- **Tests:** Sensor disconnect/short/invalid-value checks; relay de-energized boot and independent emergency-OFF test.
- **DoD:** Hardware owner signs evidence; no fabricated sensor values or safety limits.

**Repository evidence — 2026-11-05:** `platformio.ini` targets generic `esp32dev`;
exact board/revision is unknown. Firmware config uses SHT30 I2C `0x44`, SDA
GPIO21, SCL GPIO22; one configured sensor endpoint. Point B returns invalid.
Pi `RelayDriver` is a simulator; ESP32 source has no relay GPIO output. No
physical relay, wiring, load, fuse, calibration, safe-boot, or emergency-OFF
evidence found. PlatformIO CLI unavailable; firmware build not run. Keep all
hardware safety values `REQUIRES_CONFIGURATION` and actuators disabled.

### S1-03 Local database durability
- **Status:** Local migration, backup/restore tests, and runbook complete 2026-11-05; Pi restore drill and capacity policy remain pre-rollout gates.
- **Description / owner:** Establish consistent backup/restore and queue migration safety. Edge + Backend.
- **Priority / dependencies / effort:** P0 / S1-01 / 2–4d.
- **Files/modules:** `edge-agent/greenhouse_agent.py`, SQLite schema, `edge-agent/test_greenhouse_agent.py`, backup runbook.
- **Steps:** Inventory old rows; backup with SQLite-aware method; test restore; design additive explicit queue states and legacy-row mapping.
- **Acceptance:** Existing queue/quarantine/readings survive backup, migration and restart; no data is silently dropped.
- **Tests:** Restore copy; restart during queued writes; duplicate/outbox preservation checks.
- **DoD:** Runbook and evidence accepted before migration code is enabled.

**Current evidence:** Additive migration maps legacy queue rows to `PENDING`;
transient failures persist as `RETRY`; permanent rejects remain in quarantine.
Successful delivery keeps existing delete behavior. Tests cover legacy upgrade,
retry recovery, backup/restore of queue/quarantine/inbound dedupe, and SQLite
integrity. Full gate passed: 81 unit, 37 Python, build, and 3 rendered HTML
checks. No payload pruning or synced-history retention added. Pi restore drill,
image spool capacity, free-space reserve, and full-queue policy remain rollout
risks; do not roll this image to Pi until backup and capacity gate is satisfied.

## Sprint 2 — Secure MQTT

### S2-01 Mosquitto TLS and ACL
- **Description / owner:** Deploy a least-privilege broker configuration. DevOps + Backend.
- **Priority / dependencies / effort:** P0 / S1-02 / 3–5d.
- **Files/modules:** new Mosquitto config, compose/service config, firewall and credential runbooks.
- **Steps:** Configure TLS listener/CA, device credentials, topic ACL, LWT, firewall and rotation/revocation steps.
- **Acceptance:** Anonymous and wrong-identity access denied; each test identity limited to provisioned topics.
- **Tests:** Broker integration: valid/invalid CA, credentials, topic publish/subscribe, restart and LWT.
- **DoD:** Secrets external to repo; DevOps records restore/rotation and rollback steps.

### S2-02 ESP32 MQTT client and durable buffer
- **Description / owner:** Add TLS MQTT transport and bounded offline telemetry buffer. Edge firmware specialist.
- **Priority / dependencies / effort:** P0 / S2-01, S1-02 / 5–8d.
- **Files/modules:** `firmware/esp32/src/main.cpp`, `firmware/esp32/platformio.ini`, firmware tests/docs.
- **Steps:** Select compatible MQTT library; persist event IDs/sequence; QoS1/reconnect/backoff; configure measured buffer capacity and safe overflow behavior.
- **Acceptance:** Broker loss/reboot retains samples within configured capacity; TLS verification failure never falls back insecure; safety remains local.
- **Tests:** PlatformIO compile; broker outage, queue-full, duplicate delivery, wrong CA, time-unavailable and reboot bench tests.
- **DoD:** QA and hardware owner sign results; no physical control enabled by transport change.

### S2-03 Pi MQTT consumer
- **Description / owner:** Validate, deduplicate and persist device messages. Edge + Backend.
- **Priority / dependencies / effort:** P0 / S2-01, S1-03 / 4–6d.
- **Files/modules:** `edge-agent/greenhouse_agent.py`, SQLite migrations and Python tests.
- **Steps:** Subscribe by provisioned identity; validate schema/device/sequence; atomically store and ACK; handle duplicates and malformed messages.
- **Acceptance:** Duplicate event has one effect; malformed or wrong-device message is rejected and diagnosed without secret logging.
- **Tests:** MQTT integration, DB restart/readback, malformed payload and sequence-order tests.
- **DoD:** Contract and tests pass; existing REST ingress remains available until canary gate.

### S2-04 HTTP-to-MQTT canary
- **Description / owner:** Migrate transport without loss. Edge + QA.
- **Priority / dependencies / effort:** P1 / S2-02, S2-03 / 2–3d.
- **Files/modules:** ESP32 transport config, gateway routes, migration runbook.
- **Steps:** Run bounded canary; compare event IDs/counts; retain rollback; switch only after parity.
- **Acceptance:** No unexplained loss or duplicate effect; rollback restores working HTTP path.
- **Tests:** Controlled broker/network interruption and post-run DB reconciliation.
- **DoD:** QA signs reconciliation; old path removed only in separately reviewed change.

## Sprint 3 — Local web

### S3-01 Local API and HTTPS
- **Description / owner:** Serve local operations API over trusted HTTPS. Backend + DevOps.
- **Priority / dependencies / effort:** P0 / S2-03 / 4–6d.
- **Files/modules:** `edge-agent/`, Caddy config, local API contract and runbook.
- **Steps:** Implement latest/history/status/command/ACK routes; configure Caddy Private CA, stable hostname/SAN, trusted time and firewall.
- **Acceptance:** LAN credentials never traverse HTTP; mismatch/untrusted CA fails closed; local API reports freshness/source.
- **Tests:** API contract, TLS trust/mismatch, auth boundary and Pi restart checks.
- **DoD:** Client trust and certificate renewal documented; no production rollout implied.

### S3-02 Local accounts and authorization
- **Description / owner:** Add separate local user accounts and auditable roles. Backend.
- **Priority / dependencies / effort:** P0 / S3-01 / 3–5d.
- **Files/modules:** Pi auth module, local SQLite schema, auth contract, frontend adapter.
- **Steps:** Define roles, bootstrap/admin recovery, password hashing, session expiry and audit events; keep credentials local.
- **Acceptance:** Unauthorized requests fail closed; user actions identify actor; hashes never sync to D1.
- **Tests:** Login/lockout/recovery/role/CSRF/session-expiry tests as applicable to chosen transport.
- **DoD:** Security review and recovery drill pass; secrets not logged.

### S3-03 Shared dashboard and command ACK
- **Description / owner:** Replace production-facing demo data with local/cloud adapter and real command lifecycle. Frontend + Backend.
- **Priority / dependencies / effort:** P0 / S3-01, S3-02 / 4–7d.
- **Files/modules:** `components/greenhouse/`, `lib/` API adapters, local API client.
- **Steps:** Read real data; show quality/freshness/config; send authorized commands; represent pending/acknowledged/failed/expired states.
- **Acceptance:** UI never claims physical success before device ACK; stale/missing readings are explicit; demo remains labeled.
- **Tests:** API integration, timeout/offline/negative command, keyboard, focus, responsive and 44px target checks.
- **DoD:** Frontend + QA sign functional and accessibility results.

## Sprint 4 — Edge AI

### S4-01 Camera and research dataset
- **Description / owner:** Verify Pi camera and create labeled tomato-image collection workflow. Edge + thesis owner.
- **Priority / dependencies / effort:** P1 / S1-01 / 4–7d.
- **Files/modules:** `edge-agent/`, capture config, research manifest and retention docs.
- **Steps:** Verify camera; record schedule/manual capture provenance; define labels; archive checksummed images separately.
- **Acceptance:** Failed/missed capture is logged; archive survives operational 15-day expiry; cadence stays configurable.
- **Tests:** Capture success/failure, checksum/readback, restart and retention-separation checks.
- **DoD:** Dataset consent/label protocol and owner recorded; no performance claim yet.

### S4-02 Inference runtime and storage
- **Description / owner:** Benchmark and integrate compatible MobileNetV2/TFLite runtime. Edge/AI specialist.
- **Priority / dependencies / effort:** P1 / S4-01 / 5–8d.
- **Files/modules:** inference module/image, SQLite AI metadata, deployment configuration.
- **Steps:** Benchmark Ubuntu 24.04 arm64; select runtime from evidence; preprocess; load/version model; persist confidence/latency/errors.
- **Acceptance:** Inference is reproducible and does not affect actuator safety; each result links image/model/runtime versions.
- **Tests:** Invalid image/model failure, repeat input, Pi latency/CPU/RAM and restart tests.
- **DoD:** Runtime choice and measured resource budget documented; no unsupported metrics.

### S4-03 Thesis model evaluation
- **Description / owner:** Produce repeatable held-out evaluation. Thesis owner + AI specialist; QA reviews.
- **Priority / dependencies / effort:** P1 / S4-02 / 5–10d.
- **Files/modules:** experiment scripts, dataset manifest, report.
- **Steps:** Split by plant/session; freeze model/data versions; compute confusion matrix and requested metrics; rerun.
- **Acceptance:** Accuracy, precision, recall, F1, latency and resource use match reproducible run; leakage risk documented.
- **Tests:** Script repeatability and held-out manifest validation.
- **DoD:** Report cites dataset/model versions and limitations; no results fabricated.

## Sprint 5 — Hybrid cloud

### S5-01 Durable cloud sync
- **Description / owner:** Implement explicit local queue state and idempotent Worker batch. Backend + Edge.
- **Priority / dependencies / effort:** P0 / S1-03, S3-01 / 4–6d.
- **Files/modules:** SQLite queue, `app/api/agent/telemetry/`, `worker/`, D1 schema/migrations.
- **Steps:** Add event ID/state/attempt metadata; migrate rows additively; validate batches; retry transient failures with backoff; preserve permanent failures.
- **Acceptance:** PENDING/RETRY/SYNCED/FAILED recover after reboot; same event is applied once; no queue loss.
- **Tests:** D1 idempotency, transient/permanent failures, outage/restart, migration and restore tests.
- **DoD:** D1 migration is additive and reviewed; failure and capacity runbooks exist.

### S5-02 Remote dashboard and command lifecycle
- **Description / owner:** Complete remote read and request-to-device-ACK path. Backend + Frontend + Edge.
- **Priority / dependencies / effort:** P0 / S3-03, S5-01 / 4–7d.
- **Files/modules:** Worker command APIs, D1 commands/events, Pi poller, MQTT command/ACK, frontend.
- **Steps:** Remote user submits authorized request; Pi fetches; ESP32 validates expiry/safety; ACK returns through Pi/cloud.
- **Acceptance:** Cloud never bypasses local safety; command is not shown executed before ESP32 ACK; expired request is rejected.
- **Tests:** auth/expiry/replay/offline/ACK-loss and audit consistency tests.
- **DoD:** End-to-end QA evidence and rollback plan recorded; hardware activation still requires safety gate.

## Sprint 6 — Offline and verification

### S6-01 Read-only PWA cache
- **Description / owner:** Add static asset and telemetry snapshot caching. Frontend.
- **Priority / dependencies / effort:** P1 / S3-03 / 3–5d.
- **Files/modules:** frontend manifest/service worker/IndexedDB and connection-state model.
- **Steps:** Cache versioned assets/snapshots; label age/source; implement six states; exclude commands from replay queue.
- **Acceptance:** Cached view is read-only and visibly stale; no command replay; cache upgrade handles old version.
- **Tests:** offline/online/state matrix, browser reload, stale timestamp and keyboard tests.
- **DoD:** Frontend and QA sign supported browsers and cache behavior.

### S6-02 System failure and security verification
- **Description / owner:** Verify integrated outage, security and recovery behavior. QA, read-only; owners fix findings.
- **Priority / dependencies / effort:** P0 / S2–S5 / 5–8d.
- **Files/modules:** all runtime paths, test suites, firewall/cert/backup runbooks.
- **Steps:** Run failure matrix; inspect audit/log redaction; report severity and reproducible steps; retest fixes.
- **Acceptance:** No open blocker; residual risk accepted by user; hardware checks signed by hardware owner.
- **Tests:** Pi/broker/cloud loss, power restart, wrong cert/ACL, unauthorized command, E-stop and restore.
- **DoD:** QA report has pass or explicit residual-risk acceptance; no deployment without separate gate.

### S6-03 Thesis report and release gate
- **Description / owner:** Assemble reproducible experiment and release evidence. Main agent + thesis owner; QA/DevOps review.
- **Priority / dependencies / effort:** P1 / S4-03, S6-02 / 2–4d.
- **Files/modules:** `docs/planning/`, experiment report, release/runbook evidence.
- **Steps:** Record versions, measured results, limitations, env requirements, monitoring and rollback.
- **Acceptance:** Claims link to test/evidence; unresolved risks and owners visible.
- **Tests:** Re-run cited commands and experiment; verify backup/recovery instructions.
- **DoD:** Release gate signed; this task does not itself deploy or activate hardware.
