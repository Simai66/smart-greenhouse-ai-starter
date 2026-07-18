"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity, Bell, Bot, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, CircleAlert, CloudSun, Cpu, Download,
  Droplets, Fan, Gauge, History, LayoutDashboard, Leaf, Lightbulb, Menu, MoreHorizontal, RefreshCw, Search, Settings,
  Sprout, Sun, Thermometer, TrendingDown, X,
} from "lucide-react";
import { demoInitialState, greenhouseDemoStore, type DemoAlert, type DemoDevice, type DemoPlant, type DemoSettings, type DemoState } from "@/lib/greenhouse-demo-store";

type PageId = "dashboard" | "plants" | "ai" | "devices" | "analytics" | "alerts" | "settings";
type Toast = { message: string; tone: "success" | "info" | "error" } | null;
type PendingDevice = { device: DemoDevice; nextActive: boolean } | null;
type SearchResult = {
  key: string;
  label: string;
  detail: string;
  page: PageId;
  plantId?: string;
  alertId?: string;
};

const navItems = [
  { id: "dashboard" as PageId, label: "ภาพรวม", icon: LayoutDashboard }, { id: "plants" as PageId, label: "ข้อมูลพืช", icon: Sprout },
  { id: "ai" as PageId, label: "ผลวิเคราะห์ภาพ", icon: Bot }, { id: "devices" as PageId, label: "ควบคุมอุปกรณ์", icon: Cpu },
  { id: "analytics" as PageId, label: "สถิติและรายงาน", icon: Activity }, { id: "alerts" as PageId, label: "การแจ้งเตือน", icon: Bell },
];
const pageTitles: Record<PageId, { title: string; description: string }> = {
  dashboard: { title: "ภาพรวมโรงเรือน", description: "ข้อมูลล่าสุดจากเซ็นเซอร์และสถานะการทำงานของระบบ" },
  plants: { title: "ข้อมูลพืช", description: "ติดตามสุขภาพและสภาพแวดล้อมของมะเขือเทศแต่ละต้น" },
  ai: { title: "ผลวิเคราะห์ภาพ", description: "ผลตรวจสุขภาพใบมะเขือเทศจากภาพถ่ายล่าสุด" },
  devices: { title: "ควบคุมอุปกรณ์", description: "ตรวจสอบสถานะและสั่งงานอุปกรณ์ภายในโรงเรือน" },
  analytics: { title: "สถิติและรายงาน", description: "แนวโน้มสภาพแวดล้อมและประสิทธิภาพของระบบ" },
  alerts: { title: "การแจ้งเตือน", description: "รายการเหตุการณ์ที่ควรตรวจสอบและประวัติการทำงาน" },
  settings: { title: "ตั้งค่าระบบ", description: "กำหนดค่าเป้าหมาย การทำงานอัตโนมัติ และการแจ้งเตือน" },
};
const sensorCards = [
  { label: "อุณหภูมิ", value: "28.5", unit: "°C", note: "อยู่ในช่วง 22–30°C", icon: Thermometer, color: "orange", change: "+0.8°C" },
  { label: "ความชื้นอากาศ", value: "65", unit: "%", note: "อยู่ในช่วง 60–70%", icon: Droplets, color: "blue", change: "−2.1%" },
  { label: "ความชื้นในดิน", value: "42", unit: "%", note: "ใกล้ค่าต่ำสุด 35%", icon: Gauge, color: "amber", change: "−4.3%", warning: true },
  { label: "ความเข้มแสง", value: "12,500", unit: "lux", note: "เหมาะสมต่อการเจริญเติบโต", icon: Sun, color: "yellow", change: "+8.4%" },
];
const chartSeries = {
  "วันนี้": ["M0 138 C80 132 100 105 180 116 S300 90 380 105 S520 69 600 82 S700 58 760 70", "M0 82 C70 70 130 86 205 76 S330 64 405 72 S540 64 625 69 S710 55 760 60", "M0 112 C85 115 130 124 210 128 S345 144 420 150 S565 163 640 171 S710 182 760 188"],
  "7 วัน": ["M0 132 C95 104 146 141 228 104 S366 99 440 122 S570 88 645 106 S710 72 760 86", "M0 88 C80 90 134 62 220 79 S362 74 441 64 S555 78 640 58 S710 69 760 54", "M0 168 C80 155 150 144 230 152 S360 135 440 147 S575 132 650 142 S710 125 760 133"],
  "30 วัน": ["M0 143 C100 131 150 116 224 134 S362 111 444 121 S570 102 648 115 S710 93 760 102", "M0 72 C90 94 145 80 225 86 S365 61 445 76 S575 54 650 70 S710 51 760 64", "M0 150 C85 164 148 145 225 157 S365 170 445 155 S574 170 651 151 S712 166 760 149"],
} as const;

