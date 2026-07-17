import { and, desc, eq } from "drizzle-orm";
import { deviceCommandEvents, deviceCommands, devices } from "@/db/schema";
import { getDb } from "@/db";
import { authorizeApiRole } from "@/lib/server/access-control";
import { CommandGatewayUnavailableError, dispatchDeviceCommand } from "@/lib/server/command-gateway";
import type { DeviceCommandAction, DeviceCommandResult, DeviceCommandState } from "@/types/greenhouse";

const commandActions = new Set<DeviceCommandAction>([
  "turn_on",
  "turn_off",
  "emergency_stop",
]);

type CommandPayload = {
  greenhouseId?: unknown;
  deviceId?: unknown;
  command?: unknown;
};

function isNonEmptyString(value: unknown, maxLength = 128): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function commandResult(row: {
  id: string;
  deviceId: string;
  action: string;
  state: string;
  requestedAt: string;
  failureReason: string | null;
}): DeviceCommandResult {
  return {
    commandId: row.id,
    deviceId: row.deviceId,
    command: row.action as DeviceCommandAction,
    state: row.state as DeviceCommandState,
    requestedAt: row.requestedAt,
    message: row.failureReason ?? "Command is awaiting gateway acknowledgement.",
  };
}

export async function GET(request: Request) {
  const authorization = await authorizeApiRole("viewer");
  if ("response" in authorization) return authorization.response;

  const greenhouseId = new URL(request.url).searchParams.get("greenhouseId");
  if (!isNonEmptyString(greenhouseId)) {
    return Response.json({ error: "greenhouseId is required." }, { status: 400 });
  }

  try {
    const rows = await getDb()
      .select()
      .from(deviceCommands)
      .where(eq(deviceCommands.greenhouseId, greenhouseId))
      .orderBy(desc(deviceCommands.requestedAt))
      .limit(50)
      .all();

    return Response.json({ commands: rows.map(commandResult) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Command history is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const authorization = await authorizeApiRole("operator");
  if ("response" in authorization) return authorization.response;

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!isNonEmptyString(idempotencyKey, 128)) {
    return Response.json({ error: "A valid Idempotency-Key header is required." }, { status: 400 });
  }

  let payload: CommandPayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (
    !isNonEmptyString(payload.greenhouseId) ||
    !isNonEmptyString(payload.deviceId) ||
    !commandActions.has(payload.command as DeviceCommandAction)
  ) {
    return Response.json({ error: "Invalid device command payload." }, { status: 400 });
  }

  const command = payload.command as DeviceCommandAction;
  if (command === "emergency_stop" ? payload.deviceId !== "ALL" : payload.deviceId === "ALL") {
    return Response.json({ error: "The command and device target do not match." }, { status: 400 });
  }

  let db: ReturnType<typeof getDb> | undefined;
  let commandId: string | undefined;
  let requestedAt: string | undefined;
  try {
    db = getDb();
    const existing = await db
      .select()
      .from(deviceCommands)
      .where(eq(deviceCommands.idempotencyKey, idempotencyKey))
      .limit(1)
      .get();
    if (existing) return Response.json(commandResult(existing));

    if (command !== "emergency_stop") {
      const registeredDevice = await db
        .select({ id: devices.id })
        .from(devices)
        .where(and(eq(devices.id, payload.deviceId), eq(devices.greenhouseId, payload.greenhouseId)))
        .limit(1)
        .get();
      if (!registeredDevice) {
        return Response.json({ error: "The requested device is not registered for this greenhouse." }, { status: 404 });
      }
    }

    commandId = crypto.randomUUID();
    requestedAt = new Date().toISOString();
    await db.insert(deviceCommands).values({
      id: commandId,
      greenhouseId: payload.greenhouseId,
      deviceId: payload.deviceId,
      action: command,
      state: "requested",
      idempotencyKey,
      requestedBy: authorization.user.email,
      requestedAt,
    }).run();
    await db.insert(deviceCommandEvents).values({
      id: crypto.randomUUID(),
      commandId,
      state: "requested",
      occurredAt: requestedAt,
      metadataJson: JSON.stringify({ requestedBy: authorization.user.email }),
    }).run();

    const acknowledgement = await dispatchDeviceCommand({
      commandId,
      greenhouseId: payload.greenhouseId,
      deviceId: payload.deviceId,
      action: command,
      idempotencyKey,
    });

    await db.update(deviceCommands).set({
      state: "acknowledged",
      acknowledgedAt: acknowledgement.acknowledgedAt,
    }).where(eq(deviceCommands.id, commandId)).run();
    await db.insert(deviceCommandEvents).values({
      id: crypto.randomUUID(),
      commandId,
      state: "acknowledged",
      occurredAt: acknowledgement.acknowledgedAt,
    }).run();
    return Response.json({
      commandId,
      deviceId: payload.deviceId,
      command,
      state: "acknowledged",
      requestedAt,
      message: "Gateway acknowledgement verified.",
    } satisfies DeviceCommandResult);
  } catch (error) {
    if (error instanceof CommandGatewayUnavailableError && commandId && requestedAt && db) {
      const failureReason = "Gateway is not configured; command was not dispatched.";
      await db.update(deviceCommands).set({
        state: "failed",
        failureReason,
      }).where(eq(deviceCommands.id, commandId)).run();
      await db.insert(deviceCommandEvents).values({
        id: crypto.randomUUID(),
        commandId,
        state: "failed",
        occurredAt: new Date().toISOString(),
        metadataJson: JSON.stringify({ reason: failureReason }),
      }).run();
      return Response.json({
        error: failureReason,
      }, { status: 503 });
    }
    return Response.json({ error: "Unable to create the device command." }, { status: 503 });
  }
}
