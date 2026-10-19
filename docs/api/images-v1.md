# Image and AI evidence API v1

All new errors use:

```json
{
  "error": { "code": "IMAGE_TOO_LARGE", "message": "Image must not exceed 10 MiB" }
}
```

## Browser image flow

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
`uploadExpiresAt`, `publicUrl`, and `status: "pending"`. Browser/Pi sends a
`PUT` with the original `Content-Type` to `uploadUrl`, then calls
`POST /api/images/complete` with `{ "imageId": "img_..." }`.

`GET /api/images?greenhouseId=GH-01&cameraId=CAM-A-01&limit=100` requires
`viewer` and returns image metadata, `publicUrl` (or `null` after expiry),
`status`, `detectionCount`, and detection summaries.

## Pi image flow

`POST /api/agent/images/upload-url` and
`POST /api/agent/images/complete` use the existing HMAC headers documented in
`edge-agent-v1.md`. Request fields match the browser flow; source is forced to
`pi` and the created record is tied to the authenticated agent identity.

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

## Retention

Worker cron runs daily at 03:00 Asia/Bangkok (`0 20 * * *` UTC). It removes
expired objects through Supabase Storage in batches of 1,000, then updates D1.