function DeviceIcon({ device, size = 19 }: { device: DemoDevice; size?: number }) {
  const Icon = device.icon === "pump" ? Droplets : device.icon === "fan" ? Fan : device.icon === "light" ? Lightbulb : CloudSun;
  return <Icon size={size} />;
}

function LineChart({ period }: { period: keyof typeof chartSeries }) {
  const paths = chartSeries[period];
  return <div className="chart-wrap" role="img" aria-label={`กราฟอุณหภูมิ ความชื้นอากาศ และความชื้นในดิน ช่วง${period}`}>
    <div className="chart-scale"><span>80</span><span>60</span><span>40</span><span>20</span></div>
    <svg viewBox="0 0 760 240" preserveAspectRatio="none" aria-hidden="true"><g className="grid-lines"><path d="M0 30H760M0 88H760M0 146H760M0 204H760" /></g><path className="chart-line temperature" d={paths[0]} /><path className="chart-line humidity" d={paths[1]} /><path className="chart-line soil" d={paths[2]} /></svg>
    <div className="chart-times"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
  </div>;
}

function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = ref.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])");
    focusable?.[0]?.focus();

    return () => opener?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(ref.current?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? []);
    if (!focusable.length) {
      event.preventDefault();
      ref.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return <div className="modal-backdrop" onMouseDown={onClose}><div className="confirm-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onKeyDown={handleKeyDown} onMouseDown={(event) => event.stopPropagation()}>{children}</div></div>;
}

