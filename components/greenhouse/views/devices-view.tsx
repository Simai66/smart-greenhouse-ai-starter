"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Clock3,
  CloudSun,
  Droplets,
  Fan,
  Gauge,
  Lightbulb,
  PlugZap,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const icons = {
  pump: Droplets,
  fan: Fan,
  light: Lightbulb,
  mist: CloudSun,
} as const;

type FilterStatus = "all" | "running" | "stopped";
type DeviceZone = "all" | "โซน A" | "โซน B";
type DeviceKind = "all" | DemoDevice["icon"];
type Override = { deviceId: string; minutes: string } | null;

const deviceMeta: Record<DemoDevice["id"], {
  zone: Exclude<DeviceZone, "all">;
  lastActive: string;
  rule: string;
  power: string;
  health: string;
}> = {
  pump: { zone: "โซน A", lastActive: "ทำงานล่าสุด 18 นาทีที่แล้ว", rule: "รดน้ำเมื่อความชื้นดินต่ำกว่า 35%", power: "0.18 kWh/รอบ โดยประมาณ", health: "พร้อมใช้งาน" },
  fan: { zone: "โซน A", lastActive: "อัปเดตเมื่อ 2 นาทีที่แล้ว", rule: "เปิดเมื่ออุณหภูมิสูงกว่า 30°C", power: "0.12 kWh/ชม. โดยประมาณ", health: "พร้อมใช้งาน" },
  light: { zone: "โซน B", lastActive: "ทำงานล่าสุด 1 ชม. ที่แล้ว", rule: "เปิดตามตาราง 06:00–18:00 น.", power: "0.40 kWh/ชม. โดยประมาณ", health: "พร้อมใช้งาน" },
  mist: { zone: "โซน B", lastActive: "อัปเดตเมื่อ 4 นาทีที่แล้ว", rule: "เปิดเมื่อความชื้นอากาศต่ำกว่า 60%", power: "0.08 kWh/ชม. โดยประมาณ", health: "พร้อมใช้งาน" },
};

const fallbackDeviceMeta = (device: DemoDevice) => ({
  zone: device.zoneId ?? "ไม่ระบุโซน",
  lastActive: "ยังไม่มีประวัติการทำงาน",
  rule: "ยังไม่ได้กำหนดกฎอัตโนมัติ",
  power: "ยังไม่มีข้อมูลพลังงาน",
  health: "รอตรวจสอบ",
});

const typeLabels: Record<DemoDevice["icon"], string> = {
  pump: "ปั๊มน้ำ",
  fan: "ระบายอากาศ",
  light: "ไฟปลูกพืช",
  mist: "พ่นหมอก",
};

const recentActivity = [
  { time: "07:42", title: "พัดลมระบายอากาศทำงาน", detail: "ระบบอัตโนมัติตามอุณหภูมิ 30.4°C", icon: Fan },
  { time: "07:30", title: "ตรวจรอบปั๊มน้ำแล้ว", detail: "ความชื้นดินโซน A อยู่ที่ 46% · ยังไม่ต้องรดน้ำ", icon: Droplets },
  { time: "07:00", title: "ไฟปลูกพืชเริ่มตามตาราง", detail: "ตารางแสงโซน B · ข้อมูลตัวอย่าง", icon: Lightbulb },
] as const;

