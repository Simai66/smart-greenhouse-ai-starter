import assert from "node:assert/strict";
import test from "node:test";
import {
  createResource,
  deleteResource,
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
