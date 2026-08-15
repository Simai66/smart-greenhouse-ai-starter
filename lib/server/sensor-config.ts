import type { sensorConfigs } from "@/db/schema";
import {
  SENSOR_UNITS,
  isFiniteNumber,
  isSensorMetric,
  isValidSensorId,
  validateSensorDefinition,
  freshnessFor,
  type SensorCalibration,
  type SensorMetric,
  type SensorThresholds,
} from "@/lib/server/sensor-telemetry";

export type SensorConfigRow = typeof sensorConfigs.$inferSelect;

export type SensorConfigInput = {
  sensorId: string;
  greenhouseId: string;
  name: string;
  metric: SensorMetric;
  unit: string;
  samplingIntervalSeconds: number;
  calibration: SensorCalibration;
  thresholds: SensorThresholds;
  enabled: boolean;
  agentId?: string;
};

function stringValue(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function numberOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return isFiniteNumber(value) ? value : Number.NaN;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

/** Parses one browser/admin config while keeping defaults in one place. */
export function parseSensorConfigInput(payload: unknown, fallback?: Partial<SensorConfigInput>): { value?: SensorConfigInput; error?: string } {
  const body = objectValue(payload);
  if (!body) return { error: "Request body must be an object." };
  const greenhouseId = body.greenhouseId ?? fallback?.greenhouseId;
  const sensorId = body.sensorId ?? fallback?.sensorId;
  const name = body.name ?? fallback?.name;
  const metric = body.metric ?? fallback?.metric;
  const unit = body.unit ?? fallback?.unit;
  const samplingIntervalSeconds = body.samplingIntervalSeconds ?? fallback?.samplingIntervalSeconds ?? 30;
  const enabled = body.enabled ?? fallback?.enabled ?? true;
  const calibrationBody = body.calibration === undefined ? undefined : objectValue(body.calibration);
  const thresholdBody = body.thresholds === undefined ? undefined : objectValue(body.thresholds);
  if (body.calibration !== undefined && !calibrationBody) return { error: "calibration must be an object." };
  if (body.thresholds !== undefined && !thresholdBody) return { error: "thresholds must be an object." };

  const scale = calibrationBody?.scale ?? fallback?.calibration?.scale ?? 1;
  const offset = calibrationBody?.offset ?? fallback?.calibration?.offset ?? 0;
  const thresholdMin = thresholdBody && Object.prototype.hasOwnProperty.call(thresholdBody, "min") ? thresholdBody.min : body.minThreshold ?? fallback?.thresholds?.min;
  const thresholdMax = thresholdBody && Object.prototype.hasOwnProperty.call(thresholdBody, "max") ? thresholdBody.max : body.maxThreshold ?? fallback?.thresholds?.max;
  const min = numberOrNull(thresholdMin);
  const max = numberOrNull(thresholdMax);
  if (!stringValue(greenhouseId, 64) || !stringValue(sensorId, 128) || !isValidSensorId(sensorId)) return { error: "greenhouseId and a valid sensorId are required." };
  if (!stringValue(name)) return { error: "name is required." };
  if (!isSensorMetric(metric) || typeof unit !== "string") return { error: "metric and unit are required." };
  if (typeof enabled !== "boolean") return { error: "enabled must be boolean." };
  if (body.agentId !== undefined && (!stringValue(body.agentId, 64) || !/^[A-Z0-9_-]{3,64}$/.test(body.agentId))) return { error: "agentId is invalid." };
  const definitionError = validateSensorDefinition({ metric, unit, samplingIntervalSeconds, calibrationScale: scale, calibrationOffset: offset, minThreshold: min, maxThreshold: max });
  if (definitionError) return { error: definitionError };
  return {
    value: {
      sensorId,
      greenhouseId,
      name: name.trim(),
      metric,
      unit,
      samplingIntervalSeconds: samplingIntervalSeconds as number,
      calibration: { scale: scale as number, offset: offset as number },
      thresholds: { min: min ?? null, max: max ?? null },
      enabled,
      ...(body.agentId === undefined ? {} : { agentId: body.agentId as string }),
    },
  };
}

export function sensorConfigPayload(row: SensorConfigRow, latest: {
  id: string;
  readingId: string | null;
  value: string;
  metric: string;
  unit: string;
  sampledAt: string;
  receivedAt: string;
  quality: string;
  configVersion: number | null;
} | null, agentId: string | null = null) {
  const min = row.minThreshold === null ? null : Number(row.minThreshold);
  const max = row.maxThreshold === null ? null : Number(row.maxThreshold);
  const thresholds = { min: Number.isFinite(min) ? min : null, max: Number.isFinite(max) ? max : null };
  const calibration = { scale: Number(row.calibrationScale), offset: Number(row.calibrationOffset) };
  const latestValue = latest ? Number(latest.value) : null;
  const freshness = freshnessFor(latest?.sampledAt ?? null, row.samplingIntervalSeconds);
  return {
    sensorId: row.sensorId,
    greenhouseId: row.greenhouseId,
    source: "edge-agent",
    name: row.name,
    metric: row.metric,
    unit: row.unit,
    samplingIntervalSeconds: row.samplingIntervalSeconds,
    calibration,
    thresholds,
    enabled: row.enabled,
    configVersion: row.configVersion,
    agentId,
    status: !row.enabled ? "disabled" : freshness === "fresh" ? "online" : "offline",
    freshness,
    lastSeenAt: latest?.sampledAt ?? null,
    latest: latest && Number.isFinite(latestValue) ? {
      readingId: latest.readingId ?? latest.id,
      source: "edge-agent",
      value: latestValue,
      metric: latest.metric,
      unit: latest.unit,
      sampledAt: latest.sampledAt,
      receivedAt: latest.receivedAt,
      quality: latest.quality,
      configVersion: latest.configVersion,
    } : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function sensorCapabilities(metric: SensorMetric, unit: string) {
  return { sensor: true, metrics: [metric], units: [unit], thresholdMetrics: [metric], calibration: true, samplingInterval: true };
}

export function defaultUnit(metric: unknown): string | undefined {
  return isSensorMetric(metric) ? SENSOR_UNITS[metric] : undefined;
}
