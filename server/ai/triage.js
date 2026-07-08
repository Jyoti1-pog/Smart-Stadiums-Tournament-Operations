import { structuredJSON } from "./gemini.js";
import { TRIAGE_SYSTEM_PROMPT } from "./prompts/triage.js";

const TRIAGE_SCHEMA = {
  type: "OBJECT",
  properties: {
    severity: { type: "STRING", enum: ["P1", "P2", "P3", "P4"] },
    category: { type: "STRING" },
    dispatch_team: { type: "STRING" },
    actions: { type: "ARRAY", items: { type: "STRING" } },
    pa_announcement: {
      type: "OBJECT",
      properties: {
        en: { type: "STRING" },
        es: { type: "STRING" },
        fr: { type: "STRING" },
      },
      required: ["en", "es", "fr"],
    },
  },
  required: ["severity", "category", "dispatch_team", "actions", "pa_announcement"],
};

const SEVERITY_BY_TYPE = {
  medical: "P1",
  "gate-scanner-failure": "P2",
  "lost-child": "P2",
  "queue-spike": "P3",
  "weather-change": "P4",
};

const TEAM_BY_TYPE = {
  medical: "Medical Response Unit",
  "gate-scanner-failure": "Technical/IT Support",
  "lost-child": "Guest Services",
  "queue-spike": "Stadium Operations",
  "weather-change": "Stadium Operations",
};

function fallbackTriage(incident) {
  const severity = SEVERITY_BY_TYPE[incident.type] || "P3";
  const team = TEAM_BY_TYPE[incident.type] || "Stadium Operations";
  return {
    severity,
    category: incident.label,
    dispatch_team: team,
    actions: [
      `Dispatch ${team} to ${incident.zoneLabel}`,
      "Monitor zone density for escalation",
      "Update ops log once resolved",
    ],
    pa_announcement: {
      en: `We are aware of a situation near ${incident.zoneLabel} and our team is responding. Thank you for your patience.`,
      es: `Estamos al tanto de una situación cerca de ${incident.zoneLabel} y nuestro equipo está respondiendo. Gracias por su paciencia.`,
      fr: `Nous sommes informés d'une situation près de ${incident.zoneLabel} et notre équipe intervient. Merci de votre patience.`,
    },
    offline: true,
  };
}

export async function triageIncident(incident) {
  const fallback = fallbackTriage(incident);
  const user = `Incident report:\n${JSON.stringify(
    {
      type: incident.type,
      label: incident.label,
      location: incident.zoneLabel,
      description: incident.description,
      reportedAtSimClock: incident.createdAtSimClock,
    },
    null,
    2
  )}`;
  return structuredJSON({ system: TRIAGE_SYSTEM_PROMPT, user, schema: TRIAGE_SCHEMA, fallback });
}
