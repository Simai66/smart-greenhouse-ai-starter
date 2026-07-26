import assert from "node:assert/strict";
import test from "node:test";
import { demoInitialState, greenhouseDemoStore } from "../lib/greenhouse-demo-store.ts";
import {
  buildDashboardSearchResults,
  createDemoCsv,
  executeConfirmedDemoDeviceCommand,
  setDemoAlertResolution,
  transitionDemoDevice,
  validateDemoSettings,
} from "../lib/dashboard-interactions.ts";

test("recovers from corrupt local demo storage", async () => {
  globalThis.window = {
    localStorage: { getItem: () => "{invalid", setItem: () => {} },
  } as unknown as Window & typeof globalThis;
  const result = await greenhouseDemoStore.load();
  assert.equal(result.recovered, true);
  assert.equal(result.state.devices.length, demoInitialState.devices.length);
});

test("upgrades a state created before sensor and zone bindings", async () => {
  const legacy = structuredClone(demoInitialState);
  delete (legacy as Partial<typeof legacy>).sensors;
  for (const device of legacy.devices) delete device.zoneId;
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.equal(result.recovered, false);
  assert.equal(result.state.sensors.length > 0, true);
  assert.equal(result.state.devices.every((device) => typeof device.zoneId === "string"), true);
});

test("binds legacy resources to the migrated custom greenhouse and its zone", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.greenhouses = [{
    id: "GH-CUSTOM",
    name: "โรงเรือนทดลอง",
    code: "TRIAL-01",
    status: "active",
    zones: [{ id: "ZONE-CUSTOM", name: "แปลงทดลอง", status: "active" }],
  }];
  delete (legacy as Partial<typeof legacy>).sensors;
  for (const device of legacy.devices) {
    delete device.greenhouseId;
    delete device.zoneId;
  }
  delete legacy.settings.cameras[0]!.greenhouseId;
  delete legacy.settings.cameras[0]!.zoneId;
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  const expectedBinding = { greenhouseId: "GH-CUSTOM", zoneId: "ZONE-CUSTOM" };
  assert.deepEqual(result.state.devices[0] && {
    greenhouseId: result.state.devices[0].greenhouseId,
    zoneId: result.state.devices[0].zoneId,
  }, expectedBinding);
  assert.deepEqual(result.state.settings.cameras[0] && {
    greenhouseId: result.state.settings.cameras[0].greenhouseId,
    zoneId: result.state.settings.cameras[0].zoneId,
  }, expectedBinding);
  assert.equal(result.state.sensors.every((sensor) => sensor.greenhouseId === "GH-CUSTOM" && sensor.zoneId === "ZONE-CUSTOM"), true);
});

test("normalizes malformed resource bindings without changing valid saved bindings", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.devices[0]!.greenhouseId = 42 as never;
  legacy.devices[0]!.zoneId = { stale: true } as never;
  legacy.settings.cameras[0]!.greenhouseId = "GH-01";
  legacy.settings.cameras[0]!.zoneId = "ZONE-B";
  legacy.settings.cameras[1]!.greenhouseId = "missing";
  legacy.settings.cameras[1]!.zoneId = "ZONE-A";
  legacy.settings.cameras[2]!.greenhouseId = [] as never;
  legacy.settings.cameras[2]!.zoneId = 7 as never;
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.deepEqual(result.state.devices[0] && {
    greenhouseId: result.state.devices[0].greenhouseId,
    zoneId: result.state.devices[0].zoneId,
  }, { greenhouseId: "GH-01", zoneId: "ZONE-A" });
  assert.deepEqual(result.state.settings.cameras[0] && {
    greenhouseId: result.state.settings.cameras[0].greenhouseId,
    zoneId: result.state.settings.cameras[0].zoneId,
  }, { greenhouseId: "GH-01", zoneId: "ZONE-B" });
  assert.deepEqual(result.state.settings.cameras.slice(1).map((camera) => ({
    greenhouseId: camera.greenhouseId,
    zoneId: camera.zoneId,
  })), [
    { greenhouseId: "GH-01", zoneId: "ZONE-A" },
    { greenhouseId: "GH-01", zoneId: "ZONE-A" },
  ]);
  assert.equal(result.state.settings.cameras[1]?.zone, "โซน A");
});

