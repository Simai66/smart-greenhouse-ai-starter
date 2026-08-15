# ESP32 greenhouse sensor node

This PlatformIO/Arduino firmware reads the commissioned SHT30 sensor and keeps
the LAN auth and telemetry envelope unchanged.

Hardware used by staging test:

- SHT30 temperature/humidity over I2C address `0x44`
- SDA `GPIO21`, SCL `GPIO22`
- greenhouse P0 channel: `SEN-ESP32-01-TEMP` / `temperature` / `celsius`

BH1750 and AB142 are physically present in the test setup, but remain outside
P0 until their registry channels and calibration rules are added.

The node calls the Pi only:

- `GET /v1/config` with `X-Greenhouse-Node` and `X-Greenhouse-Token`
- `POST /v1/telemetry` with stable `readingId`, `configVersion`, and quality

`Preferences` keeps config, calibration, config version, and sequence across
restart. Wi-Fi reconnects and task watchdog are enabled. A missing or failed
SHT30 read emits `quality: "invalid"` and never emits that value as `valid`.

Build-time values are Wi-Fi credentials, Pi URL, node ID, and LAN token only.
Do not add cloud HMAC credentials to firmware.
