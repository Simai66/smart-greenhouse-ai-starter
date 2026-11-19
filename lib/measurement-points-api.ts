import type { MeasurementPortKey } from "@/lib/measurement-identity";

export type PlantOption = { id: string; greenhouseId: string; displayName: string; status: "active" };
export type MeasurementPoint = {
  id: string;
  greenhouseId: string;
  deviceId: string;
  portKey: MeasurementPortKey;
  displayName: string;
  enabled: boolean;
  assignment: { plantId: string; displayName: string; assignedAt: string } | null;
  channels: Array<{ sensorId: string; name: string; metric: string; unit: string; enabled: boolean }>;
};
export type DevicePoints = { device: { id: string; greenhouseId: string; agentId: string | null; assignmentVersion: number }; points: MeasurementPoint[] };

export class MeasurementPointsApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "MeasurementPointsApiError";
  }
}

async function body<T>(response: Response): Promise<T> {
  const value = await response.json() as T & { error?: unknown };
  if (!response.ok) {
    const error = value.error;
    const message = error && typeof error === "object" && "message" in error ? String(error.message) : typeof error === "string" ? error : "Request failed.";
    throw new MeasurementPointsApiError(message, response.status);
  }
  return value;
}

export const measurementPointsApi = {
  async listPlants(greenhouseId: string): Promise<PlantOption[]> {
    const result = await body<{ plants: PlantOption[] }>(await fetch(`/api/plants?greenhouseId=${encodeURIComponent(greenhouseId)}`));
    return result.plants;
  },
  async createPlant(input: { greenhouseId: string; plantId: string; displayName: string }): Promise<PlantOption> {
    const result = await body<{ plant: PlantOption }>(await fetch("/api/plants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
    return result.plant;
  },
  async registerPoints(input: { greenhouseId: string; deviceId: string; agentId: string }): Promise<DevicePoints> {
    return body<DevicePoints>(await fetch(`/api/devices/${encodeURIComponent(input.deviceId)}/points`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ greenhouseId: input.greenhouseId, agentId: input.agentId }) }));
  },
  async listPoints(deviceId: string, greenhouseId: string): Promise<DevicePoints> {
    return body<DevicePoints>(await fetch(`/api/devices/${encodeURIComponent(deviceId)}/points?greenhouseId=${encodeURIComponent(greenhouseId)}`));
  },
  async saveAssignments(input: { greenhouseId: string; deviceId: string; expectedVersion: number; reason?: string; assignments: Array<{ pointId: string; plantId: string | null }> }) {
    return body<{ assignmentVersion: number; changed: boolean; effectiveAt: string }>(await fetch(`/api/devices/${encodeURIComponent(input.deviceId)}/assignments`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }));
  },
};
