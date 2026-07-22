# Greenhouse Platform Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the configurable-farm experience around one stable local demo data model so every greenhouse, zone, crop batch, device, camera, and sensor has complete CRUD and every page shows only the selected greenhouse's data.

**Architecture:** The local demo store remains the single source of truth. Pure selectors and mutations in `lib/greenhouse-domain.ts` isolate data rules from UI, while Settings owns configuration and operational pages consume selected-greenhouse view models.

**Tech Stack:** React, TypeScript, Vinext, Tailwind CSS, shadcn/ui, Lucide, Node built-in test runner.

## Global Constraints

- Keep page IDs and routing unchanged.
- Use existing shadcn/ui controls for every interactive element.
- Do not send physical device, webcam, RTSP, or AI commands.
- Migrate valid legacy local-storage data; never reset it due to a new optional field.
- Test a mutation before adding its control.
- Confirm destructive actions and clear any selected/pending references.
- One independently working task per commit.

---

## Product structure

| Concept | Parent | Required behaviour |
| --- | --- | --- |
| Greenhouse | Farm | selectable context; archive/restore |
| Zone | Greenhouse | hosts resources and crop batches |
| Crop batch | Greenhouse + zone | default Plants view; manages plant count |
| Plant | Crop batch | AI and individual health drill-down |
| Resource | Greenhouse + zone | device, camera, or sensor with full CRUD |

The Plants page opens in zone/batch mode. Per-plant mode is a drill-down. A greenhouse without data must show setup guidance, never copied telemetry.

## File map

- Create: `lib/greenhouse-domain.ts` — pure selectors, validation, and mutations.
- Modify: `lib/greenhouse-demo-store.ts` — persisted types, fixtures, migration only.
- Modify: `lib/greenhouse-presentation.ts` — empty-safe operational view models.
- Modify: `components/greenhouse/greenhouse-app.tsx` — orchestration and notifications only.
- Create: `components/greenhouse/settings/resource-editor-dialog.tsx` — shared create/edit form.
- Create: `components/greenhouse/settings/resource-list.tsx` — complete CRUD list.
- Create: `components/greenhouse/settings/farm-structure-section.tsx` — greenhouse, zone, crop batch UI.
- Modify: `components/greenhouse/views/settings-view.tsx` — compose focused settings sections.
- Modify: `components/greenhouse/views/devices-view.tsx` — present normalized device data only.
- Modify: `components/greenhouse/views/plants-view.tsx` — zone/batch and individual modes.
- Modify: `components/greenhouse/views/command-deck-view.tsx`, `analytics-view.tsx` — context-correct setup states.
- Create: `tests/greenhouse-domain.test.ts`.
- Modify: `tests/demo-interactions.test.ts`, `tests/greenhouse-presentation.test.ts`.

## Subproject A: domain safety

### Task 1: Centralize resource selectors and CRUD

**Files:**
- Create: `lib/greenhouse-domain.ts`
- Create: `tests/greenhouse-domain.test.ts`

**Interfaces:**
- Produces `ResourceKind = "device" | "camera" | "sensor"`.
- Produces `createResource(state, input)`, `updateResource(state, input)`, `deleteResource(state, input)`, and `selectResourcesForGreenhouse(state, greenhouseId)`.

- [ ] **Step 1: Write the failing lifecycle test**

```ts
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/greenhouse-domain.test.ts`

Expected: FAIL because `greenhouse-domain.ts` does not exist.

- [ ] **Step 3: Implement the minimal domain interface**

```ts
export type ResourceKind = "device" | "camera" | "sensor";

export function selectResourcesForGreenhouse(state: DemoState, greenhouseId: string) {
  return {
    devices: state.devices.filter((item) => item.greenhouseId === greenhouseId),
    cameras: state.settings.cameras.filter((item) => item.greenhouseId === greenhouseId),
    sensors: state.sensors.filter((item) => item.greenhouseId === greenhouseId),
  };
}
```

Implement the three mutation functions immutably. Delete must change exactly one matching collection.

- [ ] **Step 4: Run focused and full tests**

