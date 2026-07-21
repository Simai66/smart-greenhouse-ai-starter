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

test("transitions device only after a confirmed result", () => {
  const next = transitionDemoDevice(demoInitialState, "pump", true);
  assert.equal(demoInitialState.devices[0].active, false);
  assert.equal(next.devices[0].active, true);
});

test("resolves and reopens an alert", () => {
  const resolved = setDemoAlertResolution(demoInitialState, "leaf-spot", true);
  const reopened = setDemoAlertResolution(resolved, "leaf-spot", false);
  assert.equal(resolved.alerts[0].resolved, true);
  assert.equal(reopened.alerts[0].resolved, false);
});

test("validates settings and selects search results", () => {
  assert.equal(validateDemoSettings({ ...demoInitialState.settings, minTemperature: "" }), "กรุณาระบุค่าเป้าหมายเป็นตัวเลขให้ครบถ้วน");
  assert.equal(validateDemoSettings({ ...demoInitialState.settings, minTemperature: "31" }), "อุณหภูมิต่ำสุดต้องน้อยกว่าอุณหภูมิสูงสุด");
  assert.equal(buildDashboardSearchResults(demoInitialState, "TOM-003")[0]?.plantId, "TOM-003");
});

test("creates an escaped, labeled demo CSV payload", () => {
  const csv = createDemoCsv(demoInitialState, [["อุณหภูมิ", "28.5", "°C"]], "2026-07-18 07:42");
  assert.match(csv, /โหมดสาธิต/);
  assert.match(csv, /ปั๊มน้ำ/);
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
