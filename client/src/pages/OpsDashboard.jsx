import React from "react";
import { Link } from "react-router-dom";
import { useSim } from "../context/SimContext.jsx";
import { useAiMode } from "../lib/useAiMode.js";
import StadiumMap from "../components/StadiumMap.jsx";
import TimelineChart from "../components/TimelineChart.jsx";
import IncidentPanel from "../components/IncidentPanel.jsx";
import SitrepPanel from "../components/SitrepPanel.jsx";
import SustainabilityPanel from "../components/SustainabilityPanel.jsx";
import QueueList from "../components/QueueList.jsx";
import { STATUS_COLORS, STATUS_LABELS } from "../lib/density.js";

const PHASE_LABEL = {
  ingress: "Ingress",
  "first-half": "First Half",
  halftime: "Halftime",
  "second-half": "Second Half",
  egress: "Egress",
};

const WEATHER_ICON = { clear: "☀️", rain: "🌧️", heat: "🔥" };

function formatClock(simClock) {
  const sign = simClock < 0 ? "-" : "+";
  const abs = Math.abs(simClock);
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return `T${sign}${h > 0 ? `${h}h ` : ""}${m}′`;
}

export default function OpsDashboard() {
  const { state, map, connected } = useSim();
  const aiMode = useAiMode();

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Connecting to stadium simulation…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-pulse-bg/90 backdrop-blur border-b border-pulse-border">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-extrabold text-lg tracking-tight">
              Stadium<span className="text-pulse-teal">Pulse</span>
            </Link>
            <span className="text-xs px-2 py-1 rounded-full bg-pulse-panel2 border border-pulse-border text-slate-400">
              Ops Command Center
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? "bg-pulse-teal live-dot" : "bg-slate-600"}`} />
              <span className="text-slate-400 text-xs">{connected ? "Live" : "Reconnecting"}</span>
            </div>
            <div className="font-semibold">{formatClock(state.simClock)}</div>
            <div className="pill-chip !cursor-default">{PHASE_LABEL[state.phase] || state.phase}</div>
            <div className="text-slate-400 text-xs">
              👥 {state.attendance.toLocaleString()} / {state.capacity.toLocaleString()}
            </div>
            <div className="text-slate-400 text-xs">
              {WEATHER_ICON[state.weather.condition]} {state.weather.tempC}°C
            </div>
            <div className={`text-xs px-2 py-1 rounded-full border ${aiMode === "live" ? "border-pulse-teal/40 text-pulse-teal" : "border-pulse-amber/40 text-pulse-amber"}`}>
              AI: {aiMode === "live" ? "Gemini Live" : aiMode === "offline" ? "Offline Demo" : "…"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 mt-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Main column */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">Live Crowd Heatmap</h2>
              <div className="flex items-center gap-3 text-xs">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[key] }} />
                    <span className="text-slate-400">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <StadiumMap map={map} zones={state.zones} className="aspect-[5/4] max-h-[560px]" />
          </div>

          <div className="glass-card p-4">
            <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300 mb-2">
              Density Timeline — Pre-match → Halftime → Post-match
            </h2>
            <TimelineChart history={state.history} />
          </div>

          <QueueList zones={state.zones} />
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6 min-w-0">
          <IncidentPanel incidents={state.incidents} />
          <SitrepPanel />
          <SustainabilityPanel sustainability={state.sustainability} />
        </div>
      </div>
    </div>
  );
}
