import { structuredJSON } from "./gemini.js";
import { SUSTAINABILITY_SYSTEM_PROMPT } from "./prompts/sustainability.js";

const SUSTAINABILITY_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    actions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          detail: { type: "STRING" },
          estimated_savings: { type: "STRING" },
        },
        required: ["title", "detail", "estimated_savings"],
      },
    },
  },
  required: ["summary", "actions"],
};

function fallbackSustainability(sustainability) {
  const lowZones = sustainability.lowDensityZones.slice(0, 3);
  return {
    summary: `${lowZones.length} low-occupancy zones currently offer savings opportunities without affecting fan experience.`,
    actions: [
      {
        title: "Dim concourse lighting",
        detail: `Reduce lighting levels in ${lowZones[0] || "low-density concourse zones"} where occupancy is under 25%.`,
        estimated_savings: "~8% lighting energy in affected zones",
      },
      {
        title: "Throttle HVAC airflow",
        detail: `Lower ventilation rates in ${lowZones[1] || "quiet concourse areas"} while density stays low.`,
        estimated_savings: "~6% HVAC energy",
      },
      {
        title: "Stagger escalators/travelators",
        detail: `Pause or slow non-essential escalators near ${lowZones[2] || "low-traffic gates"} until footfall increases.`,
        estimated_savings: "~4% mechanical energy",
      },
    ],
    offline: true,
  };
}

export async function optimizeSustainability(sustainability) {
  const fallback = fallbackSustainability(sustainability);
  const user = `Current usage:\n${JSON.stringify(sustainability, null, 2)}`;
  return structuredJSON({ system: SUSTAINABILITY_SYSTEM_PROMPT, user, schema: SUSTAINABILITY_SCHEMA, fallback });
}
