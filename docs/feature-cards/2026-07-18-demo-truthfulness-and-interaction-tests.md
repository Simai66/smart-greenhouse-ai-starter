# Feature card — Demo truthfulness and interaction tests

## User outcome

Operators always understand that the dashboard is a local demo, never mistake
simulated status for live hardware telemetry, and can rely on critical UI flows
to stay working as the dashboard evolves.

## Acceptance criteria

- A persistent, visible demo-mode indicator distinguishes local sample data and
  mock acknowledgements from live greenhouse/device status.
- Dashboard, camera, and connection copy derives from the demo state or labels
  itself as simulated; no fixed live/online claim remains.
- Storage load/save failures are visible to the user and preserve a usable
  in-memory demo instead of failing silently.
- The global search follows the ARIA combobox/listbox pattern, including an
  announced active result and keyboard selection.
- Automated tests cover demo-store recovery plus critical user flows: device
  confirmation, alert resolution, settings validation, search selection, and
  CSV export.
- Existing demo safety, responsive layout, typography, and build/test results
  remain intact.

## Scope

- In: `GreenhouseDashboard`, demo store, styles, and client/browser test setup.
- Out: real device gateway, D1/auth changes, legacy unrendered components, and
  broad design-token/component extraction.

## Areas affected

- UI: operational status copy, persistence feedback, search semantics.
- Tests: automated interaction and store coverage.
- API/database/deployment: no production endpoint or schema change.

## Assumptions and risks

- The app remains a local browser demo; test browser tooling must work with the
  existing local Worker flow.
- Browser-test dependencies may require a separate browser download; if that
  cannot run in this environment, retain deterministic store tests and report
  the remaining browser-test setup as an explicit blocker.

## Ownership and dependency order

1. Frontend: implement truthful demo state and accessible interaction changes.
2. Frontend: add focused automated tests within the project test setup.
3. QA: validate labels, keyboard flows, persistence errors, responsive layout,
   and regression checks.
