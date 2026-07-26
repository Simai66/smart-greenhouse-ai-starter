import assert from "node:assert/strict";
import test from "node:test";
import {
  createResource,
  deleteZone,
  deleteResource,
  permanentlyDeleteGreenhouse,
  permanentlyDeleteZone,
  renameZone,
  restoreCropBatch,
  selectDevicePresentation,
  selectGreenhouseContext,
  selectResourcesForGreenhouse,
  updateResource,
} from "../lib/greenhouse-domain.ts";
import { demoInitialState } from "../lib/greenhouse-demo-store.ts";

test("creates, updates, moves, and deletes a device", () => {
  const created = createResource(demoInitialState, {
    kind: "device", greenhouseId: "GH-01", zoneId: "ZONE-A",
    name: "ปั๊มน้ำแปลงเหนือ", deviceKind: "pump",
  });
  const id = created.devices.at(-1)!.id;
  const moved = updateResource(created, { kind: "device", id, name: "ปั๊มน้ำ A-01", zoneId: "ZONE-B" });
  const deleted = deleteResource(moved, { kind: "device", id });

  assert.equal(moved.devices.find((item) => item.id === id)?.zoneId, "ZONE-B");
  assert.equal(deleted.devices.some((item) => item.id === id), false);
  assert.equal(demoInitialState.devices.some((item) => item.id === id), false);
});

test("restores a crop batch only into an active greenhouse and zone", () => {
  const state = structuredClone(demoInitialState);
  state.cropBatches[0]!.status = "archived";
  const restored = restoreCropBatch(state, { id: state.cropBatches[0]!.id });
  assert.equal(restored.cropBatches[0]?.status, "active");

  const archivedZone = structuredClone(state);
  archivedZone.greenhouses[0]!.zones[0]!.status = "archived";
  assert.throws(() => restoreCropBatch(archivedZone, { id: archivedZone.cropBatches[0]!.id }), { message: /ต้องเรียกคืนโซน/ });
  assert.equal(archivedZone.cropBatches[0]?.status, "archived");

  const archivedGreenhouse = structuredClone(state);
  archivedGreenhouse.greenhouses[0]!.status = "archived";
  assert.throws(() => restoreCropBatch(archivedGreenhouse, { id: archivedGreenhouse.cropBatches[0]!.id }), { message: /ต้องเรียกคืนโรงเรือน/ });
  assert.equal(archivedGreenhouse.cropBatches[0]?.status, "archived");
});

test("keeps resource mutations scoped to their matching collection", () => {
  const created = createResource(demoInitialState, {
    kind: "camera", greenhouseId: "GH-01", zoneId: "ZONE-B", name: "กล้องใหม่",
  });
  const cameraId = created.settings.cameras.at(-1)!.id;
  const updated = updateResource(created, { kind: "camera", id: cameraId, enabled: false });
  const deleted = deleteResource(updated, { kind: "camera", id: cameraId });

  assert.equal(updated.settings.cameras.find((item) => item.id === cameraId)?.enabled, false);
  assert.equal(deleted.settings.cameras.some((item) => item.id === cameraId), false);
  assert.deepEqual(deleted.devices, demoInitialState.devices);
  assert.deepEqual(deleted.sensors, demoInitialState.sensors);
});

test("updates a camera's display zone when it moves", () => {
  const created = createResource(demoInitialState, {
    kind: "camera", greenhouseId: "GH-01", zoneId: "ZONE-A", name: "กล้องย้ายโซน",
  });
  const id = created.settings.cameras.at(-1)!.id;
  const moved = updateResource(created, { kind: "camera", id, zoneId: "ZONE-B" });
  const camera = moved.settings.cameras.find((item) => item.id === id);

  assert.equal(camera?.zoneId, "ZONE-B");
  assert.equal(camera?.zone, "โซน B");
});

test("selects devices, cameras, and sensors for one greenhouse", () => {
  const selected = selectResourcesForGreenhouse(demoInitialState, "GH-01");

  assert.equal(selected.devices.length, demoInitialState.devices.length);
  assert.equal(selected.cameras.length, demoInitialState.settings.cameras.length);
  assert.equal(selected.sensors.length, demoInitialState.sensors.length);
  assert.deepEqual(selectResourcesForGreenhouse(demoInitialState, "missing"), {
    devices: [], cameras: [], sensors: [],
  });
});

