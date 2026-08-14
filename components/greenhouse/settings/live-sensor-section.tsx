"use client";

import { useState } from "react";
import { Pencil, Plus, RefreshCw, Save, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SensorApiError, sensorApi, type LiveSensor, type LiveSensorMetric, type SensorConfigInput } from "@/lib/sensor-api";

const metricLabels: Record<LiveSensorMetric, string> = {
  temperature: "อุณหภูมิ",
  humidity: "ความชื้นอากาศ",
  soil_moisture: "ความชื้นดิน",
  light: "แสง",
};

const metricUnits: Record<LiveSensorMetric, string> = {
  temperature: "celsius",
  humidity: "percent",
  soil_moisture: "percent",
  light: "lux",
};

type Draft = Omit<SensorConfigInput, "greenhouseId" | "sensorId"> & { greenhouseId: string; sensorId: string; minThreshold: string; maxThreshold: string; scale: string; offset: string; interval: string };

function draftFromSensor(sensor: LiveSensor): Draft {
  return {
    greenhouseId: sensor.greenhouseId,
    sensorId: sensor.sensorId,
    name: sensor.name,
    metric: sensor.metric,
    unit: sensor.unit,
    samplingIntervalSeconds: sensor.samplingIntervalSeconds,
    calibration: sensor.calibration,
    enabled: sensor.enabled,
    thresholds: sensor.thresholds,
    agentId: sensor.agentId ?? undefined,
    minThreshold: sensor.thresholds.min === null ? "" : String(sensor.thresholds.min),
    maxThreshold: sensor.thresholds.max === null ? "" : String(sensor.thresholds.max),
    scale: String(sensor.calibration.scale),
    offset: String(sensor.calibration.offset),
    interval: String(sensor.samplingIntervalSeconds),
  };
}

function newDraft(greenhouseId: string): Draft {
  return { greenhouseId, sensorId: "", name: "", metric: "temperature", unit: "celsius", samplingIntervalSeconds: 30, calibration: { scale: 1, offset: 0 }, enabled: true, thresholds: { min: null, max: null }, minThreshold: "", maxThreshold: "", scale: "1", offset: "0", interval: "30", agentId: undefined };
}

