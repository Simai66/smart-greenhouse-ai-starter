"use client";

import { Camera, Cpu, Pencil, Plus, Radio, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResourceKind, ResourceZone } from "@/components/greenhouse/settings/resource-editor-dialog";

export type ResourceListItem = {
  id: string;
  name: string;
  kind: ResourceKind;
  zoneId?: string;
  enabled: boolean;
  status: "online" | "offline" | "enabled" | "disabled";
};

type ResourceListProps = {
  kind: ResourceKind;
  resources: ResourceListItem[];
  zones: ResourceZone[];
  onCreate: (kind: ResourceKind) => void;
  onEdit: (resource: ResourceListItem) => void;
  onDelete: (resource: ResourceListItem) => void;
};

const kindPresentation: Record<ResourceKind, { label: string; Icon: typeof Cpu }> = {
  device: { label: "อุปกรณ์", Icon: Cpu },
  camera: { label: "กล้อง", Icon: Camera },
  sensor: { label: "เซ็นเซอร์", Icon: Radio },
};

export function ResourceList({ kind, resources, zones, onCreate, onEdit, onDelete }: ResourceListProps) {
  const { label, Icon } = kindPresentation[kind];
  const zoneName = (zoneId?: string) => zones.find((zone) => zone.id === zoneId)?.name ?? "ยังไม่กำหนดโซน";
  return <section className="rounded-xl border border-border/70" aria-label={`รายการ${label}`}>
    <div className="flex items-center justify-between gap-3 border-b border-border/70 p-3">
      <p className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-primary" aria-hidden="true" />{label}</p>
      <Button type="button" size="sm" variant="outline" onClick={() => onCreate(kind)}><Plus className="size-3.5" aria-hidden="true" />เพิ่ม</Button>
    </div>
    <div className="divide-y">
      {resources.length ? resources.map((resource) => {
        const online = resource.status === "online" || resource.status === "enabled";
        return <div key={resource.id} className="flex items-start justify-between gap-3 p-3">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{resource.name}</p><Badge variant={online ? "secondary" : "outline"} className={online ? "text-primary" : "text-muted-foreground"}>{online ? "พร้อมใช้" : "ปิด/ออฟไลน์"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{label} · {resource.id} · {zoneName(resource.zoneId)}</p></div>
          <div className="flex shrink-0 gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`แก้ไข ${resource.name}`} onClick={() => onEdit(resource)}><Pencil className="size-3.5" aria-hidden="true" /></Button><Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={`ลบ ${resource.name}`} onClick={() => onDelete(resource)}><Trash2 className="size-3.5" aria-hidden="true" /></Button></div>
        </div>;
      }) : <p className="p-5 text-center text-sm text-muted-foreground">ยังไม่มี{label}ในโรงเรือนนี้</p>}
    </div>
  </section>;
}
