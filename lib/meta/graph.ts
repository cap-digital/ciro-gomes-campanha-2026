import "server-only";

const DEFAULT_VERSION = "v22.0";

export function metaEnv() {
  return {
    token: process.env.META_ACCESS_TOKEN || "",
    accountId: process.env.META_AD_ACCOUNT_ID || "",
    version: process.env.META_API_VERSION || DEFAULT_VERSION,
    businessId: process.env.META_BUSINESS_ID || "",
    libraryToken: process.env.META_AD_LIBRARY_TOKEN || process.env.token_bib_anuncios || "",
    libraryPages: process.env.META_AD_LIBRARY_PAGES || "",
    libraryCountry: process.env.META_AD_LIBRARY_PAIS || "BR",
    conversionActionType: process.env.META_CONVERSION_ACTION_TYPE || "lead",
  };
}

/** Modo mock: ligado explicitamente, ou quando faltar token/conta configurados. */
export function isMockMode(): boolean {
  const { token, accountId } = metaEnv();
  if (process.env.MOCK_DADOS === "true") return true;
  return !token || !accountId;
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

async function graphFetch<T>(path: string, params: Params, token: string, revalidate = 120): Promise<T> {
  const { version } = metaEnv();
  const url = new URL(`https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { next: { revalidate } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GraphApiError(`Graph API ${res.status} em ${path}: ${body.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as T;
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

export type GraphInsightRow = {
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpm?: string;
  cpc?: string;
  frequency?: string;
  date_start?: string;
  date_stop?: string;
  campaign_id?: string;
  campaign_name?: string;
  objective?: string;
  age?: string;
  gender?: string;
  region?: string;
  impression_device?: string;
  hourly_stats_aggregated_by_advertiser_time_zone?: string;
  actions?: { action_type: string; value: string }[];
  video_p25_watched_actions?: { action_type: string; value: string }[];
  video_p50_watched_actions?: { action_type: string; value: string }[];
  video_p75_watched_actions?: { action_type: string; value: string }[];
  video_p100_watched_actions?: { action_type: string; value: string }[];
};

export type GraphPaged<T> = { data: T[]; paging?: { next?: string; cursors?: { after?: string } } };

export function n(v: string | number | undefined): number {
  if (v === undefined) return 0;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Soma o valor de todas as actions cujo action_type contém algum dos termos informados. */
export function sumActions(actions: GraphInsightRow["actions"], matchers: string[]): number {
  if (!actions) return 0;
  return actions
    .filter((a) => matchers.some((m) => a.action_type.includes(m)))
    .reduce((acc, a) => acc + n(a.value), 0);
}

export function watchedAt(row: GraphInsightRow, key: keyof GraphInsightRow): number {
  const arr = row[key] as { action_type: string; value: string }[] | undefined;
  if (!arr || !arr.length) return 0;
  return arr.reduce((acc, a) => acc + n(a.value), 0);
}
