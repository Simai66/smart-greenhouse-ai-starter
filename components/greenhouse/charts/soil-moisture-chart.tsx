"use client";

import { Droplets, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
};

export function SoilMoistureChart({
  points,
  rangeLabel,
  targetMin,
  targetMax,
  recommendation,
}: SoilMoistureChartProps) {
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
          <h2 className="text-base font-semibold">ความชื้นดิน · โซน A</h2>
          <p className="text-sm text-muted-foreground">
            ค่าจากเซ็นเซอร์ A-02 · อัปเดตตามช่วงที่เลือก
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
          className="min-h-[15rem] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={points.map((point) => ({
              ...point,
              soilMoisture: point.value,
            }))}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
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
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-3 border-t">
        <div className="flex w-full items-start justify-between gap-4 text-sm">
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
          <div className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <strong>คำแนะนำ</strong>
            <span className="ml-2">{recommendation}</span>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}
