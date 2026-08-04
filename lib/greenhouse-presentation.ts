import type {
  DemoAlert,
  DemoPlant,
  DemoState,
} from "./greenhouse-demo-store.ts";
import type { LiveSensor } from "./sensor-api";

export type GreenhousePageId =
  | "dashboard"
  | "plants"
  | "ai"
  | "devices"
  | "analytics"
  | "alerts"
  | "settings";

export type ChartPeriod = "วันนี้" | "7 วัน" | "30 วัน";
export type StatusTone = "healthy" | "warning" | "danger" | "neutral";
export type PlantFilter = "all" | DemoPlant["health"];
export type AlertFilter = "all" | "open" | "resolved";

export type PageMetadata = {
  title: string;
  description: string;
};

export type SoilMoisturePoint = {
  timestamp: string;
  label: string;
  value: number;
};

export type DashboardMetric = {
  id: "health" | "temperature" | "humidity" | "alerts";
  label: string;
  value: string;
  note: string;
  tone: StatusTone;
};

export type WorkItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  severity: DemoAlert["type"];
  targetPage: GreenhousePageId;
};

export type ResourceRow = {
  id: string;
  label: string;
  kind: "เหตุการณ์";
  status: string;
  tone: StatusTone;
  updated: string;
  targetPage: GreenhousePageId;
};

export type DashboardViewModel = {
  hasOperationalData: boolean;
  hasRecordedActivity: boolean;
  hasPlantData: boolean;
  healthScore: number;
  activeDevices: number;
  deviceCount: number;
  openAlerts: number;
  metrics: DashboardMetric[];
  workItems: WorkItem[];
  resourceRows: ResourceRow[];
};

export const navigationItems = [
  { id: "dashboard", label: "ศูนย์ปฏิบัติการ", icon: "dashboard" },
  { id: "plants", label: "ข้อมูลพืช", icon: "plants" },
  { id: "ai", label: "การตรวจจับ AI", icon: "ai" },
  { id: "devices", label: "อุปกรณ์", icon: "devices" },
  { id: "analytics", label: "การวิเคราะห์", icon: "analytics" },
  { id: "alerts", label: "การแจ้งเตือน", icon: "alerts" },
  { id: "settings", label: "ตั้งค่า", icon: "settings" },
] as const satisfies ReadonlyArray<{
  id: GreenhousePageId;
  label: string;
  icon: string;
}>;

export const pageMetadata: Record<GreenhousePageId, PageMetadata> = {
  dashboard: {
    title: "ศูนย์ปฏิบัติการ",
    description: "สถานะสด งานสำคัญ และหลักฐานที่ต้องใช้ตัดสินใจ",
  },
  plants: {
    title: "ข้อมูลพืช",
    description: "ค้นหา กรอง และตรวจสุขภาพมะเขือเทศแต่ละต้น",
  },
  ai: {
    title: "การตรวจจับ AI",
    description: "ตรวจหลักฐาน ความมั่นใจ และขั้นตอนถัดไป",
  },
  devices: {
    title: "อุปกรณ์",
    description: "ติดตามสถานะและส่งคำสั่งอย่างปลอดภัย",
  },
  analytics: {
    title: "การวิเคราะห์",
    description: "เปรียบเทียบแนวโน้มเซ็นเซอร์และเหตุการณ์",
  },
  alerts: {
    title: "การแจ้งเตือน",
    description: "จัดลำดับ รับทราบ และติดตามเหตุการณ์",
  },
  settings: {
    title: "ตั้งค่า",
    description: "กำหนดเกณฑ์ การทำงานอัตโนมัติ และการแจ้งเตือน",
  },
};

