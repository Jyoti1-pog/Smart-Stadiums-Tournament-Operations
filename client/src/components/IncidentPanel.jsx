import React, { useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

const SEVERITY_STYLE = {
  P1: "bg-pulse-red/20 text-pulse-red border-pulse-red/40",
  P2: "bg-pulse-amber/20 text-pulse-amber border-pulse-amber/40",
  P3: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  P4: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const TYPE_ICON = {
  medical: "🚑",
  "lost-child": "🧒",
  "gate-scanner-failure": "🛂",
  "queue-spike": "📈",
  "weather-change": "🌦️",
};

function IncidentCard({ incident, onAction, onTriage, busy }) {
  const triage = incident.triage;
  return (
    <div className="glass-card p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg leading-none">{TYPE_ICON[incident.type] || "⚠️"}</span>
          <div>
            <div className="font-semibold text-sm">{incident.label}</div>
            <div className="text-xs text-slate-400">{incident.zoneLabel}</div>
          </div>
        </div>
        {triage?.severity && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SEVERITY_STYLE[triage.severity]}`}>
            {triage.severity}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400">{incident.description}</p>

      {triage && (
        <div className="text-xs bg-black/30 rounded-lg p-2 space-y-1 border border-pulse-border">
          <div>
            <span className="text-slate-500">Dispatch: </span>
            <span className="text-slate-200 font-medium">{triage.dispatch_team}</span>
          </div>
          <ul className="list-disc list-inside text-slate-300 space-y-0.5">
            {triage.actions?.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          <div className="pt-1 border-t border-pulse-border/60 mt-1 space-y-0.5">
            <div>
              <span className="text-slate-500">PA (EN): </span>
              {triage.pa_announcement?.en}
            </div>
            <div>
              <span className="text-slate-500">PA (ES): </span>
              {triage.pa_announcement?.es}
            </div>
            <div>
              <span className="text-slate-500">PA (FR): </span>
              {triage.pa_announcement?.fr}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {!triage && (
          <button className="btn-secondary text-xs py-1 px-2" disabled={busy} onClick={() => onTriage(incident.id)}>
            {busy ? "Triaging…" : "AI Triage"}
          </button>
        )}
        {incident.status === "pending" && (
          <>
            <button className="btn-primary text-xs py-1 px-2" onClick={() => onAction(incident.id, "accept")}>
              Accept
            </button>
            <button className="btn-secondary text-xs py-1 px-2" onClick={() => onAction(incident.id, "dismiss")}>
              Dismiss
            </button>
          </>
        )}
        {incident.status === "accepted" && <span className="text-xs text-pulse-teal font-medium py-1">Response in progress</span>}
      </div>
    </div>
  );
}

export default function IncidentPanel({ incidents }) {
  const [busyId, setBusyId] = useState(null);
  const [localIncidents, setLocalIncidents] = useState({});
  const { showToast } = useToast();

  const active = incidents.filter((i) => i.status === "pending" || i.status === "accepted");
  const merged = active.map((i) => localIncidents[i.id] || i);

  async function handleTriage(id) {
    setBusyId(id);
    try {
      const triage = await api.incidentTriage(id);
      setLocalIncidents((prev) => ({ ...prev, [id]: { ...(prev[id] || active.find((a) => a.id === id)), triage, severity: triage.severity } }));
    } catch (err) {
      showToast(`Triage failed: ${err.message}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAction(id, action) {
    try {
      await api.incidentAction(id, action);
    } catch (err) {
      showToast(`Action failed: ${err.message}`);
    }
  }

  return (
    <div className="glass-card p-4 flex flex-col gap-3 min-h-0">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">Active Incidents</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-pulse-panel2 border border-pulse-border">{merged.length}</span>
      </div>
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[420px] pr-1">
        {merged.length === 0 && <div className="text-xs text-slate-500 py-4 text-center">No active incidents.</div>}
        {merged.map((inc) => (
          <IncidentCard key={inc.id} incident={inc} onAction={handleAction} onTriage={handleTriage} busy={busyId === inc.id} />
        ))}
      </div>
    </div>
  );
}
