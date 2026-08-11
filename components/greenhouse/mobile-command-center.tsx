"use client";

import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bell,
  Bot,
  CircleAlert,
  Droplets,
  Leaf,
  Menu,
  Search,
  Settings2,
  Sprout,
  ThermometerSun,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import type { DemoDevice, DemoGreenhouse, DemoPlant } from "@/lib/greenhouse-demo-store";
import type { GreenhouseContext } from "@/lib/greenhouse-domain";
import type { DashboardMetric, DashboardViewModel, GreenhousePageId, PageMetadata } from "@/lib/greenhouse-presentation";

const metricIconMap: Record<DashboardMetric["id"], { icon: typeof Leaf; className: string }> = {
  health: { icon: Leaf, className: "bg-emerald-50 text-emerald-700" },
  temperature: { icon: ThermometerSun, className: "bg-orange-50 text-orange-600" },
  humidity: { icon: Droplets, className: "bg-sky-50 text-sky-700" },
  alerts: { icon: CircleAlert, className: "bg-amber-50 text-amber-700" },
};

const bottomNavItems = [
  { id: "dashboard", label: "หน้าหลัก", icon: Activity },
  { id: "plants", label: "พืช", icon: Sprout },
  { id: "devices", label: "อุปกรณ์", icon: Wind },
  { id: "alerts", label: "แจ้งเตือน", icon: Bell },
] as const satisfies ReadonlyArray<{ id: GreenhousePageId; label: string; icon: typeof Activity }>;

