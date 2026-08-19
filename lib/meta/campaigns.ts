import "server-only";
import { graphAccount, graphAccountAll, metaEnv, n, sumActionsExact, type GraphInsightRow, type GraphPaged } from "./graph";
import { countFor, type ConversionMetric } from "./conversion";
import { adLabel, campaignLabel, parseCampaign } from "./taxonomy";
import type { DateRange } from "@/lib/period";

/**
 * Tradução dos objetivos da Meta. O mapa cobre os objetivos atuais (Outcome-Driven
 * Ad Experiences) e os legados; qualquer objetivo novo cai no `prettify`, então
 * campanhas com objetivos ainda não vistos aparecem legíveis em vez de quebrar.
 */
const OBJECTIVE_LABEL: Record<string, string> = {
  OUTCOME_AWARENESS: "Reconhecimento",
  OUTCOME_ENGAGEMENT: "Engajamento",
  OUTCOME_TRAFFIC: "Tráfego",
  OUTCOME_LEADS: "Cadastros",
  OUTCOME_SALES: "Vendas",
  OUTCOME_APP_PROMOTION: "Promoção de app",
  BRAND_AWARENESS: "Reconhecimento",
  REACH: "Alcance",
  LINK_CLICKS: "Tráfego",
  POST_ENGAGEMENT: "Engajamento",
  PAGE_LIKES: "Curtidas na página",
  VIDEO_VIEWS: "Visualizações de vídeo",
  LEAD_GENERATION: "Geração de cadastros",
  MESSAGES: "Mensagens",
  CONVERSIONS: "Conversões",
  APP_INSTALLS: "Instalações de app",
};

