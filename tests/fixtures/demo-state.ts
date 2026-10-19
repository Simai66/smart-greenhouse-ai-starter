import { demoInitialState, type DemoState } from "../../lib/greenhouse-demo-store.ts";

export const demoTestState: DemoState = {
  ...structuredClone(demoInitialState),
  cropBatches: [
    { id: "BATCH-TEST-A", greenhouseId: "GH-01", zoneId: "ZONE-A", cropName: "มะเขือเทศเชอร์รี", cultivar: "Sweet 100", plantCount: 2, plantedAt: "2026-06-10", status: "active" },
    { id: "BATCH-TEST-B", greenhouseId: "GH-01", zoneId: "ZONE-B", cropName: "มะเขือเทศเชอร์รี", cultivar: "Sweet 100", plantCount: 2, plantedAt: "2026-06-14", status: "active" },
  ],
  sensors: [
    { id: "SENSOR-A", name: "เซ็นเซอร์ดิน A", metric: "soilMoisture", greenhouseId: "GH-01", zoneId: "ZONE-A", status: "online" },
    { id: "SENSOR-B", name: "เซ็นเซอร์ดิน B", metric: "soilMoisture", greenhouseId: "GH-01", zoneId: "ZONE-B", status: "online" },
  ],
  devices: [
    { id: "test-pump", name: "ปั๊มน้ำ", detail: "รอบถัดไป 10:30 น.", icon: "pump", active: false, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    { id: "test-fan", name: "พัดลมระบายอากาศ", detail: "โหมดอัตโนมัติ · มากกว่า 30°C", icon: "fan", active: true, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    { id: "test-light", name: "ไฟปลูกพืช", detail: "รอบถัดไป 18:00 น.", icon: "light", active: false, greenhouseId: "GH-01", zoneId: "ZONE-B" },
    { id: "test-mist", name: "เครื่องพ่นหมอก", detail: "โหมดอัตโนมัติ · ต่ำกว่า 60% RH", icon: "mist", active: true, greenhouseId: "GH-01", zoneId: "ZONE-B" },
  ],
  plants: [
    { id: "PLANT-001", name: "มะเขือเทศ 01", zone: "โซน A", age: "42 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TEST-A" },
    { id: "PLANT-002", name: "มะเขือเทศ 02", zone: "โซน A", age: "42 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TEST-A" },
    { id: "PLANT-003", name: "มะเขือเทศ 03", zone: "โซน B", age: "38 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TEST-B" },
    { id: "PLANT-004", name: "มะเขือเทศ 04", zone: "โซน B", age: "38 วัน", moisture: null, health: "ยังไม่มีข้อมูล", confidence: null, greenhouseId: "GH-01", batchId: "BATCH-TEST-B" },
  ],
  settings: {
    ...structuredClone(demoInitialState.settings),
    cameras: [
      { id: "TEST-CAM-A", name: "กล้องโซน A", zone: "โซน A", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01", zoneId: "ZONE-A" },
      { id: "TEST-CAM-B", name: "กล้องโซน B", zone: "โซน B", source: "IP camera", status: "online", captureInterval: "15 นาที", enabled: true, greenhouseId: "GH-01", zoneId: "ZONE-B" },
      { id: "TEST-CAM-C", name: "กล้องสำรอง", zone: "โซน A", source: "USB gateway", status: "offline", captureInterval: "30 นาที", enabled: false, greenhouseId: "GH-01", zoneId: "ZONE-A" },
    ],
  },
};
