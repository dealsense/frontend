"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

// ── Extraction result helpers ──────────────────────────────────────────────────

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
  // internal — hidden
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
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {/* Summary header */}
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ background: "var(--bg-card2)", borderBottom: "1px solid var(--border)" }}>
        <span className="text-sm font-semibold" style={{ color: "var(--green)" }}>
          {populated.length} of {displayable.length} tables populated
        </span>
        <span className="text-xs font-mono" style={{ color: "#6b7280" }}>
          {totalRows} rows extracted
        </span>
      </div>

      {/* Per-table rows */}
      <div style={{ background: "var(--bg-card)" }}>
        {displayable.map((key, i) => {
          const count = detail?.[key]?.inserted ?? 0;
          const hasData = count > 0;
          const unit = ROW_UNIT[key] ?? "row";
          const label = TABLE_LABELS[key];
          return (
            <div key={key}
              className="flex items-center justify-between px-4 py-2"
              style={{ borderBottom: i < displayable.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div className="flex items-center gap-2.5">
                <span className="text-xs w-3 text-center"
                  style={{ color: hasData ? "var(--green)" : "#374151" }}>
                  {hasData ? "✓" : "·"}
                </span>
                <span className="text-sm" style={{ color: hasData ? "white" : "#4b5563" }}>
                  {label}
                </span>
              </div>
              <span className="text-xs font-mono"
                style={{ color: hasData ? "#9ca3af" : "#374151" }}>
                {hasData ? `${count} ${count === 1 ? unit : unit + "s"}` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="px-4 py-3 space-y-1"
          style={{ background: "rgba(251,191,36,0.05)", borderTop: "1px solid rgba(251,191,36,0.2)" }}>
          {errors.map(([key, val]) => (
            <p key={key} className="text-xs" style={{ color: "#fbbf24" }}>
              ⚠ {TABLE_LABELS[key] ?? key}: {val.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const MAX_DOCS = 6;

export default function UploadPage() {
  const [files, setFiles]   = useState([]);
  const [driveLinks, setDriveLinks] = useState("");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError]   = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const inputRef = useRef(null);

  const addFiles = (list) => {
    const incoming = Array.from(list || []);
    if (!incoming.length) return;
    setFiles(prev => {
      const merged = [...prev, ...incoming].slice(0, MAX_DOCS);
      return merged;
    });
  };

  const handleDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const linkList = driveLinks.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  const totalDocs = files.length + linkList.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!totalDocs) return;

    // Client-side size guard (50MB per file)
    const oversized = files.find(f => f.size > 50 * 1024 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" is too large. Maximum size is 50MB per file.`);
      setStatus("error");
      return;
    }
    if (totalDocs > MAX_DOCS) {
      setError(`Maximum ${MAX_DOCS} documents per upload.`);
      setStatus("error");
      return;
    }

    setStatus("uploading"); setError(null); setResult(null);
    setJobStatus(totalDocs > 1 ? `Uploading ${totalDocs} documents…` : "Uploading file…");

    let jobId;
    try {
      const data = (files.length === 1 && linkList.length === 0)
        ? await api.uploadDocument(files[0])
        : await api.uploadDocumentsMulti(files, linkList);

      // Skipped duplicate (single-file path only)
      if (data.status === "skipped") {
        setResult(data); setStatus("done"); setJobStatus(null);
        return;
      }

      jobId = data.job_id;
      if (!jobId) {
        // Fallback: old synchronous response (shouldn't happen)
        setResult(data); setStatus("done"); setJobStatus(null);
        return;
      }
    } catch (err) {
      setError(err.message); setStatus("error"); setJobStatus(null);
      return;
    }

    // Poll until job is completed or failed
    setJobStatus(totalDocs > 1 ? "Extracting & merging documents…" : "Extracting & analysing document…");
    const poll = async () => {
      try {
        const job = await api.getExtractionStatus(jobId);
        if (job.status === "completed") {
          setResult({ status: "ok", detail: job.extraction_detail });
          setStatus("done");
          setJobStatus(null);
        } else if (job.status === "failed") {
          setError(job.error_summary || "Extraction failed.");
          setStatus("error");
          setJobStatus(null);
        } else {
          setTimeout(poll, 2000);
        }
      } catch {
        setTimeout(poll, 2000);
      }
    };
    setTimeout(poll, 2000);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Upload Pitch Deck</h1>
      <p className="text-sm mb-8" style={{ color: "#4b5563" }}>
        PDF, PPTX, or DOCX — extracted, structured, and seeded into your portfolio automatically.
        Upload multiple documents for one company (deck + financial model + cap table) and they'll
        be merged into a single profile.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Drop zone */}
        <div
          onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl p-12 text-center cursor-pointer transition-all mb-3"
          style={{ border: `2px dashed ${files.length ? "var(--green)" : "var(--border)"}`,
                   background: files.length ? "var(--green-dim)" : "var(--bg-card)" }}>
          <input ref={inputRef} type="file" accept=".pdf,.pptx,.ppt,.docx" multiple
            className="hidden" onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
          <svg className="w-10 h-10 mx-auto mb-3" style={{ color: "#374151" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <p className="font-medium text-white">Drop file(s) or click to browse</p>
          <p className="text-sm mt-1" style={{ color: "#4b5563" }}>PDF · PPTX · DOCX — up to {MAX_DOCS} files</p>
        </div>

        {/* Selected files list */}
        {files.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-card2)", border: "1px solid var(--border)" }}>
                <span className="text-white truncate">{f.name}</span>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span style={{ color: "#6b7280" }} className="text-xs">{(f.size/1024/1024).toFixed(2)} MB</span>
                  <button type="button" onClick={() => removeFile(i)}
                    className="hover:underline text-xs" style={{ color: "#f87171" }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Google Drive links */}
        <div className="mb-4">
          <label className="text-xs font-semibold block mb-1.5" style={{ color: "#6b7280" }}>
            Or paste Google Drive link(s) — one per line
          </label>
          <textarea
            value={driveLinks}
            onChange={e => setDriveLinks(e.target.value)}
            placeholder="https://drive.google.com/file/d/..."
            rows={2}
            className="w-full text-sm rounded-lg px-3 py-2 resize-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "white" }}
          />
          <p className="text-xs mt-1" style={{ color: "#4b5563" }}>
            File must be shared as "Anyone with the link can view".
          </p>
        </div>

        <button type="submit" disabled={!totalDocs || status === "uploading"}
          className="w-full py-3 text-sm font-bold rounded-xl transition-opacity disabled:opacity-40"
          style={{ background: "var(--green)", color: "#0f0f0f" }}>
          {status === "uploading" ? "Extracting & seeding…" : totalDocs > 1 ? `Upload & Analyse ${totalDocs} Documents` : "Upload & Analyse"}
        </button>
      </form>

      {/* Uploading / processing state */}
      {status === "uploading" && (
        <div className="mt-5 p-4 rounded-xl flex items-center gap-3 text-sm"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--green)" }}>
          <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {jobStatus || "Processing…"}
        </div>
      )}

      {/* Done state */}
      {status === "done" && (
        <div className="mt-5 space-y-3">
          {result?.status === "skipped" ? (
            <div className="p-4 rounded-xl text-sm"
              style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24",
                       border: "1px solid rgba(251,191,36,0.25)" }}>
              {result.detail}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold mb-1"
                style={{ color: "var(--green)" }}>
                <span>✓</span> Upload & extraction complete
              </div>
              <SeedSummary detail={result?.detail} />
            </>
          )}
          <Link href="/dashboard"
            className="block text-center py-2.5 text-sm font-semibold rounded-xl transition-opacity hover:opacity-80"
            style={{ background: "var(--green)", color: "#0f0f0f" }}>
            View Portfolio →
          </Link>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="mt-5 p-4 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.08)", color: "#f87171",
                   border: "1px solid rgba(248,113,113,0.25)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
