"use client";

export default function InvestmentScoreCard({ score }) {
  if (!score) return null;

  const val = score.total_score ?? 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(val / 100, 1) * circ;
  const g = score.investment_grade;
  const colorMap = {
    "A": { bg: "rgba(61,220,132,0.1)", text: "var(--green)", label: "STRONG BUY" },
    "B": { bg: "rgba(96,165,250,0.1)", text: "#60a5fa", label: "BUY" },
    "C": { bg: "rgba(251,191,36,0.1)", text: "#fbbf24", label: "HOLD" },
    "D": { bg: "rgba(248,113,113,0.1)", text: "#f87171", label: "PASS" },
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
  ].filter(d => d.score != null);

  return (
    <div className="rounded-xl p-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-6" style={{ color: "#6b7280" }}>Investment Score</h3>

      <div className="flex gap-8 mb-8">
        {/* Gauge */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: 120, height: 120 }}>
            <svg width="120" height="120" viewBox="0 0 100 100" className="absolute inset-0"
              style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r={r} fill="none" stroke="#2a2a2a" strokeWidth="6" />
              <circle cx="50" cy="50" r={r} fill="none" stroke={colors.text} strokeWidth="6"
                strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 12px ${colors.text})` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-white leading-none">{Math.round(val)}</span>
              <span className="text-lg font-bold" style={{ color: colors.text }}>{g}</span>
            </div>
          </div>
          <p className="text-xs font-bold tracking-widest mt-3" style={{ color: colors.text }}>
            {colors.label}
          </p>
        </div>

        {/* Dimensions */}
        <div className="flex-1 space-y-3">
          {dimensions.map((dim) => {
            const percent = Math.min(dim.score / 100, 1) * 100;
            const dimColor = percent >= 70 ? "var(--green)" : percent >= 50 ? "#60a5fa" : percent >= 30 ? "#fbbf24" : "#f87171";
            return (
              <div key={dim.label}>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold" style={{ color: "#9ca3af" }}>{dim.label}</label>
                  <span className="text-xs font-bold" style={{ color: dimColor }}>{Math.round(dim.score)}</span>
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
      </div>

    </div>
  );
}
