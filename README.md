# StadiumPulse

**A GenAI-enabled Smart Stadium & Tournament Operations platform for FIFA World Cup 2026.**

Built for PromptWars — Challenge 4: Smart Stadiums & Tournament Operations.

---

## Problem Statement

A World Cup venue on match day is a 65,000-person logistics problem: fans can't
find their seats, gates, food, or the nearest step-free exit; operations staff
are flooded with radio chatter about queues, incidents, and weather with no
unified picture of what's actually happening across the stadium. Existing
stadium apps are static wayfinding maps — none of them reason about *live*
conditions or *explain* what to do next.

StadiumPulse is a dual-sided platform that puts a GenAI layer on top of a live
stadium simulation:

- **Fan Companion** — a multilingual AI concierge that helps fans navigate the
  stadium, find seats/food/restrooms/exits, get transit guidance, and receive
  accessibility support — grounded in live crowd data, not guesses.
- **Ops Command Center** — a real-time decision-support dashboard for venue
  staff: crowd heatmaps, incident triage, AI situation reports, and
  sustainability recommendations, with a closed feedback loop (accepting an
  incident response visibly eases congestion in the simulation).

---

## Architecture

```
                         ┌─────────────────────────────┐
                         │      Simulation Engine        │
                         │  (server/sim) — match clock,   │
                         │  8 gates · 12 concourse zones · │
                         │  4 stands · transit · incidents │
                         └───────────────┬─────────────┘
                                         │ tick (1/sec)
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
             REST (state,          SSE /api/stream       Pathfinding
             zones, route,          (live push)          (Dijkstra over
             facilities)                │                 ~30-node graph)
                    │                    │                    │
                    └────────────┬───────┴────────────────────┘
                                 │
                       ┌─────────▼─────────┐
                       │   Express server    │
                       │   (server/index.js) │
                       └─────────┬─────────┘
                                 │
                  ┌──────────────┼───────────────┐
                  │              │               │
           ai/concierge.js  ai/triage.js   ai/sitrep.js
           ai/sustainability.js  (all → ai/gemini.js wrapper)
                  │              │               │
                  └──────────────┼───────────────┘
                                 │
                       Google Gemini API
              (gemini-flash-latest, function-calling)
                                 │
                 offline fallback if no API key set
                                 │
                       ┌─────────▼─────────┐
                       │   React + Vite      │
                       │  client/src         │
                       │  /fan   /ops         │
                       └─────────────────────┘
```

- **No database.** The simulation is the source of truth, held in memory on
  the server and streamed to every connected client via Server-Sent Events
  (polling fallback if SSE drops).
- **One graph, two consumers.** `server/sim/graph.js` defines the ~30-node
  stadium graph (gates, concourse zones, stands, transit) with SVG-ready x/y
  coordinates. The server uses it for Dijkstra pathfinding; the client fetches
  it once (`GET /api/map`) and renders the same coordinates as the stylized
  SVG stadium map — a single source of geometry truth.
- **Offline demo mode.** Every AI-backed route degrades gracefully to a
  simulation-grounded canned response if `GEMINI_API_KEY` is unset, so the
  app never looks broken without a key.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS, two routes: `/fan` and `/ops` |
| Backend | Node.js + Express, single server (API + static build) |
| AI | Google Gemini API (`gemini-flash-latest`) via `@google/genai`, function-calling + schema-enforced JSON |
| Data | In-memory simulation engine, no external services required besides the LLM |
| Maps | Hand-drawn stylized SVG (no map API) |
| Realtime | Server-Sent Events (`/api/stream`), 3s polling fallback |

---

## Setup

```bash
# 1. Install everything (root + client)
npm run install:all

# 2. Configure environment
cp .env.example .env
# edit .env and set GEMINI_API_KEY (optional — omit for offline demo mode)

# 3. Run both server and client with one command
npm run dev
```

- Client dev server: http://localhost:5173 (proxies `/api` to the backend)
- API server: http://localhost:8787
- Landing page at `/`, Fan Companion at `/fan`, Ops Command Center at `/ops`

### Production build

```bash
npm run build   # builds client/dist
npm start       # serves API + built client from a single Express process on $PORT
```

### Environment variables (`.env`)

| Var | Default | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | _(unset)_ | Google Gemini API key. Omit to run fully offline with canned, simulation-grounded AI responses. |
| `GEMINI_MODEL` | `gemini-flash-latest` | Gemini model used for concierge, triage, sitrep, and sustainability |
| `PORT` | `8787` | Express server port |
| `SIM_SEED` | `fifa2026` | Deterministic seed — same seed reproduces the same demo run |
| `SIM_MINUTES_PER_TICK` | `1` | Simulated minutes advanced per real second |

---

## Demo Script (3 minutes, for judges)