test("upgrades a legacy saved settings payload with multi-camera defaults", async () => {
  const legacy = structuredClone(demoInitialState);
  delete (legacy as Partial<typeof legacy>).greenhouses;
  delete (legacy as Partial<typeof legacy>).cropBatches;
  delete (legacy as Partial<typeof legacy>).sensors;
  delete (legacy.settings as Partial<typeof legacy.settings>).schedules;
  delete (legacy.settings as Partial<typeof legacy.settings>).notifications;
  delete (legacy.settings as Partial<typeof legacy.settings>).ai;
  delete (legacy.settings as Partial<typeof legacy.settings>).cameras;
  globalThis.window = {
    localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} },
  } as unknown as Window & typeof globalThis;
  const result = await greenhouseDemoStore.load();
  assert.equal(result.recovered, false);
  assert.equal(result.state.settings.cameras.length, 3);
  assert.equal(result.state.settings.ai.minConfidence, "75");
  assert.deepEqual(result.state.greenhouses, demoInitialState.greenhouses);
  assert.equal(result.state.cropBatches.length, 2);
  assert.equal(result.state.sensors.length, 3);
});

test("removes crop batches with stale greenhouse or cross-greenhouse zone bindings", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.greenhouses.push({
    id: "GH-02",
    name: "โรงเรือนที่สอง",
    code: "GREENHOUSE 02",
    status: "active",
    zones: [{ id: "ZONE-C", name: "โซน C", status: "active" }],
  });
  legacy.cropBatches.push(
    { id: "BATCH-VALID", greenhouseId: "GH-02", zoneId: "ZONE-C", cropName: "ผักสลัด", cultivar: "Green Oak", plantCount: 4, plantedAt: "2026-07-01", status: "active" },
    { id: "BATCH-STALE-GH", greenhouseId: "GH-MISSING", zoneId: "ZONE-C", cropName: "ผักสลัด", cultivar: "Green Oak", plantCount: 4, plantedAt: "2026-07-01", status: "active" },
    { id: "BATCH-CROSS-ZONE", greenhouseId: "GH-02", zoneId: "ZONE-A", cropName: "ผักสลัด", cultivar: "Green Oak", plantCount: 4, plantedAt: "2026-07-01", status: "active" },
  );
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.deepEqual(result.state.cropBatches.map((batch) => batch.id), ["BATCH-TOM-A", "BATCH-TOM-B", "BATCH-VALID"]);
  assert.deepEqual(result.state.cropBatches.at(-1), legacy.cropBatches.at(-3));
});

test("preserves intentionally empty camera and sensor collections", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.settings.cameras = [];
  legacy.sensors = [];
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.deepEqual(result.state.settings.cameras, []);
  assert.deepEqual(result.state.sensors, []);
});

test("preserves an intentionally empty device collection", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.devices = [];
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.equal(result.recovered, false);
  assert.deepEqual(result.state.devices, []);
});

test("preserves intentionally empty plant and alert collections", async () => {
  for (const [emptyPlants, emptyAlerts] of [[true, false], [false, true], [true, true]]) {
    const saved = structuredClone(demoInitialState);
    if (!emptyPlants) saved.plants.push({ id: "RECORDED", name: "ต้นทดสอบ", zone: "โซน A", age: "1 วัน", moisture: 50, health: "ปกติ", confidence: 90, greenhouseId: "GH-01", batchId: "BATCH-TOM-A" });
    if (!emptyAlerts) saved.alerts.push({ id: "ALERT", type: "info", title: "บันทึก", detail: "รายละเอียด", time: "ตอนนี้", resolved: false, greenhouseId: "GH-01" });
    if (emptyPlants) saved.plants = [];
    if (emptyAlerts) saved.alerts = [];
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved), setItem: () => {} } } as never;
    const result = await greenhouseDemoStore.load();
    assert.equal(result.recovered, false);
    assert.equal(result.state.plants.length, saved.plants.length);
    assert.equal(result.state.alerts.length, saved.alerts.length);
  }
});

