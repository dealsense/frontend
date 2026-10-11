"use client";
import { useEffect, useState } from "react";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import PipelinePanel from "@/components/PipelinePanel";
import InvestmentScoreCard from "@/components/InvestmentScoreCard";
import MarketAnalysisCard from "@/components/MarketAnalysisCard";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { compact, cr, inr, marketSize } from "@/lib/format";
import { useToast } from "@/components/Toast";

// ── Primitives ─────────────────────────────────────────────────────────────────

function Tile({ children, style = {}, className = "" }) {
  return (
    <div className={`rounded-xl p-5 ${className}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)", ...style }}>
      {children}
    </div>
  );
}

function TileLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6b7280" }}>{children}</p>;
}

// Content-heavy tiles (News, DD Checklist, Financials) can take real vertical space —
// let the user collapse them instead of scrolling past. Defaults open on first view.
// Controlled mode: pass `open` + `onToggle` to drive it externally (e.g. a shared
// "collapse all" control); omit both to fall back to independent internal state.
function CollapsibleTile({ label, badge, defaultOpen = true, open: openProp, onToggle, children }) {
  const [openState, setOpenState] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const toggle = isControlled ? onToggle : () => setOpenState(o => !o);
  return (
    <Tile>
      <button onClick={toggle}
        className="w-full flex items-center justify-between mb-3 -mt-1 -mb-1 group">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#6b7280" }}>
          {label}{badge ? <span className="normal-case tracking-normal ml-1.5" style={{ color: "var(--green)" }}>{badge}</span> : null}
        </p>
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          style={{ color: "#4b5563" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && children}
    </Tile>
  );
}

function Badge({ children, color = "gray" }) {
  const s = {
    blue:   { background: "rgba(96,165,250,0.1)",  color: "#60a5fa" },
    purple: { background: "rgba(167,139,250,0.1)", color: "#a78bfa" },
    green:  { background: "var(--green-dim)",      color: "var(--green)" },
    gray:   { background: "#1e1e1e",               color: "#6b7280" },
    amber:  { background: "rgba(251,191,36,0.1)",  color: "#fbbf24" },
  };
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium" style={s[color] || s.gray}>{children}</span>;
}

// ── Pipeline Status Pill (compact header trigger for the full PipelinePanel) ───

const PIPELINE_STATUS_META = {
  interested:  { label: "Interested",  color: "#60a5fa" },
  evaluating:  { label: "Evaluating",  color: "#fbbf24" },
  negotiating: { label: "Negotiating", color: "#a78bfa" },
  closed:      { label: "Closed",      color: "var(--green)" },
  rejected:    { label: "Rejected",    color: "#f87171" },
};

function PipelineStatusPill({ pipeline, onClick }) {
  const meta = PIPELINE_STATUS_META[pipeline?.status] || { label: "No status", color: "#4b5563" };
  return (
    <button onClick={onClick}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
      style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}40` }}>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
      {meta.label}
    </button>
  );
}

function PipelineModal({ companyId, initialData, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <PipelinePanel companyId={companyId} initialData={initialData} />
        <button onClick={onClose}
          className="w-full mt-2 py-2 text-xs font-semibold rounded-lg transition-colors"
          style={{ border: "1px solid var(--border)", color: "#9ca3af" }}>
          Close
        </button>
      </div>
    </div>
  );
}

// ── Score Gauge ────────────────────────────────────────────────────────────────

function ScoreGauge({ score, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-28 h-28 rounded-full animate-pulse" style={{ background: "#2a2a2a" }} />
        <p className="text-xs animate-pulse" style={{ color: "#4b5563" }}>Scoring…</p>
      </div>
    );
  }
  if (!score) return null;

  const val = score.total_score ?? 0;
  const r = 44, circ = 2 * Math.PI * r;
  const filled = Math.min(val / 100, 1) * circ;
  const g = score.investment_grade;
  const color = g === "A" ? "var(--green)" : g === "B" ? "#60a5fa" : g === "C" ? "#fbbf24" : "#f87171";
  const label = g === "A" ? "INVEST" : g === "B" ? "WATCH" : g === "C" ? "NOT READY" : "DECLINE";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: 110, height: 110 }}>
        <svg width="110" height="110" viewBox="0 0 100 100" className="absolute inset-0"
          style={{ transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2a2a2a" strokeWidth="7" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="7"
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-white leading-none">{val}</span>
          <span className="text-xs font-bold" style={{ color }}>/{g}</span>
        </div>
      </div>
      <p className="text-xs font-bold tracking-widest" style={{ color }}>{label}</p>
    </div>
  );
}

// ── Insight Box (Strengths + Risks) ───────────────────────────────────────────

