"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";
import { MapaCeara, populacaoDe, FONTE_POPULACAO, FONTE_POPULACAO_CURTA, type ModoMapa } from "@/components/MapaCeara";
import { METRICAS_TERRITORIO, metricasVisiveis, pctDe, rotularMetricas, type MetricaId } from "@/lib/metricas";
import { brl, num, pct } from "@/lib/format";

export type LinhaGeo = {
  nome: string;
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  cpa: number;
  cpm: number;
};

export function TerritorioClient({
  municipios,
  regioes,
  resultLabel,
  costLabel,
  source,
}: {
  municipios: LinhaGeo[];
  regioes: LinhaGeo[];
  resultLabel: string;
  costLabel: string;
  source: "live" | "mock" | "erro";
}) {
  // Alcance é o padrão: em campanha eleitoral a pergunta é "quantas pessoas
  // dessa cidade eu atingi", não quanto gastei nela.
  const [metricaId, setMetricaId] = useState<MetricaId>("alcance");
  const [modo, setModo] = useState<ModoMapa>("municipio");
  const defs = useMemo(() => rotularMetricas(resultLabel, costLabel), [resultLabel, costLabel]);
  const metrica = defs[metricaId];

  const ordenados = useMemo(() => {
    const comValor = municipios.filter((m) => m[metricaId] > 0);
    // Custo: menor é melhor, então o ranking inverte.
    return [...comValor].sort((a, b) => (metrica.menorMelhor ? a[metricaId] - b[metricaId] : b[metricaId] - a[metricaId]));
  }, [municipios, metricaId, metrica.menorMelhor]);

  const maxRanking = Math.max(...ordenados.map((m) => m[metricaId]), 1);

  // O mapa sempre dimensiona por "quanto mais, maior a bolha". Para métricas de
  // custo isso se inverteria visualmente, então nelas a bolha usa o investimento
  // e o valor de custo aparece no tooltip.
  const metricaDoMapa = metrica.menorMelhor ? defs.investimento : metrica;
  const pontos = useMemo(
    () =>
      municipios.map((m) => ({
        nome: m.nome,
        valor: metrica.menorMelhor ? m.investimento : m[metricaId],
        detalhe: metrica.menorMelhor ? `${metrica.label}: ${metrica.formatar(m[metricaId])}` : undefined,
        alcance: m.alcance,
      })),
    [municipios, metricaId, metrica],
  );

  return (
    <div className="pag" style={{ height: "100%", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, minHeight: 0 }}>
      <Panel style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>
            {modo === "municipio" ? "Distribuição no estado" : "Distribuição por regiões"}
          </div>
          <button
            onClick={() => setModo(modo === "municipio" ? "regiao" : "municipio")}
            style={{
              cursor: "pointer",
              fontSize: 10.5,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 7,
              whiteSpace: "nowrap",
              background: "transparent",
              color: "#35D0FF",
              border: "1px solid rgba(53,208,255,.35)",
              fontFamily: "inherit",
            }}
          >
            {modo === "municipio" ? "Ver por regiões" : "Ver por município"}
          </button>
          <span style={{ width: 1, height: 16, background: "var(--line)" }} />
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {metricasVisiveis(METRICAS_TERRITORIO, defs).map((id) => (
              <button
                key={id}
                onClick={() => setMetricaId(id)}
                style={{
                  cursor: "pointer",
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "5px 9px",
                  borderRadius: 7,
                  whiteSpace: "nowrap",
                  background: metricaId === id ? "#2E8FFF" : "transparent",
                  color: metricaId === id ? "#fff" : "var(--muted)",
                  border: metricaId === id ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                  fontFamily: "inherit",
                }}
              >
                {defs[id].curto}
              </button>
            ))}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <DataSourceBadge source={source} />
          </div>
        </div>
        {/* Sem o padrão listrado de fundo: ele competia visualmente com os contornos
            dos municípios e com as bolhas, atrapalhando a leitura do mapa. */}
        <div style={{ flex: 1, minHeight: 0, borderRadius: 12, position: "relative", overflow: "hidden" }}>
          <MapaCeara pontos={pontos} metrica={metricaDoMapa} modo={modo} mostrarPenetracao={metricaId === "alcance"} />
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateRows: "1.15fr 1fr", gap: 12, minHeight: 0 }}>
        <Panel style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Top municípios</div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)" }}>{metricaId === "alcance" ? "alcance · % da população" : metrica.label.toLowerCase()}</div>
          </div>
          {metricaId === "alcance" && (
            <div style={{ fontSize: 9.5, color: "var(--dim)", marginTop: -4, marginBottom: 8 }} title={FONTE_POPULACAO}>
              {FONTE_POPULACAO_CURTA} · a % compara o alcance da Meta com a população residente
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 7 }}>
            {ordenados.length ? (
              ordenados.slice(0, 14).map((m, i) => (
                <div key={m.nome} style={{ display: "grid", gridTemplateColumns: metricaId === "alcance" ? "16px 1fr 1fr 74px 46px" : "16px 1fr 1fr 74px", gap: 9, alignItems: "center" }}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--dim)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.nome}</div>
                  <div style={{ height: 5, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(2, pctDe(metrica.menorMelhor ? maxRanking - m[metricaId] + 1 : m[metricaId], maxRanking))}%`,
                        height: "100%",
                        borderRadius: 99,
                        background: "linear-gradient(90deg,#2E8FFF,#35D0FF)",
                      }}
                    />
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "var(--text2)" }}>
                    {metrica.compacto(m[metricaId])}
                  </div>
                  {metricaId === "alcance" &&
                    (() => {
                      const pop = populacaoDe(m.nome);
                      const p = pop > 0 ? (m.alcance / pop) * 100 : 0;
                      return (
                        <div
                          style={{
                            fontFamily: "'Inter',sans-serif",
                            fontVariantNumeric: "tabular-nums",
                            fontSize: 10,
                            textAlign: "right",
                            // Acima de 100% em âmbar: não é erro, mas merece leitura atenta.
                            color: p > 100 ? "#FFCF54" : "#4BE08C",
                          }}
                          title={
                            pop > 0
                              ? `${num(pop)} habitantes (Censo 2022) · ${num(Math.round(m.alcance))} alcançados` +
                                (p > 100
                                  ? " — acima de 100% porque a segmentação inclui quem esteve recentemente na cidade e o alcance da Meta conta contas, não pessoas"
                                  : "")
                              : "sem população no Censo"
                          }
                        >
                          {pop > 0 ? pct(Math.min(9999, p), 0) : "—"}
                        </div>
                      );
                    })()}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 11.5, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>
                sem {metrica.label.toLowerCase()} por município no período
              </div>
            )}
          </div>
        </Panel>

        <Panel style={{ padding: "14px 16px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>Regiões</div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {regioes.map((r) => (
              <div key={r.nome} style={{ display: "grid", gridTemplateColumns: "1fr 66px 60px 62px", gap: 8, alignItems: "center", padding: "7px 9px", background: "var(--soft)", borderRadius: 9 }}>
                <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.nome}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right" }}>{brl(r.investimento / 1000, 0)}k</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "var(--muted2)" }}>
                  {defs.resultados.compacto(r.resultados)}
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "#4BE08C" }}>
                  {defs.cpa.compacto(r.cpa)}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
