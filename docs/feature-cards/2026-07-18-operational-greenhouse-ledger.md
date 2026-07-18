# Feature card: Operational Greenhouse Ledger

## User outcome and acceptance criteria

Greenhouse operators can identify the demo data source, freshness, open alerts,
and decision-critical telemetry before inspecting imagery, on both desktop and
mobile.

- Source/freshness, attention items, and telemetry appear before greenhouse
  imagery at every supported breakpoint.
- Desktop presents telemetry and attention in an 8/4-column operational grid.
- Mobile orders content as source/freshness, attention, telemetry, actions,
  imagery, history, devices, and plant health.
- Refresh and CSV export remain available at 360, 390, 768, 1280, 1440, and
  1600 px without horizontal overflow or clipped labels.
- Existing keyboard, drawer, search, device confirmation, alert lifecycle, AI
  review, settings validation, reduced-motion, and local-persistence behaviour
  remains intact.
- Relevant tests, lint, and production build pass; QA records either a pass or
  any residual risk.

## Scope

In scope: composition and responsive presentation of the active dashboard in
`components/greenhouse-dashboard.tsx` and `app/globals.css`, including internal
presentation-only extraction when useful.

Out of scope: APIs, database, authentication, the demo state model, safety copy,
brand tokens, hardware claims, public component APIs, and the inactive
`components/dashboard/dashboard-view.tsx` implementation.

## Affected areas

- UI: dashboard information hierarchy, telemetry presentation, action row, and
  responsive ordering.
- API/database: none.
- Deployment infrastructure: none.

## Unknowns, assumptions, and risks

- Existing demo values and interaction semantics are treated as product truth
  and remain unchanged.
- Source/freshness is dashboard-critical on mobile even though the desktop
  sidebar also communicates demo status.
- Main risks are focus or keyboard regressions, overflow in Thai labels, and
  responsive order diverging between markup and visual presentation.

## Ownership and dependency order

1. Main owner: feature scope, dependency control, and final release decision.
2. Frontend specialist: active dashboard composition and responsive CSS.
3. QA specialist: derive and run interaction, accessibility, and breakpoint
   checks after the feature card is available.
4. Frontend specialist: address any confirmed findings before final QA sign-off.
