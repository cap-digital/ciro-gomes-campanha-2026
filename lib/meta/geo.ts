import "server-only";
import { graphAccount, metaEnv, n, sumActions, type GraphInsightRow, type GraphPaged } from "./graph";
import type { DateRange } from "@/lib/period";

export type GeoRow = { name: string; spend: number; leads: number; cpa: number };

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
 * Aproxima investimento/cadastros por geografia a partir da segmentação (targeting) dos
 * conjuntos de anúncios — a Graph API não expõe local de entrega por município.
 */
export async function getGeoBreakdown(range: DateRange): Promise<{ cities: GeoRow[]; regions: GeoRow[] }> {
  const { accountId, conversionActionType } = metaEnv();

  const adsets = await graphAccount<GraphPaged<AdSet>>(`${accountId}/adsets`, {
    fields: "id,name,targeting{geo_locations}",
    limit: 200,
  });

  const insights = await graphAccount<GraphPaged<GraphInsightRow & { adset_id?: string }>>(`${accountId}/insights`, {
    fields: "spend,actions,adset_id",
    level: "adset",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    limit: 200,
  });

  const statsByAdset = new Map<string, { spend: number; leads: number }>();
  for (const row of insights.data || []) {
    const id = (row as { adset_id?: string }).adset_id;
    if (!id) continue;
    const leads = sumActions(row.actions, [conversionActionType]) || sumActions(row.actions, ["lead"]);
    statsByAdset.set(id, { spend: n(row.spend), leads });
  }

  const cities = new Map<string, GeoRow>();
  const regions = new Map<string, GeoRow>();

  for (const adset of adsets.data || []) {
    const stats = statsByAdset.get(adset.id);
    if (!stats) continue;
    const geo = adset.targeting?.geo_locations;
    const cityNames = geo?.cities?.map((c) => c.name) || [];
    const regionNames = geo?.regions?.map((r) => r.name) || [];

    for (const name of cityNames) {
      const entry = cities.get(name) || { name, spend: 0, leads: 0, cpa: 0 };
      entry.spend += stats.spend / Math.max(1, cityNames.length);
      entry.leads += stats.leads / Math.max(1, cityNames.length);
      cities.set(name, entry);
    }
    for (const name of regionNames) {
      const entry = regions.get(name) || { name, spend: 0, leads: 0, cpa: 0 };
      entry.spend += stats.spend / Math.max(1, regionNames.length);
      entry.leads += stats.leads / Math.max(1, regionNames.length);
      regions.set(name, entry);
    }
  }

  const finalize = (m: Map<string, GeoRow>) =>
    Array.from(m.values())
      .map((r) => ({ ...r, cpa: r.leads > 0 ? r.spend / r.leads : 0 }))
      .sort((a, b) => b.spend - a.spend);

  return { cities: finalize(cities), regions: finalize(regions) };
}
