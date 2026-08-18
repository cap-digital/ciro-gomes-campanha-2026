import "server-only";
import { graphAccountAll, metaEnv, n, type GraphInsightRow } from "./graph";
import { countFor, type ConversionMetric } from "./conversion";
import { parseAdSet } from "./taxonomy";
import { macrorregiaoDe, ordemMacrorregiao } from "@/lib/geo/ceara";
import type { DateRange } from "@/lib/period";

export type GeoRow = {
  name: string;
  spend: number;
  conversions: number;
  impressions: number;
  /** Soma do alcance dos conjuntos daquele município. Cada conjunto segmenta uma
   *  cidade diferente, então a sobreposição de pessoas entre eles é pequena —
   *  ainda assim é soma, não alcance único de verdade. */
  reach: number;
  clicks: number;
  cpa: number;
  cpm: number;
};

type AdSet = {
  id: string;
  name: string;
  targeting?: {
    geo_locations?: {
      cities?: { name: string; region?: string }[];
      regions?: { name: string }[];
      custom_locations?: { name?: string }[];
    };
  };
};

/**
 * Municípios e regiões a partir da segmentação dos conjuntos de anúncios.
 *
 * A Graph API não expõe entrega por município — o breakdown `region` para no
 * estado. Como a conta é estruturada com um conjunto por cidade
 * ("[MAX INTERACOES] [ABERTO] [SOBRAL] [FEED/STORIES/REELS]"), a segmentação de
 * cada conjunto identifica o município e o gasto do conjunto é atribuído a ele.
 *
 * Atenção ao campo pedido: `targeting{geo_locations}` (sintaxe aninhada) volta
 * VAZIO nesta conta; é preciso pedir `targeting` inteiro e ler o geo_locations
 * do objeto devolvido.
 */
/** Tokens genéricos da taxonomia que NÃO são município algum. */
const NAO_E_MUNICIPIO = /^(GERAL|GERAL\s*CE|CE|CEARA|ABERTO|TODOS|ESTADO|ESTADUAL|BR|BRASIL)$/i;

export type GeoBreakdown = {
  cities: GeoRow[];
  regions: GeoRow[];
  /** Municípios sem macrorregião no mapa de referência. */
  unmapped: string[];
  /** Verba de conjuntos que segmentam o estado inteiro, sem município. */
  estadual: GeoRow | null;
};

export async function getGeoBreakdown(range: DateRange, metric: ConversionMetric): Promise<GeoBreakdown> {
  const { accountId } = metaEnv();

  const [adsets, insights] = await Promise.all([
    graphAccountAll<AdSet>(`${accountId}/adsets`, { fields: "id,name,targeting" }),
    graphAccountAll<GraphInsightRow>(`${accountId}/insights`, {
      fields: "spend,impressions,reach,inline_link_clicks,actions,adset_id,adset_name",
      level: "adset",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
    }),
  ]);

  const statsByAdset = new Map<string, { spend: number; conversions: number; impressions: number; reach: number; clicks: number }>();
  for (const row of insights) {
    const id = row.adset_id;
    if (!id) continue;
    const prev = statsByAdset.get(id) || { spend: 0, conversions: 0, impressions: 0, reach: 0, clicks: 0 };
    prev.spend += n(row.spend);
    prev.impressions += n(row.impressions);
    prev.reach += n(row.reach);
    prev.clicks += n(row.inline_link_clicks);
    prev.conversions += countFor(row.actions, metric);
    statsByAdset.set(id, prev);
  }

  const cities = new Map<string, GeoRow>();
  const estadual: GeoRow = { name: "Ceará · segmentação estadual", spend: 0, conversions: 0, impressions: 0, reach: 0, clicks: 0, cpa: 0, cpm: 0 };

  for (const adset of adsets) {
    const stats = statsByAdset.get(adset.id);
    if (!stats || stats.spend <= 0) continue;

    const geo = adset.targeting?.geo_locations;

    // Conjunto que segmenta o ESTADO inteiro não tem município. Antes, o código
    // caía no token da taxonomia e criava a cidade fantasma "Geral Ce", que
    // liderava o ranking de municípios com ~39% da verba. Agora vai para uma
    // linha estadual própria, fora do ranking.
    const cidades = (geo?.cities || []).map((c) => c.name).filter(Boolean);
    const regioesAlvo = (geo?.regions || []).map((r) => r.name).filter(Boolean);
    if (!cidades.length && regioesAlvo.length) {
      somar(estadual, stats);
      continue;
    }

    // Fonte primária: segmentação real. Fallback: token de LOCALIZACAO da taxonomia.
    let names = cidades;
    if (!names.length) names = (geo?.custom_locations || []).map((c) => c.name || "").filter(Boolean);
    if (!names.length) {
      const fromName = parseAdSet(adset.name).localizacao;
      // Só aceita o token se ele parecer mesmo um município.
      if (fromName && !NAO_E_MUNICIPIO.test(fromName.trim())) names = [titleCase(fromName)];
    }
    if (!names.length) {
      // Sem qualquer pista de local: entra como estadual em vez de sumir.
      somar(estadual, stats);
      continue;
    }

    // Conjunto com várias cidades: rateia proporcionalmente entre elas.
    const share = 1 / names.length;
    for (const name of names) {
      const entry = cities.get(name) || { name, spend: 0, conversions: 0, impressions: 0, reach: 0, clicks: 0, cpa: 0, cpm: 0 };
      somar(entry, stats, share);
      cities.set(name, entry);
    }
  }

  const regions = new Map<string, GeoRow>();
  const unmapped: string[] = [];
  for (const city of cities.values()) {
    const regiao = macrorregiaoDe(city.name);
    if (regiao === "Outras regiões") unmapped.push(city.name);
    const entry = regions.get(regiao) || { name: regiao, spend: 0, conversions: 0, impressions: 0, reach: 0, clicks: 0, cpa: 0, cpm: 0 };
    somar(entry, city);
    regions.set(regiao, entry);
  }

  const withCpa = (r: GeoRow): GeoRow => ({
    ...r,
    cpa: r.conversions > 0 ? r.spend / r.conversions : 0,
    cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : 0,
  });

  // A verba estadual aparece como uma linha própria em Regiões — é verba real,
  // só não é atribuível a nenhum município.
  const regionRows = Array.from(regions.values()).map(withCpa);
  if (estadual.spend > 0) regionRows.push(withCpa(estadual));

  return {
    cities: Array.from(cities.values()).map(withCpa).sort((a, b) => b.spend - a.spend),
    regions: regionRows.sort((a, b) => ordemMacrorregiao(a.name) - ordemMacrorregiao(b.name) || b.spend - a.spend),
    unmapped,
    estadual: estadual.spend > 0 ? withCpa(estadual) : null,
  };
}

type Somavel = { spend: number; conversions: number; impressions: number; reach: number; clicks: number };

/** Acumula um bloco de métricas em outro, opcionalmente rateado. */
function somar(destino: Somavel, origem: Somavel, share = 1) {
  destino.spend += origem.spend * share;
  destino.conversions += origem.conversions * share;
  destino.impressions += origem.impressions * share;
  destino.reach += origem.reach * share;
  destino.clicks += origem.clicks * share;
}

function titleCase(raw: string): string {
  const lower = raw.toLocaleLowerCase("pt-BR");
  const minor = new Set(["de", "da", "do", "das", "dos", "e"]);
  return lower
    .split(/\s+/)
    .map((w, i) => (i > 0 && minor.has(w) ? w : w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1)))
    .join(" ");
}
