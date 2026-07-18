"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  Activity,
  Bell,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  CloudSun,
  Cpu,
  Download,
  Droplets,
  Fan,
  Gauge,
  History,
  LayoutDashboard,
  Leaf,
  Lightbulb,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  Settings,
  Sprout,
  Sun,
  Thermometer,
  TrendingDown,
  X,
} from "lucide-react";

type PageId = "dashboard" | "plants" | "ai" | "devices" | "analytics" | "alerts" | "settings";

const navItems = [
  { id: "dashboard" as PageId, label: "ภาพรวม", icon: LayoutDashboard },
  { id: "plants" as PageId, label: "ข้อมูลพืช", icon: Sprout },
  { id: "ai" as PageId, label: "ผลวิเคราะห์ภาพ", icon: Bot },
  { id: "devices" as PageId, label: "ควบคุมอุปกรณ์", icon: Cpu },
  { id: "analytics" as PageId, label: "สถิติและรายงาน", icon: Activity },
  { id: "alerts" as PageId, label: "การแจ้งเตือน", icon: Bell, count: 2 },
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

const plants = [
  { id: "TOM-001", name: "มะเขือเทศ 01", zone: "โซน A", age: "42 วัน", moisture: 46, health: "ปกติ", confidence: 98 },
  { id: "TOM-002", name: "มะเขือเทศ 02", zone: "โซน A", age: "42 วัน", moisture: 44, health: "ปกติ", confidence: 96 },
  { id: "TOM-003", name: "มะเขือเทศ 03", zone: "โซน B", age: "38 วัน", moisture: 39, health: "ควรตรวจสอบ", confidence: 78 },
  { id: "TOM-004", name: "มะเขือเทศ 04", zone: "โซน B", age: "38 วัน", moisture: 36, health: "ปกติ", confidence: 94 },
];

const initialDevices = [
  { id: "pump", name: "ปั๊มน้ำ", detail: "รอบถัดไป 10:30 น.", icon: Droplets, active: false },
  { id: "fan", name: "พัดลมระบายอากาศ", detail: "โหมดอัตโนมัติ · มากกว่า 30°C", icon: Fan, active: true },
  { id: "light", name: "ไฟปลูกพืช", detail: "รอบถัดไป 18:00 น.", icon: Lightbulb, active: false },
  { id: "mist", name: "เครื่องพ่นหมอก", detail: "โหมดอัตโนมัติ · ต่ำกว่า 60% RH", icon: CloudSun, active: true },
];

function LineChart() {
  return (
    <div className="chart-wrap" role="img" aria-label="กราฟอุณหภูมิ ความชื้นอากาศ และความชื้นในดินวันนี้">
      <div className="chart-scale"><span>80</span><span>60</span><span>40</span><span>20</span></div>
      <svg viewBox="0 0 760 240" preserveAspectRatio="none" aria-hidden="true">
        <g className="grid-lines"><path d="M0 30H760M0 88H760M0 146H760M0 204H760" /></g>
        <path className="chart-line temperature" d="M0 138 C80 132 100 105 180 116 S300 90 380 105 S520 69 600 82 S700 58 760 70" />
        <path className="chart-line humidity" d="M0 82 C70 70 130 86 205 76 S330 64 405 72 S540 64 625 69 S710 55 760 60" />
        <path className="chart-line soil" d="M0 112 C85 115 130 124 210 128 S345 144 420 150 S565 163 640 171 S710 182 760 188" />
      </svg>
      <div className="chart-times"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
    </div>
  );
}

export function GreenhouseDashboard() {
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("07:42 น.");
  const [refreshing, setRefreshing] = useState(false);
  const [devices, setDevices] = useState(initialDevices);
  const [period, setPeriod] = useState("วันนี้");

  const activeDevices = useMemo(() => devices.filter((device) => device.active).length, [devices]);

  const navigate = (page: PageId) => {
    setActivePage(page);
    setMenuOpen(false);
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const refresh = () => {
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setLastUpdated("เมื่อสักครู่");
    }, 650);
  };

  const toggleDevice = (id: string) => {
    setDevices((current) => current.map((device) => device.id === id ? { ...device, active: !device.active } : device));
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">ข้ามไปยังเนื้อหาหลัก</a>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Leaf size={22} /></span>
          <div><strong>GREENHOUSE 01</strong><small>SMART FARM SYSTEM</small></div>
          <button className="close-menu" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}><X size={20} /></button>
        </div>

        <div className="site-switcher">
          <span><Sprout size={18} /></span>
          <div><small>โรงเรือนที่เลือก</small><strong>มะเขือเทศ · หลังที่ 1</strong></div>
          <ChevronDown size={16} />
        </div>

        <nav aria-label="เมนูหลัก">
          <p className="nav-label">เมนูหลัก</p>
          {navItems.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={activePage === id ? "active" : ""} onClick={() => navigate(id)}>
              <Icon size={19} /><span>{label}</span>{count ? <b>{count}</b> : null}
            </button>
          ))}
          <p className="nav-label secondary-label">ระบบ</p>
          <button className={activePage === "settings" ? "active" : ""} onClick={() => navigate("settings")}>
            <Settings size={19} /><span>ตั้งค่าระบบ</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status"><i /><div><strong>ระบบเชื่อมต่อปกติ</strong><small>อุปกรณ์ออนไลน์ 8/8</small></div></div>
          <button className="user-card"><span>PW</span><div><strong>Panuwat</strong><small>ผู้ดูแลระบบ</small></div><MoreHorizontal size={18} /></button>
        </div>
      </aside>

      {menuOpen && <button className="backdrop" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} />}

      <main className="main-area" id="main-content" tabIndex={-1}>
        <header className="topbar">
          <button className="menu-button" aria-label="เปิดเมนู" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
          <label className="search"><Search size={18} /><input aria-label="ค้นหา" placeholder="ค้นหาต้นพืช อุปกรณ์ หรือรายการแจ้งเตือน" /></label>
          <div className="topbar-actions">
            <span className="online-badge"><i /> ออนไลน์</span>
            <button className="notification" aria-label="การแจ้งเตือน" onClick={() => navigate("alerts")}><Bell size={20} /><b>2</b></button>
          </div>
        </header>

        <div className="content">
          <header className="page-heading">
            <div>
              <p className="date-line"><CalendarDays size={15} /> วันเสาร์ที่ 18 กรกฎาคม 2569</p>
              <h1>{pageTitles[activePage].title}</h1>
              <p>{pageTitles[activePage].description}</p>
            </div>
            <div className="heading-actions">
              <button className="button button-secondary"><Download size={17} /> ส่งออกรายงาน</button>
              <button className="button button-primary" onClick={refresh} disabled={refreshing}><RefreshCw size={17} className={refreshing ? "spin" : ""} /> {refreshing ? "กำลังอัปเดต" : "อัปเดตข้อมูล"}</button>
            </div>
          </header>

          {activePage === "dashboard" && (
            <>
              <section className="summary-strip">
                <div className="summary-copy">
                  <span className="summary-icon"><CheckCircle2 size={22} /></span>
                  <div><strong>สภาพโรงเรือนโดยรวมอยู่ในเกณฑ์ปกติ</strong><p>มี 2 รายการที่ควรตรวจสอบ แต่ระบบอัตโนมัติยังทำงานตามปกติ</p></div>
                </div>
                <div className="summary-meta"><span>อัปเดตล่าสุด</span><strong>{lastUpdated}</strong></div>
              </section>

              <section className="greenhouse-visual" aria-label="ภาพภายในโรงเรือนมะเขือเทศหลังที่ 1">
                <Image src="/images/greenhouse-overview.webp" alt="ภายในโรงเรือนมะเขือเทศขนาดเล็ก มีมะเขือเทศสี่ต้น ระบบน้ำหยด และพัดลมระบายอากาศ" fill priority unoptimized sizes="(max-width: 760px) 100vw, calc(100vw - 320px)" />
                <div className="visual-shade" />
                <div className="camera-status"><span><i /> กล้องออนไลน์</span><small>Camera 01 · ภาพล่าสุด 07:00 น.</small></div>
                <div className="visual-caption"><span>มะเขือเทศ · โรงเรือน 01</span><strong>4 ต้น · 2 โซน · ระบบอัตโนมัติ</strong></div>
                <button className="visual-action" onClick={() => navigate("plants")}>ดูข้อมูลพืช <ChevronRight size={16} /></button>
              </section>

              <section className="sensor-grid" aria-label="ข้อมูลเซ็นเซอร์ล่าสุด">
                {sensorCards.map(({ label, value, unit, note, icon: Icon, color, change, warning }) => (
                  <article className={`sensor-card ${warning ? "needs-attention" : ""}`} key={label}>
                    <div className="sensor-card-top"><span className={`sensor-icon ${color}`}><Icon size={20} /></span><span className={warning ? "negative" : "change"}>{change}</span></div>
                    <p>{label}</p>
                    <div className="sensor-value">{value}<small>{unit}</small></div>
                    <div className="sensor-note">{warning && <TrendingDown size={14} />}{note}</div>
                  </article>
                ))}
              </section>

              <section className="main-grid">
                <article className="panel chart-panel">
                  <div className="panel-heading">
                    <div><h2>สภาพแวดล้อมภายในโรงเรือน</h2><p>ข้อมูลเฉลี่ยจากเซ็นเซอร์ทุก 60 วินาที</p></div>
                    <div className="period-control">{["วันนี้", "7 วัน", "30 วัน"].map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div>
                  </div>
                  <div className="legend"><span className="temp">อุณหภูมิ</span><span className="humid">ความชื้นอากาศ</span><span className="soil">ความชื้นในดิน</span></div>
                  <LineChart />
                </article>

                <article className="panel attention-panel">
                  <div className="panel-heading"><div><h2>รายการที่ควรตรวจสอบ</h2><p>เรียงตามความสำคัญ</p></div><span className="count-badge">2 รายการ</span></div>
                  <div className="attention-list">
                    <button onClick={() => navigate("plants")}>
                      <span className="alert-icon critical"><Leaf size={18} /></span>
                      <div><strong>ตรวจใบของมะเขือเทศ 03</strong><p>พบลักษณะผิดปกติจากภาพล่าสุด · ความมั่นใจ 78%</p><small>18 นาทีที่แล้ว</small></div><ChevronRight size={18} />
                    </button>
                    <button onClick={() => navigate("devices")}>
                      <span className="alert-icon warning"><Droplets size={18} /></span>
                      <div><strong>ความชื้นในดินกำลังลดลง</strong><p>มะเขือเทศ 04 เหลือ 36% ใกล้ค่าเริ่มรดน้ำ</p><small>5 นาทีที่แล้ว</small></div><ChevronRight size={18} />
                    </button>
                  </div>
                  <button className="text-link" onClick={() => navigate("alerts")}>ดูรายการแจ้งเตือนทั้งหมด <ChevronRight size={16} /></button>
                </article>
              </section>

              <section className="bottom-grid">
                <article className="panel device-panel">
                  <div className="panel-heading"><div><h2>สถานะอุปกรณ์</h2><p>เปิดใช้งาน {activeDevices} จาก {devices.length} อุปกรณ์</p></div><button className="text-link" onClick={() => navigate("devices")}>จัดการอุปกรณ์ <ChevronRight size={16} /></button></div>
                  <p className="demo-notice" id="dashboard-device-demo-notice" role="note">โหมดสาธิต: สวิตช์เปลี่ยนเฉพาะการแสดงผล ยังไม่ส่งคำสั่งไปยังอุปกรณ์จริง</p>
                  <div className="device-list">
                    {devices.map(({ id, name, detail, icon: Icon, active }) => (
                      <div className="device-row" key={id}>
                        <span className="device-icon"><Icon size={19} /></span>
                        <div><strong>{name}</strong><small>{detail}</small></div>
                        <span className={`device-state ${active ? "on" : "off"}`}>{active ? "กำลังทำงาน" : "ปิด"}</span>
                        <button className={`toggle ${active ? "on" : ""}`} onClick={() => toggleDevice(id)} aria-label={`${active ? "ปิด" : "เปิด"}${name}`} aria-describedby="dashboard-device-demo-notice" aria-pressed={active}><i /></button>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel plant-panel">
                  <div className="panel-heading"><div><h2>สุขภาพพืชล่าสุด</h2><p>วิเคราะห์ภาพเมื่อ 07:00 น.</p></div><button className="text-link" onClick={() => navigate("plants")}>ดูทุกต้น <ChevronRight size={16} /></button></div>
                  <div className="health-summary"><span className="health-score">88<small>/100</small></span><div><strong>อยู่ในเกณฑ์ดี</strong><p>ปกติ 3 ต้น · ควรตรวจสอบ 1 ต้น</p></div></div>
                  <div className="plant-status-list">
                    {plants.map((plant) => <div key={plant.id}><span className={plant.health === "ปกติ" ? "healthy" : "warning"}><Leaf size={15} /></span><strong>{plant.name}</strong><small>{plant.zone}</small><b className={plant.health === "ปกติ" ? "healthy-text" : "warning-text"}>{plant.health}</b></div>)}
                  </div>
                </article>
              </section>
            </>
          )}

          {activePage === "plants" && <PlantsView onSelect={() => navigate("ai")} />}
          {activePage === "ai" && <AiView />}
          {activePage === "devices" && <DevicesView devices={devices} onToggle={toggleDevice} />}
          {activePage === "analytics" && <AnalyticsView period={period} setPeriod={setPeriod} />}
          {activePage === "alerts" && <AlertsView />}
          {activePage === "settings" && <SettingsView />}
        </div>
      </main>
    </div>
  );
}

function PlantsView({ onSelect }: { onSelect: () => void }) {
  return <section className="panel table-panel"><div className="panel-tools"><label className="table-search"><Search size={17} /><input aria-label="ค้นหาต้นพืช" placeholder="ค้นหารหัสหรือชื่อต้นพืช" /></label><button className="button button-secondary">ตัวกรอง <ChevronDown size={16} /></button></div><div className="responsive-table"><table><thead><tr><th>ต้นพืช</th><th>ตำแหน่ง</th><th>อายุ</th><th>ความชื้นในดิน</th><th>ผลตรวจล่าสุด</th><th>ความมั่นใจ</th><th /></tr></thead><tbody>{plants.map((plant) => <tr key={plant.id}><td><div className="plant-name"><Image src={plant.health === "ปกติ" ? "/images/tomato-healthy-thumb.webp" : "/images/tomato-leaf-spot-thumb.webp"} alt="" width={40} height={40} unoptimized /><div><strong>{plant.name}</strong><small>{plant.id}</small></div></div></td><td>{plant.zone}</td><td>{plant.age}</td><td><div className="moisture-cell"><span><i style={{ width: `${plant.moisture}%` }} /></span>{plant.moisture}%</div></td><td><span className={`status-label ${plant.health === "ปกติ" ? "ok" : "warn"}`}>{plant.health}</span></td><td>{plant.confidence}%</td><td><button className="row-action" onClick={onSelect}>ดูรายละเอียด <ChevronRight size={16} /></button></td></tr>)}</tbody></table></div></section>;
}

function AiView() {
  return <div className="detail-grid"><section className="panel scan-result"><div className="scan-image"><Image src="/images/tomato-leaf-spot-detail.webp" alt="ใบมะเขือเทศที่พบรอยจุดสีน้ำตาลขนาดเล็ก" fill unoptimized sizes="(max-width: 760px) 100vw, 60vw" /><span className="image-tag">ภาพต้นฉบับ · TOM-003</span><i className="detection-marker marker-one" /><i className="detection-marker marker-two" /></div><div className="image-meta"><span><strong>Camera 01</strong><small>ภาพระยะใกล้ · โซน B</small></span><span><strong>ภาพ WebP สำหรับการแสดงผล</strong><small>ตรวจเมื่อ 07:00 น.</small></span></div></section><section className="panel result-card"><div className="panel-heading"><div><h2>สรุปผลการวิเคราะห์</h2><p>โมเดลตรวจสุขภาพใบมะเขือเทศ</p></div><span className="status-label warn">พบลักษณะผิดปกติ</span></div><div className="result-score"><span>78<small>%</small></span><div><strong>ความมั่นใจของโมเดล</strong><p>ควรตรวจสอบด้วยสายตาก่อนยืนยันผล</p></div></div><hr /><div className="detection-row"><span className="alert-icon critical"><CircleAlert size={18} /></span><div><strong>มะเขือเทศ 03 · อาจมีอาการใบจุดระยะแรก</strong><p>พบรอยสีน้ำตาลวงเล็กและขอบสีเหลืองจาง แนะนำให้แยกตรวจใบจริงและถ่ายภาพซ้ำในอีก 24 ชั่วโมง</p></div></div><button className="button button-primary wide">บันทึกผลการตรวจสอบ</button></section></div>;
}

function DevicesView({ devices, onToggle }: { devices: typeof initialDevices; onToggle: (id: string) => void }) {
  return <section aria-labelledby="device-controls-heading"><div className="device-page-heading"><h2 id="device-controls-heading">อุปกรณ์ในโหมดสาธิต</h2><p className="demo-notice" id="device-page-demo-notice" role="note">สวิตช์หน้านี้เปลี่ยนเฉพาะสถานะที่แสดง ยังไม่ส่งคำสั่งไปยังอุปกรณ์จริง</p></div><div className="device-card-grid">{devices.map(({ id, name, detail, icon: Icon, active }) => <article className="panel device-control-card" key={id}><div className="device-control-top"><span className="device-large-icon"><Icon size={24} /></span><button className={`toggle large ${active ? "on" : ""}`} onClick={() => onToggle(id)} aria-label={`${active ? "ปิด" : "เปิด"}${name}`} aria-describedby="device-page-demo-notice" aria-pressed={active}><i /></button></div><h2>{name}</h2><p>{detail}</p><div className="device-divider" /><div className="device-control-meta"><span>สถานะที่แสดง</span><strong className={active ? "active-text" : "muted-text"}>{active ? "กำลังทำงาน" : "ปิดอยู่"}</strong></div><div className="device-control-meta"><span>โหมดควบคุม</span><strong>อัตโนมัติ</strong></div></article>)}</div></section>;
}

function AnalyticsView({ period, setPeriod }: { period: string; setPeriod: (value: string) => void }) {
  return <><section className="analytics-summary"><article className="panel mini-stat"><span><Thermometer size={19} /></span><div><small>อุณหภูมิเฉลี่ย</small><strong>27.8°C</strong><p>+0.6°C จากช่วงก่อน</p></div></article><article className="panel mini-stat"><span><Droplets size={19} /></span><div><small>ปริมาณน้ำที่ใช้</small><strong>18.4 L</strong><p>−8% จากช่วงก่อน</p></div></article><article className="panel mini-stat"><span><History size={19} /></span><div><small>ระบบทำงานอัตโนมัติ</small><strong>12 ครั้ง</strong><p>สำเร็จทั้งหมด</p></div></article></section><section className="panel analytics-chart"><div className="panel-heading"><div><h2>แนวโน้มข้อมูลเซ็นเซอร์</h2><p>เปรียบเทียบข้อมูลตามช่วงเวลา</p></div><div className="period-control">{["วันนี้", "7 วัน", "30 วัน"].map((item) => <button key={item} className={period === item ? "active" : ""} onClick={() => setPeriod(item)}>{item}</button>)}</div></div><div className="legend"><span className="temp">อุณหภูมิ</span><span className="humid">ความชื้นอากาศ</span><span className="soil">ความชื้นในดิน</span></div><LineChart /></section></>;
}

function AlertsView() {
  const alerts = [{ type: "critical", title: "ควรตรวจใบของมะเขือเทศ 03", detail: "ผลวิเคราะห์ภาพพบลักษณะที่อาจเป็นใบจุด ความมั่นใจ 78%", time: "18 นาทีที่แล้ว" }, { type: "warning", title: "ความชื้นในดินของมะเขือเทศ 04 ลดลง", detail: "ค่าปัจจุบัน 36% ใกล้ค่าเริ่มรดน้ำอัตโนมัติที่ 35%", time: "5 นาทีที่แล้ว" }, { type: "info", title: "รอบระบายอากาศเสร็จสิ้น", detail: "อุณหภูมิในโซน A กลับสู่ช่วงเป้าหมายแล้ว", time: "42 นาทีที่แล้ว" }];
  return <section className="panel alerts-page"><div className="alert-filter"><button className="active">ทั้งหมด <b>3</b></button><button>ต้องตรวจสอบ <b>2</b></button><button>ดำเนินการแล้ว <b>1</b></button></div>{alerts.map((alert) => <article className="full-alert" key={alert.title}><span className={`alert-icon ${alert.type}`}><CircleAlert size={19} /></span><div><strong>{alert.title}</strong><p>{alert.detail}</p><small>{alert.time}</small></div><button className="button button-secondary">ดูรายละเอียด</button></article>)}</section>;
}

function SettingsView() {
  return <div className="settings-grid"><section className="panel settings-section"><div className="panel-heading"><div><h2>ค่าเป้าหมายสภาพแวดล้อม</h2><p>ระบบจะใช้งานค่าเหล่านี้ในการควบคุมอัตโนมัติ</p></div></div><div className="form-grid"><label>อุณหภูมิต่ำสุด<div><input defaultValue="22" /><span>°C</span></div></label><label>อุณหภูมิสูงสุด<div><input defaultValue="30" /><span>°C</span></div></label><label>ความชื้นอากาศต่ำสุด<div><input defaultValue="60" /><span>%</span></div></label><label>ความชื้นในดินต่ำสุด<div><input defaultValue="35" /><span>%</span></div></label></div><button className="button button-primary">บันทึกการตั้งค่า</button></section><section className="panel settings-section"><div className="panel-heading"><div><h2>การทำงานอัตโนมัติ</h2><p>เลือกอุปกรณ์ที่อนุญาตให้ระบบควบคุม</p></div></div>{["รดน้ำเมื่อความชื้นในดินต่ำ", "เปิดพัดลมเมื่ออุณหภูมิสูง", "เปิดไฟตามตารางเวลา", "แจ้งเตือนเมื่อพบใบผิดปกติ"].map((item) => <label className="setting-toggle" key={item}><span><strong>{item}</strong><small>เปิดใช้งาน</small></span><input type="checkbox" defaultChecked /><i /></label>)}</section></div>;
}
