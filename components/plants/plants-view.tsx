"use client";

import { useMemo, useState } from "react";
import { Camera, ChevronRight, Filter, Leaf, Plus, Search, SlidersHorizontal, Sprout } from "lucide-react";
import { plants } from "@/lib/mock-data";
import type { PlantHealth } from "@/types/greenhouse";
import { PageTitle } from "@/components/ui/page-title";

const filters: Array<{ id: "all" | PlantHealth; label: string }> = [
  { id: "all", label: "All plants" },
  { id: "healthy", label: "Healthy" },
  { id: "warning", label: "Warning" },
  { id: "unhealthy", label: "Unhealthy" },
];

export function PlantsView({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [filter, setFilter] = useState<"all" | PlantHealth>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => plants.filter((plant) => (filter === "all" || plant.health === filter) && plant.name.toLowerCase().includes(query.toLowerCase())), [filter, query]);

  return (
    <div className="page-stack">
      <PageTitle eyebrow="4 plants · synced now" title="Plant Monitoring" subtitle="Review plant health, sensor context, and the latest AI observations." actions={<><button className="button secondary" onClick={() => onNavigate("ai")}><Camera size={17} /> Scan plant</button><button className="button primary"><Plus size={17} /> Add plant</button></>} />
      <section className="toolbar-card">
        <div className="filter-tabs" aria-label="Plant health filters">
          {filters.map((item) => <button key={item.id} className={filter === item.id ? "active" : ""} onClick={() => setFilter(item.id)}>{item.label}{item.id !== "all" && <span>{plants.filter((p) => p.health === item.id).length}</span>}</button>)}
        </div>
        <label className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plant…" aria-label="Search plants" /></label>
        <button className="icon-button" aria-label="More filters"><SlidersHorizontal size={18} /></button>
      </section>

      <section className="plant-summary-strip">
        <div><span className="summary-ring">88<small>%</small></span><span><strong>Overall health</strong><small>Stable since yesterday</small></span></div>
        <div><strong>3</strong><span>Healthy plants</span></div>
        <div><strong>1</strong><span>Needs inspection</span></div>
        <div><strong>09:00</strong><span>Last AI scan</span></div>
      </section>

      <section className="plant-grid" aria-live="polite">
        {filtered.map((plant, index) => (
          <article className="plant-card" key={plant.id}>
            <div className={`plant-visual plant-${index + 1}`}>
              <span className={`health-badge ${plant.health}`}><i />{plant.health}</span>
              <div className="leaf-halo"><Leaf size={62} /></div>
              <span className="camera-tag"><Camera size={13} /> CAM-{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="plant-card-body">
              <div className="plant-card-title"><div><small>{plant.id} · {plant.zone}</small><h3>{plant.name}</h3></div><button className="icon-button" aria-label={`Open ${plant.name}`}><ChevronRight size={18} /></button></div>
              <div className="plant-stats"><span><small>AI confidence</small><strong>{plant.confidence}%</strong></span><span><small>Soil moisture</small><strong>{plant.soilMoisture}%</strong></span><span><small>Plant age</small><strong>{plant.ageDays} days</strong></span></div>
              <div className="plant-footer"><span><Sprout size={14} />{plant.variety}</span><time>Updated {plant.updated}</time></div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && <div className="empty-card"><Filter size={28} /><h3>No plants found</h3><p>Try another health filter or clear your search.</p><button className="button secondary" onClick={() => { setFilter("all"); setQuery(""); }}>Clear filters</button></div>}
      </section>
    </div>
  );
}
