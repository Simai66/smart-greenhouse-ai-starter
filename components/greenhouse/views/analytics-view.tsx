"use client";

import { useState } from "react";
import { Bot, Camera, Settings2, Thermometer, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoilMoistureChart } from "@/components/greenhouse/charts/soil-moisture-chart";
import type { ChartPeriod } from "@/lib/greenhouse-presentation";
import type { GreenhouseContext } from "@/lib/greenhouse-domain";

function EmptyReadings({ title, detail }: { title: string; detail: string }) {
  return <Card className="shadow-none"><CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center"><p className="font-semibold">{title}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{detail}</p></CardContent></Card>;
}

export function AnalyticsView({ period, onPeriodChange, context }: { period: ChartPeriod; onPeriodChange: (period: ChartPeriod) => void; context: GreenhouseContext }) {
  const zoneOptions = context.greenhouse?.zones.filter((item) => item.status === "active") ?? [];
  const [zoneId, setZoneId] = useState("all");
  const selectedZoneId = zoneOptions.some((item) => item.id === zoneId) ? zoneId : "all";
  const selectedZone = zoneOptions.find((item) => item.id === selectedZoneId);
  const scopedSensors = selectedZone ? context.sensors.filter((sensor) => sensor.zoneId === selectedZone.id) : context.sensors;
  const scopedCameras = selectedZone ? context.cameras.filter((camera) => camera.zoneId === selectedZone.id) : context.cameras;
  const scopedDevices = selectedZone ? context.devices.filter((device) => device.zoneId === selectedZone.id) : context.devices;
  const scopedPlants = selectedZone ? context.plants.filter((plant) => {
    const batch = plant.batchId ? context.cropBatches.find((item) => item.id === plant.batchId) : undefined;
    return batch ? batch.zoneId === selectedZone.id : plant.zone === selectedZone.name;
  }) : context.plants;
  const zoneLabel = selectedZone?.name ?? "ทุกโซน";
  const soilSensors = scopedSensors.filter((sensor) => sensor.metric === "soilMoisture");
  const lightDevices = scopedDevices.filter((device) => device.icon === "light");
  const hasConfiguredResources = Boolean(scopedSensors.length || scopedCameras.length || scopedDevices.length || scopedPlants.length);
  const summary = [
    { label: "เซ็นเซอร์ที่ตั้งค่า", value: String(scopedSensors.length), note: "ยังไม่มีค่าการอ่านที่บันทึก", icon: Thermometer },
    { label: "กล้องที่ตั้งค่า", value: String(scopedCameras.length), note: "ยังไม่มีหลักฐานภาพที่บันทึก", icon: Camera },
    { label: "พืชที่ลงทะเบียน", value: String(scopedPlants.length), note: "รอผลตรวจ AI จากภาพจริง", icon: Bot },
    { label: "อุปกรณ์ที่ตั้งค่า", value: String(scopedDevices.length), note: "ยังไม่มีประวัติพลังงานที่บันทึก", icon: Zap },
  ];

  return <section className="space-y-6" aria-labelledby="analytics-overview-title">
    <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="page-kicker">มุมมองการตัดสินใจ</p><h2 id="analytics-overview-title" className="mt-1 text-lg font-semibold">ภาพรวมการวิเคราะห์</h2><p className="mt-1 text-sm text-muted-foreground">จะแสดงเฉพาะค่าที่บันทึกจากโรงเรือนที่เลือก ไม่มีการเติมข้อมูลตัวอย่าง</p></div>
      <div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="analytics-zone">เลือกโซน</label><Select value={selectedZoneId} onValueChange={setZoneId}><SelectTrigger id="analytics-zone" className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">ทุกโซน</SelectItem>{zoneOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select><Tabs value={period} onValueChange={(value) => onPeriodChange(value as ChartPeriod)}><TabsList aria-label="เลือกช่วงเวลาของกราฟ"><TabsTrigger value="วันนี้">วันนี้</TabsTrigger><TabsTrigger value="7 วัน">7 วัน</TabsTrigger><TabsTrigger value="30 วัน">30 วัน</TabsTrigger></TabsList></Tabs></div>
    </div>

    {!hasConfiguredResources ? <EmptyReadings title="ยังไม่มีทรัพยากรสำหรับวิเคราะห์" detail={`เพิ่มเซ็นเซอร์ กล้อง อุปกรณ์ หรือรอบปลูกใน${context.greenhouse?.name ?? "โรงเรือนนี้"}ก่อน จึงจะเริ่มเก็บข้อมูลได้`} /> : <>
      <div className="quiet-surface grid divide-y divide-border/70 overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4" aria-label="สรุปการวิเคราะห์">{summary.map(({ label, value, note, icon: Icon }) => <article key={label} className="flex items-start gap-3 p-4 sm:p-5"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm text-muted-foreground">{label}</span><strong className="block text-2xl tabular-nums">{value}</strong><span className="block text-xs text-muted-foreground">{note}</span></span></article>)}</div>
      <div className="grid gap-5 xl:grid-cols-2"><EmptyReadings title="ยังไม่มีข้อมูลสภาพแวดล้อมที่บันทึก" detail={`พบเซ็นเซอร์ ${scopedSensors.length} ตัวใน${zoneLabel} แต่ยังไม่มีค่าตามช่วง ${period}`} /><Card className="shadow-none"><CardHeader><h2 className="font-semibold">แสงและรอบไฟ</h2><p className="text-sm text-muted-foreground">แสดงสถานะการตั้งค่า ไม่คาดเดาชั่วโมงแสงหรือพลังงาน</p></CardHeader><CardContent className="space-y-3">{lightDevices.length ? lightDevices.map((device) => <div key={device.id} className="flex items-center justify-between rounded-xl border p-3"><span><strong className="block text-sm">{device.name}</strong><span className="text-xs text-muted-foreground">{selectedZone?.name ?? "โรงเรือนที่เลือก"}</span></span><Badge variant={device.active ? "secondary" : "outline"} className={device.active ? "text-primary" : undefined}>{device.active ? "เปิดใช้งาน" : "ปิดอยู่"}</Badge></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่ได้ตั้งค่าอุปกรณ์ไฟในขอบเขตที่เลือก</p>}</CardContent></Card></div>
      <SoilMoistureChart points={[]} rangeLabel={period} targetMin={50} targetMax={65} title={`ความชื้นดิน · ${zoneLabel}`} sensorLabel={soilSensors.map((sensor) => sensor.name).join(", ") || "ยังไม่มีเซ็นเซอร์ความชื้นดิน"} />
      <div className="grid gap-5 lg:grid-cols-2"><Card className="shadow-none"><CardHeader><h2 className="font-semibold">หลักฐานภาพจาก AI</h2><p className="text-sm text-muted-foreground">กล้องที่ผูกกับ{zoneLabel}</p></CardHeader><CardContent className="space-y-3">{scopedCameras.length ? scopedCameras.map((camera) => <div key={camera.id} className="flex items-center justify-between rounded-xl border p-3"><span><strong className="block text-sm">{camera.name}</strong><span className="text-xs text-muted-foreground">{camera.id} · ยังไม่มีภาพที่บันทึก</span></span><Badge variant="outline">{camera.enabled && camera.status === "online" ? "พร้อมรับภาพ" : "ยังไม่พร้อม"}</Badge></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่มีกล้องในขอบเขตที่เลือก</p>}</CardContent></Card><Card className="shadow-none"><CardHeader><h2 className="font-semibold">การตั้งค่าอุปกรณ์</h2><p className="text-sm text-muted-foreground">แสดงการตั้งค่าที่บันทึกไว้ ไม่ใช่สถานะการทำงานจริง</p></CardHeader><CardContent className="space-y-3">{scopedDevices.length ? scopedDevices.map((device) => <div key={device.id} className="flex items-center justify-between rounded-xl border p-3"><span><strong className="block text-sm">{device.name}</strong><span className="text-xs text-muted-foreground">{device.detail}</span></span><Badge variant={device.active ? "secondary" : "outline"} className={device.active ? "text-primary" : undefined}>{device.active ? "ตั้งค่าให้เปิด" : "ตั้งค่าให้ปิด"}</Badge></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ในขอบเขตที่เลือก</p>}</CardContent></Card></div>
      <section className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5"><div className="flex gap-3"><Settings2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div><p className="page-kicker">ควรทำต่อ</p><h2 className="mt-1 font-semibold">เริ่มเก็บข้อมูลจริงก่อนสรุปผล</h2><p className="mt-1 text-sm text-muted-foreground">ตรวจการเชื่อมต่อเซ็นเซอร์และกล้อง บันทึกการอ่านแรก แล้วหน้านี้จะแสดงแนวโน้มตามโรงเรือนและโซนที่เลือก</p></div></div></section>
    </>}
  </section>;
}
