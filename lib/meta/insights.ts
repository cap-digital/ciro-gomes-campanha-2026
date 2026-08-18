import "server-only";
import { graphAccount, graphAccountAll, metaEnv, n, sumActionsExact, sumAll, type GraphInsightRow, type GraphPaged } from "./graph";
import { countFor, resolveFromActions, type ConversionMetric } from "./conversion";
import { rangeAcumulado, type DateRange } from "@/lib/period";

const BASE_FIELDS =
  "spend,impressions,reach,clicks,inline_link_clicks,ctr,cpm,cpc,frequency,actions,total_follows," +
  "video_play_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions," +
  "video_p100_watched_actions,video_thruplay_watched_actions";

/** action_types exatos por tipo de interação, conforme a Graph API devolve. */
const ACTION = {
  reactions: ["post_reaction"],
  comments: ["comment"],
  shares: ["post"],
  saves: ["onsite_conversion.post_save"],
  linkClicks: ["link_click"],
  videoViews: ["video_view"],
  postEngagement: ["post_engagement"],
} as const;

export type AccountTotals = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  linkClicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  /** CTR e CPC calculados sobre CLIQUE NO LINK. Os campos ctr/cpc da Meta usam
   *  `clicks`, que inclui curtida, comentário e clique no perfil — incoerente
   *  com o volume de cliques que o painel exibe (inline_link_clicks). */
  ctrLink: number;
  cpcLink: number;
  frequency: number;
  /** Volume da métrica de conversão resolvida para o período. */
  conversions: number;
  /** Custo por unidade da métrica de conversão resolvida. */
  cpa: number;
  /** Qual métrica foi usada como conversão — define os rótulos do painel. */
  metric: ConversionMetric;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  videoViews: number;
  thruplays: number;
  postEngagement: number;
  /**
   * Seguidores atribuídos aos anúncios — a coluna "Seguidores no Instagram" do
   * gerenciador. O campo `total_follows` existe na Marketing API mas hoje volta
   * VAZIO nesta conta (testado em conta/campanha/conjunto/anúncio, nas versões
   * v21/v23/v25 e com todas as janelas de atribuição). Fica aqui pronto: no dia
   * em que a Meta passar a devolver, o painel usa automaticamente esse número,
   * que é melhor que o crescimento do perfil por ser atribuível à mídia.
   */
  followsAds: number;
};

export const EMPTY_TOTALS: AccountTotals = {
  spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, ctr: 0, cpm: 0, cpc: 0, frequency: 0,
  ctrLink: 0, cpcLink: 0,
  conversions: 0, cpa: 0, metric: resolveFromActions(undefined),
  likes: 0, comments: 0, shares: 0, saves: 0, videoViews: 0, thruplays: 0, postEngagement: 0,
  followsAds: 0,
};

function toTotals(row: GraphInsightRow | undefined): AccountTotals {
  if (!row) return EMPTY_TOTALS;
  const spend = n(row.spend);
  const metric = resolveFromActions(row.actions);
  const conversions = countFor(row.actions, metric);
  const impressions = n(row.impressions);
  const linkClicks = n(row.inline_link_clicks) || sumActionsExact(row.actions, [...ACTION.linkClicks]);
  return {
    spend,
    impressions,
    reach: n(row.reach),
    clicks: n(row.clicks),
    linkClicks,
    ctr: n(row.ctr),
    cpm: n(row.cpm),
    cpc: n(row.cpc),
    ctrLink: impressions > 0 ? (linkClicks / impressions) * 100 : 0,
    cpcLink: linkClicks > 0 ? spend / linkClicks : 0,
    frequency: n(row.frequency),
    conversions,
    cpa: conversions > 0 ? spend / conversions : 0,
    metric,
    likes: sumActionsExact(row.actions, [...ACTION.reactions]),
    comments: sumActionsExact(row.actions, [...ACTION.comments]),
    shares: sumActionsExact(row.actions, [...ACTION.shares]),
    saves: sumActionsExact(row.actions, [...ACTION.saves]),
    videoViews: sumActionsExact(row.actions, [...ACTION.videoViews]),
    thruplays: sumAll(row.video_thruplay_watched_actions),
    postEngagement: sumActionsExact(row.actions, [...ACTION.postEngagement]),
    followsAds: n(row.total_follows),
  };
}

export async function getAccountTotals(range: DateRange): Promise<AccountTotals> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: BASE_FIELDS,
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
  });
  return toTotals(res.data?.[0]);
}

