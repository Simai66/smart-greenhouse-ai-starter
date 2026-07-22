import assert from "node:assert/strict";
import test from "node:test";
import { demoInitialState } from "../lib/greenhouse-demo-store.ts";
import {
  buildDashboardViewModel,
  describeSoilMoistureTrend,
  filterAlerts,
  filterPlants,
  navigationItems,
  pageMetadata,
  soilMoistureSeries,
} from "../lib/greenhouse-presentation.ts";

test("publishes the seven approved pages in operational order", () => {
  assert.deepEqual(
    navigationItems.map((item) => item.id),
    ["dashboard", "plants", "ai", "devices", "analytics", "alerts", "settings"],
  );
  assert.equal(pageMetadata.dashboard.title, "ศูนย์ปฏิบัติการ");
});

test("derives the command-deck summary from demo state", () => {
  const view = buildDashboardViewModel(demoInitialState);
  assert.equal(view.healthScore, 92);
  assert.equal(view.activeDevices, 2);
  assert.equal(view.deviceCount, 4);
  assert.equal(view.openAlerts, 2);
  assert.equal(view.workItems.length, 2);
  assert.equal(view.workItems[0]?.severity, "critical");
  assert.equal(view.resourceRows.some((row) => row.id === "TOM-003"), true);
});

test("keeps dashboard metrics honest for a selected greenhouse with no operational data", () => {
  const emptyGreenhouseState = {
    ...structuredClone(demoInitialState),
    devices: [],
    plants: [],
    alerts: [],
    sensors: [],
    settings: { ...structuredClone(demoInitialState.settings), cameras: [] },
  };
  const view = buildDashboardViewModel(emptyGreenhouseState);

  assert.equal(view.hasOperationalData, false);
  assert.equal(view.metrics.find((metric) => metric.id === "temperature")?.value, "—");
  assert.equal(view.metrics.find((metric) => metric.id === "humidity")?.value, "—");
  assert.deepEqual(view.resourceRows, []);
});

test("filters plants and alerts without mutating source state", () => {
  assert.deepEqual(
    filterPlants(demoInitialState.plants, "tom-003", "all").map((plant) => plant.id),
    ["TOM-003"],
  );
  assert.equal(filterPlants(demoInitialState.plants, "", "ควรตรวจสอบ").length, 1);
  assert.equal(filterAlerts(demoInitialState.alerts, "open").length, 2);
  assert.equal(filterAlerts(demoInitialState.alerts, "resolved").length, 1);
  assert.equal(demoInitialState.alerts[0]?.resolved, false);
});

test("describes the approved sampled soil-moisture series", () => {
  const points = soilMoistureSeries["วันนี้"];
  assert.equal(points.at(-1)?.value, 46);
  assert.equal(
    describeSoilMoistureTrend(points, 50),
    "ความชื้นดินลดลงเหลือ 46% ต่ำกว่าเป้าหมาย 4%",
  );
});
