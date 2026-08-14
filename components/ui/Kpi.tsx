import type { Kpi } from "@/lib/types";
import { Pill } from "./Pill";

export function KpiCard({ label, value, delta, note, good, big }: Kpi & { big?: boolean }) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: big ? 16 : 15,
        boxShadow: "var(--shadow)",
        padding: big ? "13px 15px" : "11px 13px",
        display: "flex",
        flexDirection: "column",
        gap: big ? 5 : 4,
        minHeight: 0,
      }}
    >
      <div
        style={{
          fontFamily: "'Inter',sans-serif",
          fontVariantNumeric: "tabular-nums",
          fontSize: big ? "clamp(17px,1.7vw,26px)" : "clamp(13px,1.35vw,19px)",
          fontWeight: 600,
          letterSpacing: "-.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: big ? 9.5 : 9,
          letterSpacing: ".14em",
          color: "var(--muted)",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
      {(delta || note) && (
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <Pill delta={delta} good={good} />
          {note && <span style={{ fontSize: 10.5, color: "var(--dim)" }}>{note}</span>}
        </div>
      )}
    </div>
  );
}

export function KpiGrid({ items, columns = 5 }: { items: Kpi[]; columns?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns},1fr)`, gap: 12 }}>
      {items.map((k, i) => (
        <KpiCard key={i} {...k} big />
      ))}
    </div>
  );
}
