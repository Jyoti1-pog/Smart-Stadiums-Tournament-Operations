import React, { useState } from "react";
import { useI18n } from "../context/I18nContext.jsx";
import { api } from "../lib/api.js";

const GATES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const STANDS = ["A", "B", "C", "D"];

export default function SeatFinder({ onRoute, accessibilityMode }) {
  const { t } = useI18n();
  const [gate, setGate] = useState("A");
  const [stand, setStand] = useState("B");
  const [block, setBlock] = useState("214");
  const [row, setRow] = useState("12");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const fromGate = `gate-${gate}`;
      const standLabel = `Stand ${stand}`;
      const result = await api.route(fromGate, standLabel);
      onRoute({ fromGate, standLabel, block, row, path: result.path, cost: result.cost });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card p-4 flex flex-col gap-3">
      <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">{t("seatFinderTitle")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          {t("seatFinderGate")}
          <select value={gate} onChange={(e) => setGate(e.target.value)} className="bg-pulse-panel2 border border-pulse-border rounded-lg px-2 py-2 text-sm">
            {GATES.map((g) => (
              <option key={g} value={g}>
                Gate {g}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          {t("seatFinderStand")}
          <select value={stand} onChange={(e) => setStand(e.target.value)} className="bg-pulse-panel2 border border-pulse-border rounded-lg px-2 py-2 text-sm">
            {STANDS.map((s) => (
              <option key={s} value={s}>
                Stand {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          {t("seatFinderBlock")}
          <input value={block} onChange={(e) => setBlock(e.target.value)} className="bg-pulse-panel2 border border-pulse-border rounded-lg px-2 py-2 text-sm" />
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">
          {t("seatFinderRow")}
          <input value={row} onChange={(e) => setRow(e.target.value)} className="bg-pulse-panel2 border border-pulse-border rounded-lg px-2 py-2 text-sm" />
        </label>
      </div>
      {accessibilityMode && <div className="text-xs text-pulse-teal">Step-free, low-sensory route preferred.</div>}
      {error && <div className="text-xs text-pulse-red">{error}</div>}
      <button type="submit" disabled={loading} className="btn-primary text-sm">
        {loading ? "…" : t("seatFinderGo")}
      </button>
    </form>
  );
}
