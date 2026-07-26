import type {
  DemoAlert,
  DemoCamera,
  DemoDevice,
  DemoGreenhouse,
  DemoPlant,
  DemoSensor,
  DemoState,
  DemoCropBatch,
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

export type DeleteZoneInput = { greenhouseId: string; zoneId: string };
export type PermanentlyDeleteZoneInput = { greenhouseId: string; zoneId: string };
export type PermanentlyDeleteGreenhouseInput = { greenhouseId: string };

export type GreenhouseContext = {
  greenhouse: DemoGreenhouse | undefined;
  devices: DemoDevice[];
  cameras: DemoCamera[];
  sensors: DemoSensor[];
  plants: DemoPlant[];
  alerts: DemoAlert[];
  cropBatches: DemoCropBatch[];
};

export type DevicePresentation = {
  zoneId: string | undefined;
  zoneName: string;
  lastActive: string;
  rule: string;
  power: string;
  health: string;
};

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

/**
 * Creates a read-only operational slice for one greenhouse. It deliberately
 * does not infer a default greenhouse: an invalid selection should look empty,
 * never leak the data of the first greenhouse into another workspace.
 */
export function selectGreenhouseContext(state: DemoState, greenhouseId: string): GreenhouseContext {
  const greenhouse = state.greenhouses.find((item) => item.id === greenhouseId);
  if (!greenhouse) {
    return {
      greenhouse: undefined,
      devices: [],
      cameras: [],
      sensors: [],
      plants: [],
      alerts: [],
      cropBatches: [],
    };
  }

  return {
    greenhouse,
    devices: state.devices.filter((item) => item.greenhouseId === greenhouseId),
    cameras: state.settings.cameras.filter((item) => item.greenhouseId === greenhouseId),
    sensors: state.sensors.filter((item) => item.greenhouseId === greenhouseId),
    plants: state.plants.filter((item) => item.greenhouseId === greenhouseId),
    alerts: state.alerts.filter((item) => item.greenhouseId === greenhouseId),
    cropBatches: state.cropBatches.filter((item) => item.greenhouseId === greenhouseId),
  };
}

export function selectDevicePresentation(
  device: DemoDevice,
  context?: Pick<GreenhouseContext, "greenhouse">,
): DevicePresentation {
  const zone = context?.greenhouse?.zones.find((item) => item.id === device.zoneId);
  const defaults = {
    pump: {
      rule: "รดน้ำตามเกณฑ์ความชื้นดินที่ตั้งไว้",
      power: "0.18 kWh/รอบ โดยประมาณ",
    },
    fan: {
      rule: "ระบายอากาศตามเกณฑ์อุณหภูมิที่ตั้งไว้",
      power: "0.12 kWh/ชม. โดยประมาณ",
    },
    light: {
      rule: "เปิดตามตารางแสงที่ตั้งไว้",
      power: "0.40 kWh/ชม. โดยประมาณ",
    },
    mist: {
      rule: "พ่นหมอกตามเกณฑ์ความชื้นอากาศที่ตั้งไว้",
      power: "0.08 kWh/ชม. โดยประมาณ",
    },
  } as const;

  return {
    zoneId: device.zoneId,
    zoneName: zone?.name ?? device.zoneId ?? "ไม่ระบุโซน",
    lastActive: device.active ? "ตั้งค่าให้ทำงานอยู่" : "ยังไม่มีประวัติการทำงาน",
    rule: defaults[device.icon].rule,
    power: defaults[device.icon].power,
    health: "พร้อมใช้งาน",
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

            // Saved cameras created before resource scoping may not yet have a greenhouse or zone.
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

export function deleteZone(state: DemoState, input: DeleteZoneInput): DemoState {
  const hasActiveBatch = state.cropBatches.some(
    (batch) =>
      batch.greenhouseId === input.greenhouseId &&
      batch.zoneId === input.zoneId &&
      batch.status === "active",
  );
  if (hasActiveBatch) {
    throw new Error("ยังมีรอบปลูกที่ใช้งานอยู่ในโซนนี้");
  }

  return {
    ...state,
    greenhouses: state.greenhouses.map((greenhouse) =>
      greenhouse.id === input.greenhouseId
        ? {
            ...greenhouse,
            zones: greenhouse.zones.map((zone) =>
              zone.id === input.zoneId ? { ...zone, status: "archived" } : zone,
            ),
          }
        : greenhouse,
    ),
  };
}

function permanentDeletionError(target: string, dependencies: Array<[string, number, string]>): Error {
  const details = dependencies
    .filter(([, count]) => count > 0)
    .map(([label, count, unit]) => `${label} ${count} ${unit}`)
    .join(", ");
  return new Error(`ไม่สามารถลบ${target}ถาวรได้ เพราะยังมีข้อมูลอ้างอิง: ${details} โปรดลบหรือเก็บข้อมูลเหล่านี้ก่อน`);
}

export function permanentlyDeleteZone(state: DemoState, input: PermanentlyDeleteZoneInput): DemoState {
  const greenhouseIndex = state.greenhouses.findIndex((item) => item.id === input.greenhouseId);
  const greenhouse = state.greenhouses[greenhouseIndex];
  const zone = greenhouse?.zones.find((item) => item.id === input.zoneId);
  if (!zone) throw new Error("ไม่พบโซนที่ต้องการลบ");

  const batches = state.cropBatches.filter((item) =>
    item.greenhouseId === input.greenhouseId && item.zoneId === input.zoneId,
  );
  const batchIds = new Set(batches.map((item) => item.id));
  const dependencies: Array<[string, number, string]> = [
    ["รอบปลูก", batches.length, "รายการ"],
    ["พืช", state.plants.filter((item) => item.greenhouseId === input.greenhouseId && (batchIds.has(item.batchId ?? "") || item.zone === zone.name)).length, "ต้น"],
    ["อุปกรณ์", state.devices.filter((item) => item.greenhouseId === input.greenhouseId && item.zoneId === input.zoneId).length, "รายการ"],
    ["กล้อง", state.settings.cameras.filter((item) => item.greenhouseId === input.greenhouseId && item.zoneId === input.zoneId).length, "รายการ"],
    ["เซ็นเซอร์", state.sensors.filter((item) => item.greenhouseId === input.greenhouseId && item.zoneId === input.zoneId).length, "รายการ"],
  ];
  if (dependencies.some(([, count]) => count > 0)) throw permanentDeletionError("โซน", dependencies);

  const zoneIndex = greenhouse.zones.findIndex((item) => item.id === input.zoneId);
  return {
    ...state,
    greenhouses: state.greenhouses.map((item, index) => index === greenhouseIndex
      ? { ...item, zones: [...item.zones.slice(0, zoneIndex), ...item.zones.slice(zoneIndex + 1)] }
      : item),
  };
}

export function permanentlyDeleteGreenhouse(state: DemoState, input: PermanentlyDeleteGreenhouseInput): DemoState {
  const greenhouseIndex = state.greenhouses.findIndex((item) => item.id === input.greenhouseId);
  const greenhouse = state.greenhouses[greenhouseIndex];
  if (!greenhouse) throw new Error("ไม่พบโรงเรือนที่ต้องการลบ");

  const dependencies: Array<[string, number, string]> = [
    ["โซน", greenhouse.zones.length, "โซน"],
    ["รอบปลูก", state.cropBatches.filter((item) => item.greenhouseId === input.greenhouseId).length, "รายการ"],
    ["พืช", state.plants.filter((item) => item.greenhouseId === input.greenhouseId).length, "ต้น"],
    ["อุปกรณ์", state.devices.filter((item) => item.greenhouseId === input.greenhouseId).length, "รายการ"],
    ["กล้อง", state.settings.cameras.filter((item) => item.greenhouseId === input.greenhouseId).length, "รายการ"],
    ["เซ็นเซอร์", state.sensors.filter((item) => item.greenhouseId === input.greenhouseId).length, "รายการ"],
    ["การแจ้งเตือน", state.alerts.filter((item) => item.greenhouseId === input.greenhouseId).length, "รายการ"],
  ];
  if (dependencies.some(([, count]) => count > 0)) throw permanentDeletionError("โรงเรือน", dependencies);

  return { ...state, greenhouses: [...state.greenhouses.slice(0, greenhouseIndex), ...state.greenhouses.slice(greenhouseIndex + 1)] };
}
