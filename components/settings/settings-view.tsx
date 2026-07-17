"use client";

import { useState } from "react";
import { Bell, BrainCircuit, Cloud, Database, Save, Settings2, UserRound } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";

export function SettingsView() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({ autoControl: true, aiAlerts: true, lineNotify: false, cachedData: true });
  const toggle = (key: keyof typeof settings) => setSettings((value) => ({ ...value, [key]: !value[key] }));
  return <div className="page-stack"><PageTitle eyebrow="System configuration" title="Settings" subtitle="Configure your greenhouse, notifications, and AI behavior." actions={<button className="button primary" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2200); }}><Save size={17} /> Save changes</button>} />
    <section className="settings-layout"><nav className="settings-nav panel"><button className="active"><Settings2 size={18} /> Greenhouse</button><button><UserRound size={18} /> Profile</button><button><Bell size={18} /> Notifications</button><button><BrainCircuit size={18} /> AI Model</button><button><Database size={18} /> Data & Cloud</button></nav>
      <div className="settings-content">
        <article className="panel settings-card"><div><span className="section-kicker">GENERAL</span><h3>Greenhouse profile</h3><p>Basic information used across the dashboard and reports.</p></div><div className="form-grid"><label><span>Greenhouse name</span><input defaultValue="Tomato House 01" /></label><label><span>Plant type</span><input defaultValue="Tomato" /></label><label><span>Location</span><input defaultValue="Nakhon Ratchasima, Thailand" /></label><label><span>Timezone</span><input defaultValue="Asia/Bangkok (GMT+7)" /></label></div></article>
        <article className="panel settings-card"><div><span className="section-kicker">BEHAVIOR</span><h3>Automation & notifications</h3><p>Choose what the system may do automatically.</p></div>{[{ key: "autoControl", icon: Cloud, title: "Automatic device control", desc: "Use sensor thresholds to control connected equipment." }, { key: "aiAlerts", icon: BrainCircuit, title: "AI health alerts", desc: "Notify when the model detects a plant-health risk." }, { key: "lineNotify", icon: Bell, title: "LINE notification", desc: "Starter toggle for a future LINE Messaging API integration." }, { key: "cachedData", icon: Database, title: "Offline data cache", desc: "Keep the latest readings visible if the gateway disconnects." }].map((item) => { const Icon = item.icon; const key = item.key as keyof typeof settings; return <div className="setting-row" key={key}><span className="summary-icon"><Icon size={19} /></span><div><strong>{item.title}</strong><p>{item.desc}</p></div><button className={`toggle-button ${settings[key] ? "on" : ""}`} onClick={() => toggle(key)} aria-label={`Toggle ${item.title}`} aria-pressed={settings[key]}><i /></button></div>; })}</article>
      </div>
    </section>{saved && <div className="toast-message" role="status"><span className="status-orb"><i /></span>Settings saved successfully.</div>}
  </div>;
}
