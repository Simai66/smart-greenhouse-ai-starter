export type SensorTone = "normal" | "attention" | "danger";

export type SensorMetric = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  trend: string;
  range: string;
  tone: SensorTone;
  icon: "temperature" | "humidity" | "soil" | "light";
  sparkline: number[];
};

export type AlertItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  severity: "critical" | "warning" | "info";
  resolved?: boolean;
};

export type NavItem = {
  id: string;
  label: string;
  shortLabel: string;
};

export type PlantHealth = "healthy" | "warning" | "unhealthy";

export type Plant = {
  id: string;
  name: string;
  variety: string;
  zone: string;
  health: PlantHealth;
  confidence: number;
  updated: string;
  ageDays: number;
  soilMoisture: number;
};

export type DeviceStatus = "on" | "off" | "offline";

export type DeviceCommandAction = "turn_on" | "turn_off" | "emergency_stop";

export type DeviceCommandState =
  | "requested"
  | "dispatched"
  | "acknowledged"
  | "failed"
  | "timed_out";

export type DeviceCommandRequest = {
  greenhouseId: string;
  deviceId: string;
  command: DeviceCommandAction;
  idempotencyKey: string;
  maxRuntimeSeconds?: number;
};

export type DeviceCommandResult = {
  commandId: string;
  deviceId: string;
  command: DeviceCommandAction;
  state: DeviceCommandState;
  requestedAt: string;
  correlationId?: string;
  expiresAt?: string;
  maxRuntimeSeconds?: number | null;
  message: string;
};

export type Device = {
  id: string;
  name: string;
  category: "Irrigation" | "Environment" | "Lighting";
  status: DeviceStatus;
  lastAction: string;
  schedule: string;
  icon: "pump" | "fan" | "light" | "mist";
};
