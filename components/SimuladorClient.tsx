"use client";

import { useMemo, useState } from "react";
import { brl, compact, num } from "@/lib/format";

type BaseObjetivo = {
  id: string;
  label: string;
  color: string;
  papel: string;
  verbaPlano: number;
  investido: number;
  cpm: number;
  cpa: number;
  impressoes: number;
  conversions: number;
  campanhas: number;
  temBase: boolean;
};

type Fase = {
  id: string;
  label: string;
  curto: string;
  pct: number;
  verba: number;
  impressoesPlanoMi: number;
  foco: string;
  descricao: string;
  cpmPlanejado: number;
};

export type SimuladorDados = {
  verbaTotal: number;
  objetivos: BaseObjetivo[];
  fases: Fase[];
  resultLabel: string;
  unitPlural: string;
  costLabel: string;
  cpmConta: number;
  cpaConta: number;
  frequencia: number;
  investidoTotal: number;
  semAtribuicao: number;
  cpmPlanoGeral: number;
  impressoesPlanoMi: number;
  source: "live" | "mock" | "erro";
};

const dec = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "0,00";

/**
 * Simulador de cenários sobre o plano de mídia.
 *
 * Os controles são os 5 objetivos e as 3 fases do plano (lib/plano.ts). A
 * projeção usa SEMPRE o CPM/CPA reais das campanhas daquele objetivo na conta.
 * Objetivo que ainda não tem campanha na conta é marcado "sem base" e cai
 * explicitamente no CPM médio geral — nunca em um multiplicador inventado.
 */
