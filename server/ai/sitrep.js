import { structuredJSON } from "./gemini.js";
import { SITREP_SYSTEM_PROMPT } from "./prompts/sitrep.js";

const SITREP_SCHEMA = {
  type: "OBJECT",
  properties: {
    risks: { type: "STRING" },
    actions: { type: "STRING" },
    outlook: { type: "STRING" },
  },
  required: ["risks", "actions", "outlook"],
};

function fallbackSitrep(state) {
  const zones = Object.values(state.zones);
  const worst = [...zones].sort((a, b) => b.density - a.density).slice(0, 3);
  const activeIncidents = state.incidents.filter((i) => i.status === "pending");
  return {
    risks: `Highest congestion at ${worst.map((z) => `${z.label} (${Math.round(z.density * 100)}%)`).join(", ")}. ${
      activeIncidents.length
    } active incident(s) unresolved.`,
    actions: `Redeploy stewards to ${worst[0]?.label || "the busiest zone"} and monitor queue growth; address pending incidents before they compound congestion.`,
    outlook: `Expect congestion to ${
      state.phase === "egress" || state.phase === "ingress" ? "remain elevated" : "ease"
    } over the next 15-30 minutes given the current ${state.phase} phase.`,
    offline: true,
  };
}

export async function generateSitrep(state) {
  const fallback = fallbackSitrep(state);
  const zones = Object.values(state.zones).map((z) => ({
    id: z.id,
    label: z.label,
    type: z.type,
    density: +z.density.toFixed(2),
    queueMinutes: z.queueMinutes,
  }));
  const user = `Current state:\n${JSON.stringify(
    {
      simClock: state.simClock,
      phase: state.phase,
      attendance: state.attendance,
      capacity: state.capacity,
      weather: state.weather,
      zones,
      activeIncidents: state.incidents.filter((i) => i.status !== "dismissed"),
    },
    null,
    2
  )}`;
  return structuredJSON({ system: SITREP_SYSTEM_PROMPT, user, schema: SITREP_SCHEMA, fallback });
}
