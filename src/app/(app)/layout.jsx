"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { api } from "@/lib/api";

export default function AppLayout({ children }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!api.getToken()) {
      router.push("/login");
      return;
    }

    api.me()
      .then(() => {
        setAuthorized(true);
      })
      .catch(() => {
        api.logout();
        router.push("/login");
      });
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-base)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-lg animate-spin flex items-center justify-center font-black text-sm"
               style={{ background: "var(--green)", color: "#0f0f0f" }}>
            D
          </div>
          <span className="text-sm" style={{ color: "var(--text-2)" }}>Verifying authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">{children}</main>
    </div>
  );
}
