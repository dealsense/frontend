"use client";
import { useState } from "react";
import ChatWidget from "@/components/ChatWidget";

export default function FloatingChatWidget({ companyId = null, title = "AI Analyst Chat" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        aria-label={open ? "Close chat" : "Open chat"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-transform hover:scale-105 font-black text-xl"
        style={{ background: "var(--green)", color: "#0f0f0f", boxShadow: "0 4px 20px rgba(61,220,132,0.4)" }}>
        {open ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          "D"
        )}
      </button>
      {/* Always mounted (just hidden), not conditionally rendered — otherwise closing the
          popup unmounts ChatWidget and wipes its in-memory conversation every time. */}
      <div className="fixed bottom-24 right-5 z-50 rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: "380px", height: "520px", maxWidth: "calc(100vw - 2.5rem)", maxHeight: "calc(100vh - 7rem)",
          display: open ? "block" : "none",
        }}>
        <ChatWidget companyId={companyId} title={title} />
      </div>
    </>
  );
}
