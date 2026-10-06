"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

const NAV = [
  {
    label: "Portfolio",
    href: "/dashboard",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  },
  {
    label: "Deal Analyst",
    href: "/chat",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />,
  },
  {
    label: "Glossary",
    href: "/faq",
    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredHref, setHoveredHref] = useState(null);

  const handleLogout = () => {
    api.logout();
    router.push("/login");
  };

  return (
    <aside className="flex flex-col w-52 min-h-screen shrink-0"
      style={{ background: "#111111", borderRight: "1px solid var(--border)" }}>

      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center font-black text-sm"
            style={{ background: "var(--green)", color: "#0f0f0f" }}>D</div>
          <span className="font-bold text-sm text-white">
            Deal<span style={{ color: "var(--green)" }}>Sense</span> AI
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          const isHovered = hoveredHref === href;
          return (
            <Link key={href} href={href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: active ? "var(--green-dim)" : isHovered ? "#1e1e1e" : "transparent",
                color: active ? "var(--green)" : isHovered ? "#fff" : "#9ca3af",
                borderLeft: active ? "2px solid var(--green)" : "2px solid transparent",
              }}
              onMouseEnter={() => setHoveredHref(href)}
              onMouseLeave={() => setHoveredHref(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">{icon}
              </svg>
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4 px-5 pb-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
        <p className="text-xs leading-relaxed" style={{ color: "#4b5563" }}>
          Upload pitch decks from<br />Portfolio to add startups.
        </p>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors text-left cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
