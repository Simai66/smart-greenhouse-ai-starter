# Live Greenhouse Operation Readiness Implementation Plan

> **For agentic workers:** Use Ponytail full mode to keep each change minimal. Execute one workstream at a time; QA reviews each integrated slice before next operational gate.

**Goal:** Move dashboard capabilities from browser-only demo state to truthful, commissioned, persisted greenhouse operation.

**Architecture:** Keep current shadcn/Radix/Tailwind UI. Use existing signed Pi → Worker → D1 path as source for live operations, add narrowly scoped read APIs, and connect views only when live contracts and commissioning exist. Preserve demo data as a visibly separate mode until each live slice passes acceptance.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Cloudflare Workers + D1, Drizzle, Raspberry Pi Python agent, ESP32 PlatformIO firmware, Supabase Storage.

**Spec:** `docs/feature-cards/2026-10-18-live-operation-readiness.md`; supporting contracts: `docs/api/edge-agent-v1.md`, `docs/api/images-v1.md`; roadmap: `docs/roadmaps/real-greenhouse-next-steps.md`.

## Global Constraints

- Current UI uses shadcn/Radix/Tailwind; do not introduce Astryx packages/imports.
- Node.js `>=22.13.0`.
- Browser role comes from hosted identity plus server email role mapping; never trust client role headers.
- Pi uses per-agent HMAC secret; ESP32 receives only LAN token, never cloud secret.
- Cloud cannot initiate connections to Pi; Pi polls command queue.
- Physical outputs stay disabled until reviewed pin map, relay polarity, fused power, max runtime, cooldown, watchdog, and physical emergency stop are verified.
- A queued or dispatched command is not an acknowledged actuator state.
- Never show demo data as live readings or real AI output.
- Keep user’s current uncommitted edits intact; review them as owned work before changing overlapping files.

## Review Focus

- Replayed/duplicated command request must not cause duplicate physical action; pin with API + agent idempotency integration test.
- Stale/offline agent must reject actuation and preserve last known state as stale; pin with policy and UI state tests.
- Invalid, duplicated, stale, or future telemetry must not alter latest values or alert state; pin with telemetry API tests.
- Greenhouse switch during slow request must not render another greenhouse’s data; pin with client race tests.
- Missing Storage/model/identity/config must show unavailable or pending state, never fabricated success; pin with API and UI failure tests.

---

## Audit findings (verified from source)

1. **Dashboard and Settings data are browser-only** (`components/greenhouse/greenhouse-app.tsx`, `lib/greenhouse-demo-store.ts`)
   - **What this is:** Plants, greenhouse structure, cameras, devices, configured sensors, and alerts load/save from `localStorage`.
   - **Problem:** A second user/device cannot see those changes; refresh uses local state. Dashboard, Plants, Devices, and Alerts are not backed by D1.
   - **Fix:** Persist operational records in D1 and expose greenhouse-scoped APIs; retain a visibly separate demo mode.
   - **If we skip it:** Different operators see conflicting greenhouse state; configured records do not exist for the Pi.

2. **UI control never calls real command API** (`lib/dashboard-interactions.ts`, `lib/greenhouse-demo-store.ts`, `app/api/device-commands/route.ts`)
   - **What this is:** UI gets a local 450 ms mock `acknowledged` result. Server command endpoint queues commands and returns `requested`; gateway intentionally fails closed.
   - **Problem:** UI can show a successful toggle without a real ACK; endpoint is currently bypassed. No real relay adapter exists.
   - **Fix:** Connect UI to command API/history, show requested/dispatched/ACK/failed/timed-out distinctly, then add a signed/allow-listed hardware gateway only after commissioning and interlock sign-off.
   - **If we skip it:** Operator may believe pump/fan changed when no device received command.

3. **Live sensor API is isolated to Settings** (`components/greenhouse/greenhouse-app.tsx`, `components/greenhouse/settings/live-sensor-section.tsx`)
   - **What this is:** `/api/sensors` reads D1 configs/latest readings; Settings can view/create/update them.
   - **Problem:** Dashboard and Analytics continue to read the local demo model; sensor read endpoint has latest only, no time-series history. CSV labels demo values/config rows rather than actual readings.
   - **Fix:** Add bounded, indexed history query contract and use live API for dashboard KPI/chart, Analytics, freshness/quality, and export.
   - **If we skip it:** Real sensor data is stored but operators cannot use it for decisions or reports.

