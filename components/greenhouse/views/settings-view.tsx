"use client";

import { useMemo, useState } from "react";
import { Archive, BellRing, Bot, Camera, Clock3, Cpu, Droplets, MapPin, Pencil, Plus, RotateCcw, Settings2, Sparkles, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourceEditorDialog, type ResourceEditorValue, type ResourceKind } from "@/components/greenhouse/settings/resource-editor-dialog";
import { ResourceList, type ResourceListItem } from "@/components/greenhouse/settings/resource-list";
import { validateDemoSettings } from "@/lib/dashboard-interactions";
import type { DemoCamera, DemoCropBatch, DemoDevice, DemoGreenhouse, DemoSensor, DemoSettings } from "@/lib/greenhouse-demo-store";

const automationItems = [
  { key: "water", label: "รดน้ำเมื่อความชื้นในดินต่ำ", detail: "อ้างอิงเกณฑ์ความชื้นดินด้านบน" },
  { key: "fan", label: "เปิดพัดลมเมื่ออุณหภูมิสูง", detail: "หน่วงเวลาเพื่อป้องกันการสั่งงานถี่เกินไป" },
  { key: "light", label: "เปิดไฟตามตารางเวลา", detail: "ใช้เวลาเริ่มและเวลาสิ้นสุดด้านล่าง" },
  { key: "alert", label: "แจ้งเตือนเมื่อพบใบผิดปกติ", detail: "ใช้ผลตรวจ AI ที่ผ่านค่าความมั่นใจขั้นต่ำ" },
] as const;

type SettingSectionProps = { icon: React.ReactNode; title: string; description: string; children: React.ReactNode };
function SettingSection({ icon, title, description, children }: SettingSectionProps) {
  return <Card className="shadow-none"><CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-border/70 pb-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><p className="page-kicker">การตั้งค่า</p><h2 className="mt-1 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></CardHeader><CardContent className="pt-1">{children}</CardContent></Card>;
}

