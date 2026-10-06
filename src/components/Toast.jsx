"use client";

import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl shadow-2xl border text-sm font-semibold pointer-events-auto cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
            style={{
              background: toast.type === "error" ? "rgba(248, 113, 113, 0.95)" : "rgba(61, 220, 132, 0.95)",
              borderColor: toast.type === "error" ? "var(--red)" : "var(--green)",
              color: "#0f0f0f",
              backdropFilter: "blur(8px)",
              animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base shrink-0">
                {toast.type === "error" ? "✕" : "✓"}
              </span>
              <span className="leading-snug">{toast.message}</span>
            </div>
            <button className="text-xs font-bold opacity-60 hover:opacity-100 transition-opacity">
              Dismiss
            </button>
          </div>
        ))}
      </div>
      {/* <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateY(1rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style> */}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
