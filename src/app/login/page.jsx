"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDemoCredentials = () => {
    setEmail("admin@dealsense.ai");
    setPassword("password123");
    setError("");
  };

  const validateEmail = (val) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await api.login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4" style={{ background: "var(--bg-base)" }}>
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-10 blur-[130px] pointer-events-none" style={{ background: "var(--green)" }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[120px] pointer-events-none" style={{ background: "var(--blue)" }} />

      <div className="w-full max-w-md relative z-10">
        {/* Brand logo & tagline */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mb-4 shadow-lg shadow-[rgba(61,220,132,0.15)]"
            style={{ background: "var(--green)", color: "#0f0f0f" }}
          >
            D
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Welcome to Deal<span style={{ color: "var(--green)" }}>Sense</span> AI
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-2)" }}>
            VC Deal Flow Platform & Smart Due Diligence
          </p>
        </div>

        {/* Login Card */}
        <div 
          className="ds-card shadow-2xl relative overflow-hidden backdrop-blur-md" 
          style={{ background: "rgba(26, 26, 26, 0.75)" }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div 
                className="p-3 text-sm rounded-lg border flex items-center gap-2" 
                style={{ background: "rgba(248, 113, 113, 0.08)", borderColor: "var(--red)", color: "var(--red)" }}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-2)" }}>
                Email Address
              </label>
              <input
                type="text"
                placeholder="analyst@firm.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                disabled={loading}
                className="w-full px-4 py-3 text-sm rounded-lg border bg-[#111] text-white focus:outline-none transition-all"
                style={{ 
                  borderColor: "var(--border)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--green)";
                  e.target.style.boxShadow = "0 0 0 1px var(--green)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-2)" }}>
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  disabled={loading}
                  className="w-full pl-4 pr-10 py-3 text-sm rounded-lg border bg-[#111] text-white focus:outline-none transition-all"
                  style={{ 
                    borderColor: "var(--border)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--green)";
                    e.target.style.boxShadow = "0 0 0 1px var(--green)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full ds-btn-green py-3 mt-2 flex items-center justify-center gap-2 font-bold cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#0f0f0f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          <div className="relative flex py-3 items-center mt-4">
            <div className="flex-grow border-t" style={{ borderColor: "var(--border)" }}></div>
            <span className="flex-shrink mx-4 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--border)" }}>Demo Access</span>
            <div className="flex-grow border-t" style={{ borderColor: "var(--border)" }}></div>
          </div>

          <button
            type="button"
            onClick={handleDemoCredentials}
            disabled={loading}
            className="w-full py-2.5 rounded-lg border text-xs font-semibold tracking-wider transition-colors hover:text-white"
            style={{
              borderColor: "var(--border)",
              background: "rgba(255, 255, 255, 0.02)",
              color: "var(--text-2)"
            }}
          >
            Use Demo Credentials
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm" style={{ color: "var(--text-2)" }}>
              Don't have an account?{" "}
              <Link href="/signup" className="font-semibold hover:text-white transition-colors" style={{ color: "var(--green)" }}>
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
