"use client";

import { useState } from "react";
import { Bot, Camera, CheckCircle2, ChevronDown, CircleAlert, Expand, Leaf, Play, RefreshCw, ScanLine, ShieldCheck, Upload } from "lucide-react";
import { PageTitle } from "@/components/ui/page-title";
import { greenhouseApi } from "@/lib/greenhouse-api";

export function AiDetectionView() {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);

  const runDetection = async () => {
    if (processing) return;
    setProcessing(true); setCompleted(false); setProgress(15);
    const timer = window.setInterval(() => setProgress((value) => Math.min(value + 16, 88)), 180);
    await greenhouseApi.runDetection();
    window.clearInterval(timer); setProgress(100); setProcessing(false); setCompleted(true);
  };

  return (
    <div className="page-stack ai-page">
      <PageTitle eyebrow="Camera 01 · Live" title="AI Plant Detection" subtitle="Inspect camera imagery and turn model output into a practical next action." actions={<><button className="button secondary"><Upload size={17} /> Upload image</button><button className="button primary" onClick={runDetection} disabled={processing}>{processing ? <RefreshCw className="spin" size={17} /> : <ScanLine size={17} />}{processing ? "Analyzing…" : "Run detection"}</button></>} />
      <div className="ai-controls"><button><span><small>SELECTED PLANT</small><strong>Tomato 03</strong></span><ChevronDown size={16} /></button><button><span><small>CAMERA SOURCE</small><strong>CAM-03 · Zone B</strong></span><ChevronDown size={16} /></button><span className="status-pill healthy"><i className="live-dot" /> Live stream</span></div>
      <section className="ai-layout">
        <article className="camera-panel panel">
          <div className="camera-toolbar"><span><i className="live-dot" /> LIVE · 09:42:18</span><button className="icon-button" aria-label="Fullscreen"><Expand size={18} /></button></div>
          <div className="camera-scene">
            <div className="camera-grid" />
            <div className="scan-beam" />
            <div className="camera-plant"><Leaf size={150} strokeWidth={1.2} /></div>
            <div className="detection-box"><span>Possible leaf spot · 82%</span></div>
            <div className="camera-metadata"><span>1920 × 1080</span><span>Raspberry Pi Camera</span></div>
          </div>
        </article>

        <article className="detection-panel panel">
          <div className="panel-heading"><div><span className="section-kicker">LATEST RESULT</span><h3>AI analysis</h3></div><span className={`model-status ${processing ? "processing" : ""}`}><Bot size={15} />{processing ? "Processing" : "Model v1.4"}</span></div>
          {processing ? <div className="processing-state"><div className="ai-loader"><Bot size={34} /></div><h3>Analyzing plant image</h3><p>Checking color, texture, and visible leaf patterns…</p><div className="progress-track"><i style={{ width: `${progress}%` }} /></div><span>{progress}% complete</span></div> : <>
            <div className="classification warning"><span><CircleAlert size={23} /></span><div><small>HEALTH CLASSIFICATION</small><h2>{completed ? "Warning confirmed" : "Warning"}</h2><p>Manual inspection recommended</p></div></div>
            <div className="confidence-block"><div><span>Model confidence</span><strong>82%</strong></div><div className="confidence-track"><i style={{ width: "82%" }} /></div><small>Based on the current image and model v1.4</small></div>
            <div className="result-facts"><span><small>Detected condition</small><strong>Possible early leaf spot</strong></span><span><small>Severity</small><strong className="warning-text">Low</strong></span><span><small>Affected area</small><strong>~12% of visible leaf</strong></span></div>
            <div className="recommendation"><span><ShieldCheck size={19} /></span><div><strong>Recommended action</strong><p>Inspect the lower leaves, reduce leaf wetness, and capture another image in 24 hours.</p></div></div>
            <button className="button primary full-button" onClick={runDetection}><Play size={16} /> Run another detection</button>
            <p className="ai-disclaimer">AI provides decision support. Confirm important findings manually before treatment.</p>
          </>}
        </article>
      </section>

      <section className="history-section"><div className="section-title-row"><div><span className="section-kicker">RECENT ACTIVITY</span><h3>Detection history</h3></div><button className="text-button no-margin">View all results</button></div><div className="history-grid">{["Healthy", "Healthy", "Warning", "Healthy"].map((result, index) => <article key={`${result}-${index}`}><div className="history-thumb"><Leaf size={32} /></div><span className={`health-badge ${result === "Healthy" ? "healthy" : "warning"}`}><i />{result}</span><strong>Tomato 0{index + 1}</strong><small>{98 - index * 4}% confidence · {index + 1}h ago</small></article>)}</div></section>
    </div>
  );
}
