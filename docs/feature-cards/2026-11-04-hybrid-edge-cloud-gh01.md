# Feature card: GH-01 hybrid edge-cloud upgrade

## Outcome and acceptance

Upgrade GH-01 incrementally into an offline-first system where ESP32 enforces
local actuator safety, Raspberry Pi owns local telemetry and inference records,
and Cloudflare provides an authenticated remote mirror. Preserve existing data
and working Cloudflare, Pi, and React paths.

- Document verified implementation state and decisions before changing runtime behavior.
- MQTT/TLS must use verified certificates, per-device credentials, topic ACLs,
  deduplication, durable buffering, and command expiry; no insecure fallback.
- Local dashboard/API must use HTTPS and separate user accounts; cached data is
  visibly stale/read-only and never replays actuator commands.
- Local SQLite remains operational source of truth; Cloudflare D1 remains a
  remote mirror. Sync is durable, idempotent, and has explicit states.
- Physical actuator enablement requires verified wiring, configured safety
  limits, emergency-off evidence, and hardware QA. Until then, actuator control
  remains disabled/demo-only.
- AI results must identify image, model version, confidence, and latency; report
  no performance metrics before reproducible evaluation.

## Scope

In scope: repository planning documents, incremental ESP32/Pi MQTT migration,
local HTTPS/auth/dashboard, durable cloud sync, camera/TFLite evaluation, PWA
read-only offline behavior, security and failure testing.

Out of scope: production deployment, physical actuator activation before safety
gate, destructive data/object migration, unreviewed cloud storage migration,
invented sensor thresholds, or publishing unmeasured AI results.

## Affected areas

- Firmware: `firmware/esp32/`
- Edge API, persistence, MQTT, camera and inference: `edge-agent/`
- Cloud API/schema/migrations: `app/api/`, `worker/`, `db/`, `drizzle/`
- Shared frontend/PWA: `app/`, `components/greenhouse/`, `lib/`
- Deployment and design docs: `docs/`, `design.md`, Cloudflare/Pi configuration

## Unknowns, assumptions and risks

- Verified firmware currently reads one SHT30; historical soil/BH1750 sensors
  and physical relay outputs are not verified.
- Pump/light limits, sampling rate, buffer capacity, stale timeout, and command
  expiry are `REQUIRES_CONFIGURATION` until hardware/product owner sets them.
- Pi LAN name/IP, Private CA owner, trusted clock after cold boot, local account
  recovery owner, and physical emergency-off design need confirmation.
- No labeled tomato image dataset exists. Collect and archive research images
  separately from operational images.
- Existing Cloudflare deployment and signed image access require live QA evidence.
- TensorFlow Lite compatibility with current Python 3.13 Alpine image is unknown;
  benchmark on Pi Ubuntu 24.04 arm64 before choosing runtime packaging.

## Owners and dependency order

1. Main agent: repository baseline, contracts and planning artifacts.
2. Hardware owner + Edge: verify board, pin map, sensors, relay and safety limits.
3. Backend/Edge: additive local persistence, Mosquitto and MQTT consumer/client.
4. DevOps: private CA, local HTTPS, firewall, clock, backups and deployment runbooks.
5. Backend + Frontend: local auth/API/dashboard, then cloud sync/remote view.
6. Edge + thesis owner: camera dataset, inference benchmark and evaluation.
7. QA: failure, security, accessibility and integration verification at each gate.

## Delivery gates

- Gate A: baseline/docs reviewed; no runtime changes implied by audit claims.
- Gate B: hardware and safety configuration verified before physical actuation.
- Gate C: MQTT/TLS and durable local path pass outage/restart tests.
- Gate D: local HTTPS/auth/commands and cloud sync pass integrated QA.
- Gate E: AI results reproducible; offline/security acceptance and release review pass.

## Resume checkpoint — 2026-11-04

### Completed

