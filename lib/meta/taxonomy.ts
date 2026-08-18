/**
 * Leitura da taxonomia de nomes da conta (Meta Ads · Eleições 2026 · Ciro Gomes).
 *
 * Padrão informado pela equipe de mídia:
 *
 *   CAMPANHA  [ELEICOES2026] [OBJETIVO] [META DESEMPENHO] [AMBIENTE/ESPECIFICIDADE]
 *   CONJUNTO  [META DESEMPENHO] [PUBLICOS] [LOCALIZACAO] [POSICIONAMENTO]
 *   ANUNCIO   [ADX] [DARKPOST|POST] [NOME LIVRE]
 *
 * IMPORTANTE: a taxonomia é tratada como *dica*, nunca como contrato. A equipe
 * altera o padrão quando precisa, e nomes fora do padrão não podem quebrar o
 * painel. Por isso todo acesso é posicional-com-heurística e sempre devolve
 * `undefined` em vez de erro. Onde a Graph API expõe o dado de forma estruturada
 * (ex.: `targeting.geo_locations.cities`), a API sempre tem precedência — a
 * taxonomia entra só como reforço ou fallback.
 */

const FIXED_PREFIX = /^ELEICOES\s*2026$/i;

/** Extrai os tokens entre colchetes, na ordem em que aparecem. */
export function tokens(name: string | undefined): string[] {
  if (!name) return [];
  const found = Array.from(name.matchAll(/\[([^\]]*)\]/g)).map((m) => m[1].trim()).filter(Boolean);
  // O prefixo fixo [ELEICOES2026] não carrega informação: descarta para as
  // posições seguintes valerem tanto com quanto sem ele.
  return found.length && FIXED_PREFIX.test(found[0]) ? found.slice(1) : found;
}

/** Texto que sobra fora dos colchetes (usado quando o nome não segue a taxonomia). */
export function freeText(name: string | undefined): string {
  if (!name) return "";
  return name.replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim();
}

const POSICIONAMENTO_HINTS = ["FEED", "STORIES", "REELS", "EXPLORE", "SEARCH", "MESSENGER", "AUDIENCE", "ADVANTAGE"];
const PUBLICO_HINTS = ["ABERTO", "RETARGETING", "REMARKETING", "LOOKALIKE", "LAL", "INTERESSE", "CUSTOM", "SIMILAR", "ENGAJADOS"];
const OBJETIVO_HINTS = ["ENGAJAMENTO", "RECONHECIMENTO", "TRAFEGO", "TRÁFEGO", "CONVERSAO", "CONVERSÃO", "CADASTRO", "LEADS", "ALCANCE", "VENDAS", "APP"];

function hasHint(token: string, hints: string[]): boolean {
  const t = token.toUpperCase();
  return hints.some((h) => t.includes(h));
}

export type CampaignTaxonomy = {
  objetivo?: string;
  metaDesempenho?: string;
  ambiente?: string;
};

export function parseCampaign(name: string | undefined): CampaignTaxonomy {
  const t = tokens(name);
  if (!t.length) return {};
  // Posicional, com correção: se o 1º token não parece objetivo mas algum outro
  // parece, usa esse. Nomes fora do padrão simplesmente devolvem menos campos.
  const objetivoIdx = t.findIndex((x) => hasHint(x, OBJETIVO_HINTS));
  const objetivo = objetivoIdx >= 0 ? t[objetivoIdx] : t[0];
  const rest = t.filter((_, i) => i !== (objetivoIdx >= 0 ? objetivoIdx : 0));
  return { objetivo, metaDesempenho: rest[0], ambiente: rest[1] };
}

export type AdSetTaxonomy = {
  metaDesempenho?: string;
  publico?: string;
  localizacao?: string;
  posicionamento?: string;
};

export function parseAdSet(name: string | undefined): AdSetTaxonomy {
  const t = tokens(name);
  if (!t.length) return {};

  // Posicionamento e público são reconhecíveis por conteúdo; o que sobra no meio
  // é a localização. Isso mantém a leitura correta mesmo se a ordem mudar.
  const posIdx = t.findIndex((x) => hasHint(x, POSICIONAMENTO_HINTS));
  const pubIdx = t.findIndex((x, i) => i !== posIdx && hasHint(x, PUBLICO_HINTS));

  const used = new Set<number>();
  if (posIdx >= 0) used.add(posIdx);
  if (pubIdx >= 0) used.add(pubIdx);

  const restIdx = t.map((_, i) => i).filter((i) => !used.has(i));
  // Com [META DESEMPENHO] [PUBLICOS] [LOCALIZACAO] [POSICIONAMENTO], sobram
  // meta-desempenho (primeiro) e localização (último dos não classificados).
  const metaDesempenho = restIdx.length > 1 ? t[restIdx[0]] : undefined;
  const localizacao = restIdx.length ? t[restIdx[restIdx.length - 1]] : undefined;

  return {
    metaDesempenho,
    publico: pubIdx >= 0 ? t[pubIdx] : undefined,
    localizacao,
    posicionamento: posIdx >= 0 ? t[posIdx] : undefined,
  };
}

export type AdTaxonomy = {
  adx?: string;
  formato?: string;
  nome?: string;
};

export function parseAd(name: string | undefined): AdTaxonomy {
  const t = tokens(name);
  if (!t.length) return { nome: freeText(name) || undefined };
  const formatoIdx = t.findIndex((x) => /^(DARK\s*POST|DARKPOST|POST|STORIES|REELS|VIDEO|V[IÍ]DEO|CARROSSEL|EST[AÁ]TICO)$/i.test(x));
  const adxIdx = t.findIndex((x) => /^AD\s*\d+$/i.test(x));
  const usedIdx = new Set([formatoIdx, adxIdx].filter((i) => i >= 0));
  const nome = t.filter((_, i) => !usedIdx.has(i)).join(" · ") || freeText(name) || undefined;
  return {
    adx: adxIdx >= 0 ? t[adxIdx] : undefined,
    formato: formatoIdx >= 0 ? t[formatoIdx] : undefined,
    nome,
  };
}

/**
 * Rótulo curto e legível para um anúncio: prioriza o nome livre da taxonomia e
 * cai no nome cru quando o padrão não foi seguido.
 */
export function adLabel(name: string | undefined): string {
  const parsed = parseAd(name);
  const label = parsed.nome || name || "(sem nome)";
  return label.length > 64 ? label.slice(0, 61).trimEnd() + "…" : label;
}

/** Rótulo de campanha sem o prefixo fixo, para caber nas listas do painel. */
export function campaignLabel(name: string | undefined): string {
  if (!name) return "(sem nome)";
  const cleaned = name.replace(/\[\s*ELEICOES\s*2026\s*\]/i, "").trim();
  return cleaned || name;
}
