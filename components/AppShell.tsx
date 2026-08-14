import { Suspense, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: "100vh", width: "100%", display: "flex", gap: 2, padding: "8px 8px 8px 0", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <Suspense fallback={<div style={{ width: 74, flex: "0 0 74px" }} />}>
        <Sidebar />
      </Suspense>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0, background: "var(--bg)" }}>
        <Suspense fallback={<div style={{ height: 60, flex: "0 0 60px", borderBottom: "1px solid var(--line)", background: "var(--panel2)" }} />}>
          <Header />
        </Suspense>
        <section style={{ flex: 1, minHeight: 0, padding: "16px 20px 18px", overflow: "hidden", animation: "rise .35s ease" }}>{children}</section>
      </main>
    </div>
  );
}
