"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CloudSun,
  Droplets,
  Fan,
  Gauge,
  Lightbulb,
  MapPin,
  PlugZap,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DemoDevice } from "@/lib/greenhouse-demo-store";
import type { GreenhouseContext } from "@/lib/greenhouse-domain";

const icons = {
  pump: Droplets,
  fan: Fan,
  light: Lightbulb,
  mist: CloudSun,
} as const;

type FilterStatus = "all" | "running" | "stopped";
type DeviceKind = "all" | DemoDevice["icon"];

const typeLabels: Record<DemoDevice["icon"], string> = {
  pump: "ปั๊มน้ำ",
  fan: "ระบายอากาศ",
  light: "ไฟปลูกพืช",
  mist: "พ่นหมอก",
};

export function DevicesView({
  devices,
  context,
  pendingDeviceId,
  onRequest,
}: {
  devices: DemoDevice[];
  context: GreenhouseContext;
  pendingDeviceId: string | null;
  /** Kept for the command-dialog integration; not a device connectivity signal. */
  online: boolean;
  onRequest: (device: DemoDevice) => void;
}) {
  const [zone, setZone] = useState("all");
  const [kind, setKind] = useState<DeviceKind>("all");
  const [status, setStatus] = useState<FilterStatus>("all");
  const zoneOptions = useMemo(() => {
    const names = new Map<string, string>();
    context.greenhouse?.zones.forEach((item) => names.set(item.id, item.name));
    devices.forEach((device) => {
      if (device.zoneId && !names.has(device.zoneId)) names.set(device.zoneId, device.zoneId);
    });
    return [...names.entries()].map(([id, name]) => ({ id, name }));
  }, [context.greenhouse?.zones, devices]);
  const selectedZone = zoneOptions.some((item) => item.id === zone) ? zone : "all";
  const visibleDevices = useMemo(
    () => devices.filter((device) => {
      return (selectedZone === "all" || device.zoneId === selectedZone) &&
        (kind === "all" || device.icon === kind) &&
        (status === "all" || (status === "running" ? device.active : !device.active));
    }),
    [devices, kind, selectedZone, status],
  );
  const activeDevices = devices.filter((device) => device.active).length;
  const configuredZones = new Set(devices.map((device) => device.zoneId).filter(Boolean)).size;

  return (
    <section className="space-y-6" aria-labelledby="device-operations-title">
      <header className="border-b border-border/70 pb-5 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary"><SlidersHorizontal className="size-4" aria-hidden="true" />Operations board</p>
            <h2 id="device-operations-title" className="mt-1 text-2xl font-semibold tracking-tight">ควบคุมอุปกรณ์โรงเรือน</h2>
            <p id="device-command-note" role="note" className="mt-2 max-w-2xl text-sm text-muted-foreground">รายการอุปกรณ์ที่ตั้งค่าไว้ในโรงเรือนนี้ การเปิด–ปิดทุกครั้งต้องยืนยันก่อน</p>
          </div>
          <Badge variant="outline" className="w-fit px-3 py-1.5">{devices.length} รายการที่ตั้งค่า</Badge>
        </div>
      </header>

      <div className="quiet-surface grid divide-y divide-border/70 overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4" aria-label="สรุปการทำงานของอุปกรณ์">
        {[
          { label: "อุปกรณ์ที่ลงทะเบียน", value: `${devices.length} เครื่อง`, note: "ในโรงเรือนที่เลือก", icon: PlugZap },
          { label: "ตั้งค่าให้เปิด", value: `${activeDevices} เครื่อง`, note: "สถานะที่บันทึกไว้", icon: Activity },
          { label: "ตั้งค่าให้ปิด", value: `${devices.length - activeDevices} เครื่อง`, note: "สถานะที่บันทึกไว้", icon: SlidersHorizontal },
          { label: "โซนที่มีอุปกรณ์", value: `${configuredZones} โซน`, note: "จากการผูกอุปกรณ์", icon: MapPin },
        ].map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="flex items-start gap-3 p-4 sm:p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm text-muted-foreground">{label}</span><strong className="block text-2xl tabular-nums">{value}</strong><span className="block text-xs text-muted-foreground">{note}</span></span>
          </article>
        ))}
      </div>

      <Card className="shadow-none">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2"><Gauge className="size-4 text-primary" aria-hidden="true" /><span className="text-sm font-medium">กรองอุปกรณ์</span></div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select value={selectedZone} onValueChange={setZone}>
              <SelectTrigger aria-label="กรองตามโซน"><SelectValue placeholder="ทุกโซน" /></SelectTrigger>
              <SelectContent><SelectItem value="all">ทุกโซน</SelectItem>{zoneOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={kind} onValueChange={(value) => setKind(value as DeviceKind)}>
              <SelectTrigger aria-label="กรองตามประเภท"><SelectValue placeholder="ทุกประเภท" /></SelectTrigger>
              <SelectContent><SelectItem value="all">ทุกประเภท</SelectItem>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={status} onValueChange={(value) => setStatus(value as FilterStatus)}>
              <SelectTrigger aria-label="กรองตามสถานะ"><SelectValue placeholder="ทุกสถานะ" /></SelectTrigger>
              <SelectContent><SelectItem value="all">ทุกสถานะ</SelectItem><SelectItem value="running">กำลังทำงาน</SelectItem><SelectItem value="stopped">หยุดอยู่</SelectItem></SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="grid gap-4 md:grid-cols-2 xl:col-span-2" aria-label="รายการอุปกรณ์">
          {visibleDevices.map((device) => {
            const Icon = icons[device.icon];
            const pending = pendingDeviceId === device.id;
            const zoneName = context.greenhouse?.zones.find((item) => item.id === device.zoneId)?.name ?? device.zoneId ?? "ไม่ระบุโซน";
            return (
              <Card key={device.id} className="group overflow-hidden shadow-none transition-colors hover:border-primary/30">
                <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" aria-hidden="true" /></span>
                    <div className="min-w-0"><CardTitle className="truncate text-base">{device.name}</CardTitle><CardDescription className="mt-1">{zoneName} · {typeLabels[device.icon]}</CardDescription></div>
                  </div>
                  <Switch aria-label={(device.active ? "ปิด " : "เปิด ") + device.name} aria-describedby="device-command-note" checked={device.active} disabled={Boolean(pendingDeviceId)} onCheckedChange={() => onRequest(device)} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={device.active ? "secondary" : "outline"}>{pending ? "รอยืนยันการเปลี่ยนแปลง" : device.active ? "ตั้งค่าให้เปิด" : "ตั้งค่าให้ปิด"}</Badge>
                  </div>
                  <dl className="grid gap-3 border-y py-3 text-sm">
                    <div><dt className="text-xs text-muted-foreground">โซนที่ผูกไว้</dt><dd className="mt-1 font-medium">{zoneName}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">รายละเอียดการตั้งค่า</dt><dd className="mt-1 font-medium">{device.detail || "ยังไม่ได้ระบุรายละเอียด"}</dd></div>
                  </dl>
                </CardContent>
              </Card>
            );
          })}
          {visibleDevices.length === 0 ? <Card className="md:col-span-2"><CardContent className="py-12 text-center"><Gauge className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">ไม่พบอุปกรณ์ตามตัวกรอง</h3><p className="mt-1 text-sm text-muted-foreground">ลองเปลี่ยนโซน ประเภท หรือสถานะที่เลือก</p></CardContent></Card> : null}
        </section>

        <aside className="space-y-5" aria-label="ข้อมูลการตั้งค่าอุปกรณ์">
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-base">รายการที่ตั้งค่า</CardTitle><CardDescription>ชื่อ โซน และรายละเอียดที่บันทึกไว้</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {devices.length ? devices.map((device) => <div key={device.id} className="flex gap-2 border-b pb-3 last:border-0 last:pb-0"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-primary">{(() => { const Icon = icons[device.icon]; return <Icon className="size-3.5" aria-hidden="true" />; })()}</span><span><strong className="block text-sm">{device.name}</strong><span className="block text-xs text-muted-foreground">{device.detail || "ยังไม่ได้ระบุรายละเอียด"}</span></span></div>) : <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ที่บันทึกไว้ในโรงเรือนนี้</p>}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-base">ประวัติการสั่งงาน</CardTitle><CardDescription>จะปรากฏเมื่อมีระบบบันทึกคำสั่งเชื่อมต่อเข้ามา</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">ยังไม่มีประวัติคำสั่งที่บันทึกไว้</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
