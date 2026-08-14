import type { LabeledBar } from "@/lib/types";
import { barStyle } from "@/lib/style";

export function BarRow({ label, value, pct, color }: LabeledBar) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
        <span>{label}</span>
        <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", color: "var(--text2)" }}>{value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
        <div style={barStyle(pct, color || "#35D0FF", "100%")} />
      </div>
    </div>
  );
}

export function VerticalBar({ pct, color, label, value }: { pct: number; color: string; label: string; value?: string }) {
  return (
    <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 5, position: "relative" }}>
      {value && <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--text2)" }}>{value}</div>}
      <div style={{ width: "100%", height: `${Math.max(2, Math.min(100, pct))}%`, borderRadius: "6px 6px 3px 3px", background: color }} />
      <div style={{ position: "absolute", bottom: -16, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9, color: "var(--dim)", whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}

export function SplitBar({ leftPct, leftColor, rightColor }: { leftPct: number; leftColor: string; rightColor: string }) {
  return (
    <div style={{ display: "flex", height: 12, borderRadius: 99, overflow: "hidden", background: "var(--track)" }}>
      <div style={{ width: `${leftPct}%`, background: leftColor }} />
      <div style={{ width: `${100 - leftPct}%`, background: rightColor }} />
    </div>
  );
}
