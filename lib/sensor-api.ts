export type LiveSensorMetric = "temperature" | "humidity" | "soil_moisture" | "light";
export type LiveSensorStatus = "online" | "offline" | "disabled";
export type LiveSensorFreshness = "fresh" | "stale" | "missing";

export type LiveSensor = {
  sensorId: string;
  greenhouseId: string;
  name: string;
  metric: LiveSensorMetric;
  unit: string;
  samplingIntervalSeconds: number;
  calibration: { scale: number; offset: number };
  thresholds: { min: number | null; max: number | null };
  enabled: boolean;
  configVersion: number;
  agentId: string | null;
  status: LiveSensorStatus;
  freshness: LiveSensorFreshness;
  lastSeenAt: string | null;
  latest: {
    readingId: string;
    value: number;
    metric: string;
    unit: string;
    sampledAt: string;
    receivedAt: string;
    quality: "valid" | "suspect" | "invalid";
    configVersion: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type SensorConfigInput = {
  greenhouseId: string;
  sensorId: string;
  name: string;
  metric: LiveSensorMetric;
  unit: string;
  samplingIntervalSeconds: number;
  calibration: { scale: number; offset: number };
  enabled: boolean;
  thresholds: { min: number | null; max: number | null };
  agentId?: string;
};

export class SensorApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "SensorApiError";
  }
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Use fallback for non-JSON gateway errors.
  }
  return "Sensor API request failed.";
}

function isMetric(value: unknown): value is LiveSensorMetric {
  return ["temperature", "humidity", "soil_moisture", "light"].includes(String(value));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isSensor(value: unknown): value is LiveSensor {
  if (!value || typeof value !== "object") return false;
  const sensor = value as Partial<LiveSensor>;
  const interval = sensor.samplingIntervalSeconds;
  const calibration = sensor.calibration;
  const thresholds = sensor.thresholds;
  const latest = sensor.latest;
  return typeof sensor.sensorId === "string" && typeof sensor.greenhouseId === "string" && typeof sensor.name === "string" && isMetric(sensor.metric) && typeof sensor.unit === "string" && typeof interval === "number" && Number.isInteger(interval) && interval > 0 && typeof sensor.configVersion === "number" && typeof sensor.enabled === "boolean" && (sensor.agentId === null || typeof sensor.agentId === "string") && ["online", "offline", "disabled"].includes(String(sensor.status)) && ["fresh", "stale", "missing"].includes(String(sensor.freshness)) && (sensor.lastSeenAt === null || typeof sensor.lastSeenAt === "string") && (calibration !== null && typeof calibration === "object" && isFiniteNumber(calibration.scale) && isFiniteNumber(calibration.offset)) && (thresholds !== null && typeof thresholds === "object" && (thresholds.min === null || isFiniteNumber(thresholds.min)) && (thresholds.max === null || isFiniteNumber(thresholds.max))) && (latest === null || (typeof latest === "object" && typeof latest.readingId === "string" && isFiniteNumber(latest.value) && typeof latest.sampledAt === "string" && typeof latest.receivedAt === "string" && ["valid", "suspect", "invalid"].includes(String(latest.quality))));
}

async function request(path: string, init?: RequestInit): Promise<LiveSensor[]> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!response.ok) throw new SensorApiError(await responseError(response), response.status);
  const body = await response.json() as { sensors?: unknown };
  if (!Array.isArray(body.sensors) || !body.sensors.every(isSensor)) throw new SensorApiError("Sensor API returned an invalid response.", 502);
  return body.sensors;
}

async function write(path: string, init: RequestInit): Promise<LiveSensor> {
  const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
  if (!response.ok) throw new SensorApiError(await responseError(response), response.status);
  const body = await response.json() as { sensor?: unknown };
  if (!isSensor(body.sensor)) throw new SensorApiError("Sensor API returned an invalid response.", 502);
  return body.sensor;
}

export const sensorApi = {
  list(greenhouseId: string) {
    return request(`/api/sensors?greenhouseId=${encodeURIComponent(greenhouseId)}`);
  },
  async create(input: SensorConfigInput) {
    return write("/api/sensors", { method: "POST", body: JSON.stringify(input) });
  },
  async update(sensorId: string, input: Omit<SensorConfigInput, "sensorId">) {
    return write(`/api/sensors/${encodeURIComponent(sensorId)}/config`, { method: "PUT", body: JSON.stringify(input) });
  },
};
