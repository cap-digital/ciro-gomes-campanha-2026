import { getCriativosData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import { buildHref, type SearchParams } from "@/lib/url";
import { ChipLink } from "@/components/ui/Chip";
import { barStyle } from "@/lib/style";
import { CRIATIVO_ORDENS, type CriativoOrdem } from "@/lib/types";
import { FiltroCampanha } from "@/components/FiltroCampanha";
import { ComparativoCriativos } from "@/components/ComparativoCriativos";

const ORDEM_IDS = CRIATIVO_ORDENS.map((o) => o.id) as readonly string[];

export default async function CriativosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const ordem = (typeof sp.ordem === "string" && ORDEM_IDS.includes(sp.ordem) ? sp.ordem : "investimento") as CriativoOrdem;
  const status = typeof sp.status === "string" ? sp.status : "todos";
  const campanha = typeof sp.campanha === "string" ? sp.campanha : "todas";
  const data = await getCriativosData(range, ordem, status, campanha);

  return (
    <div className="pag" style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, minHeight: 0, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Status
        </span>
        <ChipLink href={buildHref("/criativos", sp, { status: "todos" })} active={data.status === "todos"}>
          Todos ({data.totalSemFiltro})
        </ChipLink>
        {data.statusDisponiveis.map((st) => (
          <ChipLink key={st} href={buildHref("/criativos", sp, { status: st })} active={data.status === st} accent={st === "ATIVO" ? "#21C46A" : undefined}>
            {st.charAt(0) + st.slice(1).toLowerCase()}
          </ChipLink>
        ))}
        <span style={{ width: 1, height: 18, background: "var(--line)", margin: "0 2px" }} />
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Campanha
        </span>
        <FiltroCampanha campanhas={data.campanhasDisponiveis} atual={data.campanha} />
        <span style={{ width: 1, height: 18, background: "var(--line)", margin: "0 2px" }} />
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          Ordenar
        </span>
        {CRIATIVO_ORDENS.map((o) => (
          <ChipLink key={o.id} href={buildHref("/criativos", sp, { ordem: o.id })} active={ordem === o.id}>
            {o.label}
          </ChipLink>
        ))}
        <div className="barra-fim" style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <ComparativoCriativos anuncios={data.paraComparar} resultLabel={data.resultLabel} />
        </div>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: -4 }}>{data.criativos.length} de {data.totalSemFiltro} anúncios</div>
      <div className="emp" style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(5,1fr)", gridAutoRows: "minmax(210px,1fr)", gap: 12, overflow: "auto", alignContent: "start" }}>
        {data.criativos.map((c, i) => (
          <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 16, boxShadow: "var(--shadow)", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <a
              className="cri-media"
              href={c.permalink || undefined}
              target={c.permalink ? "_blank" : undefined}
              rel={c.permalink ? "noreferrer" : undefined}
              title={c.permalink ? "Abrir publicação" : undefined}
              style={{
                flex: 1,
                minHeight: 0,
                background: c.thumbnailUrl ? undefined : "var(--slot10)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: c.permalink ? "pointer" : "default",
              }}
            >
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
              <span
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: ".08em",
                  padding: "3px 7px",
                  borderRadius: 6,
                  background: c.status === "ATIVO" ? "rgba(33,196,106,.92)" : /PAUSAD|ARQUIV|EXCLU/.test(c.status) ? "rgba(10,18,38,.85)" : "rgba(245,179,1,.9)",
                  color: "#fff",
                }}
              >
                {c.status}
              </span>
              {c.permalink && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: "rgba(10,18,38,.72)",
                    color: "#fff",
                    fontSize: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ↗
                </span>
              )}
            </a>
            <div style={{ padding: "9px 11px", display: "flex", flexDirection: "column", gap: 5 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums", fontSize: 10, color: "var(--muted2)" }}>
                <span>{c.ordemValue ?? c.spend}</span>
                <span title="Reações, comentários, compartilhamentos e salvamentos">{c.interacoes} interações</span>
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
