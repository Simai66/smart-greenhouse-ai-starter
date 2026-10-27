# GH-01 API pilot boundary design

## Intent

Limit all greenhouse API operation to the user-selected single pilot `GH-01`
before any real data is used. Preserve current roles and existing demo behavior.

## Goals and non-goals

- Allow valid GH-01 browser and registered-agent flows unchanged.
- Deny non-GH-01 reads/writes with 403 before data/storage access; hide opaque
  sensor records with existing 404 behavior.
- Keep validation, role checks, agent signatures/registration, and fail-closed
  command behavior.
- Do not add membership tables, migrations, UI changes, deployment, or hardware
  actuation.

## Approaches

1. **Fixed pilot boundary in shared server helper (selected):** smallest safe
   scope for one explicitly chosen greenhouse; no schema/deploy dependency.
   Expand to membership authorization when pilot scope grows.
2. **Add per-user greenhouse memberships:** supports multiple sites, but needs
   product roles, schema/migration, data seeding, and rollback design that this
   single-greenhouse pilot does not need yet.
3. **Rely on hosted Access:** cannot protect greenhouse IDs inside API requests
   and current Access policy has no collected evidence, so reject as the only
   boundary.

## Implementation calls

- Use one shared `GH-01` scope check and existing `apiError` response shape.
- Apply check after existing authentication/basic input validation but before
  D1/storage access. Agent paths retain signed authentication and registration.
- For image completion, derive greenhouse from persisted image row and reject
  before storage provider calls; this requires one metadata read.
- QA tests pure scope behavior plus relevant caller coverage; no database or
  deployment simulation is claimed.

## Risks and remaining work

Global email roles still grant GH-01 to any authenticated user whose hosted
Access policy allows entry. Confirm staging Access policy before live rollout.
This code change cannot prove sensor calibration or actual telemetry.
