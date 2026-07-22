"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, Activity, CalendarClock, ChevronRight, Cpu, Droplets, Fan, Gauge, Leaf, Lightbulb, RefreshCw, ShieldAlert, Sparkles, TimerReset, Zap } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { devices as initialDevices } from "@/lib/mock-data";
import { greenhouseApi } from "@/lib/greenhouse-api";
import type { DeviceCommandState } from "@/types/greenhouse";

const deviceIcons = { pump: Droplets, fan: Fan, light: Lightbulb, mist: Sparkles };

const deviceTelemetry = {
  "DEV-PUMP-01": { watts: "820 W", health: 96, lastActive: "28 min ago", rule: "Irrigate Zone B for 3 min when soil moisture drops below 40%", override: "Prime line" },
  "DEV-FAN-01": { watts: "145 W", health: 98, lastActive: "12 min ago", rule: "Ventilate automatically above 30°C until temperature stabilizes", override: "Boost airflow" },
  "DEV-LIGHT-01": { watts: "0 W", health: 94, lastActive: "06:00 today", rule: "Turn on at 18:00 and maintain the grow-light photoperiod", override: "Pulse test" },
  "DEV-MIST-01": { watts: "260 W", health: 72, lastActive: "5 min ago", rule: "Increase humidity automatically when air humidity is below 60% RH", override: "Mist burst" },
};

