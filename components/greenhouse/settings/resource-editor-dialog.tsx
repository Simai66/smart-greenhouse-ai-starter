"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ResourceKind = "device" | "camera" | "sensor";

export type ResourceZone = { id: string; name: string };

export type ResourceEditorValue = {
  kind: ResourceKind;
  name: string;
  zoneId: string;
  enabled: boolean;
  status: "online" | "offline" | "enabled" | "disabled";
};

type ResourceEditorDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  zones: ResourceZone[];
  initialValue: ResourceEditorValue;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: ResourceEditorValue) => void;
};

const kindLabels: Record<ResourceKind, string> = {
  device: "อุปกรณ์",
  camera: "กล้อง",
  sensor: "เซ็นเซอร์",
};

export function ResourceEditorDialog({ open, mode, zones, initialValue, onOpenChange, onSubmit }: ResourceEditorDialogProps) {
  const [draft, setDraft] = useState(initialValue);
  const [error, setError] = useState("");
  const canBind = zones.length > 0;

  useEffect(() => {
    if (open) {
      setDraft(initialValue);
      setError("");
    }
  }, [initialValue, open]);

  const submit = () => {
    const name = draft.name.trim();
    const selectedZoneIsActive = zones.some((zone) => zone.id === draft.zoneId);
    if (!name || !canBind || !selectedZoneIsActive) {
      setError("กรุณาระบุชื่อและเลือกโซนที่กำลังใช้งานก่อนบันทึก");
      return;
    }
    onSubmit({ ...draft, name });
  };

  const online = draft.status === "online" || draft.status === "enabled";
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "เพิ่มทรัพยากร" : "แก้ไขทรัพยากร"}</DialogTitle>
        <DialogDescription>กำหนดชื่อ ประเภท และโซนของทรัพยากรในโรงเรือนนี้</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        {!canBind ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground" role="status">ยังไม่มีโซนที่ใช้งานอยู่ กรุณาเพิ่มโซนก่อนผูกทรัพยากร</p> : null}
        <div className="space-y-2">
          <Label htmlFor="resource-name">ชื่อ</Label>
          <Input id="resource-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น ปั๊มน้ำโซน A" autoFocus />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resource-kind">ประเภททรัพยากร</Label>
          <Select value={draft.kind} disabled={mode === "edit"} onValueChange={(kind: ResourceKind) => setDraft((current) => ({ ...current, kind, status: kind === "device" ? (current.enabled ? "enabled" : "disabled") : (current.enabled ? "online" : "offline") }))}>
            <SelectTrigger id="resource-kind" className="h-11 w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(kindLabels) as ResourceKind[]).map((kind) => <SelectItem key={kind} value={kind}>{kindLabels[kind]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resource-zone">โซนที่ผูก</Label>
          <Select value={draft.zoneId} disabled={!canBind} onValueChange={(zoneId) => setDraft((current) => ({ ...current, zoneId }))}>
            <SelectTrigger id="resource-zone" className="h-11 w-full"><SelectValue placeholder="เลือกโซน" /></SelectTrigger>
            <SelectContent>{zones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div><Label htmlFor="resource-enabled">สถานะการใช้งาน</Label><p className="mt-1 text-xs text-muted-foreground">สถานะปัจจุบันของ{kindLabels[draft.kind]}จะแสดงจากการตั้งค่าเดโม</p></div>
          <div className="flex items-center gap-2"><Badge variant={online ? "secondary" : "outline"} className={online ? "text-primary" : "text-muted-foreground"}>{online ? "พร้อมใช้งาน" : "ปิดหรือออฟไลน์"}</Badge><Switch id="resource-enabled" checked={draft.enabled} onCheckedChange={(enabled) => setDraft((current) => ({ ...current, enabled, status: current.kind === "device" ? (enabled ? "enabled" : "disabled") : (enabled ? "online" : "offline") }))} aria-label={`สถานะ ${draft.name || kindLabels[draft.kind]}`} /></div>
        </div>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      </div>
      <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button><Button type="button" disabled={!canBind} onClick={submit}>{mode === "create" ? "เพิ่มทรัพยากร" : "บันทึกการแก้ไข"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
