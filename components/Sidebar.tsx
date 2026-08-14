"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "./ThemeProvider";

const railIcon = {
  width: 28,
  height: 28,
  flex: "0 0 28px",
  borderRadius: 99,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
} as const;

function Tooltip({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <span
      style={{
        position: "absolute",
        left: 40,
        top: "50%",
        transform: "translateY(-50%)",
        background: "#0A1226",
        color: "#fff",
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        padding: "6px 11px",
        borderRadius: 9,
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 14px 28px -12px rgba(0,0,0,.8)",
        pointerEvents: "none",
        zIndex: 40,
        display: show ? "block" : "none",
      }}
    >
      {children}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hover, setHover] = useState<string | null>(null);
  const { theme, toggle } = useTheme();
  const qs = searchParams.toString();

  return (
    <aside style={{ width: 74, flex: "0 0 74px", padding: "8px 8px 8px 10px", display: "flex", flexDirection: "column", minHeight: 0, zIndex: 5 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--rail)",
          borderRadius: 32,
          boxShadow: "var(--railShadow)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 8px",
          gap: 6,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            flex: "0 0 38px",
            borderRadius: 99,
            background: "var(--slot8)",
            border: "2px solid rgba(255,255,255,.18)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <span style={{ fontSize: 7, color: "rgba(255,255,255,.55)", textAlign: "center", lineHeight: 1.1 }}>foto</span>
        </div>

        <div style={{ height: 1, width: 26, background: "rgba(255,255,255,.12)", flex: "0 0 1px" }} />

        <nav style={{ flex: "1 1 auto", overflow: "visible", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", gap: 0 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.route;
            return (
              <Link
                key={item.id}
                href={qs ? `${item.route}?${qs}` : item.route}
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
                scroll={false}
              >
                <span
                  className="ms"
                  style={{
                    ...railIcon,
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#0A1226" : "rgba(255,255,255,.62)",
                    boxShadow: active ? `0 8px 18px -6px ${item.color}99` : "none",
                    transition: "all .18s ease",
                  }}
                >
                  {item.icon}
                </span>
                <Tooltip show={hover === item.id}>{item.label}</Tooltip>
              </Link>
            );
          })}
        </nav>

        <div style={{ height: 1, width: 26, background: "rgba(255,255,255,.12)", flex: "0 0 1px" }} />

        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            onClick={toggle}
            onMouseEnter={() => setHover("__theme")}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
          >
            <span className="ms" style={railIcon}>
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
            <Tooltip show={hover === "__theme"}>{theme === "dark" ? "Tema claro" : "Tema escuro"}</Tooltip>
          </div>
          <div
            onMouseEnter={() => setHover("__exit")}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
          >
            <span className="ms" style={railIcon}>
              logout
            </span>
            <Tooltip show={hover === "__exit"}>Sair</Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