test("selects an isolated operational context without falling back to another greenhouse", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses.push({
    id: "GH-02",
    name: "โรงเรือนที่สอง",
    code: "GREENHOUSE 02",
    status: "active",
    zones: [{ id: "ZONE-C", name: "โซน C", status: "active" }],
  });
  state.devices.push({ id: "fan-gh-02", name: "พัดลมโซน C", detail: "ตั้งค่าใหม่", icon: "fan", active: false, greenhouseId: "GH-02", zoneId: "ZONE-C" });
  state.plants.push({ id: "PLANT-GH-02", name: "ผักกาด 01", zone: "โซน C", age: "7 วัน", moisture: 52, health: "ปกติ", confidence: 91, greenhouseId: "GH-02" });
  state.alerts.push({ id: "alert-gh-02", type: "info", title: "ข้อมูล GH-02", detail: "ทดสอบ", time: "เมื่อสักครู่", resolved: false, greenhouseId: "GH-02" });
  state.sensors.push({ id: "sensor-gh-02", name: "เซ็นเซอร์ C", metric: "humidity", greenhouseId: "GH-02", zoneId: "ZONE-C", status: "online" });
  state.settings.cameras.push({ id: "camera-gh-02", name: "กล้อง C", zone: "โซน C", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-02", zoneId: "ZONE-C" });
  state.cropBatches.push({ id: "batch-gh-02", greenhouseId: "GH-02", zoneId: "ZONE-C", cropName: "ผักกาด", cultivar: "Green", plantCount: 1, plantedAt: "2026-07-01", status: "active" });

  const context = selectGreenhouseContext(state, "GH-02");
  const missing = selectGreenhouseContext(state, "missing");

  assert.equal(context.greenhouse?.id, "GH-02");
  assert.deepEqual(context.devices.map((item) => item.id), ["fan-gh-02"]);
  assert.deepEqual(context.plants.map((item) => item.id), ["PLANT-GH-02"]);
  assert.deepEqual(context.alerts.map((item) => item.id), ["alert-gh-02"]);
  assert.deepEqual(context.sensors.map((item) => item.id), ["sensor-gh-02"]);
  assert.deepEqual(context.cameras.map((item) => item.id), ["camera-gh-02"]);
  assert.deepEqual(context.cropBatches.map((item) => item.id), ["batch-gh-02"]);
  assert.equal(missing.greenhouse, undefined);
  assert.deepEqual(missing.devices, []);
  assert.deepEqual(missing.plants, []);
  assert.deepEqual(missing.cropBatches, []);
});

test("builds complete device presentation for a custom device from its greenhouse context", () => {
  const state = structuredClone(demoInitialState);
  state.devices.push({ id: "DEVICE-001", name: "ปั๊มแปลงใหม่", detail: "ผูกกับ โซน B", icon: "pump", active: false, greenhouseId: "GH-01", zoneId: "ZONE-B" });
  const context = selectGreenhouseContext(state, "GH-01");
  const presentation = selectDevicePresentation(context.devices.at(-1)!, context);

  assert.equal(presentation.zoneName, "โซน B");
  assert.equal(presentation.zoneId, "ZONE-B");
  assert.ok(presentation.lastActive.length > 0);
  assert.ok(presentation.rule.length > 0);
  assert.ok(presentation.power.length > 0);
  assert.ok(presentation.health.length > 0);
});

test("refuses to archive a zone with an active crop batch without mutating state", () => {
  const before = structuredClone(demoInitialState);

  assert.throws(
    () => deleteZone(before, { greenhouseId: "GH-01", zoneId: "ZONE-A" }),
    { message: "ยังมีรอบปลูกที่ใช้งานอยู่ในโซนนี้" },
  );
  assert.deepEqual(before, demoInitialState);
});

test("archives an inactive batch zone without changing other greenhouse zones", () => {
  const state = structuredClone(demoInitialState);
  state.cropBatches = state.cropBatches.map((batch) =>
    batch.zoneId === "ZONE-A" ? { ...batch, status: "archived" } : batch,
  );
  state.greenhouses.push({
    id: "GH-02",
    name: "โรงเรือนที่สอง",
    code: "GREENHOUSE 02",
    status: "active",
    zones: [{ id: "ZONE-A", name: "โซน A", status: "active" }],
  });
  const before = structuredClone(state);

  const next = deleteZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-A" });

  assert.equal(next.greenhouses.find((greenhouse) => greenhouse.id === "GH-01")?.zones[0]?.status, "archived");
  assert.equal(next.greenhouses.find((greenhouse) => greenhouse.id === "GH-02")?.zones[0]?.status, "active");
  assert.deepEqual(state, before);
});

test("permanently deletes an empty zone without changing its greenhouse or other zones", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses[0]!.zones.push({ id: "ZONE-EMPTY", name: "โซนว่าง", status: "archived" });
  const before = structuredClone(state);

  const next = permanentlyDeleteZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-EMPTY" });

  assert.equal(next.greenhouses[0]!.zones.some((zone) => zone.id === "ZONE-EMPTY"), false);
  assert.equal(next.greenhouses[0]!.zones.length, before.greenhouses[0]!.zones.length - 1);
  assert.deepEqual(state, before);
});

