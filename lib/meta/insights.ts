import "server-only";
import { graphAccount, metaEnv, n, sumActions, type GraphInsightRow, type GraphPaged } from "./graph";
import type { DateRange } from "@/lib/period";

const BASE_FIELDS =
  "spend,impressions,reach,clicks,ctr,cpm,cpc,frequency,actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions";

export type AccountTotals = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpc: number;
  frequency: number;
  leads: number;
  cpa: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  linkClicks: number;
};

function leadsOf(row: GraphInsightRow): number {
  const { conversionActionType } = metaEnv();
  const matched = sumActions(row.actions, [conversionActionType]);
  if (matched > 0) return matched;
  return sumActions(row.actions, ["lead", "complete_registration", "submit_application"]);
}

function toTotals(row: GraphInsightRow | undefined): AccountTotals {
  if (!row) {
    return {
      spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpm: 0, cpc: 0, frequency: 0,
      leads: 0, cpa: 0, likes: 0, comments: 0, shares: 0, saves: 0, linkClicks: 0,
    };
  }
  const spend = n(row.spend);
  const leads = leadsOf(row);
  return {
    spend,
    impressions: n(row.impressions),
    reach: n(row.reach),
    clicks: n(row.clicks),
    ctr: n(row.ctr),
    cpm: n(row.cpm),
    cpc: n(row.cpc),
    frequency: n(row.frequency),
    leads,
    cpa: leads > 0 ? spend / leads : 0,
    likes: sumActions(row.actions, ["like", "post_reaction"]),
    comments: sumActions(row.actions, ["comment"]),
    shares: sumActions(row.actions, ["share"]),
    saves: sumActions(row.actions, ["post_save", "onsite_conversion.post_save"]),
    linkClicks: sumActions(row.actions, ["link_click"]),
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

export type DailyPoint = { date: string; spend: number; leads: number; cpa: number; reach: number; impressions: number; interacoes: number };

export async function getDailySeries(range: DateRange): Promise<DailyPoint[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "spend,impressions,reach,actions",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    time_increment: 1,
    level: "account",
  });
  return (res.data || []).map((row) => {
    const spend = n(row.spend);
    const leads = leadsOf(row);
    const interacoes = sumActions(row.actions, ["like", "post_reaction", "comment", "share", "post_save", "link_click"]);
    return {
      date: row.date_start || "",
      spend,
      leads,
      cpa: leads > 0 ? spend / leads : 0,
      reach: n(row.reach),
      impressions: n(row.impressions),
      interacoes,
    };
  });
}

export type AgeGenderRow = { age: string; male: number; female: number; leads: number; spend: number };

export async function getAgeGenderBreakdown(range: DateRange): Promise<AgeGenderRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "impressions,spend,actions",
    breakdowns: "age,gender",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 200,
  });
  const byAge = new Map<string, AgeGenderRow>();
  for (const row of res.data || []) {
    const age = row.age || "—";
    const entry = byAge.get(age) || { age, male: 0, female: 0, leads: 0, spend: 0 };
    if (row.gender === "male") entry.male += n(row.impressions);
    else if (row.gender === "female") entry.female += n(row.impressions);
    entry.leads += leadsOf(row);
    entry.spend += n(row.spend);
    byAge.set(age, entry);
  }
  return Array.from(byAge.values())
    .filter((r) => r.age !== "unknown")
    .sort((a, b) => a.age.localeCompare(b.age));
}

export type DeviceRow = { device: string; value: number };

export async function getDeviceBreakdown(range: DateRange): Promise<DeviceRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "impressions",
    breakdowns: "impression_device",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 200,
  });
  const grouped = new Map<string, number>();
  const labelFor = (raw: string) => {
    const d = raw.toLowerCase();
    if (d.includes("android")) return "Android";
    if (d.includes("iphone") || d.includes("ipad") || d.includes("ios")) return "iOS";
    if (d.includes("desktop")) return "Desktop";
    return "Outros";
  };
  for (const row of res.data || []) {
    const label = labelFor(row.impression_device || "");
    grouped.set(label, (grouped.get(label) || 0) + n(row.impressions));
  }
  const total = Array.from(grouped.values()).reduce((a, b) => a + b, 0) || 1;
  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([device, v]) => ({ device, value: Math.round((v / total) * 1000) / 10 }));
}

export type HourRow = { hour: string; value: number };

export async function getHourlyBreakdown(range: DateRange): Promise<HourRow[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "impressions",
    breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
    limit: 200,
  });
  const grouped = new Map<number, number>();
  for (const row of res.data || []) {
    const raw = row.hourly_stats_aggregated_by_advertiser_time_zone || "";
    const hour = Number(raw.slice(0, 2));
    if (!Number.isFinite(hour)) continue;
    grouped.set(hour, (grouped.get(hour) || 0) + n(row.impressions));
  }
  return Array.from({ length: 24 }, (_, h) => h)
    .filter((h) => grouped.has(h))
    .map((h) => ({ hour: `${h}h`, value: grouped.get(h) || 0 }));
}

export type VideoRetention = { label: string; value: number };

export async function getVideoRetention(range: DateRange): Promise<VideoRetention[]> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions,impressions",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
  });
  const row = res.data?.[0];
  if (!row) return [];
  const p25 = sumActions(row.video_p25_watched_actions, [""]);
  const p50 = sumActions(row.video_p50_watched_actions, [""]);
  const p75 = sumActions(row.video_p75_watched_actions, [""]);
  const p100 = sumActions(row.video_p100_watched_actions, [""]);
  const base = p25 || 1;
  return [
    { label: "0s", value: 100 },
    { label: "25%", value: Math.round((p25 / base) * 1000) / 10 },
    { label: "50%", value: Math.round((p50 / base) * 1000) / 10 },
    { label: "75%", value: Math.round((p75 / base) * 1000) / 10 },
    { label: "100%", value: Math.round((p100 / base) * 1000) / 10 },
  ];
}
