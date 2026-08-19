import { getCampanhasData } from "@/lib/dashboard";
import { brl, pct } from "@/lib/format";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { resolveImposto, IMPOSTO_ROTULO } from "@/lib/imposto";
import { Panel } from "@/components/ui/Panel";
import { SplitBar } from "@/components/ui/Bar";
import { SvgLines, DayAxis } from "@/components/ui/Chart";
import { DataSourceBadge } from "@/components/ui/Pill";
import { CampaignListPanel } from "@/components/CampaignListPanel";
import { ChipLink } from "@/components/ui/Chip";

export default async function CampanhasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const imposto = resolveImposto(sp.imposto);
  const data = await getCampanhasData(range, imposto);

  const dLabels = data.daily.map((d) => d.date.slice(8, 10) + "/" + d.date.slice(5, 7));
  const investLine = data.daily.map((d) => d.spend);
  const cadastroLine = data.daily.map((d) => d.leads);
  const cpaLine = data.daily.map((d) => d.cpa);

  return (
    <div
      className="pag"
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "repeat(12,minmax(0,1fr))",
        gridTemplateRows: "minmax(196px,1.45fr) minmax(0,.42fr) minmax(0,1.05fr)",
        gap: 12,
        minHeight: 0,
      }}
    >
      <Panel gridColumn="span 5" style={{ padding: "15px 17px", gap: 11, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Investimento total</div>
          <DataSourceBadge source={data.source} />
        </div>

        {/* O plano de mídia é escrito em valores brutos e o gerenciador reporta
            líquido. Sem escolher a moeda, o painel comparava os dois direto e
            subestimava tanto o percentual gasto quanto a média diária necessária. */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", flexShrink: 0 }}>
          <span style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>Valores</span>
          <ChipLink href={buildHref("/campanhas", sp, { imposto: "com" })} active={imposto === "com"}>Com imposto</ChipLink>
          <ChipLink href={buildHref("/campanhas", sp, { imposto: "sem" })} active={imposto === "sem"}>Sem imposto</ChipLink>
          <span style={{ fontSize: 10, color: "var(--dim)" }}>
            {imposto === "com"
              ? `bruto — como no plano de mídia, com os ${IMPOSTO_ROTULO} de imposto da Meta`
              : `líquido — mídia entregue, sem os ${IMPOSTO_ROTULO} de imposto da Meta`}
          </span>
        </div>
        <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(22px,2.4vw,32px)", fontWeight: 600, letterSpacing: "-.02em" }}>
          {data.totalInvest}
        </div>
        <div style={{ flexShrink: 0 }}>
          <SplitBar leftPct={data.kwaiPct} leftColor="#FF7A00" rightColor="#2E8FFF" />
        </div>
        <div className="emp" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, minWidth: 0, flexShrink: 0 }}>
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

        {/* Pacing do budget: quanto do plano já saiu e quanto precisa sair por
            dia até o 1º turno. Sem isso o "investimento total" não diz se a
            campanha está adiantada ou atrasada. */}
        <div
          className="emp"
          style={{
            marginTop: 12,
            display: "grid",
            // auto-fit: em painel estreito os cards quebram linha em vez de
            // espremer e sobrepor os rótulos.
            gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))",
            gap: 10,
            flexShrink: 0,
          }}
        >
          {[
            {
              label: "Já investido",
              valor: pct(data.pacing.pctGasto, 1),
              // O saldo entra como nota do próprio card: o número grande segue
              // sendo o percentual, e o card de verba vira redundante com a
              // barra de progresso logo abaixo.
              nota: `Ainda disponível ${brl(data.pacing.restante, 0)}`,
              cor: "#35D0FF",
            },
            {
              label: "Dias até o 1º turno",
              valor: String(data.pacing.diasRestantes),
              nota: data.pacing.dataEleicao.split("-").reverse().join("/"),
              cor: "#F5B301",
            },
            {
              label: "Média diária necessária",
              valor: brl(data.pacing.mediaDiariaNecessaria, 0),
              nota:
                data.pacing.mediaDiariaAtual > 0
                  ? `ritmo atual ${brl(data.pacing.mediaDiariaAtual, 0)}/dia`
                  : "para usar toda a verba",
              cor:
                data.pacing.mediaDiariaAtual > 0 && data.pacing.mediaDiariaAtual >= data.pacing.mediaDiariaNecessaria
                  ? "#4BE08C"
                  : "#FF8189",
            },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 11px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, letterSpacing: ".12em", color: "var(--muted)", textTransform: "uppercase", lineHeight: 1.3 }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(14px,1.25vw,18px)", fontWeight: 600, color: k.cor, whiteSpace: "nowrap" }}>{k.valor}</div>
              <div style={{ fontSize: 10, color: "var(--dim)", lineHeight: 1.35 }}>{k.nota}</div>
            </div>
          ))}
        </div>

        {/* Barra de progresso da verba prevista no plano de mídia. */}
        <div style={{ marginTop: 10, flexShrink: 0 }}>
          <div style={{ position: "relative", height: 8, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(0.5, Math.min(100, data.pacing.pctGasto))}%`,
                height: "100%",
                borderRadius: 99,
                background: "linear-gradient(90deg,#2E8FFF,#35D0FF)",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--dim)" }}>
            <span>{brl(data.pacing.gasto, 0)} investidos</span>
            <span>{brl(data.pacing.budget, 0)} de verba prevista</span>
          </div>
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
              { values: investLine, color: "var(--line1)", width: 0.8, areaFill: "var(--fill1)" },
              { values: cadastroLine, color: "#F5B301", width: 0.6 },
              { values: cpaLine, color: "#E4222B", width: 0.6, dashed: true },
            ]}
          />
        </div>
        <DayAxis labels={dLabels} />
      </Panel>

      <div className="emp" style={{ gridColumn: "span 12", minWidth: 0, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 12, minHeight: 0 }}>
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

      <CampaignListPanel title="Campanhas · Kwai Ads" dotColor="#FF7A00" campaigns={data.kwaiCampaigns} resultLabel={data.resultLabel} costLabel={data.costLabel} />
      <CampaignListPanel title="Campanhas · Meta Ads" dotColor="#2E8FFF" campaigns={data.metaCampaigns} resultLabel={data.resultLabel} costLabel={data.costLabel} />
    </div>
  );
}
