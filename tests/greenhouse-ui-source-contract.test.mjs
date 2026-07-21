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
