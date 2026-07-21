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
