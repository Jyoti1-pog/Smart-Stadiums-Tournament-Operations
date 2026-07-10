// Vercel serverless entry. All /api/* requests are rewritten here (see
// vercel.json); the Express app itself is a (req, res) handler so Vercel's
// Node runtime can invoke it directly. lazyTick advances the simulation by
// the wall-clock time elapsed since the previous request, replacing the
// setInterval loop that exists only in the long-lived local server.
import { createApp } from "../server/app.js";

const app = createApp({ lazyTick: true });

export default app;
