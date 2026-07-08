import React, { useMemo, useState } from "react";

const W = 1000;
const H = 220;
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 34;

const PHASE_LABEL = {
  ingress: "Ingress",
  "first-half": "1st Half",
  halftime: "Halftime",
  "second-half": "2nd Half",
  egress: "Egress",
};

function formatClock(simClock) {
  if (simClock < 0) return `T${simClock}′`;
  return `T+${simClock}′`;
}

export default function TimelineChart({ history = [] }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const { points, xForIdx, minT, maxT, phaseBands } = useMemo(() => {
    if (!history.length) return { points: "", xForIdx: () => 0, minT: 0, maxT: 1, phaseBands: [] };
    const minT = history[0].simClock;
    const maxT = history[history.length - 1].simClock;
    const span = Math.max(maxT - minT, 1);
    const xForIdx = (i) => PAD_L + ((history[i].simClock - minT) / span) * (W - PAD_L - PAD_R);
    const yForVal = (v) => PAD_T + (1 - v) * (H - PAD_T - PAD_B);
    const points = history.map((h, i) => `${xForIdx(i)},${yForVal(h.avgDensity)}`).join(" ");

    const bands = [];
    let curPhase = null;
    let start = 0;
    history.forEach((h, i) => {
      if (h.phase !== curPhase) {
        if (curPhase !== null) bands.push({ phase: curPhase, x1: xForIdx(start), x2: xForIdx(i) });
        curPhase = h.phase;
        start = i;
      }
    });
    bands.push({ phase: curPhase, x1: xForIdx(start), x2: xForIdx(history.length - 1) });
    return { points, xForIdx, minT, maxT, phaseBands: bands };
  }, [history]);

  if (!history.length) {
    return <div className="text-slate-500 text-sm p-6">Collecting timeline data…</div>;
  }

  const yForVal = (v) => PAD_T + (1 - v) * (H - PAD_T - PAD_B);
  const areaPoints = `${PAD_L},${H - PAD_B} ${points} ${W - PAD_R},${H - PAD_B}`;

  function handleMove(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let bestDist = Infinity;
    history.forEach((_, i) => {
      const d = Math.abs(xForIdx(i) - x);
      if (d < bestDist) {
        bestDist = d;
        closest = i;
      }
    });
    setHoverIdx(closest);
  }

  const hovered = hoverIdx != null ? history[hoverIdx] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Crowd density timeline across match phases"
      >
        {/* Phase bands */}
        {phaseBands.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x1}
              y={PAD_T}
              width={Math.max(b.x2 - b.x1, 0)}
              height={H - PAD_T - PAD_B}
              fill={i % 2 === 0 ? "#ffffff03" : "#ffffff00"}
            />
            <text x={(b.x1 + b.x2) / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="#898781">
              {PHASE_LABEL[b.phase] || b.phase}
            </text>
            {i > 0 && <line x1={b.x1} x2={b.x1} y1={PAD_T} y2={H - PAD_B} stroke="#2c2c2a" strokeWidth="1" />}
          </g>
        ))}

        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yForVal(g)} y2={yForVal(g)} stroke="#2c2c2a" strokeWidth="1" />
            <text x={PAD_L - 8} y={yForVal(g) + 4} textAnchor="end" fontSize="11" fill="#898781">
              {Math.round(g * 100)}%
            </text>
          </g>
        ))}

        {/* Area + line */}
        <polygon points={areaPoints} fill="#00e6b8" opacity="0.1" />
        <polyline points={points} fill="none" stroke="#00e6b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover crosshair */}
        {hovered && (
          <g>
            <line
              x1={xForIdx(hoverIdx)}
              x2={xForIdx(hoverIdx)}
              y1={PAD_T}
              y2={H - PAD_B}
              stroke="#c3c2b7"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <circle cx={xForIdx(hoverIdx)} cy={yForVal(hovered.avgDensity)} r="5" fill="#00e6b8" stroke="#07090c" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="absolute glass-card px-3 py-1.5 text-xs pointer-events-none -translate-x-1/2"
          style={{ left: `${(xForIdx(hoverIdx) / W) * 100}%`, top: 4 }}
        >
          <span className="text-slate-400">{formatClock(hovered.simClock)}</span>{" "}
          <span className="font-semibold text-pulse-teal">{Math.round(hovered.avgDensity * 100)}%</span>
        </div>
      )}
    </div>
  );
}
