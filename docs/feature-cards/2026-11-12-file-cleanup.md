# Feature card: File cleanup

## Outcome and acceptance

Remove only files confirmed redundant without breaking references or changing behavior. Verify the duplicate content and repository references, then review the diff.

## Scope and risks

- In scope: repository-wide inventory and removal of confirmed duplicate files.
- Out of scope: local state, caches, secrets, migrations, source assets of uncertain purpose, and unverified file moves.
- Affected areas: repository assets and documentation; no API, database, or deployment changes.
- Assumption: an exact duplicate without references is redundant. Public URLs and unreferenced originals may have external consumers.

## Order and ownership

1. Main agent inventories files, checks references and compares duplicate content.
2. Main agent removes confirmed duplicates and performs targeted QA and diff review.
