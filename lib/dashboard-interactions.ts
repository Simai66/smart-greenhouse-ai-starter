import type { DemoAlert, DemoDevice, DemoSettings, DemoState } from "./greenhouse-demo-store.ts";

export type SearchPage = "plants" | "devices" | "alerts";
export type DashboardSearchResult = {
  key: string;
  label: string;
  detail: string;
  page: SearchPage;
  plantId?: string;
  alertId?: string;
};

export function buildDashboardSearchResults(
  state: DemoState,
  search: string,
): DashboardSearchResult[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return [];

  return [
    ...state.plants
      .filter((plant) =>
        `${plant.name} ${plant.id} ${plant.zone}`
          .toLocaleLowerCase()
          .includes(query),
      )
      .map((plant) => ({
        key: `plant-${plant.id}`,
        label: plant.name,
        detail: `${plant.id} · ${plant.zone}`,
        page: "plants" as const,
        plantId: plant.id,
      })),
    ...state.devices
      .filter((device) => device.name.toLocaleLowerCase().includes(query))
      .map((device) => ({
        key: `device-${device.id}`,
        label: device.name,
        detail: "อุปกรณ์สาธิต",
        page: "devices" as const,
      })),
    ...state.alerts
      .filter((alert) =>
        `${alert.title} ${alert.detail}`.toLocaleLowerCase().includes(query),
      )
      .map((alert) => ({
        key: `alert-${alert.id}`,
        label: alert.title,
        detail: "การแจ้งเตือนสาธิต",
        page: "alerts" as const,
        alertId: alert.id,
      })),
  ].slice(0, 6);
}

export function transitionDemoDevice(
  state: DemoState,
  deviceId: string,
  active: boolean,
): DemoState {
  return {
    ...state,
    devices: state.devices.map((device) =>
      device.id === deviceId ? { ...device, active } : device,
    ),
  };
}

export function setDemoAlertResolution(
  state: DemoState,
  alertId: string,
  resolved: boolean,
): DemoState {
  return {
    ...state,
    alerts: state.alerts.map((alert) =>
      alert.id === alertId ? { ...alert, resolved } : alert,
    ),
  };
}

export function validateDemoSettings(settings: DemoSettings): string | null {
  const values = [
    settings.minTemperature,
    settings.maxTemperature,
    settings.minHumidity,
    settings.minSoilMoisture,
  ];
  if (values.some((value) => value.trim() === "" || !Number.isFinite(Number(value)))) {
    return "กรุณาระบุค่าเป้าหมายเป็นตัวเลขให้ครบถ้วน";
  }
  if (Number(settings.minTemperature) >= Number(settings.maxTemperature)) {
    return "อุณหภูมิต่ำสุดต้องน้อยกว่าอุณหภูมิสูงสุด";
  }
  return null;
}

export function createDemoCsv(
  state: DemoState,
  sensorRows: ReadonlyArray<readonly [string, string, string]>,
  createdAt: string,
): string {
  const rows = [
    ["รายงาน Smart Greenhouse (โหมดสาธิต)"],
    ["สร้างเมื่อ", createdAt],
    [],
    ["เซ็นเซอร์", "ค่า", "หน่วย"],
    ...sensorRows,
    [],
    ["อุปกรณ์", "สถานะ", "รายละเอียด"],
    ...state.devices.map((device) => [
      device.name,
      device.active ? "กำลังทำงาน (สาธิต)" : "ปิด (สาธิต)",
      device.detail,
    ]),
    [],
    ["การแจ้งเตือน", "สถานะ", "รายละเอียด"],
    ...state.alerts.map((alert) => [
      alert.title,
      alert.resolved ? "ดำเนินการแล้ว" : "ต้องตรวจสอบ",
      alert.detail,
    ]),
  ];

  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
}

export function getSimulatedDeviceCount(devices: DemoDevice[]): string {
  return `${devices.length}/${devices.length}`;
}

export function getAlertById(alerts: DemoAlert[], alertId: string) {
  return alerts.find((alert) => alert.id === alertId) ?? null;
}

import type {
  DeviceCommandAction,
  DeviceCommandResult,
} from "@/types/greenhouse";

export type DemoCommandRequester = (
  deviceId: string,
  command: Extract<DeviceCommandAction, "turn_on" | "turn_off">,
) => Promise<DeviceCommandResult>;

export type DemoDeviceCommandOutcome = {
  state: DemoState;
  result: DeviceCommandResult;
};

export async function executeConfirmedDemoDeviceCommand(
  state: DemoState,
  deviceId: string,
  nextActive: boolean,
  requester: DemoCommandRequester,
): Promise<DemoDeviceCommandOutcome> {
  const command = nextActive ? "turn_on" : "turn_off";
  const result = await requester(deviceId, command);
  if (result.state !== "acknowledged") {
    throw new Error(result.message || "อุปกรณ์ไม่ตอบรับคำสั่ง");
  }
  return {
    state: transitionDemoDevice(state, deviceId, nextActive),
    result,
  };
}
