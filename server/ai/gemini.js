import { GoogleGenAI } from "@google/genai";

// gemini-flash-latest is Google's rolling alias for the current flash model —
// it works across account generations (newer keys have no gemini-2.5-* access).
export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

let client = null;
export function isOffline() {
  return !process.env.GEMINI_API_KEY;
}

function getClient() {
  if (isOffline()) return null;
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

// One retry with a short backoff on transient failures (503 demand spikes,
// connection resets) so a single blip doesn't drop a demo interaction to the
// offline fallback.
function isTransient(err) {
  const msg = String(err?.message || err);
  return err?.status === 503 || err?.status === 429 || /ECONNRESET|fetch failed|UNAVAILABLE/i.test(msg);
}

async function generateWithRetry(ai, params, retries = 1) {
  try {
    return await ai.models.generateContent(params);
  } catch (err) {
    if (retries > 0 && isTransient(err)) {
      await new Promise((r) => setTimeout(r, 800));
      return generateWithRetry(ai, params, retries - 1);
    }
    throw err;
  }
}

// Runs a full tool-use conversation loop: sends contents + function
// declarations, executes any requested function calls locally via
// `toolHandlers`, feeds results back as functionResponse parts, and repeats
// until Gemini returns plain text (or `maxTurns` hits).
export async function chatWithTools({ system, messages, tools, toolHandlers, maxTurns = 4 }) {
  const ai = getClient();
  if (!ai) throw new OfflineError("chatWithTools called without an API key");

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const toolCallsUsed = [];

  const config = {
    systemInstruction: { parts: [{ text: system }] },
    tools: [{ functionDeclarations: tools }],
  };

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await generateWithRetry(ai, { model: MODEL, contents, config });

    const calls = response.functionCalls;
    if (!calls || calls.length === 0) {
      return { text: (response.text || "").trim(), toolCallsUsed };
    }

    // Preserve the model's own turn (including its functionCall parts) so
    // the follow-up request has full context.
    contents.push(response.candidates[0].content);

    const responseParts = [];
    for (const call of calls) {
      let result;
      try {
        result = await toolHandlers[call.name]?.(call.args || {});
      } catch (err) {
        result = { error: String(err?.message || err) };
      }
      toolCallsUsed.push({ name: call.name, input: call.args, result });
      // Gemini requires functionResponse.response to be a JSON *object*
      // (a proto Struct) — wrap arrays and primitives.
      const wrapped =
        result && typeof result === "object" && !Array.isArray(result) ? result : { result: result ?? { error: "Unknown tool" } };
      responseParts.push({ functionResponse: { name: call.name, response: wrapped } });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  return { text: "I'm having trouble finishing that thought — could you rephrase?", toolCallsUsed };
}

// For triage / sitrep / sustainability: ask Gemini for JSON matching a
// schema (enforced via responseSchema), then parse defensively as a
// safety net.
export async function structuredJSON({ system, user, schema, fallback }) {
  const ai = getClient();
  if (!ai) return fallback;

  try {
    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: user }] }],
      config: {
        systemInstruction: { parts: [{ text: system }] },
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });
    return parseJsonLoose(response.text) ?? fallback;
  } catch (err) {
    console.error("structuredJSON failed, using fallback", err);
    return fallback;
  }
}

// Minimal end-to-end API check for diagnostics: a plain call and a
// schema-constrained call, each returning the reply or the raw error —
// mirrors the two request shapes the app actually uses.
export async function pingAI() {
  if (isOffline()) return { ok: false, mode: "offline", error: "GEMINI_API_KEY not set" };
  const ai = getClient();
  const out = { model: MODEL };
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: pong" }] }],
    });
    out.plain = { ok: true, reply: (response.text || "").trim().slice(0, 50) };
  } catch (err) {
    out.plain = { ok: false, error: String(err?.message || err).slice(0, 600) };
  }
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ text: "Classify severity of: scanner failure at a stadium gate." }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { severity: { type: "STRING", enum: ["P1", "P2", "P3", "P4"] } },
          required: ["severity"],
        },
      },
    });
    out.structured = { ok: true, reply: (response.text || "").trim().slice(0, 80) };
  } catch (err) {
    out.structured = { ok: false, error: String(err?.message || err).slice(0, 600) };
  }
  out.ok = out.plain.ok && out.structured.ok;
  return out;
}

export function parseJsonLoose(text) {
  if (!text) return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export class OfflineError extends Error {}
