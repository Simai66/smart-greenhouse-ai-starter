# 05 — Database design and migration

## Source of truth

Pi SQLite owns operational telemetry, actuator audit, AI results and sync lifecycle. Cloud D1 is a remote mirror/read model. Keep local users on Pi only. Commands are separate from telemetry synchronization.

## Reuse existing entities

D1 already has devices, readings, commands, events, policies, detections and images. Reuse them before adding duplicate entities. Local SQLite currently has outbound queue, quarantine, processed commands, policies/runtime/sensor config and inbound readings. Add only missing actuator state/history and AI metadata when implementation needs them. Avoid a separate `sensors`/`plants`/`users` cloud table without a verified use case.

## Key and index proposal

Keep existing D1 keys and constraints from migrations as source of truth. New local sync rows use `event_id TEXT PRIMARY KEY`, `path`, `body`, `state`, `created_at`, `attempt_count`, `next_attempt_at`, `synced_at`, and `last_error`; index `(state,next_attempt_at)` and enforce unique event ID. New AI metadata uses `prediction_id TEXT PRIMARY KEY`, image/device/plant identifiers only where referenced lifecycle is verified; index `(device_id,inferred_at)` and `(plant_id,inferred_at)`. Do not add foreign keys where current schema cannot guarantee referenced lifecycle; review and test chosen relations before migration.

Existing Cloud tables already define keys/indexes; notable constraints include unique reading ID, device/port, command idempotency key and image/object identity. Review actual SQL migrations before changing Drizzle declarations because some constraints are SQL-only. Use UTC ISO-8601 text consistently; keep sampled/observed, received, created, acknowledged and synced timestamps distinct.

Current D1 entity disposition (from migrations 0000–0005):

| Entity | Current key/uniqueness and indexes | Relationship / timestamp notes | Plan |
|---|---|---|---|
| `greenhouses` | PK `id` | `created_at`; base tables do not all declare FK to greenhouse | Reuse as GH root |
| `devices` | PK `id`; unique composite `(id,greenhouse_id)` added in 0004; index greenhouse | `last_seen_at`, `updated_at`; composite FK used by measurement points | Reuse; add no duplicate device table |
| `edge_agents` | PK `id`; index greenhouse | `last_seen_at`, `created_at` | Reuse for gateway identity/status |
| `sensor_readings` | PK `id`; unique nullable `reading_id`; indexes greenhouse/sample and sensor/sample | `sampled_at` distinct from `received_at`; config version nullable | Reuse; event ID can map to reading ID |
| `sensor_configs` | PK `sensor_id`; indexes greenhouse/enabled/measurement point; partial unique point+metric | created/updated times and config version | Reuse; preserve calibration history policy decision |
| `plants` | PK `id`; unique `(id,greenhouse_id)`; index greenhouse/status | FK greenhouse RESTRICT; created/updated | Reuse |
| `measurement_points` | PK `id`; unique `(id,greenhouse_id)` and `(device_id,port_key)`; index greenhouse/device | Composite FK device+greenhouse RESTRICT; created/updated | Reuse for verified sensor points only |
| `plant_assignments` | PK `id`; partial unique active assignment per point; point/time and plant/time indexes | Composite FKs point/greenhouse and plant/greenhouse RESTRICT; assigned/unassigned times | Reuse as assignment history |
| `device_commands` | PK `id`; unique idempotency key; greenhouse/requested and device/requested indexes | requested/dispatched/acknowledged/expiry timestamps | Reuse; keep separate from telemetry queue |
| `device_command_events` | PK `id`; command/occurred index | `occurred_at` audit timestamp; FK not declared in initial migration | Reuse; inspect integrity before adding FK |
| `device_policies` / revisions | PK device ID / PK revision ID; greenhouse and device/version indexes | updated timestamps; revisions preserve history | Reuse for policy history |
| `detections` | PK `id`; image index added | `detected_at`; no declared FK to image/plant in initial migrations | Reuse; add model evaluation separately only if needed |
| `inspection_images` | PK `id`; unique `object_path`; greenhouse/time, camera/time, status/expiry indexes | capture/upload/create/expiry timestamps; object in Supabase Storage | Reuse; operation expiry and thesis archive remain distinct |
| `alerts`, `agent_request_nonces` | PK `id`; nonce composite PK `(agent_id,nonce)` and expiry index | opened/resolved and expires timestamps | Reuse; nonce retention is bounded by expiry policy |

Entities `actuator_states`, `users`, separate `sensors`, and model-evaluation result tables are not currently required in D1: use existing command audit, local-only users, existing sensor config/reading, and versioned experiment artifacts unless concrete query requirements justify tables. D1 does not receive local password hashes.

Retention: operational image object expiry remains 15 days per existing feature card. Thesis archive is separate and retained until thesis owner authorizes deletion. Telemetry retention and sync-history pruning remain `REQUIRES_CONFIGURATION`; initial migrations delete no rows or objects.

## Additive changes

- Add immutable event ID uniqueness and explicit queue states `PENDING`, `RETRY`, `SYNCED`, `FAILED` locally.
- Store observed/created/synced timestamps distinctly; index greenhouse/device plus observed time and queue state/retry time.
- Persist AI prediction with image ID, model version, label, confidence and latency; keep research image manifest/checksum separately from operational expiry.
- Use idempotent D1 insert/upsert keyed by event ID; maintain foreign keys/constraints from current migrations.

## Migration and recovery

Back up SQLite and test restore first. Preserve existing rows and migrations 0000–0005. Make additive schema changes and update Drizzle schema to match SQL constraints before generating migration. Migrate implicit queue states without discarding retries. On failure, stop writes or use a forward fix; rollback only through tested backup restore. Never delete/move stored objects as part of schema migration.
