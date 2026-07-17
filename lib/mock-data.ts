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

export const sensors: SensorMetric[] = [
  {
    id: "temperature",
    label: "Temperature",
    value: "28.5",
    unit: "°C",
    trend: "+0.8°C",
    range: "Normal · 22–30°C",
    tone: "normal",
    icon: "temperature",
    sparkline: [25, 26, 25.7, 27, 26.6, 27.9, 28.5],
  },
  {
    id: "humidity",
    label: "Air Humidity",
    value: "65",
    unit: "%",
    trend: "−2.1%",
    range: "Optimal · 60–70%",
    tone: "normal",
    icon: "humidity",
    sparkline: [61, 62.5, 64, 63, 66, 65.5, 65],
  },
  {
    id: "soil",
    label: "Soil Moisture",
    value: "42",
    unit: "%",
    trend: "−4.3%",
    range: "Watch · minimum 35%",
    tone: "attention",
    icon: "soil",
    sparkline: [58, 55, 52, 50, 47, 45, 42],
  },
  {
    id: "light",
    label: "Light Intensity",
    value: "12,500",
    unit: "lux",
    trend: "+8.4%",
    range: "Good for growth",
    tone: "normal",
    icon: "light",
    sparkline: [8, 9.5, 10.2, 11.5, 10.8, 12, 12.5],
  },
];

export const alerts: AlertItem[] = [
  {
    id: "a-01",
    title: "Soil moisture is falling",
    description: "Tomato 04 is approaching the automatic irrigation threshold.",
    time: "5 min ago",
    severity: "warning",
  },
  {
    id: "a-02",
    title: "Possible early leaf spot",
    description: "AI detected a low-confidence anomaly on Tomato 03.",
    time: "18 min ago",
    severity: "critical",
  },
  {
    id: "a-03",
    title: "Ventilation cycle completed",
    description: "Zone A returned to the target temperature range.",
    time: "42 min ago",
    severity: "info",
    resolved: true,
  },
];

export const plants: Plant[] = [
  { id: "TOM-001", name: "Tomato 01", variety: "Cherry", zone: "Zone A", health: "healthy", confidence: 98, updated: "10 min ago", ageDays: 42, soilMoisture: 46 },
  { id: "TOM-002", name: "Tomato 02", variety: "Cherry", zone: "Zone A", health: "healthy", confidence: 96, updated: "12 min ago", ageDays: 42, soilMoisture: 44 },
  { id: "TOM-003", name: "Tomato 03", variety: "Roma", zone: "Zone B", health: "warning", confidence: 78, updated: "18 min ago", ageDays: 38, soilMoisture: 39 },
  { id: "TOM-004", name: "Tomato 04", variety: "Roma", zone: "Zone B", health: "healthy", confidence: 94, updated: "20 min ago", ageDays: 38, soilMoisture: 36 },
];

export const devices: Device[] = [
  { id: "DEV-PUMP-01", name: "Water Pump", category: "Irrigation", status: "off", lastAction: "Stopped 28 min ago", schedule: "Next at 10:30", icon: "pump" },
  { id: "DEV-FAN-01", name: "Ventilation Fan", category: "Environment", status: "on", lastAction: "Started 12 min ago", schedule: "Auto · above 30°C", icon: "fan" },
  { id: "DEV-LIGHT-01", name: "Grow Light", category: "Lighting", status: "off", lastAction: "Stopped at 06:00", schedule: "Next at 18:00", icon: "light" },
  { id: "DEV-MIST-01", name: "Mist Maker", category: "Environment", status: "on", lastAction: "Started 5 min ago", schedule: "Auto · below 60% RH", icon: "mist" },
];
