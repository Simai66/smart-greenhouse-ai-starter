import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(path, mocks = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { exports, require: (id) => mocks[id] ?? require(id), crypto, Response, TextEncoder });
  return exports;
}

// Exercise the service against real SQLite constraints; only storage is faked.
test("image reservation survives retries, collisions, concurrent requests and lost responses", async () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec(`CREATE TABLE greenhouses (id TEXT PRIMARY KEY);
      INSERT INTO greenhouses VALUES ('GH-01');
      CREATE TABLE inspection_images (
        id TEXT PRIMARY KEY, greenhouse_id TEXT NOT NULL, source TEXT NOT NULL,
        camera_id TEXT, plant_id TEXT, bucket TEXT NOT NULL, object_path TEXT NOT NULL UNIQUE,
        public_url TEXT, content_type TEXT NOT NULL, byte_size INTEGER NOT NULL,
        captured_at TEXT, uploaded_at TEXT, expires_at TEXT, status TEXT NOT NULL,
        created_by TEXT NOT NULL, created_at TEXT NOT NULL, expired_at TEXT
      );
      CREATE TABLE detections (
        id TEXT PRIMARY KEY, greenhouse_id TEXT, plant_id TEXT, image_id TEXT,
        image_key TEXT, model_version TEXT, classification TEXT, confidence TEXT,
        severity TEXT, detected_at TEXT
      );`);
    const db = drizzle(async (sql, params, method) => {
      const stmt = sqlite.prepare(sql);
      if (method === "run") return { rows: stmt.run(...params) };
      stmt.setReturnArrays(true);
      return { rows: method === "get" ? stmt.get(...params) : stmt.all(...params) };
    });
    let signedCount = 0;
    let inspectedCount = 0;
    let failSigning = false;
    let agentRegistrationResponse = null;
    const service = load("../lib/server/inspection-images.ts", {
      "@/db": { getDb: () => db },
      "@/db/schema": load("../db/schema.ts"),
      "@/lib/server/api-error": load("../lib/server/api-error.ts"),
      "@/lib/server/agent-registry": { assertRegisteredAgent: async () => agentRegistrationResponse },
      "@/lib/greenhouse-scope": load("../lib/greenhouse-scope.ts", { "./server/api-error.ts": load("../lib/server/api-error.ts") }),
      "@/lib/server/image-contract": load("../lib/server/image-contract.ts"),
      "@/lib/server/supabase-storage": {
        supabaseStorageBucket: () => "images",
        publicObjectUrl: (bucket, path) => `https://storage.invalid/${bucket}/${path}`,
        createSignedUploadUrl: async (path) => {
          if (failSigning) throw new Error("Storage unavailable");
          return { uploadUrl: `https://storage.invalid/${path}?attempt=${++signedCount}`, expiresAt: "later" };
        },
        inspectObject: async () => { inspectedCount += 1; return { exists: true, contentType: "image/jpeg", byteSize: 100 }; },
      },
    });
    const { createImageUpload, insertDetectionBatch } = service;
    const actor = { kind: "agent", agentId: "pi-01" };
    const input = { imageId: `img_${crypto.randomUUID()}`, greenhouseId: "GH-01", cameraId: "CAM-A", capturedAt: "2026-09-25T00:00:00Z", contentType: "image/jpeg", byteSize: 100 };
    const reserve = (body = input, owner = actor) => createImageUpload(body, "pi", owner);
    const foreign = await reserve({ ...input, imageId: `img_${crypto.randomUUID()}`, greenhouseId: "GH-02" });
    assert.equal(foreign.response.status, 403);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM inspection_images").get().n, 0);
    assert.equal(signedCount, 0);
    const [first, retry] = await Promise.all([reserve(), reserve()]);
    assert.equal(first.data.imageId, input.imageId);
    assert.equal(first.data.objectPath, retry.data.objectPath);
    assert.notEqual(first.data.uploadUrl, retry.data.uploadUrl);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM inspection_images").get().n, 1);
    for (const change of [{ byteSize: 101 }, { cameraId: "CAM-B" }, { plantId: "PLANT-B" }, { contentType: "image/png" }, { capturedAt: "2026-09-24T00:00:00Z" }]) {
      assert.equal((await reserve({ ...input, ...change })).response.status, 409);
    }
    assert.equal((await reserve(input, { kind: "agent", agentId: "other" })).response.status, 409);
    assert.equal((await reserve({ ...input, imageId: "invalid" })).response.status, 400);
    assert.equal((await reserve({ ...input, byteSize: "100" })).response.status, 400);
    for (const status of ["ready", "expired", "failed"]) {
      sqlite.prepare("UPDATE inspection_images SET status = ? WHERE id = ?").run(status, input.imageId);
      const before = signedCount;
      const result = await reserve();
      if (status === "failed") assert.equal(result.response.status, 409);
      else {
        assert.equal(result.data.status, status);
        assert.equal(result.data.imageId, input.imageId);
        assert.equal(result.data.uploadUrl, undefined);
        const batch = { greenhouseId: input.greenhouseId, imageId: result.data.imageId, modelVersion: "v1", detectedAt: input.capturedAt, results: [{ plantId: "PLANT-01", classification: "healthy", confidence: 99, severity: "none" }] };
        await insertDetectionBatch(batch, actor.agentId);
        assert.equal((await insertDetectionBatch(batch, actor.agentId)).data.idempotent, true);
        assert.equal(sqlite.prepare("SELECT count(*) AS n FROM detections").get().n, 1);
      }
      assert.equal(signedCount, before);
    }
    const lost = { ...input, imageId: `img_${crypto.randomUUID()}`, capturedAt: undefined };
    failSigning = true;
    await assert.rejects(reserve(lost), /Storage unavailable/);
    failSigning = false;
    assert.equal((await reserve(lost)).data.imageId, lost.imageId);
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM inspection_images").get().n, 2);
    const foreignImageId = `img_${crypto.randomUUID()}`;
    sqlite.prepare("INSERT INTO inspection_images (id, greenhouse_id, source, camera_id, plant_id, bucket, object_path, public_url, content_type, byte_size, captured_at, uploaded_at, expires_at, status, created_by, created_at, expired_at) VALUES (?, 'GH-02', 'pi', 'CAM-A', NULL, 'images', 'GH-02/pi/CAM-A/object.jpg', NULL, 'image/jpeg', 100, ?, NULL, NULL, 'pending', 'agent:pi-01', ?, NULL)").run(foreignImageId, input.capturedAt, new Date().toISOString());
    const completion = await load("../lib/server/inspection-images.ts", {
      "@/db": { getDb: () => db },
      "@/db/schema": load("../db/schema.ts"),
      "@/lib/server/api-error": load("../lib/server/api-error.ts"),
      "@/lib/server/agent-registry": { assertRegisteredAgent: async () => null },
      "@/lib/greenhouse-scope": load("../lib/greenhouse-scope.ts", { "./server/api-error.ts": load("../lib/server/api-error.ts") }),
      "@/lib/server/image-contract": load("../lib/server/image-contract.ts"),
      "@/lib/server/supabase-storage": { inspectObject: async () => { inspectedCount += 1; return { exists: true }; } },
    }).completeImageUpload(foreignImageId, { kind: "agent", agentId: "pi-01" });
    assert.equal(completion.response.status, 403);
    assert.equal(inspectedCount, 0);
    const pilotImageId = `img_${crypto.randomUUID()}`;
    sqlite.prepare("INSERT INTO inspection_images (id, greenhouse_id, source, camera_id, plant_id, bucket, object_path, public_url, content_type, byte_size, captured_at, uploaded_at, expires_at, status, created_by, created_at, expired_at) VALUES (?, 'GH-01', 'pi', 'CAM-A', NULL, 'images', 'GH-01/pi/CAM-A/pilot.jpg', NULL, 'image/jpeg', 100, ?, NULL, NULL, 'pending', 'agent:pi-01', ?, NULL)").run(pilotImageId, input.capturedAt, new Date().toISOString());
    agentRegistrationResponse = Response.json({ error: "Agent is not registered." }, { status: 403 });
    const unregistered = await service.completeImageUpload(pilotImageId, { kind: "agent", agentId: "pi-01" });
    assert.equal(unregistered.response.status, 403);
    assert.equal(inspectedCount, 0);
    const { imageId: omitted, ...legacy } = input;
    assert.ok(omitted);
    assert.notEqual((await reserve(legacy)).data.imageId, (await reserve(legacy)).data.imageId);
  } finally {
    sqlite.close();
  }
});