The app seeds itself **mid-ingress** with visible gate congestion and one
active incident already in the queue — it's demo-able the instant it loads,
no setup clicks required.

1. **Open `/ops`** (Ops Command Center). Point out the live heatmap — gates
   and concourse zones are already colored from green through red, the match
   clock reads `T-45′`, and there's a pending "Gate Scanner Failure" incident
   in the sidebar.
2. Click **AI Triage** on the incident → Gemini (or the offline fallback)
   returns a severity (P1–P4), a dispatch team, concrete actions, and a
   two-line PA announcement in **English, Spanish, and French**. Click
   **Accept** — watch the affected gate's density ease over the next few
   ticks (the closed feedback loop).
3. Click **Generate** under **AI Situation Report** — a 150-word briefing
   appears: Risks / Actions / Outlook, citing the actual live numbers on
   screen.
4. Click **AI Optimize** under **Sustainability** — 3 concrete energy/water
   saving actions targeting the current low-density zones.
5. Drag across the **Density Timeline** to see the ingress → halftime →
   egress curve, and scan the **Gate Queue Times** bars.
6. Switch to **`/fan`** (resize or open on a phone — it's tuned for 390px).
   Tap the **"Food nearby"** quick-action chip — the concierge answers with a
   real nearby concession and its live congestion.
7. Type a question in another language, e.g. **"¿Dónde está la puerta C?"**
   — the concierge detects Spanish and replies in Spanish, grounded in the
   live gate data.
8. Switch to the **Stadium Map** tab, fill in `Gate A → Stand B, Block 214,
   Row 12`, tap **Show route** — the SVG map draws the shortest path around
   congestion with an animated glow line and walk-time estimate.
9. Toggle **Accessibility Mode** (♿ icon in the header) — quick chips and
   the concierge now bias toward step-free, low-sensory guidance, and text
   scales up.
10. Switch the language dropdown to Arabic — the static UI (chips, labels,
    seat finder) flips to Arabic RTL instantly, no reload.

---

## Where GenAI Shows Up

| Feature | How Gemini is used |
|---|---|
| **Fan Concierge** (`/fan`, Concierge tab) | Multi-turn function-calling chat. Gemini calls `get_zone_status`, `get_queue_times`, `get_transit_info`, `find_facility`, `get_route_to_seat` against the live simulation, then replies in the fan's own language, grounded only in tool results (`server/ai/concierge.js`, `server/ai/tools.js`). |
| **Smart Navigation** | Not itself an LLM call — a Dijkstra pathfind over the live-weighted stadium graph (`server/sim/pathfinding.js`) — but the concierge can invoke it as a tool, and the Ops sitrep/triage reference the same congestion data. |
| **Incident Triage** | Schema-enforced JSON output (`responseSchema`): severity, category, dispatch team, actions, and a PA announcement drafted in EN/ES/FR in one call (`server/ai/triage.js`, prompt in `server/ai/prompts/triage.js`). |
| **AI Situation Report** | On-demand 150-word, three-section (Risks/Actions/Outlook) briefing generated from the full live simulation state (`server/ai/sitrep.js`). |
| **Sustainability Optimizer** | Schema-enforced JSON with 3 concrete energy/water-saving actions targeting the current low-density zones (`server/ai/sustainability.js`). |
| **Accessibility Mode** | Adapts the concierge's system prompt to prioritize step-free, low-sensory guidance and plainer language (`server/ai/prompts/concierge.js`). |
| **Offline Demo Mode** | Every one of the above degrades to a simulation-grounded canned response (not a hardcoded string — it still calls the real tool handlers) if `GEMINI_API_KEY` is unset, so a network hiccup or missing key never breaks the demo. |

---

## Project Structure

```
stadiumpulse/
  server/
    index.js            # Express app, SSE, all routes
    sim/
      graph.js           # ~30-node stadium graph + facility catalogue
      engine.js           # match clock, phases, density model, incidents
      pathfinding.js       # Dijkstra with live-congestion edge weights
      rng.js                # seeded PRNG (SIM_SEED)
    ai/
      gemini.js            # central Gemini wrapper (function-calling loop + schema JSON)
      concierge.js          # fan concierge chat + offline fallback
      triage.js              # incident triage
      sitrep.js                # ops situation report
      sustainability.js         # sustainability optimizer
      tools.js                   # tool-use definitions/handlers for the concierge
      prompts/                     # system prompts, one file per feature
  client/
    src/
      pages/            # Landing, FanApp, OpsDashboard
      components/        # StadiumMap, ChatPanel, IncidentPanel, TimelineChart, ...
      context/              # SimContext (SSE), I18nContext, ToastContext
      i18n/                   # en/es/fr/ar/hi/pt static UI strings
      lib/                      # api client, density/status helpers
  .env.example
  README.md
```
