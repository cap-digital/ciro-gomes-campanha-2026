import { getEficienciaData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel, AccentPanel } from "@/components/ui/Panel";
import { KpiCard } from "@/components/ui/Kpi";
import { BarRow } from "@/components/ui/Bar";
import { DataSourceBadge } from "@/components/ui/Pill";

export default async function EficienciaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getEficienciaData(range);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.35fr 1fr", gridTemplateRows: "auto 1fr", gap: 12, minHeight: 0 }}>
      <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {data.eficKpis.map((k, i) => (
          <KpiCard key={i} {...k} big />
        ))}
      </div>

      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>{data.costLabel} × volume — por campanha</div>
          <DataSourceBadge source={data.source} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
          {data.eficRows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 62px 62px", gap: 10, alignItems: "center", background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 11, padding: "8px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, flex: "0 0 7px", background: r.color }} />
                <span style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(2, Math.min(100, r.pct))}%`, height: "100%", background: r.color, borderRadius: 99 }} />
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 11, textAlign: "right" }}>{r.cpa}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 11, textAlign: "right", color: "var(--muted2)" }}>{r.vol}</div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 12, minHeight: 0 }}>
        <Panel style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Eficiência por objetivo</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
            {data.eficObjetivo.map((o, i) => (
              <BarRow key={i} {...o} />
            ))}
          </div>
        </Panel>
        <AccentPanel style={{ padding: "14px 16px", gap: 8, overflow: "auto" }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 13 }}>Onde está o desperdício</div>
          {data.desperdicio.map((d, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text2)" }}>
              — {d}
            </div>
          ))}
        </AccentPanel>
      </div>
    </div>
  );
}
