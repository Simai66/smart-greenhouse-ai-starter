# Image retry and camera response isolation

## Outcome and acceptance

- HTTP 408/429 and server/network failures retain queued images for retry.
- Retrying one Pi capture, including a lost response or Pi restart, reuses one image ID and does not duplicate detections.
- Switching camera or greenhouse cannot show stale list/upload results under the new selection.
- Regression tests exercise retry failures and out-of-order UI completion.

## Scope

In: Pi queue/upload, agent upload reservation API, camera-view request lifecycle, focused tests.
Out: other review findings, storage provider changes, provisioning, hardware changes.
Affected: UI, API, edge SQLite queue. No D1 schema or deployment changes.

## Contract and ownership

1. Backend: agent `POST /api/agent/images/upload-url` accepts optional `imageId` (existing `img_<UUID>` format). Existing clients may omit it. Supplied ID is idempotent: same agent and metadata reuse row/object; conflicting ownership/metadata returns 409. Response includes existing status; ready/expired rows need no upload, pending rows return a fresh signed upload URL. Failed rows return 409. Existing HMAC, greenhouse authorization, validation and error envelope remain.
2. Edge (main): generate capture imageId once and persist queue before network work. Retry reservation with same ID; for pending uploads attempt completion first, PUT only on UPLOAD_NOT_FOUND, then complete. Post identical detections after ready/expired result. Preserve transient HTTP failures.
3. Frontend: independently isolate camera/greenhouse requests and uploads; prevent old responses from changing current state.
4. QA (main): run regression tests, unit/Python suites, relevant lint, typecheck/build where feasible; report pre-existing failures separately.

## Risks and assumptions

- Public bucket and existing retention policy unchanged. Expired metadata can still accept detections.
- Existing queued captures gain and persist an imageId before their next request.
- No new dependencies. Server image record provides durable upload progress; no new queue state machine.
- Governing `rule.md` and active release card were recovered from
  `origin/codex/remove-mock-data` on 2026-10-28 and now govern follow-up work.

## Tech lead acceptance and ownership (2026-10-28)

### Verifiable acceptance

- Each Pi capture receives one `img_<UUID>` before network I/O; queued metadata
  persists that ID before retries or process restart.
- HTTP 408/429/5xx, URL/network errors, and timeouts retain both queue row and
  local image. Permanent client errors follow documented terminal handling.
- A retry completes an existing object before PUT; only `409 UPLOAD_NOT_FOUND`
  permits another PUT. Ready/expired records skip upload. Retrying detections
  does not create duplicate rows.
- Agent reservation rejects malformed IDs and conflicting agent/greenhouse/
  camera/plant/type/size/capture metadata; legacy callers without an ID still
  receive a new ID.
- Late list/upload/error results from old camera, greenhouse, or plant selection
  cannot alter current view. Camera change preserves keyboard focus.
- No D1 migration, storage provider change, hardware change, merge, or deploy.

### Owners and dependency order

1. **Backend (main):** verify API reservation/completion and detection contract;
   keep HMAC, greenhouse/agent ownership, validation, and error envelope intact.
2. **Edge (main):** persist stable ID and retain transient failures; retry upload
   and detection safely across lost responses/restart.
3. **Frontend (main):** isolate per-selection requests/uploads and keep keyboard
   focus after camera selection.
4. **QA (main):** verify API SQLite reservation semantics, Pi queue retry matrix,
   UI out-of-order responses, full unit/Python suites, source lint, and build.

### Current checkpoint

- Existing local diff implemented all three layers and added regression tests;
  it stayed separate from PR #5/#7 and was later committed independently as
  `e549a95` after user authorization.
- Latest inspected branch: `codex/sgh-dual-measurement-identity`, with no staged
  changes. Worktree also contains unrelated readiness cards/plans; preserve them.
