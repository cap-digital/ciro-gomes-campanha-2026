import { getDesempenhoData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { KpiCard } from "@/components/ui/Kpi";
import { ChipLink } from "@/components/ui/Chip";
import { BarRow, VerticalBar } from "@/components/ui/Bar";
import { SvgLines, DayAxis } from "@/components/ui/Chart";
import { METRIC_LABELS, type Series } from "@/lib/types";

const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof Series)[];

export default async function DesempenhoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getDesempenhoData(range);

  const metricA = (typeof sp.metricA === "string" && METRIC_KEYS.includes(sp.metricA as keyof Series) ? sp.metricA : "cadastros") as keyof Series;
  const metricB = (typeof sp.metricB === "string" && METRIC_KEYS.includes(sp.metricB as keyof Series) ? sp.metricB : "investimento") as keyof Series;

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gridTemplateRows: "auto minmax(0,1.3fr) minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 10, minWidth: 0 }}>
        {data.bigNumbers.map((b, i) => (
          <KpiCard key={i} {...b} />
        ))}
      </div>

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8, minWidth: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Linha do tempo comparativa</div>
          <div style={{ marginLeft: "auto", minWidth: 0, overflow: "auto", display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "#35D0FF" }}>A</span>
            <div style={{ display: "flex", gap: 4 }}>
              {METRIC_KEYS.map((k) => (
                <ChipLink key={k} href={buildHref("/desempenho", sp, { metricA: k })} active={metricA === k} accent="#0E7FA8">
                  {METRIC_LABELS[k]}
                </ChipLink>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "var(--dim)" }}>vs</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "#F5B301" }}>B</span>
            <div style={{ display: "flex", gap: 4 }}>
              {METRIC_KEYS.map((k) => (
                <ChipLink key={k} href={buildHref("/desempenho", sp, { metricB: k })} active={metricB === k} accent="#8A6A00">
                  {METRIC_LABELS[k]}
                </ChipLink>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SvgLines
            lines={[
              { values: data.series[metricA], color: "var(--line1)", width: 0.9, areaFill: "var(--fill1)" },
              { values: data.series[metricB], color: "#F5B301", width: 0.7, dashed: true },
            ]}
          />
        </div>
        <DayAxis labels={data.dayLabels} />
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr) minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Interações</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
            {data.interacoes.map((i, idx) => (
              <BarRow key={idx} {...i} />
            ))}
          </div>
        </Panel>
        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Interações por criativo</div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 18, position: "relative" }}>
            {data.interCriativo.map((b, i) => (
              <VerticalBar
                key={i}
                pct={b.pct}
                label={b.label}
                color={i < 3 ? "linear-gradient(180deg,#35D0FF,#2E8FFF)" : "linear-gradient(180deg,rgba(53,208,255,.45),rgba(46,143,255,.25))"}
              />
            ))}
          </div>
        </Panel>
        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Retenção de vídeo</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
            {data.retencao.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--muted)", width: 34 }}>{r.label}</div>
                <div style={{ flex: 1, height: 14, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(2, Math.min(100, r.pct))}%`, height: "100%", borderRadius: 5, background: "linear-gradient(90deg,#2E8FFF,#35D0FF)" }} />
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--text2)", width: 34, textAlign: "right" }}>{r.value}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
