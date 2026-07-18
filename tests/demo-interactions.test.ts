import assert from "node:assert/strict";
import test from "node:test";
import { demoInitialState, greenhouseDemoStore } from "../lib/greenhouse-demo-store.ts";
import {
  buildDashboardSearchResults,
  createDemoCsv,
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
