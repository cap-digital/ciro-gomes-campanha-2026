import { getPeriodoData, getCriativosData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { KpiCard } from "@/components/ui/Kpi";
import { AccentPanel, Panel, SectionLabel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";
import Link from "next/link";

export default async function PeriodoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const [data, criativos] = await Promise.all([getPeriodoData(range), getCriativosData(range)]);
  const mini = criativos.criativos.slice(0, 6);

  return (
    <div className="pag" style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gridTemplateRows: "auto minmax(0,1.25fr) minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div className="emp" style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, minWidth: 0 }}>
        {data.periodoKpis.map((k, i) => (
          <KpiCard key={i} {...k} big />
        ))}
      </div>

      <div className="emp" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12, minHeight: 0 }}>
        <AccentPanel style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9, flexWrap: "wrap" }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 14 }}>Leitura das campanhas</div>
            <DataSourceBadge source={data.source} />
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {data.leitura.map((p, i) => (
              <div key={i} style={{ fontSize: 13, lineHeight: 1.65, color: "var(--text2)", textWrap: "pretty" }}>
                {p}
              </div>
            ))}
          </div>
        </AccentPanel>
        <Panel>
          <SectionLabel>Últimas alterações</SectionLabel>
          <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {data.alteracoes.map((a, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 9 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--dim)", paddingTop: 2, whiteSpace: "nowrap" }}>{a.time}</div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{a.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel style={{ padding: "13px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 9 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Criativos no ar</div>
          <Link href={buildHref("/criativos", sp)} style={{ marginLeft: "auto", fontSize: 10.5, color: "#35D0FF" }}>
            ver todos →
          </Link>
        </div>
        {/* Cards verticais preenchendo a altura do painel: o criativo é a
            informação principal aqui, então a imagem fica com o espaço. */}
        <div className="emp" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gridTemplateRows: "minmax(0,1fr)", gap: 10 }}>
          {mini.map((c, i) => (
            <a
              key={i}
              href={c.permalink || undefined}
              target={c.permalink ? "_blank" : undefined}
              rel={c.permalink ? "noreferrer" : undefined}
              title={c.permalink ? `${c.name} — abrir publicação` : c.name}
              style={{
                display: "flex",
                flexDirection: "column",
                background: "var(--soft)",
                border: "1px solid var(--line)",
                borderRadius: 11,
                overflow: "hidden",
                minHeight: 0,
                color: "inherit",
                cursor: c.permalink ? "pointer" : "default",
              }}
            >
              <div style={{ flex: 1, minHeight: 0, background: "var(--slot8)", position: "relative" }}>
                {c.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                )}
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    left: 6,
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    padding: "2px 6px",
                    borderRadius: 5,
                    background: c.status === "ATIVO" ? "rgba(33,196,106,.92)" : "rgba(10,18,38,.85)",
                    color: "#fff",
                  }}
                >
                  {c.status}
                </span>
              </div>
              <div style={{ padding: "7px 9px", display: "flex", flexDirection: "column", gap: 2, flex: "0 0 auto" }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--muted)" }}>
                  {c.spend} · CPA {c.cpa}
                </div>
              </div>
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
