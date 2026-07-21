import assert from "node:assert/strict";
import test from "node:test";

const workerUrl = process.env.SITES_WORKER_URL;
if (!workerUrl) {
  throw new Error("SITES_WORKER_URL must point to a local Wrangler worker");
}

function request(path, init) {
  return fetch(new URL(path, workerUrl), init);
}

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const response = await request("/", {
    headers: { accept: "text/html" },
  });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

test("protects telemetry and device-command APIs without an authenticated user", async () => {
  const sensors = await request("/api/sensors");
  assert.equal(sensors.status, 401);

  const command = await request("/api/device-commands", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "test-command-key",
    },
    body: JSON.stringify({
      greenhouseId: "GH-01",
      deviceId: "DEV-PUMP-01",
      command: "turn_on",
    }),
  });
  assert.equal(command.status, 401);
});

test("renders the shadcn greenhouse application shell", async () => {
  const response = await request("/", {
    headers: { accept: "text/html" },
  });
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /ศูนย์ปฏิบัติการ/);
  assert.match(html, /ย่อหรือเปิดเมนูหลัก/);
  assert.match(html, /โรงเรือนมะเขือเทศ/);
  assert.match(html, /กำลังโหลดข้อมูลโรงเรือน/);
  assert.doesNotMatch(html, /astryx-/i);
});
