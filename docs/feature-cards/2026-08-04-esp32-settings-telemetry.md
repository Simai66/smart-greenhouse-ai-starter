# Feature card: ESP32 sensor telemetry and live settings

## Outcome

Admins configure registered sensor channels in Settings. A Raspberry Pi keeps
the latest config locally, serves it to ESP32 nodes over LAN HTTP, queues
telemetry during cloud outages, and forwards signed readings to D1. The UI
shows latest value, freshness, status, and config version.

## Acceptance criteria

- Admin can create/update sensor config; viewer can read it; non-admin writes
  return `403`.
- Telemetry accepts only registered sensors in the agent's greenhouse with the
  configured metric/unit, deduplicates retries, and evaluates thresholds.
- Thresholds create or resolve alerts only; no relay/device command is issued.
- Pi exposes local `POST /v1/telemetry` and `GET /v1/config`, persists cache and
  queue across restart, and forwards signed cloud requests when available.
- ESP32 skeleton reconnects Wi-Fi, applies persisted config/calibration, emits
  valid/suspect/invalid quality, and never contains the cloud secret.
- Settings preserves existing demo controls while live sensor editing uses the
  API rather than localStorage.

## Scope

In: D1 schema/migration, browser and edge APIs, validation, deduplication,
threshold alert lifecycle, Pi stdlib HTTP/SQLite bridge, generic PlatformIO
firmware adapters, live Settings panel, tests/docs.

Out: concrete GPIO/pin maps, production sensor drivers, MQTT, relay automation,
cloud credentials in firmware, and migration of unrelated demo settings.

## Risks and assumptions

- `devices` remains the physical channel registry; `sensor_configs` stores its
  sensor-specific configuration.
- Existing edge telemetry without `readingId` remains accepted through a
  deterministic server-side fallback.
- Hardware calibration and commissioning require a later reviewed pin map.
- Additive migration must leave existing policy/command APIs working.

## Ownership and dependency order

1. Backend: schema, contract, authorization, validation, alert lifecycle.
2. Edge: local HTTP, SQLite cache/queue, cloud sync.
3. Firmware: generic protocol skeleton and persistence.
4. Frontend: live sensor list/editor and state handling.
5. QA: API, restart/offline, firmware compile, keyboard/mobile smoke checks.
