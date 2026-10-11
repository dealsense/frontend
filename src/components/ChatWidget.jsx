"use client";
import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import { useToast } from "@/components/Toast";

function Message({ msg }) {
  const isUser = msg.role === "user";
  const [renderError, setRenderError] = useState(false);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
        style={isUser
          ? { background: "var(--green)", color: "#0f0f0f", borderBottomRightRadius: "4px" }
          : { background: "#f3f4f6", border: "1px solid #e5e7eb",
              color: "#111827", borderBottomLeftRadius: "4px" }}
      >
        {isUser ? (
          msg.content
        ) : renderError ? (
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              h3: ({node, ...props}) => <p style={{ fontWeight: 700, color: "#000", margin: "8px 0 4px" }} {...props} />,
              strong: ({node, ...props}) => <strong style={{ color: "#000", fontWeight: 700 }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ listStyle: "disc", paddingLeft: "1rem", margin: "4px 0" }} {...props} />,
              li: ({node, ...props}) => <li style={{ margin: "2px 0" }} {...props} />,
              p: ({node, ...props}) => <span style={{ display: "block", marginBottom: "4px" }} {...props} />,
              a: ({node, ...props}) => <a style={{color: '#15803d', textDecoration: 'underline'}} {...props} />,
            }}
            className="prose prose-sm"
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

const ASSISTANT_NAME = "Dia";

const GREETING = (companyId) => ({
  role: "assistant",
  content: companyId
    ? `Hi! I'm ${ASSISTANT_NAME}. Ask me anything about this company — I'll analyze their traction, team, market, and investment potential.`
    : `Hi! I'm ${ASSISTANT_NAME}. Ask me about your portfolio, any company, or investment trends.`,
});

const SUGGESTED_QUESTIONS_COMPANY = [
  "What's the investment thesis in 3 sentences?",
  "What are the biggest risks here?",
  "How does this compare to its competitors?",
  "Summarize the team's background",
];
const SUGGESTED_QUESTIONS_PORTFOLIO = [
  "Which companies need attention this week?",
  "Summarize my portfolio by sector",
  "What are common risks across my deals?",
];

function scope(companyId) {
  return companyId || "portfolio";
}
function sessionsKey(companyId) {
  return `ds_chat_sessions_${scope(companyId)}`;
}
function activeKey(companyId) {
  return `ds_chat_active_${scope(companyId)}`;
}

function newSession(companyId) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title: null, // derived from first user message once sent
    messages: [GREETING(companyId)],
    updatedAt: Date.now(),
  };
}

// A session with nothing but the greeting is "blank" — it shouldn't clutter history
// as a "New chat" entry until the person has actually asked something in it.
function isBlank(session) {
  return !session || session.messages.length <= 1;
}

