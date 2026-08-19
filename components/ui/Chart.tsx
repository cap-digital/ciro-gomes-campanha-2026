import { svgPath } from "@/lib/style";

export type ChartLine = {
  values: number[];
  color: string;
  width?: number;
  dashed?: boolean;
  areaFill?: string;
};

export function SvgLines({ lines, height = 34 }: { lines: ChartLine[]; height?: number }) {
  if (!lines.length || lines.every((l) => !l.values.length)) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontSize: 11 }}>
        sem dados no período
      </div>
    );
  }
  return (
    <svg className="grafico" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      {lines.map(
        (l, i) => l.areaFill && <path key={"a" + i} d={svgPath(l.values, 100, height, true)} fill={l.areaFill} />,
      )}
      {lines.map((l, i) => (
        <path
          key={i}
          d={svgPath(l.values, 100, height)}
          fill="none"
          stroke={l.color}
          strokeWidth={l.width ?? 0.8}
          strokeDasharray={l.dashed ? "3 3" : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export function DayAxis({ labels }: { labels: string[] }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontFamily: "'Inter',sans-serif",
        fontVariantNumeric: "tabular-nums",
        fontSize: 9.5,
        color: "var(--dim)",
        paddingTop: 6,
      }}
    >
      {labels.map((d, i) => (
        <span key={i}>{d}</span>
      ))}
    </div>
  );
}
