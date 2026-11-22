# Feature card: Isolated local Worker smoke state

## Outcome and acceptance

Build and rendered HTML smoke checks start Wrangler without opening stale local
persistent state. Existing `.sites-runtime` data remains untouched.

## Scope

- In scope: `scripts/with-local-worker.sh` persistence path and focused smoke.
- Out of scope: migrating or deleting local Wrangler/D1 data; application changes.

## Affected areas and order

1. Dev tooling: give each local smoke Worker temporary persistence state and
   clean it up after exit.
2. QA: run build and rendered HTML smoke; review diff.

## Risk

Smoke runs cannot reuse local D1/R2 state. Current smoke checks only request the
Worker root page, so persistent state is not part of their input.
