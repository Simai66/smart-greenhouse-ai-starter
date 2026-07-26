"use client";

import { useState, type ReactNode } from "react";
import { Archive, MapPin, Pencil, Plus, RotateCcw, Sparkles, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DemoGreenhouse } from "@/lib/greenhouse-demo-store";

export type GreenhouseDraft = Pick<DemoGreenhouse, "name" | "code">;

type FarmStructureSectionProps = {
  greenhouses: DemoGreenhouse[];
  onSaveGreenhouse: (id: string | null, draft: GreenhouseDraft) => void;
  onArchiveGreenhouse: (id: string) => void;
  onRestoreGreenhouse: (id: string) => void;
  onAddZone: (greenhouseId: string, name: string) => void;
  onRenameZone: (greenhouseId: string, zoneId: string, name: string) => void;
  onArchiveZone: (greenhouseId: string, zoneId: string) => void;
  onRestoreZone: (greenhouseId: string, zoneId: string) => void;
};

const greenhouseSuggestions: GreenhouseDraft[] = [
  { name: "โรงเรือนผักสลัด", code: "GREENHOUSE 02" },
  { name: "โรงเรือนสมุนไพร", code: "GREENHOUSE 03" },
  { name: "โรงเรือนเพาะกล้า", code: "NURSERY 01" },
];
const zoneSuggestions = ["โซน A", "โซน B", "โซนเพาะกล้า", "โซนทดลอง"];

function SettingSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <Card className="shadow-none"><CardHeader className="flex-row items-start gap-3 space-y-0 border-b border-border/70 pb-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><p className="page-kicker">การตั้งค่า</p><h2 className="mt-1 font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div></CardHeader><CardContent className="pt-1">{children}</CardContent></Card>;
}

function NameSuggestions({ label, suggestions, onChoose }: { label: string; suggestions: string[]; onChoose: (suggestion: string) => void }) {
  return <div className="space-y-2"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5" aria-hidden="true" />{label}</p><div className="flex flex-wrap gap-2">{suggestions.map((suggestion) => <Button key={suggestion} type="button" variant="outline" size="sm" className="h-8 rounded-full px-3 text-xs" onClick={() => onChoose(suggestion)}>{suggestion}</Button>)}</div></div>;
}

