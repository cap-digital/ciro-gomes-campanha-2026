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
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gridTemplateRows: "auto minmax(0,1.25fr) minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 12, minWidth: 0 }}>
        {data.periodoKpis.map((k, i) => (
          <KpiCard key={i} {...k} big />
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)", gap: 12, minHeight: 0 }}>
        <AccentPanel style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
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
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 }}>
          {mini.map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 9, background: "var(--soft)", border: "1px solid var(--line)", borderRadius: 11, padding: 8, minHeight: 0 }}>
              <div style={{ width: 34, flex: "0 0 34px", borderRadius: 7, background: "var(--slot8)", overflow: "hidden" }}>
                {c.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 2 }}>
                <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--muted)" }}>CPA {c.cpa}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
