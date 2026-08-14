import { getBibliotecaData } from "@/lib/dashboard";
import { DataSourceBadge } from "@/components/ui/Pill";
import { Panel, SectionLabel } from "@/components/ui/Panel";
import { SplitBar, BarRow } from "@/components/ui/Bar";
import type { BibliotecaCard } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS = ["Ativos", "Inativos", "Vídeo", "Imagem"];

function parseDateBR(s: string): number {
  const [d, m, y] = s.split("/").map(Number);
  if (!d || !m || !y) return 0;
  return new Date(y, m - 1, d).getTime();
}

function buildOverview(cards: BibliotecaCard[]) {
  const total = cards.length;
  const ativos = cards.filter((b) => b.status === "ATIVO").length;
  const pausados = total - ativos;

  const platformCounts = new Map<string, number>();
  for (const b of cards) {
    for (const p of b.plats.split("·").map((s) => s.trim()).filter(Boolean)) {
      platformCounts.set(p, (platformCounts.get(p) || 0) + 1);
    }
  }
  const maxPlatform = Math.max(...platformCounts.values(), 1);
  const platformRows = Array.from(platformCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, v]) => ({ label, value: `${v} anúncio${v === 1 ? "" : "s"}`, pct: (v / maxPlatform) * 100 }));

  const featured =
    [...cards].filter((b) => b.status === "ATIVO").sort((a, b) => parseDateBR(b.start) - parseDateBR(a.start))[0] ?? cards[0];

  return { total, ativos, pausados, platformRows, featured };
}

export default async function BibliotecaPage() {
  const data = await getBibliotecaData();
  const cards = data.biblioteca.slice(0, 8);
  const overview = buildOverview(cards);
  const ativosPct = overview.total > 0 ? Math.round((overview.ativos / overview.total) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateColumns: "340px minmax(0,1fr)", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "grid", gridTemplateRows: "auto auto minmax(0,1fr)", gap: 12, minHeight: 0 }}>
        <Panel style={{ padding: "14px 16px", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, letterSpacing: ".16em", color: "var(--muted)", textTransform: "uppercase" }}>Visão geral</div>
            <DataSourceBadge source={data.source} />
          </div>
          <div style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 600 }}>{overview.total}</div>
          <div style={{ fontSize: 10.5, color: "var(--dim)" }}>anúncios na Biblioteca Meta</div>
          <SplitBar leftPct={ativosPct} leftColor="#21C46A" rightColor="#63739A" />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
            <span style={{ color: "#4BE08C" }}>{overview.ativos} ativos</span>
            <span style={{ color: "var(--muted2)" }}>{overview.pausados} pausados</span>
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
            <div style={{ borderRadius: 12, background: "var(--slot10)", height: 90, marginBottom: 10 }} />
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
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{overview.featured.plats}</div>
          </Panel>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "var(--muted2)" }}>
            Biblioteca de Anúncios · Meta — <span style={{ color: "var(--text)", fontWeight: 600 }}>{overview.ativos} anúncios ativos</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
            {FILTERS.map((f, i) => (
              <div
                key={f}
                style={{
                  cursor: "default",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "6px 11px",
                  borderRadius: 8,
                  background: i === 0 ? "#2E8FFF" : "transparent",
                  color: i === 0 ? "#fff" : "var(--muted)",
                  border: i === 0 ? "1px solid rgba(255,255,255,.18)" : "1px solid transparent",
                }}
              >
                {f}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gridTemplateRows: "repeat(4,1fr)", gap: 12, overflow: "auto" }}>
          {cards.map((b, i) => (
            <a
              key={i}
              href={b.snapshotUrl || undefined}
              target={b.snapshotUrl ? "_blank" : undefined}
              rel={b.snapshotUrl ? "noreferrer" : undefined}
              style={{
                background: "var(--panel)",
                border: "1px solid var(--line)",
                borderRadius: 16,
                boxShadow: "var(--shadow)",
                padding: "11px 12px",
                display: "grid",
                gridTemplateColumns: "64px minmax(0,1fr)",
                gap: 11,
                minHeight: 0,
                cursor: b.snapshotUrl ? "pointer" : "default",
                color: "inherit",
              }}
            >
              <div style={{ borderRadius: 9, background: "var(--slot9)" }} />
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: ".1em",
                      padding: "2px 7px",
                      borderRadius: 5,
                      background: b.status === "ATIVO" ? "rgba(33,196,106,.14)" : "rgba(255,255,255,.07)",
                      color: b.status === "ATIVO" ? "#4BE08C" : "#8FA0C4",
                    }}
                  >
                    {b.status}
                  </span>
                  <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--dim)" }}>ID {b.id}</span>
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {b.copy}
                </div>
                <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--muted)" }}>
                  <span>{b.start}</span>
                  <span>{b.plats}</span>
                </div>
                {(b.spendLabel || b.impressionsLabel) && (
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 9.5, color: "var(--muted2)" }}>
                    {b.spendLabel && <span>Gasto {b.spendLabel}</span>}
                    {b.impressionsLabel && <span>{b.impressionsLabel} impr.</span>}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
