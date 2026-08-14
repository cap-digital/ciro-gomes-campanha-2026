import { getPublicoData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";
import { pillStyle } from "@/lib/style";

export default async function PublicoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getPublicoData(range);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 12, minHeight: 0 }}>
      <Panel gridRow="span 2" style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Faixa etária e gênero</div>
          <DataSourceBadge source={data.source} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
          {data.faixas.map((f, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "52px 1fr 1fr", gap: 8, alignItems: "center" }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--muted2)" }}>{f.label}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", height: 13 }}>
                <div style={{ width: `${Math.max(2, Math.min(100, f.male))}%`, background: "#2E8FFF", borderRadius: "4px 0 0 4px" }} />
              </div>
              <div style={{ display: "flex", height: 13 }}>
                <div style={{ width: `${Math.max(2, Math.min(100, f.female))}%`, background: "#F5B301", borderRadius: "0 4px 4px 0" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", paddingTop: 10, fontSize: 10.5, color: "var(--muted2)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#2E8FFF", display: "block" }} />
            Homens
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: "#F5B301", display: "block" }} />
            Mulheres
          </span>
        </div>
      </Panel>

      <Panel style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Dispositivos</div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
          {data.dispositivos.map((d, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span>{d.label}</span>
                <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", color: "var(--text2)" }}>{d.value}</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, Math.min(100, d.pct))}%`, height: "100%", background: d.color, borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Horários de pico</div>
        <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 4, paddingBottom: 16, position: "relative" }}>
          {data.horarios.map((h, i) => (
            <div key={i} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative" }}>
              <div style={{ width: "100%", height: `${Math.max(2, Math.min(100, h.pct))}%`, borderRadius: "4px 4px 2px 2px", background: h.color }} />
              <div style={{ position: "absolute", bottom: -15, left: 0, right: 0, textAlign: "center", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 8, color: "var(--dim)" }}>{h.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel gridColumn="span 2" style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Segmentos com melhor desempenho</div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 8, alignContent: "start" }}>
          {data.segmentos.map((g, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 60px 84px", gap: 12, alignItems: "center", background: "var(--soft)", borderRadius: 10, padding: "9px 12px" }}>
              <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--muted2)" }}>{g.cad}</div>
              <span style={pillStyle(g.good ? "+" : "-", g.good)}>{g.cpa}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
