import React, { useMemo, useState } from "react";
import { densityColor, densityStatus, STATUS_LABELS } from "../lib/density.js";

const CX = 500;
const CY = 400;
const DEG = Math.PI / 180;

function polar(rx, ry, angleDeg) {
  const a = angleDeg * DEG;
  return { x: CX + rx * Math.cos(a), y: CY + ry * Math.sin(a) };
}

// Annular sector (a "slice of donut") between two elliptical radii, spanning
// an angular range — used for the stand bowl quadrants and concourse tiles.
function annularSectorPath(rxIn, ryIn, rxOut, ryOut, aStart, aEnd) {
  const p1 = polar(rxOut, ryOut, aStart);
  const p2 = polar(rxOut, ryOut, aEnd);
  const p3 = polar(rxIn, ryIn, aEnd);
  const p4 = polar(rxIn, ryIn, aStart);
  const large = aEnd - aStart > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${rxOut} ${ryOut} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${rxIn} ${ryIn} 0 ${large} 0 ${p4.x} ${p4.y}`,
    "Z",
  ].join(" ");
}

const FACILITY_ICON = { concession: "🍔", restroom: "🚻", medical: "➕" };

const STAND_ANGLES = { "stand-N": -90, "stand-E": 0, "stand-S": 90, "stand-W": 180 };

export default function StadiumMap({
  map,
  zones = {},
  highlightPath = null,
  onZoneClick = null,
  showFacilities = true,
  lowSensory = false,
  className = "",
}) {
  const [hover, setHover] = useState(null);
  const nodesById = useMemo(() => {
    if (!map) return {};
    return Object.fromEntries(map.graph.nodes.map((n) => [n.id, n]));
  }, [map]);

  if (!map) {
    return (
      <div className={`flex items-center justify-center text-slate-500 ${className}`}>
        Loading stadium map…
      </div>
    );
  }

  const gates = map.graph.nodes.filter((n) => n.type === "gate");
  const transit = map.graph.nodes.filter((n) => n.type === "transit");

  const pathPoints =
    highlightPath?.map((id) => nodesById[id]).filter(Boolean).map((n) => `${n.x},${n.y}`) ?? [];

  function zoneFill(zoneId) {
    const z = zones[zoneId];
    if (!z) return "#1a2029";
    return densityColor(z.density);
  }

  function tooltipFor(zoneId) {
    const z = zones[zoneId];
    const node = nodesById[zoneId];
    if (!z || !node) return null;
    return {
      label: node.label,
      density: z.density,
      queueMinutes: z.queueMinutes,
    };
  }

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 1000 800" className="w-full h-full" role="img" aria-label="Live stadium map with crowd density">
        <defs>
          <filter id="pulse-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer bowl outline */}
        <rect x="40" y="30" width="920" height="740" rx="200" fill="none" stroke="#1c232c" strokeWidth="2" />

        {/* Concourse ring — 12 tiles, one per concourse zone */}
        {Array.from({ length: 12 }).map((_, i) => {
          const id = `concourse-${i + 1}`;
          const aCenter = -90 + i * 30;
          const gap = 3;
          const status = zones[id] ? densityStatus(zones[id].density) : "good";
          return (
            <path
              key={id}
              d={annularSectorPath(268, 178, 340, 262, aCenter - 15 + gap, aCenter + 15 - gap)}
              fill={zoneFill(id)}
              opacity={hover === id ? 1 : 0.85}
              style={{ transition: "fill 1.2s ease, opacity 0.2s ease" }}
              stroke="#07090c"
              strokeWidth="1.5"
              className="cursor-pointer"
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onZoneClick?.(id)}
            >
              <title>
                {nodesById[id]?.label}: {zones[id] ? `${Math.round(zones[id].density * 100)}% · ${STATUS_LABELS[status]} · ${zones[id].queueMinutes}min queue` : "no data"}
              </title>
            </path>
          );
        })}

        {/* Stand bowl quadrants */}
        {Object.entries(STAND_ANGLES).map(([id, angle]) => {
          const status = zones[id] ? densityStatus(zones[id].density) : "good";
          return (
            <path
              key={id}
              d={annularSectorPath(262, 172, 258 + 8, 172 + 6, angle - 34, angle + 34)}
              fill={zoneFill(id)}
              opacity={hover === id ? 1 : 0.9}
              style={{ transition: "fill 1.2s ease" }}
              stroke="#07090c"
              strokeWidth="1"
              onMouseEnter={() => setHover(id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onZoneClick?.(id)}
              className="cursor-pointer"
            >
              <title>
                {nodesById[id]?.label}: {zones[id] ? `${Math.round(zones[id].density * 100)}% occupied · ${STATUS_LABELS[status]}` : "no data"}
              </title>
            </path>
          );
        })}
        {/* Larger visible stand seating bands (drawn thicker, actual look) */}
        {Object.entries(STAND_ANGLES).map(([id, angle]) => (
          <path
            key={`${id}-band`}
            d={annularSectorPath(268, 178, 336, 258, angle - 34, angle + 34)}
            fill={zoneFill(id)}
            opacity={0.55}
            style={{ transition: "fill 1.2s ease" }}
          />
        ))}

        {/* Field */}
        <ellipse cx={CX} cy={CY} rx="260" ry="170" fill="#0a2e20" stroke="#123d2c" strokeWidth="3" />
        <ellipse cx={CX} cy={CY} rx="230" ry="140" fill="none" stroke="#1d5c43" strokeWidth="1.5" />
        <line x1={CX} y1={CY - 140} x2={CX} y2={CY + 140} stroke="#1d5c43" strokeWidth="1.5" />
        <circle cx={CX} cy={CY} r="45" fill="none" stroke="#1d5c43" strokeWidth="1.5" />

        {/* Transit hubs */}
        {transit.map((t) => (
          <g key={t.id} onMouseEnter={() => setHover(t.id)} onMouseLeave={() => setHover(null)}>
            <line x1={t.x} y1={t.y} x2={nodesById[t.nearGate]?.x} y2={nodesById[t.nearGate]?.y} stroke="#2a3441" strokeWidth="2" strokeDasharray="4 4" />
            <rect x={t.x - 22} y={t.y - 14} width="44" height="28" rx="8" fill={zoneFill(t.id)} opacity="0.85" stroke="#07090c" />
            <text x={t.x} y={t.y + 4} textAnchor="middle" fontSize="14" fill="#000" fontWeight="700">
              {t.kind === "metro" ? "🚇" : "🅿️"}
            </text>
            <title>{t.label}</title>
          </g>
        ))}

        {/* Gates */}
        {gates.map((g) => {
          const letter = g.id.replace("gate-", "");
          const status = zones[g.id] ? densityStatus(zones[g.id].density) : "good";
          return (
            <g
              key={g.id}
              onMouseEnter={() => setHover(g.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onZoneClick?.(g.id)}
              className="cursor-pointer"
            >
              <circle cx={g.x} cy={g.y} r="20" fill={zoneFill(g.id)} stroke="#07090c" strokeWidth="2" style={{ transition: "fill 1.2s ease" }} />
              <text x={g.x} y={g.y + 6} textAnchor="middle" fontSize="16" fontWeight="800" fill="#05070a">
                {letter}
              </text>
              <title>
                Gate {letter}: {zones[g.id] ? `${zones[g.id].queueMinutes} min wait · ${STATUS_LABELS[status]}` : "no data"}
              </title>
            </g>
          );
        })}

        {/* Facilities */}
        {showFacilities &&
          !lowSensory &&
          map.facilities.map((f) => (
            <g key={f.id} opacity="0.9">
              <circle cx={f.x} cy={f.y} r="9" fill="#141a22" stroke="#2a3441" />
              <text x={f.x} y={f.y + 4} textAnchor="middle" fontSize="9">
                {FACILITY_ICON[f.type]}
              </text>
              <title>{f.label}</title>
            </g>
          ))}

        {/* Highlighted route */}
        {pathPoints.length > 1 && (
          <g filter="url(#pulse-glow)">
            <polyline
              points={pathPoints.join(" ")}
              fill="none"
              stroke="#00e6b8"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="2 14"
              className="animate-[dash_1.2s_linear_infinite]"
            />
            <polyline points={pathPoints.join(" ")} fill="none" stroke="#00e6b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
            {highlightPath && nodesById[highlightPath[0]] && (
              <circle cx={nodesById[highlightPath[0]].x} cy={nodesById[highlightPath[0]].y} r="9" fill="#00e6b8" />
            )}
            {highlightPath && nodesById[highlightPath[highlightPath.length - 1]] && (
              <circle
                cx={nodesById[highlightPath[highlightPath.length - 1]].x}
                cy={nodesById[highlightPath[highlightPath.length - 1]].y}
                r="9"
                fill="#00e6b8"
                stroke="#fff"
                strokeWidth="2"
              />
            )}
          </g>
        )}
      </svg>

      {hover && tooltipFor(hover) && (
        <div className="absolute left-2 bottom-2 glass-card px-3 py-2 text-xs pointer-events-none">
          <div className="font-semibold text-slate-100">{tooltipFor(hover).label}</div>
          <div className="text-slate-400">
            {Math.round(tooltipFor(hover).density * 100)}% density
            {tooltipFor(hover).queueMinutes != null ? ` · ${tooltipFor(hover).queueMinutes} min queue` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
