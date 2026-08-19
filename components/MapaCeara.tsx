"use client";

import { useMemo, useState } from "react";
import malha from "@/lib/geo/ceara-malha.json";
import { normalize, macrorregiaoDe, ordemMacrorregiao } from "@/lib/geo/ceara";
import { num, pct } from "@/lib/format";
import type { MetricaDef } from "@/lib/metricas";

export type PontoMapa = {
  nome: string;
  valor: number;
  /** Linha de apoio no tooltip (ex.: custo quando a métrica dimensiona por verba). */
  detalhe?: string;
  /** Alcance real do município, para calcular penetração. */
  alcance?: number;
};

export type ModoMapa = "municipio" | "regiao";

type Municipio = { cod: string; nome: string; c: [number, number]; a: [number, number][][]; p: number };
type Malha = {
  uf: string;
  bbox: [number, number, number, number];
  municipios: Municipio[];
  populacaoTotal: number;
  fontePopulacao: string;
};

const MALHA = malha as unknown as Malha;

/** População residente por município — IBGE, Censo 2022. */
const POP_POR_NOME = new Map(MALHA.municipios.map((m) => [normalize(m.nome), m.p]));

/**
 * Procedência da população, lida do próprio arquivo vendorizado — assim a nota
 * exibida na tela nunca diverge do dado que está sendo usado no cálculo.
 */
export const FONTE_POPULACAO = MALHA.fontePopulacao;
/** Versão curta para rodapés. */
export const FONTE_POPULACAO_CURTA = "População: IBGE · Censo 2022";
export const POPULACAO_CEARA = MALHA.populacaoTotal;

export function populacaoDe(nome: string): number {
  return POP_POR_NOME.get(normalize(nome)) ?? 0;
}

const CORES_REGIAO: Record<string, string> = {
  "Grande Fortaleza": "#35D0FF",
  "Norte · Sobral": "#21C46A",
  "Sertão Central · Inhamuns": "#F5B301",
  "Cariri · Centro Sul": "#9B7BFF",
  "Litoral Leste · Jaguaribe": "#FF7BC8",
  "Outras regiões": "#7C8CB3",
};

/**
 * Mapa do Ceará com bolhas por município ou por macrorregião.
 *
 * A malha (184 municípios do IBGE) e a população (Censo 2022) são vendorizadas
 * em lib/geo/ceara-malha.json e desenhadas em SVG puro: sem biblioteca de mapa e
 * sem servidor de tiles, então funciona offline. A projeção é equirretangular
 * com correção de cosseno na longitude — para a extensão do Ceará (~5° de
 * latitude) a distorção é imperceptível.
 */
