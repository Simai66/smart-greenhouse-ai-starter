export type DeviceCapabilities = {
  manual?: boolean;
  schedule?: boolean;
  thresholdMetrics?: string[];
  maxRuntimeSeconds?: number;
  maxCooldownSeconds?: number;
};

export type DevicePolicy = {
  mode: "manual" | "auto";
  manualAllowed: boolean;
  schedule?: { start: string; end?: string; days?: number[] };
  threshold?: { metric: "temperature" | "humidity" | "soil_moisture" | "light"; operator: "above" | "below"; value: number };
  maxRuntimeSeconds: number;
  cooldownSeconds: number;
};

const metricNames = new Set(["temperature", "humidity", "soil_moisture", "light"]);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseCapabilities(raw: string): DeviceCapabilities {
  try {
    const value = JSON.parse(raw) as DeviceCapabilities;
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Validates only capability-supported fields; prevents a generic form from enabling unsafe behaviour. */
export function validateDevicePolicy(value: unknown, capabilities: DeviceCapabilities): { policy?: DevicePolicy; error?: string } {
  if (!value || typeof value !== "object") return { error: "policy must be an object." };
  const policy = value as Partial<DevicePolicy>;
  if (policy.mode !== "manual" && policy.mode !== "auto") return { error: "policy.mode must be manual or auto." };
  if (typeof policy.manualAllowed !== "boolean") return { error: "policy.manualAllowed must be boolean." };
  if (!isFiniteNumber(policy.maxRuntimeSeconds) || policy.maxRuntimeSeconds < 1 || policy.maxRuntimeSeconds > Math.min(capabilities.maxRuntimeSeconds ?? 3600, 3600)) {
    return { error: "policy.maxRuntimeSeconds is outside this device capability." };
  }
  if (!isFiniteNumber(policy.cooldownSeconds) || policy.cooldownSeconds < 0 || policy.cooldownSeconds > Math.min(capabilities.maxCooldownSeconds ?? 86400, 86400)) {
    return { error: "policy.cooldownSeconds is outside this device capability." };
  }
  if (policy.manualAllowed && capabilities.manual !== true) return { error: "This device does not permit manual control." };
  if (policy.schedule !== undefined) {
    if (capabilities.schedule !== true || !policy.schedule || !timePattern.test(policy.schedule.start) || (policy.schedule.end !== undefined && !timePattern.test(policy.schedule.end)) || (policy.schedule.days !== undefined && (!Array.isArray(policy.schedule.days) || policy.schedule.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6)))) {
      return { error: "policy.schedule is not supported or is invalid." };
    }
  }
  if (policy.threshold !== undefined) {
    const threshold = policy.threshold;
    if (!threshold || !metricNames.has(threshold.metric) || !["above", "below"].includes(threshold.operator) || !isFiniteNumber(threshold.value) || !(capabilities.thresholdMetrics ?? []).includes(threshold.metric)) {
      return { error: "policy.threshold is not supported or is invalid." };
    }
  }
  return { policy: policy as DevicePolicy };
}

export function policyAllowsManualCommand(policyJson: string | null, action: "turn_on" | "turn_off" | "emergency_stop", requestedRuntime?: number) {
  if (action === "emergency_stop") return { allowed: true as const };
  try {
    const policy = JSON.parse(policyJson ?? "") as DevicePolicy;
    if (!policy.manualAllowed) return { allowed: false as const, error: "Manual control is disallowed by this device policy." };
    if (requestedRuntime !== undefined && requestedRuntime > policy.maxRuntimeSeconds) return { allowed: false as const, error: "Requested runtime exceeds this device policy." };
    return { allowed: true as const };
  } catch {
    return { allowed: false as const, error: "This device has no valid safety policy." };
  }
}
