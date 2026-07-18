# Feature card — Larger dashboard typography

## User outcome

Greenhouse operators can read every dashboard label, status, alert, and data
value comfortably at a glance without reducing browser zoom.

## Acceptance criteria

- The default body-text baseline is 1rem (16px); secondary labels and captions
  are at least 0.875rem (14px) and 0.8125rem (13px), respectively.
- Page headings, section headings, metrics, and display values have a clear,
  fixed rem-based product-UI hierarchy above the new reading baseline.
- The larger scale does not overlap or clip essential content at 320px, 375px,
  500px, 760px, or desktop widths; intentionally wide tables may scroll.
- Existing controls retain at least 44px targets, keyboard access, light theme,
  and dashboard behaviour.
- Frontend verification and targeted QA pass.

## Scope

- In: active dashboard typography tokens and responsive CSS in
  `app/globals.css`, plus focused tests only where they make a regression
  observable.
- Out: API/data changes, visual rebrand, legacy unrendered dashboard files,
  and broad component extraction.

## Areas affected

- UI: type scale, text wrapping, responsive dashboard layout.
- API/database/deployment: none.

## Assumptions and risks

- Keep the approved Noto Sans Thai/system fallback stack and calm light visual
  language.
- Larger type can increase dense table and alert-row height; readable wrapping
  or intentional horizontal scrolling is preferred to clipping.
- Browser/device screenshot tooling may be unavailable; QA will state any
  residual manual-visual coverage.

## Ownership and dependency order

1. Main: synthesize isolated typography assessments and publish this scope.
2. Frontend: implement the enlarged rem token scale and responsive safeguards.
3. QA: validate the type scale, target breakpoints, keyboard/touch behavior,
   and regressions.
