# Feature card: UI audit fixes

## Outcome and acceptance

Improve AI recommendation contrast, make zone action targets at least 44px, and replace 10px labels with the existing caption scale. Preserve behavior and verify relevant checks.

## Scope and risks

- UI only; no API, database, deployment, or behavior changes.
- Preserve plant evidence images: available WebP alternatives are not verified equivalent at detail quality.
- Browser visual and keyboard QA depend on browser access.

## Ownership and order

1. Main agent (frontend): apply focused token and size fixes.
2. Main agent (QA): check diff, targeted tests, lint, typecheck, and build; report unavailable visual checks.