export function SimuladorClient({ dados }: { dados: SimuladorDados }) {
  const [faseId, setFaseId] = useState<string>(dados.fases[0]?.id ?? "f1");
  const pesosDoPlano = useMemo(
    () => Object.fromEntries(dados.objetivos.map((o) => [o.id, Math.round((o.verbaPlano / dados.verbaTotal) * 1000) / 10])),
    [dados.objetivos, dados.verbaTotal],
  );
  const [pesos, setPesos] = useState<Record<string, number>>(pesosDoPlano);

  const fase = dados.fases.find((f) => f.id === faseId) ?? dados.fases[0];
  const verbaDaFase = fase?.verba ?? 0;
  const somaPesos = useMemo(() => Object.values(pesos).reduce((a, b) => a + b, 0), [pesos]);

  const calc = useMemo(() => {
    const linhas = dados.objetivos.map((o) => {
      const pct = pesos[o.id] ?? 0;
      // Normaliza pela soma: a projeção continua coerente enquanto o usuário
      // arrasta os controles e o total ainda não fechou 100%.
      const verba = somaPesos > 0 ? (verbaDaFase * pct) / somaPesos : 0;
      const cpmUsado = o.temBase ? o.cpm : dados.cpmConta;
      const cpaUsado = o.cpa > 0 ? o.cpa : dados.cpaConta;
      const impressoes = cpmUsado > 0 ? (verba / cpmUsado) * 1000 : 0;
      const resultados = cpaUsado > 0 ? verba / cpaUsado : 0;
      return { ...o, pct, verba, cpmUsado, cpaUsado, impressoes, resultados, estimado: !o.temBase };
    });
    const impressoes = linhas.reduce((a, l) => a + l.impressoes, 0);
    const resultados = linhas.reduce((a, l) => a + l.resultados, 0);
    const cpmMedio = impressoes > 0 ? (verbaDaFase / impressoes) * 1000 : 0;
    const alcance = dados.frequencia > 0 ? impressoes / dados.frequencia : 0;
    const impressoesPlano = (fase?.impressoesPlanoMi ?? 0) * 1_000_000;
    const vsPlano = impressoesPlano > 0 ? impressoes / impressoesPlano : 0;
    const semBase = linhas.filter((l) => l.estimado && l.verba > 0);
    return { linhas, impressoes, resultados, cpmMedio, alcance, impressoesPlano, vsPlano, semBase };
  }, [dados, pesos, somaPesos, verbaDaFase, fase]);

  const setPeso = (id: string, v: number) => setPesos((p) => ({ ...p, [id]: Math.max(0, Math.min(100, v)) }));
  const noPlano = dados.objetivos.every((o) => Math.abs((pesos[o.id] ?? 0) - (pesosDoPlano[o.id] ?? 0)) < 0.15);

  return (
    <div className="pag" style={{ height: "100%", display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: 12, minHeight: 0 }}>
      <div
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 18,
          boxShadow: "var(--shadow)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 15 }}>Cenário sobre o plano</div>
          {!noPlano && (
            <button
              onClick={() => setPesos(pesosDoPlano)}
              style={{
                marginLeft: "auto",
                cursor: "pointer",
                fontSize: 10.5,
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 7,
                background: "transparent",
                color: "#35D0FF",
                border: "1px solid rgba(53,208,255,.35)",
                fontFamily: "inherit",
              }}
            >
              Voltar ao plano
            </button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Fase</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {dados.fases.map((f) => (
              <button
                key={f.id}
                onClick={() => setFaseId(f.id)}
                style={{
                  cursor: "pointer",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 11px",
                  borderRadius: 8,
                  background: faseId === f.id ? "#F5B301" : "transparent",
                  color: faseId === f.id ? "#fff" : "var(--muted)",
                  border: faseId === f.id ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                  fontFamily: "inherit",
                }}
              >
                {f.curto}
              </button>
            ))}
          </div>
          {fase && (
            <div style={{ fontSize: 11, lineHeight: 1.5, color: "var(--dim)" }}>
              {fase.pct}% da verba · {brl(fase.verba, 0)} · {fase.foco}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 11.5, color: "var(--muted2)" }}>Divisão por objetivo</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontSize: 11,
                color: Math.abs(somaPesos - 100) < 0.2 ? "var(--dim)" : "#FFCF54",
              }}
            >
              {dec(somaPesos, 1)}%
            </span>
          </div>

          {calc.linhas.map((l) => (
            <div key={l.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: l.color, flex: "0 0 auto" }} />
                <span style={{ fontSize: 11.5, fontWeight: 600 }}>{l.label}</span>
                {l.estimado && (
                  <span style={{ fontSize: 9, color: "#FFCF54", border: "1px solid rgba(245,179,1,.35)", borderRadius: 4, padding: "1px 5px" }}>
                    sem base
                  </span>
                )}
                <span style={{ marginLeft: "auto", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 11.5 }}>
                  {dec(l.pct, 1)}% · {brl(l.verba, 0)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                step={0.5}
                value={l.pct}
                onChange={(e) => setPeso(l.id, Number(e.target.value))}
                style={{ width: "100%" }}
              />
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--dim)" }}>
                {l.temBase
                  ? `CPM real ${brl(l.cpm)} · ${l.campanhas} ${l.campanhas === 1 ? "campanha" : "campanhas"} · ${brl(l.investido, 0)} investidos`
                  : "sem campanha desse objetivo na janela — projeção usa o CPM médio da conta"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateRows: "auto 1fr auto", gap: 12, minHeight: 0 }}>
        <div className="emp" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {[
            { label: "Impressões projetadas", value: compact(calc.impressoes), note: `${fase?.curto ?? ""} · CPM ${brl(calc.cpmMedio)}` },
            { label: "Impressões do plano", value: compact(calc.impressoesPlano), note: `CPM planejado ${brl(fase?.cpmPlanejado ?? 0)}` },
            {
              label: `${dados.resultLabel} projetados`,
              value: num(Math.round(calc.resultados)),
              note: dados.cpaConta > 0 ? `${dados.costLabel} ${brl(dados.cpaConta)}` : "sem custo unitário na janela",
            },
            {
              label: "Alcance estimado",
              value: compact(calc.alcance),
              note: dados.frequencia > 0 ? `frequência real ${dec(dados.frequencia)}` : "sem frequência na janela",
            },
          ].map((k, i) => (
            <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "14px 15px", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>{k.label}</div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: "clamp(15px,1.7vw,23px)", color: "#35D0FF" }}>{k.value}</div>
              <div style={{ fontSize: 10, color: "var(--dim)" }}>{k.note}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 18, boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 12 }}>
            Verba e entrega por objetivo · {fase?.label}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {calc.linhas.map((l) => {
              const maxImp = Math.max(...calc.linhas.map((x) => x.impressoes), 1);
              return (
                <div key={l.id} className="linha-tabela" style={{ display: "grid", gridTemplateColumns: "132px 1fr 92px 84px", gap: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 11.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l.label}</div>
                  <div style={{ height: 7, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(1, (l.impressoes / maxImp) * 100)}%`, height: "100%", borderRadius: 99, background: l.color, opacity: l.estimado ? 0.45 : 1 }} />
                  </div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right" }}>{brl(l.verba, 0)}</div>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, textAlign: "right", color: "var(--muted2)" }}>
                    {compact(l.impressoes)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "rgba(53,208,255,.08)", border: "1px solid rgba(53,208,255,.22)", borderRadius: 12, padding: "12px 15px", fontSize: 11.5, lineHeight: 1.6, color: "var(--text2)", display: "flex", flexDirection: "column", gap: 5 }}>
          <div>
            Com {brl(verbaDaFase, 0)} na {fase?.curto.toLowerCase()}, ao custo real da conta a projeção é de{" "}
            <strong style={{ color: "var(--text)" }}>{compact(calc.impressoes)} impressões</strong> — o plano previa {compact(calc.impressoesPlano)}
            {calc.vsPlano > 0 && (
              <>
                , ou seja <strong style={{ color: calc.vsPlano >= 1 ? "#4BE08C" : "#FF8189" }}>{dec(calc.vsPlano, 1)}×</strong> o previsto
              </>
            )}
            .
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)" }}>
            CPM real da conta {brl(dados.cpmConta)} contra {brl(fase?.cpmPlanejado ?? 0)} assumido no plano para esta fase.
          </div>
          {calc.semBase.length > 0 && (
            <div style={{ fontSize: 10.5, color: "#FFCF54" }}>
              {calc.semBase.map((l) => l.label).join(", ")} ainda não {calc.semBase.length === 1 ? "tem campanha" : "têm campanhas"} na conta:{" "}
              {calc.semBase.length === 1 ? "essa faixa usa" : "essas faixas usam"} o CPM médio geral, não custo próprio.
            </div>
          )}
          {dados.semAtribuicao > 0 && (
            <div style={{ fontSize: 10.5, color: "var(--dim)" }}>
              {brl(dados.semAtribuicao, 0)} em campanhas que nenhuma regra do plano classificou — ajuste REGRAS_ATRIBUICAO em lib/plano.ts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
