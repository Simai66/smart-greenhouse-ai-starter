"use client";

import {
  ArrowRight,
  BellRing,
  Camera,
  CircleAlert,
  Droplets,
  Leaf,
  Lightbulb,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  type ChartPeriod,
  type DashboardMetric,
  type DashboardViewModel,
  type GreenhousePageId,
} from "@/lib/greenhouse-presentation";
import type { DemoDevice, DemoPlant } from "@/lib/greenhouse-demo-store";
import type { GreenhouseContext } from "@/lib/greenhouse-domain";

export type CommandDeckViewProps = {
  viewModel: DashboardViewModel;
  devices: DemoDevice[];
  plants: DemoPlant[];
  context: GreenhouseContext;
  period: ChartPeriod;
  lastUpdated: string | null;
  pendingDeviceId: string | null;
  online: boolean;
  onPeriodChange: (period: ChartPeriod) => void;
  onNavigate: (page: GreenhousePageId) => void;
  onDeviceRequest: (device: DemoDevice) => void;
  onInspectPlant: (plantId: string) => void;
};

const metricPresentation: Record<
  DashboardMetric["id"],
  { icon: typeof Leaf; label: string }
> = {
  health: { icon: Leaf, label: "ยอดเยี่ยม" },
  temperature: { icon: ThermometerSun, label: "ปกติ" },
  humidity: { icon: Droplets, label: "ปกติ" },
  alerts: { icon: BellRing, label: "ติดตาม" },
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const presentation = metricPresentation[metric.id];
  const Icon = presentation.icon;
  const isWarning = metric.tone === "warning" || metric.tone === "danger";

  return (
    <Card className="shadow-none transition-colors hover:border-primary/30">
      <CardContent className="flex min-h-36 gap-4 p-4 sm:p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{metric.value}</p>
          <p
            className={
              isWarning
                ? "mt-1 text-sm font-medium text-amber-700"
                : metric.tone === "neutral"
                  ? "mt-1 text-sm text-muted-foreground"
                  : "mt-1 text-sm font-medium text-primary"
            }
          >
            {isWarning
              ? "ตรวจสอบ"
              : metric.tone === "neutral"
                ? "รอข้อมูล"
                : presentation.label}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{metric.note}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function plantHealthClass(health: DemoPlant["health"]) {
  if (health === "ควรตรวจสอบ") {
    return "border-amber-300 text-amber-800";
  }
  if (health === "ปกติ") {
    return "border-primary/30 text-primary";
  }
  return "border-border text-muted-foreground";
}

export function CommandDeckView({
  viewModel,
  devices,
  plants,
  context,
  period,
  lastUpdated,
  pendingDeviceId,
  online,
  onPeriodChange,
  onNavigate,
  onDeviceRequest,
  onInspectPlant,
}: CommandDeckViewProps) {
  const activeCamera =
    context.cameras.find((camera) => camera.enabled && camera.status === "online") ??
    context.cameras[0];
  const cameraZone =
    context.greenhouse?.zones.find((zone) => zone.id === activeCamera?.zoneId)?.name ??
    activeCamera?.zone ??
    "ไม่ระบุโซน";
  const soilSensors = context.sensors.filter(
    (sensor) => sensor.metric === "soilMoisture" && sensor.status === "online",
  );
  const healthPriority = {
    "ควรตรวจสอบ": 0,
    "ยังไม่มีข้อมูล": 1,
    "ปกติ": 2,
  } satisfies Record<DemoPlant["health"], number>;
  const previewPlants = [...plants]
    .sort((left, right) => healthPriority[left.health] - healthPriority[right.health])
    .slice(0, 4);
  const systemResources = [
    [Droplets, "ระบบให้น้ำ", "pump"],
    [Lightbulb, "ระบบไฟส่องสว่าง", "light"],
    [Wind, "ระบบระบายอากาศ", "fan"],
  ] as const;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
          <div>
            <h2 className="font-semibold">
              {viewModel.hasRecordedActivity
                ? "มีเหตุการณ์ที่บันทึกล่าสุด"
                : viewModel.hasOperationalData
                  ? "ตั้งค่าทรัพยากรแล้ว · รอข้อมูลบันทึก"
                  : "ยังไม่ได้ตั้งค่าทรัพยากร"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {viewModel.hasRecordedActivity
                ? `มี ${viewModel.openAlerts} รายการที่ต้องตรวจสอบ`
                : "ยังไม่มีค่าจากเซ็นเซอร์หรือเหตุการณ์ที่บันทึกไว้"}
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground">
          {lastUpdated
            ? `${online ? "เชื่อมต่อแอปแล้ว" : "การเชื่อมต่อแอปขาดหาย"} · ซิงก์ล่าสุด ${lastUpdated}`
            : "ยังไม่มีเวลาซิงก์ที่บันทึก"}
        </span>
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="สถานะสำคัญ"
      >
        {viewModel.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,.7fr)]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-base font-semibold">แนวโน้มความชื้นดิน</h2>
            {(["วันนี้", "7 วัน", "30 วัน"] as ChartPeriod[]).map((option) => (
              <Button
                key={option}
                size="sm"
                variant={period === option ? "default" : "outline"}
                aria-pressed={period === option}
                onClick={() => onPeriodChange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
          <Card className="shadow-none">
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
              <p className="font-semibold">ยังไม่มีค่าความชื้นดินที่บันทึก</p>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                {soilSensors.length
                  ? `พบเซ็นเซอร์ ${soilSensors.map((sensor) => sensor.name).join(", ")} แล้ว แต่ยังไม่มีค่าตามช่วง ${period}`
                  : "เพิ่มและเชื่อมต่อเซ็นเซอร์ความชื้นดินในโรงเรือนนี้ก่อน จึงจะแสดงกราฟได้"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden shadow-none">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <div>
                <h2 className="font-semibold">
                  {activeCamera ? activeCamera.name : "ยังไม่มีกล้องในโรงเรือนนี้"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {activeCamera
                    ? `กล้อง${activeCamera.status === "online" ? "ออนไลน์" : "ออฟไลน์"} · ${cameraZone}`
                    : "เพิ่มและเปิดใช้งานกล้องจากหน้าตั้งค่า"}
                </p>
              </div>
              {activeCamera ? (
                <Button variant="ghost" size="sm" onClick={() => onNavigate("ai")}>
                  ไปที่ AI
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="pb-5 pt-0">
              <div className="grid aspect-[16/9] place-items-center rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">
                <div>
                  <Camera className="mx-auto mb-3 size-5" aria-hidden="true" />
                  <p className="font-medium text-foreground">ยังไม่มีภาพที่บันทึก</p>
                  <p className="mt-1">
                    {activeCamera
                      ? `รอภาพจริงจาก ${activeCamera.name} ก่อนแสดงหลักฐาน`
                      : "เพิ่มกล้องเพื่อเริ่มรับภาพ"}
                  </p>
                </div>
              </div>
              {activeCamera ? (
                <div className="mt-3 flex justify-between text-sm text-muted-foreground">
                  <span>ยังไม่มีหลักฐานภาพ</span>
                  <span>{cameraZone}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <div>
                <h2 className="font-semibold">งานที่ต้องจัดการ</h2>
                <p className="mt-1 text-sm text-muted-foreground">เรียงตามผลกระทบ</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("alerts")}>
                ดูทั้งหมด
              </Button>
            </CardHeader>
            <CardContent className="space-y-1 p-3 pt-0">
              {viewModel.workItems.slice(0, 3).map((item) => (
                <button
                  type="button"
                  className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                  key={item.id}
                  onClick={() => onNavigate(item.targetPage)}
                >
                  <span className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-700">
                    <CircleAlert className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{item.title}</strong>
                    <small className="block truncate text-muted-foreground">{item.detail}</small>
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              ))}
              {!viewModel.workItems.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  ไม่มีงานเปิดอยู่ ระบบยังคงติดตามตามปกติ
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,1fr)_minmax(17rem,.72fr)]"
        aria-label="สถานะทรัพยากรสำคัญ"
      >
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <h2 className="font-semibold">ทรัพยากรที่ตั้งค่าไว้</h2>
            <p className="text-sm text-muted-foreground">
              สถานะการกำหนดค่า ไม่ใช่สถานะจากการวัดจริง
            </p>
          </CardHeader>
          <CardContent className="flex items-center gap-5">
            <div className="grid size-24 shrink-0 place-items-center rounded-lg bg-secondary/70 text-center">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {viewModel.hasPlantData ? `${viewModel.healthScore}%` : "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {viewModel.hasPlantData ? "ข้อมูลพืช" : "รอข้อมูล"}
                </p>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {systemResources.map(([Icon, label, deviceIcon]) => (
                <button
                  type="button"
                  key={label}
                  className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-left transition-colors hover:text-primary"
                  onClick={() => onNavigate("devices")}
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{label}</span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {devices.some((device) => device.icon === deviceIcon)
                      ? "ตั้งค่าแล้ว"
                      : "ยังไม่ตั้งค่า"}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <div>
              <h2 className="font-semibold">อุปกรณ์ที่ตั้งค่าไว้</h2>
              <p className="text-sm text-muted-foreground">
                ตั้งค่าให้เปิด {viewModel.activeDevices} จาก {viewModel.deviceCount} อุปกรณ์
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("devices")}>
              ดูทั้งหมด
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {devices.length ? (
              devices.map((device) => (
                <div
                  className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0"
                  key={device.id}
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{device.name}</strong>
                    <small className="text-muted-foreground">
                      {device.active ? "ตั้งค่าให้เปิด" : "ตั้งค่าให้ปิด"}
                    </small>
                  </div>
                  <Switch
                    aria-label={(device.active ? "ปิด" : "เปิด") + device.name}
                    aria-describedby="dashboard-device-command-note"
                    checked={device.active}
                    disabled={!online || Boolean(pendingDeviceId)}
                    onCheckedChange={() => onDeviceRequest(device)}
                  />
                </div>
              ))
            ) : (
              <p className="py-5 text-center text-sm text-muted-foreground">
                ยังไม่มีอุปกรณ์ในโรงเรือนนี้
              </p>
            )}
          </CardContent>
          <p className="sr-only" id="dashboard-device-command-note">
            {online
              ? "คำสั่งต้องยืนยันและรอการตอบรับก่อนเปลี่ยนสถานะ"
              : "ออฟไลน์ จึงปิดคำสั่งอุปกรณ์ชั่วคราว"}
          </p>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <h2 className="font-semibold">บันทึกเหตุการณ์</h2>
            <p className="text-sm text-muted-foreground">
              แสดงเฉพาะเหตุการณ์ที่มีเวลาบันทึก
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {viewModel.resourceRows.length ? (
              viewModel.resourceRows.map((row) => (
                <button
                  type="button"
                  className="flex w-full items-start gap-3 text-left transition-colors hover:text-primary"
                  key={row.id}
                  onClick={() => onNavigate(row.targetPage)}
                >
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${row.tone === "warning" ? "bg-amber-500" : "bg-muted-foreground/50"}`}
                    aria-hidden="true"
                  />
                  <span>
                    <small className="block text-muted-foreground">
                      {row.kind} · {row.updated}
                    </small>
                    <strong className="block text-sm leading-snug">
                      {row.label} · {row.status}
                    </strong>
                  </span>
                </button>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                ยังไม่มีเหตุการณ์หรือค่าที่บันทึกไว้
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(17rem,.8fr)]">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <h2 className="font-semibold">สุขภาพพืชล่าสุด</h2>
              <p className="text-sm text-muted-foreground">
                {plants.some((plant) => plant.confidence !== null)
                  ? `ค่าเฉลี่ย ${viewModel.healthScore}/100`
                  : "ยังไม่มีผลตรวจสุขภาพพืช"}
                {plants.length > previewPlants.length
                  ? ` · แสดง ${previewPlants.length} จาก ${plants.length} ต้น`
                  : ""}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("plants")}>
              ดูทุกต้น <ArrowRight aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {previewPlants.length ? (
              previewPlants.map((plant) => (
                <button
                  type="button"
                  className="flex min-h-14 items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  key={plant.id}
                  onClick={() => onInspectPlant(plant.id)}
                >
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{plant.name}</strong>
                    <small className="text-muted-foreground">{plant.zone}</small>
                  </span>
                  <Badge variant="outline" className={plantHealthClass(plant.health)}>
                    {plant.health}
                  </Badge>
                </button>
              ))
            ) : (
              <p className="py-5 text-center text-sm text-muted-foreground sm:col-span-2">
                เพิ่มรอบปลูกก่อนจึงจะมีข้อมูลสุขภาพพืช
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-secondary/60 shadow-none">
          <CardContent className="flex h-full min-h-44 flex-col items-start justify-between gap-5 p-5">
            <div>
              <p className="text-lg font-semibold">
                {viewModel.hasRecordedActivity
                  ? "มีข้อมูลสำหรับตรวจสอบ"
                  : viewModel.hasOperationalData
                    ? "รอข้อมูลจากโรงเรือนนี้"
                    : "เริ่มตั้งค่าโรงเรือนนี้"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {viewModel.hasRecordedActivity
                  ? "ตรวจสอบเหตุการณ์ที่บันทึกไว้ก่อนตัดสินใจ"
                  : viewModel.hasOperationalData
                    ? "ทรัพยากรถูกตั้งค่าแล้ว แต่ยังไม่มีค่าหรือเหตุการณ์ที่บันทึก"
                    : "เพิ่มโซน อุปกรณ์ เซ็นเซอร์ หรือรอบปลูก เพื่อเริ่มติดตาม"}
              </p>
            </div>
            <Button
              variant="outline"
              className="bg-card"
              onClick={() =>
                onNavigate(viewModel.hasRecordedActivity ? "analytics" : "settings")
              }
            >
              {viewModel.hasRecordedActivity ? "ดูการวิเคราะห์" : "ไปที่ตั้งค่า"}
              <ArrowRight aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
