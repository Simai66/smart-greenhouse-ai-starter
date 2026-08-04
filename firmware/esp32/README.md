# ESP32 protocol skeleton

This PlatformIO/Arduino firmware is a protocol harness until sensor models and
pin maps are commissioned. `MockSensorAdapter` supplies deterministic values;
replace it with reviewed adapters without changing LAN auth or telemetry
envelope code.

The node calls the Pi only:

- `GET /v1/config` with `X-Greenhouse-Node` and `X-Greenhouse-Token`
- `POST /v1/telemetry` with stable `readingId`, `configVersion`, and quality

`Preferences` keeps config, calibration, config version, and sequence across
restart. Wi-Fi reconnects and task watchdog are enabled. A sensor read failure
emits `quality: "invalid"` and never emits that value as `valid`.

Build-time values are Wi-Fi credentials, Pi URL, node ID, and LAN token only.
Do not add cloud HMAC credentials to firmware.
