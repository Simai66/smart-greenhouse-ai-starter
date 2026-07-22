import type { DeviceCommandAction, DeviceCommandResult } from "@/types/greenhouse";

export type DemoDevice = { id: string; name: string; detail: string; icon: "pump" | "fan" | "light" | "mist"; active: boolean; greenhouseId?: string };
export type DemoPlant = { id: string; name: string; zone: string; age: string; moisture: number; health: "ปกติ" | "ควรตรวจสอบ"; confidence: number; greenhouseId?: string };
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
};
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
export type DemoState = { version: 1; devices: DemoDevice[]; plants: DemoPlant[]; alerts: DemoAlert[]; settings: DemoSettings; greenhouses: DemoGreenhouse[]; aiReviewedPlantId?: string; aiReviewedEvidence?: Record<string, string[]> };
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
  devices: [
    { id: "pump", name: "ปั๊มน้ำ", detail: "รอบถัดไป 10:30 น.", icon: "pump", active: false, greenhouseId: "GH-01" },
    { id: "fan", name: "พัดลมระบายอากาศ", detail: "โหมดอัตโนมัติ · มากกว่า 30°C", icon: "fan", active: true, greenhouseId: "GH-01" },
    { id: "light", name: "ไฟปลูกพืช", detail: "รอบถัดไป 18:00 น.", icon: "light", active: false, greenhouseId: "GH-01" },
    { id: "mist", name: "เครื่องพ่นหมอก", detail: "โหมดอัตโนมัติ · ต่ำกว่า 60% RH", icon: "mist", active: true, greenhouseId: "GH-01" },
  ],
  plants: [
    { id: "TOM-001", name: "มะเขือเทศ 01", zone: "โซน A", age: "42 วัน", moisture: 46, health: "ปกติ", confidence: 98, greenhouseId: "GH-01" },
    { id: "TOM-002", name: "มะเขือเทศ 02", zone: "โซน A", age: "42 วัน", moisture: 44, health: "ปกติ", confidence: 96, greenhouseId: "GH-01" },
    { id: "TOM-003", name: "มะเขือเทศ 03", zone: "โซน B", age: "38 วัน", moisture: 39, health: "ควรตรวจสอบ", confidence: 78, greenhouseId: "GH-01" },
    { id: "TOM-004", name: "มะเขือเทศ 04", zone: "โซน B", age: "38 วัน", moisture: 36, health: "ปกติ", confidence: 94, greenhouseId: "GH-01" },
  ],
  alerts: [
    { id: "leaf-spot", type: "critical", title: "ควรตรวจใบของมะเขือเทศ 03", detail: "ผลวิเคราะห์ภาพพบลักษณะที่อาจเป็นใบจุด ความมั่นใจ 78%", time: "18 นาทีที่แล้ว", resolved: false, greenhouseId: "GH-01" },
    { id: "soil-moisture", type: "warning", title: "ความชื้นในดินของมะเขือเทศ 04 ลดลง", detail: "ค่าปัจจุบัน 36% ใกล้ค่าเริ่มรดน้ำอัตโนมัติที่ 35%", time: "5 นาทีที่แล้ว", resolved: false, greenhouseId: "GH-01" },
    { id: "ventilation", type: "info", title: "รอบระบายอากาศเสร็จสิ้น", detail: "อุณหภูมิในโซน A กลับสู่ช่วงเป้าหมายแล้ว", time: "42 นาทีที่แล้ว", resolved: true, greenhouseId: "GH-01" },
  ],
  settings: {
    minTemperature: "22", maxTemperature: "30", minHumidity: "60", minSoilMoisture: "35",
    automation: { water: true, fan: true, light: true, alert: true },
    schedules: { wateringMinutes: "8", lightStart: "06:00", lightEnd: "18:00", fanDelayMinutes: "3" },
    notifications: { critical: true, dailySummary: true, quietStart: "21:00", quietEnd: "06:00" },
    ai: { minConfidence: "75", scanInterval: "30", retainDays: "14", detectLeafSpot: true, detectPests: true },
    cameras: [
      { id: "CAM-A-01", name: "กล้องโซน A · แปลงเหนือ", zone: "โซน A", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01" },
      { id: "CAM-B-01", name: "กล้องโซน B · แปลงใต้", zone: "โซน B", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01" },
      { id: "CAM-ENTRY-01", name: "กล้องทางเข้าโรงเรือน", zone: "ทางเข้า", source: "USB gateway", status: "offline", captureInterval: "30 นาที", enabled: false, greenhouseId: "GH-01" },
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
    typeof item.moisture === "number" &&
    ["ปกติ", "ควรตรวจสอบ"].includes(String(item.health)) &&
    typeof item.confidence === "number";
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
    state.devices.length > 0 &&
    state.devices.every(validDevice) &&
    Array.isArray(state.plants) &&
    state.plants.length > 0 &&
    state.plants.every(validPlant) &&
    Array.isArray(state.alerts) &&
    state.alerts.length > 0 &&
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
  const defaults = cloneInitial().settings;
  const defaultGreenhouses = cloneInitial().greenhouses;
  const saved = state.settings as Partial<DemoSettings>;
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    !!item && typeof item === "object";
  const savedGreenhouses = (state as Partial<DemoState>).greenhouses;
  const greenhouses = Array.isArray(savedGreenhouses) && savedGreenhouses.length > 0
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
  return {
    ...state,
    devices: state.devices.map((device) => ({ ...device, greenhouseId: device.greenhouseId ?? "GH-01" })),
    plants: state.plants.map((plant) => ({ ...plant, greenhouseId: plant.greenhouseId ?? "GH-01" })),
    alerts: state.alerts.map((alert) => ({ ...alert, greenhouseId: alert.greenhouseId ?? "GH-01" })),
    greenhouses: greenhouses.length > 0 ? greenhouses : defaultGreenhouses,
    aiReviewedEvidence: state.aiReviewedEvidence ?? {},
    settings: {
      ...defaults,
      ...saved,
      automation: { ...defaults.automation, ...saved.automation },
      schedules: { ...defaults.schedules, ...saved.schedules },
      notifications: { ...defaults.notifications, ...saved.notifications },
      ai: { ...defaults.ai, ...saved.ai },
      cameras: Array.isArray(saved.cameras) && saved.cameras.length > 0
        ? saved.cameras.filter((camera): camera is DemoCamera =>
          isRecord(camera) && typeof camera.id === "string" && typeof camera.name === "string" &&
          typeof camera.zone === "string" && ["IP camera", "USB gateway"].includes(String(camera.source)) &&
          ["online", "offline"].includes(String(camera.status)) && typeof camera.captureInterval === "string" &&
          typeof camera.enabled === "boolean",
        ).map((camera) => ({ ...camera, greenhouseId: camera.greenhouseId ?? "GH-01" }))
        : defaults.cameras,
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
