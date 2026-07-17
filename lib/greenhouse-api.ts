import type { DeviceCommandAction, DeviceCommandRequest, DeviceCommandResult } from "@/types/greenhouse";

export class GreenhouseApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GreenhouseApiError";
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Use the generic message below when a gateway or proxy returned non-JSON.
  }
  return "The command could not be completed.";
}

function isDeviceCommandResult(value: unknown): value is DeviceCommandResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<DeviceCommandResult>;
  return typeof result.commandId === "string"
    && typeof result.deviceId === "string"
    && typeof result.command === "string"
    && typeof result.state === "string"
    && typeof result.requestedAt === "string"
    && typeof result.message === "string";
}

/** Browser adapter for the server-side command API. It never invents an ACK. */
export const greenhouseApi = {
  async runDetection() {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { classification: "Warning", condition: "Possible early leaf spot", confidence: 82, severity: "Low" };
  },

  async requestDeviceCommand(
    request: Omit<DeviceCommandRequest, "idempotencyKey"> & { idempotencyKey?: string },
  ): Promise<DeviceCommandResult> {
    const idempotencyKey = request.idempotencyKey ?? crypto.randomUUID();
    const response = await fetch("/api/device-commands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        greenhouseId: request.greenhouseId,
        deviceId: request.deviceId,
        command: request.command,
      }),
    });
    if (!response.ok) throw new GreenhouseApiError(await readApiError(response), response.status);

    const result: unknown = await response.json();
    if (!isDeviceCommandResult(result)) {
      throw new GreenhouseApiError("The command API returned an invalid response.", 502);
    }
    return result;
  },

  async sendDeviceCommand(deviceId: string, turnOn: boolean) {
    return this.requestDeviceCommand({
      greenhouseId: "GH-01",
      deviceId,
      command: turnOn ? "turn_on" : "turn_off",
    });
  },

  async sendEmergencyStop() {
    return this.requestDeviceCommand({
      greenhouseId: "GH-01",
      deviceId: "ALL",
      command: "emergency_stop" satisfies DeviceCommandAction,
    });
  },
};
