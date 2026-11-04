# Image and AI evidence API v1

All new errors use:

```json
{
  "error": { "code": "IMAGE_TOO_LARGE", "message": "Image must not exceed 10 MiB" }
}
```

## Browser image flow

Browser and Pi image operations are limited to the `GH-01` pilot. Other
greenhouse IDs receive HTTP 403 `GREENHOUSE_FORBIDDEN`. Image completion uses
the reserved image's greenhouse and rejects off-pilot records before Storage
access.

`POST /api/images/upload-url` requires `operator` or `admin`. Request:

```json
{
  "greenhouseId": "GH-01",
  "cameraId": "CAM-A-01",
  "plantId": "PLANT-01",
  "capturedAt": "2026-08-15T10:00:00Z",
  "contentType": "image/jpeg",
  "byteSize": 245678
}
```

Response contains `imageId`, `objectPath`, `uploadUrl`,
`uploadExpiresAt`, and `status: "pending"`. Responses containing signed URLs
use `Cache-Control: no-store`. Browser/Pi sends a
`PUT` with the original `Content-Type` to `uploadUrl`, then calls
`POST /api/images/complete` with `{ "imageId": "img_..." }`.

`GET /api/images?greenhouseId=GH-01&cameraId=CAM-A-01&limit=100` requires
`viewer` and returns image metadata, `readUrl` (short-lived signed URL, or
`null` after expiry),
`status`, `detectionCount`, and detection summaries.

## Pi image flow

`POST /api/agent/images/upload-url` and
`POST /api/agent/images/complete` use the existing HMAC headers documented in
`edge-agent-v1.md`. Request fields match the browser flow; source is forced to
`pi` and the created record is tied to the authenticated agent identity.

Pi clients may supply `imageId` (`img_<UUID>`) generated and saved before the
first request. Reusing that ID with the same agent and metadata returns the
same record and object path, including after a lost response or restart.
Keep `capturedAt` identical on retries; if omitted, the first reservation's
timestamp is reused. Conflicting ownership or metadata returns
`409 IMAGE_ID_CONFLICT`; malformed IDs return `400 INVALID_IMAGE_ID`.

A `pending` reservation returns a fresh signed upload URL. A `ready` reservation
returns a short-lived `readUrl`; expired reservations return no read URL. Before uploading,
retry completion: only `409 UPLOAD_NOT_FOUND` requires a PUT, then completion.
A `ready` reservation returns existing metadata without an upload URL; proceed
directly to posting detections. `expired` returns metadata without read or
upload URLs. `failed` returns
`409 IMAGE_UPLOAD_FAILED`. Preserve queued work on HTTP 408/429, server errors,
and network failures. Clients omitting `imageId` still receive a new ID.

## Batch detections

`POST /api/agent/detections` uses HMAC and accepts at most 100 results:

```json
{
  "greenhouseId": "GH-01",
  "imageId": "img_...",
  "modelVersion": "v1",
  "detectedAt": "2026-08-15T10:00:10Z",
  "results": [
    { "plantId": "PLANT-01", "classification": "leaf_spot", "confidence": 92.5, "severity": "medium" }
  ]
}
```

The image must belong to the same greenhouse and be `ready` or `expired`.
Detection IDs are deterministic, so retrying an identical batch does not add
duplicate rows. Deleting an image object never deletes its D1 detections.

## Object path

```text
{greenhouseId}/{source}/{cameraId-or-dashboard}/{yyyy}/{mm}/{uuid}.{extension}
```

All browser-facing greenhouse endpoints and signed agent endpoints are scoped
to `GH-01` during this pilot. Foreign greenhouse requests return HTTP 403
`GREENHOUSE_FORBIDDEN`; sensor configuration addressed by opaque sensor ID
returns 404 when no GH-01 sensor matches.

## Retention

Worker cron runs daily at 03:00 Asia/Bangkok (`0 20 * * *` UTC). It removes
expired objects through Supabase Storage in batches of 1,000, then updates D1.
