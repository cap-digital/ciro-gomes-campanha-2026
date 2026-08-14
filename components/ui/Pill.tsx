import { pillStyle, statusStyle } from "@/lib/style";

export function Pill({ delta, good }: { delta: string; good?: boolean }) {
  if (!delta) return null;
  return <span style={pillStyle(delta, good)}>{delta}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span style={statusStyle(status)}>{status}</span>;
}

export function DataSourceBadge({ source }: { source: "live" | "mock" }) {
  const live = source === "live";
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: ".08em",
        padding: "3px 8px",
        borderRadius: 6,
        textTransform: "uppercase",
        background: live ? "rgba(33,196,106,.14)" : "rgba(245,179,1,.14)",
        color: live ? "#4BE08C" : "#FFCF54",
        whiteSpace: "nowrap",
      }}
    >
      {live ? "Dados ao vivo · Meta" : "Dados ilustrativos"}
    </span>
  );
}