export function GreenhouseDashboard() {
  const [state, setState] = useState<DemoState>(demoInitialState);
  const [ready, setReady] = useState(false);
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [period, setPeriod] = useState<keyof typeof chartSeries>("วันนี้");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("07:42 น.");
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [pendingDevice, setPendingDevice] = useState<PendingDevice>(null);
  const [commandPending, setCommandPending] = useState(false);
  const [selectedPlantId, setSelectedPlantId] = useState("TOM-003");
  const [selectedAlert, setSelectedAlert] = useState<DemoAlert | null>(null);

  const notify = (message: string, tone: "success" | "info" | "error" = "success") => { setToast({ message, tone }); window.setTimeout(() => setToast(null), 3500); };
  useEffect(() => { greenhouseDemoStore.load().then((loaded) => { setState(loaded); setReady(true); }); }, []);
  useEffect(() => { if (ready) void greenhouseDemoStore.save(state); }, [ready, state]);

  const activeDevices = useMemo(() => state.devices.filter((device) => device.active).length, [state.devices]);
  const openAlerts = useMemo(() => state.alerts.filter((alert) => !alert.resolved).length, [state.alerts]);
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(); if (!query) return [];
    const matches: SearchResult[] = [
      ...state.plants.filter((item) => `${item.name} ${item.id} ${item.zone}`.toLocaleLowerCase().includes(query)).map((item) => ({ key: `plant-${item.id}`, label: item.name, detail: `${item.id} · ${item.zone}`, page: "plants" as PageId, plantId: item.id })),
      ...state.devices.filter((item) => item.name.toLocaleLowerCase().includes(query)).map((item) => ({ key: `device-${item.id}`, label: item.name, detail: "อุปกรณ์", page: "devices" as PageId })),
      ...state.alerts.filter((item) => `${item.title} ${item.detail}`.toLocaleLowerCase().includes(query)).map((item) => ({ key: `alert-${item.id}`, label: item.title, detail: "การแจ้งเตือน", page: "alerts" as PageId, alertId: item.id })),
    ]; return matches.slice(0, 6);
  }, [search, state]);

  const navigate = (page: PageId) => { setActivePage(page); setMenuOpen(false); setSearch(""); window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
  const chooseSearch = (result: (typeof searchResults)[number]) => { if (result.plantId) setSelectedPlantId(result.plantId); if (result.alertId) setSelectedAlert(state.alerts.find((alert) => alert.id === result.alertId) ?? null); navigate(result.page); };
  const refresh = async () => { setRefreshing(true); const loaded = await greenhouseDemoStore.load(); setState(loaded); setLastUpdated("เมื่อสักครู่"); setRefreshing(false); notify("โหลดข้อมูลเดโมที่บันทึกไว้แล้ว", "info"); };
  const exportCsv = () => {
    const rows = [["รายงาน Smart Greenhouse (โหมดสาธิต)"], ["สร้างเมื่อ", new Date().toLocaleString("th-TH")], [], ["เซ็นเซอร์", "ค่า", "หน่วย"], ...sensorCards.map((item) => [item.label, item.value, item.unit]), [], ["อุปกรณ์", "สถานะ", "รายละเอียด"], ...state.devices.map((item) => [item.name, item.active ? "กำลังทำงาน" : "ปิด", item.detail]), [], ["การแจ้งเตือน", "สถานะ", "รายละเอียด"], ...state.alerts.map((item) => [item.title, item.resolved ? "ดำเนินการแล้ว" : "ต้องตรวจสอบ", item.detail])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = "smart-greenhouse-demo-report.csv"; link.click(); URL.revokeObjectURL(url); notify("ดาวน์โหลดรายงาน CSV แล้ว");
  };
  const acknowledgeDevice = async () => { if (!pendingDevice) return; setCommandPending(true); const { device, nextActive } = pendingDevice; const result = await greenhouseDemoStore.requestDeviceCommand(device.id, nextActive ? "turn_on" : "turn_off"); setState((current) => ({ ...current, devices: current.devices.map((item) => item.id === device.id ? { ...item, active: nextActive } : item) })); setCommandPending(false); setPendingDevice(null); notify(`${device.name}: ${nextActive ? "เปิด" : "ปิด"}แล้ว (${result.state === "acknowledged" ? "เดโมตอบรับแล้ว" : result.state})`); };
  const updateAlert = (id: string, resolved: boolean) => { setState((current) => ({ ...current, alerts: current.alerts.map((alert) => alert.id === id ? { ...alert, resolved } : alert) })); setSelectedAlert((alert) => alert?.id === id ? { ...alert, resolved } : alert); notify(resolved ? "บันทึกการดำเนินการแล้ว" : "เปิดการแจ้งเตือนอีกครั้งแล้ว"); };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
    <aside className={`sidebar ${menuOpen ? "open" : ""}`}><div className="brand"><span className="brand-mark"><Leaf size={22} /></span><div><strong>GREENHOUSE 01</strong><small>SMART FARM SYSTEM</small></div><button className="close-menu" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}><X size={20} /></button></div><div className="site-switcher"><span><Sprout size={18} /></span><div><small>โรงเรือนที่เลือก</small><strong>มะเขือเทศ · หลังที่ 1</strong></div><ChevronDown size={16} /></div><nav aria-label="เมนูหลัก"><p className="nav-label">เมนูหลัก</p>{navItems.map(({ id, label, icon: Icon }) => <button key={id} className={activePage === id ? "active" : ""} onClick={() => navigate(id)}><Icon size={19} /><span>{label}</span>{id === "alerts" && openAlerts ? <b>{openAlerts}</b> : null}</button>)}<p className="nav-label secondary-label">ระบบ</p><button className={activePage === "settings" ? "active" : ""} onClick={() => navigate("settings")}><Settings size={19} /><span>ตั้งค่าระบบ</span></button></nav><div className="sidebar-bottom"><div className="system-status"><i /><div><strong>ระบบเชื่อมต่อปกติ</strong><small>อุปกรณ์ออนไลน์ 8/8</small></div></div><div className="user-menu" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setUserOpen(false); }}><button className="user-card" aria-expanded={userOpen} aria-haspopup="menu" onClick={() => setUserOpen((value) => !value)}><span>PW</span><div><strong>Panuwat</strong><small>ผู้ดูแลระบบ</small></div><MoreHorizontal size={18} /></button>{userOpen && <div className="user-popover" role="menu"><strong>Panuwat</strong><small>ผู้ดูแลระบบ · โหมดสาธิต</small><button role="menuitem" onClick={() => { setUserOpen(false); notify("บัญชีเดโมยังคงเปิดใช้งานอยู่", "info"); }}>สถานะบัญชีเดโม</button><button role="menuitem" onClick={() => { setUserOpen(false); notify("การออกจากระบบถูกจำลองแล้ว", "info"); }}>ออกจากระบบเดโม</button></div>}</div></div></aside>
    {menuOpen && <button className="backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}
    <main className="main-area" id="main-content" tabIndex={-1}><header className="topbar"><button className="menu-button" aria-label="เปิดเมนู" onClick={() => setMenuOpen(true)}><Menu size={22} /></button><div className="search"><Search size={18} /><input aria-label="ค้นหา" role="combobox" aria-controls="global-search-results" aria-expanded={Boolean(search)} aria-autocomplete="list" value={search} onChange={(event) => { setSearch(event.target.value); setSearchIndex(0); }} onKeyDown={(event) => { if (!searchResults.length) return; if (event.key === "ArrowDown") { event.preventDefault(); setSearchIndex((index) => (index + 1) % searchResults.length); } if (event.key === "ArrowUp") { event.preventDefault(); setSearchIndex((index) => (index - 1 + searchResults.length) % searchResults.length); } if (event.key === "Enter") { event.preventDefault(); chooseSearch(searchResults[searchIndex]); } if (event.key === "Escape") setSearch(""); }} placeholder="ค้นหาต้นพืช อุปกรณ์ หรือรายการแจ้งเตือน" />{search && <div className="search-results" id="global-search-results" role="listbox" aria-label="ผลการค้นหา">{searchResults.length ? searchResults.map((result, index) => <button key={result.key} role="option" aria-selected={index === searchIndex} className={index === searchIndex ? "selected" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSearch(result)}><strong>{result.label}</strong><small>{result.detail}</small></button>) : <p>ไม่พบผลลัพธ์</p>}</div>}</div><div className="topbar-actions"><span className="online-badge"><i /> ออนไลน์</span><button className="notification" aria-label={`การแจ้งเตือน ${openAlerts} รายการ`} onClick={() => navigate("alerts")}><Bell size={20} />{openAlerts ? <b>{openAlerts}</b> : null}</button></div></header>
      <div className="content"><header className="page-heading"><div><p className="date-line"><CalendarDays size={15} /> วันเสาร์ที่ 18 กรกฎาคม 2569</p><h1>{pageTitles[activePage].title}</h1><p>{pageTitles[activePage].description}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={exportCsv}><Download size={17} /> ส่งออกรายงาน</button><button className="button button-primary" onClick={refresh} disabled={refreshing}><RefreshCw size={17} className={refreshing ? "spin" : ""} /> {refreshing ? "กำลังอัปเดต" : "อัปเดตข้อมูล"}</button></div></header>
        {activePage === "dashboard" && <DashboardView devices={state.devices} plants={state.plants} alerts={state.alerts} period={period} setPeriod={setPeriod} lastUpdated={lastUpdated} activeDevices={activeDevices} openAlerts={openAlerts} onNavigate={navigate} onDeviceRequest={(device) => setPendingDevice({ device, nextActive: !device.active })} onPlantSelect={(id) => { setSelectedPlantId(id); navigate("ai"); }} />}
        {activePage === "plants" && <PlantsView plants={state.plants} onSelect={(id) => { setSelectedPlantId(id); navigate("ai"); }} />}
        {activePage === "ai" && <AiView plant={state.plants.find((plant) => plant.id === selectedPlantId) ?? state.plants[2]} reviewed={state.aiReviewedPlantId === selectedPlantId} onSave={() => { setState((current) => ({ ...current, aiReviewedPlantId: selectedPlantId })); notify("บันทึกผลตรวจเดโมแล้ว, การแจ้งเตือนยังคงเปิดอยู่"); }} />}
        {activePage === "devices" && <DevicesView devices={state.devices} onRequest={(device) => setPendingDevice({ device, nextActive: !device.active })} />}
        {activePage === "analytics" && <AnalyticsView period={period} setPeriod={setPeriod} />}
        {activePage === "alerts" && <AlertsView alerts={state.alerts} onOpen={setSelectedAlert} />}
        {activePage === "settings" && <SettingsView settings={state.settings} onSave={(settings) => { setState((current) => ({ ...current, settings })); notify("บันทึกการตั้งค่าเดโมแล้ว"); }} />}
      </div></main>
    {pendingDevice && <Dialog title="ยืนยันคำสั่งอุปกรณ์เดโม" onClose={() => !commandPending && setPendingDevice(null)}><span className="dialog-icon"><Cpu size={24} /></span><h2>ยืนยันการ{pendingDevice.nextActive ? "เปิด" : "ปิด"}{pendingDevice.device.name}</h2><p>คำสั่งนี้เป็นโหมดสาธิตเท่านั้น ระบบจะบันทึกสถานะในเบราว์เซอร์และไม่ส่งคำสั่งไปยังอุปกรณ์จริง</p><div className="dialog-actions"><button className="button button-secondary" disabled={commandPending} onClick={() => setPendingDevice(null)}>ยกเลิก</button><button className="button button-primary" disabled={commandPending} onClick={acknowledgeDevice}>{commandPending ? "กำลังรอเดโมตอบรับ" : "ยืนยันคำสั่งเดโม"}</button></div></Dialog>}
    {selectedAlert && <Dialog title="รายละเอียดการแจ้งเตือน" onClose={() => setSelectedAlert(null)}><span className="dialog-icon"><CircleAlert size={24} /></span><h2>{selectedAlert.title}</h2><p>{selectedAlert.detail}</p><p className="dialog-meta">{selectedAlert.time} · {selectedAlert.resolved ? "ดำเนินการแล้ว" : "ต้องตรวจสอบ"}</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setSelectedAlert(null)}>ปิด</button><button className="button button-primary" onClick={() => updateAlert(selectedAlert.id, !selectedAlert.resolved)}>{selectedAlert.resolved ? "เปิดอีกครั้ง" : "ทำเครื่องหมายว่าดำเนินการแล้ว"}</button></div></Dialog>}
    {toast && <div className={`toast toast-${toast.tone}`} role="status">{toast.message}<button aria-label="ปิดข้อความ" onClick={() => setToast(null)}><X size={16} /></button></div>}
  </div>;
}

