import "server-only";
import { graphLibrary, metaEnv, type GraphPaged } from "./graph";

export type LibraryAd = {
  id: string;
  pageId: string;
  pageName: string;
  /** Nome do candidato conforme configurado no .env (rótulo estável). */
  candidato: string;
  /** true para a página do próprio candidato; false para concorrentes. */
  proprio: boolean;
  body: string;
  linkTitle: string;
  status: "ATIVO" | "PAUSADO";
  startDate: string;
  startISO: string;
  /** Fim da veiculação em ISO; vazio quando o anúncio segue sem data de fim. */
  stopISO: string;
  /** Fim da veiculação em epoch ms; 0 quando não há data de fim. */
  stopTs: number;
  platforms: string;
  snapshotUrl: string;
  spendLabel: string;
  impressionsLabel: string;
  /** Limites numéricos das faixas declaradas pela Biblioteca (bucket por anúncio). */
  spendMin: number;
  spendMax: number;
  impressionsMin: number;
  impressionsMax: number;
};

type RawRange = { lower_bound?: string; upper_bound?: string };
type RawAd = {
  id: string;
  page_id?: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
  publisher_platforms?: string[];
  ad_snapshot_url?: string;
  spend?: RawRange;
  impressions?: RawRange;
};

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  audience_network: "AN",
  messenger: "MSG",
  threads: "TH",
};

const FIELDS =
  "id,page_id,page_name,ad_snapshot_url,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles," +
  "ad_creative_link_descriptions,spend,impressions,estimated_audience_size,publisher_platforms," +
  "ad_delivery_start_time,ad_delivery_stop_time,demographic_distribution,delivery_by_region";

export type MonitoredPage = { pageId: string; nome: string; proprio: boolean };

/**
 * Lê META_AD_LIBRARY_PAGES. Aceita os dois formatos:
 *   "1216504185136925:Ciro Gomes,812731998761475:Elmano de Freitas"  (com rótulo)
 *   "1216504185136925,812731998761475"                                (só os IDs)
 * A PRIMEIRA página da lista é sempre tratada como a do próprio candidato;
 * as demais são concorrentes monitorados. Para acompanhar mais adversários,
 * basta acrescentar IDs ao final da variável — nada no código muda.
 */
export function monitoredPages(): MonitoredPage[] {
  const { libraryPages } = metaEnv();
  return libraryPages
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, i) => {
      const [rawId, ...rest] = chunk.split(":");
      const pageId = rawId.trim();
      const nome = rest.join(":").trim();
      return { pageId, nome: nome || "", proprio: i === 0 };
    })
    .filter((p) => /^\d+$/.test(p.pageId));
}

/** Limites de uma faixa. `max` cai no `min` quando a Meta não declara teto. */
function rangeBounds(r: RawRange | undefined): { min: number; max: number } {
  const min = Number(r?.lower_bound || 0);
  const max = Number(r?.upper_bound || 0) || min;
  return { min: Number.isFinite(min) ? min : 0, max: Number.isFinite(max) ? max : 0 };
}

function rangeLabel(r: RawRange | undefined, prefix: string): string {
  if (!r || (!r.lower_bound && !r.upper_bound)) return "—";
  const lo = Number(r.lower_bound || 0).toLocaleString("pt-BR");
  const hi = r.upper_bound ? Number(r.upper_bound).toLocaleString("pt-BR") : "+";
  return `${prefix}${lo}–${hi}`;
}

/**
 * Está ativo AGORA: sem data de fim, ou com fim ainda no futuro.
 *
 * Esta é a ÚNICA definição de "ativo neste momento" do projeto. A série
 * histórica do comparativo usa um critério por dia (ver `esteveAtivoEm`), e o
 * ponto de hoje dela reaproveita esta função — senão um anúncio que parou às
 * 10h de hoje apareceria como ativo no gráfico e pausado no painel, que era
 * exatamente a divergência 61 × 33.
 */
export function estaAtivoAgora(stopTs: number, agora = Date.now()): boolean {
  return stopTs === 0 || stopTs > agora;
}

/** Esteve ativo em algum momento do dia `dia` (YYYY-MM-DD). */
export function esteveAtivoEm(startISO: string, stopISO: string, dia: string): boolean {
  return Boolean(startISO) && startISO <= dia && (!stopISO || stopISO >= dia);
}

function statusOf(ad: RawAd): "ATIVO" | "PAUSADO" {
  const stop = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time).getTime() : 0;
  return estaAtivoAgora(Number.isFinite(stop) ? stop : 0) ? "ATIVO" : "PAUSADO";
}

