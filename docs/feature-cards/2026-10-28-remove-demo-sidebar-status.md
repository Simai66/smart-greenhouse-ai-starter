# Feature card: remove simulated sidebar status

**Status:** Implemented locally.

## Outcome and acceptance

Remove the sidebar footer that claims demo readiness and reports simulated
device counts. Do not replace it with unverified Pi or ESP32 status. The
sidebar contains no demo-readiness or simulated-device-count claim after the
change.

## Scope

- **In:** Sidebar footer, its unused device-count prop and caller, source-contract
  coverage.
- **Out:** Live Pi/ESP32 status, API/auth changes, hardware, deployment.
- **Risk:** Users lose the demo connectivity summary until a verified live
  status source is available.

## Owners and order

1. Frontend: remove the footer and unused prop.
2. QA: run the focused UI source-contract test and file-scoped lint.

## Verification

- Passed: `node --test tests/greenhouse-ui-source-contract.test.mjs` (12/12),
  file-scoped ESLint, and `npm run build`.
- Existing failure: `npx tsc --noEmit` still reports seven Cloudflare runtime
  type errors in unrelated files.
