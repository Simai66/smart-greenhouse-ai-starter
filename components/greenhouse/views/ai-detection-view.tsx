"use client";

import Image from "next/image";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DemoPlant } from "@/lib/greenhouse-demo-store";

export type AiDetectionViewProps = {
  plant: DemoPlant;
  reviewed: boolean;
  onSave: () => void;
};

export function AiDetectionView({
  plant,
  reviewed,
  onSave,
}: AiDetectionViewProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]">
      <Card className="overflow-hidden">
        <CardHeader><h2 className="font-semibold">ภาพหลักฐานล่าสุด · {plant.id}</h2></CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-[16/10] bg-muted">
            <Image
              src="/images/tomato-leaf-spot-detail.webp"
              alt="ใบมะเขือเทศที่พบรอยจุดสีน้ำตาลขนาดเล็ก"
              fill
              unoptimized
              className="object-cover"
            />
            <span className="absolute left-[42%] top-[38%] size-12 rounded-md border-2 border-amber-400" aria-hidden="true" />
          </div>
          <div className="grid gap-1 border-t p-4 text-sm sm:grid-cols-2">
            <span><strong>กล้องจำลอง 01</strong><small className="block text-muted-foreground">{plant.zone}</small></span>
            <span><strong>ตรวจเมื่อ 07:00 น.</strong><small className="block text-muted-foreground">ภาพ WebP สำหรับการแสดงผล</small></span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3">
          <div><h2 className="font-semibold">สรุปผลการวิเคราะห์</h2><p className="text-sm text-muted-foreground">โมเดลตรวจสุขภาพใบมะเขือเทศ</p></div>
          <Badge variant="destructive">ควรตรวจสอบ</Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div><div className="flex items-center justify-between text-sm"><span>ความมั่นใจของโมเดล</span><strong className="tabular-nums">{plant.confidence}%</strong></div><Progress value={plant.confidence} className="mt-2" /></div>
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950"><CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><strong>{plant.name} · อาจมีอาการใบจุดระยะแรก</strong><p className="mt-1 text-sm">พบรอยสีน้ำตาลวงเล็กและขอบสีเหลืองจาง ระดับความรุนแรงปานกลาง</p></div></div>
          <div className="rounded-lg bg-secondary p-4"><strong>ขั้นตอนถัดไป</strong><p className="mt-1 text-sm text-muted-foreground">แยกตรวจใบจริง ลดความเปียกชื้นบนใบ และถ่ายภาพซ้ำในอีก 24 ชั่วโมง</p></div>
          <Button className="min-h-11 w-full" onClick={onSave} disabled={reviewed}>
            <CheckCircle2 aria-hidden="true" />
            {reviewed ? "บันทึกผลตรวจแล้ว" : "บันทึกผลการตรวจสอบ"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
