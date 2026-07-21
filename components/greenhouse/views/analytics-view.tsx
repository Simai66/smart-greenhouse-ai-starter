"use client";

import { Droplets, History, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SoilMoistureChart } from "@/components/greenhouse/charts/soil-moisture-chart";
import {
  soilMoistureSeries,
  type ChartPeriod,
} from "@/lib/greenhouse-presentation";

export function AnalyticsView({
  period,
  onPeriodChange,
}: {
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}) {
  const summary = [
    { label: "อุณหภูมิเฉลี่ย", value: "27.8°C", note: "+0.6°C จากช่วงก่อน", icon: Thermometer },
    { label: "ปริมาณน้ำที่ใช้", value: "18.4 L", note: "ลดลง 8% จากช่วงก่อน", icon: Droplets },
    { label: "ระบบทำงานอัตโนมัติ", value: "12 ครั้ง", note: "สำเร็จทั้งหมด", icon: History },
  ];

  return (
    <div className="space-y-4">
      <Tabs value={period} onValueChange={(value) => onPeriodChange(value as ChartPeriod)}>
        <TabsList aria-label="เลือกช่วงเวลาของกราฟ">
          <TabsTrigger value="วันนี้">วันนี้</TabsTrigger>
          <TabsTrigger value="7 วัน">7 วัน</TabsTrigger>
          <TabsTrigger value="30 วัน">30 วัน</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-3 md:grid-cols-3">
        {summary.map(({ label, value, note, icon: Icon }) => (
          <Card key={label}><CardContent className="flex items-start gap-3 p-4"><span className="rounded-md bg-secondary p-2 text-primary"><Icon className="size-5" aria-hidden="true" /></span><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{note}</p></div></CardContent></Card>
        ))}
      </div>
      <SoilMoistureChart
        points={soilMoistureSeries[period]}
        rangeLabel={period}
        targetMin={50}
        targetMax={65}
        recommendation="เปิดปั๊มน้ำโซน A 10 นาที แล้วตรวจค่าอีกครั้งใน 15 นาที"
      />
    </div>
  );
}
