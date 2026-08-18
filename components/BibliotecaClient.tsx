"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { SplitBar, BarRow } from "@/components/ui/Bar";
import { DataSourceBadge } from "@/components/ui/Pill";
import type { BibliotecaCard } from "@/lib/types";
import { brl, compact } from "@/lib/format";

export type CandidatoBiblioteca = {
  pageId: string;
  candidato: string;
  proprio: boolean;
  total: number;
  ativos: number;
  truncado: boolean;
  erro?: string;
  cards: BibliotecaCard[];
};

export type ComparativoAtivos = {
  dias: string[];
  series: { candidato: string; color: string; proprio: boolean; values: number[] }[];
  totais: {
    candidato: string;
    color: string;
    proprio: boolean;
    ativos: number;
    total: number;
    gastoMin: number;
    gastoMax: number;
    imprMin: number;
    imprMax: number;
  }[];
};

/**
 * Preview do criativo. Só o próprio candidato tem miniatura — a Ad Library API
 * não devolve imagem, então para concorrentes fica o padrão listrado.
 */
function Preview({
  card,
  radius,
  height,
  fit = "cover",
}: {
  card: BibliotecaCard;
  radius: number;
  height?: number | string;
  fit?: "cover" | "contain";
}) {
  const base = {
    borderRadius: radius,
    background: "var(--slot9)",
    height: height ?? "100%",
    width: "100%",
    overflow: "hidden",
    position: "relative" as const,
  };
  if (!card.thumbUrl) return <div style={base} />;
  return (
    <div style={base}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.thumbUrl}
        alt={card.copy.slice(0, 60)}
        loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: fit, display: "block" }}
      />
    </div>
  );
}


/** Botão-aparência para abrir o anúncio na Biblioteca pública da Meta. */
function VerNaBiblioteca() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        alignSelf: "flex-start",
        marginTop: "auto",
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid rgba(53,208,255,.35)",
        color: "#35D0FF",
        fontSize: 10.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      Ver anúncio na Biblioteca <span style={{ fontSize: 12 }}>↗</span>
    </span>
  );
}

/**
 * Card do anúncio. Com miniatura (próprio candidato) usa duas colunas; sem
 * miniatura (concorrentes, cuja conta não é acessível) o bloco de imagem sai e
 * o espaço vai para o texto, com um botão para abrir o anúncio na Biblioteca.
 */
function AdCard({ card }: { card: BibliotecaCard }) {
  const temPreview = Boolean(card.thumbUrl);
  const meta = (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: ".1em",
            padding: "2px 7px",
            borderRadius: 5,
            background: card.status === "ATIVO" ? "rgba(33,196,106,.14)" : "rgba(255,255,255,.07)",
            color: card.status === "ATIVO" ? "#4BE08C" : "#8FA0C4",
          }}
        >
          {card.status}
        </span>
        <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--dim)" }}>ID {card.id}</span>
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: temPreview ? 2 : 3,
          WebkitBoxOrient: "vertical",
        }}
      >
        {card.copy}
      </div>
    </>
  );

  const numeros = (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: "space-between",
        fontFamily: "'Inter',sans-serif",
        fontVariantNumeric: "tabular-nums",
        fontSize: 9.5,
        color: "var(--muted)",
      }}
    >
      <span>{card.start}</span>
      <span>{card.plats}</span>
      {card.spendLabel && card.spendLabel !== "\u2014" && <span style={{ color: "var(--muted2)" }}>Gasto {card.spendLabel}</span>}
      {card.impressionsLabel && card.impressionsLabel !== "\u2014" && <span style={{ color: "var(--muted2)" }}>{card.impressionsLabel} impr.</span>}
    </div>
  );

  return (
    <a
      href={card.snapshotUrl || undefined}
      target={card.snapshotUrl ? "_blank" : undefined}
      rel={card.snapshotUrl ? "noreferrer" : undefined}
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 16,
        boxShadow: "var(--shadow)",
        padding: "11px 12px",
        display: "grid",
        gridTemplateColumns: temPreview ? "104px minmax(0,1fr)" : "minmax(0,1fr)",
        gap: 11,
        minHeight: 0,
        cursor: card.snapshotUrl ? "pointer" : "default",
        color: "inherit",
      }}
    >
      {temPreview && <Preview card={card} radius={10} />}
      <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {meta}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {numeros}
          {!temPreview && card.snapshotUrl && <VerNaBiblioteca />}
        </div>
      </div>
    </a>
  );
}

