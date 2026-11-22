# 02 — Target architecture

## Authority and data flow

ESP32 owns sensor reads, actuator outputs and local safety. It must remain safe without Pi or internet. Pi 5 hosts Mosquitto, Python local API, SQLite, local React UI, camera capture/inference and durable cloud sync. Cloudflare Worker/D1 serves authenticated remote reads and accepts remote command requests; it never directly owns actuator safety. Existing private Supabase Storage remains image storage in the first migration.

```text
ESP32 sensors/actuators ↔ MQTT/TLS ↔ Pi Mosquitto + Python Gateway
                                             ├─ SQLite / sync queue
                                             ├─ Local API + HTTPS + dashboard
                                             └─ Camera → inference → SQLite
                                                        ↓ authenticated sync
                                          Cloudflare Worker → D1
```

## Interfaces

- MQTT topic: `greenhouse/v1/{greenhouseId}/{deviceId}/{telemetry|status|command|ack}`.
- Local API serves latest/history, device status, authorized commands and command acknowledgments over HTTPS.
- Cloud sync batches immutable event IDs; cloud commands use separate request/poll/ack routes.
- Shared React frontend selects local/cloud API adapter; UI business logic remains shared.
- Local SQLite is operational source of truth; D1 is remote mirror/read model.

## Failure behavior

Sensor invalid/missing, expired command, invalid TLS, lost broker, Pi loss or cloud loss must not trigger actuator ON. ESP32 stays in configured safe state, buffers bounded telemetry and reconnects with backoff. Cloud reconnect resumes queue sync; browser cache remains read-only.

## Deployment

Ubuntu 24.04 on Pi, Mosquitto, Python gateway, SQLite volume, Caddy Private CA, local frontend assets and an isolated/compatible inference runtime. Bind/firewall services to required LAN interfaces only. Confirm Pi hostname/IP and trusted time source before certificate provisioning.

## Architecture decision records

| Decision | Why | Alternatives considered | Trade-off | Effect on existing system |
|---|---|---|---|---|
| Pi SQLite is local operational truth; D1 is mirror | Offline operation and local recovery must not depend on cloud | D1-only; dual-writer | Queue/reconciliation complexity; one clear owner per event | Preserve existing local SQLite and additive D1 history |
| MQTT/TLS for ESP32↔Pi; retain REST Pi↔Worker | Broker sessions suit intermittent device links; existing signed REST path already works | Keep ESP32 HTTP; replace all cloud REST with MQTT | Adds broker and credential ops; avoids rewriting stable cloud API | Migrate transport by canary and retain rollback until parity proven |
| Shared frontend with local/cloud API adapter | Avoid duplicated UI/business behavior | Separate local/cloud apps | Adapter has connection-state complexity | Reuse current React/shadcn UI; replace demo source only after API readiness |
| Local named accounts, cloud Access remains | Local operator identity and audit without cloud dependency | Shared token; local-only shared password | Account provisioning/recovery required | Add local auth store; never copy password hashes to D1 |
| Keep Supabase image storage initially | Current private bucket and signed URL path exist | Move immediately to R2 | Avoids migration risk; adds vendor dependency | Keep D1 metadata; evaluate R2 only with tested migration/cost case |
| Benchmark TFLite-compatible runtime on Ubuntu Pi | Current Alpine/Python 3.13 compatibility unverified | Assume current container works; pick another model/runtime now | Delays runtime selection until measured | Isolate inference only if direct integration fails benchmark |
