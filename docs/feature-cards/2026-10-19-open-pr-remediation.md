# Feature card: Open PR remediation

## User outcome

Open PR #7 has verified A/B identity fixes and an understood build result; open
PR #5 is reconciled with current `main` without losing its real-data readiness
work or later sensor/image functionality.

## Acceptance criteria

- PR #7's cross-board sensor-config review finding remains fixed.
- Sensor device/config writes are atomic and duplicate point/metric requests
  return a conflict response.
- Cloudflare Workers build failure has a verified cause and fix, or exact
  provider evidence is recorded when repository access cannot expose logs.
- PR #5 merges current `main` without unresolved conflicts; both PR-specific
  behavior and later main functionality remain intact.
- Unit, Python, targeted lint, and production build pass on reconciled code.
- Image-retry changes stay out of PR-specific commits and are delivered as a
  separate feature commit; no image work is folded into PR #5/#7 remediation.
- No PR merges into `main`, production deploys, or hardware-validation claims.

## Scope

In: PR #7 review/build repair; PR #5 conflict audit and safe reconciliation;
separate commits and updated PR branches; relevant verification.

Out: merging PRs, production deployment, hardware commissioning, and unrelated
image-retry work already present in the worktree.

## Affected areas

- API/database: sensor registration and point/metric uniqueness.
- Firmware: board-to-measurement-point config validation.
- Release workflow: Cloudflare build evidence and GitHub PR checks.
- Documentation: this card and the implementation plan.

## Unknowns and risks

- Latest Code Review snapshot: PR #5 head
  `cee642c594d3d2a3a687090d30c9f8f9e3f7f691`, check `118044327834`, build
  `3c909378-5601-4961-9e74-6d46c9ca4da9`; PR #7 head
  `cd54ad5115094a63159560351475e25f3926f5c6`, check `117976624987`, build
  `6174220f-7c3d-4f93-83eb-7765b87f7465`. Both fail with no annotations or
  logs exposed; Cloudflare dashboard access required for root-cause evidence.
- PR #5 changes overlap main's later sensor, camera, firmware, and UI work.
  Conflict resolution must preserve both accepted behaviors.
- Physical SHT30 topology remains unverified; software changes cannot enable B.

## Owners and dependency order

1. Main agent: inspect CI evidence and reconcile PR #7 findings.
2. Main agent: reconcile PR #5 with current `main` in isolated clone.
3. QA: run scoped tests, lint, typecheck, build, and inspect resulting PR states.
