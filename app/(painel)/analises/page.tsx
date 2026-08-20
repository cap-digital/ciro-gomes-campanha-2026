import { getAnalisesData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { AccentPanel, Panel, SectionLabel } from "@/components/ui/Panel";
import { BarRow } from "@/components/ui/Bar";
import { DataSourceBadge } from "@/components/ui/Pill";

export default async function AnalisesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getAnalisesData(range);

  return (
    <div className="pag" style={{ height: "100%", display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 12, minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateRows: "auto 1fr", gap: 12, minHeight: 0 }}>
        <AccentPanel style={{ gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--headlineLabel)", textTransform: "uppercase" }}>Leitura geral do período</div>
            <DataSourceBadge source={data.source} />
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--text2)", textWrap: "pretty" }}>{data.headline}</div>
        </AccentPanel>
        <div className="emp" style={{ minHeight: 0, overflow: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignContent: "start" }}>
          {data.analises.map((a, i) => (
            <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "13px 15px", display: "flex", flexDirection: "column", gap: 7 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", padding: "3px 7px", borderRadius: 5, background: "var(--tagBg)", color: "var(--tagFg)" }}>{a.tag}</span>
                <span style={{ fontSize: 9.5, color: "var(--dim)", marginLeft: "auto" }}>{a.src}</span>
              </div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 13.5 }}>{a.title}</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--bodyMuted)", textWrap: "pretty" }}>{a.text}</div>
            </div>
          ))}

          {/* Resumo geral: fecha a leitura dos cards acima, que olham uma
              dimensão cada. Ocupa as duas colunas de propósito — é síntese, não
              mais um card de mesmo peso. */}
          {data.resumo && (
            <div
              className="resumo-geral"
              style={{
                gridColumn: "1 / -1",
                background: "var(--panelAccent)",
                border: "1px solid var(--accentLine)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                padding: "15px 17px",
                display: "flex",
                flexDirection: "column",
                gap: 11,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".12em", padding: "3px 7px", borderRadius: 5, background: "rgba(255,255,255,.14)", color: "var(--text)" }}>
                  RESUMO
                </span>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 14 }}>{data.resumo.titulo}</span>
              </div>

              <div className="emp" style={{ display: "grid", gridTemplateColumns: `repeat(${data.resumo.destaques.length},minmax(0,1fr))`, gap: 10 }}>
                {data.resumo.destaques.map((d) => (
                  <div key={d.label} style={{ background: "rgba(255,255,255,.05)", border: "1px solid var(--line)", borderRadius: 11, padding: "9px 11px" }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 16, fontWeight: 600, letterSpacing: "-.01em" }}>{d.valor}</div>
                    <div style={{ fontSize: 9, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.label}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {data.resumo.paragrafos.map((t, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text2)", textWrap: "pretty" }}>
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 12, minHeight: 0 }}>
        <Panel>
          <SectionLabel>Sinais monitorados</SectionLabel>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 9 }}>
            {data.sinais.map((s, i) => (
              <BarRow key={i} {...s} />
            ))}
          </div>
        </Panel>
        <div style={{ background: "var(--warnBg)", border: "1px solid var(--warnBorder)", borderRadius: 18, boxShadow: "var(--shadow)", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--warnLabel)", textTransform: "uppercase" }}>Pontos de atenção</div>
          {data.atencao.map((t, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.5, color: "var(--warnText)" }}>
              — {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
