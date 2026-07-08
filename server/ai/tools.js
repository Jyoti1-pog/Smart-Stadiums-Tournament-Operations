import { getNode, FACILITIES } from "../sim/graph.js";

// Gemini function-calling definitions for the fan concierge. Handlers close over
// the live simulation engine so every answer is grounded in current state.

export const CONCIERGE_TOOLS = [
  {
    name: "get_zone_status",
    description:
      "Get live status (crowd density 0-1, queue minutes, type) for a specific stadium zone by id, e.g. 'gate-C', 'concourse-5', 'stand-N'. Use this when a fan asks about a specific gate, concourse, or stand.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        zone_id: { type: "string", description: "Zone id, e.g. gate-A..gate-H, concourse-1..12, stand-N/E/S/W" },
      },
      required: ["zone_id"],
    },
  },
  {
    name: "get_queue_times",
    description:
      "Get current queue wait times (minutes) and density for ALL gates and concourse zones. Use this to compare options and recommend the fastest gate or exit.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "get_transit_info",
    description:
      "Get live transit status: metro next departure and platform crowding, plus the 3 parking lots' congestion. Use this for 'how do I get home' or 'when's the next train' questions.",
    parametersJsonSchema: { type: "object", properties: {} },
  },
  {
    name: "find_facility",
    description:
      "Find the nearest facilities of a given type (concession, restroom, medical) relative to a seat/stand or zone id. Returns up to 5 sorted by distance, with the congestion of the zone each sits in.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        facility_type: { type: "string", enum: ["concession", "restroom", "medical"] },
        near: { type: "string", description: "A stand label like 'Stand B', a seat description, or a zone id like 'gate-C'" },
      },
      required: ["facility_type", "near"],
    },
  },
  {
    name: "get_route_to_seat",
    description:
      "Compute the recommended walking path from a gate to a stand entrance, automatically routed around congested zones. Use when a fan gives a seat (e.g. 'Stand B, Block 214, Row 12') and a gate they're entering from, or asks for the shortest/quietest exit.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        from_gate: { type: "string", description: "Gate id, e.g. gate-A" },
        stand_label: { type: "string", description: "Stand label from the seat, e.g. 'Stand B'" },
      },
      required: ["from_gate", "stand_label"],
    },
  },
];

export function buildToolHandlers(engine) {
  return {
    get_zone_status: ({ zone_id }) => {
      const zone = engine.getZoneStatus(zone_id);
      if (!zone) return { error: `Unknown zone_id: ${zone_id}` };
      return zone;
    },
    get_queue_times: () => engine.getQueueTimes(),
    get_transit_info: () => engine.getTransitInfo(),
    find_facility: ({ facility_type, near }) => {
      const results = engine.findFacility(facility_type, near);
      return { facilities: results };
    },
    get_route_to_seat: ({ from_gate, stand_label }) => {
      const gateNode = getNode(from_gate);
      if (!gateNode) return { error: `Unknown gate: ${from_gate}` };
      const result = engine.routeToSeat(from_gate, stand_label);
      if (!result) return { error: "No route found" };
      const path = result.path.map((id) => {
        const n = getNode(id);
        return { id, label: n?.label, type: n?.type };
      });
      return { path, estimated_walk_minutes: Math.round(result.cost / 60) || 1 };
    },
  };
}

export { FACILITIES };
