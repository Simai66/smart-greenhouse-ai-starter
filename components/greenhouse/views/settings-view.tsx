"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { validateDemoSettings } from "@/lib/dashboard-interactions";
import type { DemoSettings } from "@/lib/greenhouse-demo-store";

const automationItems = [
  { key: "water", label: "รดน้ำเมื่อความชื้นในดินต่ำ" },
  { key: "fan", label: "เปิดพัดลมเมื่ออุณหภูมิสูง" },
  { key: "light", label: "เปิดไฟตามตารางเวลา" },
  { key: "alert", label: "แจ้งเตือนเมื่อพบใบผิดปกติ" },
] as const;

export function SettingsView({
  settings,
  onSave,
}: {
  settings: DemoSettings;
  onSave: (settings: DemoSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const [prevSettings, setPrevSettings] = useState(settings);
  if (settings !== prevSettings) {
    setDraft(settings);
    setPrevSettings(settings);
  }
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settings),
    [draft, settings],
  );
  const fields = [
    { key: "minTemperature", label: "อุณหภูมิต่ำสุด", unit: "°C" },
    { key: "maxTemperature", label: "อุณหภูมิสูงสุด", unit: "°C" },
    { key: "minHumidity", label: "ความชื้นอากาศต่ำสุด", unit: "%" },
    { key: "minSoilMoisture", label: "ความชื้นดินต่ำสุด", unit: "%" },
  ] as const;

  const save = () => {
    const message = validateDemoSettings(draft);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    onSave(draft);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><h2 className="font-semibold">ค่าเป้าหมายสภาพแวดล้อม</h2><p className="text-sm text-muted-foreground">ใช้กับการควบคุมอัตโนมัติและคำเตือนในเดโม</p></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <div className="space-y-2" key={field.key}>
              <Label htmlFor={field.key}>{field.label}</Label>
              <div className="relative">
                <Input id={field.key} type="number" className="min-h-11 pr-12" value={draft[field.key]} onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{field.unit}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h2 className="font-semibold">การทำงานอัตโนมัติ</h2></CardHeader>
        <CardContent className="divide-y">
          {automationItems.map((item) => (
            <div className="flex min-h-14 items-center justify-between gap-4 py-3" key={item.key}>
              <div><Label htmlFor={"automation-" + item.key}>{item.label}</Label><p className="text-sm text-muted-foreground">{draft.automation[item.key] ? "เปิดใช้งาน" : "ปิดใช้งาน"}</p></div>
              <Switch id={"automation-" + item.key} checked={draft.automation[item.key]} onCheckedChange={(checked) => setDraft((current) => ({ ...current, automation: { ...current.automation, [item.key]: checked } }))} />
            </div>
          ))}
        </CardContent>
      </Card>
      {dirty || error ? (
        <div className="sticky bottom-4 flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg sm:flex-row sm:items-center">
          <p className={error ? "flex-1 text-sm text-destructive" : "flex-1 text-sm text-muted-foreground"} role={error ? "alert" : undefined}>{error || "มีการแก้ไขที่ยังไม่ได้บันทึก"}</p>
          <Button variant="outline" className="min-h-11" onClick={() => { setDraft(settings); setError(""); }}>ยกเลิกการแก้ไข</Button>
          <Button className="min-h-11" onClick={save}>บันทึกการตั้งค่า</Button>
        </div>
      ) : null}
    </div>
  );
}
