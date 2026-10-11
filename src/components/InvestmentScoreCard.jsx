"use client";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

// Max points per dimension (must match the weights in backend/scoring.py's docstring:
// Team 20, Market 20, Traction 25, Financials 15, Business Model 10, Fundraise 5,
// Competition 5 — 100 total). The bars used to divide every dimension's raw score by
// 100 regardless of its real max, so a PERFECT Team score of 20/20 only filled the bar
// 20% — every bar looked weak no matter how the company actually scored.
const _DIMENSION_MAX = {
  "Team": 20, "Market": 20, "Traction": 25, "Financials": 15,
  "Business Model": 10, "Fundraise": 5, "Competition": 5,
};

export default function InvestmentScoreCard({ score }) {
  if (!score) return null;

  const val = score.total_score ?? 0;
  const g = score.investment_grade;
  // Same INVEST/WATCH/NOT READY/DECLINE wording as ScoreGauge elsewhere on the page —
  // this card used to say "BUY"/"HOLD" here, a third (really fourth) label for the same grade.
  const colorMap = {
    "A": { text: "var(--green)", label: "INVEST" },
    "B": { text: "#60a5fa", label: "WATCH" },
    "C": { text: "#fbbf24", label: "NOT READY" },
    "D": { text: "#f87171", label: "DECLINE" },
  };
  const colors = colorMap[g] || colorMap["D"];

  const dimensions = [
    { label: "Team", score: score.score_team },
    { label: "Market", score: score.score_market },
    { label: "Traction", score: score.score_traction },
    { label: "Financials", score: score.score_financials },
    { label: "Business Model", score: score.score_business_model },
    { label: "Fundraise", score: score.score_fundraise },
    { label: "Competition", score: score.score_competition },
  ].filter(d => d.score != null).map(d => ({ ...d, max: _DIMENSION_MAX[d.label] || 100 }));

  return (
    <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#6b7280" }}>Investment Score</h3>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Score + grade — no duplicate gauge circle (the header already has one) */}
        <div className="flex flex-col items-center shrink-0 lg:w-28 justify-center">
          <span className="text-4xl font-black text-white leading-none">{Math.round(val)}</span>
          <span className="text-sm font-bold mt-1" style={{ color: colors.text }}>Grade {g}</span>
          <p className="text-xs font-bold tracking-widest mt-2 text-center" style={{ color: colors.text }}>
            {colors.label}
          </p>
        </div>

        {/* Dimensions — 2-col grid so the breakdown stays compact beside the thesis
            instead of stretching the whole card tall */}
        <div className="lg:w-72 shrink-0 grid grid-cols-2 gap-x-4 gap-y-2 content-start"
          style={{ borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", padding: "0 1.5rem" }}>
          {dimensions.map((dim) => {
            const percent = Math.min(dim.score / dim.max, 1) * 100;
            const dimColor = percent >= 70 ? "var(--green)" : percent >= 50 ? "#60a5fa" : percent >= 30 ? "#fbbf24" : "#f87171";
            return (
              <div key={dim.label}>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-xs font-semibold" style={{ color: "#9ca3af" }}>{dim.label}</label>
                  <span className="text-xs font-bold" style={{ color: dimColor }}>{Math.round(dim.score)}/{dim.max}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e1e" }}>
                  <div className="h-full rounded-full transition-all duration-300" style={{
                    width: `${percent}%`,
                    background: dimColor,
                    boxShadow: `0 0 8px ${dimColor}`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Thesis — its own first line ("**Investment Thesis – Company**") already
            serves as the heading, so we don't also print a separate "AI Investment
            Thesis" label above it (that was two headings stacked for one block). */}
        {score.ai_summary && (
          <div className="flex-1 min-w-0 text-sm leading-relaxed" style={{ color: "#9ca3af" }}>
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize]}
              components={{
                strong: ({node, ...props}) => <strong style={{ color: "white" }} {...props} />,
                p: ({node, ...props}) => <p style={{ marginBottom: "0.5rem" }} {...props} />,
              }}
            >
              {score.ai_summary}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
