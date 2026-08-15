export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const IMAGE_UPLOAD_URL_TTL_MS = 2 * 60 * 60 * 1000;
export const IMAGE_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;
export const IMAGE_PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];
export type ImageSource = "pi" | "dashboard";
export type ImageStatus = "pending" | "ready" | "failed" | "expired";

export type ImageUploadInput = {
  greenhouseId: string;
  cameraId: string | null;
  plantId: string | null;
  capturedAt: string | null;
  contentType: ImageContentType;
  byteSize: number;
};

export type DetectionInput = {
  plantId: string;
  classification: string;
  confidence: number;
  severity: string;
};

export const IMAGE_ID_PATTERN = /^img_[0-9a-f-]{36}$/i;
export const IMAGE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function isImageContentType(value: unknown): value is ImageContentType {
  return typeof value === "string" && (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function extensionForContentType(contentType: ImageContentType): string {
  return contentType === "image/jpeg" ? "jpg" : contentType.slice("image/".length);
}

export function isImageId(value: unknown): value is string {
  return typeof value === "string" && IMAGE_ID_PATTERN.test(value);
}

export function isImagePathSegment(value: unknown): value is string {
  return typeof value === "string" && IMAGE_SEGMENT_PATTERN.test(value);
}

function nullableSegment(value: unknown, label: string): { value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") return { value: null };
  if (!isImagePathSegment(value)) return { value: null, error: `${label} is invalid.` };
  return { value };
}

function normalizedTimestamp(value: unknown, label: string): { value: string | null; error?: string } {
  if (value === undefined || value === null || value === "") return { value: null };
  if (typeof value !== "string" || value.length > 64 || !Number.isFinite(Date.parse(value))) return { value: null, error: `${label} must be a valid ISO timestamp.` };
  return { value: new Date(value).toISOString() };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function parseImageUploadInput(payload: unknown): { value?: ImageUploadInput; error?: string } {
  const body = objectValue(payload);
  if (!body) return { error: "Request body must be an object." };
  const greenhouseId = body.greenhouseId;
  const camera = nullableSegment(body.cameraId, "cameraId");
  const plant = nullableSegment(body.plantId, "plantId");
  const capturedAt = normalizedTimestamp(body.capturedAt, "capturedAt");
  if (!isImagePathSegment(greenhouseId)) return { error: "greenhouseId is invalid." };
  if (camera.error) return { error: camera.error };
  if (plant.error) return { error: plant.error };
  if (capturedAt.error) return { error: capturedAt.error };
  if (!isImageContentType(body.contentType)) return { error: "contentType must be image/jpeg, image/png, or image/webp." };
  if (!Number.isInteger(body.byteSize) || (body.byteSize as number) < 1 || (body.byteSize as number) > IMAGE_MAX_BYTES) return { error: "byteSize must be an integer from 1 byte through 10 MiB." };
  return { value: { greenhouseId, cameraId: camera.value, plantId: plant.value, capturedAt: capturedAt.value, contentType: body.contentType, byteSize: body.byteSize } };
}

export function buildImageObjectPath(input: ImageUploadInput, source: ImageSource, capturedAt: string, imageId = crypto.randomUUID()): string {
  const date = new Date(capturedAt);
  const camera = input.cameraId ?? "dashboard";
  return `${input.greenhouseId}/${source}/${camera}/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${imageId}.${extensionForContentType(input.contentType)}`;
}

export function isDetectionString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

export function parseDetectionBatch(payload: unknown): { value?: { greenhouseId: string; imageId: string; modelVersion: string; detectedAt: string; results: DetectionInput[] }; error?: string } {
  const body = objectValue(payload);
  if (!body) return { error: "Request body must be an object." };
  if (!isImagePathSegment(body.greenhouseId) || !isImageId(body.imageId) || !isDetectionString(body.modelVersion, 64)) return { error: "greenhouseId, imageId, and modelVersion are required." };
  const detectedAt = normalizedTimestamp(body.detectedAt, "detectedAt");
  if (detectedAt.error || !detectedAt.value) return { error: detectedAt.error ?? "detectedAt is required." };
  if (!Array.isArray(body.results) || body.results.length < 1 || body.results.length > 100) return { error: "results must contain between 1 and 100 detections." };
  const results: DetectionInput[] = [];
  for (const item of body.results) {
    const result = objectValue(item);
    if (!result || !isDetectionString(result.plantId) || !isDetectionString(result.classification) || !isDetectionString(result.severity, 32) || typeof result.confidence !== "number" || !Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 100) return { error: "Each detection must include valid plantId, classification, confidence from 0 to 100, and severity." };
    results.push({ plantId: result.plantId, classification: result.classification.trim(), confidence: result.confidence, severity: result.severity.trim() });
  }
  return { value: { greenhouseId: body.greenhouseId, imageId: body.imageId, modelVersion: body.modelVersion.trim(), detectedAt: detectedAt.value, results } };
}

export function retentionExpiresAt(uploadedAt: string): string {
  return new Date(Date.parse(uploadedAt) + IMAGE_RETENTION_MS).toISOString();
}
