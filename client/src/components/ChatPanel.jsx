import React, { useEffect, useRef, useState } from "react";
import { useI18n } from "../context/I18nContext.jsx";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

const QUICK_ACTIONS = [
  { key: "quickSeat", text: "Help me find my seat" },
  { key: "quickExit", text: "What's the shortest exit right now?" },
  { key: "quickFood", text: "Find food nearby" },
  { key: "quickAccessibility", text: "I need accessibility help" },
  { key: "quickTransit", text: "How do I get home by transit?" },
];

function Bubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-pulse-teal text-black rounded-br-sm" : "glass-card rounded-bl-sm"
        }`}
      >
        {message.content}
        {message.toolCallsUsed?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {message.toolCallsUsed.map((tc, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/20 text-slate-400 border border-white/10">
                🔎 {tc.name.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
        {message.offline && <div className="mt-1 text-[10px] text-pulse-amber">offline demo</div>}
      </div>
    </div>
  );
}

export default function ChatPanel({ accessibilityMode }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await api.chat(
        next.map((m) => ({ role: m.role, content: m.content })),
        accessibilityMode
      );
      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      showToast(`Concierge unavailable: ${err.message}`);
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {QUICK_ACTIONS.map((qa) => (
          <button key={qa.key} onClick={() => send(qa.text)} className="pill-chip whitespace-nowrap shrink-0">
            {t(qa.key)}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-2.5 py-3 min-h-[240px]">
        {messages.length === 0 && <div className="text-sm text-slate-500 text-center mt-8 px-6">{t("chatEmpty")}</div>}
        {messages.map((m, i) => (
          <Bubble key={i} message={m} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" />
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 pt-2 border-t border-pulse-border"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("chatPlaceholder")}
          className="flex-1 bg-pulse-panel2 border border-pulse-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-pulse-teal/60"
          aria-label={t("chatPlaceholder")}
        />
        <button type="submit" disabled={loading} className="btn-primary text-sm px-4">
          {t("chatSend")}
        </button>
      </form>
    </div>
  );
}