export function buildDashboardViewModel(
  state: DemoState,
  liveSensors: LiveSensor[] = [],
): DashboardViewModel {
  const recordedPlants = state.plants.filter((plant) => plant.confidence !== null);
  const hasPlantData = recordedPlants.length > 0;
  const liveTemperature = liveSensors.find((sensor) => sensor.metric === "temperature");
  const liveHumidity = liveSensors.find((sensor) => sensor.metric === "humidity");
  const hasTemperatureSensor = state.sensors.some((sensor) => sensor.metric === "temperature" && sensor.status === "online") || Boolean(liveTemperature);
  const hasHumiditySensor = state.sensors.some((sensor) => sensor.metric === "humidity" && sensor.status === "online") || Boolean(liveHumidity);
  const healthScore = hasPlantData
    ? Math.round(recordedPlants.reduce((total, plant) => total + (plant.confidence ?? 0), 0) / recordedPlants.length)
    : 0;
  const activeDevices = state.devices.filter((device) => device.active).length;
  const openAlerts = state.alerts.filter((alert) => !alert.resolved);
  const hasRecordedActivity = state.alerts.length > 0;

  return {
    hasOperationalData: Boolean(state.devices.length || state.sensors.length || state.plants.length || state.settings.cameras.length || liveSensors.length),
    hasRecordedActivity,
    hasPlantData,
    healthScore,
    activeDevices,
    deviceCount: state.devices.length,
    openAlerts: openAlerts.length,
    metrics: [
      {
        id: "health",
        label: "สุขภาพพืช",
        value: hasPlantData ? String(healthScore) + "%" : "—",
        note: hasPlantData ? "ค่าเฉลี่ยความมั่นใจล่าสุด" : "ยังไม่มีข้อมูลพืช",
        tone: hasPlantData ? (healthScore >= 85 ? "healthy" : "warning") : "neutral",
      },
      {
        id: "temperature",
        label: "อุณหภูมิ",
        value: liveTemperature?.latest ? `${liveTemperature.latest.value.toLocaleString("th-TH")} ${liveTemperature.unit}` : "—",
        note: liveTemperature?.latest ? `ค่าล่าสุด · ${liveTemperature.freshness === "fresh" ? "สด" : "stale"} · config v${liveTemperature.configVersion}` : hasTemperatureSensor ? "ตั้งค่าเซ็นเซอร์แล้ว แต่ยังไม่มีค่าที่บันทึก" : "ยังไม่มีเซ็นเซอร์อุณหภูมิออนไลน์",
        tone: liveTemperature?.latest ? (liveTemperature.freshness === "fresh" && liveTemperature.latest.quality !== "invalid" ? "healthy" : "warning") : "neutral",
      },
      {
        id: "humidity",
        label: "ความชื้นอากาศ",
        value: liveHumidity?.latest ? `${liveHumidity.latest.value.toLocaleString("th-TH")} ${liveHumidity.unit}` : "—",
        note: liveHumidity?.latest ? `ค่าล่าสุด · ${liveHumidity.freshness === "fresh" ? "สด" : "stale"} · config v${liveHumidity.configVersion}` : hasHumiditySensor ? "ตั้งค่าเซ็นเซอร์แล้ว แต่ยังไม่มีค่าที่บันทึก" : "ยังไม่มีเซ็นเซอร์ความชื้นออนไลน์",
        tone: liveHumidity?.latest ? (liveHumidity.freshness === "fresh" && liveHumidity.latest.quality !== "invalid" ? "healthy" : "warning") : "neutral",
      },
      {
        id: "alerts",
        label: "ต้องตรวจสอบ",
        value: String(openAlerts.length),
        note: openAlerts.length ? "ยังเปิดอยู่" : "ยังไม่มีเหตุการณ์ที่บันทึก",
        tone: openAlerts.length ? "warning" : "neutral",
      },
    ],
    workItems: openAlerts.map((alert) => ({
      id: alert.id,
      title: alert.title,
      detail: alert.detail,
      time: alert.time,
      severity: alert.type,
      targetPage: "alerts",
    })),
    resourceRows: state.alerts.map((alert) => ({
      id: alert.id,
      label: alert.title,
      kind: "เหตุการณ์" as const,
      status: alert.resolved ? "ปิดเหตุการณ์แล้ว" : "ต้องตรวจสอบ",
      tone: alert.resolved ? "neutral" as const : "warning" as const,
      updated: alert.time || "ไม่มีเวลาที่บันทึก",
      targetPage: "alerts" as const,
    })),
  };
}

export function filterPlants(
  plants: DemoPlant[],
  query: string,
  health: PlantFilter,
): DemoPlant[] {
  const normalized = query.trim().toLocaleLowerCase();
  return plants.filter((plant) => {
    const matchesHealth = health === "all" || plant.health === health;
    const haystack = [plant.name, plant.id, plant.zone]
      .join(" ")
      .toLocaleLowerCase();
    return matchesHealth && (!normalized || haystack.includes(normalized));
  });
}

export function filterAlerts(
  alerts: DemoAlert[],
  filter: AlertFilter,
): DemoAlert[] {
  if (filter === "open") return alerts.filter((alert) => !alert.resolved);
  if (filter === "resolved") return alerts.filter((alert) => alert.resolved);
  return alerts;
}

export function describeSoilMoistureTrend(
  points: SoilMoisturePoint[],
  minTarget: number,
): string {
  const first = points.at(0)?.value ?? 0;
  const current = points.at(-1)?.value ?? 0;
  const direction = current < first ? "ลดลง" : current > first ? "เพิ่มขึ้น" : "คงที่";
  const targetCopy = current < minTarget
    ? "ต่ำกว่าเป้าหมาย " + String(minTarget - current) + "%"
    : "อยู่ในช่วงเป้าหมาย";
  return "ความชื้นดิน" + direction + "เหลือ " + String(current) + "% " + targetCopy;
}
