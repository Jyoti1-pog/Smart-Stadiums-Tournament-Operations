import React, { createContext, useContext, useEffect, useRef, useState } from "react";

const SimContext = createContext(null);

export function SimProvider({ children }) {
  const [state, setState] = useState(null);
  const [map, setMap] = useState(null);
  const [connected, setConnected] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    fetch("/api/map")
      .then((r) => r.json())
      .then(setMap)
      .catch(() => setMap(null));
  }, []);

  useEffect(() => {
    let es;
    let cancelled = false;

    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(() => {
        fetch("/api/state")
          .then((r) => r.json())
          .then((s) => !cancelled && setState(s))
          .catch(() => {});
      }, 3000);
    }

    try {
      es = new EventSource("/api/stream");
      es.onopen = () => setConnected(true);
      es.onmessage = (evt) => {
        try {
          setState(JSON.parse(evt.data));
        } catch {
          /* ignore malformed frame */
        }
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      es?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return <SimContext.Provider value={{ state, map, connected }}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within SimProvider");
  return ctx;
}
