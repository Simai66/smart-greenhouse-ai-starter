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
  assert.match(ai, /ยังไม่มีภาพที่บันทึก/);
  assert.match(ai, /ขั้นตอนถัดไป/);
  assert.doesNotMatch(ai, /CAM-A-01/);
  assert.match(analytics, /SoilMoistureChart/);
  assert.match(analytics, /เลือกช่วงเวลาของกราฟ/);
});

test("keeps safe controls and persisted operational page contracts", async () => {
  const [devices, alerts, settings] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/devices-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/alerts-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/settings-view.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(devices, /aria-describedby="device-command-note"/);
  assert.match(devices, /pendingDeviceId/);
  assert.match(devices, /disabled=\{Boolean\(pendingDeviceId\)\}/);
  assert.match(devices, /ยังไม่มีประวัติคำสั่งที่บันทึกไว้/);
  assert.doesNotMatch(devices, /\["07:42", "07:30", "07:00"\]/);
  assert.doesNotMatch(devices, /ข้อมูลตัวอย่าง/);
  assert.doesNotMatch(devices, /สุขภาพอุปกรณ์/);
  assert.match(alerts, /filterAlerts/);
  assert.match(alerts, /รับทราบ|ดำเนินการแล้ว/);
  assert.match(settings, /validateDemoSettings/);
  assert.match(settings, /ยกเลิกการแก้ไข/);
});