test("preserves a valid greenhouse with no zones", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.greenhouses.push({ id: "GH-EMPTY", name: "โรงเรือนว่าง", code: "EMPTY-01", status: "active", zones: [] });
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.deepEqual(result.state.greenhouses.find((greenhouse) => greenhouse.id === "GH-EMPTY"), legacy.greenhouses.at(-1));
});

test("preserves an intentionally empty greenhouse collection without resurrecting default resources", async () => {
  const saved = structuredClone(demoInitialState);
  saved.greenhouses = [];
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();

  assert.equal(result.recovered, false);
  assert.deepEqual(result.state.greenhouses, []);
  assert.deepEqual(result.state.cropBatches, []);
  assert.deepEqual(result.state.devices, []);
  assert.deepEqual(result.state.plants, []);
  assert.deepEqual(result.state.alerts, []);
  assert.deepEqual(result.state.sensors, []);
  assert.deepEqual(result.state.settings.cameras, []);
});

test("preserves a custom camera display label when its saved binding is valid", async () => {
  const legacy = structuredClone(demoInitialState);
  legacy.settings.cameras[0]!.zone = "แปลงมะเขือเทศฝั่งเหนือ";
  legacy.settings.cameras[0]!.greenhouseId = "GH-01";
  legacy.settings.cameras[0]!.zoneId = "ZONE-A";
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(legacy), setItem: () => {} } } as never;

  const result = await greenhouseDemoStore.load();
  assert.equal(result.recovered, false);
  assert.equal(result.state.settings.cameras[0]?.zone, "แปลงมะเขือเทศฝั่งเหนือ");
});

test("ships an editable greenhouse structure with active zones", () => {
  const greenhouse = demoInitialState.greenhouses[0];
  assert.equal(greenhouse?.id, "GH-01");
  assert.equal(greenhouse?.status, "active");
  assert.deepEqual(greenhouse?.zones.map((zone) => zone.name), ["โซน A", "โซน B"]);
});

test("transitions device only after a confirmed result", () => {
  const next = transitionDemoDevice(demoInitialState, "pump", true);
  assert.equal(demoInitialState.devices[0].active, false);
  assert.equal(next.devices[0].active, true);
});

test("resolves and reopens an alert", () => {
  const state = { ...demoInitialState, alerts: [{ id: "recorded", type: "info" as const, title: "บันทึก", detail: "รายละเอียด", time: "ตอนนี้", resolved: false, greenhouseId: "GH-01" }] };
  const resolved = setDemoAlertResolution(state, "recorded", true);
  const reopened = setDemoAlertResolution(resolved, "recorded", false);
  assert.equal(resolved.alerts[0].resolved, true);
  assert.equal(reopened.alerts[0].resolved, false);
});

test("validates settings and selects search results", () => {
  assert.equal(validateDemoSettings({ ...demoInitialState.settings, minTemperature: "" }), "กรุณาระบุค่าเป้าหมายเป็นตัวเลขให้ครบถ้วน");
  assert.equal(validateDemoSettings({ ...demoInitialState.settings, minTemperature: "31" }), "อุณหภูมิต่ำสุดต้องน้อยกว่าอุณหภูมิสูงสุด");
  assert.equal(buildDashboardSearchResults(demoInitialState, "TOM-003")[0]?.plantId, "TOM-003");
  assert.equal(validateDemoSettings({ ...demoInitialState.settings, cameras: [] }), null);
});

test("creates an escaped CSV payload with configured resource labels", () => {
  const csv = createDemoCsv(demoInitialState, [["อุณหภูมิ", "28.5", "°C"]], "2026-07-18 07:42");
  assert.match(csv, /รายงาน Smart Greenhouse/);
  assert.match(csv, /ปั๊มน้ำ/);
  assert.match(csv, /โซน A/);
  assert.doesNotMatch(csv, /สาธิต|จำลอง|กำลังทำงาน|ปิด/);
});

