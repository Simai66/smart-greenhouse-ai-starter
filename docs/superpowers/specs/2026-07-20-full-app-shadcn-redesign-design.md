# Smart Greenhouse Full-App Shadcn Redesign

Date: 2026-07-20
Status: Approved design; awaiting written-spec review
Feature card: `docs/feature-cards/2026-07-20-full-app-shadcn-redesign.md`

## 1. Outcome

Redesign the entire Smart Greenhouse client as a calm, premium operational
workspace. An operator must see overall status and urgent work within seconds,
understand the evidence behind AI findings, and control equipment with explicit
feedback. The redesign may change navigation, information hierarchy, Thai copy,
and component boundaries, but it must retain the existing functional surface.

## 2. Approved visual direction

The approved direction is **A — Greenhouse Command Deck**.

- Use a light neutral work canvas with a persistent deep botanical-green
  navigation region and one restrained green action accent.
- Use amber and red only for real warning and danger states.
- Keep typography compact enough for operations while preserving readable Thai
  line height and a clear hierarchy.
- Favor bordered information regions, structured rows, and tables over a grid of
  interchangeable cards.
- Put live state and urgent actions before history and analytical detail.
- Preserve the product personality: calm, trustworthy, precise, natural, and
  modern rather than a dense engineering console or generic AI demo.

## 3. Component foundation

shadcn/ui becomes the primary and only rendered component foundation.

The implementation starts with:

```bash
npx shadcn@latest init
npx shadcn@latest add dashboard-01
```

Use the New York visual style, neutral base color, CSS variables, Lucide icons,
React Server Components support, and the existing `@/*` path alias. Use the
Radix variant of shadcn primitives for dialog, sheet, tooltip, dropdown, and
other interactive foundations.

The official `dashboard-01` block is scaffolding, not finished product UI. Map
its composition into the greenhouse domain:

| `dashboard-01` region | Smart Greenhouse use |
| --- | --- |
| App sidebar | Greenhouse navigation and site context |
| Site header | Hamburger, page context, global search, alerts, user menu |
| Section cards | Plant health, temperature, humidity, open work |
| Interactive chart | Environmental and soil-moisture history |
| Data table | Plants, devices, sensors, alerts, or work queue by page |

Generated CLI output must be reviewed before merging. It must not overwrite the
existing application entry point, demo store, interaction logic, API modules, or
known user-owned dirty files without an explicit, scoped merge.

Astryx remains installed only during migration. Once shadcn functional parity is
verified, remove Astryx imports, theme wrappers, and rendered component usage.
Dependency removal is optional for this feature because retaining an unused
package is safer than changing the lockfile a second time during UI migration.

## 4. Shared application shell

### Desktop

- A 248-pixel expanded botanical sidebar contains site identity, greenhouse
  context, task-grouped navigation, alert count, settings, and user identity.
- A hamburger in the site header collapses the sidebar to a 68-pixel icon rail.
- Collapsed icons expose accessible names and tooltips. The preference persists
  locally and never hides the current page indicator.
- The sticky site header contains the hamburger, page title or breadcrumb,
  global search, alert trigger, and user menu.
- Main content uses a maximum readable width without leaving decision-critical
  tables or charts cramped.

### Tablet and mobile

- The sidebar is closed by default and opens as a modal left drawer.
- The drawer traps focus, closes on Escape or backdrop activation, and returns
  focus to the hamburger.
- Mobile preserves live state, urgent work, and the primary page action before
  analytical detail. Tables become prioritized rows, horizontal scroll regions,
  or full-screen details only where no semantic column reduction is safe.
- The global search remains reachable from the header and retains keyboard
  combobox behavior.

## 5. Page system

### Dashboard — Scan, decide, act

1. Page heading with last update, export, and refresh.
2. Compact live-status ribbon with system health, connected assets, and time.
3. Four summary metrics: plant health, temperature, humidity, open work.
4. Environmental history and an adjacent prioritized work queue.
5. A resource status table for plants, devices, and sensors needing attention.
6. Supporting greenhouse imagery appears after operational state, not as a hero
   that delays urgent information.

