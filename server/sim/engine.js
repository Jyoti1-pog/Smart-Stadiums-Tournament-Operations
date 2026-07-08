import { createRng } from "./rng.js";
import { STADIUM_GRAPH, GATES, CONCOURSE_ZONES, STANDS, TRANSIT_HUBS, FACILITIES, getNode, standIdForLabel } from "./graph.js";
import { findPath } from "./pathfinding.js";

const CAPACITY = 65000;

// Match-day timeline, all times in simulated minutes relative to kickoff.
const PHASE_BOUNDS = [
  { key: "ingress", start: -120, end: 0 },
  { key: "first-half", start: 0, end: 45 },
  { key: "halftime", start: 45, end: 60 },
  { key: "second-half", start: 60, end: 105 },
  { key: "egress", start: 105, end: 150 },
];
const LOOP_START = -120;
const LOOP_END = 150;

const INCIDENT_TYPES = [
  {
    type: "medical",
    label: "Medical Emergency",
    weight: 3,
    describe: (rng, zone) => `Fan reported unwell near ${zone.label}. Requesting medical assist.`,
  },
  {
    type: "lost-child",
    label: "Lost Child",
    weight: 2,
    describe: (rng, zone) => `Child separated from guardians near ${zone.label}.`,
  },
  {
    type: "gate-scanner-failure",
    label: "Gate Scanner Failure",
    weight: 2,
    describe: (rng, zone) => `Ticket scanner offline at ${zone.label}, manual checks slowing entry.`,
  },
  {
    type: "queue-spike",
    label: "Queue Spike",
    weight: 3,
    describe: (rng, zone) => `Sudden queue build-up detected at ${zone.label}.`,
  },
  {
    type: "weather-change",
    label: "Weather Change",
    weight: 1,
    describe: () => `Weather shift detected — conditions may affect outdoor concourses.`,
  },
];

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// Smooth bump helper: 0 outside [start,end], rises/falls with a soft edge,
// peaking at `peak` (0..1) between start and end.
function bump(t, start, end, peakFrac = 0.5, rampFrac = 0.25) {
  if (t <= start || t >= end) return 0;
  const span = end - start;
  const peakT = start + span * peakFrac;
  const ramp = Math.max(span * rampFrac, 1);
  if (t < peakT) return clamp01((t - start) / Math.min(ramp, peakT - start || 1));
  return clamp01((end - t) / Math.min(ramp, end - peakT || 1));
}

export class SimulationEngine {
  constructor({ seed = "fifa2026", minutesPerTick = 1 } = {}) {
    this.seed = seed;
    this.minutesPerTick = minutesPerTick;
    this.rng = createRng(seed);
    this.simClock = -45; // seeded mid-ingress so the demo opens with visible congestion
    this.tickCount = 0;
    this.incidents = [];
    this.actionLog = [];
    this.history = [];
    this.nextIncidentId = 1;
    this.weather = { condition: "clear", tempC: 24, windKmh: 12 };
    this.zones = {};
    this._initZones();
    this._seedOpeningIncident();
    this._recompute(); // populate initial densities before first tick
  }

  _initZones() {
    [...GATES, ...CONCOURSE_ZONES, ...STANDS].forEach((n) => {
      this.zones[n.id] = {
        id: n.id,
        type: n.type,
        label: n.label,
        density: 0.05,
        queueMinutes: 0,
        energyKwh: 40,
        waterL: 20,
      };
    });
    TRANSIT_HUBS.forEach((t) => {
      this.zones[t.id] = {
        id: t.id,
        type: "transit",
        kind: t.kind,
        label: t.label,
        density: 0.05,
        nextDepartureMin: t.kind === "metro" ? 4 : null,
      };
    });
  }

  _seedOpeningIncident() {
    const gate = getNode("gate-C");
    this.incidents.push({
      id: `inc-${this.nextIncidentId++}`,
      type: "gate-scanner-failure",
      label: "Gate Scanner Failure",
      zoneId: gate.id,
      zoneLabel: gate.label,
      description: `Ticket scanner offline at ${gate.label}, manual checks slowing entry.`,
      severity: null,
      triage: null,
      status: "pending",
      createdAtSimClock: this.simClock,
      createdAt: Date.now(),
    });
  }

  phaseAt(simClock) {
    const p = PHASE_BOUNDS.find((p) => simClock >= p.start && simClock < p.end);
    return p ? p.key : "egress";
  }

  get phase() {
    return this.phaseAt(this.simClock);
  }

  _activeIncidentEffect(zoneId) {
    let effect = 0;
    for (const inc of this.incidents) {
      if (inc.zoneId !== zoneId) continue;
      if (inc.status === "pending") effect += 0.22;
      else if (inc.status === "accepted") effect += 0.06; // response in progress, easing
    }
    return effect;
  }

