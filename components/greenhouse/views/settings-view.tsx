"use client";

import { useMemo, useState } from "react";
import { BellRing, Bot, Camera, Clock3, Droplets, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { validateDemoSettings } from "@/lib/dashboard-interactions";
import type { DemoCamera, DemoSettings } from "@/lib/greenhouse-demo-store";

const automationItems = [
  { key: "water", label: "รดน้ำเมื่อความชื้นในดินต่ำ", detail: "อ้างอิงเกณฑ์ความชื้นดินด้านบน" },
  { key: "fan", label: "เปิดพัดลมเมื่ออุณหภูมิสูง", detail: "หน่วงเวลาเพื่อป้องกันการสั่งงานถี่เกินไป" },
  { key: "light", label: "เปิดไฟตามตารางเวลา", detail: "ใช้เวลาเริ่มและเวลาสิ้นสุดด้านล่าง" },
  { key: "alert", label: "แจ้งเตือนเมื่อพบใบผิดปกติ", detail: "ใช้ผลตรวจ AI ที่ผ่านค่าความมั่นใจขั้นต่ำ" },
] as const;

type SettingSectionProps = { icon: React.ReactNode; title: string; description: string; children: React.ReactNode };
function SettingSection({ icon, title, description, children }: SettingSectionProps) {
  return <Card><CardHeader className="flex-row items-start gap-3 space-y-0"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{description}</p></div></CardHeader><CardContent>{children}</CardContent></Card>;
}

function NumberField({ id, label, unit, value, onChange, min, max }: { id: string; label: string; unit: string; value: string; onChange: (value: string) => void; min?: number; max?: number }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><div className="relative"><Input id={id} type="number" min={min} max={max} className="min-h-11 pr-12" value={value} onChange={(event) => onChange(event.target.value)} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span></div></div>;
}

function CameraRow({ camera, onChange }: { camera: DemoCamera; onChange: (next: DemoCamera) => void }) {
  return <div className="flex flex-col gap-3 border-b py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"><Camera className="size-5" aria-hidden="true" /></span><div><div className="flex flex-wrap items-center gap-2"><Label htmlFor={`camera-${camera.id}`}>{camera.name}</Label><Badge variant={camera.status === "online" ? "secondary" : "outline"} className={camera.status === "online" ? "text-primary" : "text-muted-foreground"}>{camera.status === "online" ? "ออนไลน์" : "ออฟไลน์"}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{camera.id} · {camera.zone} · {camera.source} · ถ่ายทุก {camera.captureInterval}</p></div></div><Switch id={`camera-${camera.id}`} aria-label={`เปิดใช้งาน ${camera.name}`} checked={camera.enabled} onCheckedChange={(enabled) => onChange({ ...camera, enabled })} /></div>;
}

export function SettingsView({ settings, onSave }: { settings: DemoSettings; onSave: (settings: DemoSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) { setDraft(settings); setPrevSettings(settings); }
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);
  const update = <K extends keyof DemoSettings>(key: K, value: DemoSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const save = () => { const message = validateDemoSettings(draft); if (message) { setError(message); return; } setError(""); onSave(draft); };

  return <div className="space-y-4">
    <SettingSection icon={<Settings2 className="size-5" aria-hidden="true" />} title="ค่าเป้าหมายสภาพแวดล้อม" description="ใช้กับการควบคุมอัตโนมัติและคำเตือนในเดโม">
      <div className="grid gap-4 md:grid-cols-2"><NumberField id="minTemperature" label="อุณหภูมิต่ำสุด" unit="°C" value={draft.minTemperature} onChange={(value) => update("minTemperature", value)} /><NumberField id="maxTemperature" label="อุณหภูมิสูงสุด" unit="°C" value={draft.maxTemperature} onChange={(value) => update("maxTemperature", value)} /><NumberField id="minHumidity" label="ความชื้นอากาศต่ำสุด" unit="%" value={draft.minHumidity} onChange={(value) => update("minHumidity", value)} /><NumberField id="minSoilMoisture" label="ความชื้นดินต่ำสุด" unit="%" value={draft.minSoilMoisture} onChange={(value) => update("minSoilMoisture", value)} /></div>
    </SettingSection>
    <SettingSection icon={<Droplets className="size-5" aria-hidden="true" />} title="การทำงานอัตโนมัติและเวลา" description="กำหนดเกณฑ์การสั่งงานและช่วงเวลาของอุปกรณ์">
      <div className="divide-y">{automationItems.map((item) => <div className="flex min-h-16 items-center justify-between gap-4 py-3" key={item.key}><div><Label htmlFor={`automation-${item.key}`}>{item.label}</Label><p className="text-sm text-muted-foreground">{item.detail}</p></div><Switch id={`automation-${item.key}`} checked={draft.automation[item.key]} onCheckedChange={(checked) => update("automation", { ...draft.automation, [item.key]: checked })} /></div>)}</div>
      <div className="mt-5 grid gap-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-4"><NumberField id="wateringMinutes" label="รดน้ำต่อรอบ" unit="นาที" min={1} value={draft.schedules.wateringMinutes} onChange={(value) => update("schedules", { ...draft.schedules, wateringMinutes: value })} /><NumberField id="fanDelayMinutes" label="หน่วงพัดลม" unit="นาที" min={0} value={draft.schedules.fanDelayMinutes} onChange={(value) => update("schedules", { ...draft.schedules, fanDelayMinutes: value })} /><div className="space-y-2"><Label htmlFor="lightStart">เริ่มเปิดไฟ</Label><Input id="lightStart" className="min-h-11" type="time" value={draft.schedules.lightStart} onChange={(event) => update("schedules", { ...draft.schedules, lightStart: event.target.value })} /></div><div className="space-y-2"><Label htmlFor="lightEnd">ปิดไฟ</Label><Input id="lightEnd" className="min-h-11" type="time" value={draft.schedules.lightEnd} onChange={(event) => update("schedules", { ...draft.schedules, lightEnd: event.target.value })} /></div></div>
    </SettingSection>
    <div className="grid gap-4 xl:grid-cols-2">
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
