"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Enter the access password.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Incorrect password.");
      }
      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: "var(--bg-base)" }}>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-10 blur-[130px] pointer-events-none" style={{ background: "var(--green)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none" style={{ background: "var(--blue)" }} />

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-[rgba(61,220,132,0.15)]"
            style={{ background: "var(--green)", color: "#0f0f0f" }}
          >
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Deal<span style={{ color: "var(--green)" }}>Sense</span> AI
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-2)" }}>
            This preview is private — enter the access password to continue.
          </p>
        </div>

        <div className="ds-card shadow-2xl relative overflow-hidden backdrop-blur-md" style={{ background: "rgba(26, 26, 26, 0.75)" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 text-sm rounded-lg border flex items-center gap-2"
                style={{ background: "rgba(248, 113, 113, 0.08)", borderColor: "var(--red)", color: "var(--red)" }}>
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                Access Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-3 text-sm rounded-lg border bg-[#111] text-white focus:outline-none transition-all"
                style={{ borderColor: "var(--border)" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--green)"; e.target.style.boxShadow = "0 0 0 1px var(--green)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full ds-btn-green py-3 mt-2 flex items-center justify-center gap-2 font-bold cursor-pointer"
            >
              {loading ? "Checking…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GatePage() {
  return (
    <Suspense fallback={null}>
      <GateForm />
    </Suspense>
  );
}