function loadSessions(companyId) {
  try {
    const raw = localStorage.getItem(sessionsKey(companyId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return [newSession(companyId)];
}

function saveSessions(companyId, sessions) {
  try { localStorage.setItem(sessionsKey(companyId), JSON.stringify(sessions)); } catch {}
}

function loadActiveId(companyId, sessions) {
  try {
    const id = localStorage.getItem(activeKey(companyId));
    if (id && sessions.some(s => s.id === id)) return id;
  } catch {}
  return sessions[0]?.id;
}

function saveActiveId(companyId, id) {
  try { localStorage.setItem(activeKey(companyId), id); } catch {}
}

function relativeTime(ts) {
  const diffMin = Math.round((Date.now() - ts) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function ChatWidget({ companyId = null, title = "AI Analyst Chat" }) {
  // Per-viewer convenience only (not shared/critical state) — survives a page reload.
  // activeId must be derived from the SAME sessions array `sessions` was initialized
  // with — calling loadSessions(companyId) a second time here would mint a brand-new
  // session (fresh random id) when none existed yet, so activeId would point at a
  // session that was never actually in `sessions`. Every updateActiveSession() call
  // would then silently no-op (.map() finds no match) — messages looked like they
  // were "sending" (loading state flips, suggestions hide) but never actually saved.
  const [sessions, setSessions] = useState(() => loadSessions(companyId));
  const [activeId, setActiveId] = useState(() => loadActiveId(companyId, sessions));
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  const active = sessions.find(s => s.id === activeId) || sessions[0];
  const messages = active?.messages || [GREETING(companyId)];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const updateActiveSession = (updater) => {
    setSessions(prev => {
      const next = prev.map(s => s.id === activeId ? { ...s, ...updater(s), updatedAt: Date.now() } : s);
      saveSessions(companyId, next);
      return next;
    });
  };

  const handleSend = async (overrideText) => {
    const userMsg = (overrideText ?? input).trim();
    if (!userMsg || loading) return;
    setInput("");

    // Prior turns (excluding the greeting, which is a UI nicety not a real exchange),
    // capped to the last 12 — without this, every message was answered with zero
    // memory of what came before, so a follow-up like "what about from the web" had
    // nothing to anchor to.
    const history = messages.slice(1).slice(-12).map(m => ({ role: m.role, content: m.content }));

    updateActiveSession(s => ({
      messages: [...s.messages, { role: "user", content: userMsg }],
      title: s.title || userMsg.slice(0, 48),
    }));
    setLoading(true);

    try {
      const response = await api.chat(userMsg, companyId, history);
      if (!response || response.response === undefined || response.response === null) {
        throw new Error("Invalid response from server");
      }
      updateActiveSession(s => ({ messages: [...s.messages, { role: "assistant", content: String(response.response) }] }));
    } catch (err) {
      showToast(err.message || "Chat request failed", "error");
      updateActiveSession(s => ({ messages: s.messages.slice(0, -1) })); // drop the user message so they can retry
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    // Already sitting on a blank chat — don't pile up empty "New chat" entries.
    if (isBlank(active)) { setShowHistory(false); return; }
    const fresh = newSession(companyId);
    setSessions(prev => {
      const next = [fresh, ...prev];
      saveSessions(companyId, next);
      return next;
    });
    setActiveId(fresh.id);
    saveActiveId(companyId, fresh.id);
    setShowHistory(false);
  };

  const switchToSession = (id) => {
    setActiveId(id);
    saveActiveId(companyId, id);
    setShowHistory(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Blank sessions (opened but never used) don't show up as "New chat" clutter in history.
  const pastSessions = sessions
    .filter(s => s.id !== activeId && !isBlank(s))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-[#e5e7eb] overflow-hidden relative">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#e5e7eb] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
        <h3 className="text-sm font-bold text-black flex-1 truncate">{title}</h3>
        <button onClick={() => setShowHistory(s => !s)}
          aria-label="Chat history"
          className="p-1.5 rounded-lg transition-colors hover:bg-[#f3f4f6] shrink-0"
          style={{ color: showHistory ? "#15803d" : "#6b7280" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button onClick={startNewChat} aria-label="New chat"
          className="p-1.5 rounded-lg transition-colors hover:bg-[#f3f4f6] shrink-0"
          style={{ color: "#6b7280" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* History dropdown */}
      {showHistory && (
        <div className="absolute top-12 right-2 left-2 z-10 rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto"
          style={{ background: "white", border: "1px solid #e5e7eb" }}>
          <button onClick={startNewChat}
            className="w-full text-left px-3 py-2.5 text-sm font-semibold transition-colors hover:bg-[#f3f4f6]"
            style={{ color: "#15803d", borderBottom: "1px solid #e5e7eb" }}>
            + New chat
          </button>
          {pastSessions.length === 0 ? (
            <p className="px-3 py-3 text-xs" style={{ color: "#9ca3af" }}>No past conversations yet.</p>
          ) : (
            pastSessions.map(s => (
              <button key={s.id} onClick={() => switchToSession(s.id)}
                className="w-full text-left px-3 py-2.5 transition-colors hover:bg-[#f3f4f6]"
                style={{ borderBottom: "1px solid #e5e7eb" }}>
                <p className="text-xs font-semibold text-black truncate">{s.title || "New chat"}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{relativeTime(s.updatedAt)}</p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#e5e7eb] scrollbar-track-transparent"
        onClick={() => showHistory && setShowHistory(false)}>
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#9ca3af] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-[#9ca3af] animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        {messages.length === 1 && !loading && (
          <div className="flex flex-col gap-1.5 pt-1">
            {(companyId ? SUGGESTED_QUESTIONS_COMPANY : SUGGESTED_QUESTIONS_PORTFOLIO).map((q, i) => (
              <button key={i} onClick={() => handleSend(q)}
                className="text-left text-xs px-3 py-2 rounded-lg transition-colors hover:border-[var(--green)]"
                style={{ background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#e5e7eb]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={loading}
            rows={2}
            className="flex-1 bg-white text-black text-sm rounded-lg px-3 py-2 border border-[#e5e7eb] focus:border-[var(--green)] focus:outline-none focus:ring-1 focus:ring-[var(--green)] resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1"
            style={{
              background: input.trim() ? "var(--green)" : "#e5e7eb",
              color: input.trim() ? "#0f0f0f" : "#9ca3af",
              cursor: input.trim() ? "pointer" : "not-allowed",
            }}
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
