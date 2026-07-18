# Feature card — Dashboard interactions

## User outcome

Operators can use every button and input rendered on the current dashboard to
search, inspect, filter, save, export, and manage demo equipment state with
clear feedback and without suggesting a real actuator was changed.

## Acceptance criteria

- Every rendered button/input has a meaningful, keyboard-accessible outcome.
- Demo state persists per browser and safely recovers from unavailable or
  invalid stored data.
- Device toggles require confirmation, show pending/acknowledged feedback, and
  never dispatch to a real gateway.
- Search, chart periods, plant filters, alert actions, AI review, settings,
  user popover, and CSV export work from the current dashboard.
- Existing visual design, mobile layout, 44px controls, and reduced-motion
  support remain intact.
- Automated tests, production build, and QA interaction checks pass.

## Scope

- In: the dashboard rendered at `/`, client-side demo persistence, interaction
  UI, CSV download, and tests.
- Out: legacy unrendered component folders, real gateway dispatch, D1 migration,
  production authentication changes, and hardware integration.

## Areas affected

- UI: dashboard component and styles.
- API/database: no server route changes; a client-side repository mirrors the
  existing command-result shape for future replacement.
- Deployment: none.

## Assumptions and risks

- Local storage is per browser and does not synchronize users or devices.
- Browser download availability is required for CSV export.
- A mock acknowledgement is clearly labelled and cannot be treated as hardware
  confirmation.

## Ownership and dependency order

1. Main: record scope and coordinate integration.
2. Frontend: implement local repository and dashboard interactions.
3. QA: validate interactions, persistence, accessibility, and regressions.
