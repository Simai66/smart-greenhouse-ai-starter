import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AppLoading() {
  return <div aria-label="กำลังโหลดข้อมูลโรงเรือน" className="space-y-4"><Skeleton className="h-20 w-full" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton className="h-28" key={index} />)}</div><Skeleton className="h-72 w-full" /></div>;
}

export function MemoryOnlyNotice() {
  return <div role="status" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="size-5 shrink-0" aria-hidden="true" /><span><strong>บันทึกในหน่วยความจำเท่านั้น</strong><span className="block">เบราว์เซอร์ไม่อนุญาตให้ใช้ local storage การทำงานยังใช้ได้จนกว่าจะปิดหน้านี้</span></span></div>;
}

export function OfflineNotice({ lastUpdated }: { lastUpdated: string }) {
  return <div role="alert" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="size-5 shrink-0" aria-hidden="true" /><span><strong>ระบบออฟไลน์</strong><span className="block">กำลังแสดงข้อมูลล่าสุดจาก {lastUpdated} คำสั่งอุปกรณ์ถูกปิดจนกว่าจะเชื่อมต่ออีกครั้ง</span></span></div>;
}

export function StaleDataNotice({
  lastUpdated,
  onRefresh,
}: {
  lastUpdated: string;
  onRefresh: () => void;
}) {
  return <div role="status" className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center"><AlertTriangle className="size-5 shrink-0" aria-hidden="true" /><span className="flex-1"><strong>ข้อมูลอาจเก่า</strong><span className="block">อัปเดตล่าสุด {lastUpdated} กรุณารีเฟรชก่อนสั่งงานอุปกรณ์</span></span><Button variant="outline" className="min-h-11 bg-white" onClick={onRefresh}><RefreshCw aria-hidden="true" />รีเฟรชข้อมูล</Button></div>;
}
