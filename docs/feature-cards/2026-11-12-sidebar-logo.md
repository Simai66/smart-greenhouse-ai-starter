# Feature card: Sidebar logo visibility

## Outcome and acceptance

Make the existing greenhouse mark more legible in the sidebar without changing the brand, navigation target, or collapsed layout.

## Scope and risks

- UI only: presentation of the existing logo; no API, database, deployment, or new asset.
- Preserve the full mark inside its clipped container. Visual verification depends on browser access.

## Ownership and order

1. Main agent (frontend): adjust the existing image presentation.
2. Main agent (QA): lint, targeted UI tests, diff review, and visual check where available.

## Collapsed sidebar

Fit the logo container to the 32px collapsed button and hide the wordmark in that state. Preserve the tooltip and dashboard action.
