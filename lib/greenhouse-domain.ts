import type {
  DemoCamera,
  DemoDevice,
  DemoSensor,
  DemoState,
} from "./greenhouse-demo-store.ts";

export type ResourceKind = "device" | "camera" | "sensor";

type ResourceBaseInput = {
  greenhouseId: string;
  zoneId: string;
  name: string;
};

export type CreateResourceInput =
  | (ResourceBaseInput & { kind: "device"; deviceKind: DemoDevice["icon"]; detail?: string; active?: boolean })
  | (ResourceBaseInput & { kind: "camera"; source?: DemoCamera["source"]; status?: DemoCamera["status"]; captureInterval?: string; enabled?: boolean })
  | (ResourceBaseInput & { kind: "sensor"; metric?: DemoSensor["metric"]; status?: DemoSensor["status"] });

export type UpdateResourceInput =
  | ({ kind: "device"; id: string } & Partial<Omit<DemoDevice, "id">> & { deviceKind?: DemoDevice["icon"] })
  | ({ kind: "camera"; id: string } & Partial<Omit<DemoCamera, "id">>)
  | ({ kind: "sensor"; id: string } & Partial<Omit<DemoSensor, "id">>);

export type DeleteResourceInput = { kind: ResourceKind; id: string };

function nextResourceId(kind: ResourceKind, existingIds: string[]): string {
  const prefix = kind.toUpperCase();
  const matches = existingIds
    .map((id) => Number(id.match(new RegExp(`^${prefix}-(\\d+)$`))?.[1] ?? 0))
    .filter((id) => Number.isInteger(id));
  return `${prefix}-${String(Math.max(0, ...matches) + 1).padStart(3, "0")}`;
}

function zoneName(state: DemoState, greenhouseId: string, zoneId: string): string {
  return state.greenhouses
    .find((greenhouse) => greenhouse.id === greenhouseId)
    ?.zones.find((zone) => zone.id === zoneId)?.name ?? zoneId;
}

export function selectResourcesForGreenhouse(state: DemoState, greenhouseId: string) {
  return {
    devices: state.devices.filter((item) => item.greenhouseId === greenhouseId),
    cameras: state.settings.cameras.filter((item) => item.greenhouseId === greenhouseId),
    sensors: state.sensors.filter((item) => item.greenhouseId === greenhouseId),
  };
}

export function createResource(state: DemoState, input: CreateResourceInput): DemoState {
  switch (input.kind) {
    case "device": {
      const device: DemoDevice = {
        id: nextResourceId("device", state.devices.map((item) => item.id)),
        name: input.name,
        detail: input.detail ?? "ตั้งค่าใหม่",
        icon: input.deviceKind,
        active: input.active ?? false,
        greenhouseId: input.greenhouseId,
        zoneId: input.zoneId,
      };
      return { ...state, devices: [...state.devices, device] };
    }
    case "camera": {
      const camera: DemoCamera = {
        id: nextResourceId("camera", state.settings.cameras.map((item) => item.id)),
        name: input.name,
        zone: zoneName(state, input.greenhouseId, input.zoneId),
        source: input.source ?? "IP camera",
        status: input.status ?? "offline",
        captureInterval: input.captureInterval ?? "15 นาที",
        enabled: input.enabled ?? true,
        greenhouseId: input.greenhouseId,
        zoneId: input.zoneId,
      };
      return { ...state, settings: { ...state.settings, cameras: [...state.settings.cameras, camera] } };
    }
    case "sensor": {
      const sensor: DemoSensor = {
        id: nextResourceId("sensor", state.sensors.map((item) => item.id)),
        name: input.name,
        metric: input.metric ?? "soilMoisture",
        status: input.status ?? "offline",
        greenhouseId: input.greenhouseId,
        zoneId: input.zoneId,
      };
      return { ...state, sensors: [...state.sensors, sensor] };
    }
  }
}

export function updateResource(state: DemoState, input: UpdateResourceInput): DemoState {
  switch (input.kind) {
    case "device": {
      const { kind: _kind, id, deviceKind, ...changes } = input;
      return {
        ...state,
        devices: state.devices.map((item) => item.id === id
          ? { ...item, ...changes, ...(deviceKind === undefined ? {} : { icon: deviceKind }) }
          : item),
      };
    }
    case "camera": {
      const { kind: _kind, id, ...changes } = input;
      return {
        ...state,
        settings: {
          ...state.settings,
          cameras: state.settings.cameras.map((item) => {
            if (item.id !== id) return item;

            // Older demo cameras may not yet be assigned to a greenhouse or zone.
            // Keep the lookup inputs concrete when a moved camera originates from
            // one of those legacy records.
            const greenhouseId = changes.greenhouseId ?? item.greenhouseId ?? "";
            const zoneId = changes.zoneId ?? item.zoneId ?? "";
            const placementChanged = changes.greenhouseId !== undefined || changes.zoneId !== undefined;

            return {
              ...item,
              ...changes,
              ...(placementChanged ? { zone: zoneName(state, greenhouseId, zoneId) } : {}),
            };
          }),
        },
      };
    }
    case "sensor": {
      const { kind: _kind, id, ...changes } = input;
      return { ...state, sensors: state.sensors.map((item) => item.id === id ? { ...item, ...changes } : item) };
    }
  }
}

export function deleteResource(state: DemoState, input: DeleteResourceInput): DemoState {
  switch (input.kind) {
    case "device":
      return { ...state, devices: state.devices.filter((item) => item.id !== input.id) };
    case "camera":
      return {
        ...state,
        settings: { ...state.settings, cameras: state.settings.cameras.filter((item) => item.id !== input.id) },
      };
    case "sensor":
      return { ...state, sensors: state.sensors.filter((item) => item.id !== input.id) };
  }
}
