export const MEASUREMENT_PORT_KEYS = ["A", "B"] as const;
export type MeasurementPortKey = (typeof MEASUREMENT_PORT_KEYS)[number];

const DEVICE_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,60}$/;
const PLANT_ID_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,63}$/;
const SENSOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/;

export function isMeasurementPortKey(value: unknown): value is MeasurementPortKey {
  return value === "A" || value === "B";
}

export function isDeviceIdentity(value: unknown): value is string {
  return typeof value === "string" && DEVICE_ID_PATTERN.test(value);
}

export function isPlantIdentity(value: unknown): value is string {
  return typeof value === "string" && PLANT_ID_PATTERN.test(value);
}

export function measurementPointId(deviceId: string, portKey: MeasurementPortKey): string {
  if (!isDeviceIdentity(deviceId)) throw new Error("deviceId is invalid.");
  return `${deviceId}-${portKey}`;
}

export function sensorChannelId(deviceId: string, portKey: MeasurementPortKey, metric: string): string {
  const suffix = { temperature: "TEMP", humidity: "HUM", soil_moisture: "SOIL", light: "LIGHT" }[metric];
  if (!suffix) throw new Error("metric is invalid.");
  const id = `SEN-${measurementPointId(deviceId, portKey)}-${suffix}`;
  if (!SENSOR_ID_PATTERN.test(id)) throw new Error("Generated sensorId is too long.");
  return id;
}

export type AssignmentInterval = {
  plantId: string;
  assignedAt: string;
  unassignedAt: string | null;
};

/** Assignment intervals are half-open: a sample at move time belongs to the new plant. */
export function plantForSample(intervals: AssignmentInterval[], sampledAt: string): string | null {
  const sampleTime = Date.parse(sampledAt);
  if (!Number.isFinite(sampleTime)) return null;
  const matches = intervals.filter((interval) => {
    const start = Date.parse(interval.assignedAt);
    const end = interval.unassignedAt === null ? Number.POSITIVE_INFINITY : Date.parse(interval.unassignedAt);
    return Number.isFinite(start) && (interval.unassignedAt === null || Number.isFinite(end)) && start <= sampleTime && sampleTime < end;
  });
  return matches.length === 1 ? matches[0]!.plantId : null;
}
