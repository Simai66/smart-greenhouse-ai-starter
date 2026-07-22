"use client";

import { Bell, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { GlobalSearch } from "@/components/greenhouse/global-search";
import type { DashboardSearchResult } from "@/lib/dashboard-interactions";
import type { DemoGreenhouse } from "@/lib/greenhouse-demo-store";

export function SiteHeader({
  pageTitle,
  openAlerts,
  search,
  searchIndex,
  searchResults,
  onSearchChange,
  onSearchIndexChange,
  onChooseSearch,
  onOpenMobileSearch,
  onOpenAlerts,
  onNotify,
  greenhouses,
  activeGreenhouseId,
  onGreenhouseChange,
}: {
  pageTitle: string;
  openAlerts: number;
  search: string;
  searchIndex: number;
  searchResults: DashboardSearchResult[];
  onSearchChange: (value: string) => void;
  onSearchIndexChange: (index: number) => void;
  onChooseSearch: (result: DashboardSearchResult) => void;
  onOpenMobileSearch: () => void;
  onOpenAlerts: () => void;
  onNotify: (message: string) => void;
  greenhouses: DemoGreenhouse[];
  activeGreenhouseId: string;
  onGreenhouseChange: (greenhouseId: string) => void;
}) {
  const activeGreenhouses = greenhouses.filter((greenhouse) => greenhouse.status === "active");
  return (
    <header className="sticky top-0 z-40 flex min-h-16 items-center gap-2 border-b border-border/80 bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <SidebarTrigger className="size-11" aria-label="ย่อหรือเปิดเมนูหลัก" />
      <Separator orientation="vertical" className="mr-2 h-5" />
      <strong className="hidden text-sm sm:block">{pageTitle}</strong>
      <Select value={activeGreenhouseId} onValueChange={onGreenhouseChange}>
        <SelectTrigger aria-label="เลือกโรงเรือน" className="ml-auto h-10 min-w-0 max-w-44 sm:ml-2 sm:max-w-56"><SelectValue placeholder="เลือกโรงเรือน" /></SelectTrigger>
        <SelectContent>{activeGreenhouses.map((greenhouse) => <SelectItem key={greenhouse.id} value={greenhouse.id}>{greenhouse.name}</SelectItem>)}</SelectContent>
      </Select>
      <div className="hidden w-full max-w-md lg:block"><GlobalSearch idPrefix="desktop-search" value={search} activeIndex={searchIndex} results={searchResults} onValueChange={onSearchChange} onActiveIndexChange={onSearchIndexChange} onChoose={onChooseSearch} /></div>
      <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="เปิดการค้นหา" onClick={onOpenMobileSearch}><Search aria-hidden="true" /></Button>
      <Button variant="ghost" size="icon" className="relative size-11" aria-label={"การแจ้งเตือน " + String(openAlerts) + " รายการ"} onClick={onOpenAlerts}><Bell aria-hidden="true" />{openAlerts ? <Badge className="absolute -right-1 -top-1 min-w-5 justify-center px-1" variant="destructive">{openAlerts}</Badge> : null}</Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-11" aria-label="เปิดเมนูผู้ใช้"><UserRound aria-hidden="true" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end"><DropdownMenuLabel>Panuwat · ผู้ดูแลระบบ</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => onNotify("บัญชีเดโมยังคงเปิดใช้งานอยู่")}>สถานะบัญชีเดโม</DropdownMenuItem><DropdownMenuItem onSelect={() => onNotify("การออกจากระบบถูกจำลองแล้ว")}>ออกจากระบบเดโม</DropdownMenuItem></DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