function NumberField({ id, label, unit, value, onChange, min, max }: { id: string; label: string; unit: string; value: string; onChange: (value: string) => void; min?: number; max?: number }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type="number" min={min} max={max} className="min-h-11 pr-12" value={value} onChange={(event) => onChange(event.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span></div></div>;
}

function CameraRow({ camera, onChange }: { camera: DemoCamera; onChange: (next: DemoCamera) => void }) {
  return <div className="flex flex-col gap-3 border-b border-border/70 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Camera className="size-4" aria-hidden="true" /></span><div><div className="flex flex-wrap items-center gap-2"><Label htmlFor={`camera-${camera.id}`}>{camera.name}</Label><Badge variant={camera.status === "online" ? "secondary" : "outline"} className={camera.status === "online" ? "text-primary" : "text-muted-foreground"}>{camera.status === "online" ? "ออนไลน์" : "ออฟไลน์"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{camera.id} · {camera.zone} · {camera.source} · ถ่ายทุก {camera.captureInterval}</p></div></div><Switch id={`camera-${camera.id}`} aria-label={`เปิดใช้งาน ${camera.name}`} checked={camera.enabled} onCheckedChange={(enabled) => onChange({ ...camera, enabled })} /></div>;
}

type GreenhouseDraft = Pick<DemoGreenhouse, "name" | "code">;

const greenhouseSuggestions: Array<GreenhouseDraft> = [
  { name: "โรงเรือนผักสลัด", code: "GREENHOUSE 02" },
  { name: "โรงเรือนสมุนไพร", code: "GREENHOUSE 03" },
  { name: "โรงเรือนเพาะกล้า", code: "NURSERY 01" },
];

const zoneSuggestions = ["โซน A", "โซน B", "โซนเพาะกล้า", "โซนทดลอง"];

function NameSuggestions({
  label,
  suggestions,
  onChoose,
}: {
  label: string;
  suggestions: string[];
  onChoose: (suggestion: string) => void;
}) {
  return <div className="space-y-2"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5" aria-hidden="true" />{label}</p><div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => onChoose(suggestion)}>{suggestion}</Button>)}</div></div>;
}

function FarmStructureSection({ greenhouses, onSaveGreenhouse, onArchiveGreenhouse, onRestoreGreenhouse, onAddZone, onArchiveZone, onRestoreZone }: {
  greenhouses: DemoGreenhouse[];
  onSaveGreenhouse: (id: string | null, draft: GreenhouseDraft) => void;
  onArchiveGreenhouse: (id: string) => void;
  onRestoreGreenhouse: (id: string) => void;
  onAddZone: (greenhouseId: string, name: string) => void;
  onArchiveZone: (greenhouseId: string, zoneId: string) => void;
  onRestoreZone: (greenhouseId: string, zoneId: string) => void;
}) {
  const [editing, setEditing] = useState<DemoGreenhouse | null | undefined>(undefined);
  const [draft, setDraft] = useState<GreenhouseDraft>({ name: "", code: "" });
  const [zoneGreenhouseId, setZoneGreenhouseId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [formError, setFormError] = useState("");
  const editingOpen = editing !== undefined;
  const zoneGreenhouse = greenhouses.find((greenhouse) => greenhouse.id === zoneGreenhouseId);
  const activeCount = greenhouses.filter((greenhouse) => greenhouse.status === "active").length;

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", code: "" });
    setFormError("");
  };
  const openEdit = (greenhouse: DemoGreenhouse) => {
    setEditing(greenhouse);
    setDraft({ name: greenhouse.name, code: greenhouse.code });
    setFormError("");
  };
  const saveGreenhouse = () => {
    const name = draft.name.trim();
    const code = draft.code.trim();
    if (!name || !code) {
      setFormError("กรุณาระบุชื่อและรหัสโรงเรือน");
      return;
    }
    onSaveGreenhouse(editing?.id ?? null, { name, code });
    setEditing(undefined);
  };
  const saveZone = () => {
    const name = zoneName.trim();
    if (!zoneGreenhouse || !name) {
      setFormError("กรุณาระบุชื่อโซน");
      return;
    }
    onAddZone(zoneGreenhouse.id, name);
    setZoneGreenhouseId(null);
    setZoneName("");
    setFormError("");
  };

  return <>
    <SettingSection icon={<Warehouse className="size-5" aria-hidden="true" />} title="โรงเรือนและโซน" description="กำหนดโครงสร้างพื้นที่ก่อนเพิ่มรอบปลูก อุปกรณ์ หรือกล้อง">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
        <p className="text-sm text-muted-foreground">เปิดใช้งาน <span className="font-medium text-foreground">{activeCount} โรงเรือน</span> · จัดการโซนได้จากรายการด้านล่าง</p>
        <Button type="button" size="sm" className="min-h-10" onClick={openCreate}><Plus className="size-4" aria-hidden="true" />เพิ่มโรงเรือน</Button>
      </div>
      <div className="divide-y">
        {greenhouses.map((greenhouse) => {
          const activeZones = greenhouse.zones.filter((zone) => zone.status === "active");
          return <section key={greenhouse.id} className="py-5 first:pt-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Warehouse className="size-4" aria-hidden="true" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{greenhouse.name}</h3><Badge variant={greenhouse.status === "active" ? "secondary" : "outline"} className={greenhouse.status === "active" ? "text-primary" : "text-muted-foreground"}>{greenhouse.status === "active" ? "ใช้งานอยู่" : "เก็บถาวร"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{greenhouse.code} · {activeZones.length} โซนที่ใช้งาน</p></div></div>
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(greenhouse)}><Pencil className="size-3.5" aria-hidden="true" />แก้ไข</Button>{greenhouse.status === "active" ? <Button type="button" variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => onArchiveGreenhouse(greenhouse.id)}><Archive className="size-3.5" aria-hidden="true" />เก็บถาวร</Button> : <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => onRestoreGreenhouse(greenhouse.id)}><RotateCcw className="size-3.5" aria-hidden="true" />เรียกคืน</Button>}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {greenhouse.zones.map((zone) => <div key={zone.id} className="flex items-center gap-1 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm"><MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" /><span>{zone.name}</span>{zone.status === "archived" ? <><Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] text-muted-foreground">เก็บถาวร</Badge><Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`เรียกคืน ${zone.name}`} onClick={() => onRestoreZone(greenhouse.id, zone.id)}><RotateCcw className="size-3" aria-hidden="true" /></Button></> : <Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`เก็บ ${zone.name} ถาวร`} onClick={() => onArchiveZone(greenhouse.id, zone.id)}><Archive className="size-3" aria-hidden="true" /></Button>}</div>)}
              {greenhouse.status === "active" ? <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => { setZoneGreenhouseId(greenhouse.id); setZoneName(""); setFormError(""); }}><Plus className="size-3.5" aria-hidden="true" />เพิ่มโซน</Button> : null}
            </div>
          </section>;
        })}
      </div>
    </SettingSection>
    <Dialog open={editingOpen} onOpenChange={(open) => !open && setEditing(undefined)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "แก้ไขโรงเรือน" : "เพิ่มโรงเรือน"}</DialogTitle><DialogDescription>ชื่อและรหัสนี้จะใช้ระบุพื้นที่ในระบบ</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2"><div className="space-y-2"><Label htmlFor="greenhouse-name">ชื่อโรงเรือน</Label><Input id="greenhouse-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น โรงเรือนผักสลัด" /></div>{!editing ? <NameSuggestions label="เลือกชื่อแนะนำเพื่อเริ่มต้น" suggestions={greenhouseSuggestions.map((suggestion) => suggestion.name)} onChoose={(name) => setDraft(greenhouseSuggestions.find((suggestion) => suggestion.name === name) ?? { name, code: draft.code })} /> : null}<div className="space-y-2"><Label htmlFor="greenhouse-code">รหัสโรงเรือน</Label><Input id="greenhouse-code" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="เช่น GREENHOUSE 02" /></div>{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>ยกเลิก</Button><Button type="button" onClick={saveGreenhouse}>บันทึกโรงเรือน</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(zoneGreenhouseId)} onOpenChange={(open) => !open && setZoneGreenhouseId(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>เพิ่มโซน</DialogTitle><DialogDescription>{zoneGreenhouse ? `เพิ่มพื้นที่ภายใน ${zoneGreenhouse.name}` : "ระบุชื่อพื้นที่"}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="zone-name">ชื่อโซน</Label><Input id="zone-name" value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="เช่น โซน C" /></div><NameSuggestions label="เลือกชื่อแนะนำเพื่อเริ่มต้น" suggestions={zoneSuggestions} onChoose={setZoneName} />{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setZoneGreenhouseId(null)}>ยกเลิก</Button><Button type="button" onClick={saveZone}>เพิ่มโซน</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

