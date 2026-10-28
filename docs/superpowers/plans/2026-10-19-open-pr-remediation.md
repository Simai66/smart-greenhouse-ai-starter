# Open PR Remediation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. Keep commits separated by PR and purpose; do not merge either PR.

**Goal:** Repair PR #7's verified review issues and reconcile PR #5 with current `main` while preserving user work.

**Architecture:** Keep current `main` behavior as the integration base. Apply PR #7 code fixes only on its feature branch. Resolve PR #5 in an isolated clone, retaining its unique real-data readiness changes and current main's later sensor/image behavior.

**Tech Stack:** Git/GitHub PRs, TypeScript, Drizzle D1, ESP32 Arduino/PlatformIO, Python edge agent, Cloudflare Workers.

**Spec:** `docs/feature-cards/2026-10-19-open-pr-remediation.md`; governing rules: `rule.md` and `docs/feature-cards/2026-08-11-pm-release-readiness.md`.

## Global Constraints

- Preserve all pre-existing user changes in the root worktree.
- Keep PR work on dedicated branches; do not commit directly to `main`.
- Never claim Cloudflare or physical hardware validation without evidence.
- Keep Pi-only cloud HMAC authentication and fail-closed behavior intact.
- Keep A/B sensor identity independent of plant assignment and never hardcode plant IDs in firmware.
- Do not alter deployed D1 data or production configuration.
- Use existing shadcn/Radix/Tailwind UI; no Astryx packages.

## Review Focus

- Same point/metric submitted concurrently: database uniqueness must prevent duplicate config and atomic persistence must prevent orphan device rows.
- Config for another ESP32 board: reject before telemetry can claim another board's physical point.
- Conflict resolution: preserve PR #5 demo/live separation and newer main telemetry/image behavior.
- Provider build failure without annotations: do not guess at deployment config; identify what log access is missing.
- Keep image-retry work separate from PR remediation. It was preserved outside
  PR-specific commits and later committed independently as `e549a95`.

---

### Task 1: Verify PR #7 fix and Cloudflare build cause

**Files:** `firmware/esp32/src/main.cpp`, `app/api/sensors/route.ts`, `app/api/sensors/[sensorId]/config/route.ts`, relevant tests and build configuration.

- [x] Verify ESP32 rejects linked point IDs that do not match `${NODE_ID}-${portKey}`.
- [x] Verify sensor/config persistence uses one atomic D1 batch and point/metric duplicate preflight returns 409.
- [x] Inspect available GitHub check output. Code Review confirms check `117976624987` has no log/annotations; Cloudflare build ID `6174220f-7c3d-4f93-83eb-7765b87f7465` needs dashboard logs. PR #5 check `118044327834`, build `3c909378-5601-4961-9e74-6d46c9ca4da9`, likewise exposes no log/annotations. Root cause remains blocked until Cloudflare logs are available; no cause was inferred.
- [x] Review findings already have regression coverage in PR #7 changes.
- [x] Run unit (59), Python (13), targeted lint, `npm run build`, and `git diff --check`; PlatformIO unavailable. `allowImportingTsExtensions` now resolves TS test imports; `npx tsc --noEmit` still has 7 missing Cloudflare type errors. Global lint now passes with 0 errors/6 warnings after excluding generated/tool directories.
- [x] PR #7 review fixes committed in `cd54ad5`; image retry work stayed separate and was later committed as `e549a95`.

**Completion:** Code checks pass and Cloudflare failure has an evidence-backed cause/fix, or missing dashboard-log access is reported precisely.

### Task 2: Reconcile PR #5 with current `main`

**Files:** Resolve only conflicting PR #5 files in `/private/tmp/sgh-pr5-audit` or another isolated clone; keep root worktree untouched.

- [x] Confirm remote PR #5 head and base; compare conflict files against merge base and current `main`.
- [x] Resolve overlaps preserving current main's newer implementations and PR #5 dashboard/demo work.
- [x] Remove conflict markers; sensor APIs, Pi queue/camera upload, and A/B contracts are present.
- [x] Run unit tests (54), Python tests (6), lint, typecheck, build, and rendered HTML smoke tests (3). One initial smoke run transiently returned 500; immediate endpoint check and full rerun passed all 3.
- [x] Commit reconciliation and type narrowing separately; push to `codex/remove-mock-data` (head `cee642c`).

**Completion:** Git reports no PR conflicts; tests/build evidence attached to PR progress; no production merge.

### Task 3: Final branch and change review

- [x] Review commits; root user image changes were not included.
- [x] Check both PR states, mergeability, and CI statuses. Both are mergeable; GitGuardian passes; Cloudflare Workers Builds fails on both PRs without exposed logs.
- [x] Record unverified hardware and inaccessible Cloudflare logs as residual risks.

**Completion:** PRs are updated and reviewable, or a precise external blocker and next required evidence are recorded.
