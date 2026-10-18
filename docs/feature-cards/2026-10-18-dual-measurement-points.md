# Feature card: Dual measurement points and plant assignment foundation

## User outcome

Admin registers one ESP32 once, assigns its A/B measurement points to plants,
and changes assignments from Settings without rebuilding firmware. Sensor
channel IDs remain stable and historical readings resolve to the plant that
owned the point at each reading's sample time.

## Acceptance criteria

- One board has exactly points A and B; each channel maps to at most one point
  and one metric within that point.
- Existing sensor IDs/readings remain unchanged and may stay unassigned.
- Plant and point must belong to same greenhouse; only admin changes mappings.
- Assignment writes are atomic, version checked, idempotent when unchanged, and
  preserve UTC assignment history.
- `sampledAt` resolves against half-open assignment intervals; unknown periods
  remain unattributed.
- Firmware receives `measurementPointId`/port from Pi config without changing
  the LAN/cloud telemetry envelope or embedding plant IDs.
- Unverified hardware topology cannot cause point A data to appear as point B.

## Scope and affected areas

In: Drizzle/D1 schema, additive migration, plant/point/assignment APIs, Settings
mapping UI, sensor config-to-point relation, firmware config abstraction,
contracts, migration and identity tests.

Out: captive-portal provisioning, relay control, physical dual-SHT30 bring-up,
plant lifecycle/crop-batch persistence, and broad dashboard data migration.

Areas: `db/`, `drizzle/`, `app/api/`, `lib/`, `components/greenhouse/settings/`,
`firmware/esp32/`, `docs/api/`, `edge-agent/` tests.

## Unknowns and risks

- Actual SHT30 module address topology is not verified. Current P0 endpoint maps
  to A; B remains invalid until physical adapter is approved.
- Plants had only browser demo representation. Add minimal D1 plant registry;
  existing demo plants are not silently imported.
- No Jira connector or active Jira browser session is available; issue titles
  and acceptance criteria require direct Jira follow-up.
- `rule.md` and AGENTS-named Aug 11 release card are absent from this checkout.

## Owner and dependency order

1. Backend: migration, identity helpers, registry/point/assignment APIs.
2. Frontend: Settings registration and assignment form using API contracts.
3. Embedded: Pi config passthrough and safe point-aware firmware adapter.
4. QA: migration, identity/history, API security/concurrency, firmware build,
   regression suite; hardware owner verifies topology before point B enablement.
