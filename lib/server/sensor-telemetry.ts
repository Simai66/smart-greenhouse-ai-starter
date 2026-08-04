export const SENSOR_METRICS = ["temperature", "humidity", "soil_moisture", "light"] as const;
export const SENSOR_QUALITIES = ["valid", "suspect", "invalid"] as const;

export type SensorMetric = (typeof SENSOR_METRICS)[number];
export type SensorQuality = (typeof SENSOR_QUALITIES)[number];
export type SensorThresholds = { min: number | null; max: number | null };
export type SensorCalibration = { scale: number; offset: number };

export const SENSOR_UNITS: Record<SensorMetric, string> = {
  temperature: "celsius",
  humidity: "percent",
  soil_moisture: "percent",
  light: "lux",
};

export const SENSOR_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,127}$/;
export const READING_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{2,159}$/;
export const MAX_TELEMETRY_AGE_MS = 24 * 60 * 60 * 1000;
export const MAX_TELEMETRY_FUTURE_MS = 5 * 60 * 1000;

export function isSensorMetric(value: unknown): value is SensorMetric {
  return typeof value === "string" && (SENSOR_METRICS as readonly string[]).includes(value);
}

export function isSensorQuality(value: unknown): value is SensorQuality {
  return typeof value === "string" && (SENSOR_QUALITIES as readonly string[]).includes(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function isValidSensorId(value: unknown): value is string {
  return typeof value === "string" && SENSOR_ID_PATTERN.test(value);
}

export function isValidReadingId(value: unknown): value is string {
  return typeof value === "string" && READING_ID_PATTERN.test(value);
}

export function validateSensorDefinition(value: {
  metric: unknown;
  unit: unknown;
  samplingIntervalSeconds: unknown;
  calibrationScale: unknown;
  calibrationOffset: unknown;
  minThreshold: unknown;
  maxThreshold: unknown;
}): string | null {
  if (!isSensorMetric(value.metric) || value.unit !== SENSOR_UNITS[value.metric]) {
    return "metric and unit are not a supported pair.";
  }
  if (!Number.isInteger(value.samplingIntervalSeconds) || (value.samplingIntervalSeconds as number) < 1 || (value.samplingIntervalSeconds as number) > 86400) {
    return "samplingIntervalSeconds must be an integer from 1 to 86400.";
  }
  if (!isFiniteNumber(value.calibrationScale) || Math.abs(value.calibrationScale) > 100000 || !isFiniteNumber(value.calibrationOffset) || Math.abs(value.calibrationOffset) > 1000000) {
    return "calibration values are outside the supported range.";
  }
  if (value.minThreshold !== null && value.minThreshold !== undefined && !isFiniteNumber(value.minThreshold)) return "thresholds.min must be a finite number or null.";
  if (value.maxThreshold !== null && value.maxThreshold !== undefined && !isFiniteNumber(value.maxThreshold)) return "thresholds.max must be a finite number or null.";
  if (isFiniteNumber(value.minThreshold) && isFiniteNumber(value.maxThreshold) && value.minThreshold > value.maxThreshold) return "thresholds.min cannot exceed thresholds.max.";
  return null;
}

export function calibratedValue(raw: number, calibration: SensorCalibration): number {
  return raw * calibration.scale + calibration.offset;
}

export function isOutsideThreshold(value: number, thresholds: SensorThresholds): boolean {
  return (thresholds.min !== null && value < thresholds.min) || (thresholds.max !== null && value > thresholds.max);
}

export function freshnessFor(sampledAt: string | null, intervalSeconds: number, now = Date.now()): "fresh" | "stale" | "missing" {
  if (!sampledAt) return "missing";
  const timestamp = Date.parse(sampledAt);
  if (!Number.isFinite(timestamp)) return "stale";
  return now - timestamp <= Math.max(intervalSeconds * 3 * 1000, 60_000) ? "fresh" : "stale";
}

export async function deterministicReadingId(parts: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
  return `reading-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