function toLibraryAd(ad: RawAd, page: MonitoredPage): LibraryAd {
  const startISO = ad.ad_delivery_start_time ? ad.ad_delivery_start_time.slice(0, 10) : "";
  const stopISO = ad.ad_delivery_stop_time ? ad.ad_delivery_stop_time.slice(0, 10) : "";
  const stopMs = ad.ad_delivery_stop_time ? new Date(ad.ad_delivery_stop_time).getTime() : 0;
  return {
    id: ad.id,
    pageId: ad.page_id || page.pageId,
    pageName: ad.page_name || "",
    candidato: page.nome || ad.page_name || page.pageId,
    proprio: page.proprio,
    body: (ad.ad_creative_bodies || [])[0] || "",
    linkTitle: (ad.ad_creative_link_titles || [])[0] || "",
    status: statusOf(ad),
    startDate: startISO ? startISO.split("-").reverse().join("/") : "—",
    startISO,
    stopISO,
    stopTs: Number.isFinite(stopMs) ? stopMs : 0,
    platforms: (ad.publisher_platforms || []).map((p) => PLATFORM_LABEL[p] || p).join(" · "),
    // NUNCA usar `ad_snapshot_url` no cliente: a Meta embute o access_token nessa
    // URL, e ela acabaria no HTML servido ao browser. O link público da Biblioteca
    // abre o mesmo anúncio sem credencial nenhuma.
    snapshotUrl: ad.id ? `https://www.facebook.com/ads/library/?id=${ad.id}` : "",
    spendLabel: rangeLabel(ad.spend, "R$ "),
    impressionsLabel: rangeLabel(ad.impressions, ""),
    spendMin: rangeBounds(ad.spend).min,
    spendMax: rangeBounds(ad.spend).max,
    impressionsMin: rangeBounds(ad.impressions).min,
    impressionsMax: rangeBounds(ad.impressions).max,
  };
}

/**
 * Busca os anúncios de UMA página, seguindo a paginação até `limit`.
 *
 * A consulta é feita por página, e não com todos os IDs de uma vez: numa busca
 * conjunta o candidato com mais anúncios ocupa as primeiras páginas de resultado
 * e os concorrentes só apareceriam muito depois. Consultando separado, cada um
 * tem cota própria.
 */
async function fetchPageAds(page: MonitoredPage, limit: number): Promise<LibraryAd[]> {
  const { libraryCountry, librarySince } = metaEnv();
  const out: LibraryAd[] = [];
  let after: string | undefined;

  // Pagina até o fim de verdade (ou até o teto), para o `total` ser o número
  // real de anúncios do candidato e não o limite do próprio fetch.
  for (let i = 0; i < 20 && out.length < limit; i++) {
    const res = await graphLibrary<GraphPaged<RawAd>>(
      "ads_archive",
      {
        ad_type: "POLITICAL_AND_ISSUE_ADS",
        ad_reached_countries: JSON.stringify([libraryCountry]),
        search_page_ids: JSON.stringify([page.pageId]),
        ad_active_status: "ALL",
        // Sem este recorte a Biblioteca devolve também as campanhas antigas do
        // candidato (o Elmano, por exemplo, tem anúncios de 2022), que ocupariam
        // as primeiras páginas e esconderiam o que está no ar agora.
        ad_delivery_date_min: librarySince,
        fields: FIELDS,
        limit: Math.min(100, limit - out.length),
        after,
      },
      900,
    );
    const batch = res.data || [];
    out.push(...batch.map((ad) => toLibraryAd(ad, page)));
    after = res.paging?.cursors?.after;
    if (!after || !batch.length) break;
  }
  // Mais recentes primeiro: é o que interessa no acompanhamento diário.
  return out.sort((a, b) => (b.startISO || "").localeCompare(a.startISO || "")).slice(0, limit);
}

export type CandidateLibrary = {
  pageId: string;
  candidato: string;
  proprio: boolean;
  total: number;
  ativos: number;
  /** true quando bateu no teto do fetch — `total` é um piso, não o número exato. */
  truncado: boolean;
  ads: LibraryAd[];
  /** Preenchido quando a consulta daquela página falhou. */
  erro?: string;
};

/**
 * Biblioteca de Anúncios de todas as páginas monitoradas (candidato + concorrentes).
 * A falha de uma página não derruba as outras.
 */
export async function searchAdLibraryByCandidate(limitPorPagina = 600): Promise<CandidateLibrary[]> {
  const pages = monitoredPages();
  if (!pages.length) return [];

  const results = await Promise.all(
    pages.map(async (page): Promise<CandidateLibrary> => {
      try {
        const ads = await fetchPageAds(page, limitPorPagina);
        const nome = page.nome || ads[0]?.pageName || page.pageId;
        return {
          pageId: page.pageId,
          candidato: nome,
          proprio: page.proprio,
          total: ads.length,
          ativos: ads.filter((a) => a.status === "ATIVO").length,
          truncado: ads.length >= limitPorPagina,
          ads: ads.map((a) => ({ ...a, candidato: nome })),
        };
      } catch (err) {
        console.error(`[adLibrary] falha na página ${page.pageId}:`, err);
        return {
          pageId: page.pageId,
          candidato: page.nome || page.pageId,
          proprio: page.proprio,
          total: 0,
          ativos: 0,
          truncado: false,
          ads: [],
          erro: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  // Próprio candidato primeiro, concorrentes depois (por volume de anúncios).
  return results.sort((a, b) => Number(b.proprio) - Number(a.proprio) || b.total - a.total);
}

/** Compatibilidade: anúncios só do próprio candidato (primeira página da lista). */
export async function searchAdLibrary(limit = 100): Promise<LibraryAd[]> {
  const groups = await searchAdLibraryByCandidate(limit);
  return groups.find((g) => g.proprio)?.ads ?? [];
}
