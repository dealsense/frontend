import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)" }}>
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">{children}</main>
    </div>
  );
}
