import { getCampanhasData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { SplitBar } from "@/components/ui/Bar";
import { SvgLines, DayAxis } from "@/components/ui/Chart";
import { DataSourceBadge } from "@/components/ui/Pill";
import { CampaignListPanel } from "@/components/CampaignListPanel";
import { dayLabels as mockDayLabels, series as mockSeries } from "@/lib/mock/data";

export default async function CampanhasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getCampanhasData(range);

  const dLabels = data.daily?.length ? data.daily.map((d) => d.date.slice(8, 10) + "/" + d.date.slice(5, 7)) : mockDayLabels;
  const investLine = data.daily?.length ? data.daily.map((d) => d.spend) : undefined;
  const cadastroLine = data.daily?.length ? data.daily.map((d) => d.leads) : undefined;
  const cpaLine = data.daily?.length ? data.daily.map((d) => d.cpa) : undefined;

  return (
    <div
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(12,minmax(0,1fr))",
        gridTemplateRows: "minmax(196px,1.45fr) minmax(0,.42fr) minmax(0,1.05fr)",
        gap: 12,
        minHeight: 0,
      }}
    >
      <Panel gridColumn="span 5" style={{ padding: "15px 17px", gap: 11 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Investimento total</div>
          <DataSourceBadge source={data.source} />
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(22px,2.4vw,32px)", fontWeight: 600, letterSpacing: "-.02em" }}>
          {data.totalInvest}
        </div>
        <SplitBar leftPct={data.kwaiPct} leftColor="#FF7A00" rightColor="#2E8FFF" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, minWidth: 0, minHeight: 0 }}>
          {data.splitCards.map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: s.color, display: "block" }} />
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>{s.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "var(--text2)" }}>{s.pct}</span>
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 15.5, marginTop: 5 }}>{s.value}</div>
              <div style={{ fontSize: 10.5, color: "#6E7EA6", marginTop: 3 }}>{s.note}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel gridColumn="span 7" style={{ padding: "15px 17px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Linha do tempo de indicadores</div>
          <div style={{ display: "flex", gap: 12, fontSize: 10.5, color: "var(--muted2)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 2, background: "#35D0FF", display: "block" }} />
              Investimento
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 2, background: "#F5B301", display: "block" }} />
              Cadastros
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 14, height: 2, background: "#E4222B", display: "block" }} />
              CPA
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <SvgLines
            lines={[
              { values: investLine ?? mockSeries.investimento, color: "var(--line1)", width: 0.8, areaFill: "var(--fill1)" },
              { values: cadastroLine ?? mockSeries.cadastros, color: "#F5B301", width: 0.6 },
              { values: cpaLine ?? mockSeries.cpa, color: "#E4222B", width: 0.6, dashed: true },
            ]}
          />
        </div>
        <DayAxis labels={dLabels} />
      </Panel>

      <div style={{ gridColumn: "span 12", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 12, minHeight: 0 }}>
        {data.resultCards.map((r, i) => (
          <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "13px 14px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, minHeight: 0 }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>{r.label}</div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(15px,1.5vw,22px)" }}>{r.value}</div>
            {r.delta && (
              <div style={{ display: "inline-flex", alignSelf: "flex-start", background: r.good ? "var(--posBg)" : "var(--negBg)", color: r.good ? "var(--posFg)" : "var(--negFg)", fontSize: 10, padding: "2px 7px", borderRadius: 6 }}>
                {r.delta}
              </div>
            )}
          </div>
        ))}
      </div>

      <CampaignListPanel title="Campanhas · Kwai Ads" dotColor="#FF7A00" campaigns={data.kwaiCampaigns} />
      <CampaignListPanel title="Campanhas · Meta Ads" dotColor="#2E8FFF" campaigns={data.metaCampaigns} />
    </div>
  );
}