function MetricTile({ metric }: { metric: DashboardMetric }) {
  const { icon: Icon, className } = metricIconMap[metric.id];
  const emphasis = metric.tone === "warning" || metric.tone === "danger";
  return (
    <Card className="border-border/70 shadow-none">
      <CardContent className="p-3.5">
        <span className={`grid size-9 place-items-center rounded-xl ${className}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <p className="mt-3 text-xs font-medium text-muted-foreground">{metric.label}</p>
        <p className="mt-0.5 text-xl font-bold tracking-tight tabular-nums">{metric.value}</p>
        <p className={emphasis ? "mt-0.5 text-xs font-medium text-amber-700" : "mt-0.5 text-xs font-medium text-primary"}>
          {emphasis ? "ต้องติดตาม" : metric.tone === "neutral" ? "รอข้อมูล" : "อยู่ในเกณฑ์"}
        </p>
      </CardContent>
    </Card>
  );
}

function MobilePageIntro({
  metadata,
  greenhouse,
  refreshing,
  onExport,
  onRefresh,
}: {
  metadata: PageMetadata;
  greenhouse: DemoGreenhouse;
  refreshing: boolean;
  onExport: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="space-y-3">
      <p className="page-kicker">{greenhouse.name} · {greenhouse.code}</p>
      <h1 className="text-2xl font-semibold tracking-tight">{metadata.title}</h1>
      <p className="text-sm leading-6 text-muted-foreground">{metadata.description}</p>
      <span className="flex gap-2 pt-1">
        <Button variant="outline" className="min-h-11 flex-1 bg-card" onClick={onExport}>ส่งออก</Button>
        <Button className="min-h-11 flex-1" disabled={refreshing} onClick={onRefresh}>{refreshing ? "กำลังอัปเดต" : "รีเฟรช"}</Button>
      </span>
    </header>
  );
}

export function MobileAppShell({
  activePage,
  greenhouse,
  openAlerts,
  online,
  children,
  onNavigate,
  onOpenSearch,
  onOpenAlerts,
  onNotify,
}: {
  activePage: GreenhousePageId;
  greenhouse: DemoGreenhouse;
  openAlerts: number;
  online: boolean;
  children: ReactNode;
  onNavigate: (page: GreenhousePageId) => void;
  onOpenSearch: () => void;
  onOpenAlerts: () => void;
  onNotify: (message: string) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = !bottomNavItems.some((item) => item.id === activePage);

  return (
    <section className="min-h-svh min-w-0 w-full bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/92 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <span className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Leaf className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm">Smart Greenhouse</strong>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={online ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-amber-500"} aria-hidden="true" />
              {greenhouse.name} · {online ? "ออนไลน์" : "ออฟไลน์"}
            </span>
          </span>
          <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="ค้นหา" onClick={onOpenSearch}>
            <Search aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="relative size-11 shrink-0" aria-label={`การแจ้งเตือน ${openAlerts} รายการ`} onClick={onOpenAlerts}>
            <Bell aria-hidden="true" />
            {openAlerts ? <Badge className="absolute right-0 top-0 min-w-5 justify-center px-1" variant="destructive">{openAlerts}</Badge> : null}
          </Button>
        </span>
      </header>

      <main className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(24,55,38,.06)] backdrop-blur-xl" aria-label="เมนูหลักบนมือถือ">
        <span className="mx-auto flex max-w-md items-end justify-around gap-1">
          {bottomNavItems.map(({ id, label, icon: Icon }) => {
            const active = activePage === id;
            return (
              <Button
                key={id}
                variant="ghost"
                className={`relative min-h-12 min-w-0 flex-1 flex-col gap-0.5 rounded-2xl px-1 py-1.5 text-[0.6875rem] ${active ? "bg-secondary text-primary" : "text-muted-foreground"}`}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(id)}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{label}</span>
                {id === "alerts" && openAlerts ? <span className="absolute right-1/4 top-1 size-2 rounded-full bg-destructive" aria-hidden="true" /> : null}
              </Button>
            );
          })}
          <Button
            variant="ghost"
            className={`min-h-12 min-w-0 flex-1 flex-col gap-0.5 rounded-2xl px-1 py-1.5 text-[0.6875rem] ${moreActive ? "bg-secondary text-primary" : "text-muted-foreground"}`}
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <Menu className="size-5" aria-hidden="true" />
            <span>เพิ่มเติม</span>
          </Button>
        </span>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="px-1 text-left">
            <SheetTitle>เมนูเพิ่มเติม</SheetTitle>
            <SheetDescription>เข้าถึงเครื่องมือวิเคราะห์และการตั้งค่าระบบ</SheetDescription>
          </SheetHeader>
          <span className="mt-4 grid gap-2">
            <Button variant="outline" className="min-h-12 justify-start gap-3" onClick={() => { setMoreOpen(false); onNavigate("ai"); }}><Bot aria-hidden="true" />การตรวจจับ AI</Button>
            <Button variant="outline" className="min-h-12 justify-start gap-3" onClick={() => { setMoreOpen(false); onNavigate("analytics"); }}><Activity aria-hidden="true" />การวิเคราะห์</Button>
            <Button variant="outline" className="min-h-12 justify-start gap-3" onClick={() => { setMoreOpen(false); onNavigate("settings"); }}><Settings2 aria-hidden="true" />ตั้งค่า</Button>
            <Button variant="ghost" className="min-h-12 justify-start gap-3 text-muted-foreground" onClick={() => { setMoreOpen(false); onNotify("บัญชีเดโมยังคงเปิดใช้งานอยู่"); }}><span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold text-primary">PW</span>บัญชีเดโม · ผู้ดูแลระบบ</Button>
          </span>
        </SheetContent>
      </Sheet>
    </section>
  );
}

export function MobileCommandCenter({
  viewModel,
  devices,
  plants,
  context,
  lastUpdated,
  pendingDeviceId,
  online,
  onNavigate,
  onDeviceRequest,
  onInspectPlant,
}: {
  viewModel: DashboardViewModel;
  devices: DemoDevice[];
  plants: DemoPlant[];
  context: GreenhouseContext;
  lastUpdated: string | null;
  pendingDeviceId: string | null;
  online: boolean;
  onNavigate: (page: GreenhousePageId) => void;
  onDeviceRequest: (device: DemoDevice) => void;
  onInspectPlant: (plantId: string) => void;
}) {
  const previewPlants = plants.slice(0, 3);
  const previewDevices = devices.slice(0, 3);
  const activeCamera = context.cameras.find((camera) => camera.enabled && camera.status === "online") ?? context.cameras[0];

  return (
    <section className="space-y-5 px-4 pb-6 pt-4">
      <Card className="relative overflow-hidden border-0 bg-primary text-primary-foreground shadow-lg shadow-primary/15">
        <CardContent className="relative p-5">
          <span className="flex items-start justify-between gap-3">
            <span>
              <span className="text-xs font-medium text-primary-foreground/70">ศูนย์ปฏิบัติการ</span>
              <h1 className="mt-1 text-xl font-semibold tracking-tight">{viewModel.openAlerts ? "มีงานต้องจัดการ" : "โรงเรือนพร้อมดูแล"}</h1>
            </span>
            <Badge className="border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground" variant="outline">{online ? "LIVE" : "OFFLINE"}</Badge>
          </span>
          <p className="mt-2 max-w-[18rem] text-sm leading-6 text-primary-foreground/75">
            {viewModel.openAlerts ? `พบ ${viewModel.openAlerts} รายการที่ควรตรวจสอบก่อน` : "ภาพรวมสถานะล่าสุดของโรงเรือนที่เลือก"}
          </p>
          <span className="mt-5 flex items-center gap-2 text-xs text-primary-foreground/65">
            <span className="size-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            {lastUpdated ? `ซิงก์ล่าสุด ${lastUpdated}` : "รอการซิงก์ครั้งแรก"}
          </span>
        </CardContent>
      </Card>

      <section aria-labelledby="mobile-kpi-title" className="space-y-3">
        <span className="flex items-center justify-between gap-3">
          <h2 id="mobile-kpi-title" className="text-base font-semibold">ภาพรวมวันนี้</h2>
          <span className="text-xs text-muted-foreground">อัปเดตตามข้อมูลจริง</span>
        </span>
        <span className="grid grid-cols-2 gap-3">
          {viewModel.metrics.map((metric) => <MetricTile key={metric.id} metric={metric} />)}
        </span>
      </section>

      <Card className="overflow-hidden border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <span>
            <p className="page-kicker">AI INSIGHT</p>
            <h2 className="mt-1 text-base font-semibold">สุขภาพพืช</h2>
          </span>
          <Badge variant={viewModel.hasPlantData ? "secondary" : "outline"}>{viewModel.hasPlantData ? `${viewModel.healthScore}%` : "รอข้อมูล"}</Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <span className="flex items-center gap-3 rounded-2xl bg-secondary/70 p-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-primary"><Leaf className="size-5" aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <strong className="block text-sm">{viewModel.hasPlantData ? "ผลตรวจล่าสุดพร้อมดู" : "ยังไม่มีผลตรวจ AI"}</strong>
              <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{viewModel.hasPlantData ? "เปิดดูต้นที่ต้องตรวจสอบหรือผลตรวจล่าสุด" : "เพิ่มกล้องและรอภาพจริงเพื่อเริ่มวิเคราะห์"}</span>
            </span>
            <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden="true" />
          </span>
          <Button variant="outline" className="mt-3 min-h-11 w-full" onClick={() => onNavigate(viewModel.hasPlantData ? "plants" : "ai")}>
            {viewModel.hasPlantData ? "ดูข้อมูลพืช" : "ไปที่การตรวจจับ AI"}
          </Button>
        </CardContent>
      </Card>

      <section aria-labelledby="mobile-alerts-title" className="space-y-3">
        <span className="flex items-center justify-between gap-3">
          <span>
            <p className="page-kicker">PRIORITY QUEUE</p>
            <h2 id="mobile-alerts-title" className="mt-1 text-base font-semibold">ต้องตัดสินใจ</h2>
          </span>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("alerts")}>ดูทั้งหมด <ArrowRight aria-hidden="true" /></Button>
        </span>
        <Card className="overflow-hidden border-border/70 shadow-none">
          <CardContent className="p-2">
            {viewModel.workItems.slice(0, 3).map((item) => (
              <Button key={item.id} variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-2 py-2 text-left" onClick={() => onNavigate(item.targetPage)}>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><CircleAlert className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm">{item.title}</strong>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span>
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Button>
            ))}
            {!viewModel.workItems.length ? <span className="block px-3 py-6 text-center text-sm text-muted-foreground">ไม่มีงานเปิดอยู่ ระบบยังคงติดตามตามปกติ</span> : null}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="mobile-actions-title" className="space-y-3">
        <h2 id="mobile-actions-title" className="text-base font-semibold">ทางลัด</h2>
        <span className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="min-h-20 flex-col gap-1.5 rounded-2xl bg-card px-2 text-xs" onClick={() => onNavigate("ai")}><Bot className="size-5 text-primary" aria-hidden="true" />สแกนพืช</Button>
          <Button variant="outline" className="min-h-20 flex-col gap-1.5 rounded-2xl bg-card px-2 text-xs" onClick={() => onNavigate("devices")}><Droplets className="size-5 text-primary" aria-hidden="true" />ควบคุมน้ำ</Button>
          <Button variant="outline" className="min-h-20 flex-col gap-1.5 rounded-2xl bg-card px-2 text-xs" onClick={() => onNavigate(activeCamera ? "ai" : "settings")}><Activity className="size-5 text-primary" aria-hidden="true" />เปิดกล้อง</Button>
        </span>
      </section>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <span>
            <p className="page-kicker">CONTROL</p>
            <h2 className="mt-1 text-base font-semibold">อุปกรณ์</h2>
          </span>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("devices")}>จัดการ <ArrowRight aria-hidden="true" /></Button>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {previewDevices.map((device) => (
            <span key={device.id} className="flex min-h-14 items-center gap-3 border-b border-border/60 py-2 last:border-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Wind className="size-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{device.name}</strong>
                <span className={device.active ? "text-xs text-primary" : "text-xs text-muted-foreground"}>{device.active ? "กำลังทำงาน" : "หยุดอยู่"}</span>
              </span>
              <Switch aria-label={(device.active ? "ปิด " : "เปิด ") + device.name} aria-describedby="mobile-device-command-note" checked={device.active} disabled={!online || Boolean(pendingDeviceId)} onCheckedChange={() => onDeviceRequest(device)} />
            </span>
          ))}
          {!previewDevices.length ? <span className="block py-5 text-center text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ในโรงเรือนนี้</span> : null}
          <span className="sr-only" id="mobile-device-command-note">คำสั่งต้องยืนยันและรอการตอบรับก่อนเปลี่ยนสถานะ</span>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
          <span>
            <p className="page-kicker">PLANT CHECK</p>
            <h2 className="mt-1 text-base font-semibold">พืชล่าสุด</h2>
          </span>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => onNavigate("plants")}>ดูทั้งหมด <ArrowRight aria-hidden="true" /></Button>
        </CardHeader>
        <CardContent className="space-y-1 pt-0">
          {previewPlants.map((plant) => (
            <Button key={plant.id} variant="ghost" className="h-auto min-h-14 w-full justify-start gap-3 rounded-xl px-2 py-2 text-left" onClick={() => onInspectPlant(plant.id)}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sprout className="size-4" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{plant.name}</strong><span className="mt-0.5 block truncate text-xs text-muted-foreground">{plant.zone}</span></span>
              <Badge variant={plant.health === "ควรตรวจสอบ" ? "destructive" : plant.health === "ปกติ" ? "secondary" : "outline"}>{plant.health}</Badge>
            </Button>
          ))}
          {!previewPlants.length ? <span className="block py-5 text-center text-sm text-muted-foreground">เพิ่มรอบปลูกเพื่อเริ่มติดตามพืช</span> : null}
        </CardContent>
      </Card>
    </section>
  );
}

export { MobilePageIntro };
