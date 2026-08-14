import { getComparativoData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel } from "@/components/ui/Panel";
import { DataSourceBadge } from "@/components/ui/Pill";

export default async function PlataformasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getComparativoData(range);

  const strengthByPlatform = [
    { color: "#FF7A00", title: "Onde o Kwai é mais forte", strength: data.kwaiStrength },
    { color: "#2E8FFF", title: "Onde o Meta é mais forte", strength: data.metaStrength },
  ];

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr)", gridTemplateRows: "auto auto minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {data.platCards.map((p, i) => (
          <div key={i} style={{ background: "#0C1734", border: `1px solid ${p.color}44`, borderRadius: 16, padding: "15px 18px", display: "flex", flexDirection: "column", color: "#EAF0FF" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: p.color, display: "block" }} />
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 900, fontSize: 15, color: "#EAF0FF" }}>{p.name}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 7, background: p.color + "22", color: p.color }}>{p.verdict}</span>
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 9 }}>
              {p.stats.map((st, j) => (
                <div key={j}>
                  <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 16, color: "#EAF0FF" }}>{st.value}</div>
                  <div style={{ fontSize: 9.5, letterSpacing: ".12em", color: "#8FA0C4", textTransform: "uppercase" }}>{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {strengthByPlatform.map(({ color, title, strength }, i) => (
          <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", padding: "12px 15px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 3, background: color, flex: "0 0 auto" }} />
              <span style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 12.5 }}>{title}</span>
              <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--dim)", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums" }}>
                {strength.count}/{strength.total} indicadores
              </span>
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.5, color: "var(--text2)" }}>{strength.summary}</div>
            {strength.highlights.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {strength.highlights.map((h) => (
                  <span key={h} style={{ fontSize: 9.5, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: color + "1A", color, whiteSpace: "nowrap" }}>
                    {h}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Panel style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Força por indicador</div>
          <DataSourceBadge source={data.source} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 14, fontSize: 10.5, color: "var(--muted2)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#FF7A00", display: "block" }} />
              Kwai
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "#2E8FFF", display: "block" }} />
              Meta
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
          {data.comparativo.map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "minmax(88px,124px) minmax(0,1fr) minmax(0,1fr) 90px", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 11.5, color: "var(--text2)" }}>{c.label}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, whiteSpace: "nowrap", color: "#FFB877" }}>{c.kwaiV}</span>
                <div style={{ width: `${c.kwaiPct}%`, height: 11, borderRadius: "5px 0 0 5px", background: "linear-gradient(90deg,rgba(255,122,0,.35),#FF7A00)" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: `${c.metaPct}%`, height: 11, borderRadius: "0 5px 5px 0", background: "linear-gradient(90deg,#2E8FFF,rgba(46,143,255,.35))" }} />
                <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10.5, whiteSpace: "nowrap", color: "#93C3FF" }}>{c.metaV}</span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textAlign: "center",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: c.winner === "Kwai" ? "rgba(255,122,0,.16)" : "rgba(46,143,255,.16)",
                  color: c.winner === "Kwai" ? "#FFB877" : "#93C3FF",
                }}
              >
                {c.winner}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
