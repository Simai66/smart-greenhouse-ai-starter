"use client";

import { useMemo, useState } from "react";
import { Archive, BellRing, Bot, Camera, Clock3, Droplets, MapPin, Pencil, Plus, Settings2, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { validateDemoSettings } from "@/lib/dashboard-interactions";
import type { DemoCamera, DemoGreenhouse, DemoSettings } from "@/lib/greenhouse-demo-store";

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

function FarmStructureSection({ greenhouses, onSaveGreenhouse, onArchiveGreenhouse, onAddZone, onArchiveZone }: {
  greenhouses: DemoGreenhouse[];
  onSaveGreenhouse: (id: string | null, draft: GreenhouseDraft) => void;
  onArchiveGreenhouse: (id: string) => void;
  onAddZone: (greenhouseId: string, name: string) => void;
  onArchiveZone: (greenhouseId: string, zoneId: string) => void;
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
              <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => openEdit(greenhouse)}><Pencil className="size-3.5" aria-hidden="true" />แก้ไข</Button>{greenhouse.status === "active" ? <Button type="button" variant="ghost" size="sm" className="min-h-9 text-muted-foreground" onClick={() => onArchiveGreenhouse(greenhouse.id)}><Archive className="size-3.5" aria-hidden="true" />เก็บถาวร</Button> : null}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {greenhouse.zones.map((zone) => <div key={zone.id} className="flex items-center gap-1 rounded-lg border bg-muted/30 px-2.5 py-1.5 text-sm"><MapPin className="size-3.5 text-muted-foreground" aria-hidden="true" /><span>{zone.name}</span>{zone.status === "archived" ? <Badge variant="outline" className="ml-1 px-1.5 py-0 text-[10px] text-muted-foreground">เก็บถาวร</Badge> : <Button type="button" variant="ghost" size="icon" className="ml-1 size-6 text-muted-foreground" aria-label={`เก็บ ${zone.name} ถาวร`} onClick={() => onArchiveZone(greenhouse.id, zone.id)}><Archive className="size-3" aria-hidden="true" /></Button>}</div>)}
              {greenhouse.status === "active" ? <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={() => { setZoneGreenhouseId(greenhouse.id); setZoneName(""); setFormError(""); }}><Plus className="size-3.5" aria-hidden="true" />เพิ่มโซน</Button> : null}
            </div>
          </section>;
        })}
      </div>
    </SettingSection>
    <Dialog open={editingOpen} onOpenChange={(open) => !open && setEditing(undefined)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "แก้ไขโรงเรือน" : "เพิ่มโรงเรือน"}</DialogTitle><DialogDescription>ชื่อและรหัสนี้จะใช้ระบุพื้นที่ในระบบ</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2"><div className="space-y-2"><Label htmlFor="greenhouse-name">ชื่อโรงเรือน</Label><Input id="greenhouse-name" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="เช่น โรงเรือนผักสลัด" /></div><div className="space-y-2"><Label htmlFor="greenhouse-code">รหัสโรงเรือน</Label><Input id="greenhouse-code" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))} placeholder="เช่น GREENHOUSE 02" /></div>{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(undefined)}>ยกเลิก</Button><Button type="button" onClick={saveGreenhouse}>บันทึกโรงเรือน</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(zoneGreenhouseId)} onOpenChange={(open) => !open && setZoneGreenhouseId(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>เพิ่มโซน</DialogTitle><DialogDescription>{zoneGreenhouse ? `เพิ่มพื้นที่ภายใน ${zoneGreenhouse.name}` : "ระบุชื่อพื้นที่"}</DialogDescription></DialogHeader>
        <div className="space-y-2 py-2"><Label htmlFor="zone-name">ชื่อโซน</Label><Input id="zone-name" value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="เช่น โซน C" />{formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}</div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setZoneGreenhouseId(null)}>ยกเลิก</Button><Button type="button" onClick={saveZone}>เพิ่มโซน</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export function SettingsView({ settings, greenhouses, onSave, onSaveGreenhouse, onArchiveGreenhouse, onAddZone, onArchiveZone }: { settings: DemoSettings; greenhouses: DemoGreenhouse[]; onSave: (settings: DemoSettings) => void; onSaveGreenhouse: (id: string | null, draft: GreenhouseDraft) => void; onArchiveGreenhouse: (id: string) => void; onAddZone: (greenhouseId: string, name: string) => void; onArchiveZone: (greenhouseId: string, zoneId: string) => void }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) { setDraft(settings); setPrevSettings(settings); }
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  const update = <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => { const message = validateDemoSettings(draft); if (message) { setError(message); return; } setError(""); onSave(draft); };

  return <div className="space-y-6">
    <FarmStructureSection greenhouses={greenhouses} onSaveGreenhouse={onSaveGreenhouse} onArchiveGreenhouse={onArchiveGreenhouse} onAddZone={onAddZone} onArchiveZone={onArchiveZone} />
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
