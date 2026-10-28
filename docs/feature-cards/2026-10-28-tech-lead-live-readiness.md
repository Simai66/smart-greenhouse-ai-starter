# Tech lead checkpoint: live greenhouse readiness

**Updated:** 2026-10-28
**Decision:** Not ready for live greenhouse operation. Continue as demo until live data, safety, and commissioning gates pass. User selected a single-greenhouse pilot: `GH-01` (2026-10-28).

## User outcome

Operators use one dashboard for real, greenhouse-scoped sensor history, plants,
devices, alerts, image evidence, and reports. Every control shows truthful
pending/failure/acknowledged states. Demo content stays visibly separate. No
physical actuator or AI result is presented as real without verification.

## Scope

- **Dashboard/UI:** live/demo mode boundary; sensor KPI, freshness, quality and
  history; plant/zone/resource management; device status and command lifecycle;
  alerts; analytics and CSV export; camera evidence and AI review; responsive,
  keyboard-accessible failure and empty states.
- **API/database/auth:** greenhouse-scoped resource persistence; sensor latest
  and bounded history; alert list/resolve; command request/status/events;
  image reservation/upload/detection/review; role checks and audit history.
- **Edge/hardware:** Pi durable queue, HMAC telemetry and polling; ESP32/Pi
  sensor identity and adapters; relay policy, ACK and interlock only after
  hardware sign-off.
- **Deployment/operations:** staging Worker, D1 migrations, Access/roles,
  secrets, Supabase storage/retention, monitoring, smoke tests and rollback.
- **Out of scope until separately approved:** production rollout, unreviewed
  actuator enablement, unsupported sensor channels, and AI health claims before
  model selection and validation.

## Current verified state

- **UI:** main dashboard, plants, devices, alerts and analytics still use the
  browser demo store. Settings includes a separate D1-backed real-sensor panel.
  The current UI has no complete live-operation mode.
- **APIs/schema:** Pi-to-Worker signed telemetry, sensor configuration,
  measurement points/assignments, image upload, and command queue/ACK routes
  exist. No live sensor history or alert list/resolve API exists.
- **Safety:** command endpoint checks freshness/policy and queues requests;
  gateway deliberately fails closed. Pi relay adapter remains simulator.
- **AI:** image evidence flow exists. No approved inference model/runtime,
  taxonomy, acceptance threshold, or production inference path. A legacy helper
  still returns fixed sample output and must never be used as real AI.
- **Staging/hardware:** User confirms staging and a real GH-01 sensor are
  available (2026-10-28); no remote Worker/D1/Access/Storage configuration or
  commissioning readback has been independently verified. Only SHT30 A at
  I2C `0x44`, SDA 21/SCL 22 is described; point B and actuators are unverified.
- **Authorization scope:** `authorizeApiRole` maps email to a global role and
  defaults authenticated users to viewer; no greenhouse membership lookup
  exists. `GET /api/sensors` accepts caller-provided `greenhouseId` after role
  auth. Deployment Access might restrict the app to one user, but no such
  evidence is available. Before live reads, enforce the selected `GH-01` pilot
  boundary on browser APIs; do not assume query filtering is authorization.
- **Open PRs:** #5 head `cee642c594d3d2a3a687090d30c9f8f9e3f7f691` and #7 head
  `cd54ad5115094a63159560351475e25f3926f5c6` have failing Cloudflare Workers
  Builds (check IDs `118044327834` and `117976624987`); GitGuardian passes on
  both. Code Review returns no annotations or logs, only provider build IDs.
  Cloudflare dashboard logs remain unavailable. Do not merge based on
  mergeability alone.
- **Local QA (2026-10-28):** unit 69/69, Python 13/13, build passed, rendered
  smoke 3/3 passed on retry. `npm run lint` passes with 0 errors/6 warnings
  after excluding `.agents`, `.worktrees`, `.wrangler`, and `.sites-runtime`.
  `npx tsc --noEmit` initially reported 17 errors. Enabling
  `allowImportingTsExtensions` in `tsconfig.json` removes the 10 TS5097 test
  import errors; 7 Cloudflare type errors remain. `wrangler types
  --include-runtime false` generates binding shapes, but omits runtime types;
  default runtime generation is blocked because this sandbox denies localhost
  listen. The cached Workers types package conflicts with Wrangler's locked
  peer, and no package was added without dependency review. File-scoped lint
  passes with `npm exec`; invoking ESLint directly through `sites-env.sh` lacks
  the npm bin path. PlatformIO unavailable.
