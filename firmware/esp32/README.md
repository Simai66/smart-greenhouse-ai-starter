# ESP32 greenhouse sensor node

This PlatformIO/Arduino firmware reads configured sensor channels and keeps
the LAN auth and telemetry envelope unchanged. Each channel can name a stable
measurement point (`ESP32-01-A` or `ESP32-01-B`) supplied by Pi config; plant
assignment stays server-side and never requires a firmware rebuild.

Staging configuration recorded in this repository (physical commissioning
evidence is not recorded here):

- SHT30 temperature/humidity over I2C address `0x44`
- SDA `GPIO21`, SCL `GPIO22`
- greenhouse P0 channel: `SEN-ESP32-01-TEMP` / `temperature` / `celsius`

Project notes report BH1750 and AB142 in the test setup, but neither has a P0
firmware channel or calibration evidence in this repository.

The node calls the Pi only:

- `GET /v1/config` with `X-Greenhouse-Node` and `X-Greenhouse-Token`
- `POST /v1/telemetry` with stable `readingId`, `configVersion`, and quality

`Preferences` keeps config, measurement point, calibration, config version, and sequence across
restart. Wi-Fi reconnects and task watchdog are enabled. A missing or failed
SHT30 read emits `quality: "invalid"` and never emits that value as `valid`.

Firmware configuration maps one SHT30 at I2C `0x44` on GPIO21/GPIO22; physical
bench verification is still pending. Firmware routes that single endpoint to
unscoped legacy config or point A. Point B returns `quality: "invalid"` until a
separately verified endpoint/multiplexer adapter is selected. This prevents one
physical reading from being attributed to both points.

Before enabling two physical SHT30 points, verify module address selection on
the exact board. If both modules are fixed at `0x44`, use and verify a
TCA9548A multiplexer; do not assume an address jumper changes the address.
Record mux channel, address, cable length, pull-ups, power, and disconnected
sensor behavior. Alternative adapter must isolate one point's failure from the
other and declare its supported port keys/capabilities.

Current build-time values remain Wi-Fi credentials, Pi URL, node ID, and
per-node LAN token. Provisioning is a later milestone. Do not add cloud HMAC
credentials, plant IDs, or plant names to firmware.
