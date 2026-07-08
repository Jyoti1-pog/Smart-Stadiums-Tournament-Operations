import React from "react";
import { densityColor } from "../lib/density.js";

export default function QueueList({ zones }) {
  const items = Object.values(zones)
    .filter((z) => z.type === "gate")
    .sort((a, b) => b.queueMinutes - a.queueMinutes)
    .slice(0, 8);
  const max = Math.max(...items.map((i) => i.queueMinutes), 1);

  return (
    <div className="glass-card p-4">
      <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300 mb-3">Gate Queue Times</h2>
      <div className="space-y-2">
        {items.map((z) => (
          <div key={z.id} className="flex items-center gap-3">
            <div className="w-16 text-xs text-slate-400 shrink-0">{z.label}</div>
            <div className="flex-1 h-3 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${(z.queueMinutes / max) * 100}%`, background: densityColor(z.density) }}
              />
            </div>
            <div className="w-14 text-xs text-right font-semibold tabular-nums">{z.queueMinutes} min</div>
          </div>
        ))}
      </div>
    </div>
  );
}
