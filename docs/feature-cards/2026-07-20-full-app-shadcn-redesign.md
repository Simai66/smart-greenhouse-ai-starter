# Feature Card: Full-App Shadcn Greenhouse Redesign

Date: 2026-07-20
Status: Approved for implementation planning
Primary owner: Main agent
Delivery flow: Frontend → QA → done

## User outcome

Greenhouse operators can understand the greenhouse state, find urgent work,
inspect AI evidence, control devices safely, and review trends through one
cohesive, premium operational workspace on desktop, tablet, and mobile.

## Acceptance criteria

- The rendered product uses shadcn/ui as its primary component system and a
  greenhouse-specific adaptation of the official `dashboard-01` block.
- The desktop shell has a hamburger-controlled sidebar that collapses to an
  icon rail. Tablet and mobile use a modal drawer with focus trap, Escape close,
  and focus return.
- Dashboard, Plants, AI Detection, Devices, Analytics, Alerts, and Settings all
  use the new shell and task-specific layouts.
- Existing navigation, search, filters, dialogs, refresh, export, device
  commands, notifications, and local persistence remain functional.
- Device commands expose confirmation, sending, success, offline, and failure
  states without showing optimistic success.
- The soil-moisture trend uses the approved shadcn `ChartAreaStep` adaptation
  with Thai labels, percentage units, tooltip, target range, accessible summary,
  and operational recommendation.
- The interface has no horizontal overflow at 390, 768, 1024, and 1440 pixels;
  keyboard operation, visible focus, WCAG 2.1 AA contrast, reduced motion, and
  44 by 44 pixel primary touch targets are verified.
- Lint, build/type validation, relevant automated tests, browser interaction QA,
  and console-error checks pass.

## In scope

- Full client-side information architecture and visual redesign.
- Thai navigation and interface copy refinement.
- shadcn/ui initialization and `dashboard-01` block installation.
- Responsive shell, page layouts, charts, tables, sheets, dialogs, toasts,
  loading/empty/offline/stale/error states, and accessibility remediation.
- Splitting the current large dashboard composition into focused typed UI units.

## Out of scope

- New API routes, database schema changes, authentication changes, deployment,
  CI/CD, or infrastructure work.
- Replacing demo data with production greenhouse hardware connectivity.
- New product capabilities beyond the current navigation and interaction set.
- A dark theme.

## Affected areas

- UI: all rendered application pages, shared shell, design tokens, responsive
  behavior, charts, and client-side state presentation.
- API/database: no contract or schema changes; existing routes are consumers only.
- Deployment: no intended changes.

## Assumptions and risks

- shadcn/ui becomes the only rendered design system. Astryx dependencies may
  remain temporarily until functional parity passes, then unused imports and
  theme wrappers are removed.
- The shadcn CLI may create files that overlap current paths. Generated output
  must be reviewed and merged deliberately; user-owned dirty files must not be
  overwritten.
- Recharts increases client bundle cost. Only required chart modules and the
  approved chart views will be included.
- The existing demo store and API behavior remain the source of truth. The UI
  must adapt to them instead of moving business rules into components.

## Ownership and dependency order

1. Main agent: protect the current dirty worktree, verify the feature card, and
   coordinate role boundaries.
2. Frontend: initialize shadcn, establish tokens and shell, split presentation
   units, implement every page, preserve interactions, and run frontend checks.
3. QA: derive coverage from this card before implementation completes, then
   validate integrated behavior, responsive layouts, accessibility, failure
   states, regressions, and console output without editing code.
4. Frontend: fix QA findings when required.
5. Main agent: verify the Definition of Done and provide the final Thai handoff.
