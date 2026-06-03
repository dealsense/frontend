"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { compact, cr, inr } from "@/lib/format";

// ── Extraction result display (shared with upload/page.jsx) ───────────────────

const TABLE_LABELS = {
  companies:                     "Company Profile",
  company_traction:              "Traction Metrics",
  company_dd_checklist:          "DD Checklist",
  company_market:                "Market Data",
  company_team_members:          "Team Members",
  company_investors:             "Investors",
  company_fundraise_rounds:      "Fundraise Rounds",
  company_financials:            "Financials",
  company_financial_projections: "Financial Projections",
  company_competitors:           "Competitors",
  company_products:              "Products / SKUs",
  company_customer_segments:     "Customer Segments",
  company_distribution_channels: "Distribution Channels",
  company_meta:   null,
  company_pdfurl: null,
  company_scores: null,
};
const ROW_UNIT = { company_dd_checklist: "question" };
const TABLE_ORDER = [
  "companies", "company_traction", "company_dd_checklist", "company_market",
  "company_team_members", "company_investors", "company_fundraise_rounds",
  "company_financials", "company_financial_projections", "company_competitors",
  "company_products", "company_customer_segments", "company_distribution_channels",
];

function SeedSummary({ detail }) {
  const displayable = TABLE_ORDER.filter(k => TABLE_LABELS[k] !== null);
  const populated = displayable.filter(k => (detail?.[k]?.inserted ?? 0) > 0);
  const errors = Object.entries(detail || {}).filter(([k, v]) => v?.error && TABLE_LABELS[k] !== null);
  const totalRows = populated.reduce((s, k) => s + (detail[k]?.inserted ?? 0), 0);

  return (
    <div className="rounded-xl overflow-hidden text-xs" style={{ border: "1px solid var(--border)" }}>
      {/* Summary header */}
      <div className="px-3 py-2 flex items-center justify-between"
        style={{ background: "var(--bg-card2)", borderBottom: "1px solid var(--border)" }}>
        <span className="font-semibold" style={{ color: "var(--green)" }}>
          {populated.length} of {displayable.length} tables populated
        </span>
        <span className="font-mono" style={{ color: "#6b7280" }}>
          {totalRows} rows
        </span>
      </div>
      {/* Per-table rows */}
      <div style={{ background: "var(--bg-card)", maxHeight: 220, overflowY: "auto" }}>
        {displayable.map((key, i) => {
          const count = detail?.[key]?.inserted ?? 0;
          const hasData = count > 0;
          const unit = ROW_UNIT[key] ?? "row";
          return (
            <div key={key} className="flex items-center justify-between px-3 py-1.5"
              style={{ borderBottom: i < displayable.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-2">
                <span style={{ color: hasData ? "var(--green)" : "#374151" }}>{hasData ? "✓" : "·"}</span>
                <span style={{ color: hasData ? "white" : "#4b5563" }}>{TABLE_LABELS[key]}</span>
              </div>
              <span className="font-mono" style={{ color: hasData ? "#9ca3af" : "#374151" }}>
                {hasData ? `${count} ${count === 1 ? unit : unit + "s"}` : "—"}
              </span>
            </div>
          );
        })}
      </div>
      {errors.length > 0 && (
        <div className="px-3 py-2 space-y-0.5"
          style={{ background: "rgba(251,191,36,0.05)", borderTop: "1px solid rgba(251,191,36,0.2)" }}>
          {errors.map(([key, val]) => (
            <p key={key} style={{ color: "#fbbf24" }}>⚠ {TABLE_LABELS[key] ?? key}: {val.error}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Design helpers ─────────────────────────────────────────────────────────────

function GradePill({ grade }) {
  if (!grade) return <span style={{ color: "#4b5563" }} className="text-xs">—</span>;
  const styles = {
    A: { background: "rgba(61,220,132,0.15)", color: "#3ddc84", border: "1px solid rgba(61,220,132,0.3)" },
    B: { background: "rgba(96,165,250,0.15)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.3)" },
    C: { background: "rgba(251,191,36,0.15)",  color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" },
    D: { background: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" },
  };
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold" style={styles[grade] || styles.D}>{grade}</span>
  );
}

function SortIcon({ active, dir }) {
  return (
    <span className="ml-1 text-xs" style={{ color: active ? "var(--green)" : "#374151" }}>
      {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
    </span>
  );
}

function ChurnVal({ v }) {
  if (v == null) return <span style={{ color: "#4b5563" }}>—</span>;
  const color = v < 5 ? "var(--green)" : v < 10 ? "var(--amber)" : "var(--red)";
  return <span style={{ color }} className="font-mono">{v}%</span>;
}

// ── Upload Modal ───────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }) {
  const [file, setFile]   = useState(null);
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError]  = useState(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const submit = async () => {
    if (!file || status === "uploading") return;
    setStatus("uploading"); setError(null);
    try { const d = await api.uploadDocument(file); setResult(d); setStatus("done"); }
    catch (err) { setError(err.message); setStatus("error"); }
  };

  // seeded retained for legacy compat but SeedSummary renders full detail now
  const seeded = result?.detail
    ? Object.entries(result.detail).filter(([, v]) => v?.inserted > 0).map(([t, v]) => `${t} (${v.inserted})`)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-white">Upload Pitch Deck</h2>
          <button onClick={onClose} style={{ color: "#4b5563" }} className="hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {status !== "done" && (
          <>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl p-8 text-center cursor-pointer transition-all mb-4"
              style={{ border: `2px dashed ${file ? "var(--green)" : "var(--border)"}`,
                       background: file ? "var(--green-dim)" : "var(--bg-card2)" }}>
              <input ref={inputRef} type="file" accept=".pdf,.pptx,.ppt,.docx"
                className="hidden" onChange={e => setFile(e.target.files[0] || null)} />
              {file ? (
                <div>
                  <div className="text-2xl mb-1">✓</div>
                  <p className="font-semibold text-white text-sm">{file.name}</p>
                  <p className="text-xs mt-1" style={{ color: "#6b7280" }}>{(file.size/1024/1024).toFixed(2)} MB</p>
                  <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="mt-2 text-xs hover:underline" style={{ color: "var(--red)" }}>Remove</button>
                </div>
              ) : (
                <div>
                  <svg className="w-8 h-8 mx-auto mb-2" style={{ color: "#4b5563" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-white font-medium">Drop or click to browse</p>
                  <p className="text-xs mt-1" style={{ color: "#4b5563" }}>PDF · PPTX · DOCX</p>
                </div>
              )}
            </div>

            {status === "uploading" && (
              <p className="text-sm mb-3 flex items-center gap-2" style={{ color: "var(--green)" }}>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Analysing document…
              </p>
            )}
            {status === "error" && <p className="text-sm mb-3" style={{ color: "var(--red)" }}>{error}</p>}

            <button onClick={submit} disabled={!file || status === "uploading"}
              className="w-full py-2.5 text-sm font-bold rounded-lg transition-opacity disabled:opacity-40"
              style={{ background: "var(--green)", color: "#0f0f0f" }}>
              {status === "uploading" ? "Processing…" : "Upload & Analyse"}
            </button>
          </>
        )}

        {status === "done" && (
          <div className="space-y-3">
            {result?.status === "skipped"
              ? <div className="p-3 rounded-lg text-sm"
                  style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24",
                           border: "1px solid rgba(251,191,36,0.2)" }}>
                  {result.detail}
                </div>
              : <>
                  <p className="text-sm font-bold" style={{ color: "var(--green)" }}>
                    ✓ Extraction complete
                  </p>
                  <SeedSummary detail={result?.detail} />
                </>}
            <div className="flex gap-2">
              <button onClick={onSuccess} className="flex-1 py-2 text-sm font-bold rounded-lg"
                style={{ background: "var(--green)", color: "#0f0f0f" }}>Done</button>
              <button onClick={() => { setStatus("idle"); setFile(null); setResult(null); }}
                className="flex-1 py-2 text-sm rounded-lg transition-colors"
                style={{ border: "1px solid var(--border)", color: "#9ca3af" }}>Upload another</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main table page ────────────────────────────────────────────────────────────

const COLS = [
  { key: "name",              label: "Company"         },
  { key: "sector",            label: "Sector"          },
  { key: "stage",             label: "Stage",          minWidth: 150 },
  { key: "net_revenue_cr",    label: "Revenue",        numeric: true },
  { key: "gross_margin_pct",  label: "Margin %",       numeric: true },
  { key: "ltv_cac_ratio",     label: "LTV:CAC",        numeric: true },
  { key: "churn_rate_pct",    label: "Churn %",        numeric: true },
  { key: "monthly_active_users", label: "MAU",         numeric: true },
  { key: "investment_grade",  label: "Score"           },
  { key: "headquarters_city", label: "Location"        },
];

export default function DashboardPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [source, setSource]       = useState("bigquery");
  const [showUpload, setShowUpload] = useState(false);
  const [sortCol, setSortCol]     = useState("name");
  const [sortDir, setSortDir]     = useState("asc");
  const [search, setSearch]       = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterStage, setFilterStage]   = useState("");

  const [bqError, setBqError] = useState(null);
  const [filterGrade, setFilterGrade] = useState("");
  const [bulkScoring, setBulkScoring] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);

  const fetchCompanies = () => {
    setLoading(true);
    setBqError(null);
    api.getCompanies()
      .then(d => { setCompanies(d.companies || []); setSource(d.source || "bigquery"); })
      .catch(e => setBqError(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchCompanies(); }, []);

  const sectors = useMemo(() => [...new Set(companies.map(c => c.sector).filter(Boolean))].sort(), [companies]);
  const stages  = useMemo(() => [...new Set(companies.map(c => c.stage).filter(Boolean))].sort(), [companies]);

  const deduplicated = useMemo(() => {
    const seenIds = new Set(), seenNames = new Set();
    return companies.filter(c => {
      if (seenIds.has(c.company_id)) return false;
      const n = (c.name || c.brand_name || "").toLowerCase().trim().replace(/\s+/g, " ");
      if (n && seenNames.has(n)) return false;
      seenIds.add(c.company_id);
      if (n) seenNames.add(n);
      return true;
    });
  }, [companies]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let d = deduplicated.filter(c => {
      if (q && !`${c.name||""} ${c.brand_name||""} ${c.short_description||""}`.toLowerCase().includes(q)) return false;
      if (filterSector && c.sector !== filterSector) return false;
      if (filterStage  && c.stage  !== filterStage)  return false;
      if (filterGrade  && c.investment_grade !== filterGrade) return false;
      return true;
    });
    return [...d].sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "string") { va = va.toLowerCase(); vb = (vb||"").toLowerCase(); }
      return sortDir === "asc" ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    });
  }, [deduplicated, search, filterSector, filterStage, filterGrade, sortCol, sortDir]);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const hasFilters = search || filterSector || filterStage || filterGrade;

  const exportCSV = () => {
    const cols = ["name", "sector", "stage", "net_revenue_cr", "gross_margin_pct", "ltv_cac_ratio",
                  "churn_rate_pct", "monthly_active_users", "investment_grade", "headquarters_city"];
    const header = ["Company", "Sector", "Stage", "Revenue (Cr)", "Margin %", "LTV:CAC",
                    "Churn %", "MAU", "Grade", "Location"];
    const rows = filtered.map(c => cols.map(k => {
      const v = c[k];
      if (v == null) return "";
      if (typeof v === "string" && v.includes(",")) return `"${v}"`;
      return String(v);
    }));
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dealsense-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const scoreAll = async () => {
    const unscored = deduplicated.filter(c => !c.investment_grade);
    if (!unscored.length) return;
    setBulkScoring(true);
    setBulkProgress({ done: 0, total: unscored.length });
    for (const c of unscored) {
      try { await api.scoreCompany(c.company_id); } catch { /* skip failed */ }
      setBulkProgress(p => ({ ...p, done: p.done + 1 }));
    }
    setBulkScoring(false);
    setBulkProgress(null);
    fetchCompanies();
  };

  const selectStyle = {
    background: "var(--bg-card2)", border: "1px solid var(--border)",
    color: "white", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem"
  };

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Dashboard</h1>
          <p className="text-xs mt-0.5" style={{ color: "#4b5563" }}>
            {loading ? "Loading…" : `${filtered.length} of ${companies.length} startups`}
            {source === "mock" && <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: "rgba(251,191,36,0.1)", color: "var(--amber)" }}>Demo data</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {deduplicated.some(c => !c.investment_grade) && (
            <button onClick={scoreAll} disabled={bulkScoring}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition-opacity"
              style={{ background: "#1e1e1e", color: "#9ca3af", border: "1px solid var(--border)" }}>
              {bulkScoring
                ? `Scoring ${bulkProgress?.done}/${bulkProgress?.total}…`
                : `Score all (${deduplicated.filter(c => !c.investment_grade).length})`}
            </button>
          )}
          <button onClick={exportCSV} title="Export filtered view as CSV"
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg transition-opacity hover:opacity-80"
            style={{ background: "#1e1e1e", color: "#9ca3af", border: "1px solid var(--border)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            CSV
          </button>
          <button onClick={() => setShowUpload(true)} className="ds-btn-green flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Deck
          </button>
        </div>
      </div>

      {/* BigQuery error banner */}
      {bqError && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}>
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="font-semibold mb-0.5">Database connection failed</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>{bqError}</p>
            <p className="text-xs mt-1" style={{ color: "#6b7280" }}>
              Please contact your system administrator to check database access permissions.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#4b5563" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search startups…"
            className="pl-8 pr-3 py-2 text-sm w-52 focus:outline-none focus:ring-1"
            style={{ ...selectStyle, paddingLeft: "2rem",
              boxShadow: search ? "0 0 0 1px var(--green)" : undefined }} />
        </div>
        <select value={filterSector} onChange={e => setFilterSector(e.target.value)} style={selectStyle}>
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} style={selectStyle}>
          <option value="">All Stages</option>
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} style={selectStyle}>
          <option value="">All Grades</option>
          <option value="A">A — Ready to Invest</option>
          <option value="B">B — Watch List</option>
          <option value="C">C — Not Ready Yet</option>
          <option value="D">D — Decline</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setFilterSector(""); setFilterStage(""); setFilterGrade(""); }}
            className="text-sm transition-colors" style={{ color: "#4b5563" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--green)"}
            onMouseLeave={e => e.currentTarget.style.color = "#4b5563"}>
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "var(--bg-card2)", borderBottom: "1px solid var(--border)" }}>
                {COLS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors"
                    style={{ color: sortCol === col.key ? "var(--green)" : "#4b5563",
                             minWidth: col.minWidth ? col.minWidth : undefined }}>
                    {col.label}<SortIcon active={sortCol === col.key} dir={sortDir} />
                  </th>
                ))}
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {COLS.map(c => (
                      <td key={c.key} className="px-4 py-4">
                        <div className="h-3.5 rounded animate-pulse" style={{ background: "#2a2a2a", width: "65%" }} />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLS.length + 1} className="px-4 py-16 text-center"
                    style={{ color: "#4b5563" }}>
                    <div className="text-3xl mb-2">📂</div>
                    {hasFilters ? "No startups match your filters." : "No startups yet — upload a pitch deck to get started."}
                  </td>
                </tr>
              ) : filtered.map((c, idx) => (
                <tr key={c.company_id} onClick={() => router.push(`/company/${c.company_id}`)}
                  className="cursor-pointer transition-colors group"
                  style={{ borderBottom: idx < filtered.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(61,220,132,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white text-sm group-hover:text-green-400 transition-colors"
                      style={{}}>
                      {c.name || c.brand_name || "—"}
                    </div>
                    {c.sub_sector && <div className="text-xs mt-0.5" style={{ color: "#4b5563" }}>{c.sub_sector}</div>}
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: "#9ca3af" }}>{c.sector || "—"}</td>
                  <td className="px-4 py-4">
                    {c.stage
                      ? <span className="px-2 py-0.5 text-xs font-medium rounded-full"
                          style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa" }}>{c.stage}</span>
                      : <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-right pr-6" style={{ color: "var(--green)" }}>
                    {cr(c.net_revenue_cr) ?? <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-right pr-6" style={{ color: "#9ca3af" }}>
                    {c.gross_margin_pct != null ? `${c.gross_margin_pct}%` : <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td className="px-4 py-4 font-mono text-sm text-right pr-6" style={{ color: "#9ca3af" }}>
                    {c.ltv_cac_ratio != null ? `${c.ltv_cac_ratio}x` : <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td className="px-4 py-4 text-sm text-right pr-6"><ChurnVal v={c.churn_rate_pct} /></td>
                  <td className="px-4 py-4 font-mono text-sm text-right pr-6" style={{ color: "#9ca3af" }}>
                    {compact(c.monthly_active_users) ?? <span style={{ color: "#374151" }}>—</span>}
                  </td>
                  <td className="px-4 py-4"><GradePill grade={c.investment_grade} /></td>
                  <td className="px-4 py-4 text-xs" style={{ color: "#4b5563" }}>
                    {[c.headquarters_city, c.headquarters_country].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span style={{ color: "#374151" }} className="group-hover:text-green-400 transition-colors text-sm">→</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <div className="px-4 py-2 text-xs" style={{ borderTop: "1px solid var(--border)", color: "#374151" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}{hasFilters ? ` filtered from ${companies.length}` : ""} · {source !== "mock" ? "Live data" : "Demo data"}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchCompanies(); }} />
      )}
    </div>
  );
}
