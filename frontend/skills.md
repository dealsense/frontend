# DealSense AI — Frontend Skills & Conventions

## Code Conventions

- All new pages go inside `src/app/(app)/` to inherit the sidebar layout
- New pages are always `"use client"` — data is fetched client-side via `useEffect`
- All API calls use `src/lib/api.js` — never raw `fetch` calls in components
- No comments on obvious code; only comment non-obvious constraints
- No TypeScript — plain JSX throughout

## Component Patterns

### Page skeleton (standard pattern)
```jsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MyPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.myEndpoint()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 animate-pulse">...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  return <div>{/* content */}</div>;
}
```

### Adding a new API method
Edit `src/lib/api.js` — add a method to the `api` object:
```js
async myNewEndpoint(param) {
  const res = await fetch(`${API_URL}/my-route/${param}`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
},
```

### Adding a sidebar nav item
Edit `src/components/Sidebar.jsx`, add to `NAV` array:
```jsx
{
  label: "New Page",
  href: "/new-page",
  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M..." />,
},
```

## Design System — Color Palette

**Dark theme** (always used — no light mode). Defined as CSS variables in `globals.css`:

| Variable        | Hex         | Usage                                    |
|----------------|-------------|------------------------------------------|
| `--bg-base`    | `#0f0f0f`   | Page background                          |
| `--bg-card`    | `#1a1a1a`   | Card / tile background                   |
| `--bg-card2`   | `#222222`   | Table header, hover state, nested bg     |
| `--border`     | `#2a2a2a`   | All borders                              |
| `--text-1`     | `#ffffff`   | Primary text                             |
| `--text-2`     | `#9ca3af`   | Secondary / body text                    |
| `--green`      | `#4ade80`   | **Primary accent** — scores, CTA buttons, positive values |
| `--green-dim`  | `rgba(74,222,128,0.15)` | Green tinted backgrounds |
| `--blue`       | `#60a5fa`   | Blue accent (B-grade, info)              |
| `--amber`      | `#fbbf24`   | Warning / C-grade / moderate             |
| `--red`        | `#f87171`   | Error / D-grade / high risk / churn >10% |

**Investment grades:**
- A (80-100) → `var(--green)` → "RECOMMENDED"
- B (60-79) → `var(--blue)` → "CONSIDER"
- C (40-59) → `var(--amber)` → "REVIEW"
- D (0-39) → `var(--red)` → "PASS"

**Churn color coding:**
- `< 5%` → `var(--green)`
- `5–10%` → `var(--amber)`
- `> 10%` → `var(--red)`

**Pre-built CSS classes (in globals.css):**
- `.ds-card` — standard dark card with border and padding
- `.ds-btn-green` — green CTA button (dark text, green bg)
- `.ai-insight-bar` — bottom AI insight notification bar
- `.score-ring-fill` — SVG score gauge glow (green)
- `.score-ring-fill-b/c/d` — same for blue/amber/red

**Page structure (`company/[id]/page.jsx`):**
- Row 1 (3 cols): Score gauge tile | Company overview tile | Investment recommendation tile
- Row 2 (3 cols): Key Metrics | Revenue Chart | Risk Assessment
- Row 3 (3 cols): Team & Founders | Funding | AI Due Diligence summary
- Full width: DD Checklist accordion
- Sticky bottom: AI Insight bar

## Tailwind v4 Notes

Tailwind v4 uses CSS-first configuration — no `tailwind.config.js`. All config is in `globals.css` via `@import "tailwindcss"`. Use standard Tailwind utility classes. For custom colors from the design system, use inline `style={{ color: "var(--green)" }}` rather than arbitrary Tailwind values.

## Environment

`.env.local` (never commit):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production, change to the deployed backend URL.

## Backend Contract

The frontend expects this shape from `GET /companies`:
```json
{ "companies": [...], "source": "bigquery" | "mock" }
```

From `GET /companies/{id}`:
```json
{
  "company": {...},
  "traction": [...],
  "team": [...],
  "market": [...],
  "financials": [...],
  "financial_projections": [...],
  "competitors": [...],
  "investors": [...],
  "fundraise_rounds": [...],
  "products": [...],
  "documents": [...],
  "dd_checklist": [...],
  "score": {...} | null,
  "source": "bigquery"
}
```

`company_id` values are returned as strings from the backend (converted from BigQuery INT64 to avoid JS precision loss).

## Common Issues

| Issue | Fix |
|---|---|
| CORS error | Ensure backend is running on `localhost:8000` and has CORS middleware enabled |
| `NEXT_PUBLIC_API_URL` not available | Check `.env.local` exists in `frontend/frontend/` (not project root) |
| `usePathname` crash | Ensure component has `"use client"` directive at top |
| Hydration error | Check that server/client render output matches — use `useEffect` for dynamic content |
