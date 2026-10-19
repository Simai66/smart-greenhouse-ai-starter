import assert from "node:assert/strict";
import test from "node:test";
import { demoTestState as demoInitialState } from "./fixtures/demo-state.ts";
import {
  buildDashboardViewModel,
  describeSoilMoistureTrend,
  filterAlerts,
  filterPlants,
  navigationItems,
  pageMetadata,
} from "../lib/greenhouse-presentation.ts";

test("publishes the seven approved pages in operational order", () => {
  assert.deepEqual(
    navigationItems.map((item) => item.id),
    ["dashboard", "plants", "ai", "devices", "analytics", "alerts", "settings"],
  );
  assert.equal(pageMetadata.dashboard.title, "ศูนย์ปฏิบัติการ");
});

test("ships configured plants without fabricated readings or alerts", () => {
  assert.equal(demoInitialState.plants.every((plant) => plant.moisture === null && plant.confidence === null && plant.health === "ยังไม่มีข้อมูล"), true);
  assert.deepEqual(demoInitialState.alerts, []);
  const view = buildDashboardViewModel(demoInitialState);
  assert.equal(view.healthScore, 0);
  assert.equal(view.hasPlantData, false);
  assert.equal(view.hasRecordedActivity, false);
  assert.equal(view.metrics.find((metric) => metric.id === "health")?.value, "—");
});

test("derives the command-deck summary from demo state", () => {
  const recorded = structuredClone(demoInitialState);
  recorded.plants[0] = { ...recorded.plants[0]!, moisture: 48, health: "ปกติ", confidence: 92 };
  recorded.alerts.push({ id: "leaf-spot", type: "critical", title: "ควรตรวจ", detail: "บันทึกจริง", time: "ตอนนี้", resolved: false, greenhouseId: "GH-01" });
  const view = buildDashboardViewModel(recorded);
  assert.equal(view.healthScore, 92);
  assert.equal(view.hasPlantData, true);
  assert.equal(view.activeDevices, 2);
  assert.equal(view.deviceCount, 4);
  assert.equal(view.openAlerts, 1);
  assert.equal(view.workItems.length, 1);
  assert.equal(view.workItems[0]?.severity, "critical");
  assert.equal(view.hasRecordedActivity, true);
  assert.equal(view.resourceRows.some((row) => row.id === "leaf-spot"), true);
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

test("uses neutral setup state instead of fabricated device activity without recorded events", () => {
  const configuredWithoutRecords = {
    ...structuredClone(demoInitialState),
    alerts: [],
  };
  const view = buildDashboardViewModel(configuredWithoutRecords);

  assert.equal(view.hasOperationalData, true);
  assert.equal(view.hasRecordedActivity, false);
  assert.equal(view.metrics.find((metric) => metric.id === "alerts")?.tone, "neutral");
  assert.equal(view.metrics.find((metric) => metric.id === "alerts")?.note, "ยังไม่มีเหตุการณ์ที่บันทึก");
  assert.deepEqual(view.resourceRows, []);
});

test("filters plants and alerts without mutating source state", () => {
  assert.deepEqual(
    filterPlants(demoInitialState.plants, "plant-003", "all").map((plant) => plant.id),
    ["PLANT-003"],
  );
  assert.equal(filterPlants(demoInitialState.plants, "", "ยังไม่มีข้อมูล").length, 4);
  assert.equal(filterAlerts(demoInitialState.alerts, "open").length, 0);
  assert.equal(filterAlerts(demoInitialState.alerts, "resolved").length, 0);
  assert.deepEqual(demoInitialState.alerts, []);
});

test("describes recorded soil-moisture data without requiring a demo series", () => {
  const points = [
    { timestamp: "2026-07-22T07:00:00+07:00", label: "07:00", value: 56 },
    { timestamp: "2026-07-22T08:00:00+07:00", label: "08:00", value: 48 },
  ];
  assert.equal(
    describeSoilMoistureTrend(points, 50),
    "ความชื้นดินลดลงเหลือ 48% ต่ำกว่าเป้าหมาย 2%",
  );
});
