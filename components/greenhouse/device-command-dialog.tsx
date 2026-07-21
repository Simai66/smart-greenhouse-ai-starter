"use client";

import { Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DemoDevice } from "@/lib/greenhouse-demo-store";

export type PendingDevice = {
  device: DemoDevice;
  nextActive: boolean;
} | null;

export function DeviceCommandDialog({
  pending,
  commandPending,
  online,
  onClose,
  onConfirm,
}: {
  pending: PendingDevice;
  commandPending: boolean;
  online: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(pending)} onOpenChange={(open) => { if (!open && !commandPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-lg bg-secondary text-primary"><Cpu aria-hidden="true" /></span>
          <DialogTitle>ยืนยันการ{pending?.nextActive ? "เปิด" : "ปิด"}{pending?.device.name}</DialogTitle>
          <DialogDescription>{online ? "คำสั่งนี้เป็นโหมดสาธิต ระบบจะรอการตอบรับก่อนเปลี่ยนสถานะที่แสดง และจะไม่ส่งคำสั่งไปยังอุปกรณ์จริง" : "ระบบออฟไลน์ คำสั่งอุปกรณ์ถูกปิดไว้จนกว่าจะเชื่อมต่ออีกครั้ง"}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted p-3 text-sm"><strong>ผลที่คาดหวัง</strong><p className="text-muted-foreground">{pending?.nextActive ? "อุปกรณ์เริ่มทำงานตามรอบสาธิต" : "อุปกรณ์หยุดทำงานหลังเดโมตอบรับ"}</p><p className="mt-2 text-muted-foreground">ระยะเวลารอบสาธิต: 10 นาที</p></div>
        <DialogFooter>
          <Button variant="outline" className="min-h-11" disabled={commandPending} onClick={onClose}>ยกเลิก</Button>
          <Button className="min-h-11" disabled={!online || commandPending} onClick={onConfirm}>{commandPending ? "กำลังรอเดโมตอบรับ" : online ? "ยืนยันคำสั่งเดโม" : "ออฟไลน์ · ส่งคำสั่งไม่ได้"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
