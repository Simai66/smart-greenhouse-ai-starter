# 01 — Repository audit

Date: 2026-11-04. Scope: repository evidence only; hardware and live deployment were not accessed.

## Status summary

| Requirement | Status | Evidence |
|---|---|---|
| React/TypeScript Cloudflare app and D1 | PARTIALLY IMPLEMENTED | `worker/index.ts`, `wrangler.staging.jsonc`, `db/schema.ts`; deployed state unverified |
| Cloud identity and signed API ingress | IMPLEMENTED in code | `lib/server/access-control.ts`, `lib/server/cloudflare-access-auth.ts`, `app/api/agent/` |
| Pi Python gateway and SQLite | PARTIALLY IMPLEMENTED | `edge-agent/greenhouse_agent.py`; `agent.db`, WAL, durable outbound queue |
| ESP32 sensor telemetry | PARTIALLY IMPLEMENTED | `firmware/esp32/src/main.cpp`; one SHT30, Wi-Fi and HTTP transport |
| Soil sensors A/B and BH1750 | MISSING in current firmware | Not present in `firmware/esp32/src/main.cpp` or PlatformIO dependencies |
| MQTT/Mosquitto/TLS | MISSING | No broker/client/config found in firmware or deployment files |
| Local HTTPS/dashboard/accounts | MISSING | Gateway serves HTTP 8080; no Pi-hosted UI/Caddy/local auth found |
| Physical actuator control | UNVERIFIED | Pi relay driver is simulator; ESP32 output/wiring not verified |
| Camera and AI inference | PARTIALLY IMPLEMENTED | Capture command/fixture and detections path; no verified camera or TFLite model |
| Offline PWA | MISSING | No manifest, service worker, IndexedDB, or six-state connection model |
| Durable Pi-to-cloud sync | PARTIALLY IMPLEMENTED | REST queue, retries/quarantine, D1 idempotency; no explicit full lifecycle state |
| Tests | PARTIALLY IMPLEMENTED | Existing unit/Python/build checks; no firmware/hardware/MQTT/TLS integration evidence |

## Verification performed

- `npm run test:unit`: 81 passed.
- `npm run test:python`: 28 passed.
- `./node_modules/.bin/tsc --noEmit --pretty false`: passed.
- `npm run build`: passed; non-blocking bundle-size/route-classification warnings.
- `pio` CLI unavailable in the inspected environment; firmware compile not verified.
- Git status was clean before this implementation; no secret values are recorded here.

## Existing data and constraints

- Cloud database: D1/Drizzle, migrations 0000–0005; preserve history and add migrations only.
- Edge database: SQLite `agent.db`; preserve queued readings during credential recovery.
- Images: private Supabase Storage bucket plus D1 metadata; operation expiry documented as 15 days.
- Current UI includes demo-backed state; demo status must not imply physical state.
- Active release readiness card keeps physical pilot gated on hardware, auth, ACK and QA evidence.