function prettify(raw: string): string {
  const cleaned = raw.replace(/^OUTCOME_/, "").replace(/_/g, " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function objectiveLabel(raw: string | undefined): string {
  if (!raw) return "—";
  return OBJECTIVE_LABEL[raw] || prettify(raw);
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "ATIVA",
  PAUSED: "PAUSADA",
  DELETED: "EXCLUÍDA",
  ARCHIVED: "ARQUIVADA",
  CAMPAIGN_PAUSED: "PAUSADA",
  ADSET_PAUSED: "PAUSADA",
  IN_PROCESS: "EM ANÁLISE",
  PENDING_REVIEW: "EM ANÁLISE",
  DISAPPROVED: "REPROVADA",
  WITH_ISSUES: "COM PROBLEMA",
};

export function statusLabel(raw: string | undefined): string {
  if (!raw) return "—";
  return STATUS_LABEL[raw] || prettify(raw).toUpperCase();
}

/** "campanha" é feminino, "anúncio" é masculino — o rótulo precisa concordar. */
const STATUS_LABEL_AD: Record<string, string> = {
  ACTIVE: "ATIVO",
  PAUSED: "PAUSADO",
  DELETED: "EXCLUÍDO",
  ARCHIVED: "ARQUIVADO",
  CAMPAIGN_PAUSED: "CAMPANHA PAUSADA",
  ADSET_PAUSED: "CONJUNTO PAUSADO",
  IN_PROCESS: "EM ANÁLISE",
  PENDING_REVIEW: "EM ANÁLISE",
  DISAPPROVED: "REPROVADO",
  WITH_ISSUES: "COM PROBLEMA",
  PENDING_BILLING_INFO: "AGUARDANDO PAGAMENTO",
  ADSET_PAUSED_BY_AD_LIMIT: "CONJUNTO PAUSADO",
};

export function statusLabelAd(raw: string | undefined): string {
  if (!raw) return "—";
  return STATUS_LABEL_AD[raw] || prettify(raw).toUpperCase();
}

export type CampaignRow = {
  id: string;
  name: string;
  /** Nome sem o prefixo fixo da taxonomia, para caber nas listas. */
  label: string;
  objective: string;
  objectiveRaw: string;
  /** Meta de desempenho lida da taxonomia, quando o nome segue o padrão. */
  metaDesempenho?: string;
  status: string;
  spend: number;
  impressions: number;
  reach: number;
  conversions: number;
  cpa: number;
};

export async function getCampaigns(range: DateRange, metric: ConversionMetric): Promise<CampaignRow[]> {
  const { accountId } = metaEnv();

  const [campaigns, insights] = await Promise.all([
    graphAccountAll<{ id: string; name: string; objective: string; effective_status: string }>(
      `${accountId}/campaigns`,
      { fields: "id,name,objective,effective_status" },
    ),
    graphAccountAll<GraphInsightRow>(`${accountId}/insights`, {
      fields: "spend,impressions,reach,actions,campaign_id,campaign_name",
      level: "campaign",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
    }),
  ]);

  const insightsByCampaign = new Map<string, GraphInsightRow>();
  for (const row of insights) {
    if (row.campaign_id) insightsByCampaign.set(row.campaign_id, row);
  }

  return campaigns
    .map((c) => {
      const row = insightsByCampaign.get(c.id);
      const spend = n(row?.spend);
      const conversions = row ? countFor(row.actions, metric) : 0;
      const taxonomy = parseCampaign(c.name);
      return {
        id: c.id,
        name: c.name,
        label: campaignLabel(c.name),
        objective: objectiveLabel(c.objective),
        objectiveRaw: c.objective,
        metaDesempenho: taxonomy.metaDesempenho,
        status: statusLabel(c.effective_status),
        spend,
        impressions: n(row?.impressions),
        reach: n(row?.reach),
        conversions,
        cpa: conversions > 0 ? spend / conversions : 0,
      };
    })
    .sort((a, b) => b.spend - a.spend);
}

export type AdCreativeRow = {
  id: string;
  name: string;
  label: string;
  spend: number;
  conversions: number;
  cpa: number;
  impressions: number;
  clicks: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  /** Soma das interações com a publicação (reações + comentários + compart. + salvos). */
  interacoes: number;
  /** Campanha a que o anúncio pertence, para o filtro da página. */
  campaignId: string;
  campaignName: string;
  /** Interações totais ÷ impressões, em %. Comparável entre peças. */
  engRate: number;
  /** Status traduzido (ATIVO, PAUSADO, EM ANÁLISE...). */
  status: string;
  thumbnailUrl?: string;
  /** Link público do post (Instagram, ou Facebook a partir do story id). */
  permalink?: string;
  platform: string;
  /** 0–100, relativo ao melhor anúncio da janela. */
  score: number;
};

type RawCreative = {
  id?: string;
  thumbnail_url?: string;
  image_url?: string;
  instagram_permalink_url?: string;
  effective_object_story_id?: string;
  object_story_spec?: {
    link_data?: { picture?: string };
    video_data?: { image_url?: string };
    photo_data?: { url?: string };
  };
};

/**
 * Imagem do criativo na maior resolução disponível.
 *
 * ATENÇÃO: `thumbnail_url` é SEMPRE 64x64 (≈1 KB) — usá-lo numa grade de cards
 * deixa tudo pixelado. `image_url` devolve o criativo inteiro (1080x1440 nesta
 * conta), então ele vem primeiro e o thumbnail fica só como último recurso.
 */
function creativeImage(c: RawCreative | undefined): string | undefined {
  if (!c) return undefined;
  const spec = c.object_story_spec;
  return (
    c.image_url ||
    spec?.video_data?.image_url ||
    spec?.photo_data?.url ||
    spec?.link_data?.picture ||
    c.thumbnail_url
  );
}

/** Link público do anúncio: Instagram quando existe, senão o post no Facebook. */
function creativePermalink(c: RawCreative | undefined): string | undefined {
  if (!c) return undefined;
  if (c.instagram_permalink_url) return c.instagram_permalink_url;
  const story = c.effective_object_story_id;
  if (story && story.includes("_")) {
    const [pageId, postId] = story.split("_");
    if (pageId && postId) return `https://www.facebook.com/${pageId}/posts/${postId}`;
  }
  return undefined;
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
};

export async function getAdsWithCreatives(range: DateRange, metric: ConversionMetric, limit = Infinity): Promise<AdCreativeRow[]> {
  const { accountId } = metaEnv();

  const [ads, insights] = await Promise.all([
    graphAccountAll<{ id: string; name: string; effective_status?: string; creative?: RawCreative }>(`${accountId}/ads`, {
      fields:
        "id,name,effective_status,creative{id,thumbnail_url,image_url,instagram_permalink_url," +
        "effective_object_story_id,object_story_spec}",
    }),
    graphAccountAll<GraphInsightRow>(`${accountId}/insights`, {
      fields: "spend,impressions,inline_link_clicks,actions,ad_id,ad_name,campaign_id,campaign_name",
      level: "ad",
      breakdowns: "publisher_platform",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
    }),
  ]);

  // Um anúncio entrega em várias plataformas: soma tudo e guarda a plataforma
  // com maior investimento como a dominante (em vez de pegar a primeira linha).
  const byAd = new Map<
    string,
    {
      spend: number; conversions: number; impressions: number; clicks: number;
      reactions: number; comments: number; shares: number; saves: number;
      campaignId: string; campaignName: string;
      byPlatform: Map<string, number>;
    }
  >();
  for (const row of insights) {
    const id = row.ad_id;
    if (!id) continue;
    const entry =
      byAd.get(id) ||
      {
        spend: 0, conversions: 0, impressions: 0, clicks: 0,
        reactions: 0, comments: 0, shares: 0, saves: 0,
        campaignId: "", campaignName: "",
        byPlatform: new Map<string, number>(),
      };
    if (row.campaign_id) entry.campaignId = row.campaign_id;
    if (row.campaign_name) entry.campaignName = row.campaign_name;
    const spend = n(row.spend);
    entry.spend += spend;
    entry.impressions += n(row.impressions);
    entry.clicks += n(row.inline_link_clicks);
    entry.reactions += sumActionsExact(row.actions, ["post_reaction"]);
    entry.comments += sumActionsExact(row.actions, ["comment"]);
    entry.shares += sumActionsExact(row.actions, ["post"]);
    entry.saves += sumActionsExact(row.actions, ["onsite_conversion.post_save"]);
    entry.conversions += countFor(row.actions, metric);
    const plat = row.publisher_platform || "";
    if (plat) entry.byPlatform.set(plat, (entry.byPlatform.get(plat) || 0) + spend);
    byAd.set(id, entry);
  }

  const rows: AdCreativeRow[] = ads.flatMap((ad) => {
    const stats = byAd.get(ad.id);
    if (!stats || stats.spend <= 0) return [];
    const dominant = Array.from(stats.byPlatform.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    return [{
      id: ad.id,
      name: ad.name,
      label: adLabel(ad.name),
      spend: stats.spend,
      conversions: stats.conversions,
      cpa: stats.conversions > 0 ? stats.spend / stats.conversions : 0,
      impressions: stats.impressions,
      clicks: stats.clicks,
      reactions: stats.reactions,
      comments: stats.comments,
      shares: stats.shares,
      saves: stats.saves,
      interacoes: stats.reactions + stats.comments + stats.shares + stats.saves,
      campaignId: stats.campaignId,
      campaignName: campaignLabel(stats.campaignName),
      engRate:
        stats.impressions > 0
          ? ((stats.reactions + stats.comments + stats.shares + stats.saves) / stats.impressions) * 100
          : 0,
      status: statusLabelAd(ad.effective_status),
      thumbnailUrl: creativeImage(ad.creative),
      permalink: creativePermalink(ad.creative),
      platform: PLATFORM_LABEL[dominant] || "Meta",
      score: 0,
    }];
  });

  // Score relativo: 100 para o melhor CPA da janela. Sem nenhuma conversão
  // atribuída, usa impressões por real investido como proxy de entrega.
  const withCpa = rows.filter((r) => r.cpa > 0);
  if (withCpa.length) {
    const best = Math.min(...withCpa.map((r) => r.cpa));
    for (const r of rows) r.score = r.cpa > 0 ? Math.max(1, Math.round((best / r.cpa) * 100)) : 0;
  } else {
    const eff = rows.map((r) => (r.spend > 0 ? r.impressions / r.spend : 0));
    const best = Math.max(...eff, 1);
    rows.forEach((r, i) => (r.score = Math.max(1, Math.round((eff[i] / best) * 100))));
  }

  const ordenado = rows.sort((a, b) => b.spend - a.spend);
  return Number.isFinite(limit) ? ordenado.slice(0, limit) : ordenado;
}

/** Um dia de veiculação de um anúncio. */
export type AdDia = {
  /** ISO (YYYY-MM-DD). */
  dia: string;
  investimento: number;
  impressoes: number;
  cliques: number;
  reacoes: number;
  comentarios: number;
  compartilhamentos: number;
  salvos: number;
  interacoes: number;
};

/**
 * Série diária por anúncio — a base do gráfico do comparativo de criativos.
 *
 * `time_increment: 1` devolve uma linha por anúncio POR DIA; sem breakdown de
 * plataforma, porque aqui a curva é do anúncio inteiro. Só os dias com entrega
 * voltam da Meta: quem começou depois simplesmente não tem linha antes disso, e
 * é o gráfico que decide como representar essa ausência.
 */
export async function getAdsDailySeries(range: DateRange): Promise<Map<string, AdDia[]>> {
  const { accountId } = metaEnv();
  const linhas = await graphAccountAll<GraphInsightRow & { date_start?: string }>(`${accountId}/insights`, {
    fields: "spend,impressions,inline_link_clicks,actions,ad_id",
    level: "ad",
    time_increment: "1",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    limit: "500",
  });

  const porAnuncio = new Map<string, AdDia[]>();
  for (const row of linhas) {
    const id = row.ad_id;
    const dia = row.date_start;
    if (!id || !dia) continue;
    const reacoes = sumActionsExact(row.actions, ["post_reaction"]);
    const comentarios = sumActionsExact(row.actions, ["comment"]);
    const compartilhamentos = sumActionsExact(row.actions, ["post"]);
    const salvos = sumActionsExact(row.actions, ["onsite_conversion.post_save"]);
    const lista = porAnuncio.get(id) || [];
    lista.push({
      dia,
      investimento: n(row.spend),
      impressoes: n(row.impressions),
      cliques: n(row.inline_link_clicks),
      reacoes,
      comentarios,
      compartilhamentos,
      salvos,
      interacoes: reacoes + comentarios + compartilhamentos + salvos,
    });
    porAnuncio.set(id, lista);
  }
  for (const lista of porAnuncio.values()) lista.sort((a, b) => a.dia.localeCompare(b.dia));
  return porAnuncio;
}
