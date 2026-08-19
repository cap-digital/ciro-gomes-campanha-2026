export type DateRange = { since: string; until: string };

/**
 * `dias` é o tamanho da janela e `atras` desloca o fim dela para trás. "Ontem"
 * precisa dos dois: uma janela de um dia que termina um dia antes de hoje.
 */
export const PERIOD_PRESETS = [
  { id: "hoje", label: "Hoje", days: 1, atras: 0 },
  { id: "ontem", label: "Ontem", days: 1, atras: 1 },
  { id: "7d", label: "7 dias", days: 7, atras: 0 },
  { id: "14d", label: "14 dias", days: 14, atras: 0 },
  { id: "30d", label: "30 dias", days: 30, atras: 0 },
  { id: "tudo", label: "Tudo", days: null as number | null, atras: 0 },
] as const;

export type PeriodPresetId = (typeof PERIOD_PRESETS)[number]["id"];

/** Criação da conta de anúncios — limite inferior real para o preset "Tudo". */
export const CAMPAIGN_START = "2026-08-10";

/**
 * Fuso da conta de anúncios. A Meta interpreta `time_range` no fuso da conta,
 * então calcular as datas em UTC fazia a janela pular um dia entre 21h e 24h
 * no horário local.
 */
const TZ_CONTA = process.env.META_ACCOUNT_TIMEZONE || "America/Fortaleza";

function toISODate(d: Date): string {
  // en-CA formata como YYYY-MM-DD, que é exatamente o formato aceito pela Meta.
  return d.toLocaleDateString("en-CA", { timeZone: TZ_CONTA });
}

/** "Hoje" no fuso da conta. */
function hojeNaConta(): Date {
  return new Date(`${toISODate(new Date())}T12:00:00Z`);
}

/** Data de hoje (YYYY-MM-DD) no fuso da conta de anúncios. */
export function hojeISO(): string {
  return toISODate(new Date());
}

/** Janela da campanha inteira: do início da conta até hoje, INCLUSIVE. */
export function rangeAcumulado(): DateRange {
  return { since: CAMPAIGN_START, until: hojeISO() };
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
  const preset = PERIOD_PRESETS.find((p) => p.id === period) ?? PERIOD_PRESETS.find((p) => p.id === "7d")!;
  const today = hojeNaConta();
  if (preset.days === null) {
    return { since: CAMPAIGN_START, until: toISODate(today) };
  }
  const fim = new Date(today);
  fim.setDate(fim.getDate() - preset.atras);
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - (preset.days - 1));
  return { since: toISODate(inicio), until: toISODate(fim) };
}

function isValidISO(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Data ISO lida como MEIO-DIA em UTC, não meia-noite.
 *
 * `toISODate` formata no fuso da conta (UTC−3). Uma data criada à meia-noite em
 * UTC vira 21h do dia ANTERIOR ali, e toda a conta saía um dia atrás: o período
 * de comparação de 13→19/08 virava 05→11/08 em vez de 06→12/08. Ao meio-dia
 * sobra folga de 12 horas para qualquer fuso, e o dia do calendário se mantém.
 */
function doISO(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

/** Range imediatamente anterior, com a mesma duração — usado para calcular deltas. */
export function previousRange({ since, until }: DateRange): DateRange {
  const s = doISO(since);
  const u = doISO(until);
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
  const s = doISO(range.since);
  const u = doISO(range.until);
  for (let d = new Date(s); d <= u; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toISODate(d));
  }
  return out;
}
