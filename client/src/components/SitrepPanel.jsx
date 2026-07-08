import React, { useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function SitrepPanel() {
  const [sitrep, setSitrep] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function generate() {
    setLoading(true);
    try {
      const result = await api.sitrep();
      setSitrep(result);
    } catch (err) {
      showToast(`Situation report failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">AI Situation Report</h2>
        <button className="btn-primary text-xs py-1.5 px-3" onClick={generate} disabled={loading}>
          {loading ? "Generating…" : sitrep ? "Regenerate" : "Generate"}
        </button>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-pulse-panel2 rounded w-full" />
          <div className="h-3 bg-pulse-panel2 rounded w-5/6" />
          <div className="h-3 bg-pulse-panel2 rounded w-2/3" />
        </div>
      )}

      {!loading && sitrep && (
        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs font-semibold text-pulse-red uppercase tracking-wide mb-1">Risks</div>
            <p className="text-slate-300">{sitrep.risks}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-pulse-amber uppercase tracking-wide mb-1">Actions</div>
            <p className="text-slate-300">{sitrep.actions}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-pulse-teal uppercase tracking-wide mb-1">Outlook</div>
            <p className="text-slate-300">{sitrep.outlook}</p>
          </div>
        </div>
      )}

      {!loading && !sitrep && <div className="text-xs text-slate-500">Generate a fresh briefing from live conditions.</div>}
    </div>
  );
}
