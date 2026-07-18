import type { DeviceCommandAction, DeviceCommandResult } from "@/types/greenhouse";

export type DemoDevice = { id: string; name: string; detail: string; icon: "pump" | "fan" | "light" | "mist"; active: boolean };
export type DemoPlant = { id: string; name: string; zone: string; age: string; moisture: number; health: "ปกติ" | "ควรตรวจสอบ"; confidence: number };
export type DemoAlert = { id: string; type: "critical" | "warning" | "info"; title: string; detail: string; time: string; resolved: boolean };
export type DemoSettings = { minTemperature: string; maxTemperature: string; minHumidity: string; minSoilMoisture: string; automation: Record<string, boolean> };
export type DemoState = { version: 1; devices: DemoDevice[]; plants: DemoPlant[]; alerts: DemoAlert[]; settings: DemoSettings; aiReviewedPlantId?: string };
export type DemoLoadResult = { state: DemoState; recovered: boolean; storageAvailable: boolean };
export type DemoSaveResult = { persisted: boolean };

const STORAGE_KEY = "smart-greenhouse-dashboard-demo:v1";

export const demoInitialState: DemoState = {
  version: 1,
  devices: [
    { id: "pump", name: "ปั๊มน้ำ", detail: "รอบถัดไป 10:30 น.", icon: "pump", active: false },
    { id: "fan", name: "พัดลมระบายอากาศ", detail: "โหมดอัตโนมัติ · มากกว่า 30°C", icon: "fan", active: true },
    { id: "light", name: "ไฟปลูกพืช", detail: "รอบถัดไป 18:00 น.", icon: "light", active: false },
    { id: "mist", name: "เครื่องพ่นหมอก", detail: "โหมดอัตโนมัติ · ต่ำกว่า 60% RH", icon: "mist", active: true },
  ],
  plants: [
    { id: "TOM-001", name: "มะเขือเทศ 01", zone: "โซน A", age: "42 วัน", moisture: 46, health: "ปกติ", confidence: 98 },
    { id: "TOM-002", name: "มะเขือเทศ 02", zone: "โซน A", age: "42 วัน", moisture: 44, health: "ปกติ", confidence: 96 },
    { id: "TOM-003", name: "มะเขือเทศ 03", zone: "โซน B", age: "38 วัน", moisture: 39, health: "ควรตรวจสอบ", confidence: 78 },
    { id: "TOM-004", name: "มะเขือเทศ 04", zone: "โซน B", age: "38 วัน", moisture: 36, health: "ปกติ", confidence: 94 },
  ],
  alerts: [
    { id: "leaf-spot", type: "critical", title: "ควรตรวจใบของมะเขือเทศ 03", detail: "ผลวิเคราะห์ภาพพบลักษณะที่อาจเป็นใบจุด ความมั่นใจ 78%", time: "18 นาทีที่แล้ว", resolved: false },
    { id: "soil-moisture", type: "warning", title: "ความชื้นในดินของมะเขือเทศ 04 ลดลง", detail: "ค่าปัจจุบัน 36% ใกล้ค่าเริ่มรดน้ำอัตโนมัติที่ 35%", time: "5 นาทีที่แล้ว", resolved: false },
    { id: "ventilation", type: "info", title: "รอบระบายอากาศเสร็จสิ้น", detail: "อุณหภูมิในโซน A กลับสู่ช่วงเป้าหมายแล้ว", time: "42 นาทีที่แล้ว", resolved: true },
  ],
  settings: { minTemperature: "22", maxTemperature: "30", minHumidity: "60", minSoilMoisture: "35", automation: { water: true, fan: true, light: true, alert: true } },
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
      typeof state.aiReviewedPlantId === "string")
  );
}

function cloneInitial(): DemoState { return structuredClone(demoInitialState); }

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
        ? { state: parsed, recovered: false, storageAvailable: true }
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
