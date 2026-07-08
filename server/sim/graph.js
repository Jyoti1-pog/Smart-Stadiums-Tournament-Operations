// Static stadium model: node layout (for pathfinding + SVG rendering) and
// facility catalogue. Coordinates live in a 1000x800 SVG viewBox and are
// shared with the client so there is a single source of truth for geometry.

const CX = 500;
const CY = 400;
const DEG = Math.PI / 180;

function polar(rx, ry, angleDeg) {
  const a = angleDeg * DEG;
  return { x: +(CX + rx * Math.cos(a)).toFixed(1), y: +(CY + ry * Math.sin(a)).toFixed(1) };
}

const GATE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const STAND_DEFS = [
  { id: "stand-N", label: "Stand A (North)", blockPrefix: "1", angle: -90 },
  { id: "stand-E", label: "Stand B (East)", blockPrefix: "2", angle: 0 },
  { id: "stand-S", label: "Stand C (South)", blockPrefix: "3", angle: 90 },
  { id: "stand-W", label: "Stand D (West)", blockPrefix: "4", angle: 180 },
];

const nodes = [];
const edges = [];

function addEdge(a, b, weight) {
  edges.push({ from: a, to: b, weight });
  edges.push({ from: b, to: a, weight });
}

// --- Gates (8), evenly spaced around the outer ring ---
const gateAngleStart = -90;
GATE_LETTERS.forEach((letter, i) => {
  const angle = gateAngleStart + i * 45;
  const { x, y } = polar(440, 340, angle);
  nodes.push({
    id: `gate-${letter}`,
    type: "gate",
    label: `Gate ${letter}`,
    angle,
    x,
    y,
  });
});

// --- Concourse zones (12), ring between gates and stands ---
for (let i = 0; i < 12; i++) {
  const angle = gateAngleStart + i * 30;
  const { x, y } = polar(345, 265, angle);
  nodes.push({
    id: `concourse-${i + 1}`,
    type: "concourse",
    label: `Concourse ${i + 1}`,
    angle,
    x,
    y,
  });
}

// --- Stand entries (4) ---
STAND_DEFS.forEach((s) => {
  const { x, y } = polar(235, 175, s.angle);
  nodes.push({
    id: s.id,
    type: "stand",
    label: s.label,
    blockPrefix: s.blockPrefix,
    angle: s.angle,
    x,
    y,
  });
});

// --- Transit hubs: 1 metro + 3 parking lots, outside the gate ring ---
const TRANSIT_DEFS = [
  { id: "transit-metro", label: "Metro Station", kind: "metro", angle: 90, nearGate: "gate-E" },
  { id: "transit-park-n", label: "Parking Lot North", kind: "parking", angle: -90, nearGate: "gate-A" },
  { id: "transit-park-w", label: "Parking Lot West", kind: "parking", angle: 180, nearGate: "gate-G" },
  { id: "transit-park-e", label: "Parking Lot East", kind: "parking", angle: 0, nearGate: "gate-C" },
];
TRANSIT_DEFS.forEach((t) => {
  const { x, y } = polar(560, 430, t.angle);
  nodes.push({ id: t.id, type: "transit", label: t.label, kind: t.kind, angle: t.angle, nearGate: t.nearGate, x, y });
});

const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));

function angularDist(a, b) {
  let d = Math.abs(a - b) % 360;
  if (d > 180) d = 360 - d;
  return d;
}

function nearestByAngle(angle, candidates) {
  return candidates
    .map((n) => ({ n, d: angularDist(angle, n.angle) }))
    .sort((a, b) => a.d - b.d)[0].n;
}

// Concourse ring edges (adjacent zones connect laterally)
const concourseNodes = nodes.filter((n) => n.type === "concourse");
for (let i = 0; i < concourseNodes.length; i++) {
  const a = concourseNodes[i];
  const b = concourseNodes[(i + 1) % concourseNodes.length];
  addEdge(a.id, b.id, 40);
}