export function DeviceControlView() {
  const [devices, setDevices] = useState(initialDevices);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const [category, setCategory] = useState("All");
  const [toast, setToast] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  const [emergencyPending, setEmergencyPending] = useState(false);
  const [commandStates, setCommandStates] = useState<Record<string, DeviceCommandState>>({});
  const categories = ["All", "Irrigation", "Environment", "Lighting"];
  const visibleDevices = useMemo(() => devices.filter((device) => category === "All" || device.category === category), [category, devices]);
  const onlineCount = devices.filter((device) => device.status !== "offline").length;
  const runningCount = devices.filter((device) => device.status === "on").length;

  const toggleDevice = async (id: string) => {
    if (autoMode || pendingId) return;
    const device = devices.find((item) => item.id === id);
    if (!device || device.status === "offline") return;
    const nextOn = device.status !== "on";
    setPendingId(id);
    try {
      const result = await greenhouseApi.sendDeviceCommand(id, nextOn);
      setCommandStates((states) => ({ ...states, [id]: result.state }));
      if (result.state === "acknowledged") {
        setDevices((items) => items.map((item) => item.id === id ? { ...item, status: nextOn ? "on" : "off", lastAction: `${nextOn ? "Started" : "Stopped"} after gateway acknowledgement` } : item));
      }
      setToast(result.message);
    } catch (error) {
      setCommandStates((states) => ({ ...states, [id]: "failed" }));
      setToast(error instanceof Error ? error.message : "The command could not be completed.");
    } finally {
      setPendingId(null);
      window.setTimeout(() => setToast(""), 4200);
    }
  };

  const requestManualOverride = (name: string) => {
    setToast(autoMode ? `Switch to Manual mode to override ${name}.` : `${name} is ready for manual override.`);
    window.setTimeout(() => setToast(""), 3200);
  };

  const emergencyStop = async () => {
    if (emergencyPending) return;
    setEmergencyPending(true);
    try {
      const result = await greenhouseApi.sendEmergencyStop();
      if (result.state === "acknowledged") {
        setDevices((items) => items.map((item) => ({ ...item, status: "off", lastAction: "Emergency stop acknowledged by gateway" })));
        setAutoMode(false);
      }
      setToast(result.message);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Emergency stop was not confirmed.");
    } finally {
      setEmergencyPending(false);
      setConfirmStop(false);
      window.setTimeout(() => setToast(""), 4200);
    }
  };

  return (
    <div className="page-stack device-page">
      <PageTitle eyebrow="Device Management" title="Device Control" subtitle="Monitor connected greenhouse equipment, live command states, and safe automation rules from one operational view." actions={<><button className="button danger-button" onClick={() => setConfirmStop(true)}><AlertOctagon size={17} /> Emergency stop</button><button className="button primary">+ Add device</button></>} />

      <section className="device-command-center">
        <div className="automation-banner">
          <div className="automation-icon"><Leaf size={24} /></div>
          <div><span className="section-kicker">OPERATING MODE</span><h3>{autoMode ? "Automatic rules are active" : "Manual control is active"}</h3><p>{autoMode ? "Irrigation, ventilation, lighting, and humidity rules are executing against live sensor thresholds." : "Manual overrides are unlocked. Commands still require gateway acknowledgement before state changes."}</p></div>
          <label className="mode-switch"><input type="checkbox" checked={autoMode} onChange={(event) => setAutoMode(event.target.checked)} /><span /><strong>{autoMode ? "AUTO" : "MANUAL"}</strong></label>
        </div>
        <div className="device-overview-card panel"><span><Cpu size={20} /></span><small>Gateway health</small><strong>{onlineCount}/{devices.length} online</strong><p><i className="live-dot" /> Live telemetry</p></div>
        <div className="device-overview-card panel"><span><Zap size={20} /></span><small>Running now</small><strong>{runningCount} devices</strong><p>1.23 kW current load</p></div>
      </section>

      <section className="toolbar-card device-toolbar"><div className="filter-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><span><i className="live-dot" /> Device gateway connected · updated just now</span></section>

      <section className="device-grid" aria-live="polite">
        {visibleDevices.length === 0 ? <div className="empty-state panel"><Cpu size={28} /><h3>No devices found</h3><p>Try another category or add a device to this greenhouse.</p></div> : visibleDevices.map((device) => {
          const Icon = deviceIcons[device.icon]; const pending = pendingId === device.id; const commandState = commandStates[device.id];
          const telemetry = deviceTelemetry[device.id as keyof typeof deviceTelemetry];
          const statusLabel = pending ? "Sending" : commandState === "failed" ? "Command failed" : device.status === "on" ? "Running" : device.status === "offline" ? "Offline" : "Standby";
          const healthTone = telemetry.health > 90 ? "excellent" : telemetry.health > 80 ? "good" : "watch";
          return <article className={`device-card panel ${device.status === "on" ? "device-on" : ""}`} key={device.id}>
            <div className="device-card-top"><span className="device-icon device-xl"><Icon size={30} /></span><span className={`device-state ${pending ? "pending" : commandState === "failed" ? "offline" : device.status}`}><i />{statusLabel}</span></div>
            <div className="device-name"><small>{device.id} · {device.category}</small><h3>{device.name}</h3><p>{device.schedule}</p></div>
            <div className="device-metrics"><span><Zap size={15} /><small>Power</small><strong>{pending ? "Syncing" : telemetry.watts}</strong></span><span><Activity size={15} /><small>Health</small><strong className={healthTone}>{telemetry.health}%</strong></span></div>
            <div className="device-health"><span><i style={{ width: `${telemetry.health}%` }} /></span><small>{healthTone === "watch" ? "Needs inspection" : "Healthy"}</small></div>
            <div className="device-rule"><Gauge size={16} /><div><small>AUTOMATION RULE</small><strong>{telemetry.rule}</strong></div></div>
            <div className="device-control-row"><div><small>Manual control</small><strong>{pending ? "Sending command…" : autoMode ? "Locked by automation" : device.status === "on" ? "Running" : "Stopped"}</strong></div><button className={`toggle-button ${device.status === "on" ? "on" : ""}`} disabled={autoMode || pending || device.status === "offline"} onClick={() => toggleDevice(device.id)} aria-label={`Turn ${device.name} ${device.status === "on" ? "off" : "on"}`} aria-pressed={device.status === "on"}>{pending ? <RefreshCw className="spin" size={16} /> : <i />}</button></div>
            <div className="device-actions-row"><button className="manual-override" onClick={() => requestManualOverride(device.name)}>{telemetry.override}</button><button className="icon-button" aria-label={`Open ${device.name} details`}><ChevronRight size={18} /></button></div>
            <footer><span><TimerReset size={14} /> Last active {telemetry.lastActive}</span><span><CalendarClock size={14} /> {device.lastAction}</span></footer>
          </article>;
        })}
      </section>

      <section className="schedule-panel panel"><div><span className="summary-icon"><CalendarClock size={21} /></span><div><span className="section-kicker">UPCOMING AUTOMATION</span><h3>Next scheduled actions</h3></div></div><div className="schedule-list"><span><strong>10:30</strong><small>Irrigate Zone B · 3 min</small></span><span><strong>15:00</strong><small>Ventilation check</small></span><span><strong>18:00</strong><small>Grow lights on</small></span></div><button className="button secondary">Manage schedule</button></section>

      {toast && <div className="toast-message" role="status"><span className="status-orb"><i /></span>{toast}</div>}
      {confirmStop && <div className="modal-backdrop" onMouseDown={() => !emergencyPending && setConfirmStop(false)}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="stop-title" onMouseDown={(event) => event.stopPropagation()}><span className="danger-icon"><ShieldAlert size={28} /></span><h2 id="stop-title">Request emergency stop?</h2><p>The gateway must acknowledge this command before the dashboard reports that devices are off.</p><div><button className="button secondary" disabled={emergencyPending} onClick={() => setConfirmStop(false)}>Cancel</button><button className="button danger-button" disabled={emergencyPending} onClick={emergencyStop}>{emergencyPending ? "Requesting…" : "Request emergency stop"}</button></div></div></div>}
    </div>
  );
}
