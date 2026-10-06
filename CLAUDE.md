# DealSense AI — Frontend

Next.js 16 App Router frontend for the DealSense AI VC deal-flow platform. Communicates with the FastAPI backend exclusively via REST API — no shared code.

## Tech Stack

- **Next.js 16** (App Router) + **React 19**
- **Tailwind v4** (CSS-first, `@import "tailwindcss"` in globals.css)
- **No auth** — internal tool, no login required

## Project Structure

```
src/
  app/
    layout.js                    # Root layout — fonts, metadata
    page.jsx                     # Redirect → /dashboard
    (app)/
      layout.jsx                 # Shared app layout (sidebar + main)
      dashboard/page.jsx         # Company list, portfolio overview
      upload/page.jsx            # File upload → backend
      company/[id]/page.jsx      # Company detail, score, DD checklist, PDF
      chat/page.jsx              # AI analyst chat interface
  components/
    Sidebar.jsx                  # "use client" — navigation links
  lib/
    api.js                       # All backend API calls
```

## API Configuration

Backend URL is set in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

All API calls go through `src/lib/api.js`. Never call `fetch` directly in pages — always use `api.*`.

## Key Patterns

### Fetching data in pages
All data pages use `"use client"` + `useEffect` + `useState`. No server-side fetching (backend requires fresh data):
```jsx
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function MyPage() {
  const [data, setData] = useState(null);
  useEffect(() => { api.getCompanies().then(setData); }, []);
  return <div>{data?.companies?.length} companies</div>;
}
```

### Adding a new page
1. Create `src/app/(app)/your-route/page.jsx`
2. It automatically gets the sidebar via `(app)/layout.jsx`
3. Add nav item to `src/components/Sidebar.jsx` `NAV` array

### Sidebar navigation
`Sidebar.jsx` uses `usePathname()` for active state. Items are in the `NAV` array — add objects with `{ label, href, icon }`.

## Running

```bash
cd frontend/frontend
npm install
npm run dev     # http://localhost:3000
```

## Pages Overview

| Route | File | Description |
|---|---|---|
| `/` | `app/page.jsx` | Redirects to `/dashboard` |
| `/dashboard` | `(app)/dashboard/page.jsx` | Company grid — calls `GET /companies` |
| `/upload` | `(app)/upload/page.jsx` | Drag-drop deck upload — calls `POST /extract-and-seed` |
| `/company/[id]` | `(app)/company/[id]/page.jsx` | Full detail: score, DD checklist, PDF download |
| `/chat` | `(app)/chat/page.jsx` | AI analyst chat — calls `POST /chat` |

## API Calls Reference

```js
api.getCompanies()           // GET /companies
api.getCompany(id)           // GET /companies/{id}
api.scoreCompany(id)         // POST /companies/{id}/score
api.getDDChecklist(id)       // GET /companies/{id}/dd-checklist
api.getDDPdfUrl(id)          // returns URL string for PDF download link
api.chat(message, companyId) // POST /chat
api.uploadDocument(file)     // POST /extract-and-seed
```
