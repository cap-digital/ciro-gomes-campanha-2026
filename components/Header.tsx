"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { ChipLink, ChipRow } from "./ui/Chip";
import { DateRangePicker } from "./DateRangePicker";

const PLATFORMS: { id: string; label: string; accent?: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "kwai", label: "Kwai", accent: "#FF7A00" },
  { id: "meta", label: "Meta", accent: "#2E8FFF" },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = NAV_ITEMS.find((n) => n.route === pathname) ?? NAV_ITEMS[0];
  const platform = searchParams.get("platform") || "todas";

  function withParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <header
      style={{
        height: 60,
        flex: "0 0 60px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        borderBottom: "1px solid var(--line)",
        background: "var(--panel2)",
        zIndex: 2,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "'Poppins',sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {current.label}
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--dim)" }}>{current.route}</div>
      </div>

      <ChipRow>
        {PLATFORMS.map((p) => (
          <ChipLink key={p.id} href={withParam("platform", p.id)} active={platform === p.id} accent={p.accent}>
            {p.label}
          </ChipLink>
        ))}
      </ChipRow>

      <DateRangePicker />

      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 12, borderLeft: "1px solid var(--line)" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 99,
            background: "linear-gradient(135deg,#E4222B,#8E0F16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          RC
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.2 }}>
          <div style={{ fontWeight: 600 }}>Sala de mídia</div>
          <div style={{ fontSize: 9.5, color: "var(--dim)" }}>gestor@campanha</div>
        </div>
      </div>
    </header>
  );
}
