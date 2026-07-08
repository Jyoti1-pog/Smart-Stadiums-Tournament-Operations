import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SimulationEngine } from "./sim/engine.js";
import { STADIUM_GRAPH, FACILITIES } from "./sim/graph.js";
import { chatWithConcierge } from "./ai/concierge.js";
import { generateSitrep } from "./ai/sitrep.js";
import { triageIncident } from "./ai/triage.js";
import { optimizeSustainability } from "./ai/sustainability.js";
import { isOffline, MODEL } from "./ai/gemini.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const TICK_MS = 1000;

const engine = new SimulationEngine({
  seed: process.env.SIM_SEED || "fifa2026",
  minutesPerTick: Number(process.env.SIM_MINUTES_PER_TICK) || 1,
});

const sseClients = new Set();

setInterval(() => {
  const state = engine.tick();
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}, TICK_MS);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ aiMode: isOffline() ? "offline" : "live", model: MODEL });
});

// --- Core simulation state ---
app.get("/api/state", (req, res) => {
  res.json(engine.getState());
});

app.get("/api/map", (req, res) => {
  res.json({ graph: STADIUM_GRAPH, facilities: FACILITIES });
});

app.get("/api/zones/:id", (req, res) => {
  const zone = engine.getZoneStatus(req.params.id);
  if (!zone) return res.status(404).json({ error: "Zone not found" });
  res.json(zone);
});

app.get("/api/stream", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(`data: ${JSON.stringify(engine.getState())}\n\n`);
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

// --- Navigation ---
app.get("/api/route", (req, res) => {
  const { from, stand } = req.query;
  if (!from || !stand) return res.status(400).json({ error: "from and stand are required" });
  const result = engine.routeToSeat(from, stand);
  if (!result) return res.status(404).json({ error: "No route found" });
  res.json(result);
});

app.get("/api/facilities", (req, res) => {
  const { type, near } = req.query;
  if (!type) return res.status(400).json({ error: "type is required" });
  res.json(engine.findFacility(type, near));
});

// --- Incidents ---
app.post("/api/incidents/:id/action", async (req, res) => {
  const { action } = req.body;
  const result = engine.applyIncidentAction(req.params.id, action);
  if (!result.ok) return res.status(400).json(result);
  res.json(result);
});

app.post("/api/incidents/:id/triage", async (req, res) => {
  const incident = engine.incidents.find((i) => i.id === req.params.id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });
  try {
    const triage = await triageIncident(incident);
    engine.attachTriage(incident.id, triage);
    res.json(triage);
  } catch (err) {
    console.error("Triage failed", err);
    res.status(500).json({ error: "Triage failed" });
  }
});

// --- AI-backed endpoints ---
app.post("/api/chat", async (req, res) => {
  const { messages, accessibilityMode } = req.body;
  try {
    const reply = await chatWithConcierge(messages, { engine, accessibilityMode });
    res.json(reply);
  } catch (err) {
    console.error("Chat failed", err);
    res.status(500).json({ error: "Concierge is temporarily unavailable" });
  }
});

app.post("/api/sitrep", async (req, res) => {
  try {
    const sitrep = await generateSitrep(engine.getState());
    res.json(sitrep);
  } catch (err) {
    console.error("Sitrep failed", err);
    res.status(500).json({ error: "Sitrep generation failed" });
  }
});

app.post("/api/sustainability/optimize", async (req, res) => {
  try {
    const result = await optimizeSustainability(engine.getSustainability());
    res.json(result);
  } catch (err) {
    console.error("Sustainability optimize failed", err);
    res.status(500).json({ error: "Optimization failed" });
  }
});

// --- Static client build (production) ---
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Client build not found. Run `npm run build` first.");
  });
});

app.listen(PORT, () => {
  console.log(`StadiumPulse server running on http://localhost:${PORT}`);
  console.log(`AI mode: ${process.env.GEMINI_API_KEY ? `LIVE (Gemini ${MODEL})` : "OFFLINE DEMO"}`);
});
