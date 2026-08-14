import "server-only";
import { graphAccount, metaEnv, n, sumActions, type GraphInsightRow, type GraphPaged } from "./graph";
import type { DateRange } from "@/lib/period";

export type CampaignRow = {
  id: string;
  name: string;
  objective: string;
  status: string;
  spend: number;
  leads: number;
  cpa: number;
};

function leadsOf(row: GraphInsightRow, conversionActionType: string): number {
  const matched = sumActions(row.actions, [conversionActionType]);
  if (matched > 0) return matched;
  return sumActions(row.actions, ["lead", "complete_registration", "submit_application"]);
}

export async function getCampaigns(range: DateRange): Promise<CampaignRow[]> {
  const { accountId, conversionActionType } = metaEnv();

  const campaigns = await graphAccount<GraphPaged<{ id: string; name: string; objective: string; effective_status: string }>>(
    `${accountId}/campaigns`,
    { fields: "id,name,objective,effective_status", limit: 200 },
  );

  const insights = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "spend,actions,campaign_id,campaign_name",
    level: "campaign",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    limit: 200,
  });

  const insightsByCampaign = new Map<string, GraphInsightRow>();
  for (const row of insights.data || []) {
    if (row.campaign_id) insightsByCampaign.set(row.campaign_id, row);
  }

  return (campaigns.data || []).map((c) => {
    const row = insightsByCampaign.get(c.id);
    const spend = n(row?.spend);
    const leads = row ? leadsOf(row, conversionActionType) : 0;
    return {
      id: c.id,
      name: c.name,
      objective: c.objective,
      status: c.effective_status,
      spend,
      leads,
      cpa: leads > 0 ? spend / leads : 0,
    };
  }).sort((a, b) => b.spend - a.spend);
}

export type AdCreativeRow = {
  id: string;
  name: string;
  spend: number;
  leads: number;
  cpa: number;
  thumbnailUrl?: string;
  platform: string;
  score: number;
};

export async function getAdsWithCreatives(range: DateRange, limit = 20): Promise<AdCreativeRow[]> {
  const { accountId, conversionActionType } = metaEnv();

  const ads = await graphAccount<GraphPaged<{ id: string; name: string; creative?: { id: string; thumbnail_url?: string; object_story_spec?: unknown } }>>(
    `${accountId}/ads`,
    { fields: "id,name,creative{id,thumbnail_url}", limit: 200, effective_status: JSON.stringify(["ACTIVE", "PAUSED"]) },
  );

  const insights = await graphAccount<GraphPaged<GraphInsightRow & { ad_id?: string; publisher_platform?: string }>>(
    `${accountId}/insights`,
    {
      fields: "spend,actions,ad_id,ad_name",
      level: "ad",
      breakdowns: "publisher_platform",
      time_range: JSON.stringify({ since: range.since, until: range.until }),
      limit: 200,
    },
  );

  const byAd = new Map<string, { spend: number; leads: number; platform: string }>();
  for (const row of insights.data || []) {
    const id = (row as { ad_id?: string }).ad_id;
    if (!id) continue;
    const entry = byAd.get(id) || { spend: 0, leads: 0, platform: (row as { publisher_platform?: string }).publisher_platform || "" };
    entry.spend += n(row.spend);
    entry.leads += leadsOf(row, conversionActionType);
    byAd.set(id, entry);
  }

  const rows: AdCreativeRow[] = (ads.data || []).map((ad) => {
    const stats = byAd.get(ad.id) || { spend: 0, leads: 0, platform: "" };
    const maxScore = 100;
    const score = stats.leads > 0 ? Math.min(maxScore, Math.round((stats.leads / (stats.spend || 1)) * 1000)) : 0;
    return {
      id: ad.id,
      name: ad.name,
      spend: stats.spend,
      leads: stats.leads,
      cpa: stats.leads > 0 ? stats.spend / stats.leads : 0,
      thumbnailUrl: ad.creative?.thumbnail_url,
      platform: stats.platform === "instagram" ? "Instagram" : stats.platform === "facebook" ? "Facebook" : "Meta",
      score,
    };
  });

  return rows.filter((r) => r.spend > 0).sort((a, b) => b.spend - a.spend).slice(0, limit);
}