test("refuses to permanently delete a zone with archived history without mutating state", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses[0]!.zones.push({ id: "ZONE-HISTORY", name: "โซนประวัติ", status: "archived" });
  state.cropBatches.push({
    id: "BATCH-HISTORY",
    greenhouseId: "GH-01",
    zoneId: "ZONE-HISTORY",
    cropName: "ผักสลัด",
    cultivar: "Green",
    plantCount: 1,
    plantedAt: "2026-01-01",
    status: "archived",
  });
  const before = structuredClone(state);

  assert.throws(
    () => permanentlyDeleteZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-HISTORY" }),
    { message: /รอบปลูก 1 รายการ/ },
  );
  assert.deepEqual(state, before);
});

test("permanently deletes an empty greenhouse without changing another greenhouse", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses.push({ id: "GH-EMPTY", name: "โรงเรือนว่าง", code: "EMPTY", status: "archived", zones: [] });
  const before = structuredClone(state);

  const next = permanentlyDeleteGreenhouse(state, { greenhouseId: "GH-EMPTY" });

  assert.equal(next.greenhouses.some((greenhouse) => greenhouse.id === "GH-EMPTY"), false);
  assert.equal(next.greenhouses.some((greenhouse) => greenhouse.id === "GH-01"), true);
  assert.deepEqual(state, before);
});

test("permanently deletes only the first duplicate matching zone", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses[0]!.zones.push(
    { id: "ZONE-DUPLICATE", name: "โซนซ้ำ 1", status: "archived" },
    { id: "ZONE-DUPLICATE", name: "โซนซ้ำ 2", status: "archived" },
  );

  const next = permanentlyDeleteZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-DUPLICATE" });

  assert.deepEqual(next.greenhouses[0]!.zones.filter((zone) => zone.id === "ZONE-DUPLICATE").map((zone) => zone.name), ["โซนซ้ำ 2"]);
});

test("permanently deletes only the first duplicate matching greenhouse", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses.push(
    { id: "GH-DUPLICATE", name: "โรงเรือนซ้ำ 1", code: "DUP-1", status: "archived", zones: [] },
    { id: "GH-DUPLICATE", name: "โรงเรือนซ้ำ 2", code: "DUP-2", status: "archived", zones: [] },
  );

  const next = permanentlyDeleteGreenhouse(state, { greenhouseId: "GH-DUPLICATE" });

  assert.deepEqual(next.greenhouses.filter((greenhouse) => greenhouse.id === "GH-DUPLICATE").map((greenhouse) => greenhouse.name), ["โรงเรือนซ้ำ 2"]);
});

const zoneDependencyCases = [
  ["plant", "พืช 1 ต้น", (state: typeof demoInitialState) => state.plants.push({ id: "PLANT-GUARD", name: "พืช guard", zone: "โซน guard", age: "1 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01" })],
  ["device", "อุปกรณ์ 1 รายการ", (state: typeof demoInitialState) => state.devices.push({ id: "DEVICE-GUARD", name: "อุปกรณ์ guard", detail: "", icon: "pump", active: false, greenhouseId: "GH-01", zoneId: "ZONE-GUARD" })],
  ["camera", "กล้อง 1 รายการ", (state: typeof demoInitialState) => state.settings.cameras.push({ id: "CAMERA-GUARD", name: "กล้อง guard", zone: "โซน guard", source: "IP camera", status: "offline", captureInterval: "15 นาที", enabled: false, greenhouseId: "GH-01", zoneId: "ZONE-GUARD" })],
  ["sensor", "เซ็นเซอร์ 1 รายการ", (state: typeof demoInitialState) => state.sensors.push({ id: "SENSOR-GUARD", name: "เซ็นเซอร์ guard", metric: "temperature", status: "offline", greenhouseId: "GH-01", zoneId: "ZONE-GUARD" })],
] as const;

