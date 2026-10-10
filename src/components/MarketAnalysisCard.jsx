"use client";
import { marketSize } from "@/lib/format";

export default function MarketAnalysisCard({ market }) {
  const m = market?.[0] || {};
  const hasAny = m.tam_text || m.tam_value || m.sam_text || m.sam_value || m.som_text || m.som_value
    || m.market_cagr_text || m.key_drivers || m.key_trends || m.positioning_summary;
  if (!hasAny) return null;

  const sizes = [
    { label: "Total Addressable Market", text: m.tam_text, value: m.tam_value },
    { label: "Serviceable Addressable Market", text: m.sam_text, value: m.sam_value },
    { label: "Serviceable Obtainable Market", text: m.som_text, value: m.som_value },
  ].filter(s => s.text || s.value);

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "#6b7280" }}>
        Market Opportunity{m.market_region ? ` · ${m.market_region}` : ""}
      </h3>

      <div className="space-y-4">
        {sizes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {sizes.map((s, i) => (
              <div key={i}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>{s.label}</p>
                <p className="text-lg font-bold text-white">{marketSize(s.text, s.value, "")}</p>
              </div>
            ))}
          </div>
        )}

        {m.market_cagr_text && (
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Growth</p>
            <p className="text-sm" style={{ color: "white" }}>{m.market_cagr_text}</p>
          </div>
        )}

        {m.positioning_summary && (
          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Positioning</p>
            <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{m.positioning_summary}</p>
          </div>
        )}

        {(m.key_drivers || m.key_trends) && (
          <div className="pt-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
            {m.key_drivers && (
              <div className="flex gap-2 text-xs">
                <span className="shrink-0" style={{ color: "var(--green)" }}>›</span>
                <span style={{ color: "#9ca3af" }}><strong style={{ color: "white" }}>Drivers: </strong>{m.key_drivers}</span>
              </div>
            )}
            {m.key_trends && (
              <div className="flex gap-2 text-xs">
                <span className="shrink-0" style={{ color: "var(--blue)" }}>›</span>
                <span style={{ color: "#9ca3af" }}><strong style={{ color: "white" }}>Trends: </strong>{m.key_trends}</span>
              </div>
            )}
          </div>
        )}

        {m.sources_note && (
          <p className="text-xs pt-1" style={{ color: "#4b5563" }}>Sources: {m.sources_note}</p>
        )}
      </div>
    </div>
  );
}