function parseDateBR(s: string): number {
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) return 0;
  return new Date(y, m - 1, d).getTime();
}

function buildOverview(cards: BibliotecaCard[], todos: BibliotecaCard[] = cards) {
  const total = todos.length;
  const ativos = todos.filter((b) => b.status === "ATIVO").length;
  const pausados = total - ativos;

  // Distribuição por plataforma sobre TODOS os anúncios do candidato — contar só
  // os 8 cards visíveis daria uma leitura enviesada da presença em cada rede.
  const platformCounts = new Map<string, number>();
  for (const b of todos) {
    for (const p of b.plats.split("·").map((s) => s.trim()).filter(Boolean)) {
      platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
    }
  }
  const maxPlatform = Math.max(...platformCounts.values(), 1);
  const platformRows = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, v]) => ({ label, value: `${v} anúncio${v === 1 ? "" : "s"}`, pct: (v / maxPlatform) * 100 }));

  // Para o slot grande, prefere um anúncio com imagem em resolução cheia — a
  // miniatura de 64px da Meta fica borrada quando ampliada.
  const recentes = [...cards].sort((a, b) => parseDateBR(b.start) - parseDateBR(a.start));
  const ativos_ = recentes.filter((b) => b.status === "ATIVO");
  const featured =
    ativos_.find((b) => b.thumbUrl && b.thumbBig) ??
    recentes.find((b) => b.thumbUrl && b.thumbBig) ??
    ativos_[0] ??
    recentes[0];

  return { total, ativos, pausados, platformRows, featured };
}

/**
 * Leitura descritiva do comparativo, gerada dos próprios números da série —
 * nada de texto fixo: se a disputa virar, o texto vira junto.
 */
function lerComparativo(dados: ComparativoAtivos): string[] {
  const { series, dias } = dados;
  if (!series.length || !dias.length) return [];

  const hojeDe = (s: ComparativoAtivos["series"][number]) => s.values[s.values.length - 1] ?? 0;
  const ordenado = [...series].sort((a, b) => hojeDe(b) - hojeDe(a));
  const lider = ordenado[0];
  const vice = ordenado[1];
  const frases: string[] = [];

  if (hojeDe(lider) === 0) {
    frases.push(`Nenhum dos ${series.length} candidatos monitorados tem anúncio ativo hoje.`);
  } else if (vice) {
    const dif = hojeDe(lider) - hojeDe(vice);
    frases.push(
      dif === 0
        ? `${lider.candidato} e ${vice.candidato} empatam hoje com ${hojeDe(lider)} anúncios ativos.`
        : `${lider.candidato} lidera hoje com ${hojeDe(lider)} anúncios ativos, ${dif} a mais que ${vice.candidato} (${hojeDe(vice)}).`,
    );
  } else {
    frases.push(`${lider.candidato} está com ${hojeDe(lider)} anúncios ativos hoje.`);
  }

  for (const s of series) {
    const max = Math.max(...s.values);
    const iMax = s.values.lastIndexOf(max);
    const hoje = hojeDe(s);

    if (max === 0) {
      frases.push(`${s.candidato} não teve nenhum anúncio ativo na janela.`);
      continue;
    }
    // Há quantos dias está zerado?
    let zerado = 0;
    for (let i = s.values.length - 1; i >= 0 && s.values[i] === 0; i--) zerado++;
    if (zerado > 0) {
      frases.push(
        `${s.candidato} está sem anúncios ativos há ${zerado} ${zerado === 1 ? "dia" : "dias"} — teve pico de ${max} em ${dias[iMax]}.`,
      );
      continue;
    }
    // Movimento recente: compara com 7 dias atrás.
    const iAntes = Math.max(0, s.values.length - 8);
    const antes = s.values[iAntes];
    const delta = hoje - antes;
    const verbo = delta > 0 ? "subiu" : delta < 0 ? "recuou" : "ficou estável";
    frases.push(
      delta === 0
        ? `${s.candidato} ${verbo} em ${hoje} anúncios na última semana (pico de ${max} em ${dias[iMax]}).`
        : `${s.candidato} ${verbo} de ${antes} para ${hoje} anúncios na última semana (pico de ${max} em ${dias[iMax]}).`,
    );
  }

  return frases;
}