function _parseJsonArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string" || !v.trim()) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function InsightBox({ data }) {
  const tractionHistory = data?.traction || [];
  const t    = _mostComplete(tractionHistory);
  const m    = (data?.market        || [])[0] || {};
  const sc   = data?.score;
  const team = data?.team || [];
  const competitors = data?.competitors || [];

  // AI reads everything (traction, team, market, financials, fundraise, competitors)
  // together and writes 2-4 crisp bullets each, the way an analyst actually would —
  // this replaced the old per-metric threshold checks below, which are now only a
  // fallback for scores computed before this existed (or if the AI call failed).
  const aiStrengths = _parseJsonArray(sc?.ai_strengths);
  const aiRisks = _parseJsonArray(sc?.ai_risks);
  if (aiStrengths.length || aiRisks.length) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl p-4"
          style={{ background: "rgba(61,220,132,0.04)", border: "1px solid rgba(61,220,132,0.15)" }}>
          <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--green)" }}>
            <span>✅</span> STRENGTHS
          </p>
          <ul className="space-y-2">
            {(aiStrengths.length ? aiStrengths : ["No clear strengths identified from available data"]).map((p, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#9ca3af" }}>
                <span className="shrink-0 mt-0.5" style={{ color: "var(--green)" }}>+</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-4"
          style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }}>
          <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#f87171" }}>
            <span>⚠️</span> RISKS
          </p>
          <ul className="space-y-2">
            {(aiRisks.length ? aiRisks : ["No major risks identified from available data"]).map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#9ca3af" }}>
                <span className="shrink-0 mt-0.5" style={{ color: "#f87171" }}>–</span>{r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // ── Fallback: rule-based heuristics (pre-AI scores, or AI call failed) ──────
  const positives = [];
  // Risk candidates carry a severity so the list can be ranked and capped —
  // comparative/trend-based signals (computed from more than one data point)
  // are weighted above single-metric threshold checks.
  const riskCandidates = [];
  const addRisk = (text, severity = 1) => riskCandidates.push({ text, severity });

  // Revenue
  if (t.net_revenue_cr >= 10)     positives.push(`Strong revenue ${cr(t.net_revenue_cr)}`);
  else if (t.net_revenue_cr >= 1) positives.push(`${cr(t.net_revenue_cr)} revenue with growth runway`);
  else if (t.net_revenue_cr != null && t.net_revenue_cr < 0.5) addRisk("Revenue below ₹50L — early traction", 1);

  // LTV:CAC
  if (t.ltv_cac_ratio >= 3)      positives.push(`Excellent LTV:CAC of ${t.ltv_cac_ratio}x`);
  else if (t.ltv_cac_ratio >= 2) positives.push(`Healthy LTV:CAC ratio of ${t.ltv_cac_ratio}x`);
  else if (t.ltv_cac_ratio != null && t.ltv_cac_ratio < 1.5) addRisk(`Weak unit economics — LTV:CAC ${t.ltv_cac_ratio}x`, 2);

  // Churn
  if (t.churn_rate_pct != null && t.churn_rate_pct < 3)   positives.push(`Very low churn ${t.churn_rate_pct}%`);
  else if (t.churn_rate_pct != null && t.churn_rate_pct > 15) addRisk(`High churn rate of ${t.churn_rate_pct}%`, 2);
  else if (t.churn_rate_pct != null && t.churn_rate_pct > 8)  addRisk(`Elevated churn ${t.churn_rate_pct}% needs attention`, 1);

  // Gross margin
  if (t.gross_margin_pct >= 60)   positives.push(`High gross margin ${t.gross_margin_pct}%`);
  else if (t.gross_margin_pct != null && t.gross_margin_pct < 20) addRisk(`Low gross margin ${t.gross_margin_pct}%`, 1);

  // Growth trend — compares consecutive periods against each other (not a fixed
  // threshold), and against the market's own CAGR when the deck states one.
  const gmvHistory = tractionHistory
    .map(r => r.gross_gmv_cr != null ? Number(r.gross_gmv_cr) : null)
    .filter(v => v != null && !Number.isNaN(v));
  if (gmvHistory.length >= 2) {
    const latest = gmvHistory[0], prior = gmvHistory[1];
    const yoyPct = prior > 0 ? Math.round(((latest - prior) / prior) * 100) : null;
    if (yoyPct != null) {
      if (yoyPct < 0) addRisk(`GMV declined ${Math.abs(yoyPct)}% year-over-year`, 3);
      else if (m.market_cagr_value != null && yoyPct < m.market_cagr_value) {
        addRisk(`Growing ${yoyPct}% YoY — slower than the ${m.market_cagr_value}% market CAGR`, 2);
      } else if (yoyPct >= 50) {
        positives.push(`GMV up ${yoyPct}% year-over-year`);
      }
    }
  }

  // Team
  const founders = team.filter(m => m.is_founder);
  if (founders.length >= 2)  positives.push(`${founders.length} co-founders with complementary skills`);
  else if (!team.length)     addRisk("No team data available for evaluation", 2);

  // Market
  if (m.tam_value >= 1000)   positives.push(`Large TAM of ${marketSize(m.tam_text, m.tam_value)}`);
  if (m.market_cagr_value >= 20) positives.push(`High market growth rate ${m.market_cagr_value}%`);

  // Competitive landscape — compared against how many rivals are actually documented,
  // not just a missing/present check.
  if (competitors.length >= 5) addRisk(`Crowded field — ${competitors.length} competitors documented`, 2);
  else if (competitors.length === 0) addRisk("Competitive landscape not documented", 1);

  // Score dimensions
  if (sc?.score_financials != null && sc.score_financials < 5) addRisk("Limited financial data provided", 1);
  if (!data?.dd_checklist?.length) addRisk("Due diligence checklist not yet generated", 1);

  // Rank by severity (most significant first) and keep it concise — a wall of every
  // applicable caveat is harder to act on than the handful that actually matter most.
  const risks = riskCandidates
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 4)
    .map(r => r.text);

  // Fill if empty
  if (!positives.length) positives.push("Upload a pitch deck to generate AI-powered insights");
  if (!risks.length)     risks.push("No major risks identified from available data");

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-xl p-4"
        style={{ background: "rgba(61,220,132,0.04)", border: "1px solid rgba(61,220,132,0.15)" }}>
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--green)" }}>
          <span>✅</span> STRENGTHS
        </p>
        <ul className="space-y-2">
          {positives.map((p, i) => (
            <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#9ca3af" }}>
              <span className="shrink-0 mt-0.5" style={{ color: "var(--green)" }}>+</span>{p}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl p-4"
        style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }}>
        <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "#f87171" }}>
          <span>⚠️</span> RISKS
        </p>
        <ul className="space-y-2">
          {risks.map((r, i) => (
            <li key={i} className="text-sm flex items-start gap-2" style={{ color: "#9ca3af" }}>
              <span className="shrink-0 mt-0.5" style={{ color: "#f87171" }}>−</span>{r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Problem / Solution ─────────────────────────────────────────────────────────

function ProblemSolutionTile({ company }) {
  const problem  = company?.problem_statement;
  const solution = company?.solution_description;
  if (!problem && !solution) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Tile>
        <TileLabel>Problem</TileLabel>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          {problem || "Not specified in deck"}
        </p>
      </Tile>
      <Tile>
        <TileLabel>Solution</TileLabel>
        <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
          {solution || "Not specified in deck"}
        </p>
      </Tile>
    </div>
  );
}

// ── Revenue Bar Chart ──────────────────────────────────────────────────────────

function RevenueChart({ traction }) {
  const rows = [...(traction || [])].reverse().slice(0, 7);
  if (!rows.length) return <p className="text-sm py-8 text-center" style={{ color: "#4b5563" }}>No revenue data.</p>;

  // Revenue isn't always extracted even when GMV is (common for marketplaces/early-stage
  // decks that lead with GMV) — falling back to all-zero and calling that "declining" is
  // actively misleading. Use whichever metric actually has real (non-null) values.
  const hasRevenue = rows.some(r => r.net_revenue_cr != null);
  const metricKey  = hasRevenue ? "net_revenue_cr" : "gross_gmv_cr";
  const metricLabel = hasRevenue ? "Revenue" : "GMV";

  const vals = rows.map(r => r[metricKey] != null ? Number(r[metricKey]) : null);
  if (vals.every(v => v == null)) {
    return <p className="text-sm py-8 text-center" style={{ color: "#4b5563" }}>No revenue or GMV data.</p>;
  }
  const knownVals = vals.filter(v => v != null);
  const maxV  = Math.max(...knownVals, 0.1);
  const first = vals.find(v => v != null);
  const last  = [...vals].reverse().find(v => v != null);
  const hasVariation = knownVals.length > 1 && first !== last;
  const trend = hasVariation && last > first;

  return (
    <div>
      <div className="flex items-end gap-1.5 mb-2">
        {rows.map((r, i) => {
          const v = vals[i];
          const h = v != null ? Math.max((v / maxV) * 100, 3) : 0;
          const pct = v != null && first ? ((v - first) / first) * 100 : 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                text-xs px-2 py-0.5 rounded whitespace-nowrap z-10"
                style={{ background: "var(--bg-card2)", color: "var(--green)", border: "1px solid var(--border)" }}>
                {v != null ? `₹${v}Cr${i > 0 && pct !== 0 ? ` (${pct > 0 ? "+" : ""}${pct.toFixed(0)}%)` : ""}` : "No data"}
              </div>
              {/* Fixed-height track so the bar's percentage height has something to resolve against —
                  a percentage height with no sized ancestor collapses to 0. */}
              <div className="w-full h-28 flex items-end">
                <div className="w-full rounded-t transition-all"
                  style={{ height: v != null ? `${h}%` : "3%",
                    background: v != null
                      ? `linear-gradient(to top, rgba(61,220,132,0.9), rgba(61,220,132,0.3))`
                      : "#2a2a2a",
                    boxShadow: v != null && i === vals.length - 1 ? "0 0 8px rgba(61,220,132,0.4)" : "none" }} />
              </div>
              {r.period_label && (
                <div className="text-center truncate w-full" style={{ color: "#4b5563", fontSize: "9px" }}>
                  {r.period_label}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs font-semibold" style={{ color: !hasVariation ? "#6b7280" : trend ? "var(--green)" : "#f87171" }}>
          {metricLabel}{!hasVariation ? " — flat / insufficient data" : trend ? ": ▲ Positive Trajectory" : ": ▼ Declining"}
        </p>
        {hasVariation && (
          <p className="text-xs" style={{ color: "#4b5563" }}>
            {(((last - first) / first) * 100).toFixed(0)}% overall
          </p>
        )}
      </div>
    </div>
  );
}

// ── Score Breakdown Bars (replaces radar — much more readable) ────────────────

function ScoreBars({ score }) {
  if (!score) return <p className="text-sm py-8 text-center" style={{ color: "#4b5563" }}>No score data.</p>;

  const dims = [
    { label: "Traction",       value: score.score_traction       ?? 0, max: 25, icon: "📈" },
    { label: "Team",           value: score.score_team           ?? 0, max: 20, icon: "👥" },
    { label: "Market",         value: score.score_market         ?? 0, max: 20, icon: "🌍" },
    { label: "Financials",     value: score.score_financials     ?? 0, max: 15, icon: "💰" },
    { label: "Business Model", value: score.score_business_model ?? 0, max: 10, icon: "🏗" },
    { label: "Fundraise",      value: score.score_fundraise      ?? 0, max: 5,  icon: "💼" },
    { label: "Competition",    value: score.score_competition    ?? 0, max: 5,  icon: "⚡" },
  ];

  const totalMax = dims.reduce((s, d) => s + d.max, 0);
  const g = score.investment_grade;
  const gradeColor = g === "A" ? "var(--green)" : g === "B" ? "#60a5fa" : g === "C" ? "#fbbf24" : "#f87171";

  return (
    <div>
      {/* Total score pill */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg"
        style={{ background: "var(--bg-card2)" }}>
        <span className="text-2xl font-black text-white">{score.total_score}</span>
        <div>
          <div className="text-xs" style={{ color: "#4b5563" }}>out of {totalMax}</div>
          <div className="text-xs font-bold" style={{ color: gradeColor }}>
            Grade {g} · {score.grade_label}
          </div>
        </div>
        {/* mini overall bar */}
        <div className="flex-1 h-2 rounded-full overflow-hidden ml-2" style={{ background: "#1e1e1e" }}>
          <div className="h-2 rounded-full"
            style={{ width: `${Math.min((score.total_score / totalMax) * 100, 100)}%`,
                     background: gradeColor, boxShadow: `0 0 8px ${gradeColor}60` }} />
        </div>
      </div>

      {/* Per-dimension bars */}
      <div className="space-y-2.5">
        {dims.map(({ label, value, max, icon }) => {
          const pct   = max > 0 ? Math.min((value / max) * 100, 100) : 0;
          const color = pct >= 70 ? "var(--green)" : pct >= 40 ? "#fbbf24" : "#f87171";
          return (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
                  <span>{icon}</span>{label}
                </span>
                <span className="text-xs font-mono font-bold" style={{ color }}>
                  {value}<span style={{ color: "#374151" }}>/{max}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                <div className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: color,
                    boxShadow: pct > 60 ? `0 0 5px ${color}80` : "none" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Key Metrics ────────────────────────────────────────────────────────────────

// Multi-document uploads can produce several traction rows created within the same
// second (one per file) — the most RECENT isn't necessarily the most complete one
// (e.g. a file with just a commentary blurb and no numbers). Pick whichever row
// actually has the most data instead of blindly taking index 0.
function _mostComplete(rows) {
  if (!rows?.length) return {};
  return rows.reduce((best, row) => {
    const score = r => Object.values(r || {}).filter(v => v != null && v !== "").length;
    return score(row) > score(best) ? row : best;
  }, rows[0]);
}

function KeyMetricsTile({ traction }) {
  const t = _mostComplete(traction);
  const churnColor = t.churn_rate_pct < 5 ? "var(--green)" : t.churn_rate_pct > 15 ? "#f87171" : "#fbbf24";
  const ltvColor   = t.ltv_cac_ratio >= 3 ? "var(--green)" : t.ltv_cac_ratio >= 2 ? "#60a5fa" : "#fbbf24";

  const metrics = [
    { label: "Net Revenue",   value: cr(t.net_revenue_cr),     color: "var(--green)" },
    { label: "GMV",           value: cr(t.gross_gmv_cr) },
    { label: "Gross Margin",  value: t.gross_margin_pct != null ? `${t.gross_margin_pct}%` : null },
    { label: "EBITDA Margin", value: t.ebitda_margin_pct != null ? `${t.ebitda_margin_pct}%` : null },
    { label: "LTV:CAC",       value: t.ltv_cac_ratio != null ? `${t.ltv_cac_ratio}x` : null, color: ltvColor },
    { label: "CAC",           value: inr(t.cac_inr) },
    { label: "LTV",           value: inr(t.ltv_inr) },
    { label: "Churn",         value: t.churn_rate_pct != null ? `${t.churn_rate_pct}%` : null, color: churnColor },
    { label: "MAU",           value: compact(t.monthly_active_users) },
    { label: "Registered",    value: compact(t.registered_users) },
    { label: "Retention 6m",  value: t.retention_6m_pct != null ? `${t.retention_6m_pct}%` : null },
  ].filter(m => m.value != null && m.value !== "");

  return (
    <Tile>
      <TileLabel>Key Metrics{t.period_label ? ` · ${t.period_label}` : ""}</TileLabel>
      {!metrics.length
        ? <p className="text-sm text-center py-6" style={{ color: "#4b5563" }}>No traction data.</p>
        : <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="rounded-lg p-3" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-1" style={{ color: "#6b7280" }}>{m.label}</p>
                <p className="text-base font-bold font-mono" style={{ color: m.color || "white" }}>{m.value}</p>
              </div>
            ))}
          </div>}
    </Tile>
  );
}

// ── Team Tile ──────────────────────────────────────────────────────────────────

function TeamTile({ team, webTeam }) {
  const [openIdx, setOpenIdx] = useState(null);
  const founders = (team || []).filter(m => m.is_founder);
  const others   = (team || []).filter(m => !m.is_founder);
  const shown    = [...founders, ...others].slice(0, 4);
  const open     = openIdx != null ? shown[openIdx] : null;
  const webMatch = open && webTeam?.members?.find(w => w.name?.toLowerCase().trim() === open.name?.toLowerCase().trim());

  return (
    <Tile>
      <TileLabel>Founders & Team</TileLabel>
      {!shown.length
        ? <p className="text-sm text-center py-4" style={{ color: "#4b5563" }}>No team data.</p>
        : <>
            <div className="flex gap-3 flex-wrap mb-3">
              {shown.map((m, i) => (
                <button key={i} onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base"
                    style={{ background: "var(--green-dim)", color: "var(--green)",
                             border: `1px solid ${openIdx === i ? "var(--green)" : "rgba(61,220,132,0.2)"}` }}>
                    {(m.name || "?")[0].toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold text-white text-center leading-tight">
                    {m.name?.split(" ")[0]}
                  </p>
                  {(m.role || m.is_founder) && (
                    <p className="text-xs text-center leading-tight max-w-[72px]" style={{ color: "var(--green)" }}>
                      {m.role || "Founder"}
                    </p>
                  )}
                </button>
              ))}
            </div>
            {founders.length > 0 && (
              <p className="text-xs mb-1" style={{ color: "#6b7280" }}>
                {founders.length} Founder{founders.length > 1 ? "s" : ""} · {team?.length} total
                {!open && (webTeam || shown.some(m => m.bio || m.education || m.previous_experience)) && " · click a name for background"}
              </p>
            )}
            {open && (open.bio || open.education || open.previous_experience || webTeam) && (
              <div className="mt-2 grid gap-3" style={{ gridTemplateColumns: webTeam ? "1fr 1fr" : "1fr" }}>
                <div className="p-3 rounded-lg text-xs space-y-1.5" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                  {webTeam && <p className="font-bold mb-1" style={{ color: "var(--green)" }}>📄 DECK</p>}
                  <p className="font-semibold text-white">{open.name}{open.role ? ` — ${open.role}` : ""}</p>
                  {open.education && <p style={{ color: "#9ca3af" }}><span style={{ color: "#6b7280" }}>Education: </span>{open.education}</p>}
                  {open.previous_experience && <p style={{ color: "#9ca3af" }}><span style={{ color: "#6b7280" }}>Background: </span>{open.previous_experience}</p>}
                  {open.bio && <p style={{ color: "#9ca3af" }}>{open.bio}</p>}
                  {!(open.education || open.previous_experience || open.bio) && <p style={{ color: "#4b5563" }}>Not stated in deck.</p>}
                </div>
                {webTeam && (
                  <div className="p-3 rounded-lg text-xs space-y-1.5" style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                    <p className="font-bold mb-1" style={{ color: "#60a5fa" }}>🌐 WEB SEARCH</p>
                    {webMatch ? (
                      <>
                        {webMatch.background && <p style={{ color: "#9ca3af" }}>{webMatch.background}</p>}
                        {webMatch.source_url && (
                          <a href={webMatch.source_url} target="_blank" rel="noopener noreferrer"
                            className="hover:underline block" style={{ color: "#60a5fa" }}>source ↗</a>
                        )}
                      </>
                    ) : <p style={{ color: "#4b5563" }}>No match found via web search.</p>}
                  </div>
                )}
              </div>
            )}
          </>}
    </Tile>
  );
}

// ── Funding Tile ───────────────────────────────────────────────────────────────

function FundingTile({ fundraise_rounds, investors, webFunding }) {
  const rounds = fundraise_rounds || [];
  const webRounds = webFunding?.rounds || [];

  const deckContent = (
    <>
      {!rounds.length
        ? <p className="text-xs mb-3" style={{ color: "#4b5563" }}>No fundraise data.</p>
        : <div className="space-y-2 mb-3">
            {rounds.map((r, i) => (
              <div key={i} className="rounded-lg p-3"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="font-bold text-sm text-white">{r.round_name}</span>
                  {r.target_amount_cr != null && (
                    <span className="text-sm font-black" style={{ color: "var(--green)" }}>₹{r.target_amount_cr}Cr</span>
                  )}
                </div>
                {r.committed_amount_cr != null && (
                  <p className="text-xs" style={{ color: "#4b5563" }}>₹{r.committed_amount_cr}Cr committed</p>
                )}
                {r.pre_money_valuation_cr != null && (
                  <p className="text-xs" style={{ color: "#4b5563" }}>Pre-money: ₹{r.pre_money_valuation_cr}Cr</p>
                )}
              </div>
            ))}
          </div>}
      {investors?.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: "#4b5563" }}>INVESTORS</p>
          <div className="flex flex-wrap gap-1.5">
            {investors.map((inv, i) => (
              <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={inv.is_lead_investor
                  ? { background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(61,220,132,0.3)" }
                  : { background: "#1e1e1e", color: "#6b7280", border: "1px solid var(--border)" }}>
                {inv.name}{inv.is_lead_investor ? " ★" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );

  return (
    <Tile>
      <TileLabel>Funding History{rounds.length > 1 ? ` · ${rounds.length} rounds` : ""}</TileLabel>
      {webFunding ? (
        <div className="grid grid-cols-1 gap-4">
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--green)" }}>📄 FROM DECK</p>
            {deckContent}
          </div>
          <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>🌐 FROM WEB SEARCH</p>
            {!webRounds.length
              ? <p className="text-xs" style={{ color: "#4b5563" }}>No funding rounds found via web search.</p>
              : <div className="space-y-2">
                  {webRounds.map((r, i) => (
                    <div key={i} className="rounded-lg p-3"
                      style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-bold text-sm text-white">{r.round_name || "Round"}</span>
                        {r.amount_raised_cr != null && (
                          <span className="text-sm font-black" style={{ color: "#60a5fa" }}>₹{r.amount_raised_cr}Cr</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.lead_investor_name && <span className="text-xs" style={{ color: "#9ca3af" }}>{r.lead_investor_name}</span>}
                        {r.close_date && <span className="text-xs" style={{ color: "#4b5563" }}>{r.close_date}</span>}
                      </div>
                      {r.source_url && (
                        <a href={r.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline" style={{ color: "#60a5fa" }}>
                          source ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      ) : deckContent}
    </Tile>
  );
}

// ── Competitors Tile ───────────────────────────────────────────────────────────

const LIST_PREVIEW_COUNT = 5;

function CompetitorsTile({ competitors, webCompetitors, open, onToggle }) {
  const [showAllDeck, setShowAllDeck] = useState(false);
  const webList = webCompetitors?.competitors || [];
  const deckShown = showAllDeck ? competitors : (competitors || []).slice(0, LIST_PREVIEW_COUNT);
  const deckHasMore = (competitors?.length || 0) > LIST_PREVIEW_COUNT;

  const deckList = (
    !competitors?.length
      ? <p className="text-sm text-center py-4" style={{ color: "#4b5563" }}>No competitor data extracted.</p>
      : <div>
          <div className="space-y-2.5 overflow-y-auto pr-1" style={showAllDeck ? { maxHeight: "360px" } : undefined}>
            {deckShown.map((c, i) => (
              <div key={i} className="rounded-lg p-3"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold text-sm text-white">{c.name}</span>
                  {c.category && <Badge color="gray">{c.category}</Badge>}
                </div>
                {c.price_positioning && (
                  <p className="text-xs mb-1" style={{ color: "#6b7280" }}>
                    Pricing: {c.price_positioning}
                  </p>
                )}
                {c.usp_summary && (
                  <p className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>{c.usp_summary}</p>
                )}
                {c.our_edge_notes && (
                  <p className="text-xs leading-relaxed mt-1.5 pt-1.5"
                    style={{ color: "var(--green)", borderTop: "1px solid var(--border)" }}>
                    Our edge: {c.our_edge_notes}
                  </p>
                )}
              </div>
            ))}
          </div>
          {deckHasMore && (
            <button onClick={() => setShowAllDeck(s => !s)}
              className="text-xs font-semibold mt-2.5 hover:underline" style={{ color: "var(--green)" }}>
              {showAllDeck ? "Show fewer" : `Show all ${competitors.length}`}
            </button>
          )}
        </div>
  );

  return (
    <CollapsibleTile label="Competitors" badge={competitors?.length ? `${competitors.length}` : null}
      open={open} onToggle={onToggle}>
      {webCompetitors ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "var(--green)" }}>📄 FROM DECK</p>
            {deckList}
          </div>
          <div>
            <p className="text-xs font-bold mb-2" style={{ color: "#60a5fa" }}>🌐 FROM WEB SEARCH</p>
            {!webList.length
              ? <p className="text-sm" style={{ color: "#4b5563" }}>None found via web search.</p>
              : <div className="space-y-2.5 overflow-y-auto pr-1" style={{ maxHeight: "360px" }}>
                  {webList.map((c, i) => (
                    <div key={i} className="rounded-lg p-3"
                      style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                      <span className="font-semibold text-sm text-white">{c.name}</span>
                      {c.notes && <p className="text-xs leading-relaxed mt-0.5" style={{ color: "#9ca3af" }}>{c.notes}</p>}
                      {c.source_url && (
                        <a href={c.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs hover:underline block mt-1" style={{ color: "#60a5fa" }}>source ↗</a>
                      )}
                    </div>
                  ))}
                </div>}
          </div>
        </div>
      ) : deckList}
    </CollapsibleTile>
  );
}

// ── Products Tile ──────────────────────────────────────────────────────────────

function ProductsTile({ products, open, onToggle }) {
  const [showAll, setShowAll] = useState(false);
  if (!products?.length) return null;
  const shown = showAll ? products : products.slice(0, LIST_PREVIEW_COUNT);
  const hasMore = products.length > LIST_PREVIEW_COUNT;

  return (
    <CollapsibleTile label="Products / SKUs" badge={`${products.length}`} open={open} onToggle={onToggle}>
      <div className="space-y-0 overflow-y-auto pr-1" style={showAll ? { maxHeight: "360px" } : undefined}>
        {shown.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-2.5"
            style={{ borderBottom: i < shown.length - 1 ? "1px solid var(--border)" : "none" }}>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{p.name || p.sku_code || "—"}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {p.category && <span className="text-xs" style={{ color: "#6b7280" }}>{p.category}</span>}
                {p.status && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full"
                    style={{ background: "#1e1e1e", color: "#6b7280", border: "1px solid var(--border)" }}>
                    {p.status}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              {p.mrp_inr != null && (
                <p className="text-sm font-mono font-bold text-white">
                  ₹{Number(p.mrp_inr).toLocaleString("en-IN")}
                </p>
              )}
              {p.gross_margin_pct != null && (
                <p className="text-xs font-mono" style={{ color: "var(--green)" }}>
                  {p.gross_margin_pct}% margin
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button onClick={() => setShowAll(s => !s)}
          className="text-xs font-semibold mt-2.5 hover:underline" style={{ color: "var(--green)" }}>
          {showAll ? "Show fewer" : `Show all ${products.length}`}
        </button>
      )}
    </CollapsibleTile>
  );
}

// ── Competitors + Products wrapper — one "collapse all" control for both ──────

function CompetitorsAndProducts({ competitors, webCompetitors, products }) {
  const [open, setOpen] = useState(true);
  const hasProducts = products?.length > 0;
  return (
    <div>
      {hasProducts && (
        <div className="flex justify-end mb-1.5">
          <button onClick={() => setOpen(o => !o)}
            className="text-xs font-semibold hover:underline flex items-center gap-1"
            style={{ color: "#6b7280" }}>
            <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {open ? "Collapse both" : "Expand both"}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompetitorsTile competitors={competitors} webCompetitors={webCompetitors}
          open={hasProducts ? open : undefined} onToggle={hasProducts ? () => setOpen(o => !o) : undefined} />
        {hasProducts && <ProductsTile products={products} open={open} onToggle={() => setOpen(o => !o)} />}
      </div>
    </div>
  );
}

// ── Financial Projections Tile ─────────────────────────────────────────────────

function _parseYearData(row, field) {
  if (!row) return {};
  try {
    const parsed = typeof row[field] === "string" ? JSON.parse(row[field]) : (row[field] || {});
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Actuals and projections are extracted into separate tables, but a deck's GMV/revenue
// chart is usually one continuous timeline (e.g. FY21-22..FY23-24 actual, FY24-25
// labeled as a projection by the extractor even when it's really just the current
// year) — showing them as two separate tiles both labeled "GMV" reads as a duplicate.
// Merge into one table, year-sorted, with projected years marked.
const _CURRENCY_SYMBOLS = { INR: "₹", USD: "$", EUR: "€", GBP: "£" };

function _formatFinMetric(key, value, symbol) {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  if (key.endsWith("_pct")) return `${n}%`;
  if (key.endsWith("_cr"))  return `${symbol}${n}Cr`;
  return `${symbol}${compact(n) ?? n}`;
}

// One mini bar chart per metric (e.g. GMV, revenue) across all known years, actuals and
// projected combined — a plain number table doesn't show the trend at a glance, which is
// the whole point of looking at multi-year financials.
function FinancialMetricChart({ metricKey, years, yearData, projectedYears, symbol }) {
  const vals = years.map(y => yearData[y]?.[metricKey]);
  const numericVals = vals.map(v => v != null ? Number(v) : null).filter(v => v != null && !Number.isNaN(v));
  if (!numericVals.length) return null;
  const maxV = Math.max(...numericVals, 0.0001);

  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs font-semibold mb-2 capitalize" style={{ color: "#9ca3af" }}>
        {metricKey.replace(/_cr$|_pct$/, "").replace(/_/g, " ")}
      </p>
      <div className="flex items-end gap-2">
        {years.map((y, i) => {
          const raw = vals[i];
          const n = raw != null ? Number(raw) : null;
          const h = n != null ? Math.max((n / maxV) * 100, 4) : 0;
          return (
            <div key={y} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                text-xs px-2 py-0.5 rounded whitespace-nowrap z-10"
                style={{ background: "var(--bg-card2)", color: "var(--green)", border: "1px solid var(--border)" }}>
                {n != null ? _formatFinMetric(metricKey, n, symbol) : "No data"}
              </div>
              {/* Fixed-height track so the bar's percentage height has something to resolve against. */}
              <div className="w-full h-20 flex items-end">
                <div className="w-full rounded-t transition-all"
                  style={{ height: n != null ? `${h}%` : "4%",
                    background: n != null
                      ? (projectedYears.has(y)
                          ? "repeating-linear-gradient(45deg, rgba(96,165,250,0.5), rgba(96,165,250,0.5) 4px, rgba(96,165,250,0.25) 4px, rgba(96,165,250,0.25) 8px)"
                          : "linear-gradient(to top, rgba(61,220,132,0.9), rgba(61,220,132,0.3))")
                      : "#2a2a2a" }} />
              </div>
              <p className="text-xs font-mono font-bold" style={{ color: n != null ? "white" : "#4b5563" }}>
                {n != null ? _formatFinMetric(metricKey, n, symbol) : "—"}
              </p>
              <p className="text-center truncate w-full" style={{ color: "#4b5563", fontSize: "9px" }}>
                {y}{projectedYears.has(y) ? " (proj.)" : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinancialsTile({ financials, financial_projections }) {
  const actualsRow = (financials || []).find(r => r.financials_by_year);
  const projRow    = (financial_projections || []).find(r => r.projections_by_year);
  const actuals    = _parseYearData(actualsRow, "financials_by_year");
  const projected  = _parseYearData(projRow, "projections_by_year");

  const yearData = { ...actuals };
  const projectedYears = new Set();
  for (const [y, v] of Object.entries(projected)) {
    if (!(y in yearData)) {
      yearData[y] = v;
      projectedYears.add(y);
    }
  }

  const years = Object.keys(yearData).sort();
  if (!years.length) return null;

  const allKeys = new Set();
  years.forEach(y => { if (yearData[y] && typeof yearData[y] === "object") Object.keys(yearData[y]).forEach(k => allKeys.add(k)); });
  const metrics = Array.from(allKeys).filter(k => !k.endsWith("_pct")); // margins charted poorly as bars — keep those in a line below instead
  const pctMetrics = Array.from(allKeys).filter(k => k.endsWith("_pct"));
  if (!metrics.length && !pctMetrics.length) return null;

  const currency = actualsRow?.currency_code || projRow?.currency_code || "INR";
  const symbol = _CURRENCY_SYMBOLS[currency] || `${currency} `;

  return (
    <CollapsibleTile label="Financials" badge={`(${currency})`}>
      {metrics.map(metric => (
        <FinancialMetricChart key={metric} metricKey={metric} years={years} yearData={yearData}
          projectedYears={projectedYears} symbol={symbol} />
      ))}
      {pctMetrics.length > 0 && (
        <div className="pt-2 mt-1 space-y-1.5" style={{ borderTop: metrics.length ? "1px solid var(--border)" : "none" }}>
          {pctMetrics.map(metric => (
            <div key={metric} className="flex items-center justify-between text-xs">
              <span className="capitalize" style={{ color: "#9ca3af" }}>{metric.replace(/_pct$/, "").replace(/_/g, " ")}</span>
              <span className="font-mono" style={{ color: "#6b7280" }}>
                {years.map(y => yearData[y]?.[metric] != null ? `${yearData[y][metric]}%` : "—").join("  ·  ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </CollapsibleTile>
  );
}

// ── DD Checklist ───────────────────────────────────────────────────────────────

// ── Recent News ────────────────────────────────────────────────────────────────

function NewsSection({ companyId }) {
  const [news, setNews]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    api.getCompanyNews(companyId)
      .then(d => setNews(d.news || []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }, [companyId]);

  if (!loading && !news.length) return null;

  return (
    <CollapsibleTile label="Recent News" badge={news.length ? `${news.length}` : null}>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="space-y-1.5 p-3 rounded-lg" style={{ border: "1px solid var(--border)" }}>
              <div className="h-3.5 rounded w-3/4" style={{ background: "#2a2a2a" }} />
              <div className="h-3 rounded w-full" style={{ background: "#1e1e1e" }} />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {news.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
              className="block p-3 rounded-lg group transition-colors"
              style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(61,220,132,0.3)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              <p className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors leading-tight mb-1">
                {item.title}
              </p>
              {item.snippet && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "#6b7280" }}>
                  {item.snippet}
                </p>
              )}
              <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "#4b5563" }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                {(() => { try { return new URL(item.url).hostname.replace("www.",""); } catch { return item.url; } })()}
              </p>
            </a>
          ))}
        </div>
      )}
    </CollapsibleTile>
  );
}


function DDChecklist({ dd_checklist, companyId }) {
  const { showToast } = useToast();
  const [sectionOpen, setSectionOpen] = useState(false);
  const [openCat, setOpenCat] = useState(null);
  // Keyed by checklist_id (stable backend identity) and seeded from saved notes,
  // so they persist across refreshes.
  const [notes, setNotes] = useState(() => {
    const init = {};
    for (const row of dd_checklist || []) init[row.checklist_id] = row.user_notes || "";
    return init;
  });
  // Per-item save status so the Save button gives visible feedback — "idle" | "saving" | "saved"
  const [noteStatus, setNoteStatus] = useState({});

  const grouped = {}, order = [];
  for (const row of dd_checklist || []) {
    const cat = row.question_category || "General";
    if (!grouped[cat]) { grouped[cat] = []; order.push(cat); }
    grouped[cat].push(row);
  }
  if (!order.length) return null;
  const totalCount = dd_checklist.length;

  const saveNotes = (checklistId) => {
    const value = notes[checklistId] || "";
    setNoteStatus(prev => ({ ...prev, [checklistId]: "saving" }));
    api.updateDDChecklistItem(companyId, checklistId, { notes: value })
      .then(() => {
        setNoteStatus(prev => ({ ...prev, [checklistId]: "saved" }));
        setTimeout(() => setNoteStatus(prev => ({ ...prev, [checklistId]: "idle" })), 2000);
      })
      .catch(() => {
        setNoteStatus(prev => ({ ...prev, [checklistId]: "idle" }));
        showToast("Couldn't save note — try again", "error");
      });
  };

  return (
    <Tile>
      <button onClick={() => setSectionOpen(o => !o)} className="w-full text-left mb-1 group">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <TileLabel>Due Diligence Checklist</TileLabel>
            <svg className={`w-4 h-4 transition-transform ${sectionOpen ? "rotate-180" : ""}`}
              style={{ color: "#4b5563" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <span className="text-xs font-semibold" style={{ color: "var(--green)" }}>
            {totalCount} questions
          </span>
        </div>
        <p className="text-xs" style={{ color: "#4b5563" }}>
          AI answers every question below from the deck (and web search if needed).
          {!sectionOpen && ` Click to review ${totalCount} questions across ${order.length} categories.`}
        </p>
      </button>

      {sectionOpen && (
      <>
      {/* Category grid — click a card to view its questions below */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-3">
        {order.map(cat => {
          const isOpen = openCat === cat;
          return (
            <button key={cat} onClick={() => setOpenCat(isOpen ? null : cat)}
              className="text-left rounded-lg p-3 transition-colors"
              style={{
                background: isOpen ? "var(--bg-card2)" : "transparent",
                border: `1px solid ${isOpen ? "rgba(61,220,132,0.4)" : "var(--border)"}`,
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = "var(--bg-card2)"; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}>
              <p className="text-xs font-semibold text-white leading-tight mb-1">{cat}</p>
              <p className="text-xs" style={{ color: "#6b7280" }}>{grouped[cat].length} question{grouped[cat].length !== 1 ? "s" : ""}</p>
            </button>
          );
        })}
      </div>

      {/* Expanded category detail */}
      {openCat && (
        <div className="mt-3 rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--bg-card2)" }}>
            <span className="font-semibold text-sm text-white">{openCat}</span>
            <button onClick={() => setOpenCat(null)} className="text-xs" style={{ color: "#6b7280" }}>
              Close ✕
            </button>
          </div>
          {grouped[openCat].map((row) => {
            const key = row.checklist_id;
            return (
              <div key={key} className="px-4 py-4"
                style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "white" }}>
                  {row.question}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
                  {row.answer || "Not available"}
                </p>
                {row.source && !["not_found","error"].includes(row.source) && (
                  <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
                    {row.source === "extracted_data" ? "📄 From document" : "🔍 From web search"}
                  </p>
                )}
                {/* Notes — explicit Save button, plus auto-save on blur as a safety net */}
                <div className="mt-2">
                  <textarea
                    placeholder="Add notes…"
                    value={notes[key] || ""}
                    onChange={(e) => setNotes({ ...notes, [key]: e.target.value })}
                    onBlur={() => saveNotes(key)}
                    rows={notes[key] ? 2 : 1}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-[#0f0f0f] text-white border border-[#2a2a2a] focus:border-green-500 focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => saveNotes(key)} disabled={noteStatus[key] === "saving"}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                      style={{ background: "var(--green-dim)", color: "var(--green)" }}>
                      {noteStatus[key] === "saving" ? "Saving…" : "Save note"}
                    </button>
                    {noteStatus[key] === "saved" && (
                      <span className="text-xs" style={{ color: "var(--green)" }}>✓ Saved</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </Tile>
  );
}

// ── Floating Chat Widget ───────────────────────────────────────────────────────

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const { id }  = useParams();
  const { showToast } = useToast();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [webResearch, setWebResearch] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);

  const compareWithWeb = async () => {
    if (webResearch || researchLoading) return;
    setResearchLoading(true);
    try {
      const result = await api.getWebResearch(id);
      setWebResearch(result);
    } catch (err) {
      showToast(err.message || "Web research failed", "error");
    } finally {
      setResearchLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => {
      setError("Request timed out — the data service is taking too long.");
      setLoading(false);
    }, 30000);

    api.getCompany(id)
      .then(d => {
        setData(d);
        setLoading(false);
        clearTimeout(timer);
      })
      .catch(e => { clearTimeout(timer); setError(e.message); setLoading(false); });

    return () => clearTimeout(timer);
  }, [id]);

  // DD checklist generation continues in the background after the rest of the page
  // is already viewable (see backend: job is marked "completed" before DD runs).
  // Poll a few times for it to land instead of making the user manually refresh.
  useEffect(() => {
    if (!id || loading || data?.dd_checklist?.length) return;
    let cancelled = false;
    let attempts = 0;
    const poll = () => {
      attempts += 1;
      if (cancelled || attempts > 15) return; // ~2 min ceiling
      setTimeout(() => {
        if (cancelled) return;
        api.getCompany(id).then(d => {
          if (cancelled) return;
          if (d?.dd_checklist?.length) {
            setData(d);
          } else {
            poll();
          }
        }).catch(() => {});
      }, 8000);
    };
    poll();
    return () => { cancelled = true; };
  }, [id, loading, data?.dd_checklist?.length]);

  if (loading) return (
    <div className="p-6 animate-pulse">
      <div className="h-3 rounded w-20 mb-6" style={{ background: "#2a2a2a" }} />
      <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-6 rounded w-40" style={{ background: "#2a2a2a" }} />
            <div className="h-3 rounded w-64" style={{ background: "#222" }} />
          </div>
          <div className="w-24 h-24 rounded-full" style={{ background: "#2a2a2a" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl p-4 h-32" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
        <div className="rounded-xl p-4 h-32" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }} />
      </div>
      <p className="text-xs text-center mt-4" style={{ color: "#4b5563" }}>Loading company data…</p>
    </div>
  );

  if (error || !data?.company) return (
    <div className="p-6">
      <Link href="/dashboard" className="text-xs mb-4 inline-flex items-center gap-1 hover:underline"
        style={{ color: "#4b5563" }}>← Portfolio</Link>
      <div className="p-4 rounded-lg text-sm"
        style={{ background: "rgba(248,113,113,0.08)", color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
        {error || "Company not found."}
      </div>
    </div>
  );

  const co      = data.company;

  // Mint a fresh short-lived download token right before navigating, rather than
  // embedding a long-lived one in a static href.
  const downloadPdf = async (e) => {
    e.preventDefault();
    try {
      const url = await api.getDDPdfDownloadUrl(id);
      window.open(url, "_blank");
    } catch {
      showToast("Couldn't get the download link — try again", "error");
    }
  };

  const aiInsight = (() => {
    const t = (data.traction || [])[0] || {};
    if (t.churn_rate_pct > 15) return `High churn of ${t.churn_rate_pct}% detected — review retention strategy`;
    if (t.net_revenue_cr > 5)  return `Strong revenue ${cr(t.net_revenue_cr)} — ready for growth capital`;
    if (data.score?.total_score >= 70) return "High-potential company — recommend advancing to deep due diligence";
    return "AI analysis complete — review DD checklist for detailed investment insights";
  })();

  return (
    <div className="flex flex-col min-h-full">
      {/* ── Sticky header ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 sticky top-0 z-20"
        style={{ background: "var(--bg-base)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/dashboard" className="text-xs mb-3 inline-flex items-center gap-1 hover:underline"
          style={{ color: "#4b5563" }}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Portfolio
        </Link>

        <div className="flex items-start justify-between gap-4">
          {/* Company info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Logo display paused for now — extraction sometimes picks the wrong embedded
                  image. Re-enable by restoring the `co.logo_url &&` condition below. */}
              {false && co.logo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={co.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain"
                  style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}
                  onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
              <h1 className="text-xl font-bold text-white">{co.brand_name || co.name || `Company #${id}`}</h1>
              {co.brand_name && co.name && co.brand_name.trim().toLowerCase() !== co.name.trim().toLowerCase() && (
                <span className="text-xs" style={{ color: "#6b7280" }}>
                  Registered as {co.name}
                </span>
              )}
              <div className="flex gap-1.5 flex-wrap items-center">
                {co.sector  && <Badge color="blue">{co.sector}</Badge>}
                {co.stage   && <Badge color="purple">{co.stage}</Badge>}
                {co.headquarters_city && (
                  <Badge color="gray">
                    {[co.headquarters_city, co.headquarters_country].filter(Boolean).join(", ")}
                  </Badge>
                )}

              </div>
            </div>

            {/* Company overview — tagline + description shown together, but decks often
                extract the same sentence into both fields; skip the second if it's a dupe */}
            {co.tagline && (
              <p className="text-sm font-medium mt-1.5 max-w-2xl" style={{ color: "var(--text-1)" }}>
                {co.tagline}
              </p>
            )}
            {(() => {
              const desc = co.short_description || co.mission_statement;
              if (!desc) return null;
              if (co.tagline && desc.trim().toLowerCase() === co.tagline.trim().toLowerCase()) return null;
              return (
                <p className="text-sm mt-1 leading-relaxed max-w-2xl" style={{ color: "#9ca3af" }}>
                  {desc}
                </p>
              );
            })()}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {co.website_url && (
                <a href={/^https?:\/\//i.test(co.website_url) ? co.website_url : `https://${co.website_url}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs hover:underline flex items-center gap-1"
                  style={{ color: "var(--green)" }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  {co.website_url.replace(/^https?:\/\/(www\.)?/, "")}
                </a>
              )}
              {co.revenue_model && (
                <span className="text-xs" style={{ color: "#4b5563" }}>
                  {co.revenue_model}
                </span>
              )}
              {co.business_model_type && (
                <span className="text-xs" style={{ color: "#4b5563" }}>
                  {co.business_model_type}
                </span>
              )}
            </div>
          </div>

          {/* Score gauge + PDF + Web research */}
          <div className="flex items-center gap-4 shrink-0">
            <ScoreGauge score={data.score} loading={scoreLoading} />
            <PipelineStatusPill pipeline={data.pipeline} onClick={() => setShowPipelineModal(true)} />
            <button onClick={compareWithWeb} disabled={researchLoading || !!webResearch}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
              style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              {researchLoading ? "Searching…" : webResearch ? "Compared" : "Compare Web"}
            </button>
            <a href="#" onClick={downloadPdf}
              className="flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--green-dim)", color: "var(--green)", border: "1px solid rgba(61,220,132,0.3)" }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              DDQ
            </a>
          </div>
        </div>
      </div>

      {/* ── Page content ───────────────────────────────────────────────────── */}
      <div className="flex-1 p-6 space-y-4">

        {/* Insight box — strengths & risks */}
        <InsightBox data={data} />

        {/* Investment Score — full-width horizontal block (gauge + breakdown + AI
            thesis together), leading with the verdict before the narrative detail below */}
        {scoreLoading
          ? <Tile>
              <TileLabel>Investment Score</TileLabel>
              <div className="space-y-3 animate-pulse">
                <div className="h-32 rounded" style={{ background: "#2a2a2a" }} />
              </div>
            </Tile>
          : <InvestmentScoreCard score={data.score} />}

        {/* Problem / Solution */}
        <ProblemSolutionTile company={co} />

        {/* Key Metrics */}
        <KeyMetricsTile traction={data.traction} />

        {/* Market Analysis */}
        <MarketAnalysisCard market={data.market} webData={webResearch?.market} />

        {/* Row 2: Team | Funding (Risk Assessment removed — it duplicated the AI-driven
            Risks box above, and two of its six rows were hardcoded constants
            ("Product Risk: Moderate", "Regulatory Risk: Low") regardless of actual data) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TeamTile team={data.team} webTeam={webResearch?.team} />
          <FundingTile fundraise_rounds={data.fundraise_rounds} investors={data.investors} webFunding={webResearch?.funding} />
        </div>

        {/* Financials — actuals + projections merged into one year-sorted table.
            Moved above Competitors/Products — financial health is the more load-bearing
            read before diving into competitive landscape. */}
        <FinancialsTile financials={data.financials} financial_projections={data.financial_projections} />

        {/* Row 3: Competitors | Products — shared collapse control */}
        {(data.competitors?.length > 0 || data.products?.length > 0) && (
          <CompetitorsAndProducts
            competitors={data.competitors} webCompetitors={webResearch?.competitors}
            products={data.products}
          />
        )}

        <NewsSection companyId={id} />

        {/* DD Checklist */}
        {data.dd_checklist?.length > 0 && <DDChecklist dd_checklist={data.dd_checklist} companyId={id} />}
        {!data.dd_checklist?.length && (
          <Tile>
            <p className="text-sm text-center py-4" style={{ color: "#4b5563" }}>
              No due diligence checklist yet — upload a pitch deck to generate one.
            </p>
          </Tile>
        )}
      </div>

      {/* ── AI Insight bar ─────────────────────────────────────────────────── */}
      <div className="sticky bottom-0 px-6 pb-4 pt-2" style={{ background: "var(--bg-base)" }}>
        <div className="ai-insight-bar flex items-center gap-2">
          <span>🤖</span>
          <span className="flex-1">{aiInsight}</span>
          <a href="#" onClick={downloadPdf}
            className="text-xs font-bold px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
            style={{ background: "var(--green)", color: "#0f0f0f" }}>
            ↓ DDQ
          </a>
        </div>
      </div>

      <FloatingChatWidget companyId={id} title={`Chat about ${co.brand_name || co.name || 'this company'}`} />

      {showPipelineModal && (
        <PipelineModal companyId={id} initialData={data.pipeline} onClose={() => setShowPipelineModal(false)} />
      )}
    </div>
  );
}
