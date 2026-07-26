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
      .filter((device) =>
        `${device.name} ${device.id} ${device.detail}`
          .toLocaleLowerCase()
          .includes(query),
      )
      .map((device) => ({
        key: `device-${device.id}`,
        label: device.name,
        detail: `อุปกรณ์ · ${device.detail || "ไม่มีรายละเอียดที่บันทึก"}`,
        page: "devices" as const,
      })),
    ...state.alerts
      .filter((alert) =>
        `${alert.title} ${alert.detail}`.toLocaleLowerCase().includes(query),
      )
      .map((alert) => ({
        key: `alert-${alert.id}`,
        label: alert.title,
        detail: `การแจ้งเตือน · ${alert.resolved ? "ดำเนินการแล้ว" : "รอตรวจสอบ"}`,
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
  const positiveValues = [
    [settings.schedules.wateringMinutes, "ระยะเวลารดน้ำต้องมากกว่า 0 นาที"],
    [settings.ai.scanInterval, "รอบการวิเคราะห์ AI ต้องมากกว่า 0 นาที"],
    [settings.ai.retainDays, "ระยะเวลาเก็บหลักฐานต้องมากกว่า 0 วัน"],
  ] as const;
  for (const [value, message] of positiveValues) {
    if (!Number.isFinite(Number(value)) || Number(value) <= 0) return message;
  }
  if (!Number.isFinite(Number(settings.schedules.fanDelayMinutes)) || Number(settings.schedules.fanDelayMinutes) < 0) {
    return "เวลาหน่วงพัดลมต้องเป็น 0 นาทีหรือมากกว่า";
  }
  if (!Number.isFinite(Number(settings.ai.minConfidence)) || Number(settings.ai.minConfidence) < 0 || Number(settings.ai.minConfidence) > 100) {
    return "ความมั่นใจขั้นต่ำของ AI ต้องอยู่ระหว่าง 0–100%";
  }
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (![settings.schedules.lightStart, settings.schedules.lightEnd, settings.notifications.quietStart, settings.notifications.quietEnd].every((value) => timePattern.test(value))) {
    return "กรุณาระบุเวลาให้ถูกต้อง";
  }
  return null;
}

export function createDemoCsv(
  state: DemoState,
  sensorRows: ReadonlyArray<readonly [string, string, string]>,
  createdAt: string,
): string {
  const escapeCsvCell = (value: unknown) => {
    const cell = String(value);
    return /^\s*[=+\-@]/.test(cell) ? `'${cell}` : cell;
  };
  const zoneNames = new Map(
    state.greenhouses.flatMap((greenhouse) =>
      greenhouse.zones.map((zone) => [`${greenhouse.id}:${zone.id}`, zone.name] as const),
    ),
  );
  const normalizedSensorRows = sensorRows.length
    ? sensorRows
    : [["ไม่มีเซ็นเซอร์ที่กำหนดค่า", "—", "—"]] as const;
  const deviceRows = state.devices.length
    ? state.devices.map((device) => [
        device.name,
        device.greenhouseId && device.zoneId ? (zoneNames.get(`${device.greenhouseId}:${device.zoneId}`) ?? "ไม่พบโซนที่ผูกไว้") : "ยังไม่ได้ผูกโซน",
        device.detail || "ไม่มีรายละเอียดที่บันทึก",
      ])
    : [["ไม่มีอุปกรณ์ที่กำหนดค่า", "—", "—"]];
  const alertRows = state.alerts.length
    ? state.alerts.map((alert) => [
        alert.title,
        alert.resolved ? "ดำเนินการแล้ว" : "รอตรวจสอบ",
        alert.detail || "ไม่มีรายละเอียดที่บันทึก",
      ])
    : [["ไม่มีรายการแจ้งเตือน", "—", "—"]];
  const rows = [
    ["รายงาน Smart Greenhouse"],
    ["สร้างเมื่อ", createdAt],
    [],
    ["เซ็นเซอร์", "ค่า", "หน่วย"],
    ...normalizedSensorRows,
    [],
    ["อุปกรณ์", "โซน", "รายละเอียด"],
    ...deviceRows,
    [],
    ["การแจ้งเตือน", "สถานะ", "รายละเอียด"],
    ...alertRows,
  ];

  return rows
    .map((row) =>
      row.map((cell) => `"${escapeCsvCell(cell).replaceAll('"', '""')}"`).join(","),
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
