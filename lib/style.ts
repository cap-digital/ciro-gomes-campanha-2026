import type { CSSProperties } from "react";

export function pillStyle(deltaLabel: string, good?: boolean): CSSProperties {
  const up = String(deltaLabel).trim().startsWith("+");
  const positive = good === undefined ? up : good;
  const bg = positive ? "var(--posBg)" : "var(--negBg)";
  const fg = positive ? "var(--posFg)" : "var(--negFg)";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    background: bg,
    color: fg,
    fontFamily: "'Inter',sans-serif",
    fontVariantNumeric: "tabular-nums",
    fontSize: 10,
    padding: "2px 7px",
    borderRadius: 6,
  };
}

export function chipStyle(active: boolean, accent?: string): CSSProperties {
  return {
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 600,
    padding: "6px 11px",
    borderRadius: 8,
    whiteSpace: "nowrap",
    background: active ? accent || "#2E8FFF" : "transparent",
    color: active ? "#fff" : "var(--muted)",
    border: active ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
    boxShadow: active ? "0 8px 16px -8px rgba(46,143,255,.7)" : "none",
    transition: "all .15s",
  };
}

export function barStyle(p: number, color: string, h: string | number = "100%"): CSSProperties {
  return {
    width: Math.max(2, Math.min(100, p)) + "%",
    height: h,
    background: color,
    borderRadius: 99,
  };
}

export function statusStyle(status: string): CSSProperties {
  const st = status.toUpperCase();
  return {
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".08em",
    padding: "3px 8px",
    borderRadius: 6,
    textTransform: "uppercase",
    background:
      st === "ATIVO" || st === "ATIVA"
        ? "rgba(33,196,106,.14)"
        : st === "TESTE"
          ? "rgba(245,179,1,.14)"
          : "rgba(255,255,255,.07)",
    color: st === "ATIVO" || st === "ATIVA" ? "#4BE08C" : st === "TESTE" ? "#FFCF54" : "#8FA0C4",
  };
}

/** Gera um path SVG (0..w, 0..h) a partir de uma série de valores. */
export function svgPath(vals: number[], w: number, h: number, close = false): string {
  if (!vals.length) return "";
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const r = max - min || 1;
  const pts = vals.map((v, i) => [
    (i / Math.max(1, vals.length - 1)) * w,
    h - ((v - min) / r) * (h - 3) - 1.5,
  ]);
  let d = "M" + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join(" L");
  if (close) d += ` L${w} ${h} L0 ${h} Z`;
  return d;
}
