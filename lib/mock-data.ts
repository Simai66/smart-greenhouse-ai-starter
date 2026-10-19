import type { AlertItem, Device, NavItem, Plant, SensorMetric } from "@/types/greenhouse";

export const navigation: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Home" },
  { id: "plants", label: "Plant Monitoring", shortLabel: "Plants" },
  { id: "ai", label: "AI Detection", shortLabel: "AI" },
  { id: "devices", label: "Device Control", shortLabel: "Devices" },
  { id: "analytics", label: "Analytics", shortLabel: "Trends" },
  { id: "alerts", label: "Alerts", shortLabel: "Alerts" },
  { id: "settings", label: "Settings", shortLabel: "Settings" },
];

export const sensors: SensorMetric[] = [];
export const alerts: AlertItem[] = [];
export const plants: Plant[] = [];
export const devices: Device[] = [];
