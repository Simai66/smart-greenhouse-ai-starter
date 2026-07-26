import type { DeviceCommandAction, DeviceCommandResult } from "@/types/greenhouse";

export type DemoDevice = { id: string; name: string; detail: string; icon: "pump" | "fan" | "light" | "mist"; active: boolean; greenhouseId?: string; zoneId?: string };
export type DemoPlant = { id: string; name: string; zone: string; age: string; moisture: number | null; health: "ปกติ" | "ควรตรวจสอบ" | "ยังไม่มีข้อมูล"; confidence: number | null; greenhouseId?: string; batchId?: string };
export type DemoAlert = { id: string; type: "critical" | "warning" | "info"; title: string; detail: string; time: string; resolved: boolean; greenhouseId?: string };
export type DemoCamera = {
  id: string;
  name: string;
  zone: string;
  source: "IP camera" | "USB gateway";
  status: "online" | "offline";
  captureInterval: string;
  enabled: boolean;
  greenhouseId?: string;
  zoneId?: string;
};
export type DemoSensor = { id: string; name: string; metric: "soilMoisture" | "temperature" | "humidity"; greenhouseId: string; zoneId: string; status: "online" | "offline" };
export type DemoZone = {
  id: string;
  name: string;
  status: "active" | "archived";
};
export type DemoGreenhouse = {
  id: string;
  name: string;
  code: string;
  status: "active" | "archived";
  zones: DemoZone[];
};
export type DemoCropBatch = {
  id: string;
  greenhouseId: string;
  zoneId: string;
  cropName: string;
  cultivar: string;
  plantCount: number;
  plantedAt: string;
  status: "active" | "harvested" | "archived";
};
export type DemoSettings = {
  minTemperature: string;
  maxTemperature: string;
  minHumidity: string;
  minSoilMoisture: string;
  automation: Record<string, boolean>;
  schedules: { wateringMinutes: string; lightStart: string; lightEnd: string; fanDelayMinutes: string };
  notifications: { critical: boolean; dailySummary: boolean; quietStart: string; quietEnd: string };
  ai: { minConfidence: string; scanInterval: string; retainDays: string; detectLeafSpot: boolean; detectPests: boolean };
  cameras: DemoCamera[];
};
export type DemoState = { version: 1; devices: DemoDevice[]; plants: DemoPlant[]; alerts: DemoAlert[]; sensors: DemoSensor[]; settings: DemoSettings; greenhouses: DemoGreenhouse[]; cropBatches: DemoCropBatch[]; aiReviewedPlantId?: string; aiReviewedEvidence?: Record<string, string[]> };
export type DemoLoadResult = { state: DemoState; recovered: boolean; storageAvailable: boolean };
export type DemoSaveResult = { persisted: boolean };

const STORAGE_KEY = "smart-greenhouse-dashboard-demo:v1";