type CropBatchDraft = Pick<DemoCropBatch, "greenhouseId" | "zoneId" | "cropName" | "cultivar" | "plantCount" | "plantedAt">;
const cropSuggestions = ["ผักสลัด", "คอส", "กรีนโอ๊ค", "เรดโอ๊ค", "มะเขือเทศเชอร์รี", "โหระพา"];

function CropBatchesSection({ greenhouses, cropBatches, activeGreenhouseId, onSaveBatch, onArchiveBatch, onRestoreBatch }: {
  greenhouses: DemoGreenhouse[];
  cropBatches: DemoCropBatch[];
  activeGreenhouseId: string;
  onSaveBatch: (id: string | null, draft: CropBatchDraft) => void;
  onArchiveBatch: (id: string) => void;
  onRestoreBatch: (id: string) => void;
}) {
  const [editing, setEditing] = useState<DemoCropBatch | null | undefined>(undefined);
  const activeGreenhouse = greenhouses.find((greenhouse) => greenhouse.id === activeGreenhouseId) ?? greenhouses[0];
  const [draft, setDraft] = useState<CropBatchDraft>({ greenhouseId: activeGreenhouseId, zoneId: "", cropName: "", cultivar: "", plantCount: 1, plantedAt: new Date().toISOString().slice(0, 10) });
  const [formError, setFormError] = useState("");
  const draftGreenhouse = greenhouses.find((greenhouse) => greenhouse.id === draft.greenhouseId);
  const activeZones = draftGreenhouse?.zones.filter((zone) => zone.status === "active") ?? [];
  const visibleBatches = cropBatches.filter((batch) => batch.greenhouseId === activeGreenhouseId);
  const openCreate = () => { setEditing(null); setDraft({ greenhouseId: activeGreenhouseId, zoneId: activeGreenhouse?.zones.find((zone) => zone.status === "active")?.id ?? "", cropName: "", cultivar: "", plantCount: 1, plantedAt: new Date().toISOString().slice(0, 10) }); setFormError(""); };
  const openEdit = (batch: DemoCropBatch) => { setEditing(batch); setDraft({ greenhouseId: batch.greenhouseId, zoneId: batch.zoneId, cropName: batch.cropName, cultivar: batch.cultivar, plantCount: batch.plantCount, plantedAt: batch.plantedAt }); setFormError(""); };
  const save = () => { if (!draft.cropName.trim() || !draft.zoneId || draft.plantCount < 1 || !draft.plantedAt) { setFormError("กรุณาระบุผัก โซน จำนวนต้น และวันที่ปลูกให้ครบ"); return; } onSaveBatch(editing?.id ?? null, { ...draft, cropName: draft.cropName.trim(), cultivar: draft.cultivar.trim() }); setEditing(undefined); };
  const zoneName = (batch: DemoCropBatch) => greenhouses.find((greenhouse) => greenhouse.id === batch.greenhouseId)?.zones.find((zone) => zone.id === batch.zoneId)?.name ?? "ไม่ระบุโซน";

  return <>
    <SettingSection icon={<Sparkles className="size-5" aria-hidden="true" />} title="รอบปลูก" description="บันทึกพืชและจำนวนต้นตามโรงเรือน/โซนที่กำลังเลือกอยู่">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4"><p className="text-sm text-muted-foreground">{activeGreenhouse?.name ?? "โรงเรือนที่เลือก"} · {visibleBatches.filter((batch) => batch.status === "active").length} รอบที่กำลังปลูก</p><Button type="button" size="sm" className="min-h-10" onClick={openCreate}><Plus className="size-4" aria-hidden="true" />เพิ่มรอบปลูก</Button></div>
      <div className="divide-y">{visibleBatches.length ? visibleBatches.map((batch) => <div key={batch.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{batch.cropName}</p><Badge variant={batch.status === "active" ? "secondary" : "outline"} className={batch.status === "active" ? "text-primary" : "text-muted-foreground"}>{batch.status === "active" ? "กำลังปลูก" : batch.status === "harvested" ? "เก็บเกี่ยวแล้ว" : "เก็บถาวร"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{zoneName(batch)} · {batch.plantCount} ต้น · ปลูก {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(`${batch.plantedAt}T00:00:00`))}{batch.cultivar ? ` · ${batch.cultivar}` : ""}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => openEdit(batch)}><Pencil className="size-3.5" aria-hidden="true" />แก้ไข</Button>{batch.status === "archived" ? <Button type="button" variant="outline" size="sm" onClick={() => onRestoreBatch(batch.id)}><RotateCcw className="size-3.5" aria-hidden="true" />เรียกคืน</Button> : <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onArchiveBatch(batch.id)}><Archive className="size-3.5" aria-hidden="true" />เก็บถาวร</Button>}</div></div>) : <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีรอบปลูกในโรงเรือนนี้</p>}</div>
    </SettingSection>
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}><DialogContent><DialogHeader><DialogTitle>{editing ? "แก้ไขรอบปลูก" : "เพิ่มรอบปลูก"}</DialogTitle><DialogDescription>ข้อมูลนี้แยกตามโรงเรือนและโซน เพื่อไม่ปะปนกับรอบปลูกอื่น</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label htmlFor="crop-greenhouse">โรงเรือน</Label><Select value={draft.greenhouseId} onValueChange={(greenhouseId) => { const greenhouse = greenhouses.find((item) => item.id === greenhouseId); setDraft((current) => ({ ...current, greenhouseId, zoneId: greenhouse?.zones.find((zone) => zone.status === "active")?.id ?? "" })); }}><SelectTrigger id="crop-greenhouse" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{greenhouses.filter((greenhouse) => greenhouse.status === "active").map((greenhouse) => <SelectItem key={greenhouse.id} value={greenhouse.id}>{greenhouse.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="crop-zone">โซน</Label><Select value={draft.zoneId} onValueChange={(zoneId) => setDraft((current) => ({ ...current, zoneId }))}><SelectTrigger id="crop-zone" className="h-11 w-full"><SelectValue placeholder="เลือกโซน" /></SelectTrigger><SelectContent>{activeZones.map((zone) => <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="crop-name">ชนิดผัก</Label><Input id="crop-name" value={draft.cropName} onChange={(event) => setDraft((current) => ({ ...current, cropName: event.target.value }))} placeholder="เช่น ผักสลัด" /></div><NameSuggestions label="เลือกชื่อแนะนำเพื่อเริ่มต้น" suggestions={cropSuggestions} onChoose={(cropName) => setDraft((current) => ({ ...current, cropName }))} /><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="crop-cultivar">สายพันธุ์ (ถ้ามี)</Label><Input id="crop-cultivar" value={draft.cultivar} onChange={(event) => setDraft((current) => ({ ...current, cultivar: event.target.value }))} placeholder="เช่น Green Cos" /></div><div className="space-y-2"><Label htmlFor="crop-count">จำนวนต้น</Label><Input id="crop-count" type="number" min="1" value={draft.plantCount} onChange={(event) => setDraft((current) => ({ ...current, plantCount: Number(event.target.value) || 0 }))} /></div></div><div className="space-y-2"><Label htmlFor="crop-date">วันที่ปลูก</Label><Input id="crop-date" type="date" value={draft.plantedAt} onChange={(event) => setDraft((current) => ({ ...current, plantedAt: event.target.value }))} /></div>{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>ยกเลิก</Button><Button type="button" onClick={save}>บันทึกรอบปลูก</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

function ResourceBindingsSection({ greenhouses, activeGreenhouseId, devices, cameras, sensors, onCreateResource, onMoveResource, onRenameResource, onUpdateResourceStatus, onDeleteResource }: {
  greenhouses: DemoGreenhouse[];
  activeGreenhouseId: string;
  devices: DemoDevice[];
  cameras: DemoCamera[];
  sensors: DemoSensor[];
  onCreateResource: (value: ResourceEditorValue) => void;
  onMoveResource: (kind: ResourceKind, id: string, zoneId: string) => void;
  onRenameResource: (kind: ResourceKind, id: string, name: string) => void;
  onUpdateResourceStatus: (kind: ResourceKind, id: string, value: Pick<ResourceEditorValue, "enabled" | "status">) => void;
  onDeleteResource: (kind: ResourceKind, id: string) => void;
}) {
  const [editing, setEditing] = useState<ResourceListItem | null>(null);
  const [creatingKind, setCreatingKind] = useState<ResourceKind | null>(null);
  const [deleting, setDeleting] = useState<ResourceListItem | null>(null);
  const greenhouse = greenhouses.find((item) => item.id === activeGreenhouseId);
  const zones = greenhouse?.zones.filter((zone) => zone.status === "active") ?? [];
  const resourceGroups = useMemo(() => ({
    device: devices.filter((item) => item.greenhouseId === activeGreenhouseId).map((item): ResourceListItem => ({ id: item.id, name: item.name, kind: "device", zoneId: item.zoneId, enabled: item.active, status: item.active ? "enabled" : "disabled" })),
    camera: cameras.filter((item) => item.greenhouseId === activeGreenhouseId).map((item): ResourceListItem => ({ id: item.id, name: item.name, kind: "camera", zoneId: item.zoneId, enabled: item.enabled, status: item.status })),
    sensor: sensors.filter((item) => item.greenhouseId === activeGreenhouseId).map((item): ResourceListItem => ({ id: item.id, name: item.name, kind: "sensor", zoneId: item.zoneId, enabled: item.status === "online", status: item.status })),
  }), [activeGreenhouseId, cameras, devices, sensors]);
  const defaultEditorValue = (kind: ResourceKind): ResourceEditorValue => ({ kind, name: "", zoneId: zones[0]?.id ?? "", enabled: kind !== "device", status: kind === "sensor" || kind === "camera" ? "online" : "disabled" });
  const editorValue = editing ? { kind: editing.kind, name: editing.name, zoneId: editing.zoneId ?? zones[0]?.id ?? "", enabled: editing.enabled, status: editing.status } : defaultEditorValue(creatingKind ?? "device");
  const submitEditor = (value: ResourceEditorValue) => {
    if (editing) {
      if (editing.name !== value.name) onRenameResource(editing.kind, editing.id, value.name);
      if (editing.zoneId !== value.zoneId) onMoveResource(editing.kind, editing.id, value.zoneId);
      if (editing.enabled !== value.enabled || editing.status !== value.status) onUpdateResourceStatus(editing.kind, editing.id, value);
      setEditing(null);
      return;
    }
    onCreateResource(value);
    setCreatingKind(null);
  };

  return <><SettingSection icon={<Cpu className="size-5" aria-hidden="true" />} title="ทรัพยากรในโรงเรือน" description="ผูกอุปกรณ์ กล้อง และเซ็นเซอร์กับโซนของโรงเรือนที่กำลังเลือกอยู่">
    {!zones.length ? <p className="mb-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">เพิ่มโซนก่อน แล้วจึงผูกอุปกรณ์ กล้อง หรือเซ็นเซอร์ได้</p> : null}
    <div className="grid gap-4 xl:grid-cols-3">{(["device", "camera", "sensor"] as ResourceKind[]).map((kind) => <ResourceList key={kind} kind={kind} resources={resourceGroups[kind]} zones={zones} onCreate={setCreatingKind} onEdit={setEditing} onDelete={setDeleting} />)}</div>
  </SettingSection>
  <ResourceEditorDialog open={Boolean(editing || creatingKind)} mode={editing ? "edit" : "create"} zones={zones} initialValue={editorValue} onOpenChange={(open) => { if (!open) { setEditing(null); setCreatingKind(null); } }} onSubmit={submitEditor} />
  <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}><DialogContent><DialogHeader><DialogTitle>ลบทรัพยากร?</DialogTitle><DialogDescription>{deleting ? `จะลบ “${deleting.name}” ออกจากโรงเรือน ข้อมูลนี้เรียกคืนจากหน้านี้ไม่ได้` : ""}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" onClick={() => setDeleting(null)}>ยกเลิก</Button><Button type="button" variant="destructive" onClick={() => { if (!deleting) return; onDeleteResource(deleting.kind, deleting.id); setDeleting(null); }}>ลบถาวร</Button></DialogFooter></DialogContent></Dialog>
  </>;
}

export function SettingsView({ settings, greenhouses, cropBatches, activeGreenhouseId, devices, sensors, onSave, onSaveGreenhouse, onArchiveGreenhouse, onRestoreGreenhouse, onAddZone, onArchiveZone, onRestoreZone, onSaveBatch, onArchiveBatch, onRestoreBatch, onCreateResource, onMoveResource, onRenameResource, onUpdateResourceStatus, onDeleteResource }: { settings: DemoSettings; greenhouses: DemoGreenhouse[]; cropBatches: DemoCropBatch[]; activeGreenhouseId: string; devices: DemoDevice[]; sensors: DemoSensor[]; onSave: (settings: DemoSettings) => void; onSaveGreenhouse: (id: string | null, draft: GreenhouseDraft) => void; onArchiveGreenhouse: (id: string) => void; onRestoreGreenhouse: (id: string) => void; onAddZone: (greenhouseId: string, name: string) => void; onArchiveZone: (greenhouseId: string, zoneId: string) => void; onRestoreZone: (greenhouseId: string, zoneId: string) => void; onSaveBatch: (id: string | null, draft: CropBatchDraft) => void; onArchiveBatch: (id: string) => void; onRestoreBatch: (id: string) => void; onCreateResource: (value: ResourceEditorValue) => void; onMoveResource: (kind: "device" | "camera" | "sensor", id: string, zoneId: string) => void; onRenameResource: (kind: "device" | "camera" | "sensor", id: string, name: string) => void; onUpdateResourceStatus: (kind: "device" | "camera" | "sensor", id: string, value: Pick<ResourceEditorValue, "enabled" | "status">) => void; onDeleteResource: (kind: "device" | "camera" | "sensor", id: string) => void }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) {
    const hasUnsavedSettingsChanges = JSON.stringify(draft) !== JSON.stringify(prevSettings);
    setDraft(hasUnsavedSettingsChanges ? { ...draft, cameras: settings.cameras } : settings);
    setPrevSettings(settings);
  }
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  const update = <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => { const message = validateDemoSettings(draft); if (message) { setError(message); return; } setError(""); onSave(draft); };

  return <div className="space-y-6">
    <FarmStructureSection greenhouses={greenhouses} onSaveGreenhouse={onSaveGreenhouse} onArchiveGreenhouse={onArchiveGreenhouse} onRestoreGreenhouse={onRestoreGreenhouse} onAddZone={onAddZone} onArchiveZone={onArchiveZone} onRestoreZone={onRestoreZone} />
    <CropBatchesSection greenhouses={greenhouses} cropBatches={cropBatches} activeGreenhouseId={activeGreenhouseId} onSaveBatch={onSaveBatch} onArchiveBatch={onArchiveBatch} onRestoreBatch={onRestoreBatch} />
    <ResourceBindingsSection greenhouses={greenhouses} activeGreenhouseId={activeGreenhouseId} devices={devices} cameras={settings.cameras} sensors={sensors} onCreateResource={onCreateResource} onMoveResource={onMoveResource} onRenameResource={onRenameResource} onUpdateResourceStatus={onUpdateResourceStatus} onDeleteResource={onDeleteResource} />
    <SettingSection icon={<Settings2 className="size-5" aria-hidden="true" />} title="ค่าเป้าหมายสภาพแวดล้อม" description="ใช้กับการควบคุมอัตโนมัติและคำเตือนในเดโม">
      <div className="grid gap-4 md:grid-cols-2"><NumberField id="minTemperature" label="อุณหภูมิต่ำสุด" unit="°C" value={draft.minTemperature} onChange={(value) => update("minTemperature", value)} /><NumberField id="maxTemperature" label="อุณหภูมิสูงสุด" unit="°C" value={draft.maxTemperature} onChange={(value) => update("maxTemperature", value)} /><NumberField id="minHumidity" label="ความชื้นอากาศต่ำสุด" unit="%" value={draft.minHumidity} onChange={(value) => update("minHumidity", value)} /><NumberField id="minSoilMoisture" label="ความชื้นดินต่ำสุด" unit="%" value={draft.minSoilMoisture} onChange={(value) => update("minSoilMoisture", value)} /></div>
    </SettingSection>
    <SettingSection icon={<Droplets className="size-5" aria-hidden="true" />} title="การทำงานอัตโนมัติและเวลา" description="กำหนดเกณฑ์การสั่งงานและช่วงเวลาของอุปกรณ์">
      <div className="divide-y">{automationItems.map((item) => <div className="flex min-h-16 items-center justify-between gap-4 py-3" key={item.key}><div><Label htmlFor={`automation-${item.key}`}>{item.label}</Label><p className="text-sm text-muted-foreground">{item.detail}</p></div><Switch id={`automation-${item.key}`} checked={draft.automation[item.key]} onCheckedChange={(checked) => update("automation", { ...draft.automation, [item.key]: checked })} /></div>)}</div>
      <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"><NumberField id="wateringMinutes" label="รดน้ำต่อรอบ" unit="นาที" min={1} value={draft.schedules.wateringMinutes} onChange={(value) => update("schedules", { ...draft.schedules, wateringMinutes: value })} /><NumberField id="fanDelayMinutes" label="หน่วงพัดลม" unit="นาที" min={0} value={draft.schedules.fanDelayMinutes} onChange={(value) => update("schedules", { ...draft.schedules, fanDelayMinutes: value })} /><div className="space-y-2"><Label htmlFor="lightStart">เริ่มเปิดไฟ</Label><Input id="lightStart" className="min-h-11" type="time" value={draft.schedules.lightStart} onChange={(event) => update("schedules", { ...draft.schedules, lightStart: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="lightEnd">ปิดไฟ</Label><Input id="lightEnd" className="min-h-11" type="time" value={draft.schedules.lightEnd} onChange={(event) => update("schedules", { ...draft.schedules, lightEnd: event.target.value })} /></div></div>
    </SettingSection>
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingSection icon={<BellRing className="size-5" aria-hidden="true" />} title="การแจ้งเตือน" description="ควบคุมการแจ้งเตือนสำหรับผู้ดูแลระบบ">
        <div className="divide-y"><div className="flex items-center justify-between gap-4 py-3"><div><Label htmlFor="critical-notifications">แจ้งเหตุสำคัญทันที</Label><p className="text-sm text-muted-foreground">การแจ้งเตือนระดับเร่งด่วนจะไม่ถูกปิดเสียง</p></div><Switch id="critical-notifications" checked={draft.notifications.critical} onCheckedChange={(checked) => update("notifications", { ...draft.notifications, critical: checked })} /></div><div className="flex items-center justify-between gap-4 py-3"><div><Label htmlFor="daily-summary">สรุปรายวัน</Label><p className="text-sm text-muted-foreground">สรุปสถานะโรงเรือนหนึ่งครั้งต่อวัน</p></div><Switch id="daily-summary" checked={draft.notifications.dailySummary} onCheckedChange={(checked) => update("notifications", { ...draft.notifications, dailySummary: checked })} /></div></div><div className="mt-4 grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="quietStart">เริ่มช่วงเงียบ</Label><Input id="quietStart" className="min-h-11" type="time" value={draft.notifications.quietStart} onChange={(event) => update("notifications", { ...draft.notifications, quietStart: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="quietEnd">สิ้นสุดช่วงเงียบ</Label><Input id="quietEnd" className="min-h-11" type="time" value={draft.notifications.quietEnd} onChange={(event) => update("notifications", { ...draft.notifications, quietEnd: event.target.value })} /></div></div>
      </SettingSection>
      <SettingSection icon={<Bot className="size-5" aria-hidden="true" />} title="การตรวจจับ AI" description="กำหนดเกณฑ์ของภาพที่ต้องส่งให้ผู้ดูแลตรวจสอบ">
        <div className="grid gap-4 sm:grid-cols-3"><NumberField id="minConfidence" label="ความมั่นใจขั้นต่ำ" unit="%" min={0} max={100} value={draft.ai.minConfidence} onChange={(value) => update("ai", { ...draft.ai, minConfidence: value })} /><NumberField id="scanInterval" label="วิเคราะห์ทุก" unit="นาที" min={1} value={draft.ai.scanInterval} onChange={(value) => update("ai", { ...draft.ai, scanInterval: value })} /><NumberField id="retainDays" label="เก็บหลักฐาน" unit="วัน" min={1} value={draft.ai.retainDays} onChange={(value) => update("ai", { ...draft.ai, retainDays: value })} /></div><div className="mt-4 divide-y border-t"><div className="flex items-center justify-between gap-4 py-3"><Label htmlFor="detectLeafSpot">ตรวจหาอาการใบจุด</Label><Switch id="detectLeafSpot" checked={draft.ai.detectLeafSpot} onCheckedChange={(checked) => update("ai", { ...draft.ai, detectLeafSpot: checked })} /></div><div className="flex items-center justify-between gap-4 py-3"><Label htmlFor="detectPests">ตรวจหาร่องรอยแมลง</Label><Switch id="detectPests" checked={draft.ai.detectPests} onCheckedChange={(checked) => update("ai", { ...draft.ai, detectPests: checked })} /></div></div>
      </SettingSection>
    </div>
    <SettingSection icon={<Camera className="size-5" aria-hidden="true" />} title="กล้องและแหล่งภาพ" description="จัดการกล้องเดโมตามโซน ไม่ได้เชื่อมต่อ webcam หรือ RTSP จริง">
      <div>{draft.cameras.map((camera, index) => <CameraRow key={camera.id} camera={camera} onChange={(next) => update("cameras", draft.cameras.map((item, itemIndex) => itemIndex === index ? next : item))} />)}</div><p className="mt-4 flex items-center gap-2 rounded-lg bg-muted p-3 text-sm text-muted-foreground"><Clock3 className="size-4 shrink-0" aria-hidden="true" />การเพิ่มกล้องจริงจะต้องเชื่อมต่อ gateway/API ในขั้นถัดไป; หน้านี้บันทึกเฉพาะการตั้งค่าเดโม</p>
    </SettingSection>
    {dirty || error ? <div className="sticky bottom-4 flex flex-col gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center"><p className={error ? "flex-1 text-sm text-destructive" : "flex-1 text-sm text-muted-foreground"} role={error ? "alert" : undefined}>{error || "มีการแก้ไขที่ยังไม่ได้บันทึก"}</p><Button variant="outline" className="min-h-11" onClick={() => { setDraft(settings); setError(""); }}>ยกเลิกการแก้ไข</Button><Button className="min-h-11" onClick={save}>บันทึกการตั้งค่า</Button></div> : null}
  </div>;
}
