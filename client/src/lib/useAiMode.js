import { useEffect, useState } from "react";
import { api } from "./api.js";

export function useAiMode() {
  const [mode, setMode] = useState(null); // 'live' | 'offline' | null (loading)
  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((h) => !cancelled && setMode(h.aiMode))
      .catch(() => !cancelled && setMode("offline"));
    return () => {
      cancelled = true;
    };
  }, []);
  return mode;
}
