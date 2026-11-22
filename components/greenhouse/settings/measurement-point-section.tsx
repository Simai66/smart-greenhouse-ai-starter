"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save, Sprout, Usb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MeasurementPointsApiError, measurementPointsApi, type DevicePoints, type PlantOption } from "@/lib/measurement-points-api";

export function MeasurementPointSection({ greenhouseId }: { greenhouseId: string }) {
  const [deviceId, setDeviceId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [plants, setPlants] = useState<PlantOption[]>([]);
  const [points, setPoints] = useState<DevicePoints | null>(null);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, string>>({});
  const [plantId, setPlantId] = useState("");
  const [plantName, setPlantName] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!greenhouseId) return;
    setLoading(true);
    setError("");
    try {
      const [registeredPlants, registeredPoints] = await Promise.all([
        measurementPointsApi.listPlants(greenhouseId),
        deviceId.trim() ? measurementPointsApi.listPoints(deviceId.trim(), greenhouseId).catch((caught: unknown) => {
          if (caught instanceof MeasurementPointsApiError && caught.status === 404) return null;
          throw caught;
        }) : Promise.resolve(null),
      ]);
      setPlants(registeredPlants);
      setPoints(registeredPoints);
      setAssignmentDraft(Object.fromEntries((registeredPoints?.points ?? []).map((point) => [point.id, point.assignment?.plantId ?? "__unassigned__"])));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "โหลดการตั้งค่าจุดวัดไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [deviceId, greenhouseId]);

  useEffect(() => {
    const task = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(task);
  }, [refresh]);

  const registerPoints = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await measurementPointsApi.registerPoints({ greenhouseId, deviceId: deviceId.trim(), agentId: agentId.trim() });
      setPoints(result);
      setAssignmentDraft(Object.fromEntries(result.points.map((point) => [point.id, point.assignment?.plantId ?? "__unassigned__"])));
      setNotice("ลงทะเบียนจุด A/B แล้ว");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "ลงทะเบียน ESP32 ไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const createPlant = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const plant = await measurementPointsApi.createPlant({ greenhouseId, plantId: plantId.trim().toUpperCase(), displayName: plantName.trim() });
      setPlants((current) => [...current, plant].sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setPlantId(""); setPlantName(""); setNotice(`เพิ่ม ${plant.displayName} แล้ว`);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "เพิ่มทะเบียนต้นไม้ไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  const saveAssignments = async () => {
    if (!points) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await measurementPointsApi.saveAssignments({
        greenhouseId,
        deviceId: points.device.id,
        expectedVersion: points.device.assignmentVersion,
        reason: reason.trim() || undefined,
        assignments: points.points.map((point) => ({ pointId: point.id, plantId: assignmentDraft[point.id] === "__unassigned__" ? null : assignmentDraft[point.id] ?? null })),
      });
      await refresh();
      setReason("");
      setNotice(result.changed ? `บันทึกการจับคู่แล้ว · ${new Date(result.effectiveAt).toLocaleString("th-TH")}` : "การจับคู่ไม่เปลี่ยนแปลง");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "บันทึกการจับคู่ไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  return <Card className="shadow-none">
    <CardHeader className="flex-col items-start gap-3 space-y-0 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="page-kicker">จุดวัดและต้นไม้</p><h2 className="mt-1 font-semibold">จับคู่ ESP32 กับต้นไม้</h2><p className="mt-1 text-sm text-muted-foreground">ตั้งบอร์ดครั้งเดียว แล้วเปลี่ยนต้นที่จุด A/B ได้โดยไม่อัปโหลด firmware ใหม่</p></div>
      <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />รีเฟรช</Button>
    </CardHeader>
    <CardContent className="space-y-5 pt-4">
      {error ? <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm" role="status">{notice}</p> : null}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2"><Label htmlFor="measurement-device-id">รหัส ESP32</Label><Input id="measurement-device-id" value={deviceId} onChange={(event) => setDeviceId(event.target.value.toUpperCase())} placeholder="ESP32-01" maxLength={61} /></div>
        <div className="space-y-2"><Label htmlFor="measurement-agent-id">Edge agent / Raspberry Pi</Label><Input id="measurement-agent-id" value={agentId} onChange={(event) => setAgentId(event.target.value.toUpperCase())} placeholder="PI-GH-01" maxLength={64} /></div>
        <Button type="button" onClick={() => void registerPoints()} disabled={saving || !deviceId.trim() || !agentId.trim()}><Usb className="size-4" aria-hidden="true" />ลงทะเบียน A/B</Button>
      </div>
      <p className="text-xs text-muted-foreground">ID นี้เป็นตัวตนของบอร์ด; จุด A/B และ sensor ID คงเดิมแม้ย้ายไปดูแลต้นอื่น</p>

      <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="space-y-2"><Label htmlFor="registry-plant-id">รหัสต้นไม้</Label><Input id="registry-plant-id" value={plantId} onChange={(event) => setPlantId(event.target.value.toUpperCase())} placeholder="PLANT-01" maxLength={64} /></div>
        <div className="space-y-2"><Label htmlFor="registry-plant-name">ชื่อต้นไม้</Label><Input id="registry-plant-name" value={plantName} onChange={(event) => setPlantName(event.target.value)} placeholder="มะเขือเทศแปลง A-1" maxLength={120} /></div>
        <Button type="button" variant="outline" onClick={() => void createPlant()} disabled={saving || !plantId.trim() || !plantName.trim()}><Sprout className="size-4" aria-hidden="true" />เพิ่มต้นไม้</Button>
      </div>

      {points ? <section className="space-y-4" aria-label="จับคู่จุดวัดกับต้นไม้">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-medium">{points.device.id}</h3><p className="text-xs text-muted-foreground">บันทึกเวอร์ชัน {points.device.assignmentVersion} · การเปลี่ยนมีเวลาและประวัติ</p></div><Badge variant="outline">2 จุดวัด</Badge></div>
        <div className="grid gap-3 sm:grid-cols-2">{points.points.map((point) => <div key={point.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2"><Label htmlFor={`plant-assignment-${point.portKey}`}>จุด {point.portKey}</Label><Badge variant={point.assignment ? "secondary" : "outline"}>{point.assignment ? "จับคู่แล้ว" : "ยังไม่จับคู่"}</Badge></div>
          <Select value={assignmentDraft[point.id] ?? "__unassigned__"} onValueChange={(selected) => setAssignmentDraft((current) => ({ ...current, [point.id]: selected }))}>
            <SelectTrigger id={`plant-assignment-${point.portKey}`} className="min-h-11"><SelectValue placeholder="เลือกต้นไม้" /></SelectTrigger>
            <SelectContent><SelectItem value="__unassigned__">ยังไม่จับคู่</SelectItem>{plants.map((plant) => <SelectItem key={plant.id} value={plant.id}>{plant.displayName} · {plant.id}</SelectItem>)}</SelectContent>
          </Select>
          <p className="break-all text-xs text-muted-foreground">{point.id}{point.assignment ? ` · เดิม ${point.assignment.displayName}` : ""}</p>
          <div className="text-xs text-muted-foreground">{point.channels.length ? point.channels.map((channel) => `${channel.sensorId} (${channel.metric})`).join(" · ") : "ยังไม่มี sensor channel ผูกกับจุดนี้"}</div>
        </div>)}</div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><div className="space-y-2"><Label htmlFor="assignment-reason">เหตุผลการย้าย (ถ้ามี)</Label><Input id="assignment-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="เช่น ย้ายหัววัดไปต้นแถวใหม่" /></div><Button type="button" onClick={() => void saveAssignments()} disabled={saving || points.points.length !== 2}><Save className="size-4" aria-hidden="true" />{saving ? "กำลังบันทึก…" : "บันทึก A/B"}</Button></div>
      </section> : <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">กรอกรหัส ESP32 และ Edge agent แล้วลงทะเบียน เพื่อสร้างจุด A/B</p>}
    </CardContent>
  </Card>;
}