- `rule.md` and release card `2026-08-11-pm-release-readiness.md` were restored
  from `origin/codex/remove-mock-data` and read before work continued.
- Cloudflare build logs are not visible in GitHub. Direct Cloudflare dashboard
  opened sign-in, so PR build diagnosis is blocked on dashboard access/logs.

### QA evidence (2026-10-28)

- `npm run test:unit`: passed, 59/59, including camera race and idempotent image
  reservation regressions.
- `npm run test:python`: passed, 13/13, including Pi image retry coverage.
- `bash scripts/sites-env.sh -- npm exec -- eslint components/greenhouse/views/ai-detection-view.tsx lib/server/image-contract.ts lib/server/inspection-images.ts tests/ai-detection-races.test.mjs tests/image-reservation.test.mjs`: passed with no output.
- `npm run build`: passed; Vite reported config-loader and large-chunk warnings.
- `bash scripts/with-local-worker.sh node --test tests/rendered-html.test.mjs`:
  blocked before tests; sandbox denied binding `127.0.0.1` with `EPERM`.
- `git diff --check`: passed.
- `npx tsc --noEmit`: still fails with 7 Cloudflare errors (five unresolved
  `cloudflare:workers` imports plus missing `Fetcher` and `D1Database`). Adding
  `allowImportingTsExtensions` removed 10 TS5097 test-import errors.
- `bash scripts/sites-env.sh -- npx wrangler types
  /tmp/sgh-worker-configuration.d.ts --config wrangler.staging.jsonc
  --include-runtime false`: generated binding shapes only. Default runtime
  generation is blocked by sandbox `listen(127.0.0.1)` EPERM. The cached type
  package conflicts with the locked Wrangler peer; dependency review is
  unavailable, so no package or type stub was added.
- Direct documented lint invocation initially failed with `eslint: not found`;
  the command above works through `npm exec`.
- `npm run lint`: passed with 0 errors/6 warnings after excluding agent skills,
  managed worktrees, Wrangler output, and local runtime files.
- Staging storage, hardware, and browser-level visual behavior were not exercised.

### Final review and verification (2026-10-28)

- Read-only code review found no Critical or Important findings in the current
  image retry/camera race diff. HMAC, greenhouse/agent scope, reservation
  metadata conflict handling, retry ID reuse, stale response isolation, and
  media stream stop-on-unmount were confirmed in the reviewed paths.
- Final whole-scope review deferred these Minor items under the plan's
  high-impact-only fix scope: `openCamera` rejection and `canvas.toBlob`
  continuations may call state setters after unmount (`ai-detection-view.tsx`
  around lines 132 and 160-165); reviewer harness found no effect on a new
  view. Regression coverage gaps: greenhouse/source conflict metadata,
  malformed/non-`UPLOAD_NOT_FOUND` 409, plant switch, late upload rejection, and
  direct media lifecycle. Repeated camera-open while permission is pending is
  pre-existing behavior. No Critical/Important defect remains.
- Re-ran `npm run test:unit`: passed, 59/59.
- Re-ran `npm run test:python`: passed, 13/13.
- Re-ran `npm run lint`: passed, 0 errors/6 warnings.
- Re-ran `npm run build`: passed after allowing local-only Worker binding;
  existing Vite config-loader and chunk-size warnings remain. Unprivileged
  artifact validation initially hit `listen(127.0.0.1)` `EPERM`.
- Re-ran `npx tsc --noEmit`: still fails with the same 7 Cloudflare type errors.
- Re-ran `bash scripts/with-local-worker.sh node --test
  tests/rendered-html.test.mjs`: passed, 3/3 after allowing local-only Worker
  binding. This is rendered HTML/API smoke, not browser-level focus/media QA.
- `git diff --check`: passed; no code fix was needed from review.
- Reviewer focused Node suite 4/4 and Python suite 13/13 passed; working-tree
  review was read-only. Browser-level focus/media and live storage/hardware
  remain unverified.
