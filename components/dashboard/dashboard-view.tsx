"use client";

import {
  ArrowDownToLine,
  Bot,
  ChevronRight,
  CircleAlert,
  Droplets,
  Fan,
  Gauge,
  Leaf,
  Lightbulb,
  RefreshCw,
  Sprout,
  SunMedium,
  Thermometer,
  Waves,
} from "lucide-react";
import { alerts, sensors } from "@/lib/mock-data";
import { Sparkline } from "@/components/ui/sparkline";

const sensorIcons = {
  temperature: Thermometer,
  humidity: Droplets,
  soil: Sprout,
  light: SunMedium,
};

export function DashboardView({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <div className="eyebrow"><span className="live-dot" /> Greenhouse 01 · Online</div>
          <h1>Good morning, Panuwat</h1>
          <p>Your greenhouse is stable. One plant needs a closer look.</p>
        </div>
        <div className="header-actions">
          <button className="button secondary"><ArrowDownToLine size={17} /> Export</button>
          <button className="button primary"><RefreshCw size={17} /> Refresh data</button>
        </div>
      </header>

      <section className="hero-status" aria-label="Greenhouse status summary">
        <div className="hero-copy">
          <span className="status-pill healthy"><Leaf size={14} /> Overall health 88%</span>
          <h2>Plants are growing well.</h2>
          <p>AI reviewed the latest image at 09:00. Three tomato plants are healthy and one is marked for inspection.</p>
          <button className="text-button" onClick={() => onNavigate("plants")}>Review plant health <ChevronRight size={16} /></button>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="plant-core"><Sprout size={58} /></div>
          <span className="orbit-label label-ai">AI · 96%</span>
          <span className="orbit-label label-sensor">4 sensors</span>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Latest sensor readings">
        {sensors.map((sensor) => {
          const Icon = sensorIcons[sensor.icon];
          return (
            <article className={`metric-card tone-${sensor.tone}`} key={sensor.id}>
              <div className="metric-top">
                <span className="icon-box"><Icon size={20} /></span>
                <span className={`trend ${sensor.tone === "attention" ? "warning" : ""}`}>{sensor.trend}</span>
              </div>
              <p>{sensor.label}</p>
              <div className="metric-value">{sensor.value}<small>{sensor.unit}</small></div>
              <div className="metric-bottom">
                <span>{sensor.range}</span>
                <Sparkline values={sensor.sparkline} warning={sensor.tone === "attention"} />
              </div>
            </article>
          );
        })}
      </section>

      <section className="dashboard-grid">
        <article className="panel sensor-panel">
          <div className="panel-heading">
            <div><span className="section-kicker">LIVE ENVIRONMENT</span><h3>Sensor overview</h3></div>
            <div className="segmented" aria-label="Chart period"><button className="active">Today</button><button>7 days</button><button>30 days</button></div>
          </div>
          <div className="chart-legend"><span className="temp">Temperature</span><span className="humid">Humidity</span><span className="soil">Soil moisture</span></div>
          <div className="sensor-chart" role="img" aria-label="Temperature, humidity, and soil moisture trends today">
            <div className="chart-guides"><i /><i /><i /><i /></div>
            <svg viewBox="0 0 700 220" preserveAspectRatio="none">
              <path className="area-path" d="M0 150 C80 145 110 100 190 116 S330 82 410 100 S540 48 700 70 L700 220 L0 220 Z" />
              <path className="line temp-line" d="M0 150 C80 145 110 100 190 116 S330 82 410 100 S540 48 700 70" />
              <path className="line humid-line" d="M0 85 C100 74 170 95 250 76 S390 70 470 82 S600 58 700 66" />
              <path className="line soil-line" d="M0 65 C120 70 160 88 260 92 S410 120 510 126 S620 145 700 152" />
            </svg>
            <div className="chart-axis"><span>06:00</span><span>09:00</span><span>12:00</span><span>15:00</span><span>18:00</span></div>
          </div>
        </article>

        <article className="panel alert-panel">
          <div className="panel-heading"><div><span className="section-kicker">NEEDS ATTENTION</span><h3>Recent alerts</h3></div><button className="icon-button"><CircleAlert size={19} /></button></div>
          <div className="alert-list">
            {alerts.map((alert) => (
              <button className="alert-row" key={alert.id} onClick={() => onNavigate("alerts")}>
                <span className={`severity-dot ${alert.severity}`} />
                <span><strong>{alert.title}</strong><small>{alert.description}</small></span>
                <time>{alert.time}</time>
              </button>
            ))}
          </div>
          <button className="panel-link" onClick={() => onNavigate("alerts")}>View all alerts <ChevronRight size={16} /></button>
        </article>
      </section>

      <section className="summary-grid">
        <article className="panel summary-card">
          <div className="summary-icon"><Bot size={22} /></div>
          <div><span className="section-kicker">AI PLANT HEALTH</span><h3>3 healthy · 1 warning</h3><p>Latest scan completed with 96% confidence.</p></div>
          <button className="icon-button" onClick={() => onNavigate("ai")} aria-label="Open AI Detection"><ChevronRight size={20} /></button>
        </article>
        <article className="panel summary-card">
          <div className="summary-icon"><Gauge size={22} /></div>
          <div><span className="section-kicker">DEVICE AUTOMATION</span><h3>3 of 4 devices active</h3><p>Auto mode is maintaining the current targets.</p></div>
          <button className="icon-button" onClick={() => onNavigate("devices")} aria-label="Open Device Control"><ChevronRight size={20} /></button>
        </article>
      </section>

      <section>
        <div className="section-title-row"><div><span className="section-kicker">QUICK ACTIONS</span><h3>Run your greenhouse</h3></div></div>
        <div className="quick-grid">
          <button onClick={() => onNavigate("devices")}><span><Waves size={21} /></span><strong>Water plants</strong><small>Pump is ready</small></button>
          <button onClick={() => onNavigate("ai")}><span><Bot size={21} /></span><strong>Run AI scan</strong><small>Camera online</small></button>
          <button onClick={() => onNavigate("devices")}><span><Fan size={21} /></span><strong>Ventilate</strong><small>Auto mode</small></button>
          <button onClick={() => onNavigate("devices")}><span><Lightbulb size={21} /></span><strong>Grow light</strong><small>Next at 18:00</small></button>
        </div>
      </section>
    </div>
  );
}
