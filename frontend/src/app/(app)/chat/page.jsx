"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

// ── Markdown renderer (minimal) ───────────────────────────────────────────────

function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<p style='font-weight:700;color:white;margin:8px 0 4px'>$1</p>")
    .replace(/^- (.+)$/gm, "<li style='margin:2px 0'>$1</li>")
    .replace(/(<li[^>]*>.*<\/li>)/gs, "<ul style='list-style:disc;padding-left:1rem;margin:4px 0'>$1</ul>")
    .replace(/\n/g, "<br/>");
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={isUser
          ? { background: "var(--green)", color: "#0f0f0f", borderBottomRightRadius: "4px" }
          : { background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "#9ca3af", borderBottomLeftRadius: "4px" }}
      >
        {isUser
          ? msg.content
          : <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hi! I'm DealSense AI. What would you like to know?" },
  ]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [companyId, setCompanyId] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const data = await api.chat(text, companyId || null);
      setMessages(m => [...m, { role: "assistant", content: data.answer || "No response." }]);
    } catch (e) {
      setMessages(m => [...m, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-base)" }}>

      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "#111111" }}>
        <div>
          <h1 className="text-base font-bold text-white">Deal Analyst</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
            {companyId ? `Scoped to company #${companyId}` : "Portfolio-wide context"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: "#4b5563" }}>Company ID:</label>
          <input
            type="text"
            value={companyId}
            onChange={e => setCompanyId(e.target.value)}
            placeholder="optional"
            className="text-sm px-3 py-1.5 rounded-lg w-32 focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                     color: "white", boxShadow: companyId ? "0 0 0 1px var(--green)" : undefined }}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ background: "var(--bg-base)" }}>
        {messages.map((m, i) => <Message key={i} msg={m} />)}

        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#4b5563", animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested prompts (shown when empty) */}
      {messages.length === 1 && (
        <div className="px-6 pb-3 flex gap-2 flex-wrap">
          {[
            "Which startup has the best LTV:CAC ratio?",
            "Compare all companies by churn rate",
            "Which company should I invest in first?",
            "Summarise the key risks across the portfolio",
          ].map(prompt => (
            <button key={prompt} onClick={() => { setInput(prompt); }}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                       color: "#6b7280" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(61,220,132,0.4)"; e.currentTarget.style.color = "var(--green)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "#6b7280"; }}>
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 pt-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "#111111" }}>
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your portfolio…"
            rows={2}
            className="flex-1 px-4 py-3 text-sm rounded-xl resize-none focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)",
                     color: "white", lineHeight: "1.5",
                     boxShadow: input ? "0 0 0 1px var(--green)" : undefined }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading}
            className="shrink-0 px-5 py-3 text-sm font-bold rounded-xl transition-opacity disabled:opacity-40"
            style={{ background: "var(--green)", color: "#0f0f0f" }}>
            Send
          </button>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "#374151" }}>
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
