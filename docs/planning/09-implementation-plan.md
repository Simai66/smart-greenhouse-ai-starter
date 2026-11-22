# 09 — Implementation plan

Six incremental sprints; every sprint needs a feature card and QA evidence.

1. **Baseline & hardware reliability:** repository inventory, pin/sensor/relay verification, calibration protocol, safety limits, SQLite backup/restore.
2. **Secure MQTT:** Mosquitto TLS/ACL, device credentials, ESP32 buffering/client, Pi consumer, dedup and canary migration from HTTP.
3. **Local web:** Pi API, Caddy/private CA, separate local accounts/roles, shared dashboard adapter, real command ACK lifecycle.
4. **Edge AI:** camera verification, tomato dataset/labels, runtime benchmark, inference metadata, reproducible model evaluation.
5. **Hybrid cloud:** explicit sync lifecycle, idempotent D1 batch endpoint, remote dashboard and cloud request→Pi→ESP32→ACK path.
6. **Offline & verification:** PWA read-only cache, six connectivity states, failure/security/accessibility tests, thesis report.

Critical path: hardware/safety map → local durable storage → MQTT/TLS → local API/auth → real dashboard/ACK → cloud sync/control → outage verification. Dataset collection can run alongside sprints 2–3 after labeling manifest is agreed.

Do not enable hardware actuation until hardware owner verifies wiring, safe outputs, configured limits and physical emergency OFF. Do not deploy to production as part of these sprints without a separate release gate.