4. **Alert UI is disconnected from stored threshold alerts** (`app/api/agent/telemetry/route.ts`, `components/greenhouse/views/alerts-view.tsx`)
   - **What this is:** Telemetry ingestion creates/resolves threshold alerts in D1; UI reads localStorage alerts and resolves them locally.
   - **Problem:** Operators do not see real threshold alerts; resolution does not update D1. Offline-agent and command-failure alert rules are not implemented.
   - **Fix:** Add role-checked alert list/detail/resolve APIs and connect view; then add offline/command-failure rules and LINE delivery as separate acceptance slice.
   - **If we skip it:** D1 alerts remain hidden and operator actions are not auditable.

5. **AI inference is not implemented** (`lib/greenhouse-api.ts`, `components/greenhouse/views/ai-detection-view.tsx`, `edge-agent/greenhouse_agent.py`)
   - **What this is:** Legacy `runDetection()` returns a fixed sample result. Current image flow stores images and can accept agent detection rows, but Pi defaults to empty detections unless external command is configured; save/review marker is local only.
   - **Problem:** Uploaded image does not trigger a model; app has no approved model, inference runtime, target taxonomy, or quality threshold. Existing image storage is evidence handling, not AI operation.
   - **Fix:** Decide model/runtime/classes/acceptance threshold with product owner; implement model adapter and persisted detection/review flow; label unconfigured result as pending.
   - **If we skip it:** AI claims remain demo or empty and cannot be used for plant-health decisions.

6. **Staging and hardware readiness need external proof** (`docs/feature-cards/2026-08-15-staging-real-sensor-e2e.md`, `edge-agent/greenhouse_agent.py`, `firmware/esp32/README.md`)
   - **What this is:** Repo documents staging setup and one SHT30 path; Pi relay/sensors are explicitly simulator adapters and firmware P0 is temperature only.
   - **Problem:** Source files cannot prove current Worker/remote migrations/Secrets/Access, sensor wiring/calibration, Pi queue recovery, or live D1 evidence. Firmware/Pi local interfaces also require LAN allow-list/token validation and physical bring-up evidence.
   - **Fix:** Run the documented one-sensor staging commissioning; archive request/readback, freshness, restart/offline queue, and calibration evidence. Keep actuator commands disabled pending hardware review.
   - **If we skip it:** A working local build can be mistaken for a live installation.

7. **Required project controls were missing from checkout; resolved 2026-10-28** (`rule.md`, `docs/feature-cards/2026-08-11-pm-release-readiness.md`)
   - **What this is:** AGENTS.md named required documents that were absent at initial audit.
   - **Resolution:** Restored both files from `origin/codex/remove-mock-data`, verified their contents, and made them the governing project rules and active release card.

## File map

- `db/schema.ts`, `drizzle/`: persisted greenhouse/resource/read models and additive migrations.
- `app/api/`: API contracts for greenhouse resources, telemetry history, command status, and alerts.
- `lib/server/`: role checks, scoped queries, validation, and service logic.
- `components/greenhouse/greenhouse-app.tsx`, `components/greenhouse/views/`: live/demo selection and operational pages.
- `lib/sensor-api.ts`, `lib/greenhouse-api.ts`, `lib/inspection-images-api.ts`: browser adapters.
- `edge-agent/`, `firmware/esp32/`: queue, protocol and commissioned hardware adapters.
- `worker/index.ts`, `wrangler.staging.jsonc`, `README.md`: cron and deploy/runbook details.
- Existing tests under `tests/` and `edge-agent/test_greenhouse_agent.py`: add focused coverage with each workstream.

## Workstreams and dependencies

Order: A → B → C → D. E can proceed after image storage verification, but inference decision is required before describing results as AI. F begins only after simulator/API pass and hardware owner sign-off. QA owns acceptance evidence at each gate. Main agent owns integration and Ponytail controls scope.

### Task A: Restore governing context and verify staging sensor slice

**Owners:** Main agent + DevOps + edge/hardware + QA.

**Files/config:** restore `rule.md` and intended active card or record supersession; use `docs/feature-cards/2026-08-15-staging-real-sensor-e2e.md`, `docs/api/edge-agent-v1.md`, `wrangler.staging.jsonc`, Pi/ESP32 provisioning.

