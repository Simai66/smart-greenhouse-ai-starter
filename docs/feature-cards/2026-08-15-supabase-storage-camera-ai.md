# Feature card: Supabase Storage camera evidence and AI detections

## User outcome

Operators can upload greenhouse images from Dashboard/mobile or a Raspberry Pi
camera, view the public evidence URL, and keep multiple AI findings linked to
one image. Image objects expire after 15 days while detection metadata remains
available.

## Acceptance criteria

- Dashboard and Pi accept JPEG, PNG, and WebP only, up to 10 MiB.
- Upload URL and complete flows use Supabase Storage signed upload URLs; no
  Service Role Key reaches Browser, Pi, or Git.
- Viewer can list images; only operator/admin can create and complete uploads.
- Pi upload URL, complete, and batch detection routes reject invalid HMAC.
- One image can have up to 100 detection rows per request and retries are
  idempotent.
- A daily Worker cron deletes expired objects after 15 days, marks metadata
  `expired`, clears `public_url`, and leaves detections intact.
- Pi supports a configurable capture command or fixture image and queues image
  uploads while offline.
- Dashboard/mobile AI view can select a camera, upload an image, preview it,
  and show detection rows when available.
- Dashboard can request Mac/browser camera permission, capture a JPEG, and send
  it through the same signed-upload flow.
- R2 and Cloudflare Images bindings are absent; sensor telemetry remains intact.
- Unit, Python, build, and diff checks pass.

## Scope

In: Supabase Storage adapter, D1 image/detection migration, browser and agent
image APIs, batch detection API, retention cron, R2 removal, Pi capture/upload
retry flow, dashboard upload/camera capture/preview/list, docs and tests.

Out: AI model inference, private-bucket rollout, image moderation, RTSP
discovery, camera provisioning UI, and replacing existing demo plant data.

## Affected areas

- UI: `components/greenhouse/views/ai-detection-view.tsx` and browser adapter.
- API/database: D1 schema, migrations, image/detection routes, Supabase
  Storage adapter.
- Deployment: Worker cron, staging config, Supabase secrets and bucket setup.
- Edge: configurable USB webcam capture, direct upload, offline queue.

## Assumptions and risks

- Supabase bucket `greenhouse-images` is public-read and already created by an
  operator; public URLs expose images until deletion.
- Supabase project URL and Service Role Key exist only as Worker secrets.
- Cloudflare cron uses UTC; `0 20 * * *` means 03:00 Asia/Bangkok.
- Existing `detections.image_key` is retained for historical rows.
- No D1 plant table exists, so `plantId` format is validated but not resolved
  against a relational plant registry.
- Pending uploads older than 24 hours are cleaned and marked failed.

## Owners and dependency order

1. Backend: contract, validation, migration, Supabase adapter, routes, retention.
2. DevOps: bucket, Worker secrets, cron, R2 removal and staging deployment
   instructions.
3. Edge: capture command, direct upload, detection batch, offline queue.
4. Frontend: upload picker, progress state, image preview and detections.
5. QA: unit, Python, API contract, retention and build checks.