### Plants — Inventory and detail

- Search and filter by health, zone, and plant type.
- Desktop uses a master list plus detail region. Mobile opens plant details in a
  full-screen sheet.
- Each detail shows identity, zone, latest image, health state, AI finding,
  confidence, last inspection, and next action.

### AI Detection — Evidence before verdict

- Lead with the plant image and highlighted evidence region.
- Pair every finding with condition, confidence, severity, detection time, and
  recommended action.
- Keep retry or new-analysis actions close to their image context.
- Never present an unexplained Healthy/Unhealthy verdict.

### Devices — Safe command control

- List status, last response, current action, and schedule for each device.
- Controls remain close to the affected device.
- Commands with operational effect require a confirmation naming the device,
  action, duration, and expected effect.
- Sending, success, offline, timeout, and failure states are visible and textual.

### Analytics — Compare and explain

- Filters cover time range, zone, and metric.
- Environmental charts share clear units, target ranges, event annotations, and
  accessible summaries.
- Export remains available at page level.
- Related sensor and device events appear near the graph that they explain.

### Alerts — Triage inbox

- Segment alerts by open, acknowledged, and resolved.
- Rows expose severity, status, time, source, owner when available, and the next
  action without relying on color alone.
- Acknowledge and resolve actions provide visible feedback and persist.

### Settings — Grouped configuration

- Group greenhouse identity, thresholds, notifications, display, and demo
  controls by purpose.
- Show inline validation and field descriptions.
- When values differ from the persisted state, show a sticky save region with
  save, cancel, and feedback.

## 6. Approved soil-moisture chart

Adapt the supplied shadcn `ChartAreaStep` component for sampled soil-moisture
telemetry in Zone A.

- Rename the series from `desktop` to `soilMoisture`.
- Replace month labels with ISO timestamps formatted in Thai locale.
- Use percent units and the greenhouse target range of 50–65 percent.
- Preserve Recharts `accessibilityLayer` and add an accessible chart title,
  trend summary, units, and current value.
- The footer states the percentage of time within target and the selected range.
- Place an operational recommendation next to the chart when values are low.
- Use `type="step"` only for sampled or held values such as soil moisture and
  device state. Use a continuous curve for continuously varying temperature.

The chart is a reusable typed unit whose input contains timestamps, numeric
values, unit, target range, and an optional recommendation. It does not read the
store directly.

## 7. Component boundaries

Split the current large dashboard composition by responsibility:

- `components/app-shell/`: sidebar, site header, global search, navigation,
  alert trigger, user menu, responsive drawer behavior.
- `components/dashboard/`: summary metrics, live ribbon, work queue,
  environmental chart, resource status table.
- Existing domain folders (`plants`, `ai`, `devices`, `analytics`, `alerts`,
  `settings`): task-specific page views and focused child units.
- `components/ui/`: CLI-managed shadcn primitives and chart helpers.
- A small presentation adapter layer: converts demo/API state into typed props
  and derived summaries without owning persistence or business rules.
- One top-level client orchestrator: owns active-page state, store lifecycle,
  cross-page search, dialogs, and notification coordination.

Each component has one clear purpose, takes typed props, exposes callbacks for
actions, and remains independent of unrelated page state. Business rules remain
in the current store, interaction utilities, and API modules.

## 8. Data and interaction flow

1. The top-level client orchestrator loads the existing demo state once.
2. Presentation adapters derive navigation counts, summary metrics, work queue,
   search results, chart series, and per-page view models.
3. Page components render props and emit typed action callbacks.
4. Mutations use the existing store or API path, then refresh derived views and
   persist through the existing storage behavior.
5. Search, filters, tabs, selected rows, and sidebar collapse are local UI state.

Device commands do not show optimistic success. The UI enters a sending state,
waits for the result, then reports success or restores the previous presentation
with a useful failure message.

## 9. State and error design

Every page supports:

