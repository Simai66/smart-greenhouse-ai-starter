"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { DemoAlert } from "@/lib/greenhouse-demo-store";

export function AlertDialog({ alert, onClose, onToggleResolution }: { alert: DemoAlert | null; onClose: () => void; onToggleResolution: (id: string, resolved: boolean) => void }) {
  return <Dialog open={Boolean(alert)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><DialogHeader><span className="mb-2 grid size-11 place-items-center rounded-lg bg-amber-50 text-amber-800"><CircleAlert aria-hidden="true" /></span><DialogTitle>{alert?.title}</DialogTitle><DialogDescription>{alert?.detail}</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">{alert?.time} · {alert?.resolved ? "ดำเนินการแล้ว" : "ต้องตรวจสอบ"}</p><DialogFooter><Button variant="outline" className="min-h-11" onClick={onClose}>ปิด</Button><Button className="min-h-11" onClick={() => alert && onToggleResolution(alert.id, !alert.resolved)}>{alert?.resolved ? "เปิดอีกครั้ง" : "ทำเครื่องหมายว่าดำเนินการแล้ว"}</Button></DialogFooter></DialogContent></Dialog>;
}
