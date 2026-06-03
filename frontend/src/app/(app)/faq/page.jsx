"use client";
import { useState, useRef, useEffect } from "react";

// ── Data ───────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "traction",
    icon: "📊",
    title: "Traction & Business Metrics",
    terms: [
      { term: "ARR", full: "Annual Recurring Revenue",
        def: "Total recurring revenue normalised to a yearly figure. E.g., 100 customers paying ₹10K/month = ₹1.2Cr ARR.",
        why: "Primary health metric for SaaS; shows predictable, repeatable revenue." },
      { term: "MRR", full: "Monthly Recurring Revenue",
        def: "ARR ÷ 12. Tracks month-to-month revenue momentum and growth or contraction.",
        why: "Faster feedback loop than ARR; reveals early warning signals." },
      { term: "GMV", full: "Gross Merchandise Value",
        def: "Total value of all transactions on a platform before deducting commissions or fees.",
        why: "Key metric for marketplaces. Net revenue is a fraction of GMV — watch take-rate." },
      { term: "Burn Rate", full: "Monthly Cash Expenditure",
        def: "Net burn = total monthly spend minus revenue. Gross burn = total spend regardless of revenue.",
        why: "Drives fundraise urgency. High burn = frequent dilutive rounds." },
      { term: "Runway", full: "Months of Cash Remaining",
        def: "Cash on hand ÷ net monthly burn. ₹5Cr cash / ₹50L burn = 10 months runway.",
        why: "18–24 months is the target buffer. Below 6 months = distress territory.",
        badge: { label: "Target", value: "18–24 months" } },
      { term: "NRR", full: "Net Revenue Retention",
        def: "Revenue from existing customers (including expansions) minus churn, as % of starting revenue.",
        why: "The gold standard metric. >100% NRR means the company grows revenue even with no new customers.",
        badge: { label: "Best-in-class", value: "> 120%" } },
      { term: "DAU/MAU", full: "Daily / Monthly Active Users",
        def: "Count of unique users active on a product per day or month. DAU/MAU ratio = engagement score.",
        why: "High DAU:MAU (>0.5) signals a habit-forming product. Low = weak retention." },
    ],
  },
  {
    id: "unit-economics",
    icon: "💰",
    title: "Unit Economics",
    terms: [
      { term: "CAC", full: "Customer Acquisition Cost",
        def: "Total sales & marketing spend in a period ÷ new customers acquired. Includes salaries, ads, events.",
        why: "The cost to win one customer. Must be recovered within a reasonable payback period.",
        badge: { label: "Payback target", value: "< 12 months" } },
      { term: "LTV", full: "Customer Lifetime Value",
        def: "Projected total revenue from one customer over their lifetime. LTV = ARPU × Gross Margin ÷ Churn Rate.",
        why: "Sets the ceiling for how much you can spend on acquisition while staying profitable." },
      { term: "LTV:CAC", full: "Lifetime Value to Acquisition Ratio",
        def: "LTV ÷ CAC. For every ₹1 spent acquiring a customer, how many rupees are returned?",
        why: "The single most important unit economics metric. Below 1 = destroying value; above 5 = under-investing.",
        badge: { label: "Benchmark", value: "3x or higher" } },
      { term: "Churn", full: "Customer / Revenue Churn Rate",
        def: "% of customers (or revenue) lost in a given period. 3% monthly = 31% annual churn.",
        why: "The biggest value destroyer. Every 1% monthly churn eliminated has a huge compounding impact.",
        badge: { label: "Healthy", value: "< 2% monthly" } },
      { term: "Gross Margin", full: "Revenue minus Cost of Goods Sold",
        def: "(Revenue – COGS) ÷ Revenue. COGS includes hosting, support, fulfilment — varies by model.",
        why: "More margin = more money to invest in growth. SaaS: >70%. D2C: 40–60%. Marketplace: 60–80%.",
        badge: { label: "SaaS target", value: "> 70%" } },
      { term: "EBITDA", full: "Earnings Before Interest, Taxes, Depreciation, Amortisation",
        def: "Operational profitability proxy. Revenue – operating costs (excluding the 4 items above).",
        why: "Used to compare profitability across companies regardless of capital structure or tax regimes." },
      { term: "Payback Period", full: "CAC Payback in Months",
        def: "CAC ÷ (Monthly revenue per customer × Gross Margin). Time to recover what you spent acquiring a customer.",
        why: "Shorter = better cash efficiency. <12 months is excellent; >24 months strains cash flow." },
    ],
  },
  {
    id: "market",
    icon: "🌍",
    title: "Market Sizing",
    terms: [
      { term: "TAM", full: "Total Addressable Market",
        def: "The entire global revenue opportunity if you captured 100% of the market with your product.",
        why: "VCs want TAM > $500M for venture-scale returns. Defines the theoretical ceiling.",
        badge: { label: "VC threshold", value: "> $500M" } },
      { term: "SAM", full: "Serviceable Addressable Market",
        def: "Subset of TAM your product can realistically serve given geography, regulations, and segment focus.",
        why: "More credible than TAM. Should be at least 5–10x your 5-year revenue target." },
      { term: "SOM", full: "Serviceable Obtainable Market",
        def: "Realistic slice of SAM capturable in 3–5 years given competition and GTM capacity.",
        why: "Year 3–5 revenue target should roughly equal SOM. This is where execution is tested." },
      { term: "CAGR", full: "Compound Annual Growth Rate",
        def: "((End Value / Start Value)^(1/n) – 1) × 100. The annualised growth rate over n years.",
        why: "Market CAGR > 15% signals a high-growth sector that rewards early entry.",
        badge: { label: "High growth", value: "> 15% CAGR" } },
      { term: "GTM", full: "Go-to-Market Strategy",
        def: "The plan to bring a product to market — target segment, channels, sales motion, pricing.",
        why: "Many startups build good products but fail on GTM. Distribution moat is often harder to build than product moat." },
    ],
  },
  {
    id: "investment",
    icon: "💼",
    title: "Investment Terms",
    terms: [
      { term: "Pre-money", full: "Pre-money Valuation",
        def: "Agreed company value before new capital enters. Post-money = Pre-money + Investment.",
        why: "Determines dilution: ₹50Cr investment at ₹200Cr pre-money = 20% new equity issued." },
      { term: "Dilution", full: "Ownership Percentage Reduction",
        def: "When new shares are issued, existing holders' % decreases proportionally.",
        why: "Total dilution across all rounds matters. Founders should plan to retain ~20–30% at IPO." },
      { term: "Cap Table", full: "Capitalisation Table",
        def: "Spreadsheet of all shareholders, their share class, quantity, % ownership, and value.",
        why: "Governance document for all equity decisions. Messy cap tables signal poor early governance." },
      { term: "SAFE", full: "Simple Agreement for Future Equity",
        def: "Converts to equity at the next priced round, typically with a valuation cap and/or discount.",
        why: "Clean, fast, no debt. Industry standard for pre-seed and seed rounds in India and globally." },
      { term: "Term Sheet", full: "Non-binding Investment Offer",
        def: "Document outlining key deal terms: valuation, amount, ownership, board seats, pro-rata rights.",
        why: "Sets negotiation anchors. Non-binding but psychologically commits both parties to the deal." },
      { term: "Liq. Pref", full: "Liquidation Preference",
        def: "Investors get paid before common shareholders in an exit. 1x non-participating is standard.",
        why: "Participating preferences can significantly reduce founder/employee proceeds in moderate exits." },
      { term: "Pro-rata", full: "Pro-rata Rights",
        def: "Investor's right to invest in future rounds to maintain their ownership percentage.",
        why: "Valuable for investors in high-growth companies. Grant selectively to avoid governance complexity." },
      { term: "Convertible Note", full: "Debt Convertible to Equity",
        def: "Short-term loan that converts to equity at a future priced round, typically with a discount and cap.",
        why: "Deferred valuation negotiation. Has maturity date and interest — unlike a SAFE." },
    ],
  },
  {
    id: "grades",
    icon: "📈",
    title: "DealSense Investment Grades",
    terms: [
      { term: "A · 80–100", full: "Ready to Invest",
        def: "Strong unit economics (LTV:CAC >3x), experienced team, large market opportunity, clear growth trajectory, and solid financials.",
        why: "Proceed with full due diligence and term sheet. High conviction investment.",
        badge: { label: "Action", value: "Deep DD + Term Sheet" } },
      { term: "B · 60–79", full: "Watch List",
        def: "Good fundamentals with some gaps. Solid team and market but metrics need strengthening over 1–2 quarters.",
        why: "Track 2–3 key KPIs quarterly. Consider a small ticket once conviction is built.",
        badge: { label: "Action", value: "Monitor KPIs" } },
      { term: "C · 40–59", full: "Not Ready Yet",
        def: "Mixed signals across dimensions — may be too early, incomplete data, or warning signs in key metrics.",
        why: "Revisit after product milestones or traction inflection. Not investable at current stage.",
        badge: { label: "Action", value: "Revisit Later" } },
      { term: "D · 0–39", full: "Decline",
        def: "Weak fundamentals across multiple dimensions — poor unit economics, limited market, or team concerns.",
        why: "Not investable at current stage and valuation. Re-evaluate only if fundamentals change significantly.",
        badge: { label: "Action", value: "Decline" } },
    ],
  },
  {
    id: "bizmodel",
    icon: "🏗",
    title: "Business Model Types",
    terms: [
      { term: "SaaS", full: "Software as a Service",
        def: "Subscription-based software delivered over the internet. Revenue is recurring and highly predictable.",
        why: "Highest VC-valued model. Recurring revenue, high gross margins (70–90%), and strong scalability." },
      { term: "B2B", full: "Business to Business",
        def: "Products or services sold to other companies. Typically higher ACV, longer sales cycles, lower churn.",
        why: "Enterprise contracts provide revenue stability. Sales cycles are longer but LTV is much higher." },
      { term: "B2C", full: "Business to Consumer",
        def: "Products sold directly to individuals. Faster growth but higher CAC and churn vs B2B.",
        why: "Consumer virality can drive exponential growth, but unit economics are harder to make work at scale." },
      { term: "Marketplace", full: "Two-sided Platform",
        def: "Connects buyers and sellers, taking a commission (take-rate) on transactions. Key metric: GMV.",
        why: "Network effects create a powerful moat. Unit economics improve with liquidity and scale." },
      { term: "D2C", full: "Direct to Consumer",
        def: "Brands selling directly to consumers, bypassing traditional retail channels.",
        why: "Higher margins than wholesale, owns customer relationship. Requires heavy marketing investment." },
      { term: "Freemium", full: "Free + Premium Tiers",
        def: "Core product free, advanced features paid. Conversion rate from free → paid is the key metric.",
        why: "Low CAC at top of funnel; the challenge is converting enough free users to sustain the business." },
    ],
  },
];

