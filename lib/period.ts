export type DateRange = { since: string; until: string };

export const PERIOD_PRESETS = [
  { id: "7d", label: "7 dias", days: 7 },
  { id: "14d", label: "14 dias", days: 14 },
  { id: "30d", label: "30 dias", days: 30 },
  { id: "tudo", label: "Tudo", days: null as number | null },
] as const;

export type PeriodPresetId = (typeof PERIOD_PRESETS)[number]["id"];

const CAMPAIGN_START = "2026-06-01";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve a data range a partir de query params (?since&until ou ?period). */
export function resolveRange(searchParams: Record<string, string | string[] | undefined>): DateRange {
  const since = typeof searchParams.since === "string" ? searchParams.since : undefined;
  const until = typeof searchParams.until === "string" ? searchParams.until : undefined;
  if (since && until && isValidISO(since) && isValidISO(until)) {
    return { since, until };
  }

  const period = (typeof searchParams.period === "string" ? searchParams.period : "7d") as PeriodPresetId;
  return rangeFromPreset(period);
}

export function rangeFromPreset(period: PeriodPresetId): DateRange {
  const preset = PERIOD_PRESETS.find((p) => p.id === period) ?? PERIOD_PRESETS[0];
  const today = new Date();
  const until = toISODate(today);
  if (preset.days === null) {
    return { since: CAMPAIGN_START, until };
  }
  const since = new Date(today);
  since.setDate(since.getDate() - (preset.days - 1));
  return { since: toISODate(since), until };
}

function isValidISO(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Range imediatamente anterior, com a mesma duração — usado para calcular deltas. */
export function previousRange({ since, until }: DateRange): DateRange {
  const s = new Date(since + "T00:00:00Z");
  const u = new Date(until + "T00:00:00Z");
  const days = Math.max(1, Math.round((u.getTime() - s.getTime()) / 86400000) + 1);
  const prevUntil = new Date(s);
  prevUntil.setUTCDate(prevUntil.getUTCDate() - 1);
  const prevSince = new Date(prevUntil);
  prevSince.setUTCDate(prevSince.getUTCDate() - (days - 1));
  return { since: toISODate(prevSince), until: toISODate(prevUntil) };
}

export function rangeToSearchParams(range: DateRange): string {
  const p = new URLSearchParams();
  p.set("since", range.since);
  p.set("until", range.until);
  return p.toString();
}

export function daysBetween(range: DateRange): string[] {
  const out: string[] = [];
  const s = new Date(range.since + "T00:00:00Z");
  const u = new Date(range.until + "T00:00:00Z");
  for (let d = new Date(s); d <= u; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toISODate(d));
  }
  return out;
}