/**
 * Gráfico de linhas com escala COMPARTILHADA entre os candidatos — cada linha
 * precisa ser lida na mesma régua, senão a comparação engana.
 *
 * As linhas ficam no SVG (com `non-scaling-stroke`, então a espessura é em px e
 * não distorce), enquanto marcadores, rótulos e tooltip são HTML posicionado em
 * porcentagem: dentro de um viewBox com `preserveAspectRatio="none"` um círculo
 * SVG viraria elipse.
 */
function ComparativoChart({ dados }: { dados: ComparativoAtivos }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = dados.dias.length;
  const max = Math.max(...dados.series.flatMap((s) => s.values), 1);

  const H = 100;
  const xPct = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * 100);
  const yPct = (v: number) => 100 - (v / max) * 92 - 4; // 4% de folga em cima e embaixo

  const path = (values: number[]) =>
    values.length ? "M" + values.map((v, i) => `${xPct(i).toFixed(3)} ${((yPct(v) / 100) * H).toFixed(3)}`).join(" L") : "";

  const ticks = Array.from(new Set([0, Math.round(max / 2), max]));

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (r.width <= 0 || n === 0) return;
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setHover(Math.round(frac * (n - 1)));
  }

  const tooltipEsquerda = hover !== null && xPct(hover) > 55;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0, flex: 1 }}>
      <div style={{ display: "flex", gap: 8, minHeight: 0, flex: 1 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: "'Inter',sans-serif",
            fontVariantNumeric: "tabular-nums",
            fontSize: 9.5,
            color: "var(--dim)",
            width: 22,
            textAlign: "right",
            flex: "0 0 22px",
          }}
        >
          {[...ticks].reverse().map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>

        <div
          style={{ flex: 1, minWidth: 0, position: "relative", cursor: "crosshair" }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={0}
                x2={100}
                y1={(yPct(t) / 100) * H}
                y2={(yPct(t) / 100) * H}
                stroke="var(--line)"
                strokeWidth={0.5}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {dados.series.map((s, i) => (
              <path
                key={i}
                d={path(s.values)}
                fill="none"
                stroke={s.color}
                // O próprio candidato ganha traço bem mais grosso: é a linha que
                // a sala de mídia acompanha, tem que saltar à vista.
                strokeWidth={s.proprio ? 2.8 : 1.5}
                opacity={s.proprio ? 1 : 0.85}
                vectorEffect="non-scaling-stroke"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {/* guia vertical do ponto sob o cursor */}
          {hover !== null && (
            <div
              style={{
                position: "absolute",
                left: `${xPct(hover)}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: "rgba(255,255,255,.28)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* rótulo de dados fixo no último ponto de cada série */}
          {dados.series.map((s, i) => {
            const v = s.values[n - 1] ?? 0;
            return (
              <div
                key={`fim-${i}`}
                style={{
                  position: "absolute",
                  left: "100%",
                  top: `${yPct(v)}%`,
                  transform: "translate(-100%,-50%)",
                  fontFamily: "'Inter',sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: s.color,
                  background: "var(--panel)",
                  border: `1px solid ${s.color}55`,
                  borderRadius: 5,
                  padding: "1px 5px",
                  pointerEvents: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {v}
              </div>
            );
          })}

          {/* marcadores no ponto sob o cursor */}
          {hover !== null &&
            dados.series.map((s, i) => (
              <div
                key={`pt-${i}`}
                style={{
                  position: "absolute",
                  left: `${xPct(hover)}%`,
                  top: `${yPct(s.values[hover] ?? 0)}%`,
                  transform: "translate(-50%,-50%)",
                  width: s.proprio ? 9 : 7,
                  height: s.proprio ? 9 : 7,
                  borderRadius: 99,
                  background: s.color,
                  border: "2px solid var(--panel)",
                  pointerEvents: "none",
                }}
              />
            ))}

          {/* tooltip */}
          {hover !== null && (
            <div
              style={{
                position: "absolute",
                left: `${xPct(hover)}%`,
                top: 6,
                transform: tooltipEsquerda ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
                background: "#0A1226",
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 9,
                boxShadow: "0 14px 28px -12px rgba(0,0,0,.8)",
                padding: "7px 10px",
                pointerEvents: "none",
                zIndex: 5,
                minWidth: 132,
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10,
                  color: "#8FA7DA",
                  marginBottom: 5,
                }}
              >
                {dados.dias[hover]}
              </div>
              {[...dados.series]
                .sort((a, b) => (b.values[hover] ?? 0) - (a.values[hover] ?? 0))
                .map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#EAF0FF" }}>
                    <span style={{ width: 9, height: 3, borderRadius: 99, background: s.color, flex: "0 0 auto" }} />
                    <span style={{ flex: 1, whiteSpace: "nowrap" }}>{s.candidato}</span>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      {s.values[hover] ?? 0}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "'Inter',sans-serif",
          fontVariantNumeric: "tabular-nums",
          fontSize: 9.5,
          color: "var(--dim)",
          paddingLeft: 30,
        }}
      >
        {[0, Math.floor((n - 1) / 2), n - 1]
          .filter((i, k, a) => i >= 0 && a.indexOf(i) === k)
          .map((i) => (
            <span key={i}>{dados.dias[i]}</span>
          ))}
      </div>

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", paddingLeft: 30 }}>
        {dados.series.map((s, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text2)" }}>
            <span style={{ width: 14, height: s.proprio ? 4 : 2.5, borderRadius: 99, background: s.color, display: "block" }} />
            <span style={{ fontWeight: s.proprio ? 700 : 500 }}>{s.candidato}</span>
            <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", color: "var(--dim)" }}>
              {s.values[s.values.length - 1] ?? 0} hoje
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Cards de faixa por candidato. A Biblioteca publica gasto e impressões em
 * INTERVALOS por anúncio (ex.: R$ 100–199), nunca o valor cheio — então o total
 * também é um intervalo, e é assim que aparece aqui. As cores acompanham as
 * linhas do gráfico para o olho ligar card e série sem legenda extra.
 */
function CardsFaixa({ dados }: { dados: ComparativoAtivos }) {
  if (!dados.totais.length) return null;

  const faixa = (min: number, max: number, moeda: boolean) => {
    if (max <= 0) return "—";
    const f = (v: number) => (moeda ? brl(v, 0) : compact(v));
    return min === max ? f(max) : `${f(min)} – ${f(max)}`;
  };

  const blocos = [
    { titulo: "Gasto declarado", nota: "faixa somada dos anúncios", moeda: true, min: (t: (typeof dados.totais)[number]) => t.gastoMin, max: (t: (typeof dados.totais)[number]) => t.gastoMax },
    { titulo: "Impressões estimadas", nota: "faixa somada dos anúncios", moeda: false, min: (t: (typeof dados.totais)[number]) => t.imprMin, max: (t: (typeof dados.totais)[number]) => t.imprMax },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
      {blocos.map((b) => (
        <div key={b.titulo} style={{ background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
            <span style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>{b.titulo}</span>
            <span style={{ marginLeft: "auto", fontSize: 9.5, color: "var(--dim)" }}>{b.nota}</span>
          </div>
          {dados.totais.map((t) => (
            <div key={t.candidato} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 14, height: t.proprio ? 4 : 2.5, borderRadius: 99, background: t.color, flex: "0 0 auto" }} />
              <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: t.proprio ? 700 : 500, whiteSpace: "nowrap" }}>{t.candidato}</span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "'Inter',sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 12,
                  fontWeight: 700,
                  color: t.color,
                  whiteSpace: "nowrap",
                }}
              >
                {faixa(b.min(t), b.max(t), b.moeda)}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Leitura em texto, logo abaixo da legenda. */
function ComparativoLeitura({ dados }: { dados: ComparativoAtivos }) {
  const frases = useMemo(() => lerComparativo(dados), [dados]);
  if (!frases.length) return null;
  return (
    <div
      style={{
        background: "rgba(53,208,255,.07)",
        border: "1px solid rgba(53,208,255,.2)",
        borderRadius: 11,
        padding: "10px 13px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 9.5, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>Leitura</div>
      {frases.map((f, i) => (
        <div key={i} style={{ fontSize: 11.5, lineHeight: 1.5, color: "var(--text2)" }}>
          {f}
        </div>
      ))}
    </div>
  );
}

function ComparativoModal({ dados, onClose }: { dados: ComparativoAtivos; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,10,26,.72)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
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
          padding: "16px 18px",
          width: "min(820px,100%)",
          height: "min(680px,100%)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          minHeight: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 14 }}>Anúncios ativos por candidato</div>
          <div style={{ fontSize: 10.5, color: "var(--dim)" }}>ao longo do tempo · Biblioteca de Anúncios Meta</div>
          <button
            onClick={onClose}
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

        {dados.series.length ? (
          <>
            <ComparativoChart dados={dados} />
            <CardsFaixa dados={dados} />
            <ComparativoLeitura dados={dados} />
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontSize: 11.5 }}>
            sem anúncios com data de veiculação para comparar
          </div>
        )}
      </div>
    </div>
  );
}

export function BibliotecaClient({
  porCandidato,
  comparativoAtivos,
  source,
}: {
  porCandidato: CandidatoBiblioteca[];
  comparativoAtivos: ComparativoAtivos;
  source: "live" | "mock" | "erro";
}) {
  const padrao = porCandidato.find((c) => c.proprio) ?? porCandidato[0];
  const [pageId, setPageId] = useState(padrao?.pageId ?? "");
  const [modal, setModal] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<"todos" | "ATIVO" | "PAUSADO">("todos");

  const atual = porCandidato.find((c) => c.pageId === pageId) ?? padrao;
  const todosDoCandidato = atual?.cards ?? [];
  const filtrados = useMemo(
    () => (statusFiltro === "todos" ? todosDoCandidato : todosDoCandidato.filter((c) => c.status === statusFiltro)),
    [todosDoCandidato, statusFiltro],
  );
  const cards = useMemo(() => filtrados.slice(0, 8), [filtrados]);
  // Só oferece o chip do status que existe de fato na lista do candidato.
  const statusDisponiveis = useMemo(
    () => (["ATIVO", "PAUSADO"] as const).filter((st) => todosDoCandidato.some((c) => c.status === st)),
    [todosDoCandidato],
  );
  const overview = useMemo(() => buildOverview(cards, atual?.cards ?? []), [cards, atual]);
  const ativosPct = overview.total > 0 ? Math.round((overview.ativos / overview.total) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0,1fr)", gap: 12, minHeight: 0 }}>
        <Panel style={{ padding: "14px 16px", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Visão geral</div>
            <DataSourceBadge source={source} />
          </div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 600 }}>{atual?.total ?? 0}{atual?.truncado ? "+" : ""}</div>
          <div style={{ fontSize: 10.5, color: "var(--dim)" }}>anúncios de {atual?.candidato ?? "—"} na Biblioteca Meta</div>
          <SplitBar leftPct={ativosPct} leftColor="#21C46A" rightColor="#63739A" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "#4BE08C" }}>{atual?.ativos ?? 0} ativos</span>
            <span style={{ color: "var(--muted2)" }}>{(atual?.total ?? 0) - (atual?.ativos ?? 0)} pausados</span>
          </div>
        </Panel>

        <Panel style={{ padding: "14px 16px", gap: 9 }}>
          <SectionLabel>Por plataforma</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {overview.platformRows.map((r, i) => (
              <BarRow key={i} label={r.label} value={r.value} pct={r.pct} color="#35D0FF" />
            ))}
          </div>
        </Panel>

        {overview.featured && (
          <Panel style={{ padding: "14px 16px" }}>
            <SectionLabel>Em destaque</SectionLabel>
            {overview.featured.thumbUrl && overview.featured.thumbBig && (
              <div style={{ flex: 1, minHeight: 120, marginBottom: 10 }}>
                <Preview card={overview.featured} radius={12} fit="cover" />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".1em",
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: overview.featured.status === "ATIVO" ? "rgba(33,196,106,.14)" : "rgba(255,255,255,.07)",
                  color: overview.featured.status === "ATIVO" ? "#4BE08C" : "#8FA0C4",
                }}
              >
                {overview.featured.status}
              </span>
              <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--dim)" }}>
                desde {overview.featured.start}
              </span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, marginBottom: 6 }}>{overview.featured.copy}</div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginBottom: 8 }}>{overview.featured.plats}</div>
            {overview.featured.snapshotUrl && (
              <a
                href={overview.featured.snapshotUrl}
                target="_blank"
                rel="noreferrer"
                style={{ marginTop: overview.featured.thumbBig ? 0 : "auto", textDecoration: "none" }}
              >
                <VerNaBiblioteca />
              </a>
            )}
          </Panel>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--muted2)" }}>
            Biblioteca de Anúncios · Meta —{" "}
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              {statusFiltro === "todos"
                ? `${atual?.ativos ?? 0} anúncios ativos`
                : `${filtrados.length} ${statusFiltro === "ATIVO" ? "ativos" : "pausados"}`}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            {statusDisponiveis.length > 0 && (
              <>
                <button
                  onClick={() => setStatusFiltro("todos")}
                  style={{
                    cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 11px", borderRadius: 8, whiteSpace: "nowrap",
                    background: statusFiltro === "todos" ? "#2E8FFF" : "transparent",
                    color: statusFiltro === "todos" ? "#fff" : "var(--muted)",
                    border: statusFiltro === "todos" ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                    fontFamily: "inherit",
                  }}
                >
                  Todos ({todosDoCandidato.length})
                </button>
                {statusDisponiveis.map((st) => {
                  const n = todosDoCandidato.filter((c) => c.status === st).length;
                  const ativo = statusFiltro === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFiltro(st)}
                      style={{
                        cursor: "pointer", fontSize: 11, fontWeight: 600, padding: "6px 11px", borderRadius: 8, whiteSpace: "nowrap",
                        background: ativo ? (st === "ATIVO" ? "#21C46A" : "#63739A") : "transparent",
                        color: ativo ? "#fff" : "var(--muted)",
                        border: ativo ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                        fontFamily: "inherit",
                      }}
                    >
                      {st === "ATIVO" ? "Ativos" : "Pausados"} ({n})
                    </button>
                  );
                })}
                <span style={{ width: 1, height: 18, background: "var(--line)", margin: "0 2px" }} />
              </>
            )}
            {porCandidato.map((c) => {
              const active = c.pageId === atual?.pageId;
              return (
                <button
                  key={c.pageId}
                  onClick={() => setPageId(c.pageId)}
                  style={{
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "6px 11px",
                    borderRadius: 8,
                    whiteSpace: "nowrap",
                    background: active ? "#2E8FFF" : "transparent",
                    color: active ? "#fff" : "var(--muted)",
                    border: active ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                    fontFamily: "inherit",
                  }}
                >
                  {c.candidato}
                </button>
              );
            })}
            <button
              onClick={() => setModal(true)}
              style={{
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 11px",
                borderRadius: 8,
                whiteSpace: "nowrap",
                background: "transparent",
                color: "#35D0FF",
                border: "1px solid rgba(53,208,255,.35)",
                fontFamily: "inherit",
              }}
            >
              Ver comparativo
            </button>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gridTemplateRows: "repeat(4,1fr)", gap: 12, overflow: "auto" }}>
          {cards.map((b, i) => (
            <AdCard key={i} card={b} />
          ))}
        </div>
      </div>

      {modal && <ComparativoModal dados={comparativoAtivos} onClose={() => setModal(false)} />}
    </div>
  );
}
