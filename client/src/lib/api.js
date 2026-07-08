async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  health: () => request("/api/health"),
  state: () => request("/api/state"),
  map: () => request("/api/map"),
  route: (from, stand) => request(`/api/route?from=${encodeURIComponent(from)}&stand=${encodeURIComponent(stand)}`),
  facilities: (type, near) => request(`/api/facilities?type=${encodeURIComponent(type)}&near=${encodeURIComponent(near)}`),
  incidentAction: (id, action) =>
    request(`/api/incidents/${id}/action`, { method: "POST", body: JSON.stringify({ action }) }),
  incidentTriage: (id) => request(`/api/incidents/${id}/triage`, { method: "POST" }),
  chat: (messages, accessibilityMode) =>
    request("/api/chat", { method: "POST", body: JSON.stringify({ messages, accessibilityMode }) }),
  sitrep: () => request("/api/sitrep", { method: "POST" }),
  sustainabilityOptimize: () => request("/api/sustainability/optimize", { method: "POST" }),
};
