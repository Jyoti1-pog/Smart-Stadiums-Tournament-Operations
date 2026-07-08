import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSim } from "../context/SimContext.jsx";
import { useI18n } from "../context/I18nContext.jsx";
import { api } from "../lib/api.js";
import OfflineBanner from "../components/OfflineBanner.jsx";
import LanguageSwitcher from "../components/LanguageSwitcher.jsx";
import AccessibilityToggle from "../components/AccessibilityToggle.jsx";
import StadiumMap from "../components/StadiumMap.jsx";
import SeatFinder from "../components/SeatFinder.jsx";
import ChatPanel from "../components/ChatPanel.jsx";

export default function FanApp() {
  const { state, map } = useSim();
  const { t } = useI18n();
  const [tab, setTab] = useState("chat");
  const [accessibilityMode, setAccessibilityMode] = useState(false);
  const [route, setRoute] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  // Toggle on the document root (not a local wrapper) so rem-based Tailwind
  // sizes scale uniformly; also ensures it's cleared if the fan navigates
  // away while the mode was on.
  useEffect(() => {
    document.documentElement.classList.toggle("a11y-large", accessibilityMode);
    return () => document.documentElement.classList.remove("a11y-large");
  }, [accessibilityMode]);

  // Recompute the route whenever the sim ticks so congestion changes reroute
  // the fan live, with a toast when the path actually changes.
  useEffect(() => {
    if (!route || !state) return;
    let cancelled = false;
    api
      .route(route.fromGate, route.standLabel)
      .then((result) => {
        if (cancelled) return;
        const changed = JSON.stringify(result.path) !== JSON.stringify(route.path);
        setRoute((prev) => (prev ? { ...prev, path: result.path, cost: result.cost } : prev));
        if (changed) {
          setToast(t("reroutedToast"));
          clearTimeout(toastTimer.current);
          toastTimer.current = setTimeout(() => setToast(null), 4000);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.tickCount]);

  return (
    <div className="min-h-screen max-w-md mx-auto flex flex-col">
      <OfflineBanner />
      <header className="flex items-center justify-between px-4 py-3 border-b border-pulse-border sticky top-0 bg-pulse-bg/95 backdrop-blur z-20">
        <Link to="/" className="font-extrabold text-lg tracking-tight">
          Stadium<span className="text-pulse-teal">Pulse</span>
        </Link>
        <div className="flex items-center gap-2">
          <AccessibilityToggle enabled={accessibilityMode} onToggle={setAccessibilityMode} />
          <LanguageSwitcher />
        </div>
      </header>

      <div className="flex border-b border-pulse-border">
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2.5 text-sm font-semibold ${tab === "chat" ? "text-pulse-teal border-b-2 border-pulse-teal" : "text-slate-500"}`}
        >
          {t("tabChat")}
        </button>
        <button
          onClick={() => setTab("map")}
          className={`flex-1 py-2.5 text-sm font-semibold ${tab === "map" ? "text-pulse-teal border-b-2 border-pulse-teal" : "text-slate-500"}`}
        >
          {t("tabMap")}
        </button>
      </div>

      <div className="flex-1 flex flex-col px-4 py-3 min-h-0">
        {tab === "chat" && <ChatPanel accessibilityMode={accessibilityMode} />}

        {tab === "map" && (
          <div className="flex flex-col gap-4">
            <SeatFinder onRoute={setRoute} accessibilityMode={accessibilityMode} />
            {route && (
              <div className="text-sm glass-card px-3 py-2 flex items-center justify-between">
                <span>
                  {route.standLabel}, Block {route.block}, Row {route.row}
                </span>
                <span className="font-semibold text-pulse-teal">{Math.round(route.cost / 60) || 1} {t("walkTime")}</span>
              </div>
            )}
            <StadiumMap
              map={map}
              zones={state?.zones || {}}
              highlightPath={route?.path}
              lowSensory={accessibilityMode}
              className="aspect-square"
            />
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 glass-card px-4 py-2.5 text-sm shadow-glow border-pulse-teal/40 z-30">
          {toast}
        </div>
      )}
    </div>
  );
}
