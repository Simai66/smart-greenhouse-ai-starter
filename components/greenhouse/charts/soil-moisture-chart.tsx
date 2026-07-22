"use client";

import { Droplets, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, ReferenceArea, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  describeSoilMoistureTrend,
  type SoilMoisturePoint,
} from "@/lib/greenhouse-presentation";

const chartConfig = {
  soilMoisture: {
    label: "ความชื้นดิน",
    color: "var(--chart-1)",
    icon: Droplets,
  },
} satisfies ChartConfig;

export type SoilMoistureChartProps = {
  points: SoilMoisturePoint[];
  rangeLabel: string;
  targetMin: number;
  targetMax: number;
  recommendation?: string;
  title?: string;
  sensorLabel?: string;
};

export type SoilMoistureZone = "all" | string;

export type DashboardSoilMoistureChartProps = {
  series: Array<{ id: string; label: string; sensorLabel: string; points: SoilMoisturePoint[]; color: string }>;
  rangeLabel: string;
  targetMin: number;
  targetMax: number;
  selectedZone: SoilMoistureZone;
  onSelectedZoneChange: (zone: SoilMoistureZone) => void;
};

function getZoneStatus(value: number, targetMin: number, targetMax: number) {
  if (value < targetMin) return { label: `ต่ำกว่าเป้าหมาย ${targetMin - value}%`, className: "text-amber-700" };
  if (value > targetMax) return { label: `สูงกว่าเป้าหมาย ${value - targetMax}%`, className: "text-amber-700" };
  return { label: "อยู่ในช่วงเป้าหมาย", className: "text-primary" };
}