// ── Components ─────────────────────────────────────────────────────────────────

function TermCard({ item }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      onClick={() => setOpen(o => !o)}
      className="rounded-xl cursor-pointer transition-all"
      style={{
        background: open ? "#1e1e1e" : "var(--bg-card)",
        border: `1px solid ${open ? "rgba(61,220,132,0.3)" : "var(--border)"}`,
        boxShadow: open ? "0 0 12px rgba(61,220,132,0.08)" : "none",
      }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-block px-2 py-0.5 rounded text-xs font-black font-mono mb-1.5"
              style={{ background: "var(--green-dim)", color: "var(--green)" }}>
              {item.term}
            </span>
            <p className="text-sm font-semibold text-white leading-tight">{item.full}</p>
          </div>
          <svg
            className={`w-4 h-4 shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`}
            style={{ color: "#4b5563" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Short definition always visible */}
        <p className="text-xs mt-2 leading-relaxed"
          style={{ color: open ? "#9ca3af" : "#6b7280" }}>
          {item.def}
        </p>
      </div>

      {/* Expanded: why it matters + badge */}
      {open && (
        <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs leading-relaxed mb-3" style={{ color: "#6b7280" }}>
            <span style={{ color: "var(--green)" }}>Why it matters — </span>
            {item.why}
          </p>
          {item.badge && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(61,220,132,0.3)" }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {item.badge.label}: {item.badge.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GlossaryPage() {
  const [search, setSearch]       = useState("");
  const [activeId, setActiveId]   = useState(SECTIONS[0].id);
  const sectionRefs               = useRef({});

  const q = search.toLowerCase().trim();
  const filtered = SECTIONS.map(s => ({
    ...s,
    terms: s.terms.filter(t =>
      !q ||
      t.term.toLowerCase().includes(q) ||
      t.full.toLowerCase().includes(q) ||
      t.def.toLowerCase().includes(q)
    ),
  })).filter(s => s.terms.length > 0);

  // Scroll to section
  const scrollTo = (id) => {
    setActiveId(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const totalTerms = SECTIONS.reduce((n, s) => n + s.terms.length, 0);
  const shownTerms = filtered.reduce((n, s) => n + s.terms.length, 0);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left nav ───────────────────────────────────────────────────────── */}
      <aside className="w-56 shrink-0 flex flex-col overflow-y-auto"
        style={{ borderRight: "1px solid var(--border)", background: "#111111" }}>

        <div className="px-4 pt-6 pb-4">
          <h1 className="text-sm font-bold text-white">Glossary</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
            {totalTerms} key terms
          </p>
        </div>

        {/* Search */}
        <div className="px-3 pb-4">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
              style={{ color: "#4b5563" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 text-xs focus:outline-none"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "white",
                boxShadow: search ? "0 0 0 1px var(--green)" : undefined,
              }}
            />
          </div>
        </div>

        {/* Category nav */}
        <nav className="flex-1 px-2 space-y-0.5">
          {SECTIONS.map(s => {
            const count = filtered.find(f => f.id === s.id)?.terms.length ?? 0;
            const isActive = activeId === s.id;
            return (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors text-left"
                style={isActive
                  ? { background: "var(--green-dim)", color: "var(--green)" }
                  : { color: count === 0 ? "#374151" : "#9ca3af" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#1e1e1e"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = ""; }}
              >
                <span className="flex items-center gap-2 font-medium">
                  <span>{s.icon}</span>
                  <span className="truncate">{s.title.split(" ").slice(1).join(" ")}</span>
                </span>
                <span className="shrink-0 text-xs" style={{ color: isActive ? "var(--green)" : "#4b5563" }}>
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 mt-auto" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs" style={{ color: "#374151" }}>
            {q ? `${shownTerms} of ${totalTerms} shown` : `${totalTerms} terms`}
          </p>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-4xl mb-4">🔍</p>
            <p className="text-white font-semibold">No results for "{search}"</p>
            <p className="text-sm mt-1" style={{ color: "#4b5563" }}>
              Try a different term — e.g. LTV, TAM, churn
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map(section => (
              <section key={section.id} ref={el => (sectionRefs.current[section.id] = el)}>
                {/* Section header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl">{section.icon}</span>
                  <h2 className="text-base font-bold text-white">{section.title}</h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: "var(--green-dim)", color: "var(--green)" }}>
                    {section.terms.length}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border)" }} />
                </div>

                {/* Term cards grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {section.terms.map(item => (
                    <TermCard key={item.term} item={item} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
