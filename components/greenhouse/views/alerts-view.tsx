"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  filterAlerts,
  type AlertFilter,
} from "@/lib/greenhouse-presentation";
import type { DemoAlert } from "@/lib/greenhouse-demo-store";

export function AlertsView({
  alerts,
  onOpen,
}: {
  alerts: DemoAlert[];
  onOpen: (alert: DemoAlert) => void;
}) {
  const [filter, setFilter] = React.useState<AlertFilter>("all");
  const visible = filterAlerts(alerts, filter);
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="page-kicker">ศูนย์ติดตาม</p><p className="mt-1 text-sm text-muted-foreground">เรียงตามรายการที่ผู้ดูแลต้องตัดสินใจ</p></div><Tabs value={filter} onValueChange={(value) => setFilter(value as AlertFilter)}>
        <TabsList aria-label="กรองการแจ้งเตือน">
          <TabsTrigger value="all">ทั้งหมด {alerts.length}</TabsTrigger>
          <TabsTrigger value="open">เปิดอยู่ {alerts.filter((item) => !item.resolved).length}</TabsTrigger>
          <TabsTrigger value="resolved">ดำเนินการแล้ว {alerts.filter((item) => item.resolved).length}</TabsTrigger>
        </TabsList>
      </Tabs></div>
      <div className="quiet-surface overflow-hidden">
        {visible.map((alert) => (
          <article key={alert.id} className="grid gap-4 border-b border-border/70 p-4 last:border-b-0 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto] sm:items-center">
              <span className="grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-800"><CircleAlert aria-hidden="true" /></span>
              <div><div className="flex flex-wrap items-center gap-2"><strong className="text-base">{alert.title}</strong><Badge variant={alert.resolved ? "secondary" : alert.type === "critical" ? "destructive" : "outline"}>{alert.resolved ? "ดำเนินการแล้ว" : alert.type === "critical" ? "เร่งด่วน" : "ต้องตรวจสอบ"}</Badge></div><p className="mt-1 text-base text-muted-foreground">{alert.detail}</p><p className="mt-1 text-xs text-muted-foreground">{alert.time}</p></div>
              <Button variant="outline" className="min-h-11" onClick={() => onOpen(alert)}>ดูรายละเอียด</Button>
          </article>
        ))}
        {!visible.length ? <p className="p-8 text-center text-sm text-muted-foreground">ไม่มีรายการในตัวกรองนี้</p> : null}
      </div>
    </div>
  );
}