- **Image retry delivery:** image-retry/camera-race changes passed local review
  and were committed separately as `e549a95`; they were kept out of PR #5/#7
  remediation commits.
- **Governance:** `rule.md` and named active card
  `docs/feature-cards/2026-08-11-pm-release-readiness.md` were restored from
  `origin/codex/remove-mock-data`; both matched source commit `9b08de2` and were
  read before continuing. The active card confirms demo-only release posture
  until pilot gates pass.

## Work board and dependency order

| Order | Work item | Owner | Status / exit condition |
|---|---|---|---|
| 0 | Recover governing release docs and confirm live/demo boundary | Project owner + tech lead | **Complete.** Restored exact tracked source and confirmed demo-only posture; no policy was inferred. |
| 1 | Resolve #5/#7 Cloudflare build failures and decide PR disposition | DevOps + backend + QA | **Blocked on provider logs.** Obtain Cloudflare build logs for current heads; preserve local image changes. |
| 2 | Commission one staging sensor path: ESP32 → Pi → signed Worker → D1 → authenticated readback | DevOps + edge/hardware + QA | **Not verified.** User reports staging and sensor are available. Prove freshness/quality, bad HMAC rejection, dedupe, offline queue/restart/flush, and calibration. Prerequisite to live dashboard. |
| 3 | Persist greenhouse, zone, plant, camera and device resources with role/scope checks | Backend → frontend → QA | **In progress.** GH-01 boundary implemented locally; local tests/build/lint pass. Staging denial/readback and second-session persistence remain blocked by missing Wrangler token in this environment. Resource persistence itself is not done. |
| 4 | Add bounded sensor history and connect dashboard, analytics and export to persisted readings | Backend → frontend → QA | **Not done.** Include freshness/quality, empty/stale/error states, greenhouse switching, export range/source/units. Depends on 2–3. |
| 5 | Add D1 alert list/detail/resolve and connect Alerts UI | Backend → frontend → QA | **Not done.** Persist resolution actor/time; test threshold lifecycle and dedupe. Depends on 2–3. |
| 6 | Connect command UI to authenticated API/status history | Backend → frontend → QA | **Partial API only.** Show requested/dispatched/ACK/failed/timed-out distinctly; enforce idempotency, freshness, policy and TTL. Keep physical control disabled until hardware sign-off. |
| 7 | Complete existing image retry/camera race work; then decide and implement inference | Current change owner + backend/edge/frontend → QA | **Image retry committed and locally verified** in `e549a95`. Inference stays separate until model/runtime/classes/threshold decision. |
| 8 | Hardware relay commissioning and operational safety | Hardware owner/electrician + edge + backend + QA | **Not started; gated.** Signed pin/load/fuse/watchdog/runtime/E-stop review and physical tests required before enabling commands. |
| 9 | Production operations: monitoring, notifications, deployment and rollback | DevOps → backend/frontend → QA | **Deferred.** After staging slices pass; document env vars, alerts, rollback, storage retention and smoke evidence. |
| 10 | Repair release checks: lint scope and typecheck configuration | DevOps/tooling + QA | **Partial.** Lint gate passes with 0 errors/6 warnings. TS import setting fixed; 7 Cloudflare type errors remain. Resolve Cloudflare types compatible with locked Wrangler, then typecheck. |

## Definition of done

- Dashboard views read persisted data in live mode and identify demo mode clearly.
- Cross-user and cross-greenhouse role boundaries pass; edits survive a second
  authenticated session.
- Sensors expose latest and bounded history with timestamps, units, quality and
  freshness. Alerts and exports reflect persisted live records.
- Commands remain pending until verified edge ACK; stale/offline/unconfigured
  devices fail closed. Physical control stays disabled until sign-off.
- AI labels appear only for persisted results from an approved, validated model.
- Mobile/desktop, keyboard, accessibility, failure and regression checks pass.
- Build, lint, typecheck, tests, staging evidence, monitoring and rollback pass
  or carry explicit owner-approved residual risks.

## Tech lead guardrails

- Keep one main workstream plus at most one isolated fix.
- No production deploy, PR merge, remote migration, or actuator enablement without
  the required review/evidence and explicit release authorization.
- Preserve existing user changes and existing user data; keep unrelated work in
  separate commits.
- Re-check PR heads, worktree and deployment state at the start of each resumed
  work session.
