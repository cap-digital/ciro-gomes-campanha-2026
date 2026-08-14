import { getTimelineData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { Panel, AccentPanel } from "@/components/ui/Panel";
import { SvgLines, DayAxis } from "@/components/ui/Chart";
import { DataSourceBadge } from "@/components/ui/Pill";

function tagStyle(tag: string) {
  const bg =
    tag === "VERBA" ? "rgba(245,179,1,.14)" : tag === "CRIATIVO" ? "rgba(53,208,255,.14)" : tag === "PÚBLICO" ? "rgba(155,123,255,.14)" : "rgba(228,34,43,.14)";
  const fg = tag === "VERBA" ? "#FFCF54" : tag === "CRIATIVO" ? "#8FE3FF" : tag === "PÚBLICO" ? "#C4B0FF" : "#FF8189";
  return { fontSize: 8.5, fontWeight: 700, letterSpacing: ".1em", padding: "3px 7px", borderRadius: 5, flex: "0 0 auto", textTransform: "uppercase" as const, background: bg, color: fg };
}

export default async function LinhaDoTempoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getTimelineData(range);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12, minHeight: 0 }}>
      <Panel style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Diário de alterações</div>
          <DataSourceBadge source={data.source} />
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 14, paddingLeft: 4 }}>
          {data.diario.map((d, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "78px 1fr", gap: 14, position: "relative" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 1 }}>
                <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 12, color: "#fff" }}>{d.date}</div>
                <div style={{ fontSize: 9.5, color: "var(--dim)" }}>{d.weekday}</div>
              </div>
              <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 14, display: "flex", flexDirection: "column", gap: 7, position: "relative" }}>
                <span style={{ position: "absolute", left: -4.5, top: 4, width: 8, height: 8, borderRadius: 99, background: "#35D0FF", boxShadow: "0 0 0 3px rgba(53,208,255,.18)" }} />
                {d.items.map((it, j) => (
                  <div key={j} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={tagStyle(it.tag)}>{it.tag}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 600 }}>{it.title}</div>
                      <div style={{ fontSize: 10.5, color: "var(--muted2)", lineHeight: 1.45 }}>{it.detail}</div>
                    </div>
                    {it.impact && (
                      <div
                        style={{
                          marginLeft: "auto",
                          fontFamily: "'Inter',sans-serif",
                          fontVariantNumeric: "tabular-nums",
                          fontSize: 10,
                          padding: "2px 7px",
                          borderRadius: 6,
                          whiteSpace: "nowrap",
                          background: it.up ? "rgba(33,196,106,.14)" : "rgba(228,34,43,.14)",
                          color: it.up ? "#4BE08C" : "#FF8189",
                        }}
                      >
                        {it.impact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateRows: "1fr auto", gap: 12, minHeight: 0 }}>
        <Panel>
          <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase", marginBottom: 8 }}>Evolução do CPA após cada mudança</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <SvgLines lines={[{ values: data.cpaSeries, color: "#E4222B", width: 0.7, areaFill: "rgba(228,34,43,.12)" }]} />
          </div>
          <DayAxis labels={data.dayLabels} />
        </Panel>
        <AccentPanel style={{ padding: "14px 16px", gap: 7 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 13 }}>O que as mudanças produziram</div>
          {data.efeitos.map((e, i) => (
            <div key={i} style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text2)" }}>
              — {e}
            </div>
          ))}
        </AccentPanel>
      </div>
    </div>
  );
}
