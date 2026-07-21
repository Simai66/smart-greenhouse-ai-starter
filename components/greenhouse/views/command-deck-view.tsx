"use client";

import Image from "next/image";
import {
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SoilMoistureChart } from "@/components/greenhouse/charts/soil-moisture-chart";
import {
  soilMoistureSeries,
  type ChartPeriod,
  type DashboardViewModel,
  type GreenhousePageId,
} from "@/lib/greenhouse-presentation";
import type {
  DemoDevice,
  DemoPlant,
} from "@/lib/greenhouse-demo-store";

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

export function CommandDeckView({
  viewModel,
  devices,
  plants,
  period,
  lastUpdated,
  pendingDeviceId,
  online,
  onNavigate,
  onDeviceRequest,
  onInspectPlant,
}: CommandDeckViewProps) {
  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-secondary p-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="flex items-center gap-2 font-semibold">
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            {online ? "ระบบทำงานปกติ" : "ระบบออฟไลน์ · แสดงข้อมูลล่าสุด"}
          </p>
          <p className="text-sm text-muted-foreground">
            อุปกรณ์ออนไลน์ {online ? viewModel.deviceCount : 0}/{viewModel.deviceCount} ·
            มี {viewModel.openAlerts} รายการที่ต้องตรวจสอบ
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {online ? "LIVE" : "STALE"} · อัปเดต {lastUpdated}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สถานะสำคัญ">
        {viewModel.metrics.map((metric) => (
          <Card key={metric.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <Badge variant={metric.tone === "danger" ? "destructive" : metric.tone === "healthy" ? "secondary" : "outline"}>
                  {metric.tone === "healthy" ? "ปกติ" : "ตรวจสอบ"}
                </Badge>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,.55fr)]">
        <SoilMoistureChart
          points={soilMoistureSeries[period]}
          rangeLabel={period}
          targetMin={50}
          targetMax={65}
          recommendation="เปิดปั๊มน้ำโซน A 10 นาที แล้วตรวจค่าอีกครั้งใน 15 นาที"
        />
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><h2 className="font-semibold">งานที่ต้องจัดการ</h2><p className="text-sm text-muted-foreground">เรียงตามผลกระทบ</p></div>
            <Badge variant="outline">{viewModel.openAlerts} เปิดอยู่</Badge>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {viewModel.workItems.map((item) => (
              <button
                className="grid min-h-20 w-full grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3 px-5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={item.id}
                onClick={() => onNavigate(item.targetPage)}
              >
                <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-800"><CircleAlert aria-hidden="true" /></span>
                <span><strong className="block text-sm">{item.title}</strong><small className="line-clamp-2 text-muted-foreground">{item.detail}</small><small className="text-muted-foreground">{item.time}</small></span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ))}
            {!viewModel.workItems.length ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                ไม่มีงานเปิดอยู่ ระบบยังคงติดตามโรงเรือนตามปกติ
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div><h2 className="font-semibold">สถานะทรัพยากรสำคัญ</h2><p className="text-sm text-muted-foreground">พืช อุปกรณ์ และเซ็นเซอร์ที่สัมพันธ์กับงานเปิดอยู่</p></div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader><TableRow><TableHead>รายการ</TableHead><TableHead>ประเภท</TableHead><TableHead>สถานะ</TableHead><TableHead>อัปเดตล่าสุด</TableHead></TableRow></TableHeader>
            <TableBody>{viewModel.resourceRows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.label}</TableCell><TableCell>{row.kind}</TableCell><TableCell><Badge variant={row.tone === "warning" ? "outline" : "secondary"}>{row.status}</Badge></TableCell><TableCell>{row.updated}</TableCell></TableRow>)}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <section className="relative min-h-44 overflow-hidden rounded-xl border bg-muted">
        <Image src="/images/greenhouse-overview.webp" alt="ภาพสดจากกล้องจำลอง 01 ภายในโรงเรือนมะเขือเทศ" fill unoptimized className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 bg-emerald-950/80 p-4 text-white">
          <strong>ภาพสดจากกล้องจำลอง 01</strong>
          <p className="text-sm text-emerald-50">มะเขือเทศ · หลังที่ 1 · อัปเดตเมื่อครู่</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between"><div><h2 className="font-semibold">อุปกรณ์</h2><p className="text-sm text-muted-foreground">เปิดใช้งาน {viewModel.activeDevices} จาก {viewModel.deviceCount}</p></div><Button variant="ghost" onClick={() => onNavigate("devices")}>จัดการทั้งหมด <ArrowRight aria-hidden="true" /></Button></CardHeader>
          <CardContent className="divide-y">{devices.map((device) => <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3" key={device.id}><div><strong className="text-sm">{device.name}</strong><p className="text-xs text-muted-foreground">{device.detail}</p></div><Switch aria-label={(device.active ? "ปิด" : "เปิด") + device.name} aria-describedby="dashboard-device-demo-note" checked={device.active} disabled={!online || Boolean(pendingDeviceId)} onCheckedChange={() => onDeviceRequest(device)} /></div>)}</CardContent>
          <p className="sr-only" id="dashboard-device-demo-note">{online ? "คำสั่งเดโมต้องยืนยันและรอการตอบรับก่อนเปลี่ยนสถานะ" : "ออฟไลน์ จึงปิดคำสั่งอุปกรณ์ชั่วคราว"}</p>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between"><div><h2 className="font-semibold">สุขภาพพืชล่าสุด</h2><p className="text-sm text-muted-foreground">ค่าเฉลี่ย {viewModel.healthScore}/100</p></div><Button variant="ghost" onClick={() => onNavigate("plants")}>ดูทุกต้น <ArrowRight aria-hidden="true" /></Button></CardHeader>
          <CardContent className="divide-y">{plants.map((plant) => <button className="flex min-h-14 w-full items-center justify-between gap-3 text-left" key={plant.id} onClick={() => onInspectPlant(plant.id)}><span><strong className="block text-sm">{plant.name}</strong><small className="text-muted-foreground">{plant.zone}</small></span><Badge variant={plant.health === "ปกติ" ? "secondary" : "outline"}>{plant.health}</Badge></button>)}</CardContent>
        </Card>
      </section>
    </div>
  );
}