- [x] Confirm source of `rule.md` and release readiness card; restored from `origin/codex/remove-mock-data` and verified on 2026-10-28.
- [ ] Check deployed Worker revision, remote migration state through the latest checked-in migration, D1 registration, Access policy, secret names, Storage bucket and cron without printing secret values.
- [ ] Commission `GH-01` / `PI-GH-01` / `ESP32-01` / `SEN-ESP32-01-TEMP` against SHT30 I2C `0x44`, pins SDA 21/SCL 22.
- [ ] Capture proof for valid telemetry, rejected bad HMAC/registration/time, deduplicated retry, Pi queue survives restart/offline and later flushes, API readback freshness/quality/calibration.
- [ ] Record blockers and evidence in staging feature card; exit only when path is proven or blocker assigned.

### Task B: Persist operational greenhouse resources

**Owners:** Backend → Frontend → QA. Depends on Task A environment validation.

**Files:** `db/schema.ts`, next additive migration (confirm remote state before naming it), `app/api/greenhouses/**`, `app/api/plants/**`, `app/api/devices/**`, `app/api/cameras/**`, `lib/server/*`, settings and resource editors.

**Interfaces:** Backend publishes method/path/auth/request/response/error/pagination contract before UI integration. Scope every record and query by `greenhouseId`; use viewer read, operator permitted actions, admin config writes.

- [ ] Add D1 records for greenhouse/zone/plant/crop batch/camera and complete device registry fields required by Pi; preserve historical rows and do not migrate localStorage values silently.
- [ ] Add validated, role-checked CRUD APIs and conflict/deletion rules; use transactions/batches where records and audit rows must change together.
- [ ] Add API tests for cross-greenhouse access, role denial, duplicate IDs, deletion dependencies and malformed payloads.
- [ ] Replace Settings browser-only save path for live mode; display demo resources only in demo mode.
- [ ] Verify new records survive another authenticated session and appear in Pi config.

### Task C: Connect live telemetry, history, analytics, export

**Owners:** Backend → Frontend → QA. Depends on Task A and sensor registry from B.

**Files:** `app/api/sensors/route.ts`, new history route or bounded query, `lib/server/sensor-telemetry.ts`, `lib/sensor-api.ts`, `greenhouse-app.tsx`, dashboard/analytics/chart/export views.

**Interfaces:** `GET /api/sensors?greenhouseId=...` returns latest reading, status, freshness, quality; history contract takes metric/sensor, `from`, `to`, bounded limit/cursor and returns sampled/received timestamps plus quality/config version. No unbounded scans.

- [ ] Add composite D1 index for greenhouse/sensor/metric/time query after confirming existing access patterns.
- [ ] Expose bounded history with validation and stable pagination; distinguish absent, stale, suspect, invalid, and fresh values.
- [ ] Adapt dashboard KPI/chart and Analytics to selected greenhouse’s live data; preserve honest empty/partial/error states.
- [ ] Export actual persisted data and include source, range, units, and timestamps; remove demo CSV from live mode.
- [ ] Add API/UI tests for range bounds, no-data, stale data, greenhouse switching, keyboard states, and export escaping.

### Task D: Connect persisted alerts and device command lifecycle

**Owners:** Backend contract → Backend + Frontend → QA. Depends on B and A.

**Files:** `app/api/device-commands/route.ts`, `app/api/alerts/**`, `app/api/agent/commands/**`, `lib/greenhouse-api.ts`, `lib/dashboard-interactions.ts`, demo store interaction caller, device/alert views/dialogs, `lib/server/command-gateway.ts`.

- [ ] Publish status contract including `requested`, `dispatched`, `acknowledged`, `failed`, `timed_out`, current reported state, timestamps, reason and history cursor.
- [ ] Connect command UI to `POST /api/device-commands` with stable idempotency key; show request accepted as pending only; refresh/poll status until terminal result or timeout.
- [ ] Enforce current policy, agent freshness, capability, command TTL and actor authorization on each command; reject stale/offline with actionable UI.
- [ ] Add command status/history read endpoint if current endpoint is insufficient; store status transition and event atomically.
- [ ] Add alert list/detail/resolve API using D1; show threshold alerts from telemetry and persist actor/time on resolve.
- [ ] Add offline-agent and command-failure alert generation, dedupe and recovery rules as separate backend subtask after basic alerts are live.
- [ ] Test lost response/retry, delayed ACK, expired command, agent ownership, stale status, and UI state never updating before verified ACK.
- [ ] Keep `dispatchDeviceCommand` fail-closed until Task F hardware approval; no fabricated ACK adapter.