test("keeps reusable resource editing and deliberate deletion in settings", async () => {
  const [settings, app, editor] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/settings-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/greenhouse-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/settings/resource-editor-dialog.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(settings, /ResourceEditorDialog/);
  assert.match(settings, /onCreateResource: \(value: ResourceEditorValue\) => void/);
  assert.match(settings, /onCreateResource=\{onCreateResource\}/);
  assert.match(settings, /onUpdateResourceStatus=\{onUpdateResourceStatus\}/);
  assert.match(settings, /onUpdateResourceStatus\(editing\.kind, editing\.id, value\)/);
  assert.match(settings, /onDeleteResource=\{onDeleteResource\}/);
  assert.match(settings, /ลบทรัพยากร\?/);
  assert.match(settings, /hasUnsavedSettingsChanges/);
  assert.match(settings, /cameras: settings\.cameras/);
  assert.match(settings, /<ResourceList key=\{kind\}/);
  assert.match(editor, /ยังไม่มีโซนที่ใช้งานอยู่ กรุณาเพิ่มโซนก่อนผูกทรัพยากร/);
  assert.match(editor, /disabled=\{!canBind\}/);
  assert.doesNotMatch(settings, /pendingCreate|knownIds/);
  assert.match(settings, /onRenameZone/);
  assert.match(editor, /<Dialog open onOpenChange/);
  assert.doesNotMatch(editor, /useEffect/);
  assert.match(app, /onCreateResource=\{\(value\) => \{/);
  assert.match(app, /return createResource\(current,/);
  assert.match(app, /onUpdateResourceStatus=\{\(kind, id, \{ enabled, status \}\) => \{/);
  assert.match(app, /item\.greenhouseId === activeGreenhouse\.id/);
  assert.match(app, /item\.id === id && item\.greenhouseId === activeGreenhouse\.id \? \{ \.\.\.item, zoneId/);
  assert.match(app, /item\.id === id && item\.greenhouseId === activeGreenhouse\.id \? \{ \.\.\.item, name \}/);
  assert.match(app, /item\.id !== id \|\| item\.greenhouseId !== activeGreenhouse\.id/);
  assert.match(app, /active: enabled/);
  assert.match(app, /enabled, status: status === "online" \? "online" : "offline"/);
});

test("keeps zone edits and device status language truthful", async () => {
  const [farm, analytics, devices, app] = await Promise.all([
    readFile(new URL("../components/greenhouse/settings/farm-structure-section.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/analytics-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/devices-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/greenhouse-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(farm, /แก้ไขโซน/);
  assert.match(farm, /onRenameZone/);
  assert.match(analytics, /การตั้งค่าอุปกรณ์/);
  assert.match(analytics, /ไม่ใช่สถานะการทำงานจริง/);
  assert.doesNotMatch(analytics, />ทำงาน<|>หยุด</);
  assert.match(devices, /const selectedZone = zoneOptions\.some/);
  assert.match(app, /useState\(\(\) => demoInitialState\.greenhouses\.find/);
  assert.match(app, /greenhouse\.id !== id && greenhouse\.status === "active"/);
  assert.match(app, /changeGreenhouse\(state\.greenhouses\.find/);
  assert.match(app, /moisture: null/);
  assert.match(app, /health: "ยังไม่มีข้อมูล"/);
  assert.match(app, /renameZone\(current, \{ greenhouseId, zoneId, name \}\)/);
});

test("keeps permanent deletion confirmation and selected-greenhouse cleanup deliberate", async () => {
  const [farm, settings, app] = await Promise.all([
    readFile(new URL("../components/greenhouse/settings/farm-structure-section.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/settings-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/greenhouse-app.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(farm, /ลบถาวร/);
  assert.match(farm, /role="alert"/);
  assert.match(farm, /onPermanentlyDeleteGreenhouse/);
  assert.match(farm, /onPermanentlyDeleteZone/);
  assert.match(settings, /onPermanentlyDeleteGreenhouse/);
  assert.match(settings, /onPermanentlyDeleteZone/);
  assert.doesNotMatch(settings, /activeGreenhouseId\) \?\? greenhouses\[0\]/);
  assert.match(app, /permanentlyDeleteGreenhouse/);
  assert.match(app, /permanentlyDeleteZone/);
  assert.match(app, /setPendingDevice\(null\)/);
  assert.match(app, /setSearch\(""\)/);
  assert.match(app, /setSelectedPlantId\(""\)/);
  assert.match(app, /setSelectedAlert\(null\)/);
  assert.doesNotMatch(app, /\?\? state\.greenhouses\.find\(\(greenhouse\) => greenhouse\.status === "active"\)/);
});

test("keeps truthful configured status and decisions ahead of dashboard detail", async () => {
  const [source, app, ai] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/command-deck-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/greenhouse-app.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/ai-detection-view.tsx", import.meta.url), "utf8"),
  ]);

  const configuredIndex = source.indexOf("ตั้งค่าทรัพยากรแล้ว · รอข้อมูลบันทึก");
  const workIndex = source.indexOf("งานที่ต้องจัดการ");
  const noReadingsIndex = source.lastIndexOf("ยังไม่มีค่าความชื้นดินที่บันทึก");
  assert.ok(configuredIndex >= 0);
  assert.ok(workIndex > configuredIndex);
  assert.ok(noReadingsIndex > configuredIndex);
  assert.match(source, /ยังไม่มีเหตุการณ์หรือค่าที่บันทึกไว้/);
  assert.match(source, /ตั้งค่าให้เปิด/);
  assert.doesNotMatch(source, /อุปกรณ์ออนไลน์/);
  assert.doesNotMatch(source, /LIVE/);
  assert.match(source, /สถานะทรัพยากรสำคัญ/);
  assert.match(source, /context: GreenhouseContext/);
  assert.match(source, /const activeCamera = context\.cameras\.find/);
  assert.match(source, /activeCamera \? activeCamera\.name : "ยังไม่มีกล้องในโรงเรือนนี้"/);
  assert.doesNotMatch(source, /ภาพสดจากกล้องจำลอง 01/);
  assert.match(source, /ยังไม่มีเวลาซิงก์ที่บันทึก/);
  assert.doesNotMatch(source, /dashboard-device-demo-note|คำสั่งเดโม/);
  assert.match(app, /!activeGreenhouse && activePage !== "settings"/);
  assert.match(app, /ระบบจะไม่แสดงข้อมูลจากโรงเรือนอื่นแทน/);
  assert.match(app, /greenhouse\.id === activeGreenhouseId && greenhouse\.status === "active"/);
  assert.doesNotMatch(app, /\?\? state\.greenhouses\.find\(\(greenhouse\) => greenhouse\.status === "active"\)/);
  assert.doesNotMatch(app, /demoInitialState\.greenhouses\[0\]|07:42|ข้อมูลเดโม|เดโมตอบรับ|รายงาน CSV เดโม/);
  assert.doesNotMatch(ai, /ระบบเดโม/);
});

test("keeps analytics plant filtering compatible with the plant data model", async () => {
  const analytics = await readFile(
    new URL("../components/greenhouse/views/analytics-view.tsx", import.meta.url),
    "utf8",
  );

  assert.match(analytics, /context\.cropBatches\.find\(\(item\) => item\.id === plant\.batchId\)/);
  assert.match(analytics, /const selectedZoneId = zoneOptions\.some/);
  assert.match(analytics, /batch \? batch\.zoneId === selectedZone\.id : plant\.zone === selectedZone\.name/);
  assert.doesNotMatch(analytics, /plant\.zoneId/);
});

test("keeps unknown plants neutral and restoration validated", async () => {
  const [plants, commandDeck, app] = await Promise.all([
    readFile(new URL("../components/greenhouse/views/plants-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/views/command-deck-view.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/greenhouse/greenhouse-app.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(plants, /ยังไม่มีหลักฐานภาพของ/);
  assert.match(plants, /plant\.health === "ยังไม่มีข้อมูล"/);
  assert.doesNotMatch(plants, /ภาพล่าสุดของ/);
  assert.match(commandDeck, /plants\.some\(\(plant\) => plant\.confidence !== null\)/);
  assert.match(commandDeck, /viewModel\.hasPlantData \? `\$\{viewModel\.healthScore\}%` : "—"/);
  assert.match(app, /restoreCropBatch/);
  assert.match(app, /changeGreenhouse\(greenhouse\.id\)/);
  assert.match(app, /changeGreenhouse\(id\)/);
});

test("keeps the dashboard plant-health preview compact and warning-first", async () => {
  const source = await readFile(
    new URL("../components/greenhouse/views/command-deck-view.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /const previewPlants = \[\.\.\.plants\]\s*\.sort/);
  assert.match(source, /"ควรตรวจสอบ": 0/);
  assert.match(source, /"ยังไม่มีข้อมูล": 1/);
  assert.match(source, /"ปกติ": 2/);
  assert.match(source, /\.slice\(0, 4\)/);
  assert.match(source, /แสดง \$\{previewPlants\.length\} จาก \$\{plants\.length\} ต้น/);
  assert.match(source, /previewPlants\.map/);
  assert.match(source, /border-amber-200 bg-amber-50 text-amber-800/);
  assert.match(source, /border-emerald-200 bg-emerald-50 text-emerald-800/);
  assert.match(source, /border-slate-200 bg-slate-100 text-slate-700/);
  assert.doesNotMatch(source, /plants\.sort\(/);
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
