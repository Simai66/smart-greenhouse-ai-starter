# Staging real-sensor E2E

## User outcome

One real temperature sensor on `ESP32-01` sends an authenticated reading
through `PI-GH-01` to the staging Worker and remote D1. Operators can read the
latest value through the sensor API and distinguish fresh, stale, and missing.

## Acceptance criteria

- `GH-01`, `PI-GH-01`, `ESP32-01`, and `SEN-ESP32-01-TEMP` are registered.
- The path `ESP32 → Pi → signed Worker API → D1 → sensor API` is proven with
  real hardware evidence.
- HMAC, LAN token, schema, registration, timestamp, quality, and metric checks
  reject invalid input.
- Duplicate `readingId` is idempotent; Pi queue survives offline mode and
  restart, then flushes after recovery.
- Readback includes `agentId`, `source`, `configVersion`, and `readingId`.
- NTP readiness, calibration, and sensor-disconnect behaviour are tested.
- The commissioned SHT30 test sensor reads through I2C `0x44` on SDA `21` and
  SCL `22`; the P0 channel uses its temperature reading.

## Scope

In scope: one staging Worker, one remote D1 database, one Pi, one ESP32, one
temperature channel, signed telemetry, queue/retry, dedupe, freshness, API
readback, and commissioning evidence.

Out of scope: additional sensors, relay control, camera, AI, MQTT, and
production rollout.

## Dependencies and risks

- Hardware owner must provide the Raspberry Pi host and calibration reference;
  the test sensor model and I2C pin map are now recorded above.
- DevOps must configure Worker secrets and Cloudflare Access before external
  browser access.
- Raspberry Pi is reachable at `192.168.2.198`; the ESP32 SHT30 driver is
  flashed, while the physical I2C bus still needs commissioning evidence.
- Pi simulator mode is disabled for the staging runtime. Earlier invalid
  simulator/disconnected-sensor rows remain historical data and are excluded
  from the real-sensor pass evidence.

## Owners and order

1. DevOps: deploy staging Worker and bind D1.
2. Backend: register agent/sensor and verify signed API persistence.
3. Edge: provision Pi and verify queue/restart behaviour.
4. Hardware: replace mock adapter and verify physical sensor.
5. QA: run acceptance matrix and archive evidence.
