"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { brl, compact, num, pct } from "@/lib/format";

/** Um dia de veiculação, vindo de lib/meta/campaigns#AdDia. */
export type DiaAnuncio = {
  dia: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  reacoes: number;
  comentarios: number;
  compartilhamentos: number;
  salvos: number;
  interacoes: number;
};

export type AnuncioComparavel = {
  id: string;
  nome: string;
  campanha: string;
  objetivo: string;
  status: string;
  thumbnailUrl?: string;
  permalink?: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  resultados: number;
  interacoes: number;
  reacoes: number;
  comentarios: number;
  compartilhamentos: number;
  salvos: number;
  cpa: number;
  cpm: number;
  ctr: number;
  taxaInteracao: number;
  /** Curva dia a dia — só os dias em que a peça de fato rodou. */
  serie: DiaAnuncio[];
};

const CORES = ["#35D0FF", "#F5B301", "#9B7BFF"];
const MAX = 3;

type Modo = "total" | "taxa";

type Linha = {
  chave: keyof AnuncioComparavel;
  rotulo: string;
  grupo: string;
  fmt: (v: number) => string;
  menorMelhor?: boolean;
  /** Só faz sentido comparar entre anúncios do mesmo objetivo. */
  dependeDoObjetivo?: boolean;
};

const LINHAS_TOTAL: Linha[] = [
  {
    chave: "investimento",
    rotulo: "Investimento",
    grupo: "Entrega",
    fmt: (v) => brl(v, 0),
  },
  { chave: "impressoes", rotulo: "Impressões", grupo: "Entrega", fmt: compact },
  {
    chave: "cliques",
    rotulo: "Cliques no link",
    grupo: "Entrega",
    fmt: (v) => num(Math.round(v)),
  },
  {
    chave: "interacoes",
    rotulo: "Interações",
    grupo: "Engajamento",
    fmt: (v) => num(Math.round(v)),
  },
  {
    chave: "reacoes",
    rotulo: "Reações",
    grupo: "Engajamento",
    fmt: (v) => num(Math.round(v)),
  },
  {
    chave: "comentarios",
    rotulo: "Comentários",
    grupo: "Engajamento",
    fmt: (v) => num(Math.round(v)),
  },
  {
    chave: "compartilhamentos",
    rotulo: "Compartilhamentos",
    grupo: "Engajamento",
    fmt: (v) => num(Math.round(v)),
  },
  {
    chave: "salvos",
    rotulo: "Salvamentos",
    grupo: "Engajamento",
    fmt: (v) => num(Math.round(v)),
  },
];

const LINHAS_TAXA: Linha[] = [
  { chave: "ctr", rotulo: "CTR", grupo: "Eficiência", fmt: (v) => pct(v, 2) },
  {
    chave: "taxaInteracao",
    rotulo: "Taxa de interação",
    grupo: "Eficiência",
    fmt: (v) => pct(v, 2),
  },
  {
    chave: "cpm",
    rotulo: "CPM",
    grupo: "Eficiência",
    fmt: (v) => (v > 0 ? brl(v) : "—"),
    menorMelhor: true,
  },
  {
    chave: "cpa",
    rotulo: "Custo por resultado",
    grupo: "Eficiência",
    fmt: (v) => (v > 0 ? brl(v) : "—"),
    menorMelhor: true,
    dependeDoObjetivo: true,
  },
];

/**
 * Como ler cada métrica dentro de um único dia. É a ponte entre a tabela (que
 * mostra o total da janela) e o gráfico (que mostra a curva): só as métricas
 * que aparecem aqui podem virar linha no gráfico.
 */
const DIARIO: Partial<
  Record<keyof AnuncioComparavel, (d: DiaAnuncio) => number>
