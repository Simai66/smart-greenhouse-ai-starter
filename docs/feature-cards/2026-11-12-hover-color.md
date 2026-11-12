# Feature card: Softer hover color

## Outcome and acceptance

Shared hover and focus surfaces use a softer botanical green with readable foreground contrast. Primary, secondary, and sidebar colors remain unchanged.

## Scope and risks

- UI: shared accent token and design documentation. Accent also affects selected menu/search/toggle states and skeletons.
- Out of scope: API, database, deployment, and interaction behavior. Browser visual QA depends on browser availability.

## Order and ownership

1. Main agent (frontend): adjust shared token and document its role.
2. Main agent (QA): check contrast, relevant tests, lint/build where applicable, and diff.

## Sidebar follow-up

The sidebar uses a separate hover token. Use a translucent sidebar primary for hover while preserving the active background; verify the shared sidebar component and existing navigation contracts.

## Selected navigation

Use the white card surface and dark sidebar foreground for the selected navigation item, including hover, while preserving the inactive hover treatment.
