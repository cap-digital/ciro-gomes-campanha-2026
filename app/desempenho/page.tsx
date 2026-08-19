import { getDesempenhoData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { KpiCard } from "@/components/ui/Kpi";
import { ChipLink } from "@/components/ui/Chip";
import { BarRow } from "@/components/ui/Bar";
import { compact, num, pct } from "@/lib/format";
import { SvgLines, DayAxis } from "@/components/ui/Chart";
import { DataSourceBadge } from "@/components/ui/Pill";
import { METRIC_LABELS, type Series } from "@/lib/types";

const METRIC_KEYS = Object.keys(METRIC_LABELS) as (keyof Series)[];

export default async function DesempenhoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getDesempenhoData(range);
  const labels = data.metricLabels;

  const metricA = (
    typeof sp.metricA === "string" &&
    METRIC_KEYS.includes(sp.metricA as keyof Series)
      ? sp.metricA
      : "cadastros"
  ) as keyof Series;
  const metricB = (
    typeof sp.metricB === "string" &&
    METRIC_KEYS.includes(sp.metricB as keyof Series)
      ? sp.metricB
      : "investimento"
  ) as keyof Series;

  return (
    <div
      className="pag"
      style={{
        height: "100%",
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gridTemplateRows: "auto minmax(0,1.3fr) minmax(0,1fr)",
        gap: 12,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <div
        className="emp"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,minmax(0,1fr))",
          gap: 10,
          minWidth: 0,
        }}
      >
        {data.bigNumbers.map((b, i) => (
          <KpiCard key={i} {...b} />
        ))}
      </div>

      <Panel>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".16em",
              color: "var(--muted)",
              textTransform: "uppercase",
            }}
          >
            Linha do tempo comparativa
          </div>
          <DataSourceBadge source={data.source} />
          <div
            className="regua-ab"
            style={{
              marginLeft: "auto",
              minWidth: 0,
              overflowX: "auto",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontSize: 9.5,
                color: "#35D0FF",
                flexShrink: 0,
              }}
            >
              A
            </span>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {METRIC_KEYS.map((k) => (
                <ChipLink
                  key={k}
                  href={buildHref("/desempenho", sp, { metricA: k })}
                  active={metricA === k}
                  accent="#0E7FA8"
                >
                  {labels[k]}
                </ChipLink>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "var(--dim)", flexShrink: 0 }}>
              vs
            </span>
            <span
              style={{
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontSize: 9.5,
                color: "#F5B301",
                flexShrink: 0,
              }}
            >
              B
            </span>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {METRIC_KEYS.map((k) => (
                <ChipLink
                  key={k}
                  href={buildHref("/desempenho", sp, { metricB: k })}
                  active={metricB === k}
                  accent="#8A6A00"
                >
                  {labels[k]}
                </ChipLink>
              ))}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <SvgLines
            lines={[
              {
                values: data.series[metricA],
                color: "var(--line1)",
                width: 1.8,
                areaFill: "var(--fill1)",
              },
              // 0,7px tracejado sumia no fundo claro; 2px com traço mais longo fica legível.
              {
                values: data.series[metricB],
                color: "#E08A00",
                width: 2,
                dashed: true,
              },
            ]}
          />
        </div>
        <DayAxis labels={data.dayLabels} />
      </Panel>

      <div
        className="emp"
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0,.85fr) minmax(0,2.3fr) minmax(0,.85fr)",
          gap: 12,
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <Panel style={{ padding: "13px 15px" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".16em",
              color: "var(--muted)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Interações
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              gap: 6,
            }}
          >
            {data.interacoes.map((i, idx) => (
              <BarRow key={idx} {...i} />
            ))}
          </div>
        </Panel>
        <Panel style={{ padding: "13px 15px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".16em",
                color: "var(--muted)",
                textTransform: "uppercase",
              }}
            >
              Interações por criativo
            </div>
            <div style={{ fontSize: 10, color: "var(--dim)" }}>
              ordenado por taxa de engajamento
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
            {/* minWidth: sete colunas não cabem numa tela de celular. Com um piso
                de largura a tabela rola dentro do painel em vez de espremer o
                nome da peça até virar "F…". */}
            <table
              style={{
                width: "100%",
                minWidth: 520,
                borderCollapse: "collapse",
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <thead>
                <tr
                  style={{
                    position: "sticky",
                    top: 0,
                    background: "var(--panel)",
                    zIndex: 1,
                  }}
                >
                  {[
                    { t: "Peça", a: "left" as const, w: "30%" },
                    { t: "Impr.", a: "right" as const, w: "12%" },
                    { t: "Reações", a: "right" as const, w: "12%" },
                    { t: "Coment.", a: "right" as const, w: "12%" },
                    { t: "Compart.", a: "right" as const, w: "12%" },
                    { t: "Salvos", a: "right" as const, w: "10%" },
                    { t: "Engaj.", a: "right" as const, w: "12%" },
                  ].map((c) => (
                    <th
                      key={c.t}
                      style={{
                        width: c.w,
                        textAlign: c.a,
                        fontSize: 9,
                        letterSpacing: ".1em",
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        fontWeight: 600,
                        padding: "0 6px 7px",
                        borderBottom: "1px solid var(--line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.interCriativo.map((c, i) => (
                  <tr
                    key={i}
                    style={{
                      background: i % 2 ? "var(--soft)" : "transparent",
                    }}
                  >
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 11,
                        maxWidth: 0,
                        width: "30%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: 2,
                            background: c.cor,
                            flex: "0 0 auto",
                          }}
                        />
                        <span
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {c.nome}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        color: "var(--muted2)",
                      }}
                    >
                      {compact(c.impressoes)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        color: "var(--muted2)",
                      }}
                    >
                      {num(c.reacoes)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        color: "var(--muted2)",
                      }}
                    >
                      {num(c.comentarios)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        color: "var(--muted2)",
                      }}
                    >
                      {num(c.compartilhamentos)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        color: "var(--muted2)",
                      }}
                    >
                      {num(c.salvos)}
                    </td>
                    <td
                      style={{
                        padding: "6px",
                        fontSize: 10.5,
                        textAlign: "right",
                        fontWeight: 700,
                        color: i < 3 ? "#4BE08C" : "var(--text)",
                      }}
                    >
                      {pct(c.taxa, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.interCriativo.length && (
              <div
                style={{
                  fontSize: 11.5,
                  color: "var(--dim)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                sem interações no período
              </div>
            )}
          </div>
          {data.destaqueCriativo && (
            <div
              style={{
                display: "flex",
                gap: 7,
                alignItems: "flex-start",
                paddingTop: 8,
                borderTop: "1px solid var(--line)",
                marginTop: 6,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 99,
                  background: "#F5B301",
                  marginTop: 5,
                  flex: "0 0 auto",
                }}
              />
              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--text2)",
                  lineHeight: 1.45,
                }}
              >
                {data.destaqueCriativo}
              </span>
            </div>
          )}
        </Panel>
        <Panel style={{ padding: "13px 15px" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".16em",
              color: "var(--muted)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Retenção de vídeo
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-around",
              gap: 6,
            }}
          >
            {data.retencao.map((r, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 9 }}
              >
                <div
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 10,
                    color: "var(--muted)",
                    width: 34,
                  }}
                >
                  {r.label}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 14,
                    borderRadius: 5,
                    background: "var(--track)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(2, Math.min(100, r.pct))}%`,
                      height: "100%",
                      borderRadius: 5,
                      background: "linear-gradient(90deg,#2E8FFF,#35D0FF)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "'Inter',sans-serif",
                    fontVariantNumeric: "tabular-nums",
                    fontSize: 10.5,
                    color: "var(--text2)",
                    width: 34,
                    textAlign: "right",
                  }}
                >
                  {r.value}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
