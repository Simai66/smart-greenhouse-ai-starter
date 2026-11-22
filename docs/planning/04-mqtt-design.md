# 04 — MQTT design

## Topics and payload

Use `greenhouse/v1/{greenhouseId}/{deviceId}/{telemetry|status|command|ack}`. Payloads include `schemaVersion`, `eventId` or `commandId`, `deviceId`, device sequence, observed timestamp, quality/status and typed data. Reject unknown device, malformed payload, stale/expired command and invalid sequence; retain no actuator command.

Example telemetry payload (illustrative contract, not current firmware output):

```json
{"schemaVersion":1,"eventId":"evt-uuid","greenhouseId":"GH-01","deviceId":"ESP32-01","sequence":42,"observedAt":"2026-11-04T12:00:00Z","readings":[{"sensorId":"SEN-01","metric":"temperature","value":25.4,"unit":"celsius","quality":"valid","configVersion":1}]}
```

ACL intent: `ESP32-01` may publish only its `telemetry`, `status`, and `ack` topics, and subscribe only to its `command` and provisioned config topic. Pi consumer may subscribe to device telemetry/status/ack and publish commands/config. Deny wildcard writes and other device IDs. Derive greenhouse/device topic scope from provisioned identity, not client payload alone.

## Delivery and session

- QoS 1 for telemetry, status, commands and acknowledgments; consumers must deduplicate because QoS 1 can redeliver.
- Stable client ID and persistent MQTT 3.1.1 session; configure queue limits after measuring offline duration and flash/storage budget.
- Retain last status/config only where versioned and safe. LWT publishes offline status.
- Commands include `expiresAt`, unique ID and expected device; ACK reports accepted/rejected/executed with reason and resulting state. No stale command replay.

## Broker security and recovery

Mosquitto TLS listener validates clients' server certificate; broker denies anonymous access and applies per-device topic ACL. Store credentials outside repo, rotate/revoke one device at a time, and document CA/leaf renewal. Reconnect with bounded exponential backoff and resubscribe after session loss. QoS delivery does not replace application deduplication or command authorization.

Provision device identity in a controlled setup flow; never embed shared fleet credential. Verify CA trust and time before connecting. If verification fails, remain disconnected and safe. Future mTLS is an ADR, not first-pilot requirement.

Rotate by provisioning a replacement identity, testing it, switching one device, confirming ACL/telemetry, then revoking old credential. Keep CA private key offline; rotate broker leaf certificate before expiry and distribute only public CA material. Record credential ID/rotation date, never secret contents. MQTT 3.1.1 lacks message expiry; enforce command expiry in payload and at ESP32/Pi application boundary.
