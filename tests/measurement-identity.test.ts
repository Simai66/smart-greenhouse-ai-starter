import assert from "node:assert/strict";
import test from "node:test";
import { isDeviceIdentity, isMeasurementPortKey, isPlantIdentity, measurementPointId, plantForSample, sensorChannelId, type AssignmentInterval } from "../lib/measurement-identity.ts";

test("builds stable point and channel IDs without plant identity", () => {
  assert.equal(measurementPointId("ESP32-01", "A"), "ESP32-01-A");
  assert.equal(sensorChannelId("ESP32-01", "A", "temperature"), "SEN-ESP32-01-A-TEMP");
  assert.equal(sensorChannelId("ESP32-01", "B", "humidity"), "SEN-ESP32-01-B-HUM");
  assert.notEqual(sensorChannelId("ESP32-01", "A", "temperature"), sensorChannelId("ESP32-01", "B", "temperature"));
});

test("validates board, plant, and point identities", () => {
  assert.equal(isDeviceIdentity("ESP32-01"), true);
  assert.equal(isDeviceIdentity("esp32-01"), false);
  assert.equal(isPlantIdentity("PLANT-01"), true);
  assert.equal(isPlantIdentity("plant 01"), false);
  assert.equal(isMeasurementPortKey("A"), true);
  assert.equal(isMeasurementPortKey("C"), false);
  assert.throws(() => measurementPointId("invalid id", "A"), /deviceId is invalid/);
  assert.throws(() => sensorChannelId("ESP32-01", "A", "ph"), /metric is invalid/);
});

test("attributes readings to half-open assignment intervals", () => {
  const intervals: AssignmentInterval[] = [
    { plantId: "PLANT-01", assignedAt: "2026-01-01T00:00:00.000Z", unassignedAt: "2026-02-01T00:00:00.000Z" },
    { plantId: "PLANT-02", assignedAt: "2026-02-01T00:00:00.000Z", unassignedAt: null },
  ];
  assert.equal(plantForSample(intervals, "2026-01-31T23:59:59.000Z"), "PLANT-01");
  assert.equal(plantForSample(intervals, "2026-02-01T00:00:00.000Z"), "PLANT-02");
  assert.equal(plantForSample(intervals, "2025-12-31T23:59:59.000Z"), null);
  assert.equal(plantForSample(intervals, "invalid"), null);
  assert.equal(plantForSample([...intervals, { plantId: "PLANT-03", assignedAt: "2026-02-01T00:00:00.000Z", unassignedAt: null }], "2026-02-01T00:00:00.000Z"), null);
});