// Each gate connects to its 1-2 nearest concourse zones
const gateNodes = nodes.filter((n) => n.type === "gate");
gateNodes.forEach((g) => {
  const sorted = concourseNodes
    .map((c) => ({ c, d: angularDist(g.angle, c.angle) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 2);
  sorted.forEach(({ c }) => addEdge(g.id, c.id, 55));
});

// Each concourse zone connects to the nearest stand entry
const standNodes = nodes.filter((n) => n.type === "stand");
concourseNodes.forEach((c) => {
  const nearest = nearestByAngle(c.angle, standNodes);
  addEdge(c.id, nearest.id, 90);
});

// Transit hubs connect to their nearest gate
nodes
  .filter((n) => n.type === "transit")
  .forEach((t) => addEdge(t.id, t.nearGate, 120));

// --- Facilities: concessions, restrooms, medical bays, attached to the ---
// nearest concourse zone with a small render offset so icons don't overlap
// the zone node itself.
const FACILITY_DEFS = [
  { id: "concession-1", type: "concession", label: "Bratwurst & Grill Co.", angle: -90 },
  { id: "concession-2", type: "concession", label: "Taqueria Azul", angle: -60 },
  { id: "concession-3", type: "concession", label: "Green Pitch Vegan", angle: -30 },
  { id: "concession-4", type: "concession", label: "World Cup Brews", angle: 0 },
  { id: "concession-5", type: "concession", label: "Curry Express", angle: 30 },
  { id: "concession-6", type: "concession", label: "Sushi & Co.", angle: 60 },
  { id: "concession-7", type: "concession", label: "Churros Plaza", angle: 90 },
  { id: "concession-8", type: "concession", label: "Halal Grill House", angle: 150 },
  { id: "concession-9", type: "concession", label: "Pizza Corner", angle: 180 },
  { id: "concession-10", type: "concession", label: "Fresh Salads Bar", angle: 210 },
  { id: "restroom-1", type: "restroom", label: "Restroom Cluster 1", angle: -75 },
  { id: "restroom-2", type: "restroom", label: "Restroom Cluster 2", angle: -15 },
  { id: "restroom-3", type: "restroom", label: "Restroom Cluster 3", angle: 45 },
  { id: "restroom-4", type: "restroom", label: "Restroom Cluster 4", angle: 105 },
  { id: "restroom-5", type: "restroom", label: "Restroom Cluster 5", angle: 165 },
  { id: "restroom-6", type: "restroom", label: "Restroom Cluster 6", angle: 225 },
  { id: "medical-1", type: "medical", label: "Medical Bay 1", angle: -45 },
  { id: "medical-2", type: "medical", label: "Medical Bay 2", angle: 135 },
];

FACILITY_DEFS.forEach((f) => {
  const zone = nearestByAngle(f.angle, concourseNodes);
  const { x, y } = polar(375, 290, f.angle);
  f.zoneId = zone.id;
  f.x = x;
  f.y = y;
});

export const STADIUM_GRAPH = { nodes, edges };
export const FACILITIES = FACILITY_DEFS;
export const GATES = gateNodes;
export const CONCOURSE_ZONES = concourseNodes;
export const STANDS = standNodes;
export const TRANSIT_HUBS = nodes.filter((n) => n.type === "transit");

export function getNode(id) {
  return nodeById[id];
}

// Given a seat descriptor like "Stand B, Block 214, Row 12", find the
// closest entry node (stand tunnel) the fan should path towards.
export function standIdForLabel(standLabel) {
  const letterMatch = /stand\s*([a-d])/i.exec(standLabel || "");
  if (!letterMatch) return STANDS[0].id;
  const letter = letterMatch[1].toUpperCase();
  const map = { A: "stand-N", B: "stand-E", C: "stand-S", D: "stand-W" };
  return map[letter] || STANDS[0].id;
}
