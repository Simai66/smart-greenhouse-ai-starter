"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
import { DashboardSoilMoistureChart, type SoilMoistureZone } from "@/components/greenhouse/charts/soil-moisture-chart";
import {
  soilMoistureSeries,
  type ChartPeriod,
  type DashboardMetric,
  type DashboardViewModel,
  type GreenhousePageId,
} from "@/lib/greenhouse-presentation";
import type { DemoDevice, DemoPlant } from "@/lib/greenhouse-demo-store";

export type CommandDeckViewProps = {
  viewModel: DashboardViewModel;
  devices: DemoDevice[];
  plants: DemoPlant[];
  period: ChartPeriod;
  lastUpdated: string;
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

const metricTrends: Record<DashboardMetric["id"], number[]> = {
  health: [54, 56, 57, 56, 61, 62, 66, 65, 67, 70],
  temperature: [48, 51, 54, 62, 66, 61, 58, 64, 68, 63],
  humidity: [51, 52, 52, 53, 55, 61, 60, 62, 62, 64],
  alerts: [65, 65, 62, 59, 55, 51, 45, 43, 39, 36],
};

function MetricTrend({ metric }: { metric: DashboardMetric }) {
  const values = metricTrends[metric.id];
  const coordinates = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 100,
    y: 100 - value,
  }));
  const stepPath = coordinates.reduce(
    (path, point, index) => index === 0
      ? `M ${point.x} ${point.y}`
      : `${path} H ${point.x} V ${point.y}`,
    "",
  );
  const areaPath = `${stepPath} V 100 H 0 Z`;
  const colorClass = metric.tone === "warning" || metric.tone === "danger" ? "text-amber-500" : "text-primary";
  return (
    <svg className={`mt-4 h-10 w-full ${colorClass}`} viewBox="0 0 100 100" role="img" aria-label={`กราฟแนวโน้ม ${metric.label}`} preserveAspectRatio="none">
      <g stroke="currentColor" strokeOpacity="0.14" strokeWidth="1" vectorEffect="non-scaling-stroke">
        <path d="M 0 25 H 100 M 0 50 H 100 M 0 75 H 100" />
        <path d="M 20 0 V 100 M 40 0 V 100 M 60 0 V 100 M 80 0 V 100" />
      </g>
      <path d={areaPath} fill="currentColor" opacity="0.1" />
      <path d={stepPath} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

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
            <p className={isWarning ? "mt-1 text-xs font-medium text-amber-700" : "mt-1 text-xs font-medium text-primary"}>{isWarning ? "ตรวจสอบ" : presentation.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{metric.note}</p>
          </div>
        </div>
        <MetricTrend metric={metric} />
      </CardContent>
    </Card>
  );
}

