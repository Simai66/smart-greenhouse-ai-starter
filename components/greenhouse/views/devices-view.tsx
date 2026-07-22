"use client";

import { CloudSun, Droplets, Fan, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { DemoDevice } from "@/lib/greenhouse-demo-store";

const icons = {
  pump: Droplets,
  fan: Fan,
  light: Lightbulb,
  mist: CloudSun,
} as const;

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
  return (
    <div className="space-y-4">
      <p
        id="device-demo-note"
        role="note"
        className="rounded-lg border bg-secondary p-4 text-base text-secondary-foreground"
      >
        {online
          ? "โหมดสาธิต: ทุกคำสั่งต้องยืนยันและจะเปลี่ยนสถานะหลังเดโมตอบรับเท่านั้น"
          : "ออฟไลน์: แสดงข้อมูลล่าสุดที่บันทึกไว้และปิดคำสั่งอุปกรณ์ชั่วคราว"}
      </p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {devices.map((device) => {
          const Icon = icons[device.icon];
          const pending = pendingDeviceId === device.id;
          return (
            <Card key={device.id}>
              <CardContent className="space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-lg bg-secondary p-3 text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                  <Switch
                    aria-label={(device.active ? "ปิด" : "เปิด") + device.name}
                    aria-describedby="device-demo-note"
                    checked={device.active}
                    disabled={!online || Boolean(pendingDeviceId)}
                    onCheckedChange={() => onRequest(device)}
                  />
                </div>
                <div><h2 className="text-xl font-semibold leading-snug">{device.name}</h2><p className="text-base text-muted-foreground">{device.detail}</p></div>
                <div className="flex items-center justify-between border-t pt-4 text-base"><span className="text-muted-foreground">สถานะ</span><Badge variant={device.active ? "secondary" : "outline"}>{!online ? "ออฟไลน์ · ข้อมูลล่าสุด" : pending ? "กำลังส่งคำสั่ง" : device.active ? "กำลังทำงาน" : "ออนไลน์ · ปิดอยู่"}</Badge></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