test("labels search results from their saved resource details", () => {
  const results = buildDashboardSearchResults(demoInitialState, "โหมดอัตโนมัติ");
  assert.deepEqual(results[0] && {
    label: results[0].label,
    detail: results[0].detail,
    page: results[0].page,
  }, {
    label: "พัดลมระบายอากาศ",
    detail: "อุปกรณ์ · โหมดอัตโนมัติ · มากกว่า 30°C",
    page: "devices",
  });
  assert.doesNotMatch(results[0]?.detail ?? "", /สาธิต|จำลอง/);
});

test("exports honest placeholders for missing configured resources", () => {
  const emptyState = { ...demoInitialState, devices: [], alerts: [] };
  const csv = createDemoCsv(emptyState, [], "2026-07-18 07:42");
  assert.match(csv, /ไม่มีเซ็นเซอร์ที่กำหนดค่า/);
  assert.match(csv, /ไม่มีอุปกรณ์ที่กำหนดค่า/);
  assert.match(csv, /ไม่มีรายการแจ้งเตือน/);
});

test("escapes saved resource details in CSV output", () => {
  const state = structuredClone(demoInitialState);
  state.devices[0]!.detail = 'ตั้งค่า "กำหนดเอง"';
  const csv = createDemoCsv(state, [], "2026-07-18 07:42");
  assert.match(csv, /"ตั้งค่า ""กำหนดเอง"""/);
});

test("neutralizes spreadsheet formulas in CSV cells", () => {
  const state = structuredClone(demoInitialState);
  state.devices[0]!.name = " =SUM(1,1)";
  state.alerts.push({ id: "formula", type: "info", title: "บันทึก", detail: "@cmd", time: "ตอนนี้", resolved: false, greenhouseId: "GH-01" });
  const csv = createDemoCsv(state, [["+1+1", "28.5", "°C"]], "2026-07-18 07:42");
  assert.match(csv, /"' =SUM\(1,1\)"/);
  assert.match(csv, /"'@cmd"/);
  assert.match(csv, /"'\+1\+1"/);
});

test("scopes CSV zone names by greenhouse and zone id", () => {
  const state = structuredClone(demoInitialState);
  state.greenhouses.push({ id: "GH-02", name: "โรงเรือน 2", code: "GH-02", status: "active", zones: [{ id: "ZONE-A", name: "โซนอีกโรงเรือน", status: "active" }] });
  state.devices.push({ id: "device-gh-02", name: "ปั๊มโรงเรือน 2", detail: "ตั้งค่า", icon: "pump", active: false, greenhouseId: "GH-02", zoneId: "ZONE-A" });
  const csv = createDemoCsv(state, [], "2026-07-18 07:42");
  assert.match(csv, /"ปั๊มน้ำ","โซน A"/);
  assert.match(csv, /"ปั๊มโรงเรือน 2","โซนอีกโรงเรือน"/);
});

test("keeps device state unchanged until acknowledgement arrives", async () => {
  let resolveRequest:
    | ((result: {
        commandId: string;
        deviceId: string;
        command: "turn_on";
        state: "acknowledged";
        requestedAt: string;
        message: string;
      }) => void)
    | undefined;

  const pending = executeConfirmedDemoDeviceCommand(
    demoInitialState,
    "pump",
    true,
    async () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
  );

  assert.equal(demoInitialState.devices[0]?.active, false);
  resolveRequest?.({
    commandId: "test-command",
    deviceId: "pump",
    command: "turn_on",
    state: "acknowledged",
    requestedAt: "2026-07-21T09:42:00+07:00",
    message: "acknowledged",
  });

  const outcome = await pending;
  assert.equal(outcome.state.devices[0]?.active, true);
  assert.equal(outcome.result.state, "acknowledged");
});

test("does not mutate device state when acknowledgement fails", async () => {
  await assert.rejects(
    executeConfirmedDemoDeviceCommand(
      demoInitialState,
      "pump",
      true,
      async () => ({
        commandId: "failed-command",
        deviceId: "pump",
        command: "turn_on",
        state: "failed",
        requestedAt: "2026-07-21T09:42:00+07:00",
        message: "gateway unavailable",
      }),
    ),
    /gateway unavailable/,
  );
  assert.equal(demoInitialState.devices[0]?.active, false);
});
