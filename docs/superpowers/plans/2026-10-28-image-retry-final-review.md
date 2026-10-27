# Image Retry Final Review Plan

> **For agentic workers:** Use superpowers:executing-plans to complete each task. Keep user changes unstaged and uncommitted.

**Goal:** Verify current image retry and camera race changes against their feature card, fix only confirmed high-impact findings, and leave a truthful QA handoff.

**Architecture:** Review the current uncommitted backend reservation, Pi queue retry, and frontend request isolation as one feature slice. Reuse current API/service patterns and regression tests; do not add dependencies, schema changes, storage changes, or a second state machine.

**Tech Stack:** TypeScript, Next.js client components, Cloudflare Worker/D1, Drizzle, Python edge agent, Node test runner, unittest.

**Spec:** `docs/feature-cards/2026-09-25-image-retry-camera-races.md`; release constraints: `rule.md` and `docs/feature-cards/2026-08-11-pm-release-readiness.md`.

## Global Constraints

- Preserve all pre-existing worktree changes; do not stage, commit, merge, deploy, or alter remote state.
- Keep agent HMAC, greenhouse scope, input validation, error envelope, and queue durability.
- Keep demo content separate from real device or AI output; no actuator or hardware behavior changes.
- Do not add dependencies, migrations, abstractions, or refactors outside this feature card.
- Keep API compatibility for clients that omit `imageId`.

## Review Focus

- Reused image IDs must reject a different agent, greenhouse, camera, plant, content type, size, or capture timestamp with 409; inspect `image reservation survives retries, collisions, concurrent requests and lost responses` and list any uncovered compared field.
- Retry after lost reservation, PUT, completion, detection response, or process restart must reuse one ID and avoid duplicate PUT/detections; inspect `test_upload_retries_resume_same_image_after_lost_response_and_restart` and `test_capture_retains_transient_http_failures_and_discards_invalid_uploads`.
- Only `UPLOAD_NOT_FOUND` may trigger another PUT; malformed or permanent errors must preserve the documented terminal behavior.
- Late list/upload/error responses from a prior greenhouse, camera, or plant must not mutate current view; inspect `latest image request wins; upload invalidates earlier image lists`, `camera and greenhouse changes remount image state and ignore old uploads`, and `camera selection restores focus to the selected radio after remount`.
- An unmounted camera view must not update React state or leak an acquired media stream.

---

### Task 1: Review current image retry diff and callers

**Files:**
- Review: `components/greenhouse/views/ai-detection-view.tsx`
- Review: `lib/server/image-contract.ts`, `lib/server/inspection-images.ts`
- Review: `edge-agent/greenhouse_agent.py`, `edge-agent/test_greenhouse_agent.py`
- Review: `tests/ai-detection-races.test.mjs`, `tests/image-reservation.test.mjs`, `docs/api/images-v1.md`
- Callers: agent and user image upload/complete routes, detection route, image list API, camera view, `Agent.flush_queue()` and `CloudClient.upload_image()`

**Interfaces:** Existing API contract and behavior are defined in the feature card and `docs/api/images-v1.md`; no new contract is planned.

- [x] Compare each changed path with feature-card acceptance; report only reproducible critical/important findings and exact file/line. Read-only review found none.
- [x] Confirm agent HMAC and greenhouse scope remain enforced on reservation, completion, and detections.
- [x] Confirm reservation conflict handling compares persisted ownership/metadata and never reuses another row's object path.
- [x] Confirm UI request invalidation and media stream cleanup; final review found minor state-setter continuations after unmount, documented below.

### Task 2: Fix confirmed findings only

**Files:** Only files named by Task 1 findings; add or update the owning regression test beside the affected behavior.

- [x] No Critical/Important finding; no code change needed. Minor residual: browser-level focus/media lifecycle was not exercised.
- [x] No new regression test needed; existing feature tests were rerun below.

### Task 3: Re-run feature verification and update handoff

**Files:** `docs/feature-cards/2026-09-25-image-retry-camera-races.md`, if evidence or residual risk changes.

- [x] `npm run test:unit`: 59/59 pass.
- [x] `npm run test:python`: 13/13 pass.
- [x] `npm run lint`: pass, 0 errors and 6 existing warnings.
- [x] `npm run build`: pass after allowing local-only Worker binding; Vite config-loader and chunk-size warnings remain. Unprivileged attempt hit `listen(127.0.0.1)` `EPERM` during artifact validation.
- [x] `npx tsc --noEmit`: fails with 7 Cloudflare type errors (5 unresolved `cloudflare:workers`, missing `Fetcher` and `D1Database`).
- [x] `bash scripts/with-local-worker.sh node --test tests/rendered-html.test.mjs`: passed, 3/3 after allowing local-only Worker binding; unprivileged attempt was blocked by `EPERM` before tests.
- [x] `git diff --check`: pass; no files staged and existing user changes preserved.

## Handoff

Main agent owns review, fixes, and QA. Stop before commit/merge/deploy; report findings, exact commands/results, remaining external blockers, and next one action in Thai.

### Final whole-scope review

- Critical/Important: none. Reviewer confirms reservation ownership/scope,
  durable queue retry, stale UI isolation, and late acquired stream cleanup.
- Minor deferred by plan scope: `openCamera` rejection and `canvas.toBlob`
  continuations may call state setters after unmount (`ai-detection-view.tsx`
  around lines 132 and 160-165); reviewer harness observed no effect on a new
  view. Regression gaps remain for greenhouse/source metadata conflict,
  malformed/non-`UPLOAD_NOT_FOUND` 409, plant switch, late upload rejection,
  and direct media lifecycle.
- Declined-to-judge: repeated `openCamera` calls while permission is pending
  predate this diff; live storage/hardware and Cloudflare typecheck errors are
  outside this code review and remain tracked by release readiness.
