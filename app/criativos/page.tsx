import { getCriativosData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { DataSourceBadge } from "@/components/ui/Pill";
import { barStyle } from "@/lib/style";

const FILTERS = ["Todos", "Kwai", "Meta", "Vídeo", "Estático"];

export default async function CriativosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getCriativosData(range);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {FILTERS.map((f, i) => (
          <div
            key={f}
            style={{
              cursor: "default",
              fontSize: 11,
              fontWeight: 600,
              padding: "6px 11px",
              borderRadius: 8,
              whiteSpace: "nowrap",
              background: i === 0 ? "#2E8FFF" : "transparent",
              color: i === 0 ? "#fff" : "var(--muted)",
              border: i === 0 ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
            }}
          >
            {f}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <DataSourceBadge source={data.source} />
          <div style={{ fontSize: 10.5, color: "var(--dim)" }}>Meta: anúncios reais da conta · Kwai: ilustrativo (sem credenciais)</div>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridTemplateRows: "1fr 1fr", gap: 12, overflow: "auto" }}>
        {data.criativos.slice(0, 10).map((c, i) => (
          <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ flex: 1, minHeight: 0, background: c.thumbnailUrl ? undefined : "var(--slot10)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {c.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.thumbnailUrl} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "#8FA7DA", letterSpacing: ".08em" }}>[ criativo ]</span>
              )}
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  padding: "3px 7px",
                  borderRadius: 6,
                  background: c.platform === "Kwai" ? "rgba(255,122,0,.9)" : "rgba(46,143,255,.9)",
                  color: "#fff",
                }}
              >
                {c.platform}
              </span>
            </div>
            <div style={{ padding: "9px 11px", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--muted2)" }}>
                <span>{c.spend}</span>
                <span>CPA {c.cpa}</span>
              </div>
              <div style={{ height: 4, borderRadius: 99, background: "var(--track)", overflow: "hidden" }}>
                <div style={barStyle(c.score, c.platform === "Kwai" ? "#FF7A00" : "#2E8FFF", "100%")} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
