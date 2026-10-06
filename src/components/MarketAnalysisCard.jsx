"use client";
import { marketSize } from "@/lib/format";

export default function MarketAnalysisCard({ company, market }) {
  const m = market?.[0] || {};

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "#6b7280" }}>Market Opportunity</h3>

      <div className="space-y-4">
        {/* Market Size */}
        {m.market_size_usd && (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Total Addressable Market</p>
            <p className="text-lg font-bold text-white">{marketSize(m.market_size_usd)}</p>
          </div>
        )}

        {/* Growth Rate */}
        {m.market_growth_rate_pct && (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Market Growth Rate</p>
            <div className="flex items-baseline gap-2">
              <p className="text-lg font-bold" style={{ color: m.market_growth_rate_pct > 10 ? "var(--green)" : "#60a5fa" }}>
                {m.market_growth_rate_pct.toFixed(1)}%
              </p>
              <span className="text-xs" style={{ color: "#4b5563" }}>annually</span>
            </div>
          </div>
        )}

        {/* Market Maturity */}
        {m.market_maturity && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#9ca3af" }}>Market Stage</p>
            <div className="inline-block px-3 py-1 rounded-full text-xs font-medium"
              style={{
                background: m.market_maturity === "Emerging" ? "rgba(96,165,250,0.1)" :
                           m.market_maturity === "Growing" ? "rgba(61,220,132,0.1)" : "rgba(251,191,36,0.1)",
                color: m.market_maturity === "Emerging" ? "#60a5fa" :
                       m.market_maturity === "Growing" ? "var(--green)" : "#fbbf24",
              }}>
              {m.market_maturity}
            </div>
          </div>
        )}

        {/* Competitive Intensity */}
        {m.competitive_intensity && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: "#9ca3af" }}>Competitive Landscape</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                <div className="h-full" style={{
                  width: m.competitive_intensity === "Low" ? "33%" :
                         m.competitive_intensity === "Medium" ? "66%" : "100%",
                  background: m.competitive_intensity === "Low" ? "var(--green)" :
                             m.competitive_intensity === "Medium" ? "#fbbf24" : "#f87171",
                }} />
              </div>
              <span className="text-xs font-bold w-16">{m.competitive_intensity}</span>
            </div>
          </div>
        )}

        {/* Key Insights */}
        <div className="pt-3 border-t border-[#2a2a2a]">
          <ul className="space-y-2 text-xs" style={{ color: "#9ca3af" }}>
            {company?.industry && (
              <li className="flex gap-2">
                <span style={{ color: "var(--green)" }}>›</span>
                <span><strong>Industry:</strong> {company.industry}</span>
              </li>
            )}
            {m.key_market_drivers && (
              <li className="flex gap-2">
                <span style={{ color: "var(--green)" }}>›</span>
                <span><strong>Growth drivers:</strong> {m.key_market_drivers}</span>
              </li>
            )}
            {m.market_threats && (
              <li className="flex gap-2">
                <span style={{ color: "#f87171" }}>›</span>
                <span><strong>Risks:</strong> {m.market_threats}</span>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
