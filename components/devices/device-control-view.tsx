"use client";

import { useMemo, useState } from "react";
import { AlertOctagon, CalendarClock, ChevronRight, Droplets, Fan, Lightbulb, Power, RefreshCw, ShieldAlert, Sparkles } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { devices as initialDevices } from "@/lib/mock-data";
import { greenhouseApi } from "@/lib/greenhouse-api";
import type { DeviceCommandState } from "@/types/greenhouse";

const deviceIcons = { pump: Droplets, fan: Fan, light: Lightbulb, mist: Sparkles };

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
      <PageTitle eyebrow="4 devices · all connected" title="Device Control" subtitle="Control equipment safely, review schedules, and understand every automation rule." actions={<><button className="button danger-button" onClick={() => setConfirmStop(true)}><AlertOctagon size={17} /> Emergency stop</button><button className="button primary">+ Add device</button></>} />
      <section className="automation-banner">
        <div className="automation-icon"><Power size={24} /></div><div><span className="section-kicker">OPERATING MODE</span><h3>{autoMode ? "Automatic control is active" : "Manual control is active"}</h3><p>{autoMode ? "Rules are controlling irrigation, ventilation, and humidity targets." : "You can now control each device directly."}</p></div>
        <label className="mode-switch"><input type="checkbox" checked={autoMode} onChange={(event) => setAutoMode(event.target.checked)} /><span /><strong>{autoMode ? "AUTO" : "MANUAL"}</strong></label>
      </section>

      <section className="toolbar-card device-toolbar"><div className="filter-tabs">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><span><i className="live-dot" /> Device gateway connected</span></section>
      <section className="device-grid">
        {visibleDevices.map((device) => {
          const Icon = deviceIcons[device.icon]; const pending = pendingId === device.id; const commandState = commandStates[device.id];
          return <article className={`device-card panel ${device.status === "on" ? "device-on" : ""}`} key={device.id}>
            <div className="device-card-top"><span className="device-icon"><Icon size={23} /></span><span className={`device-state ${pending ? "pending" : commandState === "failed" ? "offline" : device.status}`}><i />{pending ? "Sending" : commandState === "failed" ? "command failed" : device.status}</span></div>
            <div className="device-name"><small>{device.id} · {device.category}</small><h3>{device.name}</h3></div>
            <div className="device-control-row"><div><small>POWER</small><strong>{pending ? "Sending command…" : device.status === "on" ? "Running" : "Stopped"}</strong></div><button className={`toggle-button ${device.status === "on" ? "on" : ""}`} disabled={autoMode || pending} onClick={() => toggleDevice(device.id)} aria-label={`Turn ${device.name} ${device.status === "on" ? "off" : "on"}`} aria-pressed={device.status === "on"}>{pending ? <RefreshCw className="spin" size={16} /> : <i />}</button></div>
            {autoMode && <p className="auto-explain">Controlled automatically. Switch to Manual to override.</p>}
            <div className="device-details"><span><CalendarClock size={15} /><span><small>SCHEDULE / RULE</small><strong>{device.schedule}</strong></span></span><button className="icon-button" aria-label={`Open ${device.name} details`}><ChevronRight size={18} /></button></div>
            <footer>{device.lastAction}</footer>
          </article>;
        })}
      </section>
      <section className="schedule-panel panel"><div><span className="summary-icon"><CalendarClock size={21} /></span><div><span className="section-kicker">UPCOMING AUTOMATION</span><h3>Next scheduled actions</h3></div></div><div className="schedule-list"><span><strong>10:30</strong><small>Irrigate Zone B · 3 min</small></span><span><strong>15:00</strong><small>Ventilation check</small></span><span><strong>18:00</strong><small>Grow lights on</small></span></div><button className="button secondary">Manage schedule</button></section>

      {toast && <div className="toast-message" role="status"><span className="status-orb"><i /></span>{toast}</div>}
      {confirmStop && <div className="modal-backdrop" onMouseDown={() => !emergencyPending && setConfirmStop(false)}><div className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="stop-title" onMouseDown={(event) => event.stopPropagation()}><span className="danger-icon"><ShieldAlert size={28} /></span><h2 id="stop-title">Request emergency stop?</h2><p>The gateway must acknowledge this command before the dashboard reports that devices are off.</p><div><button className="button secondary" disabled={emergencyPending} onClick={() => setConfirmStop(false)}>Cancel</button><button className="button danger-button" disabled={emergencyPending} onClick={emergencyStop}>{emergencyPending ? "Requesting…" : "Request emergency stop"}</button></div></div></div>}
    </div>
  );
}