export function DashboardSoilMoistureChart({
  series,
  rangeLabel,
  targetMin,
  targetMax,
  selectedZone,
  onSelectedZoneChange,
}: DashboardSoilMoistureChartProps) {
  const rows = series[0]?.points.map((point, index) => Object.fromEntries([
    ["label", point.label],
    ...series.map((item) => [item.id, item.points[index]?.value]),
  ])) ?? [];
  const summaries = series.map((item) => {
    const value = item.points.at(-1)?.value ?? 0;
    return { ...item, value, ...getZoneStatus(value, targetMin, targetMax) };
  });
  const focused = selectedZone === "all" ? null : summaries.find((summary) => summary.id === selectedZone) ?? null;
  const recommendation = focused
    ? focused.value < targetMin
      ? `ตรวจรอบรดน้ำ${focused.label} แล้ววัดซ้ำใน 15 นาที`
      : `${focused.label}อยู่ในเกณฑ์ ติดตามรอบถัดไปตามปกติ`
    : summaries.some((summary) => summary.value < targetMin)
      ? "มีโซนต่ำกว่าเป้าหมาย ควรตรวจรอบรดน้ำและวัดซ้ำใน 15 นาที"
      : "ทุกโซนอยู่ในเกณฑ์ ติดตามตามรอบปกติ";
  const visibleZones = selectedZone === "all" ? series : series.filter((item) => item.id === selectedZone);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold leading-snug">ความชื้นดินทุกโซน</h2>
            <p className="text-base text-muted-foreground">เปรียบเทียบค่าเซ็นเซอร์ในโรงเรือนที่เลือก · อัปเดตตามช่วงที่เลือก</p>
          </div>
          <div className="flex w-full gap-1 rounded-xl border bg-muted/40 p-1 sm:w-auto" role="group" aria-label="เลือกโซนสำหรับกราฟความชื้นดิน">
            {[{ id: "all", label: "ทุกโซน" }, ...series].map((zone) => (
              <Button key={zone.id} type="button" size="sm" variant={selectedZone === zone.id ? "default" : "ghost"} className="flex-1 rounded-lg sm:flex-none" onClick={() => onSelectedZoneChange(zone.id)}>
                {zone.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {summaries.map((summary) => {
            const isFocused = selectedZone === "all" || selectedZone === summary.id;
            return <div key={summary.id} className={`rounded-xl border p-3 transition-opacity ${isFocused ? "border-border bg-card" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3"><span><span className="flex items-center gap-2 text-sm font-medium"><i className="size-2 rounded-full" style={{ backgroundColor: summary.color }} aria-hidden="true" />{summary.label}</span><span className="mt-1 block text-xs text-muted-foreground">เซ็นเซอร์ {summary.sensorLabel}</span></span><strong className="text-2xl tabular-nums">{summary.value}%</strong></div>
              <p className={`mt-2 text-xs font-medium ${summary.className}`}>{summary.label}</p>
            </div>;
          })}
        </div>
      </CardHeader>
      <CardContent>
        <p className="sr-only" role="status">กราฟความชื้นดิน {selectedZone === "all" ? "ทุกโซน" : focused?.label ?? "โซนที่เลือก"} ในช่วง {rangeLabel}. ช่วงเป้าหมาย {targetMin}–{targetMax} เปอร์เซ็นต์. {recommendation}</p>
        <ChartContainer config={Object.fromEntries(series.map((item) => [item.id, { label: item.label, color: item.color }]))} className="min-h-[18rem] w-full">
          <LineChart accessibilityLayer data={rows} margin={{ left: 12, right: 12 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="0" strokeOpacity={0.7} />
            <ReferenceArea y1={targetMin} y2={targetMax} fill="var(--chart-1)" fillOpacity={0.08} ifOverflow="extendDomain" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => [`${value}%`, series.find((item) => item.id === name)?.label ?? name]} />} />
            {visibleZones.map((item) => <Line key={item.id} dataKey={item.id} type="stepAfter" stroke={`var(--color-${item.id})`} strokeWidth={2.5} strokeLinecap="butt" strokeLinejoin="miter" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />)}
          </LineChart>
        </ChartContainer>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" aria-hidden="true" />ช่วงเป้าหมาย {targetMin}–{targetMax}%</span>{visibleZones.map((item) => <span key={item.id} className="flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />{item.label}</span>)}</div>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 border-t">
        <div className="flex w-full items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">ช่วงเวลา {rangeLabel}</span><span className="text-muted-foreground">แถบสีคือช่วงเป้าหมาย</span></div>
        <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><strong>คำแนะนำ</strong><span className="ml-2">{recommendation}</span></div>
      </CardFooter>
    </Card>
  );
}

export function SoilMoistureChart({
  points,
  rangeLabel,
  targetMin,
  targetMax,
  recommendation,
  title = "ความชื้นดิน",
  sensorLabel = "ยังไม่ระบุเซ็นเซอร์",
}: SoilMoistureChartProps) {
  if (!points.length) {
    return <Card className="shadow-none"><CardHeader><h2 className="text-xl font-semibold leading-snug">{title}</h2><p className="text-base text-muted-foreground">เซ็นเซอร์ {sensorLabel}</p></CardHeader><CardContent className="py-10 text-center text-sm text-muted-foreground"><p className="font-medium text-foreground">ยังไม่มีค่าความชื้นดินที่บันทึก</p><p className="mt-1">เชื่อมต่อเซ็นเซอร์และรอให้มีข้อมูลก่อน จึงจะแสดงกราฟและคำแนะนำได้</p></CardContent></Card>;
  }
  const current = points.at(-1)?.value ?? 0;
  const first = points.at(0)?.value ?? current;
  const withinTarget = points.filter(
    (point) => point.value >= targetMin && point.value <= targetMax,
  ).length;
  const targetPercent = points.length
    ? Math.round((withinTarget / points.length) * 100)
    : 0;
  const trend = describeSoilMoistureTrend(points, targetMin);
  const TrendIcon = current < first ? TrendingDown : TrendingUp;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold leading-snug">{title}</h2>
          <p className="text-base text-muted-foreground">
            ค่าจากเซ็นเซอร์ {sensorLabel} · อัปเดตตามช่วงที่เลือก
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">{current}%</p>
          <p className={current < targetMin ? "text-xs text-amber-700" : "text-xs text-primary"}>
            {current < targetMin
              ? "ต่ำกว่าเป้าหมาย " + String(targetMin - current) + "%"
              : "อยู่ในช่วงเป้าหมาย"}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="sr-only" role="status">
          {trend}. ช่วงเป้าหมาย {targetMin}–{targetMax} เปอร์เซ็นต์
        </p>
        <ChartContainer
          config={chartConfig}
          className="h-64 w-full sm:h-72"
        >
          <AreaChart
            accessibilityLayer
            data={points.map((point) => ({
              ...point,
              soilMoisture: point.value,
            }))}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeDasharray="0"
              strokeOpacity={0.7}
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => String(value) + "%"}
                />
              }
            />
            <Area
              dataKey="soilMoisture"
              type="step"
              fill="var(--color-soilMoisture)"
              fillOpacity={0.18}
              stroke="var(--color-soilMoisture)"
              strokeWidth={2}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 border-t">
        <div className="flex w-full items-start justify-between gap-4 text-base">
          <div>
            <div className="flex items-center gap-2 font-medium">
              อยู่ในช่วงเป้าหมาย {targetPercent}% ของเวลา
              <TrendIcon className="size-4" aria-hidden="true" />
            </div>
            <div className="text-muted-foreground">{rangeLabel}</div>
          </div>
          <div className="text-right text-muted-foreground">
            เป้าหมาย {targetMin}–{targetMax}%
          </div>
        </div>
        {recommendation ? (
          <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-base text-amber-950">
            <strong>คำแนะนำ</strong>
            <span className="ml-2">{recommendation}</span>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