export const demoInitialState: DemoState = {
  version: 1,
  greenhouses: [
    {
      id: "GH-01",
      name: "โรงเรือนมะเขือเทศ",
      code: "GREENHOUSE 01",
      status: "active",
      zones: [
        { id: "ZONE-A", name: "โซน A", status: "active" },
        { id: "ZONE-B", name: "โซน B", status: "active" },
      ],
    },
  ],
  cropBatches: [
    { id: "BATCH-TOM-A", greenhouseId: "GH-01", zoneId: "ZONE-A", cropName: "มะเขือเทศเชอร์รี", cultivar: "Sweet 100", plantCount: 2, plantedAt: "2026-06-10", status: "active" },
    { id: "BATCH-TOM-B", greenhouseId: "GH-01", zoneId: "ZONE-B", cropName: "มะเขือเทศเชอร์รี", cultivar: "Sweet 100", plantCount: 2, plantedAt: "2026-06-14", status: "active" },
  ],
  sensors: [
    { id: "SOIL-A-02", name: "เซ็นเซอร์ดิน A-02", metric: "soilMoisture", greenhouseId: "GH-01", zoneId: "ZONE-A", status: "online" },
    { id: "SOIL-B-02", name: "เซ็นเซอร์ดิน B-02", metric: "soilMoisture", greenhouseId: "GH-01", zoneId: "ZONE-B", status: "online" },
    { id: "CLIMATE-01", name: "เซ็นเซอร์สภาพอากาศ", metric: "temperature", greenhouseId: "GH-01", zoneId: "ZONE-A", status: "online" },
  ],
  devices: [
    { id: "pump", name: "ปั๊มน้ำ", detail: "รอบถัดไป 10:30 น.", icon: "pump", active: false, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    { id: "fan", name: "พัดลมระบายอากาศ", detail: "โหมดอัตโนมัติ · มากกว่า 30°C", icon: "fan", active: true, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    { id: "light", name: "ไฟปลูกพืช", detail: "รอบถัดไป 18:00 น.", icon: "light", active: false, greenhouseId: "GH-01", zoneId: "ZONE-B" },
    { id: "mist", name: "เครื่องพ่นหมอก", detail: "โหมดอัตโนมัติ · ต่ำกว่า 60% RH", icon: "mist", active: true, greenhouseId: "GH-01", zoneId: "ZONE-B" },
  ],
  plants: [
    { id: "TOM-001", name: "มะเขือเทศ 01", zone: "โซน A", age: "42 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TOM-A" },
    { id: "TOM-002", name: "มะเขือเทศ 02", zone: "โซน A", age: "42 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TOM-A" },
    { id: "TOM-003", name: "มะเขือเทศ 03", zone: "โซน B", age: "38 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TOM-B" },
    { id: "TOM-004", name: "มะเขือเทศ 04", zone: "โซน B", age: "38 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TOM-B" },
  ],
  alerts: [],
  settings: {
    minTemperature: "22", maxTemperature: "30", minHumidity: "60", minSoilMoisture: "35",
    automation: { water: true, fan: true, light: true, alert: true },
    schedules: { wateringMinutes: "8", lightStart: "06:00", lightEnd: "18:00", fanDelayMinutes: "3" },
    notifications: { critical: true, dailySummary: true, quietStart: "21:00", quietEnd: "06:00" },
    ai: { minConfidence: "75", scanInterval: "30", retainDays: "14", detectLeafSpot: true, detectPests: true },
    cameras: [
      { id: "CAM-A-01", name: "กล้องโซน A · แปลงเหนือ", zone: "โซน A", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01", zoneId: "ZONE-A" },
      { id: "CAM-B-01", name: "กล้องโซน B · แปลงใต้", zone: "โซน B", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01", zoneId: "ZONE-B" },
      { id: "CAM-ENTRY-01", name: "กล้องทางเข้าโรงเรือน", zone: "ทางเข้า", source: "USB gateway", status: "offline", captureInterval: "30 นาที", enabled: false, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    ],
  },
};

function isState(value: unknown): value is DemoState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<DemoState>;
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object";
  const validDevice = (item: unknown) =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.detail === "string" &&
    ["pump", "fan", "light", "mist"].includes(String(item.icon)) &&
    typeof item.active === "boolean";
  const validPlant = (item: unknown) =>
    isRecord(item) &&
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.zone === "string" &&
    typeof item.age === "string" &&
    (typeof item.moisture === "number" || item.moisture === null) &&
    ["ปกติ", "ควรตรวจสอบ", "ยังไม่มีข้อมูล"].includes(String(item.health)) &&
    (typeof item.confidence === "number" || item.confidence === null);
  const validAlert = (item: unknown) =>
    isRecord(item) &&
    typeof item.id === "string" &&
    ["critical", "warning", "info"].includes(String(item.type)) &&
    typeof item.title === "string" &&
    typeof item.detail === "string" &&
    typeof item.time === "string" &&
    typeof item.resolved === "boolean";
  const settings = state.settings;
  const validSettings =
    isRecord(settings) &&
    typeof settings.minTemperature === "string" &&
    typeof settings.maxTemperature === "string" &&
    typeof settings.minHumidity === "string" &&
    typeof settings.minSoilMoisture === "string" &&
    isRecord(settings.automation) &&
    ["water", "fan", "light", "alert"].every(
      (key) => typeof settings.automation[key] === "boolean",
    );

  return (
    state.version === 1 &&
    Array.isArray(state.devices) &&
    state.devices.every(validDevice) &&
    Array.isArray(state.plants) &&
    state.plants.every(validPlant) &&
    Array.isArray(state.alerts) &&
    state.alerts.every(validAlert) &&
    validSettings &&
    (state.aiReviewedPlantId === undefined ||
      typeof state.aiReviewedPlantId === "string") &&
    (state.aiReviewedEvidence === undefined ||
      (isRecord(state.aiReviewedEvidence) &&
        Object.values(state.aiReviewedEvidence).every(
          (cameraIds) => Array.isArray(cameraIds) && cameraIds.every((cameraId) => typeof cameraId === "string"),
        )))
  );
}

function cloneInitial(): DemoState { return structuredClone(demoInitialState); }

function upgradeState(state: DemoState): DemoState {
  const defaultState = cloneInitial();
  const defaults = defaultState.settings;
  const defaultGreenhouses = defaultState.greenhouses;
  const saved = state.settings as Partial<DemoSettings>;
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object";
  const savedGreenhouses = (state as Partial<DemoState>).greenhouses;
  const savedCropBatches = (state as Partial<DemoState>).cropBatches;
  const intentionallyEmptyGreenhouses = Array.isArray(savedGreenhouses) && savedGreenhouses.length === 0;
  const savedGreenhouseList = Array.isArray(savedGreenhouses) && savedGreenhouses.length > 0
    ? savedGreenhouses.filter((greenhouse): greenhouse is DemoGreenhouse =>
      isRecord(greenhouse) &&
      typeof greenhouse.id === "string" &&
      typeof greenhouse.name === "string" &&
      typeof greenhouse.code === "string" &&
      ["active", "archived"].includes(String(greenhouse.status)) &&
      Array.isArray(greenhouse.zones) &&
      greenhouse.zones.every((zone) =>
        isRecord(zone) &&
        typeof zone.id === "string" &&
        typeof zone.name === "string" &&
        ["active", "archived"].includes(String(zone.status)),
      ),
    )
    : defaultGreenhouses;
  const greenhouses = intentionallyEmptyGreenhouses
    ? []
    : savedGreenhouseList.length > 0
    ? savedGreenhouseList
    : defaultGreenhouses;
  const hasGreenhouses = greenhouses.length > 0;
  const primaryGreenhouse = greenhouses.find((greenhouse) => greenhouse.zones.length > 0)
    ?? defaultGreenhouses[0]!;
  const primaryZone = primaryGreenhouse.zones[0] ?? defaultGreenhouses[0]!.zones[0]!;
  const resolveBinding = (resource: { greenhouseId?: unknown; zoneId?: unknown }) => {
    const savedGreenhouse = typeof resource.greenhouseId === "string"
      ? greenhouses.find((candidate) => candidate.id === resource.greenhouseId)
      : undefined;
    const greenhouse = savedGreenhouse ?? primaryGreenhouse;
    const savedZone = typeof resource.zoneId === "string"
      ? greenhouse.zones.find((candidate) => candidate.id === resource.zoneId)
      : undefined;
    const zone = savedZone ?? greenhouse.zones[0] ?? primaryZone;
    return {
      greenhouseId: greenhouse.id,
      zoneId: zone.id,
      zoneName: zone.name,
      preserved: Boolean(savedGreenhouse && savedZone),
    };
  };
  const normalizeDevice = (device: DemoDevice): DemoDevice => {
    const binding = resolveBinding(device);
    return { ...device, greenhouseId: binding.greenhouseId, zoneId: binding.zoneId };
  };
  const normalizeCamera = (camera: DemoCamera): DemoCamera => {
    const binding = resolveBinding(camera);
    return {
      ...camera,
      greenhouseId: binding.greenhouseId,
      zoneId: binding.zoneId,
      zone: binding.preserved ? camera.zone : binding.zoneName,
    };
  };
  const normalizeSensor = (sensor: DemoSensor): DemoSensor => {
    const binding = resolveBinding(sensor);
    return { ...sensor, greenhouseId: binding.greenhouseId, zoneId: binding.zoneId };
  };
  const cropBatches = !hasGreenhouses
    ? []
    : Array.isArray(savedCropBatches)
    ? savedCropBatches.filter((batch): batch is DemoCropBatch => {
      if (
        !isRecord(batch) || typeof batch.id !== "string" || typeof batch.greenhouseId !== "string" ||
        typeof batch.zoneId !== "string" || typeof batch.cropName !== "string" || typeof batch.cultivar !== "string" ||
        typeof batch.plantCount !== "number" || typeof batch.plantedAt !== "string" ||
        !["active", "harvested", "archived"].includes(String(batch.status))
      ) return false;
      const greenhouse = greenhouses.find((candidate) => candidate.id === batch.greenhouseId);
      return greenhouse?.zones.some((zone) => zone.id === batch.zoneId) ?? false;
    })
    : defaultState.cropBatches;
  const validSensors = (items: unknown): items is DemoSensor[] =>
    Array.isArray(items) &&
    items.every((sensor) =>
      isRecord(sensor) &&
      typeof sensor.id === "string" &&
      typeof sensor.name === "string" &&
      typeof sensor.greenhouseId === "string" &&
      typeof sensor.zoneId === "string" &&
      ["soilMoisture", "temperature", "humidity"].includes(String(sensor.metric)) &&
      ["online", "offline"].includes(String(sensor.status)),
    );
  const isValidCameras = (items: unknown): items is DemoCamera[] =>
    Array.isArray(items) &&
    items.every((camera) =>
      isRecord(camera) && typeof camera.id === "string" && typeof camera.name === "string" &&
      typeof camera.zone === "string" && ["IP camera", "USB gateway"].includes(String(camera.source)) &&
      ["online", "offline"].includes(String(camera.status)) && typeof camera.captureInterval === "string" &&
      typeof camera.enabled === "boolean",
    );
  return {
    ...state,
    devices: hasGreenhouses ? state.devices.map(normalizeDevice) : [],
    plants: hasGreenhouses ? state.plants.map((plant) => ({
      ...plant,
      greenhouseId: typeof plant.greenhouseId === "string" && greenhouses.some((greenhouse) => greenhouse.id === plant.greenhouseId)
        ? plant.greenhouseId
        : primaryGreenhouse.id,
    })) : [],
    alerts: hasGreenhouses ? state.alerts.map((alert) => ({
      ...alert,
      greenhouseId: typeof alert.greenhouseId === "string" && greenhouses.some((greenhouse) => greenhouse.id === alert.greenhouseId)
        ? alert.greenhouseId
        : primaryGreenhouse.id,
    })) : [],
    greenhouses,
    cropBatches,
    sensors: hasGreenhouses ? (validSensors(state.sensors) ? state.sensors : defaultState.sensors).map(normalizeSensor) : [],
    aiReviewedEvidence: state.aiReviewedEvidence ?? {},
    settings: {
      ...defaults,
      ...saved,
      automation: { ...defaults.automation, ...saved.automation },
      schedules: { ...defaults.schedules, ...saved.schedules },
      notifications: { ...defaults.notifications, ...saved.notifications },
      ai: { ...defaults.ai, ...saved.ai },
      cameras: !hasGreenhouses
        ? []
        : isValidCameras(saved.cameras)
        ? saved.cameras.map(normalizeCamera)
        : defaults.cameras.map(normalizeCamera),
    },
  };
}

export const greenhouseDemoStore = {
  async load(): Promise<DemoLoadResult> {
    try {
      if (typeof window === "undefined") return { state: cloneInitial(), recovered: false, storageAvailable: false };
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { state: cloneInitial(), recovered: false, storageAvailable: true };
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return { state: cloneInitial(), recovered: true, storageAvailable: true };
      }
      return isState(parsed)
        ? { state: upgradeState(parsed), recovered: false, storageAvailable: true }
        : { state: cloneInitial(), recovered: true, storageAvailable: true };
    } catch {
      return { state: cloneInitial(), recovered: true, storageAvailable: false };
    }
  },
  async save(state: DemoState): Promise<DemoSaveResult> {
    try {
      if (typeof window === "undefined") return { persisted: false };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return { persisted: true };
    } catch {
      return { persisted: false };
    }
  },
  async requestDeviceCommand(deviceId: string, command: Extract<DeviceCommandAction, "turn_on" | "turn_off">): Promise<DeviceCommandResult> {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    const requestedAt = new Date().toISOString();
    return { commandId: `demo-${crypto.randomUUID()}`, deviceId, command, state: "acknowledged", requestedAt, message: "Demo acknowledgement only. No physical device command was sent." };
  },
};