export function DevicesView({
  devices,
  pendingDeviceId,
  online,
  onRequest,
}: {
  devices: DemoDevice[];
  pendingDeviceId: string | null;
  online: boolean;
  onRequest: (device: DemoDevice) => void;
}) {
  const [zone, setZone] = useState<DeviceZone>("all");
  const [kind, setKind] = useState<DeviceKind>("all");
  const [status, setStatus] = useState<FilterStatus>("all");
  const [override, setOverride] = useState<Override>(null);
  const [overrideExpiresAt, setOverrideExpiresAt] = useState<number | null>(null);
  const [overrideMinutes, setOverrideMinutes] = useState("30");

  const visibleDevices = useMemo(
    () => devices.filter((device) => {
      const meta = deviceMeta[device.id] ?? fallbackDeviceMeta(device);
      return (zone === "all" || meta.zone === zone) &&
        (kind === "all" || device.icon === kind) &&
        (status === "all" || (status === "running" ? device.active : !device.active));
    }),
    [devices, kind, status, zone],
  );
  const activeDevices = devices.filter((device) => device.active).length;
  const manualDevice = override ? devices.find((device) => device.id === override.deviceId) : null;

  useEffect(() => {
    if (!override || !overrideExpiresAt) return;
    const remaining = Math.max(0, overrideExpiresAt - Date.now());
    const timer = window.setTimeout(() => {
      setOverride(null);
      setOverrideExpiresAt(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [override, overrideExpiresAt]);

  const beginOverride = (device: DemoDevice) => {
    setOverride({ deviceId: device.id, minutes: overrideMinutes });
    setOverrideExpiresAt(Date.now() + Number(overrideMinutes) * 60_000);
  };

  const clearOverride = () => {
    setOverride(null);
    setOverrideExpiresAt(null);
  };

  return (
    <section className="space-y-6" aria-labelledby="device-operations-title">
      <header className="border-b border-border/70 pb-5 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-primary"><SlidersHorizontal className="size-4" aria-hidden="true" />Operations board</p>
            <h2 id="device-operations-title" className="mt-1 text-2xl font-semibold tracking-tight">ควบคุมอุปกรณ์โรงเรือน</h2>
            <p id="device-demo-note" role="note" className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {online
                ? "โหมดสาธิต: การเปิด–ปิดทุกครั้งต้องยืนยันก่อน และยังไม่มีคำสั่งส่งไปยังอุปกรณ์จริง"
                : "ออฟไลน์: แสดงข้อมูลล่าสุดที่บันทึกไว้และปิดคำสั่งอุปกรณ์ชั่วคราว"}
            </p>
          </div>
          <Badge variant={online ? "secondary" : "outline"} className="w-fit gap-1.5 px-3 py-1.5">
            <span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-muted-foreground"}`} aria-hidden="true" />
            {online ? "ระบบเดโมออนไลน์" : "ออฟไลน์ · ข้อมูลล่าสุด"}
          </Badge>
        </div>
      </header>

      <div className="quiet-surface grid divide-y divide-border/70 overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4" aria-label="สรุปการทำงานของอุปกรณ์">
        {[
          { label: "อุปกรณ์พร้อมใช้งาน", value: `${online ? devices.length : 0}/${devices.length}`, note: online ? "สถานะเดโมปัจจุบัน" : "คำสั่งถูกพักไว้", icon: PlugZap },
          { label: "กำลังทำงาน", value: `${activeDevices} เครื่อง`, note: "ตามสถานะที่แสดง", icon: Activity },
          { label: "Manual override", value: manualDevice ? "1 รายการ" : "ไม่มี", note: manualDevice ? `หมดอายุใน ${override?.minutes} นาที` : "ทุกเครื่องอยู่โหมด Auto", icon: TimerReset },
          { label: "ต้องตรวจสอบ", value: "0 รายการ", note: "จากข้อมูลตัวอย่าง", icon: BadgeCheck },
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
            <Select value={zone} onValueChange={(value) => setZone(value as DeviceZone)}>
              <SelectTrigger aria-label="กรองตามโซน"><SelectValue placeholder="ทุกโซน" /></SelectTrigger>
              <SelectContent><SelectItem value="all">ทุกโซน</SelectItem><SelectItem value="โซน A">โซน A</SelectItem><SelectItem value="โซน B">โซน B</SelectItem></SelectContent>
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
            const meta = deviceMeta[device.id] ?? fallbackDeviceMeta(device);
            const pending = pendingDeviceId === device.id;
            const isManual = override?.deviceId === device.id;
            return (
              <Card key={device.id} className="group overflow-hidden shadow-none transition-colors hover:border-primary/30">
                <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon className="size-6" aria-hidden="true" /></span>
                    <div className="min-w-0"><CardTitle className="truncate text-base">{device.name}</CardTitle><CardDescription className="mt-1">{meta.zone} · {typeLabels[device.icon]}</CardDescription></div>
                  </div>
                  <Switch aria-label={(device.active ? "ปิด " : "เปิด ") + device.name} aria-describedby="device-demo-note" checked={device.active} disabled={!online || Boolean(pendingDeviceId)} onCheckedChange={() => onRequest(device)} />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={device.active && online ? "secondary" : "outline"}>{!online ? "ออฟไลน์ · ข้อมูลล่าสุด" : pending ? "กำลังส่งคำสั่ง" : device.active ? "กำลังทำงาน" : "ออนไลน์ · ปิดอยู่"}</Badge>
                    <Badge variant="outline" className={isManual ? "border-amber-300 bg-amber-50 text-amber-900" : ""}>{isManual ? `Manual · อีก ${override?.minutes} นาที` : "Auto"}</Badge>
                  </div>
                  <dl className="grid gap-3 border-y py-3 text-sm">
                    <div className="flex items-start gap-2"><Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><dt className="text-xs text-muted-foreground">กิจกรรมล่าสุด</dt><dd className="font-medium">{meta.lastActive}</dd></div></div>
                    <div className="flex items-start gap-2"><Zap className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><div><dt className="text-xs text-muted-foreground">พลังงาน</dt><dd className="font-medium">{meta.power}</dd></div></div>
                    <div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /><div><dt className="text-xs text-muted-foreground">สุขภาพอุปกรณ์</dt><dd className="font-medium">{meta.health} <span className="font-normal text-muted-foreground">· ข้อมูลตัวอย่าง</span></dd></div></div>
                  </dl>
                  <div className="rounded-xl bg-muted/55 p-3"><span className="text-xs text-muted-foreground">กฎอัตโนมัติ</span><p className="mt-1 text-sm font-medium">{meta.rule}</p></div>
                  <Button variant="outline" className="w-full" disabled={!online || Boolean(pendingDeviceId)} onClick={() => beginOverride(device)}>
                    <TimerReset className="size-4" aria-hidden="true" />สั่งงานชั่วคราว (เดโม)
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {visibleDevices.length === 0 ? <Card className="md:col-span-2"><CardContent className="py-12 text-center"><Gauge className="mx-auto mb-3 size-7 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">ไม่พบอุปกรณ์ตามตัวกรอง</h3><p className="mt-1 text-sm text-muted-foreground">ลองเปลี่ยนโซน ประเภท หรือสถานะที่เลือก</p></CardContent></Card> : null}
        </section>

        <aside className="space-y-5" aria-label="การทำงานอัตโนมัติและประวัติล่าสุด">
          <Card className="border-primary/15 bg-primary/[0.025] shadow-none">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TimerReset className="size-4 text-primary" aria-hidden="true" />Manual override</CardTitle><CardDescription>ตั้งค่าเพื่อทดสอบหน้าจอเท่านั้น ยังไม่สั่งงานจริง</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {manualDevice ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong className="block">{manualDevice.name} อยู่ใน Manual</strong><span className="mt-1 block text-amber-800">จะกลับสู่ Auto อัตโนมัติใน {override?.minutes} นาที · สถานะอุปกรณ์จริงไม่เปลี่ยน</span></div> : <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">เลือก “สั่งงานชั่วคราว” จากการ์ดอุปกรณ์เพื่อทดลองกำหนดเวลา</p>}
              <label className="block text-sm font-medium" htmlFor="override-duration">ระยะเวลาเดโม</label>
              <Select value={overrideMinutes} onValueChange={setOverrideMinutes}><SelectTrigger id="override-duration"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="10">10 นาที</SelectItem><SelectItem value="30">30 นาที</SelectItem><SelectItem value="60">60 นาที</SelectItem></SelectContent></Select>
              {manualDevice ? <Button variant="outline" className="w-full" onClick={clearOverride}>กลับสู่ Auto ตอนนี้</Button> : null}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-base">กฎอัตโนมัติที่ใช้งาน</CardTitle><CardDescription>เงื่อนไขสำหรับข้อมูลเดโม</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {devices.map((device) => <div key={device.id} className="flex gap-2 border-b pb-3 last:border-0 last:pb-0"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-primary">{(() => { const Icon = icons[device.icon]; return <Icon className="size-3.5" aria-hidden="true" />; })()}</span><span><strong className="block text-sm">{device.name}</strong><span className="block text-xs text-muted-foreground">{(deviceMeta[device.id] ?? fallbackDeviceMeta(device)).rule}</span></span></div>)}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-base">กิจกรรมล่าสุด</CardTitle><CardDescription>บันทึกตัวอย่าง ไม่ใช่ประวัติคำสั่งจริง</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.map(({ time, title, detail, icon: Icon }) => <div key={title} className="flex gap-2.5"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Icon className="size-3.5" aria-hidden="true" /></span><span className="min-w-0"><span className="flex items-baseline justify-between gap-2"><strong className="text-sm">{title}</strong><time className="shrink-0 text-xs text-muted-foreground">{time}</time></span><span className="block text-xs text-muted-foreground">{detail}</span></span></div>)}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}