/**
 * Gasto acumulado da conta inteira, independente da janela selecionada.
 *
 * ATENÇÃO: NÃO usar `date_preset=maximum` aqui. Apesar do nome, ele EXCLUI o dia
 * corrente — nesta conta devolvia 10/08..17/08 e deixava de fora os R$ 6.735
 * gastos hoje, subestimando o acumulado em quase metade. Só a janela explícita
 * até hoje fecha com a soma dos dias.
 */
export async function getGastoAcumulado(): Promise<number> {
  const { accountId } = metaEnv();
  const range = rangeAcumulado();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "spend",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
  });
  return n(res.data?.[0]?.spend);
}

export type DailyPoint = {
  date: string;
  spend: number;
  conversions: number;
  cpa: number;
  reach: number;
  impressions: number;
  interacoes: number;
};

export async function getDailySeries(range: DateRange, metric: ConversionMetric): Promise<DailyPoint[]> {
  const { accountId } = metaEnv();
  // Com time_increment=1 cada dia é uma linha, e o /insights pagina em 25 por
  // padrão. Sem paginar, uma janela de mais de 25 dias perderia dias
  // silenciosamente — e a campanha vai até outubro.
  const rows = await graphAccountAll<GraphInsightRow>(`${accountId}/insights`, {
    fields: "spend,impressions,reach,actions",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    time_increment: 1,
    level: "account",
    limit: 500,
  });
  return rows
    .slice()
    .sort((a, b) => (a.date_start || "").localeCompare(b.date_start || ""))
    .map((row) => {
    const spend = n(row.spend);
    const conversions = countFor(row.actions, metric);
    const interacoes = sumActionsExact(row.actions, [
      ...ACTION.reactions, ...ACTION.comments, ...ACTION.shares, ...ACTION.saves, ...ACTION.linkClicks,
    ]);
    return {
      date: row.date_start || "",
      spend,
      conversions,
      cpa: conversions > 0 ? spend / conversions : 0,
      reach: n(row.reach),
      impressions: n(row.impressions),
      interacoes,
    };
  });
}

/** Bloco de métricas comum a todas as quebras de público. */
export type QuebraMetricas = {
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  cpa: number;
  cpm: number;
};

export const QUEBRA_ZERO: QuebraMetricas = {
  investimento: 0, impressoes: 0, alcance: 0, cliques: 0, resultados: 0, cpa: 0, cpm: 0,
};

function acumular(alvo: QuebraMetricas, row: GraphInsightRow, metric: ConversionMetric) {
  alvo.investimento += n(row.spend);
  alvo.impressoes += n(row.impressions);
  alvo.alcance += n(row.reach);
  alvo.cliques += n(row.inline_link_clicks);
  alvo.resultados += countFor(row.actions, metric);
}

function fecharQuebra(m: QuebraMetricas): QuebraMetricas {
  return {
    ...m,
    cpa: m.resultados > 0 ? m.investimento / m.resultados : 0,
    cpm: m.impressoes > 0 ? (m.investimento / m.impressoes) * 1000 : 0,
  };
}

const CAMPOS_QUEBRA = "spend,impressions,reach,inline_link_clicks,actions";

export type AgeGenderRow = { age: string; male: QuebraMetricas; female: QuebraMetricas; total: QuebraMetricas };

export async function getAgeGenderBreakdown(range: DateRange, metric: ConversionMetric): Promise<AgeGenderRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: CAMPOS_QUEBRA,
    breakdowns: "age,gender",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 500,
  });
  const byAge = new Map<string, AgeGenderRow>();
  for (const row of res.data || []) {
    const age = row.age || "—";
    const entry = byAge.get(age) || { age, male: { ...QUEBRA_ZERO }, female: { ...QUEBRA_ZERO }, total: { ...QUEBRA_ZERO } };
    if (row.gender === "male") acumular(entry.male, row, metric);
    else if (row.gender === "female") acumular(entry.female, row, metric);
    acumular(entry.total, row, metric);
    byAge.set(age, entry);
  }
  return Array.from(byAge.values())
    .filter((r) => !/^(unknown|desconhec)/i.test(r.age) && r.age !== "—")
    .map((r) => ({ ...r, male: fecharQuebra(r.male), female: fecharQuebra(r.female), total: fecharQuebra(r.total) }))
    .sort((a, b) => a.age.localeCompare(b.age));
}

/** Segmento demográfico (idade × gênero) usado no painel de Público. */
export type SegmentRow = { label: string } & QuebraMetricas;