  _baseDensityFor(node, t) {
    const type = node.type;
    if (type === "gate") {
      const ingress = bump(t, -120, 5, 0.75, 0.35) * 0.95;
      const halftime = bump(t, 45, 60, 0.4, 0.4) * 0.25;
      const egress = bump(t, 100, 150, 0.35, 0.3) * 0.97;
      return Math.max(ingress, halftime, egress, 0.06);
    }
    if (type === "concourse") {
      const ingress = bump(t, -120, 0, 0.7, 0.35) * 0.75;
      const halftime = bump(t, 44, 62, 0.45, 0.35) * 0.9; // concession spike
      const egress = bump(t, 100, 150, 0.3, 0.3) * 0.85;
      return Math.max(ingress, halftime, egress, 0.08);
    }
    if (type === "stand") {
      const seating = bump(t, -110, 5, 0.9, 0.4) * 0.97;
      const settled = t >= 0 && t < 100 ? 0.93 : 0;
      const leaving = t >= 100 ? Math.max(0, 0.93 - bump(t, 100, 150, 0.6, 0.4) * 0.9) : 0;
      return Math.max(seating, settled, leaving, 0.03);
    }
    if (type === "transit") {
      const arrivals = bump(t, -120, -10, 0.6, 0.35) * 0.5;
      const departures = bump(t, 100, 150, 0.35, 0.3) * 0.98;
      return Math.max(arrivals, departures, 0.05);
    }
    return 0.1;
  }

  _weatherFactor() {
    if (this.weather.condition === "rain") return 0.06;
    if (this.weather.condition === "heat") return 0.03;
    return 0;
  }

  _recompute() {
    const t = this.simClock;
    const weatherBump = this._weatherFactor();
    for (const node of STADIUM_GRAPH.nodes) {
      const zone = this.zones[node.id];
      if (!zone) continue;
      const base = this._baseDensityFor(node, t);
      const noise = this.rng.range(-0.04, 0.04);
      const incidentEffect = this._activeIncidentEffect(node.id);
      const weatherEffect = node.type !== "stand" ? weatherBump : 0;
      zone.density = clamp01(base + noise + incidentEffect + weatherEffect);

      if (zone.type === "gate" || zone.type === "concourse") {
        zone.queueMinutes = Math.round(Math.pow(zone.density, 1.6) * 32);
      }
      if (zone.type === "transit") {
        zone.queueMinutes = Math.round(Math.pow(zone.density, 1.6) * 18);
        if (zone.kind === "metro") {
          zone.nextDepartureMin = Math.max(1, 6 - Math.round(zone.density * 4) + this.rng.int(-1, 1));
        }
      }
      // Sustainability figures: lighting/HVAC/escalators scale with occupancy.
      zone.energyKwh = Math.round((30 + zone.density * 140) * 10) / 10;
      zone.waterL = Math.round((10 + zone.density * 60) * 10) / 10;
    }
  }

  _maybeSpawnIncident() {
    const activeCount = this.incidents.filter((i) => i.status === "pending" || i.status === "accepted").length;
    if (activeCount >= 4) return;
    const spawnChance = this.phase === "egress" || this.phase === "ingress" ? 0.035 : 0.018;
    if (!this.rng.chance(spawnChance)) return;

    const totalWeight = INCIDENT_TYPES.reduce((s, i) => s + i.weight, 0);
    let roll = this.rng.range(0, totalWeight);
    let picked = INCIDENT_TYPES[0];
    for (const it of INCIDENT_TYPES) {
      if (roll < it.weight) {
        picked = it;
        break;
      }
      roll -= it.weight;
    }

    const pool = [...GATES, ...CONCOURSE_ZONES];
    const zoneNode = this.rng.pick(pool);

    if (picked.type === "weather-change") {
      const options = ["clear", "rain", "heat"].filter((c) => c !== this.weather.condition);
      const next = this.rng.pick(options);
      this.weather = {
        condition: next,
        tempC: next === "heat" ? this.rng.int(30, 38) : next === "rain" ? this.rng.int(14, 19) : this.rng.int(20, 26),
        windKmh: this.rng.int(5, 30),
      };
    }

    this.incidents.push({
      id: `inc-${this.nextIncidentId++}`,
      type: picked.type,
      label: picked.label,
      zoneId: zoneNode.id,
      zoneLabel: zoneNode.label,
      description: picked.describe(this.rng, zoneNode),
      severity: null,
      triage: null,
      status: "pending",
      createdAtSimClock: this.simClock,
      createdAt: Date.now(),
    });

    // Cap history so memory doesn't grow unbounded over a long demo.
    if (this.incidents.length > 40) {
      this.incidents = this.incidents.filter((i) => i.status === "pending" || i.status === "accepted").slice(-20);
    }
  }