export function CommandDeckView({
  viewModel, devices, plants, period, lastUpdated, pendingDeviceId, online,
  onPeriodChange, onNavigate, onDeviceRequest, onInspectPlant,
}: CommandDeckViewProps) {
  const [soilMoistureZone, setSoilMoistureZone] = useState<SoilMoistureZone>("all");
  const dashboardSoilMoisture = useMemo(() => ({
    zoneA: soilMoistureSeries[period],
    zoneB: soilMoistureSeries[period].map((point, index) => ({
      ...point,
      value: Math.max(0, Math.min(100, point.value + [1, -1, 2, 3, 4, 5, 6][index % 7])),
    })),
  }), [period]);
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><span className="mt-1 size-2.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(34,197,94,.12)]" aria-hidden="true" /><div><p className="font-semibold">{online ? "ระบบทำงานปกติ" : "ระบบออฟไลน์ · แสดงข้อมูลล่าสุด"}</p><p className="mt-0.5 text-sm text-muted-foreground">อุปกรณ์ออนไลน์ {online ? viewModel.deviceCount : 0}/{viewModel.deviceCount} · มี {viewModel.openAlerts} รายการที่ต้องตรวจสอบ</p></div></div>
        <Badge variant="outline" className="w-fit rounded-full border-emerald-200 bg-white px-3 py-1 text-primary">{online ? "LIVE" : "STALE"} · อัปเดต {lastUpdated}</Badge>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สถานะสำคัญ">{viewModel.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}</section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(19rem,.7fr)]">
        <div className="min-w-0"><div className="mb-3 flex items-center justify-end gap-2"><span className="mr-auto text-sm font-medium text-muted-foreground">แนวโน้มความชื้นดิน</span>{(["วันนี้", "7 วัน", "30 วัน"] as ChartPeriod[]).map((option) => <Button key={option} size="sm" variant={period === option ? "default" : "outline"} className="rounded-xl" onClick={() => onPeriodChange(option)}>{option}</Button>)}</div><DashboardSoilMoistureChart pointsByZone={dashboardSoilMoisture} rangeLabel={period} targetMin={50} targetMax={65} selectedZone={soilMoistureZone} onSelectedZoneChange={setSoilMoistureZone} /></div>
        <div className="space-y-5">
          <Card className="overflow-hidden shadow-none"><CardHeader className="flex-row items-center justify-between pb-3"><div><p className="page-kicker">การมองเห็น</p><h2 className="mt-1 font-semibold">ภาพสดจากกล้องจำลอง 01</h2><p className="mt-1 text-sm text-muted-foreground">ภาพล่าสุดจากโรงเรือน</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("plants")}>ดูทั้งหมด</Button></CardHeader><CardContent className="p-4 pt-0"><button className="group relative block aspect-[16/9] w-full overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onNavigate("plants")}><Image src="/images/greenhouse-overview.webp" alt="ภาพสดจากกล้องจำลอง 01 ภายในโรงเรือนมะเขือเทศ" fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" /></button><div className="mt-3 flex justify-between text-xs text-muted-foreground"><span>อัปเดตล่าสุด: 07:00 น.</span><span>โซน A</span></div></CardContent></Card>
          <Card className="shadow-none"><CardHeader className="flex-row items-center justify-between pb-2"><div><p className="page-kicker">ต้องตัดสินใจ</p><h2 className="mt-1 font-semibold">งานที่ต้องจัดการ</h2><p className="mt-1 text-sm text-muted-foreground">เรียงตามผลกระทบ</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("alerts")}>ดูทั้งหมด</Button></CardHeader><CardContent className="space-y-1 p-3 pt-0">{viewModel.workItems.slice(0, 3).map((item) => <button className="grid w-full grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-muted" key={item.id} onClick={() => onNavigate(item.targetPage)}><span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600"><CircleAlert className="size-4" /></span><span className="min-w-0"><strong className="block truncate text-sm">{item.title}</strong><small className="block truncate text-muted-foreground">{item.detail}</small></span><ArrowRight className="size-4 text-muted-foreground" /></button>)}{!viewModel.workItems.length ? <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีงานเปิดอยู่ ระบบยังคงติดตามตามปกติ</p> : null}</CardContent></Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(19rem,1fr)_minmax(17rem,.72fr)]" aria-label="สถานะทรัพยากรสำคัญ">
        <Card className="border-white/70 shadow-sm"><CardHeader className="pb-3"><h2 className="font-semibold">ประสิทธิภาพระบบ</h2><p className="text-sm text-muted-foreground">ภาพรวมการทำงานของโรงเรือน</p></CardHeader><CardContent className="flex items-center gap-6"><div className="grid size-28 shrink-0 place-items-center rounded-full border-[10px] border-emerald-100 border-t-primary"><div className="text-center"><p className="text-2xl font-bold">{viewModel.healthScore}%</p><p className="text-[11px] text-muted-foreground">ภาพรวม</p></div></div><div className="min-w-0 flex-1 space-y-2">{[[Droplets, "ระบบให้น้ำ"], [Lightbulb, "ระบบไฟส่องสว่าง"], [Wind, "ระบบระบายอากาศ"]].map(([Icon, label]) => { const StatusIcon = Icon as typeof Droplets; return <button key={label as string} className="flex w-full items-center justify-between rounded-lg py-1 text-left hover:text-primary" onClick={() => onNavigate("devices")}><span className="flex items-center gap-2 text-sm"><StatusIcon className="size-4 text-primary" />{label as string}</span><span className="text-xs font-medium text-primary">ปกติ</span></button>; })}</div></CardContent></Card>
        <Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between pb-3"><div><h2 className="font-semibold">อุปกรณ์ที่กำลังทำงาน</h2><p className="text-sm text-muted-foreground">{viewModel.activeDevices} จาก {viewModel.deviceCount} อุปกรณ์</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("devices")}>ดูทั้งหมด</Button></CardHeader><CardContent className="space-y-1">{devices.map((device) => <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border/60 py-2 last:border-0" key={device.id}><div className="min-w-0"><strong className="block truncate text-sm">{device.name}</strong><small className={device.active ? "text-primary" : "text-muted-foreground"}>{device.active ? "ทำงาน" : "หยุด"}</small></div><Switch aria-label={(device.active ? "ปิด" : "เปิด") + device.name} aria-describedby="dashboard-device-demo-note" checked={device.active} disabled={!online || Boolean(pendingDeviceId)} onCheckedChange={() => onDeviceRequest(device)} /></div>)}</CardContent><p className="sr-only" id="dashboard-device-demo-note">{online ? "คำสั่งเดโมต้องยืนยันและรอการตอบรับก่อนเปลี่ยนสถานะ" : "ออฟไลน์ จึงปิดคำสั่งอุปกรณ์ชั่วคราว"}</p></Card>
        <Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between pb-3"><div><h2 className="font-semibold">บันทึกล่าสุด</h2><p className="text-sm text-muted-foreground">กิจกรรมในวันนี้</p></div><Sparkles className="size-5 text-primary" /></CardHeader><CardContent className="space-y-4">{viewModel.resourceRows.map((row) => <button className="flex w-full items-start gap-3 text-left hover:text-primary" key={row.id} onClick={() => onNavigate(row.kind === "พืช" ? "plants" : row.kind === "อุปกรณ์" ? "devices" : "analytics")}><span className={`mt-1.5 size-2 shrink-0 rounded-full ${row.tone === "warning" ? "bg-amber-400" : "bg-emerald-500"}`} /><span><small className="block text-muted-foreground">{row.kind} · {row.updated}</small><strong className="block text-sm leading-snug">{row.label} · {row.status}</strong></span></button>)}</CardContent></Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2"><Card className="border-white/70 shadow-sm"><CardHeader className="flex-row items-center justify-between"><div><h2 className="font-semibold">สุขภาพพืชล่าสุด</h2><p className="text-sm text-muted-foreground">ค่าเฉลี่ย {viewModel.healthScore}/100</p></div><Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("plants")}>ดูทุกต้น <ArrowRight /></Button></CardHeader><CardContent className="grid gap-2 sm:grid-cols-2">{plants.map((plant) => <button className="flex items-center justify-between rounded-xl border border-border/70 p-3 text-left transition-colors hover:border-emerald-200 hover:bg-emerald-50/50" key={plant.id} onClick={() => onInspectPlant(plant.id)}><span><strong className="block text-sm">{plant.name}</strong><small className="text-muted-foreground">{plant.zone}</small></span><Badge variant={plant.health === "ปกติ" ? "secondary" : "outline"}>{plant.health}</Badge></button>)}</CardContent></Card><Card className="border-white/70 bg-gradient-to-br from-emerald-950 to-emerald-800 text-white shadow-sm"><CardContent className="flex h-full min-h-44 flex-col justify-between p-6"><span className="grid size-11 place-items-center rounded-2xl bg-white/15"><Leaf /></span><div><p className="text-lg font-semibold">โรงเรือนพร้อมสำหรับวันนี้</p><p className="mt-1 text-sm text-emerald-100">ระบบกำลังติดตามพืชและอุปกรณ์อย่างต่อเนื่อง</p></div><Button variant="secondary" className="w-fit" onClick={() => onNavigate("analytics")}>ดูการวิเคราะห์ <ArrowRight /></Button></CardContent></Card></section>
    </div>
  );
}
