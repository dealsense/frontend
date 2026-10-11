"use client";
import { marketSize, compact } from "@/lib/format";

// Deck-extracted TAM/SAM/SOM text is a full sentence ("Indian Luxury Market is
// expected to reach Rs. 82,186 crore by 2027..."), not just a number — bolding
// the whole thing made it unreadable. Pull out the figure as a standalone headline
// and keep the sentence as smaller supporting detail underneath.
const _NUMBER_RE = /(₹|Rs\.?|\$)\s?[\d,]+(?:\.\d+)?\s?(?:crore|cr\.?|lakh|lac|billion|bn|million|mn|b|m|k|%)?|\b\d+(?:\.\d+)?\s?(?:crore|cr\.?|lakh|lac|billion|bn|million|mn|x|%)\b/gi;

function _headlineFigure(text, value) {
  if (text) {
    const m = text.match(_NUMBER_RE);
    if (m) return m[0];
  }
  if (value != null) return compact(value);
  return null;
}

function DeckMarket({ m }) {
  const sizes = [
    { key: "tam", label: "TAM", full: "Total Addressable Market", text: m.tam_text, value: m.tam_value },
    { key: "sam", label: "SAM", full: "Serviceable Addressable Market", text: m.sam_text, value: m.sam_value },
    { key: "som", label: "SOM", full: "Serviceable Obtainable Market", text: m.som_text, value: m.som_value },
  ].filter(s => s.text || s.value);

  return (
    <div className="space-y-4">
      {sizes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {sizes.map((s) => {
            const headline = _headlineFigure(s.text, s.value);
            const detail = marketSize(s.text, s.value, "");
            return (
              <div key={s.key} className="rounded-lg p-3.5" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <p className="text-xs font-bold font-mono mb-1.5 cursor-help" title={s.full} style={{ color: "var(--green)" }}>{s.label}</p>
                {headline && (
                  <p className="text-xl font-black mb-1.5" style={{ color: "var(--green)" }}>{headline}</p>
                )}
                {detail && detail !== headline && (
                  <p className="text-xs leading-relaxed" style={{ color: "#6b7280" }}>{detail}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {m.market_cagr_text && (
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg" style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)" }}>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#60a5fa" }}>Growth</span>
          <span className="text-sm" style={{ color: "white" }}>{m.market_cagr_text}</span>
        </div>
      )}
      {m.positioning_summary && (
        <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold mb-1" style={{ color: "#9ca3af" }}>Positioning</p>
          <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>{m.positioning_summary}</p>
        </div>
      )}
      {(m.key_drivers || m.key_trends) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          {m.key_drivers && (
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "var(--green)" }}>Drivers</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{m.key_drivers}</p>
            </div>
          )}
          {m.key_trends && (
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: "#60a5fa" }}>Trends</p>
              <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{m.key_trends}</p>
            </div>
          )}
        </div>
      )}
      {m.sources_note && (
        <p className="text-xs pt-1" style={{ color: "#4b5563" }}>Sources: {m.sources_note}</p>
      )}
    </div>
  );
}

function WebMarket({ w }) {
  const hasAny = w.tam_text || w.sam_text || w.market_cagr_text || w.key_drivers || w.key_trends;
  if (!hasAny) {
    return <p className="text-sm" style={{ color: "#4b5563" }}>No specific market data found via web search.</p>;
  }
  return (
    <div className="space-y-3">
      {w.tam_text && <p className="text-sm"><strong style={{ color: "white" }}>TAM: </strong><span style={{ color: "#9ca3af" }}>{w.tam_text}</span></p>}
      {w.sam_text && <p className="text-sm"><strong style={{ color: "white" }}>SAM: </strong><span style={{ color: "#9ca3af" }}>{w.sam_text}</span></p>}
      {w.market_cagr_text && <p className="text-sm"><strong style={{ color: "white" }}>Growth: </strong><span style={{ color: "#9ca3af" }}>{w.market_cagr_text}</span></p>}
      {w.key_drivers && <p className="text-xs" style={{ color: "#9ca3af" }}><strong style={{ color: "white" }}>Drivers: </strong>{w.key_drivers}</p>}
      {w.key_trends && <p className="text-xs" style={{ color: "#9ca3af" }}><strong style={{ color: "white" }}>Trends: </strong>{w.key_trends}</p>}
      {w.sources_note && <p className="text-xs pt-1" style={{ color: "#4b5563" }}>{w.sources_note}</p>}
    </div>
  );
}

export default function MarketAnalysisCard({ market, webData }) {
  const m = market?.[0] || {};
  const hasAny = m.tam_text || m.tam_value || m.sam_text || m.sam_value || m.som_text || m.som_value
    || m.market_cagr_text || m.key_drivers || m.key_trends || m.positioning_summary;
  if (!hasAny && !webData) return null;

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "#6b7280" }}>
        Market Opportunity{m.market_region ? ` · ${m.market_region}` : ""}
      </h3>

      {webData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold mb-3" style={{ color: "var(--green)" }}>📄 FROM DECK</p>
            {hasAny ? <DeckMarket m={m} /> : <p className="text-sm" style={{ color: "#4b5563" }}>Not stated in deck.</p>}
          </div>
          <div className="pt-4 md:pt-0 md:pl-6" style={{ borderTop: "1px solid var(--border)", borderLeft: "none" }}>
            <p className="text-xs font-bold mb-3" style={{ color: "#60a5fa" }}>🌐 FROM WEB SEARCH</p>
            <WebMarket w={webData} />
          </div>
        </div>
      ) : (
        <DeckMarket m={m} />
      )}
    </div>
  );
}
