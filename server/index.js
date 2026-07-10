// Local / long-lived server entry: background tick loop, SSE push, and
// static client serving. The serverless (Vercel) entry is api/index.js,
// which shares the same routes via createApp({ lazyTick: true }).
import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp, engine } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8787;
const TICK_MS = 1000;

const app = createApp();
const sseClients = new Set();

setInterval(() => {
  const state = engine.tick();
  const payload = `data: ${JSON.stringify(state)}\n\n`;
  for (const res of sseClients) {
    res.write(payload);
  }
}, TICK_MS);

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
  console.log(`AI mode: ${process.env.GEMINI_API_KEY ? "LIVE (Gemini)" : "OFFLINE DEMO"}`);
});
