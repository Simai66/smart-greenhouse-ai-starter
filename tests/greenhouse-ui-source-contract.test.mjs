import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps the approved accessible step-area chart contract", async () => {
  const source = await readFile(
    new URL(
      "../components/greenhouse/charts/soil-moisture-chart.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(source, /accessibilityLayer/);
  assert.match(source, /dataKey="soilMoisture"/);
  assert.match(source, /type="step"/);
  assert.match(source, /role="status"/);
  assert.match(source, /เป้าหมาย/);
  assert.match(source, /คำแนะนำ/);
});

test("keeps evidence, detail, and analytics contracts in the page views", async () => {
  const [plants, ai, analytics] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/plants-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/ai-detection-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/analytics-view.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(plants, /ค้นหาต้นพืช/);
  assert.match(plants, /useIsMobile/);
  assert.match(plants, /Sheet/);
  assert.match(plants, /aria-current/);
  assert.match(ai, /ความมั่นใจของโมเดล/);
  assert.match(ai, /ขั้นตอนถัดไป/);
  assert.match(analytics, /SoilMoistureChart/);
  assert.match(analytics, /เลือกช่วงเวลาของกราฟ/);
});

test("keeps safe controls and persisted operational page contracts", async () => {
  const [devices, alerts, settings] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/devices-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/alerts-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/settings-view.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(devices, /aria-describedby="device-demo-note"/);
  assert.match(devices, /pendingDeviceId/);
  assert.match(devices, /disabled=\{!online \|\| Boolean\(pendingDeviceId\)\}/);
  assert.match(alerts, /filterAlerts/);
  assert.match(alerts, /รับทราบ|ดำเนินการแล้ว/);
  assert.match(settings, /validateDemoSettings/);
  assert.match(settings, /ยกเลิกการแก้ไข/);
});

test("keeps reusable resource editing and deliberate deletion in settings", async () => {
  const settings = await readFile(
    new URL("../components/greenhouse/views/settings-view.tsx", import.meta.url),
    "utf8",
  );

  assert.match(settings, /ResourceEditorDialog/);
  assert.match(settings, /onDeleteResource/);
  assert.match(settings, /ลบทรัพยากร\?/);
});

test("keeps live status and decisions ahead of dashboard detail", async () => {
  const source = await readFile(
    new URL("../components/greenhouse/views/command-deck-view.tsx", import.meta.url),
    "utf8",
  );

  const liveIndex = source.indexOf("ระบบทำงานปกติ");
  const workIndex = source.indexOf("งานที่ต้องจัดการ");
  const chartIndex = source.lastIndexOf("SoilMoistureChart");
  assert.ok(liveIndex >= 0);
  assert.ok(workIndex > liveIndex);
  assert.ok(chartIndex > liveIndex);
  assert.match(source, /สถานะทรัพยากรสำคัญ/);
  assert.match(source, /ภาพสดจากกล้องจำลอง 01/);
});

test("keeps the hamburger sidebar, stale-state, and keyboard search contracts", async () => {
  const [sidebar, header, search, viewState, useMobile] = await Promise.all([
    readFile(new URL("../components/greenhouse/app-sidebar.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/site-header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/global-search.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/view-state.tsx", import.meta.url), "utf8"),
    readFile(new URL("../hooks/use-mobile.ts", import.meta.url), "utf8"),
  ]);
  assert.match(sidebar, /collapsible="icon"/);
  assert.match(sidebar, /setOpenMobile\(false\)/);
  assert.match(header, /SidebarTrigger/);
  assert.match(header, /เปิดการค้นหา/);
  assert.match(search, /role="combobox"/);
  assert.match(search, /ArrowDown/);
  assert.match(search, /aria-activedescendant/);
  assert.match(viewState, /ระบบออฟไลน์/);
  assert.match(viewState, /ข้อมูลอาจเก่า/);
  assert.match(viewState, /onRefresh/);
  assert.match(useMobile, /useState<boolean>\(false\)/);
  assert.match(useMobile, /setIsMobile\(mql\.matches\)/);
  assert.doesNotMatch(useMobile, /window\.innerWidth < MOBILE_BREAKPOINT/);
});