- Loading: skeletons preserve the final layout and accessible names.
- Empty: explain what is absent and offer the relevant next action.
- Offline: preserve the last known data, mark it stale, and disable unsafe
  actions with a reason.
- Stale data: show the last successful update and a refresh action.
- Error: keep the shell and unaffected sections usable; report recovery steps.

If local storage contains invalid or incomplete data, recover to the existing
demo initial state and show non-blocking feedback. Dialog and command errors keep
entered context where safe. Toasts use concise Thai copy and never provide the
only record of a safety-relevant failure.

## 10. Functional parity

The migration is incomplete until these behaviors work in the new UI:

- Navigation to all seven application areas.
- Global keyboard search and result selection.
- Alert counts, filtering, acknowledgement, and persistence.
- Device confirmation dialog, focus management, command states, and persistence.
- Plant and AI details, filters, and evidence.
- Analytics range controls and chart tooltips.
- Settings edit, validation, save, cancel, and persistence.
- Refresh, export, toast dismissal, user menu, and relevant dialogs.
- Reload recovery from saved, invalid, incomplete, or unavailable local storage.

## 11. Accessibility and responsive requirements

- WCAG 2.1 AA is the baseline; normal text contrast is at least 4.5:1.
- Every interactive element has an accessible name, visible focus, correct
  semantic role, and keyboard path.
- Primary controls and navigation rows provide at least a 44 by 44 pixel target.
- Status always combines color with text or an icon.
- Motion uses restrained 150–200 millisecond state transitions and respects
  `prefers-reduced-motion`.
- The application has no horizontal page overflow at 390, 768, 1024, or 1440
  pixels.
- Dialogs and drawers trap focus, close on Escape, and return focus.
- Charts provide textual titles, units, summaries, and accessible data behavior.

## 12. Verification plan

Frontend verification:

- Run lint, build/type validation, and all unit tests.
- Add or update tests for derived view models and domain interactions where the
  current test setup supports them.
- Validate all seven pages at 390, 768, 1024, and 1440 pixels.
- Exercise navigation, hamburger behavior, search, filters, tabs, dialogs,
  refresh, export, device commands, toast handling, and reload persistence.

QA verification:

- Validate happy, edge, failure, and regression paths from the feature card.
- Check keyboard order, focus trap and return, touch targets, accessible names,
  contrast, chart summaries, reduced motion, and overflow.
- Exercise loading, empty, offline, stale, failed command, and corrupted storage
  states where feasible.
- Confirm no browser console or runtime errors.
- Report findings with severity, reproduction, expected result, and actual result.

## 13. Delivery sequence

1. Main agent protects unrelated dirty work and confirms scope.
2. Frontend initializes shadcn and captures the `dashboard-01` scaffold.
3. Frontend establishes tokens and the shared shell.
4. Frontend moves the top-level orchestration behind typed view models.
5. Frontend implements Dashboard and the approved chart.
6. Frontend implements Plants, AI Detection, Devices, Analytics, Alerts, and
   Settings with functional parity.
7. Frontend removes Astryx from rendered UI and completes responsive and
   accessibility passes.
8. QA validates the integrated redesign; Frontend resolves findings.
9. Main agent verifies the Definition of Done and provides the Thai handoff.

## 14. Material risks and mitigations

- **CLI path collision:** inspect generated output and merge explicitly; never
  accept bulk overwrites of current application or user-owned dirty files.
- **Two design systems during migration:** do not mix Astryx and shadcn within a
  rendered page; migrate the shell as one coherent boundary.
- **Functional regression from component splitting:** preserve one orchestrator,
  typed callbacks, and a parity checklist; verify each page before moving on.
- **Chart bundle and rendering cost:** import only required Recharts primitives,
  keep series count limited, and avoid animation under reduced motion.
- **Mobile information overload:** retain live state and work queue first; move
  detail into sheets or lower sections without hiding required actions.
- **Safety ambiguity:** never show optimistic device success; keep confirmation,
  result, and failure copy next to the controlled device.
