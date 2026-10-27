import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("browser greenhouse APIs apply GH-01 scope before live operations", () => {
  for (const path of [
    "app/api/sensors/route.ts",
    "app/api/plants/route.ts",
    "app/api/devices/[deviceId]/points/route.ts",
    "app/api/devices/[deviceId]/assignments/route.ts",
    "app/api/devices/[deviceId]/policy/route.ts",
    "app/api/device-commands/route.ts",
    "app/api/images/route.ts",
  ]) {
    assert.match(source(path), /authorizeGreenhouseScope/, path);
  }

  assert.match(source("app/api/sensors/[sensorId]/config/route.ts"), /PILOT_GREENHOUSE_ID/);
  assert.match(source("app/api/images/upload-url/route.ts"), /createImageUpload/);
  assert.match(source("app/api/images/complete/route.ts"), /completeImageUpload/);
  assert.match(source("lib/server/inspection-images.ts"), /authorizeGreenhouseScope\(input\.greenhouseId\)/);
  assert.match(source("lib/server/inspection-images.ts"), /authorizeGreenhouseScope\(row\.greenhouseId\)/);
});

test("signed agent greenhouse routes retain registration guard with pilot scope", () => {
  for (const path of [
    "app/api/agent/config/route.ts",
    "app/api/agent/telemetry/route.ts",
    "app/api/agent/heartbeat/route.ts",
    "app/api/agent/commands/route.ts",
    "app/api/agent/commands/[commandId]/ack/route.ts",
    "app/api/agent/detections/route.ts",
    "app/api/agent/images/upload-url/route.ts",
  ]) {
    assert.match(source(path), /assertRegisteredAgent/, path);
  }
  assert.match(source("lib/server/agent-registry.ts"), /authorizeGreenhouseScope\(greenhouseId\)/);
  assert.match(source("app/api/agent/images/complete/route.ts"), /completeImageUpload/);
  assert.match(source("lib/server/inspection-images.ts"), /assertRegisteredAgent\(actor\.agentId, row\.greenhouseId\)/);
});
