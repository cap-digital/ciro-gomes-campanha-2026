import Link from "next/link";
import { getInicioData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { KpiGrid } from "@/components/ui/Kpi";
import { DataSourceBadge } from "@/components/ui/Pill";

const CANDIDATO = process.env.NEXT_PUBLIC_CANDIDATO || "ACM Neto";
const CARGO = process.env.NEXT_PUBLIC_CARGO || "Governador · Bahia";
const ANO = (process.env.NEXT_PUBLIC_DATA_ELEICAO || "2026").slice(0, 4);

export default async function InicioPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getInicioData(range);

  return (
    <div style={{ height: "100%", display: "grid", gridTemplateRows: "1fr auto", gap: 14, minHeight: 0 }}>
      <div
        style={{
          minHeight: 0,
          borderRadius: 20,
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(115deg,#0B2A6B 0%,#0E3E9E 45%,#1157C9 100%)",
          display: "grid",
          gridTemplateColumns: "1.15fr .85fr",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "auto -12% -60% 40%",
            width: "70%",
            height: "160%",
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 40%,rgba(53,208,255,.28),transparent 62%)",
          }}
        />
        <div
          style={{
            position: "relative",
            padding: "clamp(14px,2.4vh,28px) 30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "clamp(7px,1.4vh,14px)",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontVariantNumeric: "tabular-nums",
                fontSize: "clamp(9px,1.1vw,11px)",
                letterSpacing: ".28em",
                color: "#9CC8FF",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              PAINEL DE CAMPANHA · KWAI + META ADS
            </div>
            <DataSourceBadge source={data.source} />
          </div>
          <h1
            style={{
              margin: 0,
              fontFamily: "'Poppins',sans-serif",
              fontWeight: 900,
              fontSize: "clamp(22px,min(3.2vw,6.4vh),50px)",
              lineHeight: 0.94,
              letterSpacing: "-.02em",
              textTransform: "uppercase",
              textWrap: "balance",
            }}
          >
            Central de
            <br />
            inteligência
            <br />
            <span style={{ color: "#35D0FF" }}>de mídia</span>
          </h1>
          <p style={{ margin: 0, maxWidth: "44ch", fontSize: "clamp(11.5px,1.3vw,14.5px)", lineHeight: 1.5, color: "#D3E3FF", textWrap: "pretty" }}>
            Investimento, alcance, público, território e criativos da campanha de <strong style={{ color: "#fff" }}>{CANDIDATO}</strong> — Kwai Ads e Meta
            Ads em um só painel.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 4 }}>
            <Link
              href={buildHref("/campanhas", sp)}
              style={{
                cursor: "pointer",
                background: "#fff",
                color: "#0B2A6B",
                fontWeight: 700,
                fontSize: "clamp(12px,1.2vw,14px)",
                padding: "clamp(9px,1.4vh,13px) 22px",
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              Abrir painel de campanhas <span style={{ fontSize: 15 }}>→</span>
            </Link>
            <Link
              href={buildHref("/simulador", sp)}
              style={{
                cursor: "pointer",
                border: "1px solid rgba(255,255,255,.4)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "clamp(12px,1.2vw,14px)",
                padding: "clamp(9px,1.4vh,13px) 20px",
                borderRadius: 99,
              }}
            >
              Simulador de verba
            </Link>
          </div>
        </div>
        <div style={{ position: "relative", padding: "26px 30px 26px 0", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 0 }}>
          <div style={{ width: "100%", height: "100%", maxHeight: "100%", borderRadius: 22, background: "#fff", padding: 9, display: "flex" }}>
            <div style={{ flex: 1, borderRadius: 15, background: "var(--slot12)", position: "relative", display: "flex", alignItems: "flex-end", padding: 18 }}>
              <div
                style={{
                  fontFamily: "'Inter',sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  fontSize: 10.5,
                  color: "#8FA7DA",
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  textAlign: "center",
                  transform: "translateY(-50%)",
                  letterSpacing: ".1em",
                }}
              >
                [ foto do candidato ]
              </div>
              <div style={{ position: "relative" }}>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 900, fontSize: 17, letterSpacing: ".04em" }}>{CANDIDATO.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "#B9CCF2" }}>
                  {CARGO} · {ANO}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, display: "flex" }}>
          <div style={{ flex: 1, background: "#E4222B" }} />
          <div style={{ flex: 2, background: "#35D0FF" }} />
        </div>
      </div>

      <KpiGrid items={data.heroKpis} columns={5} />
    </div>
  );
}
