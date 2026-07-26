"use client";

import {
  ArrowRight,
  BellRing,
  CircleAlert,
  Droplets,
  Leaf,
  Lightbulb,
  Sparkles,
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

const metricPresentation: Record<DashboardMetric["id"], { icon: typeof Leaf; iconClass: string; label: string }> = {
  health: { icon: Leaf, iconClass: "bg-emerald-50 text-emerald-600", label: "ยอดเยี่ยม" },
  temperature: { icon: ThermometerSun, iconClass: "bg-orange-50 text-orange-500", label: "ปกติ" },
  humidity: { icon: Droplets, iconClass: "bg-sky-50 text-sky-600", label: "ปกติ" },
  alerts: { icon: BellRing, iconClass: "bg-amber-50 text-amber-600", label: "ติดตาม" },
};

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const presentation = metricPresentation[metric.id];
  const Icon = presentation.icon;
  const isWarning = metric.tone === "warning" || metric.tone === "danger";
  return (
    <Card className="group border-border/80 shadow-none transition-colors hover:border-primary/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${presentation.iconClass}`}><Icon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums">{metric.value}</p>
            <p className={isWarning ? "mt-1 text-xs font-medium text-amber-700" : metric.tone === "neutral" ? "mt-1 text-xs font-medium text-muted-foreground" : "mt-1 text-xs font-medium text-primary"}>{isWarning ? "ตรวจสอบ" : metric.tone === "neutral" ? "รอข้อมูล" : presentation.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{metric.note}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CommandDeckView({
  viewModel, devices, plants, context, period, lastUpdated, pendingDeviceId, online,
  onPeriodChange, onNavigate, onDeviceRequest, onInspectPlant,
}: CommandDeckViewProps) {
  const activeCamera = context.cameras.find((camera) => camera.enabled && camera.status === "online") ?? context.cameras[0];
  const cameraZone = context.greenhouse?.zones.find((zone) => zone.id === activeCamera?.zoneId)?.name ?? activeCamera?.zone ?? "ไม่ระบุโซน";
  const soilSensors = context.sensors.filter((sensor) => sensor.metric === "soilMoisture" && sensor.status === "online");
  const systemResources = [
    [Droplets, "ระบบให้น้ำ", "pump"],
    [Lightbulb, "ระบบไฟส่องสว่าง", "light"],
    [Wind, "ระบบระบายอากาศ", "fan"],
  ] as const;
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-slate-400 shadow-[0_0_0_4px_rgba(148,163,184,.12)]" aria-hidden="true" /><div><p className="font-semibold">{viewModel.hasRecordedActivity ? "มีเหตุการณ์ที่บันทึกล่าสุด" : viewModel.hasOperationalData ? "ตั้งค่าทรัพยากรแล้ว · รอข้อมูลบันทึก" : "ยังไม่ได้ตั้งค่าทรัพยากร"}</p><p className="mt-0.5 text-sm text-muted-foreground">{viewModel.hasRecordedActivity ? `มี ${viewModel.openAlerts} รายการที่ต้องตรวจสอบ` : "ยังไม่มีค่าจากเซ็นเซอร์หรือเหตุการณ์ที่บันทึกไว้"}</p></div></div>
        <Badge variant="outline" className="w-fit rounded-full border-border bg-white px-3 py-1 text-muted-foreground">{lastUpdated ? `${online ? "เชื่อมต่อแอปแล้ว" : "การเชื่อมต่อแอปขาดหาย"} · ซิงก์ล่าสุด ${lastUpdated}` : "ยังไม่มีเวลาซิงก์ที่บันทึก"}</Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สถานะสำคัญ">{viewModel.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,.7fr)]">
        <div className="min-w-0"><div className="mb-3 flex items-center justify-end gap-2"><span className="mr-auto text-sm font-medium text-muted-foreground">แนวโน้มความชื้นดิน</span>{(["วันนี้", "7 วัน", "30 วัน"] as ChartPeriod[]).map((option) => <Button key={option} size="sm" variant={period === option ? "default" : "outline"} className="rounded-xl" onClick={() => onPeriodChange(option)}>{option}</Button>)}</div><Card className="shadow-none"><CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><p className="font-semibold">ยังไม่มีค่าความชื้นดินที่บันทึก</p><p className="mt-1 text-sm text-muted-foreground">{soilSensors.length ? `พบเซ็นเซอร์ ${soilSensors.map((sensor) => sensor.name).join(", ")} แล้ว แต่ยังไม่มีค่าตามช่วง ${period}` : "เพิ่มและเชื่อมต่อเซ็นเซอร์ความชื้นดินในโรงเรือนนี้ก่อน จึงจะแสดงกราฟได้"}</p></CardContent></Card></div>
        <div className="space-y-5">
          <Card className="overflow-hidden shadow-none"><CardHeader className="flex-row items-center justify-between pb-3"><div><p className="page-kicker">การมองเห็น</p><h2 className="mt-1 font-semibold">{activeCamera ? activeCamera.name : "ยังไม่มีกล้องในโรงเรือนนี้"}</h2><p className="mt-1 text-sm text-muted-foreground">{activeCamera ? `กล้อง${activeCamera.status === "online" ? "ออนไลน์" : "ออฟไลน์"} · ${cameraZone}` : "เพิ่มและเปิดใช้งานกล้องจากหน้าตั้งค่า"}</p></div>{activeCamera ? <Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("ai")}>ไปที่ AI</Button> : null}</CardHeader><CardContent className="pb-6 pt-0"><div className="grid aspect-[16/9] place-items-center rounded-xl bg-muted p-6 text-center text-sm text-muted-foreground"><div><p className="font-medium text-foreground">ยังไม่มีภาพที่บันทึก</p><p className="mt-1">{activeCamera ? `รอภาพจริงจาก ${activeCamera.name} ก่อนแสดงหลักฐาน` : "เพิ่มกล้องเพื่อเริ่มรับภาพ"}</p></div></div>{activeCamera ? <div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>ยังไม่มีหลักฐานภาพ</span><span>{cameraZone}</span></div> : null}</CardContent></Card>
          <Card className="shadow-none"><CardHeader className="flex-row items-center justify-between pb-2"><div><p className="page-kicker">ต้องตัดสินใจ</p><h2 className="mt-1 font-semibold">งานที่ต้องจัดการ</h2><p className="mt-1 text-sm text-muted-foreground">เรียงตามผลกระทบ</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("alerts")}>ดูทั้งหมด</Button></CardHeader><CardContent className="space-y-1 p-3 pt-0">{viewModel.workItems.slice(0, 3).map((item) => <button className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-muted" key={item.id} onClick={() => onNavigate(item.targetPage)}><span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert className="size-4" /></span><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><small className="block truncate text-muted-foreground">{item.detail}</small></span><ArrowRight className="size-4 text-muted-foreground" /></button>)}{!viewModel.workItems.length ? <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีงานเปิดอยู่ ระบบยังคงติดตามตามปกติ</p> : null}</CardContent></Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,1fr)_minmax(17rem,.72fr)]" aria-label="สถานะทรัพยากรสำคัญ">
        <Card className="border-white/70 shadow-sm"><CardHeader className="pb-3"><h2 className="font-semibold">ทรัพยากรที่ตั้งค่าไว้</h2><p className="text-sm text-muted-foreground">สถานะการกำหนดค่า ไม่ใช่สถานะจากการวัดจริง</p></CardHeader><CardContent className="flex items-center gap-6"><div className="grid size-28 shrink-0 place-items-center rounded-full border-[10px] border-slate-200 border-t-slate-400"><div className="text-center"><p className="text-2xl font-bold">{viewModel.hasPlantData ? `${viewModel.healthScore}%` : "—"}</p><p className="text-[11px] text-muted-foreground">{viewModel.hasPlantData ? "ข้อมูลพืช" : "รอข้อมูล"}</p></div></div><div className="min-w-0 flex-1 space-y-2">{systemResources.map(([Icon, label, deviceIcon]) => <button key={label} className="flex w-full items-center justify-between rounded-lg py-1 text-left hover:text-primary" onClick={() => onNavigate("devices")}><span className="flex items-center gap-2 text-sm"><Icon className="size-4 text-primary" />{label}</span><span className="text-xs font-medium text-muted-foreground">{devices.some((device) => device.icon === deviceIcon) ? "ตั้งค่าแล้ว" : "ยังไม่ตั้งค่า"}</span></button>)}</div></CardContent></Card>
        <Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between pb-3"><div><h2 className="font-semibold">อุปกรณ์ที่ตั้งค่าไว้</h2><p className="text-sm text-muted-foreground">ตั้งค่าให้เปิด {viewModel.activeDevices} จาก {viewModel.deviceCount} อุปกรณ์</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("devices")}>ดูทั้งหมด</Button></CardHeader><CardContent className="space-y-1">{devices.length ? devices.map((device) => <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0" key={device.id}><div className="min-w-0"><strong className="block truncate text-sm">{device.name}</strong><small className={device.active ? "text-primary" : "text-muted-foreground"}>{device.active ? "ตั้งค่าให้เปิด" : "ตั้งค่าให้ปิด"}</small></div><Switch aria-label={(device.active ? "ปิด" : "เปิด") + device.name} aria-describedby="dashboard-device-command-note" checked={device.active} disabled={!online || Boolean(pendingDeviceId)} onCheckedChange={() => onDeviceRequest(device)} /></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ในโรงเรือนนี้</p>}</CardContent><p className="sr-only" id="dashboard-device-command-note">{online ? "คำสั่งต้องยืนยันและรอการตอบรับก่อนเปลี่ยนสถานะ" : "ออฟไลน์ จึงปิดคำสั่งอุปกรณ์ชั่วคราว"}</p></Card>
        <Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between pb-3"><div><h2 className="font-semibold">บันทึกเหตุการณ์</h2><p className="text-sm text-muted-foreground">แสดงเฉพาะเหตุการณ์ที่มีเวลาบันทึก</p></div><Sparkles className="size-5 text-primary" /></CardHeader><CardContent className="space-y-4">{viewModel.resourceRows.length ? viewModel.resourceRows.map((row) => <button className="flex w-full items-start gap-3 text-left hover:text-primary" key={row.id} onClick={() => onNavigate(row.targetPage)}><span className={`mt-1.5 size-2 shrink-0 rounded-full ${row.tone === "warning" ? "bg-amber-400" : "bg-slate-400"}`} /><span><small className="block text-muted-foreground">{row.kind} · {row.updated}</small><strong className="block text-sm leading-snug">{row.label} · {row.status}</strong></span></button>) : <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีเหตุการณ์หรือค่าที่บันทึกไว้</p>}</CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2"><Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><div><h2 className="font-semibold">สุขภาพพืชล่าสุด</h2><p className="text-sm text-muted-foreground">{plants.some((plant) => plant.confidence !== null) ? `ค่าเฉลี่ย ${viewModel.healthScore}/100` : "ยังไม่มีผลตรวจสุขภาพพืช"}</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("plants")}>ดูทุกต้น <ArrowRight /></Button></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{plants.length ? plants.map((plant) => <button className="flex items-center justify-between rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/50" key={plant.id} onClick={() => onInspectPlant(plant.id)}><span><strong className="block text-sm">{plant.name}</strong><small className="text-muted-foreground">{plant.zone}</small></span><Badge variant={plant.health === "ปกติ" ? "secondary" : "outline"}>{plant.health}</Badge></button>) : <p className="py-5 text-center text-sm text-muted-foreground">เพิ่มรอบปลูกก่อนจึงจะมีข้อมูลสุขภาพพืช</p>}</CardContent></Card><Card className="border-white/70 bg-gradient-to-br from-emerald-950 to-emerald-800 text-white shadow-sm"><CardContent className="flex h-full min-h-44 flex-col justify-between p-6"><span className="grid size-11 place-items-center rounded-2xl bg-white/15"><Leaf /></span><div><p className="text-lg font-semibold">{viewModel.hasRecordedActivity ? "มีข้อมูลสำหรับตรวจสอบ" : viewModel.hasOperationalData ? "รอข้อมูลจากโรงเรือนนี้" : "เริ่มตั้งค่าโรงเรือนนี้"}</p><p className="mt-1 text-sm text-emerald-100">{viewModel.hasRecordedActivity ? "ตรวจสอบเหตุการณ์ที่บันทึกไว้ก่อนตัดสินใจ" : viewModel.hasOperationalData ? "ทรัพยากรถูกตั้งค่าแล้ว แต่ยังไม่มีค่าหรือเหตุการณ์ที่บันทึก" : "เพิ่มโซน อุปกรณ์ เซ็นเซอร์ หรือรอบปลูก เพื่อเริ่มติดตาม"}</p></div><Button variant="secondary" className="w-fit" onClick={() => onNavigate(viewModel.hasRecordedActivity ? "analytics" : "settings")}>{viewModel.hasRecordedActivity ? "ดูการวิเคราะห์" : "ไปที่ตั้งค่า"} <ArrowRight /></Button></CardContent></Card></section>
    </div>
  );
}