function DashboardView({ devices, plants, alerts, period, setPeriod, lastUpdated, activeDevices, openAlerts, onNavigate, onDeviceRequest, onPlantSelect }: { devices: DemoDevice[]; plants: DemoPlant[]; alerts: DemoAlert[]; period: keyof typeof chartSeries; setPeriod: (period: keyof typeof chartSeries) => void; lastUpdated: string; activeDevices: number; openAlerts: number; onNavigate: (page: PageId) => void; onDeviceRequest: (device: DemoDevice) => void; onPlantSelect: (id: string) => void }) {
  return <><section className="summary-strip"><div className="summary-copy"><span className="summary-icon"><CheckCircle2 size={22} /></span><div><strong>สภาพโรงเรือนโดยรวมอยู่ในเกณฑ์ปกติ</strong><p>มี {openAlerts} รายการที่ควรตรวจสอบ แต่ระบบอัตโนมัติยังทำงานตามปกติ</p></div></div><div className="summary-meta"><span>อัปเดตล่าสุด</span><strong>{lastUpdated}</strong></div></section><section className="greenhouse-visual" aria-label="ภาพภายในโรงเรือนมะเขือเทศหลังที่ 1"><Image src="/images/greenhouse-overview.webp" alt="ภายในโรงเรือนมะเขือเทศขนาดเล็ก มีมะเขือเทศสี่ต้น ระบบน้ำหยด และพัดลมระบายอากาศ" fill priority unoptimized sizes="(max-width: 760px) 100vw, calc(100vw - 320px)" /><div className="visual-shade" /><div className="camera-status"><span><i /> กล้องออนไลน์</span><small>Camera 01 · ภาพล่าสุด 07:00 น.</small></div><div className="visual-caption"><span>มะเขือเทศ · โรงเรือน 01</span><strong>4 ต้น · 2 โซน · ระบบอัตโนมัติ</strong></div><button className="visual-action" onClick={() => onNavigate("plants")}>ดูข้อมูลพืช <ChevronRight size={16} /></button></section><section className="sensor-grid" aria-label="ข้อมูลเซ็นเซอร์ล่าสุด">{sensorCards.map(({ label, value, unit, note, icon: Icon, color, change, warning }) => <article className={`sensor-card ${warning ? "needs-attention" : ""}`} key={label}><div className="sensor-card-top"><span className={`sensor-icon ${color}`}><Icon size={20} /></span><span className={warning ? "negative" : "change"}>{change}</span></div><p>{label}</p><div className="sensor-value">{value}<small>{unit}</small></div><div className="sensor-note">{warning && <TrendingDown size={14} />}{note}</div></article>)}</section><section className="main-grid"><article className="panel chart-panel"><PeriodChart period={period} setPeriod={setPeriod} title="สภาพแวดล้อมภายในโรงเรือน" description="ข้อมูลเฉลี่ยจากเซ็นเซอร์ทุก 60 วินาที" /></article><article className="panel attention-panel"><div className="panel-heading"><div><h2>รายการที่ควรตรวจสอบ</h2><p>เรียงตามความสำคัญ</p></div><span className="count-badge">{openAlerts} รายการ</span></div><div className="attention-list">{alerts.filter((alert) => !alert.resolved).slice(0, 2).map((alert) => <button key={alert.id} onClick={() => onNavigate(alert.id === "leaf-spot" ? "plants" : "devices")}><span className={`alert-icon ${alert.type}`}><CircleAlert size={18} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p><small>{alert.time}</small></div><ChevronRight size={18} /></button>)}</div><button className="text-link" onClick={() => onNavigate("alerts")}>ดูรายการแจ้งเตือนทั้งหมด <ChevronRight size={16} /></button></article></section><section className="bottom-grid"><article className="panel device-panel"><div className="panel-heading"><div><h2>สถานะอุปกรณ์</h2><p>เปิดใช้งาน {activeDevices} จาก {devices.length} อุปกรณ์</p></div><button className="text-link" onClick={() => onNavigate("devices")}>จัดการอุปกรณ์ <ChevronRight size={16} /></button></div><p className="demo-notice" id="dashboard-device-demo-notice" role="note">โหมดสาธิต: สวิตช์ต้องยืนยันก่อนเปลี่ยนเฉพาะสถานะที่แสดง และไม่ส่งคำสั่งไปยังอุปกรณ์จริง</p><div className="device-list">{devices.map((device) => <div className="device-row" key={device.id}><span className="device-icon"><DeviceIcon device={device} /></span><div><strong>{device.name}</strong><small>{device.detail}</small></div><span className={`device-state ${device.active ? "on" : "off"}`}>{device.active ? "กำลังทำงาน" : "ปิด"}</span><button className={`toggle ${device.active ? "on" : ""}`} onClick={() => onDeviceRequest(device)} aria-label={`${device.active ? "ปิด" : "เปิด"}${device.name}`} aria-describedby="dashboard-device-demo-notice" aria-pressed={device.active}><i /></button></div>)}</div></article><article className="panel plant-panel"><div className="panel-heading"><div><h2>สุขภาพพืชล่าสุด</h2><p>วิเคราะห์ภาพเมื่อ 07:00 น.</p></div><button className="text-link" onClick={() => onNavigate("plants")}>ดูทุกต้น <ChevronRight size={16} /></button></div><div className="health-summary"><span className="health-score">88<small>/100</small></span><div><strong>อยู่ในเกณฑ์ดี</strong><p>ปกติ 3 ต้น · ควรตรวจสอบ 1 ต้น</p></div></div><div className="plant-status-list">{plants.map((plant) => <button type="button" key={plant.id} onClick={() => onPlantSelect(plant.id)}><span className={plant.health === "ปกติ" ? "healthy" : "warning"}><Leaf size={15} /></span><strong>{plant.name}</strong><small>{plant.zone}</small><b className={plant.health === "ปกติ" ? "healthy-text" : "warning-text"}>{plant.health}</b></button>)}</div></article></section></>;
}

