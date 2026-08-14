import "server-only";
import { graphLibrary, metaEnv, type GraphPaged } from "./graph";

export type LibraryAd = {
  id: string;
  pageName: string;
  body: string;
  linkTitle: string;
  status: "ATIVO" | "PAUSADO";
  startDate: string;
  platforms: string;
  snapshotUrl: string;
  spendLabel: string;
  impressionsLabel: string;
};

type RawRange = { lower_bound?: string; upper_bound?: string };
type RawAd = {
  id: string;
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
};

function rangeLabel(r: RawRange | undefined, prefix: string): string {
  if (!r || (!r.lower_bound && !r.upper_bound)) return "—";
  const lo = Number(r.lower_bound || 0).toLocaleString("pt-BR");
  const hi = r.upper_bound ? Number(r.upper_bound).toLocaleString("pt-BR") : "+";
  return `${prefix}${lo}–${hi}`;
}

export async function searchAdLibrary(limit = 100): Promise<LibraryAd[]> {
  const { libraryPages, libraryCountry } = metaEnv();
  const pageId = libraryPages.split(":")[0]?.trim();
  if (!pageId) return [];

  const res = await graphLibrary<GraphPaged<RawAd>>("ads_archive", {
    ad_type: "POLITICAL_AND_ISSUE_ADS",
    ad_reached_countries: JSON.stringify([libraryCountry]),
    search_page_ids: JSON.stringify([pageId]),
    ad_active_status: "ALL",
    fields:
      "id,ad_snapshot_url,page_name,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_titles,ad_creative_link_descriptions,spend,impressions,estimated_audience_size,publisher_platforms,ad_delivery_start_time,ad_delivery_stop_time,demographic_distribution,delivery_by_region",
    limit,
  }, 900);

  return (res.data || []).map((ad) => ({
    id: ad.id,
    pageName: ad.page_name || "",
    body: (ad.ad_creative_bodies || [])[0] || "",
    linkTitle: (ad.ad_creative_link_titles || [])[0] || "",
    status: ad.ad_delivery_stop_time ? "PAUSADO" : "ATIVO",
    startDate: ad.ad_delivery_start_time ? ad.ad_delivery_start_time.slice(0, 10).split("-").reverse().join("/") : "—",
    platforms: (ad.publisher_platforms || []).map((p) => PLATFORM_LABEL[p] || p).join(" · "),
    snapshotUrl: ad.ad_snapshot_url || "",
    spendLabel: rangeLabel(ad.spend, "R$ "),
    impressionsLabel: rangeLabel(ad.impressions, ""),
  }));
}