for (const [kind, message, addDependency] of zoneDependencyCases) {
  test(`refuses to permanently delete a zone with a ${kind} dependency`, () => {
    const state = structuredClone(demoInitialState);
    state.greenhouses[0]!.zones.push({ id: "ZONE-GUARD", name: "โซน guard", status: "archived" });
    addDependency(state);
    const before = structuredClone(state);

    assert.throws(() => permanentlyDeleteZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-GUARD" }), { message: new RegExp(message) });
    assert.deepEqual(state, before);
  });
}

const greenhouseDependencyCases = [
  ["crop batch", "รอบปลูก 1 รายการ", (state: typeof demoInitialState) => state.cropBatches.push({ id: "BATCH-GUARD", greenhouseId: "GH-GUARD", zoneId: "ZONE-GUARD", cropName: "ผัก guard", cultivar: "Guard", plantCount: 1, plantedAt: "2026-01-01", status: "archived" })],
  ["plant", "พืช 1 ต้น", (state: typeof demoInitialState) => state.plants.push({ id: "PLANT-GUARD-GH", name: "พืช guard", zone: "โซน guard", age: "1 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-GUARD" })],
  ["device", "อุปกรณ์ 1 รายการ", (state: typeof demoInitialState) => state.devices.push({ id: "DEVICE-GUARD-GH", name: "อุปกรณ์ guard", detail: "", icon: "pump", active: false, greenhouseId: "GH-GUARD", zoneId: "ZONE-GUARD" })],
  ["camera", "กล้อง 1 รายการ", (state: typeof demoInitialState) => state.settings.cameras.push({ id: "CAMERA-GUARD-GH", name: "กล้อง guard", zone: "โซน guard", source: "IP camera", status: "offline", captureInterval: "15 นาที", enabled: false, greenhouseId: "GH-GUARD", zoneId: "ZONE-GUARD" })],
  ["sensor", "เซ็นเซอร์ 1 รายการ", (state: typeof demoInitialState) => state.sensors.push({ id: "SENSOR-GUARD-GH", name: "เซ็นเซอร์ guard", metric: "temperature", status: "offline", greenhouseId: "GH-GUARD", zoneId: "ZONE-GUARD" })],
  ["alert", "การแจ้งเตือน 1 รายการ", (state: typeof demoInitialState) => state.alerts.push({ id: "ALERT-GUARD", type: "info", title: "guard", detail: "guard", time: "ตอนนี้", resolved: true, greenhouseId: "GH-GUARD" })],
] as const;

for (const [kind, message, addDependency] of greenhouseDependencyCases) {
  test(`refuses to permanently delete a greenhouse with a ${kind} dependency`, () => {
    const state = structuredClone(demoInitialState);
    state.greenhouses.push({ id: "GH-GUARD", name: "โรงเรือน guard", code: "GUARD", status: "archived", zones: [] });
    addDependency(state);
    const before = structuredClone(state);

    assert.throws(() => permanentlyDeleteGreenhouse(state, { greenhouseId: "GH-GUARD" }), { message: new RegExp(message) });
    assert.deepEqual(state, before);
  });
}

test("refuses to permanently delete a greenhouse with archived zone history without mutating state", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses.push({
    id: "GH-HISTORY",
    name: "โรงเรือนประวัติ",
    code: "HISTORY",
    status: "archived",
    zones: [{ id: "ZONE-HISTORY", name: "โซนประวัติ", status: "archived" }],
  });
  const before = structuredClone(state);

  assert.throws(
    () => permanentlyDeleteGreenhouse(state, { greenhouseId: "GH-HISTORY" }),
    { message: /โซน 1 โซน/ },
  );
  assert.deepEqual(state, before);
});

test("renames legacy plants before permanent-delete guards without crossing greenhouse boundaries", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses = [
    { id: "GH-01", name: "โรงเรือนหนึ่ง", code: "ONE", status: "active", zones: [{ id: "ZONE-A", name: "โซนเดิม", status: "active" }] },
    { id: "GH-02", name: "โรงเรือนสอง", code: "TWO", status: "active", zones: [{ id: "ZONE-A", name: "โซนเดิม", status: "active" }] },
  ];
  state.cropBatches = [{ id: "MISSING", greenhouseId: "GH-02", zoneId: "ZONE-A", cropName: "ผักอีกโรงเรือน", cultivar: "Other", plantCount: 1, plantedAt: "2026-01-01", status: "archived" }];
  state.devices = [];
  state.settings.cameras = [];
  state.sensors = [];
  state.alerts = [];
  state.plants = [
    { id: "LEGACY-NO-BATCH", name: "ต้น legacy 1", zone: "โซนเดิม", age: "1 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01" },
    { id: "LEGACY-MISSING-BATCH", name: "ต้น legacy 2", zone: "โซนเดิม", age: "1 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "MISSING" },
    { id: "OTHER-GREENHOUSE", name: "ต้นอีกโรงเรือน", zone: "โซนเดิม", age: "1 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-02" },
  ];

  const renamed = renameZone(state, { greenhouseId: "GH-01", zoneId: "ZONE-A", name: "โซนใหม่" });
  const beforeDelete = structuredClone(renamed);

  assert.deepEqual(renamed.plants.map((plant) => plant.zone), ["โซนใหม่", "โซนใหม่", "โซนเดิม"]);
  assert.equal(renamed.greenhouses[1]!.zones[0]!.name, "โซนเดิม");
  assert.throws(
    () => permanentlyDeleteZone(renamed, { greenhouseId: "GH-01", zoneId: "ZONE-A" }),
    { message: /พืช 2 ต้น/ },
  );
  assert.deepEqual(renamed, beforeDelete);
});