function nullableNumber(value: string): number | null | undefined {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function SensorEditor({ initial, editing, saving, onCancel, onSubmit }: { initial: Draft; editing: boolean; saving: boolean; onCancel: () => void; onSubmit: (value: SensorConfigInput) => void }) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const interval = Number(draft.interval);
    const scale = Number(draft.scale);
    const offset = Number(draft.offset);
    const min = nullableNumber(draft.minThreshold);
    const max = nullableNumber(draft.maxThreshold);
    if (!draft.sensorId.trim() || !draft.name.trim()) return setError("กรุณาระบุรหัสและชื่อเซ็นเซอร์");
    if (!Number.isInteger(interval) || interval < 1 || interval > 86400 || !Number.isFinite(scale) || !Number.isFinite(offset) || min === undefined || max === undefined || (min !== null && max !== null && min > max)) return setError("กรุณาตรวจสอบช่วงเวลา การคาลิเบรต และเกณฑ์ขั้นต่ำ/สูงสุด");
    setError("");
    onSubmit({ greenhouseId: draft.greenhouseId, sensorId: draft.sensorId.trim(), name: draft.name.trim(), metric: draft.metric, unit: metricUnits[draft.metric], samplingIntervalSeconds: interval, calibration: { scale, offset }, enabled: draft.enabled, thresholds: { min, max }, ...(draft.agentId?.trim() ? { agentId: draft.agentId.trim() } : {}) });
  };
  return <form className="space-y-4 rounded-xl border border-primary/20 bg-primary/[0.03] p-4" onSubmit={submit} aria-label={editing ? `แก้ไข ${initial.name}` : "ลงทะเบียนเซ็นเซอร์จริง"}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor={`live-sensor-id-${editing ? initial.sensorId : "new"}`}>รหัสเซ็นเซอร์</Label><Input id={`live-sensor-id-${editing ? initial.sensorId : "new"}`} value={draft.sensorId} disabled={editing || saving} onChange={(event) => update("sensorId", event.target.value)} placeholder="เช่น SEN-ESP32-01-TEMP" /></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-name-${editing ? initial.sensorId : "new"}`}>ชื่อเซ็นเซอร์</Label><Input id={`live-sensor-name-${editing ? initial.sensorId : "new"}`} value={draft.name} disabled={saving} onChange={(event) => update("name", event.target.value)} placeholder="เช่น อุณหภูมิโซน A" /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2"><Label htmlFor={`live-sensor-metric-${editing ? initial.sensorId : "new"}`}>Metric</Label><select id={`live-sensor-metric-${editing ? initial.sensorId : "new"}`} className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.metric} disabled={saving} onChange={(event) => { const metric = event.target.value as LiveSensorMetric; setDraft((current) => ({ ...current, metric, unit: metricUnits[metric] })); }}>{Object.entries(metricLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-unit-${editing ? initial.sensorId : "new"}`}>หน่วย</Label><Input id={`live-sensor-unit-${editing ? initial.sensorId : "new"}`} value={metricUnits[draft.metric]} readOnly /></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-interval-${editing ? initial.sensorId : "new"}`}>ส่งทุก (วินาที)</Label><Input id={`live-sensor-interval-${editing ? initial.sensorId : "new"}`} type="number" min="1" max="86400" value={draft.interval} disabled={saving} onChange={(event) => update("interval", event.target.value)} /></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2"><Label htmlFor={`live-sensor-scale-${editing ? initial.sensorId : "new"}`}>Calibration scale</Label><Input id={`live-sensor-scale-${editing ? initial.sensorId : "new"}`} type="number" step="any" value={draft.scale} disabled={saving} onChange={(event) => update("scale", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-offset-${editing ? initial.sensorId : "new"}`}>Calibration offset</Label><Input id={`live-sensor-offset-${editing ? initial.sensorId : "new"}`} type="number" step="any" value={draft.offset} disabled={saving} onChange={(event) => update("offset", event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-min-${editing ? initial.sensorId : "new"}`}>ต่ำสุด</Label><Input id={`live-sensor-min-${editing ? initial.sensorId : "new"}`} type="number" step="any" value={draft.minThreshold} disabled={saving} onChange={(event) => update("minThreshold", event.target.value)} placeholder="ไม่กำหนด" /></div>
      <div className="space-y-2"><Label htmlFor={`live-sensor-max-${editing ? initial.sensorId : "new"}`}>สูงสุด</Label><Input id={`live-sensor-max-${editing ? initial.sensorId : "new"}`} type="number" step="any" value={draft.maxThreshold} disabled={saving} onChange={(event) => update("maxThreshold", event.target.value)} placeholder="ไม่กำหนด" /></div>
    </div>
    <div className="flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-end sm:justify-between"><div className="space-y-2"><Label htmlFor={`live-sensor-agent-${editing ? initial.sensorId : "new"}`}>Edge agent (ถ้ามี)</Label><Input id={`live-sensor-agent-${editing ? initial.sensorId : "new"}`} value={draft.agentId ?? ""} disabled={editing || saving} onChange={(event) => update("agentId", event.target.value || undefined)} placeholder="เช่น PI-GH-01" /></div><div className="flex items-center gap-3"><Switch id={`live-sensor-enabled-${editing ? initial.sensorId : "new"}`} checked={draft.enabled} disabled={saving} onCheckedChange={(enabled) => update("enabled", enabled)} /><Label htmlFor={`live-sensor-enabled-${editing ? initial.sensorId : "new"}`}>เปิดใช้งาน</Label></div></div>
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>ยกเลิก</Button><Button type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : <><Save className="size-4" aria-hidden="true" />บันทึกเซ็นเซอร์</>}</Button></div>
  </form>;
}

function formatSeen(value: string | null): string {
  if (!value) return "ยังไม่มีค่า";
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Intl.DateTimeFormat("th-TH", { dateStyle: "short", timeStyle: "medium" }).format(timestamp) : "เวลาไม่ถูกต้อง";
}

function sensorStatus(sensor: LiveSensor) {
  if (sensor.status === "disabled") return { label: "ปิดใช้งาน", variant: "outline" as const };
  if (sensor.status === "online" && sensor.freshness === "fresh") return { label: "ออนไลน์", variant: "secondary" as const };
  return { label: sensor.freshness === "missing" ? "ยังไม่มีข้อมูล" : "ข้อมูลเก่า", variant: "outline" as const };
}

export function LiveSensorSection({ greenhouseId, sensors, loading, error, fetchedAt, onRefresh }: { greenhouseId: string; sensors: LiveSensor[]; loading: boolean; error: string; fetchedAt: string | null; onRefresh: () => Promise<void> }) {
  const [editing, setEditing] = useState<LiveSensor | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const save = async (input: SensorConfigInput) => {
    setSaving(true);
    try {
      if (editing) await sensorApi.update(editing.sensorId, input);
      else await sensorApi.create(input);
      await onRefresh();
      setEditing(null);
      setCreating(false);
      setSaveError("");
    } catch (caught) {
      setSaveError(caught instanceof SensorApiError ? caught.message : "ไม่สามารถบันทึกเซ็นเซอร์จริงได้");
    } finally {
      setSaving(false);
    }
  };

  return <Card className="shadow-none" aria-busy={loading}>
    <CardHeader className="flex-col items-start gap-3 space-y-0 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="page-kicker">การเชื่อมต่อจริง</p><h2 className="mt-1 font-semibold">เซ็นเซอร์จริง</h2><p className="mt-1 text-sm text-muted-foreground">ค่าจาก ESP32 ผ่าน Raspberry Pi; config และการบันทึกใช้ API/D1 ไม่ใช้ localStorage</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => void onRefresh()} disabled={loading || !greenhouseId}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />รีเฟรช</Button><Button type="button" size="sm" onClick={() => { setCreating(true); setEditing(null); }} disabled={loading || !greenhouseId}><Plus className="size-4" aria-hidden="true" />ลงทะเบียน</Button></div></CardHeader>
    <CardContent className="space-y-4 pt-4">
      {error || saveError ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{saveError || error}</p> : null}
      {fetchedAt ? <p className="text-xs text-muted-foreground" role="status">โหลด config ล่าสุด {formatSeen(fetchedAt)}{sensors.some((sensor) => sensor.freshness !== "fresh" && sensor.status !== "disabled") ? " · มีข้อมูล stale หรือยังไม่มีค่า" : ""}</p> : null}
      {creating ? <SensorEditor initial={newDraft(greenhouseId)} editing={false} saving={saving} onCancel={() => setCreating(false)} onSubmit={save} /> : null}
      {loading ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">กำลังโหลดเซ็นเซอร์จริง…</p> : sensors.length === 0 && !creating ? <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มี sensor config ในโรงเรือนนี้ ลงทะเบียน channel จาก ESP32 ก่อน</p> : null}
      {sensors.length ? <ul className="divide-y" aria-label="รายการเซ็นเซอร์จริง">{sensors.map((sensor) => { const status = sensorStatus(sensor); return <li key={sensor.sensorId} className="py-4 first:pt-0 last:pb-0"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="flex min-w-0 items-start gap-3"><span className={`mt-1 grid size-9 shrink-0 place-items-center rounded-xl ${sensor.status === "online" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{sensor.status === "online" ? <Wifi className="size-4" aria-hidden="true" /> : <WifiOff className="size-4" aria-hidden="true" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{sensor.name}</h3><Badge variant={status.variant}>{status.label}</Badge>{sensor.latest?.quality === "suspect" ? <Badge variant="outline">suspect</Badge> : null}{sensor.latest?.quality === "invalid" ? <Badge variant="destructive">invalid</Badge> : null}</div><p className="mt-1 break-all text-sm text-muted-foreground">{sensor.sensorId} · {metricLabels[sensor.metric]} · {sensor.unit} · config v{sensor.configVersion}</p></div></div><Button type="button" variant="outline" size="sm" className="w-full sm:w-fit" onClick={() => { setEditing(sensor); setCreating(false); }}><Pencil className="size-3.5" aria-hidden="true" />แก้ไข config</Button></div><dl className="mt-3 grid gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="text-xs text-muted-foreground">ค่าล่าสุด</dt><dd className="mt-1 font-medium tabular-nums">{sensor.latest ? `${sensor.latest.value.toLocaleString("th-TH")} ${sensor.unit}` : "ยังไม่มีค่า"}</dd></div><div><dt className="text-xs text-muted-foreground">วัดเมื่อ</dt><dd className="mt-1 font-medium">{formatSeen(sensor.lastSeenAt)}</dd></div><div><dt className="text-xs text-muted-foreground">ส่งทุก</dt><dd className="mt-1 font-medium">{sensor.samplingIntervalSeconds} วินาที</dd></div><div><dt className="text-xs text-muted-foreground">เกณฑ์</dt><dd className="mt-1 font-medium">{sensor.thresholds.min ?? "—"} ถึง {sensor.thresholds.max ?? "—"}</dd></div></dl>{editing?.sensorId === sensor.sensorId ? <div className="mt-4"><SensorEditor initial={draftFromSensor(sensor)} editing saving={saving} onCancel={() => setEditing(null)} onSubmit={save} /></div> : null}</li>; })}</ul> : null}
    </CardContent>
  </Card>;
}
