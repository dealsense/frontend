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
          : { background: "var(--bg-card)", border: "1px solid var(--border)",
              color: "#9ca3af", borderBottomLeftRadius: "4px" }}
      >
        {isUser ? (
          msg.content
        ) : renderError ? (
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        ) : (
          <ReactMarkdown
            rehypePlugins={[rehypeSanitize]}
            components={{
              h3: ({node, ...props}) => <p style={{ fontWeight: 700, color: "white", margin: "8px 0 4px" }} {...props} />,
              ul: ({node, ...props}) => <ul style={{ listStyle: "disc", paddingLeft: "1rem", margin: "4px 0" }} {...props} />,
              li: ({node, ...props}) => <li style={{ margin: "2px 0" }} {...props} />,
              p: ({node, ...props}) => <span style={{ display: "block", marginBottom: "4px" }} {...props} />,
              a: ({node, ...props}) => <a style={{color: 'var(--green)', textDecoration: 'underline'}} {...props} />,
            }}
            className="prose prose-sm prose-invert"
          >
            {msg.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function ChatWidget({ companyId = null, title = "AI Analyst Chat" }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: companyId
        ? "Hi! I'm DealSense AI. Ask me anything about this company — I'll analyze their traction, team, market, and investment potential."
        : "Hi! I'm DealSense AI. Ask me about your portfolio, any company, or investment trends."
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");

    // Add user message to chat
    const userMsg_obj = { role: "user", content: userMsg };
    setMessages((prev) => {
      const updated = [...prev, userMsg_obj];
      console.log("Added user message. Messages now:", updated);
      return updated;
    });

    setLoading(true);

    try {
      console.log("🔵 Sending chat request:", { message: userMsg, companyId, loading: true });
      const response = await api.chat(userMsg, companyId);
      console.log("🟢 Chat response received:", response);
      console.log("Response type:", typeof response);
      console.log("Response keys:", response ? Object.keys(response) : "null");

      if (!response) {
        throw new Error("No response from server");
      }

      if (response.response === undefined || response.response === null) {
        console.error("❌ Response field is empty:", response);
        throw new Error(`Invalid response format: ${JSON.stringify(response)}`);
      }

      const assistantMsg = {
        role: "assistant",
        content: String(response.response)
      };

      console.log("Adding assistant message:", assistantMsg);
      setMessages((prev) => {
        const updated = [...prev, assistantMsg];
        console.log("Messages after adding assistant response:", updated);
        return updated;
      });

    } catch (err) {
      console.error("❌ Chat error:", err);
      console.error("Error message:", err.message);
      console.error("Full error:", err);
      showToast(err.message || "Chat request failed", "error");
      setMessages((prev) => {
        const filtered = prev.slice(0, -1);
        console.log("Removed user message on error. Messages:", filtered);
        return filtered;
      });
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] rounded-xl border border-[#2a2a2a] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#2a2a2a] flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#2a2a2a] scrollbar-track-transparent">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-[var(--bg-card)] border border-[#2a2a2a]">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[#4b5563] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#4b5563] animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 rounded-full bg-[#4b5563] animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[#2a2a2a]">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            disabled={loading}
            rows={2}
            className="flex-1 bg-[#111] text-white text-sm rounded-lg px-3 py-2 border border-[#2a2a2a] focus:border-[var(--green)] focus:outline-none focus:ring-1 focus:ring-[var(--green)] resize-none"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1"
            style={{
              background: input.trim() ? "var(--green)" : "#2a2a2a",
              color: input.trim() ? "#0f0f0f" : "#6b7280",
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
