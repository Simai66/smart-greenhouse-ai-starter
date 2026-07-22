"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Clock3,
  Droplets,
  Lightbulb,
  Power,
  ScanLine,
  Sun,
  Thermometer,
  Zap,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoilMoistureChart } from "@/components/greenhouse/charts/soil-moisture-chart";
import {
  soilMoistureSeries,
  type ChartPeriod,
} from "@/lib/greenhouse-presentation";
import type { GreenhouseContext } from "@/lib/greenhouse-domain";

const environmentalChartConfig = {
  temperature: { label: "อุณหภูมิ", color: "var(--chart-1)" },
  humidity: { label: "ความชื้นอากาศ", color: "var(--chart-2)" },
} satisfies ChartConfig;

const lightTrendChartConfig = {
  availability: { label: "ความพร้อมของแสง", color: "var(--chart-4)" },
} satisfies ChartConfig;

const environmentalSeries: Record<ChartPeriod, Array<{ label: string; temperature: number; humidity: number }>> = {
  "วันนี้": [
    { label: "00:00", temperature: 24.1, humidity: 71 },
    { label: "04:00", temperature: 23.4, humidity: 74 },
    { label: "08:00", temperature: 25.6, humidity: 68 },
    { label: "12:00", temperature: 28.4, humidity: 61 },
    { label: "16:00", temperature: 27.2, humidity: 65 },
    { label: "20:00", temperature: 24.8, humidity: 68 },
  ],
  "7 วัน": [
    { label: "พ. 15", temperature: 26.1, humidity: 67 },
    { label: "พฤ. 16", temperature: 27.4, humidity: 65 },
    { label: "ศ. 17", temperature: 28.2, humidity: 62 },
    { label: "ส. 18", temperature: 27.8, humidity: 66 },
    { label: "อา. 19", temperature: 26.7, humidity: 69 },
    { label: "จ. 20", temperature: 27.5, humidity: 66 },
    { label: "อ. 21", temperature: 27.8, humidity: 68 },
  ],
  "30 วัน": [
    { label: "22 มิ.ย.", temperature: 26.8, humidity: 67 },
    { label: "27 มิ.ย.", temperature: 27.1, humidity: 65 },
    { label: "2 ก.ค.", temperature: 27.6, humidity: 64 },
    { label: "7 ก.ค.", temperature: 28.3, humidity: 61 },
    { label: "12 ก.ค.", temperature: 27.4, humidity: 66 },
    { label: "17 ก.ค.", temperature: 26.9, humidity: 69 },
    { label: "21 ก.ค.", temperature: 27.8, humidity: 68 },
  ],
};

type LightTrendPoint = { label: string; availability: number };

const demoLightStatus: {
  trend: LightTrendPoint[];
  status: "เปิดอยู่" | "ปิดอยู่";
  runtime: string;
  powerProxy: string;
  nextEvent: string;
  timeToEvent: string;
  goalGap: string;
  hint: string;
} = {
    trend: [{ label: "00", availability: 0 }, { label: "02", availability: 0 }, { label: "04", availability: 0 }, { label: "06", availability: 28 }, { label: "08", availability: 78 }, { label: "10", availability: 92 }, { label: "12", availability: 88 }, { label: "14", availability: 94 }, { label: "16", availability: 84 }, { label: "18", availability: 18 }, { label: "20", availability: 0 }, { label: "22", availability: 0 }, { label: "24", availability: 0 }],
    status: "เปิดอยู่", runtime: "8.6 ชม. วันนี้", powerProxy: "3.8 kWh โดยประมาณ", nextEvent: "ปิดไฟตามตาราง 18:00 น.", timeToEvent: "อีกประมาณ 1 ชม. 40 นาที", goalGap: "ขาดอีก 1.4 ชม.", hint: "ติดตามรอบไฟที่เหลือก่อนเพิ่มเวลาเปิดไฟ",
};