### Task E: Make image review honest and decide/implement AI inference

**Owners:** Product/AI + Backend + edge + Frontend → QA. Image retry is complete in separate commit `e549a95`; review its call sites before any inference changes.

**Files:** `docs/feature-cards/2026-08-15-supabase-storage-camera-ai.md`, `lib/greenhouse-api.ts`, `components/greenhouse/views/ai-detection-view.tsx`, `edge-agent/greenhouse_agent.py`, detection APIs/storage.

- [ ] Remove or quarantine fixed `runDetection()` result so no caller can present it as real inference.
- [ ] Product chooses model/runtime, supported conditions, confidence threshold, model versioning, and acceptable validation dataset/accuracy before implementation.
- [ ] Define inference interface and explicit `pending`, `complete`, `failed`, `unavailable` states; persist each model result against image and plant.
- [ ] Implement Pi-local or approved hosted inference adapter; enforce bounded output schema and idempotent detection writes.
- [ ] Persist user review/decision in D1; keep expired image metadata/detections inspectable.
- [ ] QA known healthy/diseased/uncertain samples, invalid model output, no model config, retries, expiry, and Thai/local plant-domain limitations.
- [ ] Until accepted, UI says “waiting for AI/model” and permits evidence review only, not “AI detected” claims.

### Task F: Commission physical actuation and safety

**Owners:** Hardware/electrician + edge + Backend + QA. Depends on Tasks A and D simulator acceptance; separate sign-off required.

**Files:** `edge-agent/greenhouse_agent.py`, `firmware/esp32/`, per-device policies/capabilities, `lib/server/command-gateway.ts`, operational runbook.

- [ ] Hardware owner signs pin map, active relay level, current/load ratings, fuse, enclosure, watchdog, startup OFF behavior, maximum runtime/cooldown, and physical emergency interlock.
- [ ] Implement only approved relay/sensor driver behind existing safety policy; preserve simulator tests and default all outputs OFF on restart or adapter failure.
- [ ] Test manual ON/OFF, reboot, cloud outage, LAN loss, duplicate command, policy rejection, expiry, stuck relay, watchdog, physical E-stop and observed relay state.
- [ ] Enable gateway/device command capability only after physical tests and QA sign-off; retain immediate software fail-closed rollback.
- [ ] Do not enable multi-agent E-stop; each agent needs independent command/ACK proof first.

### Task G: Remote notifications and production readiness (deferred after staging slices)

**Owners:** Backend → DevOps → Frontend → QA. Depends on persisted live alerts.

**Files:** alert service, delivery configuration, `README.md`, staging/prod deployment config/runbook.

- [ ] Implement LINE notification delivery with signed dashboard links and no secrets/device credentials in message payload.
- [ ] Add retry/deduplication and delivery audit status; test provider errors and duplicate sends.
- [ ] Define monitoring for Worker/API errors, stale agents, queue age, D1 failures, storage retention failures and alert delivery.
- [ ] Document required environment variables, deploy steps, rollback to prior Worker/image, and additive migration handling.
- [ ] QA smoke test before production rollout; production deploy remains a separate approval gate.

## Handoff / limitations

- This plan remains active. Repo audit did not inspect remote D1, cloud secrets,
  physical hardware, or model endpoint.
- Governing `rule.md` and active release card were restored and verified on
  2026-10-28. Image retry work was reviewed, tested, and committed separately as
  `e549a95`; unit 69/69 and Python 13/13 passed, lint had 0 errors/6 warnings.
- User reports staging and GH-01 sensor are available and supplied a staging
  deployment receipt; live Access policy, remote D1 state, sensor readback, and
  calibration remain unverified. Continue Task A with evidence, not assumptions.
- GH-01 security design is drafted in
  `docs/superpowers/specs/2026-10-28-greenhouse-security-design.md`, commit
  `5b7fc76`; await product-owner approval before implementation planning.
