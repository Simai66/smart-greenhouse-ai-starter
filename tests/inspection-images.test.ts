import assert from "node:assert/strict";
import test from "node:test";
import {
  buildImageObjectPath,
  IMAGE_MAX_BYTES,
  parseDetectionBatch,
  parseImageUploadInput,
  retentionExpiresAt,
} from "../lib/server/image-contract.ts";

test("validates supported image metadata and constructs scoped paths", () => {
  const parsed = parseImageUploadInput({ greenhouseId: "GH-01", cameraId: "CAM-A-01", plantId: "PLANT-01", capturedAt: "2026-08-15T10:00:00Z", contentType: "image/jpeg", byteSize: 245678 });
  assert.ok(parsed.value);
  const path = buildImageObjectPath(parsed.value, "pi", parsed.value.capturedAt!, "123e4567-e89b-12d3-a456-426614174000");
  assert.match(path, /^GH-01\/pi\/CAM-A-01\/2026\/08\/123e4567-e89b-12d3-a456-426614174000\.jpg$/);
  assert.equal(parseImageUploadInput({ greenhouseId: "GH-01", contentType: "image/gif", byteSize: 10 }).value, undefined);
  assert.equal(parseImageUploadInput({ greenhouseId: "GH-01", contentType: "image/jpeg", byteSize: IMAGE_MAX_BYTES + 1 }).value, undefined);
});

test("validates multi-detection batches and confidence bounds", () => {
  const parsed = parseDetectionBatch({ greenhouseId: "GH-01", imageId: "img_123e4567-e89b-12d3-a456-426614174000", modelVersion: "v1", detectedAt: "2026-08-15T10:00:10Z", results: [{ plantId: "PLANT-01", classification: "leaf_spot", confidence: 92.5, severity: "medium" }, { plantId: "PLANT-02", classification: "healthy", confidence: 98.1, severity: "none" }] });
  assert.equal(parsed.value?.results.length, 2);
  assert.equal(parseDetectionBatch({ greenhouseId: "GH-01", imageId: "img_123e4567-e89b-12d3-a456-426614174000", modelVersion: "v1", detectedAt: "2026-08-15T10:00:10Z", results: [{ plantId: "PLANT-01", classification: "bad", confidence: 100.1, severity: "high" }] }).value, undefined);
});

test("retention expiry is exactly fifteen days after upload", () => {
  assert.equal(retentionExpiresAt("2026-08-15T10:00:00.000Z"), "2026-08-30T10:00:00.000Z");
});
