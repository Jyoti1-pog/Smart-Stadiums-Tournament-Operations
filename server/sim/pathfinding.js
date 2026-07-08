import { STADIUM_GRAPH } from "./graph.js";

// Build adjacency once; live congestion is applied as a weight multiplier
// at query time so a single graph can be re-routed every tick.
const adjacency = new Map();
STADIUM_GRAPH.nodes.forEach((n) => adjacency.set(n.id, []));
STADIUM_GRAPH.edges.forEach((e) => {
  adjacency.get(e.from).push(e);
});

// densityByNode: Map<nodeId, 0..1> — congestion penalty applied to the cost
// of entering that node. Heavily congested zones become "expensive" so
// Dijkstra routes around them.
export function findPath(startId, endId, densityByNode = new Map()) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();
  STADIUM_GRAPH.nodes.forEach((n) => dist.set(n.id, Infinity));
  dist.set(startId, 0);

  const queue = new Set(STADIUM_GRAPH.nodes.map((n) => n.id));

  while (queue.size) {
    let u = null;
    let best = Infinity;
    for (const id of queue) {
      if (dist.get(id) < best) {
        best = dist.get(id);
        u = id;
      }
    }
    if (u === null) break;
    queue.delete(u);
    visited.add(u);
    if (u === endId) break;

    for (const edge of adjacency.get(u) || []) {
      if (visited.has(edge.to)) continue;
      const congestion = densityByNode.get(edge.to) ?? 0;
      const penalty = 1 + congestion * 3; // congested nodes cost up to 4x
      const alt = dist.get(u) + edge.weight * penalty;
      if (alt < dist.get(edge.to)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, u);
      }
    }
  }

  if (dist.get(endId) === Infinity) return null;

  const path = [endId];
  let cur = endId;
  while (prev.has(cur)) {
    cur = prev.get(cur);
    path.unshift(cur);
  }
  return { path, cost: dist.get(endId) };
}
