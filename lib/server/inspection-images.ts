import { and, desc, eq, inArray, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { detections, greenhouses, inspectionImages } from "@/db/schema";
import { apiError } from "@/lib/server/api-error";
import {
  buildImageObjectPath,
  IMAGE_MAX_BYTES,
  isImageContentType,
  isImageId,
  parseDetectionBatch,
  parseImageUploadInput,
  retentionExpiresAt,
  type DetectionInput,
  type ImageSource,
  type ImageStatus,
} from "@/lib/server/image-contract";
import { createSignedUploadUrl, inspectObject, publicObjectUrl, removeObjects, supabaseStorageBucket } from "@/lib/server/supabase-storage";

type ServiceResult<T> = { data: T } | { response: Response };

export type ImageActor =
  | { kind: "browser"; createdBy: string }
  | { kind: "agent"; agentId: string };

type ImageView = {
  imageId: string;
  greenhouseId: string;
  objectPath: string;
  publicUrl: string | null;
  source: string;
  cameraId: string | null;
  plantId: string | null;
  contentType: string;
  byteSize: number;
  capturedAt: string | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  status: ImageStatus;
  detectionCount: number;
  detections: Array<{
    id: string;
    plantId: string;
    classification: string;
    confidence: number;
    severity: string;
    modelVersion: string;
    detectedAt: string;
  }>;
};

function validString(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function imageId(value: unknown): value is string {
  return isImageId(value);
}

function imageStatus(value: string): ImageStatus {
  return ["pending", "ready", "failed", "expired"].includes(value) ? value as ImageStatus : "failed";
}

function expired(row: typeof inspectionImages.$inferSelect, now: string): boolean {
  return Boolean(row.expiresAt && row.expiresAt <= now);
}

function view(row: typeof inspectionImages.$inferSelect, related: typeof detections.$inferSelect[], now: string): ImageView {
  const isExpired = row.status === "expired" || expired(row, now);
  return {
    imageId: row.id,
    greenhouseId: row.greenhouseId,
    objectPath: row.objectPath,
    publicUrl: isExpired || row.status !== "ready" ? null : row.publicUrl,
    source: row.source,
    cameraId: row.cameraId,
    plantId: row.plantId,
    contentType: row.contentType,
    byteSize: row.byteSize,
    capturedAt: row.capturedAt,
    uploadedAt: row.uploadedAt,
    expiresAt: row.expiresAt,
    status: isExpired ? "expired" : imageStatus(row.status),
    detectionCount: related.length,
    detections: related.map((item) => ({
      id: item.id,
      plantId: item.plantId,
      classification: item.classification,
      confidence: Number(item.confidence),
      severity: item.severity,
      modelVersion: item.modelVersion,
      detectedAt: item.detectedAt,
    })),
  };
}

function responseFor(row: typeof inspectionImages.$inferSelect, now = new Date().toISOString()) {
  return view(row, [], now);
}

export async function createImageUpload(payload: unknown, source: ImageSource, actor: ImageActor): Promise<ServiceResult<Record<string, unknown>>> {
  const parsed = parseImageUploadInput(payload);
  if (!parsed.value) return { response: apiError("INVALID_IMAGE_REQUEST", parsed.error ?? "Invalid image upload request.", 400) };
  const input = parsed.value;
  const db = getDb();
  const greenhouse = await db.select({ id: greenhouses.id }).from(greenhouses).where(eq(greenhouses.id, input.greenhouseId)).limit(1).get();
  if (!greenhouse) return { response: apiError("GREENHOUSE_NOT_FOUND", "Greenhouse was not found.", 404) };
  const createdAt = new Date().toISOString();
  const capturedAt = input.capturedAt ?? createdAt;
  const objectPath = buildImageObjectPath(input, source, capturedAt);
  const bucket = supabaseStorageBucket();
  const signed = await createSignedUploadUrl(objectPath);
  const id = `img_${crypto.randomUUID()}`;
  await db.insert(inspectionImages).values({
    id,
    greenhouseId: input.greenhouseId,
    source,
    cameraId: input.cameraId,
    plantId: input.plantId,
    bucket,
    objectPath,
    publicUrl: publicObjectUrl(bucket, objectPath),
    contentType: input.contentType,
    byteSize: input.byteSize,
    capturedAt,
    uploadedAt: null,
    expiresAt: null,
    status: "pending",
    createdBy: actor.kind === "agent" ? `agent:${actor.agentId}` : actor.createdBy,
    createdAt,
    expiredAt: null,
  }).run();
  return { data: { imageId: id, greenhouseId: input.greenhouseId, objectPath, uploadUrl: signed.uploadUrl, uploadExpiresAt: signed.expiresAt, publicUrl: publicObjectUrl(bucket, objectPath), status: "pending" } };
}

export async function completeImageUpload(rawImageId: unknown, actor: ImageActor): Promise<ServiceResult<Record<string, unknown>>> {
  if (!imageId(rawImageId)) return { response: apiError("INVALID_IMAGE_ID", "imageId is invalid.", 400) };
  const id = rawImageId;
  const db = getDb();
  const row = await db.select().from(inspectionImages).where(eq(inspectionImages.id, id)).limit(1).get();
  if (!row) return { response: apiError("IMAGE_NOT_FOUND", "Image was not found.", 404) };
  if (actor.kind === "agent" && row.createdBy !== `agent:${actor.agentId}`) return { response: apiError("IMAGE_AGENT_MISMATCH", "Image was not created by this agent.", 403) };
  if (row.status === "expired") return { response: apiError("IMAGE_EXPIRED", "Image retention period has ended.", 409) };
  if (row.status === "failed") return { response: apiError("IMAGE_UPLOAD_FAILED", "Image upload has already failed.", 409) };
  if (row.status === "ready") return { data: responseFor(row) };

  const object = await inspectObject(row.objectPath);
  if (!object.exists) return { response: apiError("UPLOAD_NOT_FOUND", "Uploaded object was not found in Supabase Storage.", 409) };
  if (object.contentType && !isImageContentType(object.contentType.split(";")[0].trim())) return { response: apiError("INVALID_IMAGE_TYPE", "Uploaded object MIME type is not allowed.", 400) };
  if (object.byteSize !== null && object.byteSize > IMAGE_MAX_BYTES) return { response: apiError("IMAGE_TOO_LARGE", "Image must not exceed 10 MiB.", 400) };
  if (object.byteSize !== null && object.byteSize !== row.byteSize) return { response: apiError("IMAGE_METADATA_MISMATCH", "Uploaded object size does not match the declared byteSize.", 400) };
  const uploadedAt = new Date().toISOString();
  const expiresAt = retentionExpiresAt(uploadedAt);
  await db.update(inspectionImages).set({ status: "ready", uploadedAt, expiresAt, publicUrl: row.publicUrl ?? publicObjectUrl(row.bucket, row.objectPath) }).where(eq(inspectionImages.id, id)).run();
  const updated = await db.select().from(inspectionImages).where(eq(inspectionImages.id, id)).limit(1).get();
  return { data: responseFor(updated ?? { ...row, status: "ready", uploadedAt, expiresAt }) };
}

export async function listImages(greenhouseId: string, cameraId: string | null, limit: number): Promise<ImageView[]> {
  const db = getDb();
  const filters = [eq(inspectionImages.greenhouseId, greenhouseId)];
  if (cameraId) filters.push(eq(inspectionImages.cameraId, cameraId));
  const rows = await db.select().from(inspectionImages).where(and(...filters)).orderBy(desc(inspectionImages.createdAt)).limit(limit).all();
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const related = await db.select().from(detections).where(and(eq(detections.greenhouseId, greenhouseId), inArray(detections.imageId, ids))).all();
  const byImage = new Map<string, typeof related>();
  for (const item of related) {
    if (!item.imageId) continue;
    const current = byImage.get(item.imageId) ?? [];
    current.push(item);
    byImage.set(item.imageId, current);
  }
  const now = new Date().toISOString();
  return rows.map((row) => view(row, byImage.get(row.id) ?? [], now));
}

async function stableDetectionId(image: string, modelVersion: string, detectedAt: string, result: DetectionInput, index: number): Promise<string> {
  const raw = JSON.stringify([image, modelVersion, detectedAt, result, index]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return `det_${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export async function insertDetectionBatch(payload: unknown, agentId: string): Promise<ServiceResult<Record<string, unknown>>> {
  const parsed = parseDetectionBatch(payload);
  if (!parsed.value) return { response: apiError("INVALID_DETECTION_REQUEST", parsed.error ?? "Invalid detection request.", 400) };
  const input = parsed.value;
  const db = getDb();
  const image = await db.select().from(inspectionImages).where(eq(inspectionImages.id, input.imageId)).limit(1).get();
  if (!image) return { response: apiError("IMAGE_NOT_FOUND", "Image was not found.", 404) };
  if (image.greenhouseId !== input.greenhouseId) return { response: apiError("GREENHOUSE_MISMATCH", "Image does not belong to this greenhouse.", 403) };
  if (image.createdBy !== `agent:${agentId}`) return { response: apiError("IMAGE_AGENT_MISMATCH", "Image was not created by this agent.", 403) };
  if (!["ready", "expired"].includes(image.status)) return { response: apiError("IMAGE_NOT_READY", "Complete image upload before sending detections.", 409) };
  const values = await Promise.all(input.results.map(async (result, index) => ({
    id: await stableDetectionId(input.imageId, input.modelVersion, input.detectedAt, result, index),
    greenhouseId: input.greenhouseId,
    plantId: result.plantId,
    imageId: input.imageId,
    imageKey: image.objectPath,
    modelVersion: input.modelVersion,
    classification: result.classification,
    confidence: String(result.confidence),
    severity: result.severity,
    detectedAt: input.detectedAt,
  })));
  const ids = values.map((value) => value.id);
  const existing = await db.select({ id: detections.id }).from(detections).where(inArray(detections.id, ids)).all();
  const existingIds = new Set(existing.map((item) => item.id));
  const fresh = values.filter((value) => !existingIds.has(value.id));
  if (fresh.length) await db.insert(detections).values(fresh).onConflictDoNothing().run();
  const total = await db.select({ id: detections.id }).from(detections).where(eq(detections.imageId, input.imageId)).all();
  return { data: { imageId: input.imageId, insertedCount: fresh.length, detectionCount: total.length, idempotent: fresh.length === 0 } };
}

export async function runImageRetention(now = new Date()): Promise<{ expired: number; failed: number }> {
  const db = getDb();
  const nowIso = now.toISOString();
  const pendingCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const expiredRows = await db.select().from(inspectionImages).where(and(inArray(inspectionImages.status, ["ready"]), lte(inspectionImages.expiresAt, nowIso))).limit(1000).all();
  let expiredCount = 0;
  for (let index = 0; index < expiredRows.length; index += 1000) {
    const batch = expiredRows.slice(index, index + 1000);
    if (!batch.length) continue;
    await removeObjects(batch.map((row) => row.objectPath));
    await db.update(inspectionImages).set({ status: "expired", publicUrl: null, expiredAt: nowIso }).where(inArray(inspectionImages.id, batch.map((row) => row.id))).run();
    expiredCount += batch.length;
  }
  const pendingRows = await db.select().from(inspectionImages).where(and(eq(inspectionImages.status, "pending"), lte(inspectionImages.createdAt, pendingCutoff))).limit(1000).all();
  let failedCount = 0;
  for (let index = 0; index < pendingRows.length; index += 1000) {
    const batch = pendingRows.slice(index, index + 1000);
    if (!batch.length) continue;
    await removeObjects(batch.map((row) => row.objectPath));
    await db.update(inspectionImages).set({ status: "failed", publicUrl: null, expiredAt: nowIso }).where(inArray(inspectionImages.id, batch.map((row) => row.id))).run();
    failedCount += batch.length;
  }
  return { expired: expiredCount, failed: failedCount };
}

export function parseImageListQuery(request: Request): { greenhouseId?: string; cameraId: string | null; limit: number; response?: Response } {
  const params = new URL(request.url).searchParams;
  const greenhouseId = params.get("greenhouseId");
  const cameraId = params.get("cameraId");
  const rawLimit = params.get("limit");
  const limit = rawLimit === null ? 100 : Number(rawLimit);
  if (!greenhouseId || !validString(greenhouseId, 64)) return { cameraId, limit: 100, response: apiError("GREENHOUSE_REQUIRED", "greenhouseId is required.", 400) };
  if (cameraId !== null && !validString(cameraId, 64)) return { cameraId, limit: 100, response: apiError("INVALID_CAMERA_ID", "cameraId is invalid.", 400) };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return { greenhouseId, cameraId, limit: 100, response: apiError("INVALID_LIMIT", "limit must be an integer from 1 to 100.", 400) };
  return { greenhouseId, cameraId, limit };
}