export function FarmStructureSection({ greenhouses, onSaveGreenhouse, onArchiveGreenhouse, onRestoreGreenhouse, onAddZone, onRenameZone, onArchiveZone, onRestoreZone }: FarmStructureSectionProps) {
  const [editing, setEditing] = useState<DemoGreenhouse | null | undefined>(undefined);
  const [draft, setDraft] = useState<GreenhouseDraft>({ name: "", code: "" });
  const [zoneGreenhouseId, setZoneGreenhouseId] = useState<string | null>(null);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [formError, setFormError] = useState("");
  const zoneGreenhouse = greenhouses.find((greenhouse) => greenhouse.id === zoneGreenhouseId);
  const activeCount = greenhouses.filter((greenhouse) => greenhouse.status === "active").length;

  const saveGreenhouse = () => {
    const name = draft.name.trim();
    const code = draft.code.trim();
    if (!name || !code) return setFormError("กรุณาระบุชื่อและรหัสโรงเรือน");
    onSaveGreenhouse(editing?.id ?? null, { name, code });
    setEditing(undefined);
  };
  const saveZone = () => {
    const name = zoneName.trim();
    if (!zoneGreenhouse || !name) return setFormError("กรุณาระบุชื่อโซน");
    if (editingZoneId) onRenameZone(zoneGreenhouse.id, editingZoneId, name);
    else onAddZone(zoneGreenhouse.id, name);
    setZoneGreenhouseId(null);
    setEditingZoneId(null);
    setZoneName("");
    setFormError("");
  };
  const openCreate = () => { setEditing(null); setDraft({ name: "", code: "" }); setFormError(""); };
  const openEdit = (greenhouse: DemoGreenhouse) => { setEditing(greenhouse); setDraft({ name: greenhouse.name, code: greenhouse.code }); setFormError(""); };

  return <>
    <SettingSection icon={<Warehouse className="size-5" aria-hidden="true" />} title="โรงเรือนและโซน" description="กำหนดโครงสร้างพื้นที่ก่อนเพิ่มรอบปลูก อุปกรณ์ หรือกล้อง">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4"><p className="text-sm text-muted-foreground">เปิดใช้งาน <span className="font-medium text-foreground">{activeCount} โรงเรือน</span> · จัดการโซนได้จากรายการด้านล่าง</p><Button type="button" size="sm" className="min-h-10" onClick={openCreate}><Plus className="size-4" aria-hidden="true" />เพิ่มโรงเรือน</Button></div>
      <div className="divide-y">{greenhouses.map((greenhouse) => {
        const activeZones = greenhouse.zones.filter((zone) => zone.status === "active");
        return <section key={greenhouse.id} className="py-5 first:pt-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Warehouse className="size-4" aria-hidden="true" /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{greenhouse.name}</h3><Badge variant={greenhouse.status === "active" ? "secondary" : "outline"} className={greenhouse.status === "active" ? "text-primary" : "text-muted-foreground"}>{greenhouse.status === "active" ? "ใช้งานอยู่" : "เก็บถาวร"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{greenhouse.code} · {activeZones.length} โซนที่ใช้งาน</p></div></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(greenhouse)}><Pencil className="size-3.5" aria-hidden="true" />แก้ไข</Button>{greenhouse.status === "active" ? <Button type="button" variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => onArchiveGreenhouse(greenhouse.id)}><Archive className="size-3.5" aria-hidden="true" />เก็บถาวร</Button> : <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => onRestoreGreenhouse(greenhouse.id)}><RotateCcw className="size-3.5" aria-hidden="true" />เรียกคืน</Button>}</div></div>
          <div className="mt-4 flex flex-wrap gap-2">{greenhouse.zones.map((zone) => <div key={zone.id} className="flex items-center gap-1 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm"><MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" /><span>{zone.name}</span><Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`แก้ไข ${zone.name}`} onClick={() => { setZoneGreenhouseId(greenhouse.id); setEditingZoneId(zone.id); setZoneName(zone.name); setFormError(""); }}><Pencil className="size-3" aria-hidden="true" /></Button>{zone.status === "archived" ? <><Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] text-muted-foreground">เก็บถาวร</Badge><Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`เรียกคืน ${zone.name}`} onClick={() => onRestoreZone(greenhouse.id, zone.id)}><RotateCcw className="size-3" aria-hidden="true" /></Button></> : <Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`เก็บ ${zone.name} เข้าคลัง`} onClick={() => onArchiveZone(greenhouse.id, zone.id)}><Archive className="size-3" aria-hidden="true" /></Button>}</div>)}{greenhouse.status === "active" ? <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => { setZoneGreenhouseId(greenhouse.id); setEditingZoneId(null); setZoneName(""); setFormError(""); }}><Plus className="size-3.5" aria-hidden="true" />เพิ่มโซน</Button> : null}</div>
          <p className="mt-3 text-xs text-muted-foreground">โซนที่มีรอบปลูกกำลังใช้งานอยู่ ต้องเก็บหรือจบรอบปลูกก่อนจึงจะเก็บโซนได้</p>
        </section>;
      })}</div>
    </SettingSection>
    <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}><DialogContent><DialogHeader><DialogTitle>{editing ? "แก้ไขโรงเรือน" : "เพิ่มโรงเรือน"}</DialogTitle><DialogDescription>ชื่อและรหัสนี้จะใช้ระบุพื้นที่ในระบบ</DialogDescription></DialogHeader><div className="grid gap-4 py-2"><div className="space-y-2"><Label htmlFor="greenhouse-name">ชื่อโรงเรือน</Label><Input id="greenhouse-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น โรงเรือนผักสลัด" /></div>{!editing ? <NameSuggestions label="เลือกชื่อแนะนำเพื่อเริ่มต้น" suggestions={greenhouseSuggestions.map((suggestion) => suggestion.name)} onChoose={(name) => setDraft(greenhouseSuggestions.find((suggestion) => suggestion.name === name) ?? { name, code: draft.code })} /> : null}<div className="space-y-2"><Label htmlFor="greenhouse-code">รหัสโรงเรือน</Label><Input id="greenhouse-code" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="เช่น GREENHOUSE 02" /></div>{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>ยกเลิก</Button><Button type="button" onClick={saveGreenhouse}>บันทึกโรงเรือน</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(zoneGreenhouseId)} onOpenChange={(open) => !open && setZoneGreenhouseId(null)}><DialogContent><DialogHeader><DialogTitle>{editingZoneId ? "แก้ไขโซน" : "เพิ่มโซน"}</DialogTitle><DialogDescription>{zoneGreenhouse ? `${editingZoneId ? "แก้ไขพื้นที่ใน" : "เพิ่มพื้นที่ภายใน"} ${zoneGreenhouse.name}` : "ระบุชื่อพื้นที่"}</DialogDescription></DialogHeader><div className="space-y-4 py-2"><div className="space-y-2"><Label htmlFor="zone-name">ชื่อโซน</Label><Input id="zone-name" value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="เช่น โซน C" /></div><NameSuggestions label="เลือกชื่อแนะนำเพื่อเริ่มต้น" suggestions={zoneSuggestions} onChoose={setZoneName} />{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setZoneGreenhouseId(null)}>ยกเลิก</Button><Button type="button" onClick={saveZone}>{editingZoneId ? "บันทึกโซน" : "เพิ่มโซน"}</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
