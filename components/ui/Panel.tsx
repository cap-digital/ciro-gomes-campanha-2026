import type { CSSProperties, ReactNode } from "react";

export function Panel({
  children,
  style,
  gridColumn,
  gridRow,
}: {
  children: ReactNode;
  style?: CSSProperties;
  gridColumn?: string;
  gridRow?: string;
}) {
  return (
    <div
      className="painel"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        boxShadow: "var(--shadow)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        minWidth: 0,
        gridColumn,
        gridRow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AccentPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="painel"
      style={{
        background: "var(--panelAccent)",
        border: "1px solid var(--accentLine)",
        borderRadius: 18,
        boxShadow: "var(--shadow)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>{children}</div>
      {right ? <div style={{ marginLeft: "auto" }}>{right}</div> : null}
    </div>
  );
}
