import { chatWithTools, isOffline } from "./gemini.js";
import { conciergeSystemPrompt } from "./prompts/concierge.js";
import { CONCIERGE_TOOLS, buildToolHandlers } from "./tools.js";

// Offline demo mode: no API key configured. We still ground replies in real
// sim data by calling the same tool handlers directly, just without an LLM
// doing the language understanding — so the app never looks broken in a demo
// with no network/key available.
function offlineReply(messages, engine) {
  const last = (messages[messages.length - 1]?.content || "").toLowerCase();
  const handlers = buildToolHandlers(engine);

  if (/seat|stand|block|row/.test(last)) {
    const standMatch = /stand\s*([a-d])/i.exec(last);
    const standLabel = standMatch ? `Stand ${standMatch[1].toUpperCase()}` : "Stand A";
    const route = handlers.get_route_to_seat({ from_gate: "gate-A", stand_label: standLabel });
    if (route.error) return `[Offline demo mode] I couldn't compute that route right now, but head toward ${standLabel} via the nearest concourse.`;
    return `[Offline demo mode] From Gate A, head to ${standLabel} — about ${route.estimated_walk_minutes} min walk via ${route.path
      .slice(1, -1)
      .map((p) => p.label)
      .join(" → ")}.`;
  }
  if (/food|eat|hungry|vegetarian|vegan|drink/.test(last)) {
    const r = handlers.find_facility({ facility_type: "concession", near: "gate-A" });
    const f = r.facilities?.[0];
    return f
      ? `[Offline demo mode] Closest option: ${f.label} — about ${f.distance}m away, zone congestion ${Math.round(f.zoneDensity * 100)}%.`
      : `[Offline demo mode] I couldn't find concession data right now.`;
  }
  if (/restroom|toilet|bathroom|washroom/.test(last)) {
    const r = handlers.find_facility({ facility_type: "restroom", near: "gate-A" });
    const f = r.facilities?.[0];
    return f ? `[Offline demo mode] Nearest restroom: ${f.label}, ~${f.distance}m away.` : `[Offline demo mode] No restroom data available.`;
  }
  if (/medical|hurt|sick|emergency|help/.test(last)) {
    const r = handlers.find_facility({ facility_type: "medical", near: "gate-A" });
    const f = r.facilities?.[0];
    return f ? `[Offline demo mode] Nearest medical bay: ${f.label}, ~${f.distance}m away. For emergencies, alert the nearest steward immediately.` : `[Offline demo mode] Please alert the nearest steward.`;
  }
  if (/exit|leave|transit|metro|train|parking|home/.test(last)) {
    const transit = handlers.get_transit_info();
    const best = [...transit].sort((a, b) => a.density - b.density)[0];
    return `[Offline demo mode] Quietest transit option right now: ${best.label} (${Math.round(best.density * 100)}% busy).`;
  }
  if (/gate/.test(last)) {
    const queues = handlers.get_queue_times().filter((q) => q.id.startsWith("gate"));
    const best = [...queues].sort((a, b) => a.queueMinutes - b.queueMinutes)[0];
    return `[Offline demo mode] Shortest gate wait right now: ${best.label} at ~${best.queueMinutes} min.`;
  }
  return `[Offline demo mode] I'm running without a live AI connection right now, but I can still help with seats, food, restrooms, medical, gates, and transit — try one of the quick actions below.`;
}

export async function chatWithConcierge(messages, { engine, accessibilityMode }) {
  const normalized = (messages || []).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  if (isOffline()) {
    return { role: "assistant", content: offlineReply(normalized, engine), offline: true };
  }

  const system = conciergeSystemPrompt({ accessibilityMode });
  const toolHandlers = buildToolHandlers(engine);
  const { text, toolCallsUsed } = await chatWithTools({
    system,
    messages: normalized,
    tools: CONCIERGE_TOOLS,
    toolHandlers,
  });
  return { role: "assistant", content: text, toolCallsUsed };
}
