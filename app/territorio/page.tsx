import { getTerritorioData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";

export default async function TerritorioPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getTerritorioData(range);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, minHeight: 0 }}>
      <Panel style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Distribuição no estado</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <DataSourceBadge source={data.source} />
            <div style={{ fontSize: 10.5, color: "var(--dim)" }}>cadastros por segmentação geográfica</div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, borderRadius: 12, background: "var(--slot12)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 11, color: "#8FA7DA", letterSpacing: ".1em" }}>[ mapa da Bahia · choropleth ]</span>
          <div style={{ position: "absolute", left: 14, bottom: 14, display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--text2)" }}>
            <span>menos</span>
            <span style={{ width: 90, height: 7, borderRadius: 99, background: "linear-gradient(90deg,rgba(46,143,255,.2),#35D0FF)", display: "block" }} />
            <span>mais</span>
          </div>
        </div>
      </Panel>
      <div style={{ display: "grid", gridTemplateRows: "1.15fr 1fr", gap: 12, minHeight: 0 }}>
        <Panel style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Top municípios</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {data.municipios.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 58px", gap: 9, alignItems: "center" }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--dim)" }}>{m.rank}</div>
                <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(2, Math.min(100, m.pct))}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#2E8FFF,#35D0FF)" }} />
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "var(--text2)" }}>{m.value}</div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Regiões</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {data.regioes.map((r, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 66px 60px 52px", gap: 8, alignItems: "center", padding: "7px 9px", background: "var(--soft)", borderRadius: 9 }}>
                <div style={{ fontSize: 11.5 }}>{r.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right" }}>{r.invest}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "var(--muted2)" }}>{r.cad}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "#4BE08C" }}>{r.cpa}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
