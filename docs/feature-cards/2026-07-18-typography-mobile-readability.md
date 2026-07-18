# Feature card — Typography and mobile readability

## User outcome

Greenhouse operators can comfortably read Thai labels, statuses, metadata, and
alerts without text appearing cramped or colliding at desktop, tablet, or
mobile widths.

## Acceptance criteria

- No production UI text is smaller than 11px (0.6875rem); primary reading text
  uses 14px (0.875rem) or larger.
- Typography uses a small, tokenized rem-based scale that respects browser text
  zoom and preserves the existing calm light dashboard visual language.
- At 320px, 375px, 500px, 760px, and desktop widths, search, hero controls,
  alert filters, tables, and metadata reflow or scroll intentionally rather
  than overlap or clip essential text.
- Existing 44px touch targets, keyboard access, light palette, and dashboard
  behaviour remain intact.
- Frontend verification and targeted QA pass.

## Scope

- In: `app/globals.css` typography tokens, component-local responsive layout
  rules, and any minimal semantic markup necessary for responsive controls.
- Out: new product features, API changes, data model changes, visual rebrand,
  and unrelated legacy dashboard files.

## Areas affected

- UI: dashboard type scale and responsive layouts.
- API/database: none.
- Deployment infrastructure: none.

## Assumptions and risks

- Keep the approved light redesign and Noto Sans Thai/system fallback stack.
- Raising text may increase table width; horizontal scrolling is acceptable for
  wide tabular data when headers and rows remain legible.
- Screenshot-based browser verification may be unavailable in this workspace;
  QA will use available automated and source-level responsive checks and state
  any residual manual-device coverage.

## Ownership and dependency order

1. Main: record scope and synthesize isolated typography assessments.
2. Frontend: implement the tokenized scale and responsive reflow fixes.
3. QA: validate target widths, keyboard/touch behaviour, and regressions.
