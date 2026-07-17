"use client";

import { useState } from "react";
import { BellRing, Check, CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { alerts as initialAlerts } from "@/lib/mock-data";
import { PageTitle } from "@/components/ui/page-title";

export function AlertsView() {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [filter, setFilter] = useState("All");
  const visible = alerts.filter((alert) => filter === "All" || (filter === "Open" ? !alert.resolved : alert.severity === filter.toLowerCase()));
  const icons = { critical: CircleAlert, warning: TriangleAlert, info: Info };
  return <div className="page-stack"><PageTitle eyebrow="2 open alerts" title="Alerts" subtitle="Prioritized events from sensors, AI detections, and connected devices." actions={<button className="button secondary" onClick={() => setAlerts((items) => items.map((item) => ({ ...item, resolved: true })))}><CheckCircle2 size={17} /> Mark all resolved</button>} />
    <section className="toolbar-card"><div className="filter-tabs">{["All", "Open", "Critical", "Warning"].map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><span className="toolbar-note"><BellRing size={16} /> Notifications enabled</span></section>
    <section className="alerts-page-list">{visible.map((alert) => { const Icon = icons[alert.severity]; return <article key={alert.id} className={`full-alert panel ${alert.severity} ${alert.resolved ? "resolved" : ""}`}><span className="alert-icon"><Icon size={21} /></span><div><div><span className={`status-pill ${alert.severity}`}>{alert.severity}</span>{alert.resolved && <span className="resolved-label"><Check size={13} /> Resolved</span>}</div><h3>{alert.title}</h3><p>{alert.description}</p><small>{alert.time} · Tomato House 01</small></div><button className="button secondary" onClick={() => setAlerts((items) => items.map((item) => item.id === alert.id ? { ...item, resolved: !item.resolved } : item))}>{alert.resolved ? "Reopen" : "Resolve"}</button></article>; })}{visible.length === 0 && <div className="empty-card"><CheckCircle2 size={30} /><h3>No matching alerts</h3><p>Your greenhouse is clear for this filter.</p></div>}</section>
  </div>;
}