export function MapaCeara({
  pontos,
  metrica,
  modo = "municipio",
  mostrarPenetracao = false,
  altura = "100%",
}: {
  pontos: PontoMapa[];
  metrica: MetricaDef;
  modo?: ModoMapa;
  /** Acrescenta população e % de penetração ao tooltip. */
  mostrarPenetracao?: boolean;
  altura?: number | string;
}) {
  const [hover, setHover] = useState<
    { nome: string; valor: number; detalhe?: string; populacao: number; alcance: number; x: number; y: number } | null
  >(null);

  const { W, H, proj } = useMemo(() => {
    const [lon0, lat0, lon1, lat1] = MALHA.bbox;
    const k = Math.cos(((lat0 + lat1) / 2) * (Math.PI / 180));
    const larguraGraus = (lon1 - lon0) * k;
    const alturaGraus = lat1 - lat0;
    const W = 1000;
    const H = (W * alturaGraus) / larguraGraus;
    const proj = (lon: number, lat: number): [number, number] => [
      ((lon - lon0) * k * W) / larguraGraus,
      H - ((lat - lat0) * H) / alturaGraus,
    ];
    return { W, H, proj };
  }, []);

  const paths = useMemo(
    () =>
      MALHA.municipios.map((m) => ({
        nome: m.nome,
        regiao: macrorregiaoDe(m.nome),
        d: m.a
          .map((anel) => "M" + anel.map(([lon, lat]) => proj(lon, lat).map((v) => v.toFixed(1)).join(" ")).join(" L") + " Z")
          .join(" "),
      })),
    [proj],
  );

  const bolhas = useMemo(() => {
    const porNome = new Map(MALHA.municipios.map((m) => [normalize(m.nome), m]));

    type Bruta = { nome: string; valor: number; detalhe?: string; populacao: number; alcance: number; lon: number; lat: number; peso: number };
    let brutas: Bruta[] = [];

    if (modo === "municipio") {
      brutas = pontos.flatMap((p) => {
        const m = porNome.get(normalize(p.nome));
        if (!m || p.valor <= 0) return [];
        return [{
          nome: p.nome, valor: p.valor, detalhe: p.detalhe,
          populacao: m.p, alcance: p.alcance ?? 0,
          lon: m.c[0], lat: m.c[1], peso: 1,
        }];
      });
    } else {
      // Agrupa por macrorregião: valor e alcance somam; a posição é a média das
      // cidades ponderada pelo próprio valor, para a bolha cair onde a verba está.
      const acc = new Map<string, { valor: number; alcance: number; populacao: number; sx: number; sy: number; peso: number }>();
      // População da região = todos os municípios dela, não só os anunciados.
      for (const m of MALHA.municipios) {
        const r = macrorregiaoDe(m.nome);
        const e = acc.get(r) || { valor: 0, alcance: 0, populacao: 0, sx: 0, sy: 0, peso: 0 };
        e.populacao += m.p;
        acc.set(r, e);
      }
      for (const p of pontos) {
        const m = porNome.get(normalize(p.nome));
        if (!m || p.valor <= 0) continue;
        const r = macrorregiaoDe(m.nome);
        const e = acc.get(r);
        if (!e) continue;
        e.valor += p.valor;
        e.alcance += p.alcance ?? 0;
        e.sx += m.c[0] * p.valor;
        e.sy += m.c[1] * p.valor;
        e.peso += p.valor;
      }
      brutas = Array.from(acc.entries())
        .filter(([, e]) => e.valor > 0)
        .map(([nome, e]) => ({
          nome, valor: e.valor, populacao: e.populacao, alcance: e.alcance,
          lon: e.sx / e.peso, lat: e.sy / e.peso, peso: e.peso,
        }));
    }

    const max = Math.max(...brutas.map((b) => b.valor), 1);
    return brutas
      .map((b) => {
        const [x, y] = proj(b.lon, b.lat);
        // Raio pela raiz do valor: a ÁREA da bolha fica proporcional ao número,
        // que é como o olho compara círculos.
        const base = modo === "regiao" ? 14 : 6;
        const escala = modo === "regiao" ? 40 : 34;
        return { ...b, x, y, r: base + Math.sqrt(b.valor / max) * escala, intensidade: b.valor / max };
      })
      .sort((a, b) => b.r - a.r);
  }, [pontos, proj, modo]);

  const semMapa = pontos.filter((p) => p.valor > 0 && !POP_POR_NOME.has(normalize(p.nome)));

  return (
    <div style={{ position: "relative", width: "100%", height: altura, minHeight: 0 }}>
      <svg className="grafico" viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "100%", display: "block" }}>
        <g>
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.d}
              fill={modo === "regiao" ? `${CORES_REGIAO[p.regiao] ?? "#7C8CB3"}33` : "var(--mapaFill)"}
              stroke={modo === "regiao" ? `${CORES_REGIAO[p.regiao] ?? "#7C8CB3"}88` : "var(--mapaStroke)"}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
        <g>
          {bolhas.map((b, i) => {
            const cor = modo === "regiao" ? CORES_REGIAO[b.nome] ?? "#7C8CB3" : "#35D0FF";
            return (
              <circle
                key={i}
                cx={b.x}
                cy={b.y}
                r={b.r}
                fill={cor}
                fillOpacity={0.2 + b.intensidade * 0.5}
                stroke={cor}
                strokeWidth={1.4}
                strokeOpacity={0.8}
                vectorEffect="non-scaling-stroke"
                style={{ cursor: "pointer" }}
                onMouseEnter={() =>
                  setHover({
                    nome: b.nome, valor: b.valor, detalhe: b.detalhe,
                    populacao: b.populacao, alcance: b.alcance,
                    x: (b.x / W) * 100, y: (b.y / H) * 100,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </g>
      </svg>

      {hover && (
        <div
          style={{
            position: "absolute",
            left: `${hover.x}%`,
            top: `${hover.y}%`,
            transform: `translate(${hover.x > 60 ? "calc(-100% - 12px)" : "12px"}, -50%)`,
            background: "#0A1226",
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: 9,
            boxShadow: "0 14px 28px -12px rgba(0,0,0,.8)",
            padding: "8px 11px",
            pointerEvents: "none",
            zIndex: 5,
            whiteSpace: "nowrap",
            minWidth: 150,
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "#EAF0FF", marginBottom: 3 }}>{hover.nome}</div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 11, color: "#35D0FF" }}>
            {metrica.formatar(hover.valor)}
            <span style={{ color: "#8FA7DA" }}> · {metrica.label.toLowerCase()}</span>
          </div>
          {mostrarPenetracao && hover.populacao > 0 && (
            <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 10.5, color: "#C6D6F5", lineHeight: 1.5 }}>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums" }}>
                {num(hover.populacao)} <span style={{ color: "#8FA7DA" }}>habitantes (Censo 2022)</span>
              </div>
              <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums" }}>
                {num(Math.round(hover.alcance))} <span style={{ color: "#8FA7DA" }}>pessoas alcançadas</span>
              </div>
              {(() => {
                const p = (hover.alcance / hover.populacao) * 100;
                const acima = p > 100;
                return (
                  <>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", color: acima ? "#FFCF54" : "#4BE08C", fontWeight: 700 }}>
                      {pct(Math.min(9999, p), 1)} da população
                    </div>
                    {acima && (
                      <div style={{ fontSize: 9.5, color: "#8FA7DA", whiteSpace: "normal", maxWidth: 210, lineHeight: 1.4, marginTop: 2 }}>
                        Acima de 100% é esperado: a segmentação inclui quem esteve recentemente na cidade, e o alcance da Meta conta contas, não pessoas.
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {hover.detalhe && <div style={{ fontSize: 10, color: "#8FA7DA", marginTop: 3 }}>{hover.detalhe}</div>}
        </div>
      )}

      {/* Legenda e crédito da população dividem uma faixa só. Ancorados
          separadamente à esquerda e à direita, os dois textos se sobrepunham
          assim que a largura do mapa apertava. */}
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            fontFamily: "'Inter',sans-serif",
            fontVariantNumeric: "tabular-nums",
            fontSize: 9.5,
            color: "var(--text2)",
          }}
        >
          {modo === "municipio" ? (
            <>
              <span>menos</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[5, 9, 14].map((r, i) => (
                  <span key={i} style={{ width: r, height: r, borderRadius: 99, background: "#35D0FF", opacity: 0.25 + i * 0.28, display: "block" }} />
                ))}
              </span>
              <span>mais</span>
              <span style={{ color: "var(--dim)" }}>· {metrica.label.toLowerCase()} por município</span>
            </>
          ) : (
            Array.from(new Set(bolhas.map((b) => b.nome)))
              .sort((a, b) => ordemMacrorregiao(a) - ordemMacrorregiao(b))
              .map((r) => (
                <span key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 99, background: CORES_REGIAO[r] ?? "#7C8CB3", display: "block" }} />
                  {r}
                </span>
              ))
          )}
        </div>

        <div style={{ display: "flex", gap: 10, fontSize: 9.5, color: "var(--dim)", textAlign: "right" }}>
          {semMapa.length > 0 && <span>{semMapa.length} fora do mapa do Ceará</span>}
          {mostrarPenetracao && <span title={FONTE_POPULACAO}>{FONTE_POPULACAO_CURTA}</span>}
        </div>
      </div>
    </div>
  );
}
