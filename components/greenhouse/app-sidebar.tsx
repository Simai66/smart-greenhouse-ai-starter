"use client";

import {
  Activity,
  Bell,
  Bot,
  Cpu,
  LayoutDashboard,
  Leaf,
  Settings,
  Sprout,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  navigationItems,
  type GreenhousePageId,
} from "@/lib/greenhouse-presentation";
import type { DemoGreenhouse } from "@/lib/greenhouse-demo-store";

const iconMap = {
  dashboard: LayoutDashboard,
  plants: Sprout,
  ai: Bot,
  devices: Cpu,
  analytics: Activity,
  alerts: Bell,
  settings: Settings,
} as const;

export function AppSidebar({
  activePage,
  openAlerts,
  online,
  onNavigate,
  greenhouse,
}: {
  activePage: GreenhousePageId;
  openAlerts: number;
  online: boolean;
  onNavigate: (page: GreenhousePageId) => void;
  greenhouse: DemoGreenhouse;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = (page: GreenhousePageId) => {
    onNavigate(page);
    if (isMobile) setOpenMobile(false);
  };
  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" tooltip="Smart Greenhouse" onClick={() => navigate("dashboard")}><span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Leaf aria-hidden="true" /></span><span><strong className="block">Smart Greenhouse</strong><small className="text-sidebar-foreground/70">{greenhouse.code}</small></span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent p-3 group-data-[collapsible=icon]:hidden"><strong className="block text-sm">{greenhouse.name}</strong><small className="text-sidebar-foreground/70">{greenhouse.zones.filter((zone) => zone.status === "active").length} โซน · {online ? "ออนไลน์" : "ออฟไลน์"}</small></div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>การดำเนินงาน</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu>
            {navigationItems.filter((item) => item.id !== "settings").map((item) => {
              const Icon = iconMap[item.icon as keyof typeof iconMap];
              return <SidebarMenuItem key={item.id}><SidebarMenuButton tooltip={item.label} isActive={activePage === item.id} onClick={() => navigate(item.id)}><Icon aria-hidden="true" /><span>{item.label}</span></SidebarMenuButton>{item.id === "alerts" && openAlerts ? <SidebarMenuBadge>{openAlerts}</SidebarMenuBadge> : null}</SidebarMenuItem>;
            })}
          </SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>ระบบ</SidebarGroupLabel>
          <SidebarGroupContent><SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="ตั้งค่า" isActive={activePage === "settings"} onClick={() => navigate("settings")}><Settings aria-hidden="true" /><span>ตั้งค่า</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
