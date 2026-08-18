import { pillStyle, statusStyle } from "@/lib/style";

export function Pill({ delta, good }: { delta: string; good?: boolean }) {
  if (!delta) return null;
  return <span style={pillStyle(delta, good)}>{delta}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <span style={statusStyle(status)}>{status}</span>;
}

/**
 * Origem dos dados. Não existe mais dataset ilustrativo: ou o dado veio da Meta,
 * ou a consulta falhou — e nesse caso o painel precisa dizer isso, e não exibir
 * zeros como se fossem "sem entrega no período".
 */
export function DataSourceBadge({ source }: { source: "live" | "mock" | "erro" }) {
  const estado =
    source === "live"
      ? { texto: "Dados ao vivo · Meta", bg: "rgba(33,196,106,.14)", fg: "#4BE08C" }
      : source === "erro"
        ? { texto: "Falha ao consultar a Meta", bg: "rgba(228,34,43,.16)", fg: "#FF8189" }
        : { texto: "Sem dados", bg: "rgba(245,179,1,.14)", fg: "#FFCF54" };
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: ".08em",
        padding: "3px 8px",
        borderRadius: 6,
        textTransform: "uppercase",
        background: estado.bg,
        color: estado.fg,
        whiteSpace: "nowrap",
      }}
    >
      {estado.texto}
    </span>
  );
}