  tick() {
    this.tickCount += 1;
    this.simClock += this.minutesPerTick;
    if (this.simClock > LOOP_END) {
      this.simClock = LOOP_START;
      this.history = [];
      this.incidents = this.incidents.filter((i) => i.status === "pending");
    }
    this._maybeSpawnIncident();
    this._recompute();

    const avgDensity =
      Object.values(this.zones).reduce((s, z) => s + z.density, 0) / Object.values(this.zones).length;
    this.history.push({ simClock: this.simClock, phase: this.phase, avgDensity: +avgDensity.toFixed(3) });
    if (this.history.length > 400) this.history.shift();

    return this.getState();
  }

  applyIncidentAction(incidentId, action) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return { ok: false, error: "Incident not found" };
    if (action !== "accept" && action !== "dismiss") return { ok: false, error: "Invalid action" };
    inc.status = action === "accept" ? "accepted" : "dismissed";
    inc.resolvedAtSimClock = this.simClock;
    this.actionLog.push({ incidentId, action, atSimClock: this.simClock, at: Date.now() });
    this._recompute();
    return { ok: true, incident: inc };
  }

  attachTriage(incidentId, triage) {
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return null;
    inc.triage = triage;
    inc.severity = triage?.severity ?? inc.severity;
    return inc;
  }

  densityMap() {
    const m = new Map();
    Object.values(this.zones).forEach((z) => m.set(z.id, z.density));
    return m;
  }

  routeToSeat(fromGateId, standLabel) {
    const standId = standIdForLabel(standLabel);
    const result = findPath(fromGateId, standId, this.densityMap());
    return result;
  }

  getZoneStatus(zoneId) {
    return this.zones[zoneId] || null;
  }

  getQueueTimes() {
    return Object.values(this.zones)
      .filter((z) => z.type === "gate" || z.type === "concourse")
      .map((z) => ({ id: z.id, label: z.label, queueMinutes: z.queueMinutes, density: +z.density.toFixed(2) }));
  }

  getTransitInfo() {
    return Object.values(this.zones)
      .filter((z) => z.type === "transit")
      .map((z) => ({
        id: z.id,
        label: z.label,
        kind: z.kind,
        density: +z.density.toFixed(2),
        nextDepartureMin: z.nextDepartureMin,
        queueMinutes: z.queueMinutes,
      }));
  }

  findFacility(type, nearSeatOrZoneId) {
    const candidates = FACILITIES.filter((f) => f.type === type);
    if (!candidates.length) return [];
    let refNode = getNode(nearSeatOrZoneId);
    if (!refNode) {
      // treat as a stand label like "Stand B"
      refNode = getNode(standIdForLabel(nearSeatOrZoneId) || "stand-N");
    }
    const withDist = candidates.map((f) => {
      const zoneNode = getNode(f.zoneId);
      const d = Math.hypot((zoneNode?.x ?? 0) - (refNode?.x ?? 0), (zoneNode?.y ?? 0) - (refNode?.y ?? 0));
      const zoneDensity = this.zones[f.zoneId]?.density ?? 0;
      return { ...f, distance: Math.round(d), zoneDensity: +zoneDensity.toFixed(2) };
    });
    return withDist.sort((a, b) => a.distance - b.distance).slice(0, 5);
  }

  getSustainability() {
    const zones = Object.values(this.zones);
    const totalEnergy = zones.reduce((s, z) => s + (z.energyKwh || 0), 0);
    const totalWater = zones.reduce((s, z) => s + (z.waterL || 0), 0);
    const lowDensityZones = zones.filter((z) => z.density < 0.25 && z.type !== "stand").map((z) => z.label);
    return {
      totalEnergyKwh: Math.round(totalEnergy),
      totalWaterL: Math.round(totalWater),
      lowDensityZones,
      byZone: zones.map((z) => ({ id: z.id, label: z.label, energyKwh: z.energyKwh, waterL: z.waterL, density: +z.density.toFixed(2) })),
    };
  }

  getState() {
    const occupancyFrac = clamp01(
      Object.values(this.zones)
        .filter((z) => z.type === "stand")
        .reduce((s, z) => s + z.density, 0) / 4
    );
    return {
      simClock: this.simClock,
      phase: this.phase,
      tickCount: this.tickCount,
      weather: this.weather,
      attendance: Math.round(occupancyFrac * CAPACITY),
      capacity: CAPACITY,
      zones: this.zones,
      incidents: this.incidents,
      history: this.history.slice(-200),
      sustainability: this.getSustainability(),
    };
  }
}
