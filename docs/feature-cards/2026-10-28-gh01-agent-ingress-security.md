# Feature card: GH-01 agent ingress security

- **User outcome:** Only registered GH-01 Pi can call agent APIs; forged, replayed, oversized, stale, or misrouted requests fail closed.
- **Acceptance:** (1) Agent requests require valid Cloudflare Access Service Auth assertion bound to configured agent and existing registered-agent/HMAC checks. (2) HMAC binds method, exact route, canonical allowlisted query, timestamp, nonce, and raw body bytes. (3) Request body limits apply before buffering/parsing; D1 nonce uniqueness rejects replay and D1 outage denies mutation. (4) Pi emits matching headers and preserves business idempotency on retry. (5) contracts/runbook give exact config, staged rollout and rollback; no secrets committed.
- **In scope:** Worker Access service-token verification, agent HMAC/replay guard, additive nonce migration and cleanup, Pi signer and tests, API contract and operator runbook.
- **Out of scope:** Browser role redesign; private image bucket/read API (next security slice); rate-limit dashboard setup; external Cloudflare/Supabase configuration; remote migrations/deploy; LAN firewall changes; relays.
- **Affected areas:** Backend auth/API/D1, Edge Pi client, DevOps documentation, QA tests.
- **Assumptions/risks:** GH-01 only. Access Service Auth claims follow the approved design. Existing Pi callers migrate together with Worker; until staging config and secrets are provisioned, agent calls fail closed. Nonce table adds D1 writes and needs scheduled expiry cleanup.
- **Owners/order:** Backend contract and verifier → Backend nonce migration/auth wiring → Edge signer → DevOps runbook (no external mutation) → QA targeted/full checks and fresh security review.