export function AnalyticsView({
  period,
  onPeriodChange,
  context,
}: {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  context: GreenhouseContext;
}) {
  const zoneOptions = context.greenhouse?.zones.filter((item) => item.status === "active") ?? [];
  const [zoneId, setZoneId] = useState("all");
  const selectedZone = zoneOptions.find((item) => item.id === zoneId);
  const zone = selectedZone?.name ?? "ทุกโซน";
  const scopedCameras = selectedZone ? context.cameras.filter((camera) => camera.zoneId === selectedZone.id) : context.cameras;
  const scopedDevices = selectedZone ? context.devices.filter((device) => device.zoneId === selectedZone.id) : context.devices;
  const data = {
    comfort: context.sensors.length ? 89 : 0,
    light: scopedDevices.some((device) => device.icon === "light") ? 8.6 : 0,
    health: context.plants.length ? Math.round(context.plants.reduce((sum, plant) => sum + plant.confidence, 0) / context.plants.length) : 0,
    scans: scopedCameras.filter((camera) => camera.status === "online" && camera.enabled).length,
    deviceHours: scopedDevices.length ? 1.5 * scopedDevices.length : 0,
    energy: scopedDevices.length ? Number((0.4 * scopedDevices.length).toFixed(1)) : 0,
  };
  const lightStatus = demoLightStatus;
  const hasAnalysisData = Boolean(context.sensors.length || context.cameras.length || context.devices.length || context.plants.length);
  const environment = useMemo(
    () => environmentalSeries[period].map((point) => ({
      ...point,
      temperature: point.temperature,
      humidity: point.humidity,
    })),
    [period, zone],
  );
  const soilPoints = useMemo(() => {
    return soilMoistureSeries[period];
  }, [period]);

  const summary = [
    { label: "ความสบายของสภาพแวดล้อม", value: `${data.comfort}%`, note: "อุณหภูมิและความชื้นอยู่ในเกณฑ์", icon: Thermometer },
    { label: "แสงสะสมรวม", value: `${data.light} ชม.`, note: "แสงธรรมชาติ + ไฟ · เป้าหมาย 10 ชม.", icon: Sun },
    { label: "สุขภาพพืชจาก AI", value: `${data.health}%`, note: `วิเคราะห์แล้ว ${data.scans} ภาพ`, icon: Bot },
    { label: "พลังงานอุปกรณ์โดยประมาณ", value: `${data.energy} kWh`, note: `ทำงานรวม ${data.deviceHours} ชม.`, icon: Zap },
  ];

  const aiHealthRows = scopedCameras.map((camera) => ({
    zone: context.greenhouse?.zones.find((item) => item.id === camera.zoneId)?.name ?? camera.zone,
    camera: `${camera.id} · ${camera.name}`,
    value: context.plants.length ? data.health : 0,
    scans: camera.status === "online" && camera.enabled ? 1 : 0,
  }));
  const deviceUsage = scopedDevices.map((device) => ({ label: device.name, detail: device.detail, value: device.active ? 70 : 20 }));
  const scopedZoneLabel = selectedZone?.name ?? "โซนที่มีค่าต่ำ";
  const insights = [
    {
      title: `เติมความชื้นดินใน${scopedZoneLabel}`,
      detail: `แนวโน้มความชื้นของ${scopedZoneLabel}ใกล้ต่ำกว่าเป้าหมาย ควรตรวจรอบรดน้ำถัดไป`,
      tone: "border-amber-200 bg-amber-50 text-amber-950",
      icon: Droplets,
    },
    {
      title: `เพิ่มแสงใน${zone === "ทุกโซน" ? "แต่ละโซน" : zone}อีกประมาณ 1.4 ชั่วโมง`,
      detail: "แสงสะสมยังไม่ถึงเป้าหมายรายวันในข้อมูลตัวอย่าง",
      tone: "border-orange-200 bg-orange-50 text-orange-950",
      icon: Lightbulb,
    },
    {
      title: `ตรวจภาพจาก${zone === "ทุกโซน" ? "กล้องที่มีภาพน้อย" : `กล้อง${zone}`}เพิ่มเติม`,
      detail: "ควรมีหลักฐานภาพเพียงพอก่อนสรุปสุขภาพพืช",
      tone: "border-sky-200 bg-sky-50 text-sky-950",
      icon: ScanLine,
    },
  ];

  if (!hasAnalysisData) {
    return <section className="space-y-6" aria-labelledby="analytics-overview-title"><div className="border-b border-border/70 pb-5"><p className="page-kicker">มุมมองการตัดสินใจ</p><h2 id="analytics-overview-title" className="mt-1 text-lg font-semibold">ภาพรวมการวิเคราะห์</h2></div><Card className="shadow-none"><CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center"><p className="font-semibold">ยังไม่มีข้อมูลสำหรับวิเคราะห์</p><p className="mt-1 max-w-md text-sm text-muted-foreground">เพิ่มอุปกรณ์ เซ็นเซอร์ กล้อง หรือรอบปลูกใน {context.greenhouse?.name ?? "โรงเรือนนี้"} ก่อน จึงจะแสดงผลวิเคราะห์ได้</p></CardContent></Card></section>;
  }

  return (
    <section className="space-y-6" aria-labelledby="analytics-overview-title">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="page-kicker">มุมมองการตัดสินใจ</p>
          <h2 id="analytics-overview-title" className="mt-1 text-lg font-semibold">ภาพรวมการวิเคราะห์</h2>
          <p className="mt-1 text-sm text-muted-foreground">ตัวเลขในหน้านี้เป็นข้อมูลตัวอย่างเพื่อประกอบการแสดงผล ยังไม่ใช่ข้อมูลสดจากอุปกรณ์</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="analytics-zone">เลือกโซน</label>
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger id="analytics-zone" className="w-full sm:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกโซน</SelectItem>
              {zoneOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tabs value={period} onValueChange={(value) => onPeriodChange(value as ChartPeriod)}>
            <TabsList aria-label="เลือกช่วงเวลาของกราฟ">
              <TabsTrigger value="วันนี้">วันนี้</TabsTrigger>
              <TabsTrigger value="7 วัน">7 วัน</TabsTrigger>
              <TabsTrigger value="30 วัน">30 วัน</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="quiet-surface grid divide-y divide-border/70 overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4" aria-label="สรุปการวิเคราะห์">
        {summary.map(({ label, value, note, icon: Icon }) => (
          <article key={label} className="flex items-start gap-3 p-4 sm:p-5">
              <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm text-muted-foreground">{label}</span><strong className="block text-2xl tabular-nums">{value}</strong><span className="block text-xs text-muted-foreground">{note}</span></span>
          </article>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3 shadow-none">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div><h2 className="font-semibold">อุณหภูมิและความชื้นอากาศ</h2><p className="text-sm text-muted-foreground">แนวโน้มสภาพแวดล้อม · {zone}</p></div>
            <Badge variant="secondary"><Activity aria-hidden="true" /> เหมาะสม {data.comfort}%</Badge>
          </CardHeader>
          <CardContent>
            <p className="sr-only" role="status">ข้อมูลตัวอย่างอุณหภูมิและความชื้นอากาศของ {zone} ในช่วง {period}</p>
            <ChartContainer config={environmentalChartConfig} className="min-h-64 w-full">
              <AreaChart accessibilityLayer data={environment} margin={{ left: 0, right: 8 }}>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="0"
                  strokeOpacity={0.7}
                />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area dataKey="humidity" type="step" fill="var(--color-humidity)" fillOpacity={0.1} stroke="var(--color-humidity)" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="butt" isAnimationActive={false} />
                <Area dataKey="temperature" type="step" fill="var(--color-temperature)" fillOpacity={0.12} stroke="var(--color-temperature)" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="butt" isAnimationActive={false} />
              </AreaChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--chart-1)]" />อุณหภูมิ °C</span><span><span className="mr-1 inline-block size-2 rounded-full bg-[var(--chart-2)]" />ความชื้น %</span><span>เป้าหมาย: 24–28°C · 60–75%</span></div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 shadow-none">
          <CardHeader className="gap-1"><h2 className="font-semibold">แสงและรอบไฟ</h2><p className="text-sm text-muted-foreground">สรุปจากตารางและข้อมูลตัวอย่างสำหรับ {zone} ไม่ใช่ค่าจากเซ็นเซอร์แสงจริง</p></CardHeader>
          <CardContent className="space-y-5">
            <div><div className="mb-2 flex items-baseline justify-between gap-4"><span className="text-sm font-medium">แสงสะสมรวมวันนี้</span><strong className="text-2xl tabular-nums">{data.light}<span className="text-sm font-normal text-muted-foreground"> / 10 ชม.</span></strong></div><p className="mb-2 text-xs text-muted-foreground">รวมแสงธรรมชาติและไฟปลูกพืช · ชั่วโมงเปิดไฟแสดงแยกในส่วนอุปกรณ์</p><Progress value={data.light * 10} aria-label={`แสงสะสมรวม ${data.light} จาก 10 ชั่วโมง`} /></div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-medium">แนวโน้มความพร้อมของแสง 24 ชม.</span><Badge variant="secondary">ข้อมูลตัวอย่าง</Badge></div>
              <p className="sr-only" role="status">กราฟความพร้อมของแสงตามตารางในรอบ 24 ชั่วโมงของ {zone} เป็นข้อมูลตัวอย่าง</p>
              <ChartContainer config={lightTrendChartConfig} className="h-32 w-full">
                <AreaChart accessibilityLayer data={lightStatus.trend} margin={{ left: 0, right: 6, top: 8 }}>
                  <defs><linearGradient id="light-availability" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="var(--color-availability)" stopOpacity={0.28} /><stop offset="95%" stopColor="var(--color-availability)" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeDasharray="0"
                    strokeOpacity={0.7}
                  />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={2} tickFormatter={(value) => `${value}:00`} />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => `${label}:00 น.`} formatter={(value) => [`${value}%`, "ความพร้อมตามตาราง"]} />} />
                  <Area dataKey="availability" type="step" fill="url(#light-availability)" stroke="var(--color-availability)" strokeWidth={2} strokeLinejoin="miter" strokeLinecap="butt" isAnimationActive={false} />
                </AreaChart>
              </ChartContainer>
            </div>
            <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-3"><span className="text-xs text-muted-foreground">สถานะปัจจุบัน · ข้อมูลตัวอย่าง</span><strong className="mt-1 flex items-center gap-1.5 text-sm"><Power className="size-4 text-primary" />ไฟ{lightStatus.status}</strong><span className="mt-1 block text-xs text-muted-foreground">{lightStatus.runtime} · {lightStatus.powerProxy}</span></div>
              <div className="rounded-xl bg-muted/50 p-3"><span className="text-xs text-muted-foreground">เหตุการณ์ถัดไป · ตามตาราง</span><strong className="mt-1 flex items-center gap-1.5 text-sm"><Clock3 className="size-4 text-primary" />{lightStatus.nextEvent}</strong><span className="mt-1 block text-xs text-muted-foreground">{lightStatus.timeToEvent}</span></div>
            </div>
            <div className="flex gap-2 rounded-xl border border-primary/15 bg-primary/[0.04] p-3 text-sm"><Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><p><strong>เป้าหมายวันนี้: {lightStatus.goalGap}</strong><span className="block text-xs text-muted-foreground">{lightStatus.hint}</span></p></div>
          </CardContent>
        </Card>
      </div>

      {context.sensors.some((sensor) => sensor.metric === "soilMoisture" && (!selectedZone || sensor.zoneId === selectedZone.id)) ? <SoilMoistureChart points={soilPoints} rangeLabel={period} targetMin={50} targetMax={65} title={selectedZone ? `ความชื้นดิน · ${selectedZone.name}` : "ความชื้นดิน · ภาพรวมทุกโซน"} sensorLabel={context.sensors.filter((sensor) => sensor.metric === "soilMoisture" && (!selectedZone || sensor.zoneId === selectedZone.id)).map((sensor) => sensor.name).join(", ")} recommendation={`ข้อมูลตัวอย่างแนะนำให้ตรวจรอบรดน้ำของ${scopedZoneLabel} แล้วทบทวนค่าอีกครั้งใน 15 นาที`} /> : <Card className="shadow-none"><CardContent className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีเซ็นเซอร์ความชื้นดินในขอบเขตที่เลือก</CardContent></Card>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="flex-row items-start justify-between gap-4"><div><h2 className="font-semibold">สุขภาพพืชจาก AI</h2><p className="text-sm text-muted-foreground">{selectedZone ? `ผลจาก ${selectedZone.name} ในข้อมูลตัวอย่าง` : "แยกผลตามกล้องที่ผูกกับโรงเรือนนี้"}</p></div><Badge variant="secondary">{context.plants.length ? `${data.health}% ปกติ` : "ยังไม่มีพืช"}</Badge></CardHeader>
          <CardContent className="space-y-3">
            {aiHealthRows.length ? aiHealthRows.map((item) => <div key={item.camera} className="flex items-center gap-3 border-b border-border/70 py-3 last:border-b-0"><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.zone}</strong><span className="text-xs text-muted-foreground">{item.camera} · {item.scans} ภาพ</span></span><span className="text-right"><strong className="block text-sm tabular-nums">{context.plants.length ? `${item.value}%` : "—"}</strong><span className="text-xs text-muted-foreground">{context.plants.length ? "ข้อมูลตัวอย่าง" : "รอข้อมูลพืช"}</span></span></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่มีกล้องในขอบเขตที่เลือก</p>}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader><h2 className="font-semibold">การทำงานของอุปกรณ์</h2><p className="text-sm text-muted-foreground">เวลาและพลังงานโดยประมาณจากข้อมูลตัวอย่าง</p></CardHeader>
          <CardContent className="space-y-4">
            {deviceUsage.length ? deviceUsage.map((item) => <div key={item.label}><div className="mb-2 flex justify-between gap-4"><span><strong className="block text-sm">{item.label}</strong><span className="text-xs text-muted-foreground">{item.detail}</span></span><span className="text-xs text-muted-foreground">การใช้งานโดยประมาณ</span></div><Progress value={item.value} aria-label={`${item.label} ใช้งาน ${item.value} เปอร์เซ็นต์`} /></div>) : <p className="py-5 text-center text-sm text-muted-foreground">ยังไม่มีอุปกรณ์ในขอบเขตที่เลือก</p>}
          </CardContent>
        </Card>
      </div>

      <section className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-5"><div><p className="page-kicker">ควรทำต่อ</p><h2 className="mt-1 font-semibold">สิ่งที่ควรดำเนินการต่อ</h2><p className="mt-1 text-sm text-muted-foreground">ข้อเสนอแนะจากรูปแบบข้อมูลตัวอย่าง ไม่ใช่คำสั่งควบคุมอุปกรณ์</p></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{insights.map(({ title, detail, tone, icon: Icon }) => <article key={title} className={`rounded-xl border p-4 ${tone}`}><Icon className="mb-3 size-5" aria-hidden="true" /><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm opacity-80">{detail}</p></article>)}</div></section>
    </section>
  );
}
