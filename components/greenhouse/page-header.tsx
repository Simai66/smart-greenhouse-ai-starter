import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageMetadata } from "@/lib/greenhouse-presentation";
import type { DemoGreenhouse } from "@/lib/greenhouse-demo-store";

export function PageHeader({ metadata, greenhouse, refreshing, onExport, onRefresh }: { metadata: PageMetadata; greenhouse: DemoGreenhouse; refreshing: boolean; onExport: () => void; onRefresh: () => void }) {
  return <header className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="page-kicker">{greenhouse.name} · {greenhouse.code}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-[2.15rem]">{metadata.title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{metadata.description}</p></div><div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:flex sm:w-auto"><Button variant="outline" className="min-h-11 min-w-0 w-full bg-card sm:w-auto" onClick={onExport}><Download aria-hidden="true" />ส่งออก</Button><Button className="min-h-11 min-w-0 w-full sm:w-auto" disabled={refreshing} onClick={onRefresh}><RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden="true" />{refreshing ? "กำลังอัปเดต" : "รีเฟรช"}</Button></div></header>;
}
