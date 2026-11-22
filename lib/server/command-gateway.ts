import type { DeviceCommandAction } from "@/types/greenhouse";

export type GatewayCommand = {
  commandId: string;
  greenhouseId: string;
  deviceId: string;
  action: DeviceCommandAction;
  idempotencyKey: string;
};

export class CommandGatewayUnavailableError extends Error {
  constructor() {
    super("The device command gateway is not configured.");
    this.name = "CommandGatewayUnavailableError";
  }
}

/**
 * Intentionally fail closed until a signed gateway adapter is configured.
 * A production adapter must authenticate the gateway, allow-list device IDs,
 * dispatch with the command ID as its idempotency key, and verify its ACK.
 */
export async function dispatchDeviceCommand(
  _command: GatewayCommand,
): Promise<{ acknowledgedAt: string }> {
  void _command;
  throw new CommandGatewayUnavailableError();
}
