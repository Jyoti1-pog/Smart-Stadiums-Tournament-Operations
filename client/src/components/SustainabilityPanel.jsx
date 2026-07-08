import React, { useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

export default function SustainabilityPanel({ sustainability }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function optimize() {
    setLoading(true);
    try {
      const r = await api.sustainabilityOptimize();
      setResult(r);
    } catch (err) {
      showToast(`Optimization failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">Sustainability</h2>
        <button className="btn-primary text-xs py-1.5 px-3" onClick={optimize} disabled={loading}>
          {loading ? "Thinking…" : "AI Optimize"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-tile p-3">
          <div className="text-xs text-slate-500">Energy Use</div>
          <div className="text-xl font-bold">{sustainability?.totalEnergyKwh ?? "—"} kWh</div>
        </div>
        <div className="stat-tile p-3">
          <div className="text-xs text-slate-500">Water Use</div>
          <div className="text-xl font-bold">{sustainability?.totalWaterL ?? "—"} L</div>
        </div>
      </div>

      {loading && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-pulse-panel2 rounded w-full" />
          <div className="h-3 bg-pulse-panel2 rounded w-4/5" />
        </div>
      )}

      {!loading && result && (
        <div className="space-y-2 text-sm">
          <p className="text-slate-400 text-xs">{result.summary}</p>
          {result.actions?.map((a, i) => (
            <div key={i} className="bg-black/30 border border-pulse-border rounded-lg p-2">
              <div className="font-semibold text-xs text-pulse-teal">{a.title}</div>
              <div className="text-xs text-slate-300 mt-0.5">{a.detail}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{a.estimated_savings}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