function PeriodChart({ period, setPeriod, title, description }: { period: keyof typeof chartSeries; setPeriod: (period: keyof typeof chartSeries) => void; title: string; description: string }) { return <><div className="panel-heading"><div><h2>{title}</h2><p>{description}</p></div><div className="period-control">{(Object.keys(chartSeries) as Array<keyof typeof chartSeries>).map((item) => <button key={item} className={period === item ? "active" : ""} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="legend"><span className="temp">อุณหภูมิ</span><span className="humid">ความชื้นอากาศ</span><span className="soil">ความชื้นในดิน</span></div><LineChart period={period} /></>; }

function PlantsView({ plants, onSelect }: { plants: DemoPlant[]; onSelect: (id: string) => void }) { const [query, setQuery] = useState(""); const [filter, setFilter] = useState<"all" | DemoPlant["health"]>("all"); const visible = plants.filter((plant) => (filter === "all" || plant.health === filter) && `${plant.name} ${plant.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())); return <section className="panel table-panel"><div className="panel-tools"><label className="table-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="ค้นหาต้นพืช" placeholder="ค้นหารหัสหรือชื่อต้นพืช" /></label><div className="inline-filters" aria-label="กรองสุขภาพพืช">{(["all", "ปกติ", "ควรตรวจสอบ"] as const).map((item) => <button className={filter === item ? "active" : ""} key={item} onClick={() => setFilter(item)}>{item === "all" ? "ทั้งหมด" : item}</button>)}</div></div><div className="responsive-table"><table><thead><tr><th>ต้นพืช</th><th>ตำแหน่ง</th><th>อายุ</th><th>ความชื้นในดิน</th><th>ผลตรวจล่าสุด</th><th>ความมั่นใจ</th><th /></tr></thead><tbody>{visible.map((plant) => <tr key={plant.id}><td><div className="plant-name"><Image src={plant.health === "ปกติ" ? "/images/tomato-healthy-thumb.webp" : "/images/tomato-leaf-spot-thumb.webp"} alt="" width={40} height={40} unoptimized /><div><strong>{plant.name}</strong><small>{plant.id}</small></div></div></td><td>{plant.zone}</td><td>{plant.age}</td><td><div className="moisture-cell"><span><i style={{ width: `${plant.moisture}%` }} /></span>{plant.moisture}%</div></td><td><span className={`status-label ${plant.health === "ปกติ" ? "ok" : "warn"}`}>{plant.health}</span></td><td>{plant.confidence}%</td><td><button className="row-action" onClick={() => onSelect(plant.id)}>ดูรายละเอียด <ChevronRight size={16} /></button></td></tr>)}</tbody></table>{!visible.length && <p className="empty-copy">ไม่พบต้นพืชตามตัวกรองนี้</p>}</div></section>; }

function AiView({ plant, reviewed, onSave }: { plant: DemoPlant; reviewed: boolean; onSave: () => void }) { return <div className="detail-grid"><section className="panel scan-result"><div className="scan-image"><Image src="/images/tomato-leaf-spot-detail.webp" alt="ใบมะเขือเทศที่พบรอยจุดสีน้ำตาลขนาดเล็ก" fill unoptimized sizes="(max-width: 760px) 100vw, 60vw" /><span className="image-tag">ภาพต้นฉบับ · {plant.id}</span><i className="detection-marker marker-one" /><i className="detection-marker marker-two" /></div><div className="image-meta"><span><strong>Camera 01</strong><small>ภาพระยะใกล้ · {plant.zone}</small></span><span><strong>ภาพ WebP สำหรับการแสดงผล</strong><small>ตรวจเมื่อ 07:00 น.</small></span></div></section><section className="panel result-card"><div className="panel-heading"><div><h2>สรุปผลการวิเคราะห์</h2><p>โมเดลตรวจสุขภาพใบมะเขือเทศ</p></div><span className="status-label warn">พบลักษณะผิดปกติ</span></div><div className="result-score"><span>{plant.confidence}<small>%</small></span><div><strong>ความมั่นใจของโมเดล</strong><p>ควรตรวจสอบด้วยสายตาก่อนยืนยันผล</p></div></div><hr /><div className="detection-row"><span className="alert-icon critical"><CircleAlert size={18} /></span><div><strong>{plant.name} · อาจมีอาการใบจุดระยะแรก</strong><p>พบรอยสีน้ำตาลวงเล็กและขอบสีเหลืองจาง แนะนำให้แยกตรวจใบจริงและถ่ายภาพซ้ำในอีก 24 ชั่วโมง</p></div></div><button className="button button-primary wide" onClick={onSave} disabled={reviewed}>{reviewed ? "บันทึกผลตรวจแล้ว" : "บันทึกผลการตรวจสอบ"}</button></section></div>; }

function DevicesView({ devices, onRequest }: { devices: DemoDevice[]; onRequest: (device: DemoDevice) => void }) { return <section aria-labelledby="device-controls-heading"><div className="device-page-heading"><h2 id="device-controls-heading">อุปกรณ์ในโหมดสาธิต</h2><p className="demo-notice" id="device-page-demo-notice" role="note">สวิตช์หน้านี้ต้องยืนยันก่อนเปลี่ยนเฉพาะสถานะที่แสดง ยังไม่ส่งคำสั่งไปยังอุปกรณ์จริง</p></div><div className="device-card-grid">{devices.map((device) => <article className="panel device-control-card" key={device.id}><div className="device-control-top"><span className="device-large-icon"><DeviceIcon device={device} size={24} /></span><button className={`toggle large ${device.active ? "on" : ""}`} onClick={() => onRequest(device)} aria-label={`${device.active ? "ปิด" : "เปิด"}${device.name}`} aria-describedby="device-page-demo-notice" aria-pressed={device.active}><i /></button></div><h2>{device.name}</h2><p>{device.detail}</p><div className="device-divider" /><div className="device-control-meta"><span>สถานะที่แสดง</span><strong className={device.active ? "active-text" : "muted-text"}>{device.active ? "กำลังทำงาน" : "ปิดอยู่"}</strong></div><div className="device-control-meta"><span>โหมดควบคุม</span><strong>อัตโนมัติ</strong></div></article>)}</div></section>; }

function AnalyticsView({ period, setPeriod }: { period: keyof typeof chartSeries; setPeriod: (period: keyof typeof chartSeries) => void }) { return <><section className="analytics-summary"><article className="panel mini-stat"><span><Thermometer size={19} /></span><div><small>อุณหภูมิเฉลี่ย</small><strong>27.8°C</strong><p>+0.6°C จากช่วงก่อน</p></div></article><article className="panel mini-stat"><span><Droplets size={19} /></span><div><small>ปริมาณน้ำที่ใช้</small><strong>18.4 L</strong><p>−8% จากช่วงก่อน</p></div></article><article className="panel mini-stat"><span><History size={19} /></span><div><small>ระบบทำงานอัตโนมัติ</small><strong>12 ครั้ง</strong><p>สำเร็จทั้งหมด</p></div></article></section><section className="panel analytics-chart"><PeriodChart period={period} setPeriod={setPeriod} title="แนวโน้มข้อมูลเซ็นเซอร์" description="เปรียบเทียบข้อมูลตามช่วงเวลา" /></section></>; }

function AlertsView({ alerts, onOpen }: { alerts: DemoAlert[]; onOpen: (alert: DemoAlert) => void }) { const [filter, setFilter] = useState<"all" | "open" | "resolved">("all"); const visible = alerts.filter((alert) => filter === "all" || (filter === "open" ? !alert.resolved : alert.resolved)); return <section className="panel alerts-page"><div className="alert-filter" aria-label="กรองการแจ้งเตือน">{([{ id: "all", label: "ทั้งหมด" }, { id: "open", label: "ต้องตรวจสอบ" }, { id: "resolved", label: "ดำเนินการแล้ว" }] as const).map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label} <b>{item.id === "all" ? alerts.length : alerts.filter((alert) => item.id === "open" ? !alert.resolved : alert.resolved).length}</b></button>)}</div>{visible.map((alert) => <article className="full-alert" key={alert.id}><span className={`alert-icon ${alert.type}`}><CircleAlert size={19} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p><small>{alert.time} · {alert.resolved ? "ดำเนินการแล้ว" : "ต้องตรวจสอบ"}</small></div><button className="button button-secondary" onClick={() => onOpen(alert)}>ดูรายละเอียด</button></article>)}{!visible.length && <p className="empty-copy">ไม่มีรายการในตัวกรองนี้</p>}</section>; }

function SettingsView({
  settings,
  onSave,
}: {
  settings: DemoSettings;
  onSave: (settings: DemoSettings) => void;
}) {
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const automationItems = [
    { key: "water", label: "รดน้ำเมื่อความชื้นในดินต่ำ" },
    { key: "fan", label: "เปิดพัดลมเมื่ออุณหภูมิสูง" },
    { key: "light", label: "เปิดไฟตามตารางเวลา" },
    { key: "alert", label: "แจ้งเตือนเมื่อพบใบผิดปกติ" },
  ] as const;

  const setField = (
    field: keyof Omit<DemoSettings, "automation">,
    value: string,
  ) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const save = () => {
    const numericValues = [
      draft.minTemperature,
      draft.maxTemperature,
      draft.minHumidity,
      draft.minSoilMoisture,
    ];
    if (
      numericValues.some(
        (value) => value.trim() === "" || !Number.isFinite(Number(value)),
      )
    ) {
      setError("กรุณาระบุค่าเป้าหมายเป็นตัวเลขให้ครบถ้วน");
      return;
    }
    if (Number(draft.minTemperature) >= Number(draft.maxTemperature)) {
      setError("อุณหภูมิต่ำสุดต้องน้อยกว่าอุณหภูมิสูงสุด");
      return;
    }

    setError("");
    onSave(draft);
  };

  return (
    <div className="settings-grid">
      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>ค่าเป้าหมายสภาพแวดล้อม</h2>
            <p>ระบบจะใช้งานค่าเหล่านี้ในการควบคุมอัตโนมัติ</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            อุณหภูมิต่ำสุด
            <div>
              <input
                type="number"
                value={draft.minTemperature}
                onChange={(event) => setField("minTemperature", event.target.value)}
              />
              <span>°C</span>
            </div>
          </label>
          <label>
            อุณหภูมิสูงสุด
            <div>
              <input
                type="number"
                value={draft.maxTemperature}
                onChange={(event) => setField("maxTemperature", event.target.value)}
              />
              <span>°C</span>
            </div>
          </label>
          <label>
            ความชื้นอากาศต่ำสุด
            <div>
              <input
                type="number"
                value={draft.minHumidity}
                onChange={(event) => setField("minHumidity", event.target.value)}
              />
              <span>%</span>
            </div>
          </label>
          <label>
            ความชื้นในดินต่ำสุด
            <div>
              <input
                type="number"
                value={draft.minSoilMoisture}
                onChange={(event) =>
                  setField("minSoilMoisture", event.target.value)
                }
              />
              <span>%</span>
            </div>
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button button-primary" onClick={save}>
          บันทึกการตั้งค่า
        </button>
      </section>
      <section className="panel settings-section">
        <div className="panel-heading">
          <div>
            <h2>การทำงานอัตโนมัติ</h2>
            <p>เลือกอุปกรณ์ที่อนุญาตให้ระบบควบคุม</p>
          </div>
        </div>
        {automationItems.map((item) => (
          <label className="setting-toggle" key={item.key}>
            <span>
              <strong>{item.label}</strong>
              <small>
                {draft.automation[item.key] ? "เปิดใช้งาน" : "ปิดใช้งาน"}
              </small>
            </span>
            <input
              type="checkbox"
              checked={draft.automation[item.key]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  automation: {
                    ...current.automation,
                    [item.key]: event.target.checked,
                  },
                }))
              }
            />
            <i />
          </label>
        ))}
      </section>
    </div>
  );
}
