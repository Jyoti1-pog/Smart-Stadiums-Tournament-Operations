// Shared density -> status mapping used by the heatmap, legends, and queue
// lists. Four buckets (not a continuous ramp) because ops staff scan for
// "which zones need attention", a status read, not a magnitude comparison.
export const STATUS_COLORS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const STATUS_LABELS = {
  good: "Clear",
  warning: "Building",
  serious: "Congested",
  critical: "Critical",
};

export function densityStatus(density) {
  if (density >= 0.8) return "critical";
  if (density >= 0.6) return "serious";
  if (density >= 0.35) return "warning";
  return "good";
}

export function densityColor(density) {
  return STATUS_COLORS[densityStatus(density)];
}