Run: `node --experimental-strip-types --test tests/greenhouse-domain.test.ts && npm run test:unit`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/greenhouse-domain.ts tests/greenhouse-domain.test.ts
git commit -m "refactor: centralize greenhouse resource mutations"
```

### Task 2: Make store migrations complete and deterministic

**Files:**
- Modify: `lib/greenhouse-demo-store.ts`
- Modify: `tests/demo-interactions.test.ts`

**Interfaces:**
- Produces a loaded state where every resource has `greenhouseId` and `zoneId`, and `sensors` exists.

- [ ] **Step 1: Add a failing legacy migration test**

```ts
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
```

- [ ] **Step 2: Run it**

Run: `node --experimental-strip-types --test tests/demo-interactions.test.ts`

Expected: FAIL before migration is implemented.

- [ ] **Step 3: Normalize in one migration boundary**

```ts
devices: state.devices.map((device) => ({
  ...device,
  greenhouseId: device.greenhouseId ?? "GH-01",
  zoneId: device.zoneId ?? defaultZoneId,
})),
sensors: validSensors(state.sensors) ? state.sensors : defaultState.sensors,
```

- [ ] **Step 4: Verify**

Run: `npm run test:unit && npm run build`

Expected: PASS and `Build complete`.

- [ ] **Step 5: Commit**

```bash
git add lib/greenhouse-demo-store.ts tests/demo-interactions.test.ts
git commit -m "fix: migrate greenhouse resource bindings"
```

## Subproject B: complete configuration UI

### Task 3: Replace settings resource controls with a reusable editor

**Files:**
- Create: `components/greenhouse/settings/resource-editor-dialog.tsx`
- Create: `components/greenhouse/settings/resource-list.tsx`
- Modify: `components/greenhouse/views/settings-view.tsx`
- Modify: `tests/greenhouse-ui-source-contract.test.mjs`

**Interfaces:**
- Consumes the Task 1 mutations.
- Produces `ResourceEditorDialog` and `ResourceList`.

- [ ] **Step 1: Write the failing source contract**

```js
assert.match(settingsSource, /ResourceEditorDialog/);
assert.match(settingsSource, /onDeleteResource/);
assert.match(settingsSource, /ลบทรัพยากร\\?/);
```

- [ ] **Step 2: Run it**

Run: `node --test tests/greenhouse-ui-source-contract.test.mjs`

Expected: FAIL until focused components are wired.

- [ ] **Step 3: Implement a single shadcn dialog for create/edit**

```tsx
export function ResourceEditorDialog({
  open, resource, zones, onOpenChange, onSubmit,
}: {
  open: boolean;
  resource: EditableResource | null;
  zones: DemoZone[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: ResourceEditorInput) => void;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>...</Dialog>;
}
```

The form contains name, kind, zone, and enabled/status. Delete stays in a separate confirmation dialog.

- [ ] **Step 4: Verify**

Run: `node --test tests/greenhouse-ui-source-contract.test.mjs && npm run build`

Expected: PASS and `Build complete`.

- [ ] **Step 5: Commit**

```bash
git add components/greenhouse/settings components/greenhouse/views/settings-view.tsx tests/greenhouse-ui-source-contract.test.mjs
git commit -m "refactor: use reusable greenhouse resource editor"
```

### Task 4: Enforce farm lifecycle rules

**Files:**
- Modify: `lib/greenhouse-domain.ts`
- Create: `components/greenhouse/settings/farm-structure-section.tsx`
- Modify: `components/greenhouse/views/plants-view.tsx`
- Modify: `tests/greenhouse-domain.test.ts`

**Interfaces:**
- Produces `deleteZone(state, { greenhouseId, zoneId })`.

- [ ] **Step 1: Write the failing dependency test**

```ts
test("refuses to delete a zone containing an active crop batch", () => {
  assert.throws(
    () => deleteZone(demoInitialState, { greenhouseId: "GH-01", zoneId: "ZONE-A" }),
    /ยังมีรอบปลูกที่ใช้งานอยู่/,
  );
});
```

- [ ] **Step 2: Run it**

Run: `node --experimental-strip-types --test tests/greenhouse-domain.test.ts`

Expected: FAIL because `deleteZone` does not exist.

- [ ] **Step 3: Implement the guard**

```ts
const hasActiveBatch = state.cropBatches.some(
  (batch) => batch.zoneId === input.zoneId && batch.status === "active",
);
if (hasActiveBatch) throw new Error("ยังมีรอบปลูกที่ใช้งานอยู่ในโซนนี้");
```

Use archive/restore for historical records; permanently delete only an incorrect resource that has no dependent data.

- [ ] **Step 4: Verify**

Run: `npm run test:unit && npm run build`

Expected: PASS and `Build complete`.

- [ ] **Step 5: Commit**

```bash
git add lib/greenhouse-domain.ts components/greenhouse/settings/farm-structure-section.tsx components/greenhouse/views/plants-view.tsx tests/greenhouse-domain.test.ts
git commit -m "feat: enforce safe farm structure lifecycle"
```

## Subproject C: context-correct operations

### Task 5: Derive all operational context from the selected greenhouse

**Files:**
- Modify: `lib/greenhouse-domain.ts`
- Modify: `components/greenhouse/greenhouse-app.tsx`
- Modify: `components/greenhouse/views/devices-view.tsx`
- Modify: `tests/greenhouse-domain.test.ts`

**Interfaces:**
- Produces `selectGreenhouseContext(state, greenhouseId)` and `selectDevicePresentation(device)`.

- [ ] **Step 1: Write the failing isolation test**

```ts
test("selected greenhouse context excludes another greenhouse's resources", () => {
  const state = addSecondGreenhouseFixture(demoInitialState);
  const context = selectGreenhouseContext(state, "GH-02");
  assert.equal(context.devices.every((device) => device.greenhouseId === "GH-02"), true);
  assert.equal(context.plants.some((plant) => plant.greenhouseId === "GH-01"), false);
});
```

- [ ] **Step 2: Run it**

Run: `node --experimental-strip-types --test tests/greenhouse-domain.test.ts`

Expected: FAIL before the selector exists.

- [ ] **Step 3: Remove hard-coded device metadata**

```ts
export function selectDevicePresentation(device: DemoDevice) {
  return {
    lastActive: device.detail || "ยังไม่มีประวัติการทำงาน",
    rule: "ยังไม่ได้กำหนดกฎอัตโนมัติ",
    power: "ยังไม่มีข้อมูลพลังงาน",
    health: "รอตรวจสอบ",
  };
}
```

Delete the `deviceMeta[device.id]` record from `devices-view.tsx`. User-created devices must never need a hard-coded key.

- [ ] **Step 4: Verify**

Run: `node --experimental-strip-types --test tests/greenhouse-domain.test.ts && npm run build`

Expected: PASS and `Build complete`.

- [ ] **Step 5: Commit**

```bash
git add lib/greenhouse-domain.ts components/greenhouse/greenhouse-app.tsx components/greenhouse/views/devices-view.tsx tests/greenhouse-domain.test.ts
git commit -m "refactor: derive operations from greenhouse context"
```

### Task 6: Show truthful setup states on Dashboard, AI, and Analytics

**Files:**
- Modify: `lib/greenhouse-presentation.ts`
- Modify: `components/greenhouse/views/command-deck-view.tsx`
- Modify: `components/greenhouse/views/ai-detection-view.tsx`
- Modify: `components/greenhouse/views/analytics-view.tsx`
- Modify: `tests/greenhouse-presentation.test.ts`

**Interfaces:**
- Adds `hasOperationalData: boolean` and `setupAction: "add_zone" | "add_resource" | "add_crop_batch" | null` to `DashboardViewModel`.

- [ ] **Step 1: Write the failing empty-context test**

```ts
test("dashboard has setup state for a greenhouse without resources", () => {
  const model = buildDashboardViewModel({ ...demoInitialState, devices: [], plants: [], alerts: [] });
  assert.equal(model.hasOperationalData, false);
  assert.equal(model.metrics[0]?.value, "—");
});
```

- [ ] **Step 2: Run it**

Run: `node --experimental-strip-types --test tests/greenhouse-presentation.test.ts`

Expected: FAIL because `hasOperationalData` is absent.

- [ ] **Step 3: Implement setup-state rendering**

```tsx
if (!viewModel.hasOperationalData) {
  return <Card><CardContent>
    <h2>โรงเรือนนี้ยังไม่มีข้อมูลปฏิบัติการ</h2>
    <Button onClick={() => onNavigate("settings")}>ตั้งค่าโรงเรือน</Button>
  </CardContent></Card>;
}
```

Do not show copied camera images, fabricated charts, or alerts in an empty greenhouse.

- [ ] **Step 4: Verify**

Run: `npm run test:unit && npm run build && git diff --check`

Expected: all tests pass, `Build complete`, and no whitespace errors.

- [ ] **Step 5: Commit**

```bash
git add lib/greenhouse-presentation.ts components/greenhouse/views tests/greenhouse-presentation.test.ts
git commit -m "feat: show truthful greenhouse setup states"
```

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-22-greenhouse-platform-recovery.md`.

Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks.
2. **Inline Execution** — execute tasks in this session using executing-plans, with a checkpoint after each commit.