export async function getSegmentBreakdown(range: DateRange, metric: ConversionMetric): Promise<SegmentRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: CAMPOS_QUEBRA,
    breakdowns: "age,gender",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 500,
  });
  const GENDER_LABEL: Record<string, string> = { male: "Homens", female: "Mulheres" };
  const rows: SegmentRow[] = [];
  for (const row of res.data || []) {
    const gender = GENDER_LABEL[row.gender || ""];
    if (!gender || !row.age || /^(unknown|desconhec)/i.test(row.age)) continue;
    const m = { ...QUEBRA_ZERO };
    acumular(m, row, metric);
    rows.push({ label: `${gender} ${row.age}`, ...fecharQuebra(m) });
  }
  return rows.sort((a, b) => b.investimento - a.investimento);
}

export type DeviceRow = { device: string } & QuebraMetricas;

export async function getDeviceBreakdown(range: DateRange, metric: ConversionMetric): Promise<DeviceRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: CAMPOS_QUEBRA,
    breakdowns: "impression_device",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 500,
  });
  const labelFor = (raw: string) => {
    const d = raw.toLowerCase();
    if (d.includes("android")) return "Android";
    if (d.includes("iphone") || d.includes("ipad") || d.includes("ios")) return "iOS";
    if (d.includes("desktop")) return "Desktop";
    return "Outros";
  };
  const grouped = new Map<string, QuebraMetricas>();
  for (const row of res.data || []) {
    const label = labelFor(row.impression_device || "");
    const m = grouped.get(label) || { ...QUEBRA_ZERO };
    acumular(m, row, metric);
    grouped.set(label, m);
  }
  return Array.from(grouped.entries())
    .map(([device, m]) => ({ device, ...fecharQuebra(m) }))
    .sort((a, b) => b.impressoes - a.impressoes);
}

export type HourRow = { hour: string } & QuebraMetricas;

export async function getHourlyBreakdown(range: DateRange, metric: ConversionMetric): Promise<HourRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: CAMPOS_QUEBRA,
    breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 500,
  });
  const grouped = new Map<number, QuebraMetricas>();
  for (const row of res.data || []) {
    const raw = row.hourly_stats_aggregated_by_advertiser_time_zone || "";
    const hour = Number(raw.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    const m = grouped.get(hour) || { ...QUEBRA_ZERO };
    acumular(m, row, metric);
    grouped.set(hour, m);
  }
  return Array.from({ length: 24 }, (_, h) => h)
    .filter((h) => grouped.has(h))
    .map((h) => ({ hour: `${h}h`, ...fecharQuebra(grouped.get(h) as QuebraMetricas) }));
}

export type PlatformRow = { platform: string; spend: number; impressions: number; reach: number; conversions: number };

export async function getPlatformBreakdown(range: DateRange, metric: ConversionMetric): Promise<PlatformRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "spend,impressions,reach,actions",
    breakdowns: "publisher_platform",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 500,
  });
  const LABEL: Record<string, string> = {
    facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads",
  };
  return (res.data || [])
    .map((row) => ({
      platform: LABEL[row.publisher_platform || ""] || row.publisher_platform || "Outros",
      spend: n(row.spend),
      impressions: n(row.impressions),
      reach: n(row.reach),
      conversions: countFor(row.actions, metric),
    }))
    .sort((a, b) => b.spend - a.spend);
}

export type VideoRetention = { label: string; value: number };

/**
 * Retenção de vídeo em % das reproduções iniciadas.
 * Base = video_play_actions (reproduções); cai para video_view e, por fim, p25.
 */
export async function getVideoRetention(range: DateRange): Promise<VideoRetention[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields:
      "video_play_actions,video_p25_watched_actions,video_p50_watched_actions," +
      "video_p75_watched_actions,video_p100_watched_actions,actions",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
  });
  const row = res.data?.[0];
  if (!row) return [];
  const p25 = sumAll(row.video_p25_watched_actions);
  const p50 = sumAll(row.video_p50_watched_actions);
  const p75 = sumAll(row.video_p75_watched_actions);
  const p100 = sumAll(row.video_p100_watched_actions);
  const plays = sumAll(row.video_play_actions) || sumActionsExact(row.actions, [...ACTION.videoViews]) || p25;
  if (!plays) return [];
  const rel = (v: number) => Math.round(Math.min(100, (v / plays) * 100) * 10) / 10;
  return [
    { label: "0s", value: 100 },
    { label: "25%", value: rel(p25) },
    { label: "50%", value: rel(p50) },
    { label: "75%", value: rel(p75) },
    { label: "100%", value: rel(p100) },
  ];
}
