import React from "react";
import { Link } from "react-router-dom";
import OfflineBanner from "../components/OfflineBanner.jsx";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <OfflineBanner />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-10">
        <div>
          <div className="text-pulse-teal text-sm font-semibold tracking-[0.3em] uppercase mb-3">
            FIFA World Cup 2026
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
            Stadium<span className="text-pulse-teal">Pulse</span>
          </h1>
          <p className="text-slate-400 mt-4 max-w-md mx-auto">
            GenAI-powered stadium operations &amp; fan concierge, live for match day.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg">
          <Link
            to="/fan"
            className="glass-card flex-1 p-6 hover:border-pulse-teal/60 transition-colors group text-left"
          >
            <div className="text-3xl mb-2">📱</div>
            <div className="font-bold text-lg group-hover:text-pulse-teal transition-colors">Fan Companion</div>
            <div className="text-sm text-slate-400 mt-1">Concierge chat, seat routing, accessibility help</div>
          </Link>
          <Link
            to="/ops"
            className="glass-card flex-1 p-6 hover:border-pulse-teal/60 transition-colors group text-left"
          >
            <div className="text-3xl mb-2">🖥️</div>
            <div className="font-bold text-lg group-hover:text-pulse-teal transition-colors">Ops Command Center</div>
            <div className="text-sm text-slate-400 mt-1">Heatmaps, incidents, AI sitrep, sustainability</div>
          </Link>
        </div>
      </div>
      <div className="text-center text-xs text-slate-600 pb-6">StadiumPulse — hackathon build, simulated data</div>
    </div>
  );
}
