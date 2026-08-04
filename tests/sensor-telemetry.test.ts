import assert from "node:assert/strict";
import test from "node:test";
import {
  calibratedValue,
  deterministicReadingId,
  freshnessFor,
  isOutsideThreshold,
  validateSensorDefinition,
} from "../lib/server/sensor-telemetry.ts";

test("validates supported sensor definitions and rejects unsafe ranges", () => {
  assert.equal(validateSensorDefinition({ metric: "temperature", unit: "celsius", samplingIntervalSeconds: 30, calibrationScale: 1, calibrationOffset: 0, minThreshold: 18, maxThreshold: 35 }), null);
  assert.match(validateSensorDefinition({ metric: "temperature", unit: "lux", samplingIntervalSeconds: 30, calibrationScale: 1, calibrationOffset: 0, minThreshold: null, maxThreshold: null }) ?? "", /metric and unit/);
  assert.match(validateSensorDefinition({ metric: "humidity", unit: "percent", samplingIntervalSeconds: 0, calibrationScale: 1, calibrationOffset: 0, minThreshold: null, maxThreshold: null }) ?? "", /samplingIntervalSeconds/);
  assert.match(validateSensorDefinition({ metric: "light", unit: "lux", samplingIntervalSeconds: 30, calibrationScale: 1, calibrationOffset: 0, minThreshold: 80, maxThreshold: 20 }) ?? "", /cannot exceed/);
});

test("applies calibration and threshold lifecycle decisions deterministically", async () => {
  assert.equal(calibratedValue(10, { scale: 1.1, offset: -2 }), 9);
  assert.equal(isOutsideThreshold(17.9, { min: 18, max: 35 }), true);
  assert.equal(isOutsideThreshold(28, { min: 18, max: 35 }), false);
  assert.equal(isOutsideThreshold(36, { min: 18, max: 35 }), true);
  const first = await deterministicReadingId("agent|sensor|timestamp|value");
  assert.equal(first, await deterministicReadingId("agent|sensor|timestamp|value"));
  assert.notEqual(first, await deterministicReadingId("agent|sensor|timestamp|different"));
  assert.equal(freshnessFor(null, 30), "missing");
  assert.equal(freshnessFor(new Date(Date.now() - 31_000).toISOString(), 30), "fresh");
  assert.equal(freshnessFor(new Date(Date.now() - 91_000).toISOString(), 30), "stale");
});
