import "server-only";

const DEFAULT_VERSION = "v25.0";

export function metaEnv() {
  return {
    token: process.env.META_ACCESS_TOKEN || "",
    accountId: process.env.META_AD_ACCOUNT_ID || "",
    version: process.env.META_API_VERSION || DEFAULT_VERSION,
    businessId: process.env.META_BUSINESS_ID || "",
    libraryToken: process.env.META_AD_LIBRARY_TOKEN || "",
    libraryPages: process.env.META_AD_LIBRARY_PAGES || "",
    libraryCountry: process.env.META_AD_LIBRARY_PAIS || "BR",
    librarySince: process.env.META_AD_LIBRARY_DESDE || "2026-01-01",
    conversionActionType: (process.env.META_CONVERSION_ACTION_TYPE || "").trim(),
  };
}

/** A conta de anúncios está configurada? Sem isso o painel não tem o que mostrar. */
export function isMetaConfigured(): boolean {
  const { token, accountId } = metaEnv();
  return Boolean(token && accountId);
}

/** A Biblioteca de Anúncios usa token e página próprios, independentes da conta. */
export function isLibraryConfigured(): boolean {
  const { libraryToken, libraryPages } = metaEnv();
  return Boolean(libraryToken && libraryPages);
}

export class GraphApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "GraphApiError";
  }
}

type Params = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, params: Params, token: string): string {
  const { version } = metaEnv();
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function fetchJson<T>(url: string, path: string, revalidate: number): Promise<T> {
  // A tag permite ao botão "Atualizar" invalidar tudo de uma vez (app/actions.ts).
  const res = await fetch(url, { next: { revalidate, tags: ["meta"] } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GraphApiError(`Graph API ${res.status} em ${path}: ${body.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Janela de cache padrão. Com 120s, quase todo clique caía em cache frio e
 * pagava a ida completa à Meta (até 6,5s numa rota). Em 600s a navegação fica
 * instantânea na maior parte do tempo, e o botão "Atualizar" force a releitura
 * quando a equipe mexe no gerenciador e quer ver o efeito na hora.
 */
const REVALIDATE_PADRAO = 600;

async function graphFetch<T>(path: string, params: Params, token: string, revalidate = REVALIDATE_PADRAO): Promise<T> {
  return fetchJson<T>(buildUrl(path, params, token), path, revalidate);
}

/** Consulta autenticada com o token da conta de anúncios. */
export function graphAccount<T>(path: string, params: Params, revalidate?: number): Promise<T> {
  const { token } = metaEnv();
  return graphFetch<T>(path, params, token, revalidate);
}

/** Consulta autenticada com o token da Biblioteca de Anúncios. */
export function graphLibrary<T>(path: string, params: Params, revalidate?: number): Promise<T> {
  const { libraryToken } = metaEnv();
  return graphFetch<T>(path, params, libraryToken, revalidate);
}

/**
 * Igual a `graphAccount`, mas segue `paging.next` até acabar.
 *
 * A campanha cresce ao longo do período (novos conjuntos e anúncios entram toda
 * semana), então listar com um `limit` fixo silenciosamente truncaria os dados.
 * `maxPages` é apenas uma trava de segurança contra laço infinito.
 */
export async function graphAccountAll<T>(path: string, params: Params, maxPages = 25, revalidate?: number): Promise<T[]> {
  const { token } = metaEnv();
  let url = buildUrl(path, { limit: 200, ...params }, token);
  const out: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const res = await fetchJson<GraphPaged<T>>(url, path, revalidate ?? REVALIDATE_PADRAO);
    out.push(...(res.data || []));
    const next = res.paging?.next;
    if (!next) break;
    url = next;
  }
  return out;
}

export type GraphAction = { action_type: string; value: string };

export type GraphInsightRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  frequency?: string;
  /** Seguidores atribuídos aos anúncios ("Seguidores no Instagram" no gerenciador). */
  total_follows?: string;
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  age?: string;
  gender?: string;
  region?: string;
  publisher_platform?: string;
  impression_device?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
  actions?: GraphAction[];
  video_play_actions?: GraphAction[];
  video_p25_watched_actions?: GraphAction[];
  video_p50_watched_actions?: GraphAction[];
  video_p75_watched_actions?: GraphAction[];
  video_p100_watched_actions?: GraphAction[];
  video_thruplay_watched_actions?: GraphAction[];
};

export type GraphPaged<T> = { data: T[]; paging?: { next?: string; cursors?: { after?: string } } };

export function n(v: string | number | undefined): number {
  if (v === undefined) return 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Soma apenas os action_types EXATAMENTE iguais aos informados.
 *
 * Casar por substring (o comportamento anterior) contava o mesmo evento várias
 * vezes: "like" casava com `like`, `post_reaction` e `onsite_conversion.post_net_like`,
 * inflando curtidas em ~3x nesta conta. Comparação exata evita isso.
 */
export function sumActionsExact(actions: GraphAction[] | undefined, types: string[]): number {
  if (!actions?.length) return 0;
  const wanted = new Set(types);
  return actions.filter((a) => wanted.has(a.action_type)).reduce((acc, a) => acc + n(a.value), 0);
}

/** Soma o total de uma lista de ações de vídeo (todas as entradas). */
export function sumAll(actions: GraphAction[] | undefined): number {
  if (!actions?.length) return 0;
  return actions.reduce((acc, a) => acc + n(a.value), 0);
}
