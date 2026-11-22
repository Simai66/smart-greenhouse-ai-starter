# 11 — Test strategy

## Existing baseline

At planning audit: unit 81 passed, Python 28 passed, TypeScript check passed, production build passed. PlatformIO unavailable; firmware compilation and device behavior remain unverified.

## Required gates

- Firmware compile and bench tests: sensor disconnect/invalid values, reboot, buffer capacity, sequence persistence, Wi-Fi/broker outage, certificate/hostname failure.
- MQTT integration: ACL allow/deny, QoS1 redelivery, persistent session, LWT, broker restart, expiry, command ACK and replay rejection.
- Persistence/sync: additive migration, atomic enqueue, power-loss restart, duplicate event, retry/backoff, permanent failure and backup restore.
- API/security: local/cloud roles, invalid signature/nonce, malformed/oversized payload, rate limiting, TLS trust and secret-redaction checks.
- Frontend: six connection states, stale cache label, no cached command replay, keyboard/focus, responsive and accessible controls.
- Hardware: relay safe state, emergency OFF, Pi/broker/cloud loss; only hardware owner can attest physical interlock.
- AI: dataset split by plant/session; metrics, latency and resource use tied to versions and repeatable scripts.

QA joins from contract/feature-card stage. Findings include severity, reproduction, expected/actual behavior. No release claim from mocks alone.
