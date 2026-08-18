"use client";

import { useMemo, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";
import { METRICAS_PUBLICO, pctDe, rotularMetricas, type MetricaId } from "@/lib/metricas";

type Quebra = {
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  cpa: number;
  cpm: number;
};

type Faixa = { label: string; homens: Quebra; mulheres: Quebra; total: Quebra };
type Linha = { label: string } & Quebra;

export function PublicoClient({
  faixas,
  dispositivos,
  horarios,
  segmentos,
  resultLabel,
  costLabel,
  source,
}: {
  faixas: Faixa[];
  dispositivos: Linha[];
  horarios: Linha[];
  segmentos: Linha[];
  resultLabel: string;
  costLabel: string;
  source: "live" | "mock" | "erro";
}) {
  const [metricaId, setMetricaId] = useState<MetricaId>("impressoes");
  const defs = useMemo(() => rotularMetricas(resultLabel, costLabel), [resultLabel, costLabel]);
  const metrica = defs[metricaId];

  const maxFaixa = Math.max(...faixas.flatMap((f) => [f.homens[metricaId], f.mulheres[metricaId]]), 1);
  const totalDisp = dispositivos.reduce((a, d) => a + d[metricaId], 0);
  const maxHora = Math.max(...horarios.map((h) => h[metricaId]), 1);
  const segsOrdenados = useMemo(() => {
    const com = segmentos.filter((s) => s[metricaId] > 0);
    return [...com].sort((a, b) => (metrica.menorMelhor ? a[metricaId] - b[metricaId] : b[metricaId] - a[metricaId]));
  }, [segmentos, metricaId, metrica.menorMelhor]);
  const mediaSeg = segsOrdenados.length ? segsOrdenados.reduce((a, s) => a + s[metricaId], 0) / segsOrdenados.length : 0;

  const CORES = ["#21C46A", "#35D0FF", "#9B7BFF", "#7C8CB3"];

  const rotuloBarra: React.CSSProperties = {
    fontFamily: "'Inter',sans-serif",
    fontVariantNumeric: "tabular-nums",
    fontSize: 9.5,
    color: "var(--muted2)",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Métrica
        </span>
        {METRICAS_PUBLICO.map((id) => (
          <button
            key={id}
            onClick={() => setMetricaId(id)}
            style={{
              cursor: "pointer",
              fontSize: 10.5,
              fontWeight: 600,
              padding: "5px 10px",
              borderRadius: 7,
              whiteSpace: "nowrap",
              background: metricaId === id ? "#9B7BFF" : "transparent",
              color: metricaId === id ? "#fff" : "var(--muted)",
              border: metricaId === id ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
              fontFamily: "inherit",
            }}
          >
            {defs[id].curto}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <DataSourceBadge source={source} />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(0,1fr)", gridTemplateRows: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Faixa etária e gênero</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10, fontSize: 10 }}>
              <span style={{ color: "#35D0FF" }}>■ Homens</span>
              <span style={{ color: "#FF7BC8" }}>■ Mulheres</span>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 8 }}>
            {faixas.map((f) => (
              <div
                key={f.label}
                style={{
                  display: "grid",
                  // Coluna própria para cada rótulo: com o valor dentro da célula
                  // da barra, a faixa mais longa (100% da largura) empurrava o
                  // número para cima do rótulo da idade.
                  gridTemplateColumns: "38px 58px minmax(0,1fr) minmax(0,1fr) 58px",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, color: "var(--muted)" }}>{f.label}</div>
                <div style={{ ...rotuloBarra, textAlign: "right" }}>{metrica.compacto(f.homens[metricaId])}</div>
                <div style={{ display: "flex", justifyContent: "flex-end", minWidth: 0 }}>
                  <div style={{ width: `${pctDe(f.homens[metricaId], maxFaixa)}%`, height: 13, borderRadius: "4px 0 0 4px", background: "#35D0FF", minWidth: 2 }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ width: `${pctDe(f.mulheres[metricaId], maxFaixa)}%`, height: 13, borderRadius: "0 4px 4px 0", background: "#FF7BC8", minWidth: 2 }} />
                </div>
                <div style={rotuloBarra}>{metrica.compacto(f.mulheres[metricaId])}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
            Dispositivo · {metrica.label.toLowerCase()}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 9 }}>
            {dispositivos.map((d, i) => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <div style={{ fontSize: 11, width: 62 }}>{d.label}</div>
                <div style={{ flex: 1, height: 12, borderRadius: 5, background: "var(--track)", overflow: "hidden" }}>
                  <div style={{ width: `${pctDe(d[metricaId], Math.max(...dispositivos.map((x) => x[metricaId]), 1))}%`, height: "100%", borderRadius: 5, background: CORES[i % 4] }} />
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, width: 76, textAlign: "right", color: "var(--text2)" }}>
                  {metrica.compacto(d[metricaId])}
                </div>
                {!metrica.derivada && totalDisp > 0 && (
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, width: 42, textAlign: "right", color: "var(--dim)" }}>
                    {((d[metricaId] / totalDisp) * 100).toFixed(1).replace(".", ",")}%
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 10 }}>
            Horário do dia · {metrica.label.toLowerCase()}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", gap: 4, paddingBottom: 16, paddingTop: 4, position: "relative" }}>
            {horarios.map((h) => {
              const alt = Math.max(2, pctDe(h[metricaId], maxHora));
              const pico = h[metricaId] >= maxHora * 0.8;
              return (
                <div key={h.label} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative", minWidth: 0 }} title={`${h.label} · ${metrica.formatar(h[metricaId])}`}>
                  {/* Rótulo girado: com 24 colunas não cabe na horizontal, e girar
                      mantém o número legível em vez de truncá-lo. */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: `calc(${alt}% + 4px)`,
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                      fontFamily: "'Inter',sans-serif",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 8.5,
                      lineHeight: 1,
                      color: pico ? "var(--text2)" : "var(--dim)",
                      fontWeight: pico ? 700 : 400,
                      whiteSpace: "nowrap",
                      pointerEvents: "none",
                    }}
                  >
                    {metrica.compacto(h[metricaId])}
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: `${alt}%`,
                      borderRadius: "4px 4px 0 0",
                      background: pico ? "#35D0FF" : "rgba(46,143,255,.4)",
                    }}
                  />
                  <div style={{ position: "absolute", bottom: -15, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 8.5, color: "var(--dim)" }}>
                    {h.label.replace("h", "")}
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel style={{ padding: "13px 15px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Segmentos</div>
            <div style={{ marginLeft: "auto", fontSize: 10, color: "var(--dim)" }}>{metrica.label.toLowerCase()}</div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {segsOrdenados.slice(0, 10).map((sg) => {
              const bom = metrica.menorMelhor ? sg[metricaId] <= mediaSeg : sg[metricaId] >= mediaSeg;
              return (
                <div key={sg.label} style={{ display: "grid", gridTemplateColumns: "1fr 82px", gap: 8, alignItems: "center", padding: "6px 9px", background: "var(--soft)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sg.label}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: bom ? "#4BE08C" : "var(--text2)" }}>
                    {metrica.compacto(sg[metricaId])}
                  </div>
                </div>
              );
            })}
            {!segsOrdenados.length && (
              <div style={{ fontSize: 11.5, color: "var(--dim)", textAlign: "center", padding: "16px 0" }}>
                sem {metrica.label.toLowerCase()} por segmento no período
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