- Repository audit and all 12 proposed design/planning documents created under
  `docs/planning/`; backlog includes owner, dependencies, effort, affected
  modules, steps, acceptance, tests and DoD per item.
- Added SQLite WAL-aware backup utility, integrity check, no-overwrite behavior,
  Docker packaging, runbook and two focused tests.
- Verification: `npm test` passed (81 unit, 30 Python, build and 3 rendered
  checks). Re-ran Python suite after final backup connection-close fix: 30 passed.
- Read-only QA subagent reviewed plan and backup path; no remaining findings.

### Progress — 2026-11-04

- Closed a Pi telemetry data-loss window: inbound dedupe and cloud outbox insert
  now commit atomically; an outbox failure rolls both back so device retry works.
- Added rollback/retry coverage and an actual-`Store` backup-copy restore check
  for queued telemetry, quarantine, and inbound reading records.
- Verification: `python3 -m unittest discover -s edge-agent -p 'test_*.py'`
  passed (32 tests); `git diff --check` passed. Existing suite emits two
  `ResourceWarning` messages for unclosed SQLite connections.
- Explicit queue lifecycle state migration remains open. Pi operator restore
  drill and hardware-owner S1-02 evidence remain outstanding; do not enable
  actuator control.

### Remaining work and exact resume order

1. **Resume at S1-02, hardware gate.** Hardware owner supplies ESP32 board/model,
   sensor/relay part numbers and wiring/pin map, relay active polarity, safe boot
   state and independent emergency-OFF design. Edge + QA verify on bench.
2. Record owner-approved pump runtime/cooldown, sensor thresholds, sampling rate,
   buffer capacity and stale/command expiry values. Keep each missing value as
   `REQUIRES_CONFIGURATION`; do not activate hardware control until verified.
3. Continue S1-03 queue lifecycle migration after DB backup/restore evidence;
   explicit `PENDING/RETRY/SYNCED/FAILED` implementation is still outstanding.
4. Then follow S2 MQTT/TLS → S3 local HTTPS/auth/dashboard → S4 camera/AI →
   S5 cloud sync/remote command path → S6 PWA/failure QA.

### S1-02 hardware evidence worksheet

Repository-confirmed baseline (code/config evidence only; not physical
commissioning evidence):

- PlatformIO target is generic `esp32dev`; exact board model/revision is unknown.
- Firmware reads one SHT30 at I2C `0x44`, SDA GPIO21, SCL GPIO22. Firmware has
  no actuator GPIO implementation.
- README mentions BH1750 and AB142 in the test setup, but neither has a verified
  P0 firmware channel or calibration record.
- Pi relay adapter remains a simulator. No physical relay part number or wiring
  evidence is recorded.

Hardware owner + Edge must record before bench verification:

- ESP32 exact model/revision and board photo or datasheet.
- Sensor and relay exact part numbers; wiring diagram and pin map.
- Relay active polarity, power path/fuse rating, and de-energized behavior on
  boot, reset, watchdog timeout, and loss of Pi/network.
- Independent physical emergency-OFF circuit and witnessed test result.
- Owner-approved maximum pump runtime/cooldown and other configured safety
  limits; otherwise keep `REQUIRES_CONFIGURATION`.
- Bench test date, participants, measurements, and pass/fail evidence for each
  item. No physical actuator activation before hardware QA signs off.

Current disposition: S1-02 is blocked pending these hardware-owner inputs; this
worksheet does not assert that any component has been commissioned.

### Known blockers and limits

- PlatformIO CLI unavailable during this pass; firmware compilation and physical
  sensors, relays, camera, Pi clock/network and Cloudflare deployment remain unverified.
- No MQTT, local auth/API/UI, PWA, or TFLite runtime has been implemented yet.
- No staging/production deploy, database migration, object movement/deletion, or
  physical actuator action performed.
- Next owner: user/hardware owner provides hardware/safety evidence; main agent
  resumes with S1-02 and does not repeat completed repository audit/documentation.
