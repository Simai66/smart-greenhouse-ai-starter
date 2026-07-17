"use client";

import { useState } from "react";
import {
  Bell,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  Cpu,
  LayoutDashboard,
  Leaf,
  Menu,
  Search,
  Settings,
  Sprout,
  X,
} from "lucide-react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { PlantsView } from "@/components/plants/plants-view";
import { AiDetectionView } from "@/components/ai/ai-detection-view";
import { DeviceControlView } from "@/components/devices/device-control-view";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { AlertsView } from "@/components/alerts/alerts-view";
import { SettingsView } from "@/components/settings/settings-view";
import { navigation } from "@/lib/mock-data";

const navIcons = {
  dashboard: LayoutDashboard,
  plants: Sprout,
  ai: Bot,
  devices: Cpu,
  analytics: ChartNoAxesCombined,
  alerts: Bell,
  settings: Settings,
};

export function SmartGreenhouseApp() {
  const [activePage, setActivePage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = (page: string) => {
    setActivePage(page);
    setMenuOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "plants": return <PlantsView onNavigate={navigate} />;
      case "ai": return <AiDetectionView />;
      case "devices": return <DeviceControlView />;
      case "analytics": return <AnalyticsView />;
      case "alerts": return <AlertsView />;
      case "settings": return <SettingsView />;
      default: return <DashboardView onNavigate={navigate} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand"><span><Leaf size={22} /></span><div><strong>VERDANT</strong><small>SMART GREENHOUSE</small></div></div>
        <nav aria-label="Main navigation">
          <p>OPERATIONS</p>
          {navigation.slice(0, 6).map((item) => {
            const Icon = navIcons[item.id as keyof typeof navIcons];
            return <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span>{item.label}</span>{item.id === "alerts" && <b>2</b>}</button>;
          })}
          <p>SYSTEM</p>
          {navigation.slice(6).map((item) => {
            const Icon = navIcons[item.id as keyof typeof navIcons];
            return <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span>{item.label}</span></button>;
          })}
        </nav>
        <div className="sidebar-status"><span className="status-orb"><i /></span><div><strong>All systems online</strong><small>Synced a moment ago</small></div></div>
        <button className="profile"><span>PW</span><div><strong>Panuwat</strong><small>Administrator</small></div><ChevronDown size={16} /></button>
      </aside>

      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <button className="greenhouse-select"><span className="greenhouse-mark"><Sprout size={18} /></span><span><small>ACTIVE GREENHOUSE</small><strong>Tomato House 01</strong></span><ChevronDown size={16} /></button>
          <label className="search-box"><Search size={18} /><input aria-label="Search" placeholder="Search plants, devices, alerts…" /></label>
          <div className="topbar-right"><span className="connection"><i /> Live</span><button className="notification-button" aria-label="Notifications" onClick={() => navigate("alerts")}><Bell size={19} /><b>2</b></button></div>
        </header>

        <div className="content-area">
          {renderPage()}
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.slice(0, 5).map((item) => {
          const Icon = navIcons[item.id as keyof typeof navIcons];
          return <button key={item.id} className={activePage === item.id ? "active" : ""} onClick={() => navigate(item.id)}><Icon size={19} /><span>{item.shortLabel}</span></button>;
        })}
      </nav>
    </div>
  );
}
