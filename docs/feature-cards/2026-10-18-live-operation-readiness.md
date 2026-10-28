# Feature card: Live greenhouse operation readiness

## User outcome

Operators can tell which data is real, review current and historical sensor
readings, receive real alerts, and control only commissioned devices with
verified edge acknowledgements. Demo-only plant and AI data never appears as
live operation data.

## Acceptance criteria

- A commissioned ESP32 temperature reading is traceable through Pi, signed
  Worker request, D1, authenticated read API, and dashboard with freshness and
  quality shown.
- Dashboard, device, analytics, and alert views read persisted greenhouse data;
  local demo state is visibly isolated from live state.
- Device commands are issued through the authenticated API, remain pending
  until an edge ACK, and show timeout/failure/offline states without claiming
  relay state changed early.
- Device control remains disabled unless the agent is fresh and device has a
  reviewed physical adapter, policy, and safety interlock.
- Image upload and evidence remain usable; AI results are called AI only after
  a configured inference service/model returns persisted detections.
- Settings that claim to configure operational resources persist server-side
  with greenhouse scoping and role checks, or are clearly labeled demo-only.
- Alerts and exports reflect persisted live readings, commands, and alerts.
- QA records commissioning evidence, API/UI results, and unresolved risks for
  each acceptance criterion.

## Scope

In: staging provisioning and commissioning; sensor read/history APIs and live
dashboard; command queue/ACK UI; persisted operational resources; real alert
lifecycle and analytics/export; AI inference decision and integration; role,
freshness, safety, and deployment documentation.

Out: multi-agent emergency-stop fan-out, production rollout, advanced camera
discovery, private image storage migration, and unsupported sensor/actuator
hardware.

## Affected areas

- UI: `components/greenhouse/`, `lib/greenhouse-api.ts`, `lib/sensor-api.ts`
- API/database: `app/api/`, `lib/server/`, `db/schema.ts`, `drizzle/`
- Edge/hardware: `edge-agent/`, `firmware/esp32/`
- Deployment: `wrangler.staging.jsonc`, Cloudflare Access/D1/secrets, Supabase

## Assumptions, unknowns, and risks

- Resolved 2026-10-28: `rule.md` and active card
  `docs/feature-cards/2026-08-11-pm-release-readiness.md` were restored from
  `origin/codex/remove-mock-data` and verified. Current checkpoint is
  `docs/feature-cards/2026-10-28-tech-lead-live-readiness.md`.
- Existing roadmap and Aug 15 feature cards are current references; confirm
  deployed Worker, remote D1 migrations, Supabase bucket/cron, and real Pi/ESP32
  commissioning from deployment and hardware evidence.
- One staging greenhouse, one Pi, one ESP32 temperature sensor is first
  acceptance slice. Cloudflare Access JWT verification exists in the Worker;
  actual staging policy/login and live telemetry readback still need evidence.
- Physical relay work needs hardware owner/electrician approval; no software
  plan can prove wiring, load ratings, or emergency-stop behavior.
- AI model, inference runtime, target classes, and accuracy threshold have no
  approved product decision yet. Keep AI findings explicitly pending until
  these are decided and validated.

## Owners and dependency order

1. Main agent / project owner: restore governing docs and confirm live/demo
   boundary and priority; prerequisite to all implementation.
2. DevOps + edge: verify staging Worker, D1, Access, secrets, Pi and ESP32;
   prerequisite to live read integration.
3. Backend: publish and implement live read/history, command-status, alert, and
   resource contracts; depends on staging schema and registry.
4. Frontend: integrate live APIs and truthful states; depends on Backend
   contracts and commissioned sensor path.
5. Hardware + edge: commission physical sensor/actuators and safety review;
   actuator enabling depends on simulator/API acceptance and hardware sign-off.
6. Product + AI/edge: decide model and acceptance threshold, then implement
   inference; image storage already exists and is not proof of AI inference.
7. QA: validate each slice and end-to-end safety criteria; runs after its
   contracts and integrated builds are ready.