> = {
  investimento: (d) => d.investimento,
  impressoes: (d) => d.impressoes,
  cliques: (d) => d.cliques,
  interacoes: (d) => d.interacoes,
  reacoes: (d) => d.reacoes,
  comentarios: (d) => d.comentarios,
  compartilhamentos: (d) => d.compartilhamentos,
  salvos: (d) => d.salvos,
  ctr: (d) => (d.impressoes > 0 ? (d.cliques / d.impressoes) * 100 : 0),
  taxaInteracao: (d) =>
    d.impressoes > 0 ? (d.interacoes / d.impressoes) * 100 : 0,
  cpm: (d) => (d.impressoes > 0 ? (d.investimento / d.impressoes) * 1000 : 0),
};

const diaCurto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Curva diária das peças selecionadas, todas na mesma escala vertical.
 *
 * Dias sem entrega não viram zero: a peça simplesmente não tem ponto ali, e a
 * linha é quebrada em trechos contínuos. Zerar daria a impressão de queda de
 * desempenho onde na verdade o anúncio nem estava no ar.
 */
function GraficoDiario({
  sel,
  linha,
}: {
  sel: AnuncioComparavel[];
  linha: Linha;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ler = DIARIO[linha.chave]!;

  const dias = useMemo(
    () =>
      Array.from(new Set(sel.flatMap((a) => a.serie.map((d) => d.dia)))).sort(),
    [sel],
  );

  const series = useMemo(
    () =>
      sel.map((a) => {
        const porDia = new Map(a.serie.map((d) => [d.dia, ler(d)]));
        return dias.map((d) => (porDia.has(d) ? porDia.get(d)! : null));
      }),
    [sel, dias, ler],
  );

  const max = Math.max(
    ...series.flat().filter((v): v is number => v !== null),
    0,
  );

  if (dias.length < 2) {
    return (
      <div
        style={{
          fontSize: 11.5,
          color: "var(--dim)",
          textAlign: "center",
          padding: "26px 0",
        }}
      >
        a janela tem menos de dois dias de veiculação — não há curva para
        desenhar
      </div>
    );
  }

  const W = 1000;
  const H = 260;
  const x = (i: number) => (i / (dias.length - 1)) * W;
  const y = (v: number) => H - (max > 0 ? (v / max) * (H - 12) : 0) - 6;

  // Um trecho por sequência de dias em que a peça esteve no ar.
  const trechos = (vals: (number | null)[]) => {
    const out: string[] = [];
    let atual: string[] = [];
    vals.forEach((v, i) => {
      if (v === null) {
        if (atual.length > 1) out.push("M" + atual.join(" L"));
        atual = [];
        return;
      }
      atual.push(`${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
    });
    if (atual.length > 1) out.push("M" + atual.join(" L"));
    return out;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div
        style={{ position: "relative" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const p = (e.clientX - r.left) / Math.max(1, r.width);
          setHover(
            Math.max(
              0,
              Math.min(dias.length - 1, Math.round(p * (dias.length - 1))),
            ),
          );
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            fontFamily: "'Inter',sans-serif",
            fontVariantNumeric: "tabular-nums",
            fontSize: 9.5,
            color: "var(--dim)",
            pointerEvents: "none",
          }}
        >
          {linha.fmt(max)}
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: 200, display: "block" }}
        >
          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={y(max * f)}
              y2={y(max * f)}
              stroke="var(--line)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={0}
              y2={H}
              stroke="var(--muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {series.map((vals, i) =>
            trechos(vals).map((d, j) => (
              <path
                key={`${i}-${j}`}
                d={d}
                fill="none"
                stroke={CORES[i]}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )),
          )}
        </svg>
        {hover !== null && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: `${(hover / (dias.length - 1)) * 100}%`,
              transform:
                hover > dias.length / 2
                  ? "translateX(calc(-100% - 8px))"
                  : "translateX(8px)",
              background: "var(--panel2)",
              border: "1px solid var(--line)",
              borderRadius: 9,
              boxShadow: "var(--shadow)",
              padding: "7px 10px",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontSize: 10,
                color: "var(--muted)",
                marginBottom: 3,
              }}
            >
              {diaCurto(dias[hover])}
            </div>
            {sel.map((a, i) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 10.5,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 99,
                    background: CORES[i],
                    flex: "0 0 7px",
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text2)",
                  }}
                >
                  {series[i][hover] === null
                    ? "não veiculou"
                    : linha.fmt(series[i][hover]!)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {dias.map((d, i) => (
          <span
            key={d}
            style={{
              fontFamily: "'Inter',sans-serif",
              fontVariantNumeric: "tabular-nums",
              fontSize: 9,
              color: i === hover ? "var(--text2)" : "var(--dim)",
              fontWeight: i === hover ? 700 : 400,
            }}
          >
            {diaCurto(d)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Leitura gerada dos próprios números — sem texto fixo e sem modelo de linguagem.
 * Diz o que de fato difere entre as peças e onde a comparação não vale.
 */
function lerComparativo(
  sel: AnuncioComparavel[],
  mesmoObjetivo: boolean,
  resultLabel: string,
): string[] {
  if (sel.length < 2) return [];
  const frases: string[] = [];
  const melhorPor = (f: (a: AnuncioComparavel) => number, menor = false) =>
    [...sel].sort((a, b) => (menor ? f(a) - f(b) : f(b) - f(a)))[0];

  const maisCliques = melhorPor((a) => a.ctr);
  const outros = sel.filter((a) => a.id !== maisCliques.id);
  const mediaOutros =
    outros.reduce((s, a) => s + a.ctr, 0) / Math.max(1, outros.length);
  if (maisCliques.ctr > 0) {
    // Quando a outra peça praticamente não teve clique, a razão explode (chegou a
    // 451x num caso real) e vira ruído. Acima de 10x a comparação deixa de ser
    // "quantas vezes melhor" e passa a ser "a outra não performou" — que é o que
    // o texto precisa dizer.
    const vezes = mediaOutros > 0 ? maisCliques.ctr / mediaOutros : Infinity;
    let comparacao: string;
    if (!Number.isFinite(vezes) || vezes > 10) {
      const zerada = outros.filter((a) => a.cliques === 0);
      comparacao = zerada.length
        ? `. ${zerada.map((a) => `"${a.nome}"`).join(", ")} não registrou nenhum clique no link — não é questão de margem, é ausência de resposta.`
        : mediaOutros < 0.005
          ? ". As demais ficaram em praticamente zero — a diferença é de ordem de grandeza, não de margem."
          : `, enquanto as demais ficaram em ${pct(mediaOutros, 2)}. A diferença é de ordem de grandeza, não de margem.`;
    } else if (vezes > 1.15) {
      comparacao = `, ${vezes.toFixed(1).replace(".", ",")}× a média das outras peças.`;
    } else {
      comparacao = ", mas a diferença para as demais é pequena.";
    }
    frases.push(
      `"${maisCliques.nome}" tem o maior CTR (${pct(maisCliques.ctr, 2)})` +
        comparacao +
        " CTR mede o quanto a arte convence a clicar, independente de quanto foi investido.",
    );
  }

  const maisEngaja = melhorPor((a) => a.taxaInteracao);
  if (maisEngaja.taxaInteracao > 0 && maisEngaja.id !== maisCliques.id) {
    frases.push(
      `Em proporção de interações por exibição, quem se destaca é "${maisEngaja.nome}" ` +
        `(${pct(maisEngaja.taxaInteracao, 2)}) — sinal de peça que gera conversa, mesmo não sendo a que mais leva ao clique.`,
    );
  } else if (maisEngaja.taxaInteracao > 0) {
    frases.push(
      `"${maisEngaja.nome}" lidera também em taxa de interação (${pct(maisEngaja.taxaInteracao, 2)}).`,
    );
  }

  const maisBarato = melhorPor((a) => a.cpm || Infinity, true);
  if (maisBarato.cpm > 0) {
    const caro = melhorPor((a) => a.cpm);
    if (caro.id !== maisBarato.id && caro.cpm > 0) {
      const dif = ((caro.cpm - maisBarato.cpm) / maisBarato.cpm) * 100;
      frases.push(
        `"${maisBarato.nome}" compra impressão mais barata: CPM de ${brl(maisBarato.cpm)} contra ${brl(caro.cpm)} de ` +
          `"${caro.nome}"` +
          (dif >= 5
            ? ` — ${Math.round(dif)}% de diferença no custo de alcançar mil pessoas.`
            : ", diferença pequena entre as duas."),
      );
    }
  }

  const semEntrega = sel.filter((a) => a.impressoes === 0);
  if (semEntrega.length) {
    frases.push(
      `${semEntrega.map((a) => `"${a.nome}"`).join(", ")} não teve entrega no período — os números dela são zero, não baixos.`,
    );
  }

  const desigual =
    sel.some((a) => a.impressoes > 0) &&
    Math.max(...sel.map((a) => a.impressoes)) >
      Math.min(
        ...sel.filter((a) => a.impressoes > 0).map((a) => a.impressoes),
      ) *
        8;
  if (desigual) {
    frases.push(
      "As peças receberam volumes de entrega muito diferentes. Compare pelas taxas (CTR, interação, CPM); " +
        "os totais refletem sobretudo quanto cada uma foi veiculada.",
    );
  }

  if (!mesmoObjetivo) {
    frases.push(
      `Resultados e ${resultLabel.toLowerCase()} não são comparáveis aqui: as peças estão em campanhas com objetivos ` +
        "diferentes, e a Meta otimiza a entrega de cada uma para a sua própria meta.",
    );
  }

  return frases;
}

function Seletor({
  anuncios,
  escolhidos,
  indice,
  cor,
  onEscolher,
  onRemover,
}: {
  anuncios: AnuncioComparavel[];
  escolhidos: string[];
  indice: number;
  cor: string;
  onEscolher: (id: string) => void;
  onRemover: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const atual = anuncios.find((a) => a.id === escolhidos[indice]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return anuncios
      .filter((a) => !escolhidos.includes(a.id) || a.id === atual?.id)
      .filter(
        (a) =>
          !q ||
          a.nome.toLowerCase().includes(q) ||
          a.campanha.toLowerCase().includes(q),
      )
      .slice(0, 60);
  }, [anuncios, busca, escolhidos, atual]);

  return (
    <div style={{ position: "relative", flex: "1 1 210px", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 5,
        }}
      >
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: 99,
            background: cor,
            flex: "0 0 auto",
          }}
        />
        <span
          style={{
            fontSize: 10.5,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
          Peça {indice + 1}
        </span>
        {atual && indice >= 2 && (
          <button
            onClick={onRemover}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "var(--dim)",
              cursor: "pointer",
              fontSize: 15,
              lineHeight: 1,
              padding: 0,
            }}
            aria-label="Remover peça"
          >
            ×
          </button>
        )}
      </div>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 9,
          background: "var(--soft)",
          border: `1px solid ${atual ? cor + "66" : "var(--line)"}`,
          borderRadius: 10,
          padding: "8px 10px",
          cursor: "pointer",
          color: "inherit",
          fontFamily: "inherit",
          textAlign: "left",
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 7,
            background: "var(--slot8)",
            overflow: "hidden",
            flex: "0 0 34px",
          }}
        >
          {atual?.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={atual.thumbnailUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          )}
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: "block",
              fontSize: 11.5,
              fontWeight: 600,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {atual ? atual.nome : "Selecionar anúncio"}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 9.5,
              color: "var(--dim)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {atual ? atual.objetivo : "buscar pelo nome ou campanha"}
          </span>
        </span>
        <span style={{ color: "var(--dim)", fontSize: 11 }}>
          {aberto ? "▲" : "▼"}
        </span>
      </button>

      {aberto && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            left: 0,
            right: 0,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "var(--shadow)",
            zIndex: 20,
            padding: 7,
            maxHeight: 320,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <input
            autoFocus
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou campanha…"
            style={{
              background: "var(--soft)",
              border: "1px solid var(--line)",
              borderRadius: 7,
              padding: "7px 9px",
              fontSize: 11.5,
              color: "var(--text)",
              fontFamily: "inherit",
            }}
          />
          <div
            style={{
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {lista.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  onEscolher(a.id);
                  setAberto(false);
                  setBusca("");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background:
                    a.id === atual?.id
                      ? "var(--rule-2, var(--soft))"
                      : "transparent",
                  border: "none",
                  borderRadius: 7,
                  padding: "6px 7px",
                  cursor: "pointer",
                  color: "inherit",
                  fontFamily: "inherit",
                  textAlign: "left",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "var(--slot8)",
                    overflow: "hidden",
                    flex: "0 0 28px",
                  }}
                >
                  {a.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.thumbnailUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.nome}
                  </span>
                  <span
                    style={{
                      display: "block",
                      fontSize: 9.5,
                      color: "var(--dim)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {a.objetivo} · {compact(a.impressoes)} impr.
                  </span>
                </span>
              </button>
            ))}
            {!lista.length && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--dim)",
                  padding: "10px 6px",
                  textAlign: "center",
                }}
              >
                nada encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ComparativoCriativos({
  anuncios,
  resultLabel,
}: {
  anuncios: AnuncioComparavel[];
  resultLabel: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [ids, setIds] = useState<string[]>(["", ""]);
  const [modo, setModo] = useState<Modo>("total");
  const [chaveGrafico, setChaveGrafico] =
    useState<keyof AnuncioComparavel>("impressoes");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sel = ids
    .map((id) => anuncios.find((a) => a.id === id))
    .filter(Boolean) as AnuncioComparavel[];
  const objetivos = Array.from(new Set(sel.map((a) => a.objetivo)));
  const mesmoObjetivo = objetivos.length <= 1;
  const linhas = modo === "total" ? LINHAS_TOTAL : LINHAS_TAXA;
  const leitura = useMemo(
    () => lerComparativo(sel, mesmoObjetivo, resultLabel),
    [sel, mesmoObjetivo, resultLabel],
  );

  /**
   * A tabela é um grid só, para as colunas das peças ficarem alinhadas de ponta
   * a ponta. Por isso os cabeçalhos de grupo e as linhas vêm achatados numa
   * lista única, já com os valores e o vencedor de cada linha resolvidos.
   */
  const celulas = useMemo(() => {
    const porGrupo = new Map<string, Linha[]>();
    for (const l of linhas)
      porGrupo.set(l.grupo, [...(porGrupo.get(l.grupo) || []), l]);

    type Celula =
      | { tipo: "grupo"; grupo: string }
      | {
          tipo: "linha";
          linha: Linha;
          vals: number[];
          melhor: number;
          comparavel: boolean;
          par: boolean;
        };

    const saida: Celula[] = [];
    let i = 0;
    for (const [grupo, ls] of porGrupo) {
      saida.push({ tipo: "grupo", grupo });
      for (const l of ls) {
        const vals = sel.map((a) => Number(a[l.chave]) || 0);
        const validos = vals.filter((v) => v > 0);
        const comparavel = !l.dependeDoObjetivo || mesmoObjetivo;
        const melhor =
          !comparavel || validos.length < 2
            ? -1
            : l.menorMelhor
              ? vals.indexOf(Math.min(...validos))
              : vals.indexOf(Math.max(...validos));
        saida.push({
          tipo: "linha",
          linha: l,
          vals,
          melhor,
          comparavel,
          par: i++ % 2 === 0,
        });
      }
    }
    return saida;
  }, [linhas, sel, mesmoObjetivo]);

  // Só entram no gráfico as métricas que existem dia a dia. `cpa` depende de
  // conversões, que não são buscadas por dia — então não aparece na lista.
  const opcoesGrafico = useMemo(
    () => linhas.filter((l) => l.chave in DIARIO),
    [linhas],
  );
  const linhaGrafico =
    opcoesGrafico.find((l) => l.chave === chaveGrafico) ?? opcoesGrafico[0];

  if (!anuncios.length) return null;

  return (
    <>
      {/* É a única ação da página — sai do contorno discreto e assume o peso de
          botão primário, sozinho na ponta direita da barra de filtros. */}
      <button
        onClick={() => setAberto(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
          fontSize: 11.5,
          fontWeight: 700,
          padding: "8px 15px",
          borderRadius: 9,
          whiteSpace: "nowrap",
          background: "linear-gradient(135deg,#2E8FFF 0%,#35D0FF 100%)",
          color: "#04122B",
          border: "1px solid rgba(255,255,255,.22)",
          boxShadow: "0 10px 22px -10px rgba(53,208,255,.75)",
          fontFamily: "inherit",
        }}
      >
        <span className="ms" style={{ fontSize: 15, lineHeight: 1 }}>
          compare_arrows
        </span>
        Comparar criativos
      </button>

      {aberto && (
        <div
          onClick={() => setAberto(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4,10,26,.72)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--panel)",
              border: "1px solid var(--line)",
              borderRadius: 18,
              boxShadow: "var(--shadow)",
              width: "min(1040px,100%)",
              height: "min(88vh,100%)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "16px 20px 12px",
                borderBottom: "1px solid var(--line)",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontFamily: "'Poppins',sans-serif",
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Comparar criativos
              </div>
              <div style={{ fontSize: 10.5, color: "var(--dim)" }}>
                até {MAX} peças · todas medidas na mesma janela de datas
              </div>
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                style={{
                  marginLeft: "auto",
                  cursor: "pointer",
                  background: "var(--soft)",
                  border: "1px solid var(--line)",
                  color: "var(--text2)",
                  borderRadius: 8,
                  width: 26,
                  height: 26,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 15,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                padding: "16px 20px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                }}
              >
                {ids.map((_, i) => (
                  <Seletor
                    key={i}
                    anuncios={anuncios}
                    escolhidos={ids}
                    indice={i}
                    cor={CORES[i]}
                    onEscolher={(id) =>
                      setIds((p) => p.map((v, k) => (k === i ? id : v)))
                    }
                    onRemover={() => setIds((p) => p.filter((_, k) => k !== i))}
                  />
                ))}
                {ids.length < MAX && (
                  <button
                    onClick={() => setIds((p) => [...p, ""])}
                    style={{
                      alignSelf: "flex-end",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "9px 12px",
                      borderRadius: 10,
                      background: "transparent",
                      color: "var(--muted)",
                      border: "1px dashed var(--line)",
                      fontFamily: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    + Terceira peça
                  </button>
                )}
              </div>

              {sel.length < 2 ? (
                <div
                  style={{
                    padding: "40px 0",
                    textAlign: "center",
                    color: "var(--dim)",
                    fontSize: 12.5,
                  }}
                >
                  Escolha ao menos duas peças para comparar.
                </div>
              ) : (
                <>
                  {!mesmoObjetivo && (
                    <div
                      style={{
                        background: "rgba(245,179,1,.09)",
                        border: "1px solid rgba(245,179,1,.28)",
                        borderRadius: 11,
                        padding: "11px 14px",
                        display: "flex",
                        gap: 9,
                      }}
                    >
                      <span
                        style={{
                          color: "#FFCF54",
                          fontSize: 14,
                          lineHeight: 1.2,
                        }}
                      >
                        ⚠
                      </span>
                      <div
                        style={{
                          fontSize: 11.5,
                          lineHeight: 1.55,
                          color: "var(--text2)",
                        }}
                      >
                        <b style={{ color: "#FFCF54" }}>
                          Objetivos diferentes ({objetivos.join(" × ")}).
                        </b>{" "}
                        A Meta otimiza a entrega de cada campanha para a sua
                        própria meta, então <b>resultados</b> e{" "}
                        <b>custo por resultado</b> não são comparáveis entre
                        estas peças. CTR, taxa de interação e CPM continuam
                        válidos — medem a reação do público à arte.
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${sel.length},minmax(0,1fr))`,
                      gap: 12,
                    }}
                  >
                    {sel.map((a, i) => (
                      <div
                        key={a.id}
                        style={{
                          border: "1px solid var(--line)",
                          borderTop: `3px solid ${CORES[i]}`,
                          borderRadius: 11,
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <div
                          className="cmp-previa"
                          style={{
                            height: 250,
                            background: "var(--slot9)",
                            position: "relative",
                            flex: "0 0 250px",
                          }}
                        >
                          {a.thumbnailUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={a.thumbnailUrl}
                              alt={a.nome}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                objectPosition: "center 22%",
                                display: "block",
                              }}
                            />
                          )}
                        </div>
                        <div
                          style={{
                            padding: "9px 11px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.nome}
                          </div>
                          <div
                            style={{
                              fontSize: 9.5,
                              color: "var(--dim)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {a.campanha}
                          </div>
                          {a.permalink && (
                            <a
                              href={a.permalink}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: 10,
                                color: "#35D0FF",
                                textDecoration: "none",
                                marginTop: 2,
                              }}
                            >
                              Abrir publicação ↗
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                      }}
                    >
                      Exibir
                    </span>
                    {(
                      [
                        ["total", "Totais do período"],
                        ["taxa", "Taxas e custos"],
                      ] as [Modo, string][]
                    ).map(([id, rot]) => (
                      <button
                        key={id}
                        onClick={() => setModo(id)}
                        style={{
                          cursor: "pointer",
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "5px 10px",
                          borderRadius: 7,
                          background: modo === id ? "#2E8FFF" : "transparent",
                          color: modo === id ? "#fff" : "var(--muted)",
                          border:
                            modo === id
                              ? "1px solid rgba(255,255,255,.18)"
                              : "1px solid transparent",
                          fontFamily: "inherit",
                        }}
                      >
                        {rot}
                      </button>
                    ))}
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--dim)",
                        marginLeft: 4,
                      }}
                    >
                      {modo === "total"
                        ? "volume bruto — depende de quanto cada peça foi veiculada"
                        : "independem do volume — é aqui que a arte se compara"}
                    </span>
                  </div>

                  {/* Tabela: um número por peça, sem barras. A barra duplicava
                      a informação do próprio número e enchia a tela de cor.

                      flexShrink 0 é obrigatório: `overflow-x: auto` zera o
                      tamanho mínimo automático do item flex, e como o corpo do
                      modal tem altura fixa a tabela encolhia até 0px e ficava
                      escondida atrás do bloco seguinte. */}
                  <div style={{ overflowX: "auto", flexShrink: 0 }}>
                    <div
                      className="cmp-tabela"
                      style={{
                        display: "grid",
                        gridTemplateColumns: `minmax(140px,1.1fr) repeat(${sel.length},minmax(92px,1fr))`,
                        minWidth: 150 + sel.length * 104,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ borderBottom: "1px solid var(--line)", padding: "0 8px 7px" }} />
                      {sel.map((a, i) => (
                        <div
                          key={a.id}
                          style={{
                            borderBottom: "1px solid var(--line)",
                            padding: "0 8px 7px",
                            textAlign: "right",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: ".06em",
                            textTransform: "uppercase",
                            color: CORES[i],
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={a.nome}
                        >
                          Peça {i + 1}
                        </div>
                      ))}

                      {celulas.map((c) =>
                        c.tipo === "grupo" ? (
                          <div
                            key={`g-${c.grupo}`}
                            style={{
                              gridColumn: "1 / -1",
                              fontSize: 9.5,
                              letterSpacing: ".14em",
                              textTransform: "uppercase",
                              color: "var(--muted)",
                              padding: "13px 8px 5px",
                            }}
                          >
                            {c.grupo}
                          </div>
                        ) : (
                          <Fragment key={String(c.linha.chave)}>
                            <div
                              style={{
                                fontSize: 11.5,
                                color: "var(--text2)",
                                padding: "7px 8px",
                                background: c.par ? "var(--soft)" : "transparent",
                                borderRadius: "7px 0 0 7px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.linha.rotulo}
                              {!c.comparavel && (
                                <span
                                  style={{ color: "#FFCF54", marginLeft: 4 }}
                                  title="Não comparável: objetivos diferentes"
                                >
                                  ⚠
                                </span>
                              )}
                            </div>
                            {sel.map((a, i) => (
                              <div
                                key={a.id}
                                style={{
                                  fontFamily: "'Inter',sans-serif",
                                  fontVariantNumeric: "tabular-nums",
                                  fontSize: 12,
                                  textAlign: "right",
                                  padding: "7px 8px",
                                  background: c.par ? "var(--soft)" : "transparent",
                                  borderRadius:
                                    i === sel.length - 1 ? "0 7px 7px 0" : 0,
                                  color:
                                    i === c.melhor ? "#4BE08C" : "var(--text)",
                                  fontWeight: i === c.melhor ? 700 : 400,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {c.linha.fmt(c.vals[i])}
                              </div>
                            ))}
                          </Fragment>
                        ),
                      )}
                    </div>
                  </div>

                  {leitura.length > 0 && (
                    <div
                      style={{
                        background: "rgba(53,208,255,.07)",
                        border: "1px solid rgba(53,208,255,.2)",
                        borderRadius: 11,
                        padding: "12px 15px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9.5,
                          letterSpacing: ".14em",
                          textTransform: "uppercase",
                          color: "var(--muted)",
                        }}
                      >
                        Leitura
                      </div>
                      {leitura.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            fontSize: 11.5,
                            lineHeight: 1.55,
                            color: "var(--text2)",
                          }}
                        >
                          {f}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Curva no tempo: a tabela diz onde cada peça chegou, o
                      gráfico diz como chegou — se subiu, saturou ou caiu. */}
                  {linhaGrafico && (
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: 11,
                        padding: "13px 15px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 9.5,
                            letterSpacing: ".14em",
                            textTransform: "uppercase",
                            color: "var(--muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Dia a dia
                        </span>
                        {opcoesGrafico.map((l) => (
                          <button
                            key={String(l.chave)}
                            onClick={() => setChaveGrafico(l.chave)}
                            style={{
                              cursor: "pointer",
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: "5px 10px",
                              borderRadius: 7,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              background:
                                l.chave === linhaGrafico.chave
                                  ? "#9B7BFF"
                                  : "transparent",
                              color:
                                l.chave === linhaGrafico.chave
                                  ? "#fff"
                                  : "var(--muted)",
                              border:
                                l.chave === linhaGrafico.chave
                                  ? "1px solid rgba(255,255,255,.18)"
                                  : "1px solid transparent",
                              fontFamily: "inherit",
                            }}
                          >
                            {l.rotulo}
                          </button>
                        ))}
                      </div>
                      <GraficoDiario sel={sel} linha={linhaGrafico} />
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          flexWrap: "wrap",
                          fontSize: 10.5,
                          color: "var(--muted2)",
                        }}
                      >
                        {sel.map((a, i) => (
                          <span
                            key={a.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 14,
                                height: 2,
                                background: CORES[i],
                                flex: "0 0 14px",
                              }}
                            />
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 260,
                              }}
                            >
                              {a.nome}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
