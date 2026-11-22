# 08 — Cloud synchronization design

Pi writes telemetry and a sync queue row atomically in SQLite. Queue item has unique event ID, schema version, timestamps, attempt count, next attempt and state `PENDING`/`RETRY`/`SYNCED`/`FAILED`. Worker validates an authenticated batch and applies idempotently to D1. Keep a safe failure reason; never log tokens or payload secrets.

Retry transient network/5xx/rate-limit failures with exponential backoff and jitter; cap attempt rate and retain data for operator recovery. Permanent schema/auth failures become visible `FAILED`/quarantine state, not silent deletion. Capacity and retention are `REQUIRES_CONFIGURATION` based on sampling and outage target.

On connectivity return, scan eligible PENDING/RETRY rows in bounded batches and mark SYNCED only after confirmed Worker response. Restart resumes from SQLite state. D1 is mirror, never local control authority. Cloud command requests use separate queue, expiry, authorization and ACK lifecycle; they do not enter telemetry sync.
