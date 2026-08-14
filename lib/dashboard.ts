import "server-only";
import { isMockMode } from "@/lib/meta/graph";
import {
  getAccountTotals, getAgeGenderBreakdown, getDailySeries, getDeviceBreakdown, getHourlyBreakdown, getVideoRetention,
  type AccountTotals, type AgeGenderRow, type DeviceRow, type HourRow, type DailyPoint,
} from "@/lib/meta/insights";
import { getCampaigns, getAdsWithCreatives, type CampaignRow } from "@/lib/meta/campaigns";
import { getActivities, type ActivityRow } from "@/lib/meta/activities";
import { getGeoBreakdown } from "@/lib/meta/geo";
import { searchAdLibrary } from "@/lib/meta/adLibrary";
import { brl, num, compact, pct as pctFmt, delta as deltaFmt, dateBr } from "@/lib/format";
import { previousRange, type DateRange } from "@/lib/period";
import * as mock from "@/lib/mock/data";
import type {
  Kpi, CampaignRowView, ResultCard, CreativeCard, AnaliseCard, LabeledBar,
  RankRow, RegiaoRow, FaixaRow, SegmentoRow, BibliotecaCard, DiarioDay, PlatCard, ComparativoRow, Series,
} from "@/lib/types";

export type Source = "live" | "mock";

async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<{ value: T; source: Source }> {
  if (isMockMode()) return { value: fallback, source: "mock" };
  try {
    return { value: await fn(), source: "live" };
  } catch (err) {
    console.error(`[dashboard] falha ao buscar ${label}, usando mock:`, err);
    return { value: fallback, source: "mock" };
  }
}

function totalsToHeroKpis(curr: AccountTotals, prev: AccountTotals): Kpi[] {
  return [
    { value: brl(curr.spend), label: "Investido", delta: deltaFmt(curr.spend, prev.spend), note: curr.spend >= prev.spend ? "acima do período anterior" : "abaixo do período anterior" },
    { value: compact(curr.reach), label: "Pessoas alcançadas", delta: deltaFmt(curr.reach, prev.reach), note: "alcance único" },
    { value: compact(curr.impressions), label: "Impressões", delta: deltaFmt(curr.impressions, prev.impressions), note: "exibições" },
    { value: num(curr.leads), label: "Cadastros", delta: deltaFmt(curr.leads, prev.leads), note: "no período" },
    { value: brl(curr.cpa), label: "Custo por cadastro", delta: deltaFmt(curr.cpa, prev.cpa), note: "média da janela", good: curr.cpa <= prev.cpa },
  ];
}

// ---------- 01 Início ----------
export async function getInicioData(range: DateRange) {
  if (isMockMode()) return { heroKpis: mock.heroKpis, source: "mock" as Source };
  try {
    const prev = previousRange(range);
    const [curr, prevTotals] = await Promise.all([getAccountTotals(range), getAccountTotals(prev)]);
    return { heroKpis: totalsToHeroKpis(curr, prevTotals), source: "live" as Source };
  } catch (err) {
    console.error("[dashboard] inicio:", err);
    return { heroKpis: mock.heroKpis, source: "mock" as Source };
  }
}

// ---------- 02 Campanhas ----------
const KWAI_MOCK_SPEND = 185141.1;
const META_MOCK_SPEND = 302072.34;

export async function getCampanhasData(range: DateRange) {
  const kwai = { campaigns: mock.kwaiCampaigns, spend: KWAI_MOCK_SPEND };
  const metaFallback: { campaigns: CampaignRowView[]; totals: AccountTotals | null } = { campaigns: mock.metaCampaigns, totals: null };

  const metaResult = await safe(async () => {
    const [campaigns, totals] = await Promise.all([getCampaigns(range), getAccountTotals(range)]);
    const rows: CampaignRowView[] = campaigns.map((c) => ({
      name: c.name,
      objective: c.objective,
      spend: brl(c.spend, 0),
      cpa: c.leads > 0 ? brl(c.cpa) : "—",
      status: c.status,
    }));
    return { campaigns: rows, totals };
  }, metaFallback, "campanhas");

  const daily = await safe<DailyPoint[] | null>(() => getDailySeries(range), null, "campanhas-timeline");

  const metaSpend = metaResult.value.totals?.spend ?? META_MOCK_SPEND;
  const totalInvest = kwai.spend + metaSpend;
  const kwaiPct = totalInvest > 0 ? Math.round((kwai.spend / totalInvest) * 100) : 38;

  const resultCards: ResultCard[] = metaResult.value.totals
    ? [
        { label: "Impressões", value: num(metaResult.value.totals.impressions), delta: "" },
        { label: "Alcance único", value: num(metaResult.value.totals.reach), delta: "" },
        { label: "Frequência", value: metaResult.value.totals.frequency.toFixed(2).replace(".", ","), delta: "" },
        { label: "Cliques no link", value: num(metaResult.value.totals.linkClicks), delta: "" },
        { label: "CTR", value: pctFmt(metaResult.value.totals.ctr), delta: "" },
        { label: "CPM", value: brl(metaResult.value.totals.cpm), delta: "", good: true },
      ]
    : mock.resultCards;

  return {
    totalInvest: brl(totalInvest, 0),
    kwaiPct,
    metaPct: 100 - kwaiPct,
    splitCards: [
      { name: "Kwai Ads", pct: kwaiPct + "%", value: brl(kwai.spend, 0), note: `${kwai.campaigns.length} campanhas · dado ilustrativo`, color: "#FF7A00" },
      { name: "Meta Ads", pct: 100 - kwaiPct + "%", value: brl(metaSpend, 0), note: `${metaResult.value.campaigns.length} campanhas`, color: "#2E8FFF" },
    ],
    resultCards,
    kwaiCampaigns: kwai.campaigns,
    metaCampaigns: metaResult.value.campaigns.length ? metaResult.value.campaigns : mock.metaCampaigns,
    daily: daily.value,
    source: metaResult.source,
  };
}

// ---------- 03 Criativos ----------
export async function getCriativosData(range: DateRange) {
  const metaResult = await safe<CreativeCard[]>(async () => {
    const ads = await getAdsWithCreatives(range, 20);
    return ads.map((a) => ({
      name: a.name,
      platform: a.platform,
      spend: brl(a.spend, 0),
      cpa: a.leads > 0 ? brl(a.cpa) : "—",
      score: a.score,
      thumbnailUrl: a.thumbnailUrl,
    }));
  }, [], "criativos");

  const kwaiMock = mock.criativos.filter((c) => c.platform === "Kwai");
  const combined = [...metaResult.value, ...(metaResult.value.length ? kwaiMock : mock.criativos)];
  return { criativos: combined.length ? combined : mock.criativos, source: metaResult.source };
}

// ---------- 04 Análises ----------
export async function getAnalisesData(range: DateRange) {
  const totalsResult = await safe<AccountTotals | null>(() => getAccountTotals(range), null, "analises");
  if (!totalsResult.value) {
    return { headline: mock.analiseHeadline, analises: mock.analises, sinais: mock.sinais, atencao: mock.atencao, source: "mock" as Source };
  }
  const t = totalsResult.value;
  const headline = `No período selecionado, o investimento no Meta foi de ${brl(t.spend, 0)}, gerando ${num(t.leads)} cadastros a um custo médio de ${brl(t.cpa)}. Frequência média de ${t.frequency.toFixed(2).replace(".", ",")} e CTR de ${pctFmt(t.ctr)}.`;
  const analises: AnaliseCard[] = [
    { tag: "EFICIÊNCIA", title: "Custo por cadastro no Meta", text: `O CPA médio do período foi ${brl(t.cpa)}, a partir de ${num(t.leads)} cadastros e ${brl(t.spend, 0)} investidos.`, src: "Meta Ads" },
    { tag: "ALCANCE", title: "Frequência de exibição", text: `A frequência média foi ${t.frequency.toFixed(2).replace(".", ",")}. Acima de 3,5 é sinal de saturação de público.`, src: "Meta Ads" },
    { tag: "CRIATIVO", title: "Engajamento gerado", text: `${num(t.likes)} curtidas, ${num(t.comments)} comentários e ${num(t.shares)} compartilhamentos no período.`, src: "Meta Ads" },
  ];
  const freqScore = Math.max(0, Math.min(100, Math.round(100 - (t.frequency - 1) * 25)));
  const ctrScore = Math.max(0, Math.min(100, Math.round(t.ctr * 25)));
  const sinais: LabeledBar[] = [
    { label: "Saturação de frequência", value: `${100 - freqScore}/100`, pct: 100 - freqScore, color: "#E4222B" },
    { label: "Atratividade do criativo (CTR)", value: `${ctrScore}/100`, pct: ctrScore, color: "#21C46A" },
  ];
  const atencao: string[] = [];
  if (t.frequency > 3) atencao.push(`Frequência média em ${t.frequency.toFixed(2).replace(".", ",")} — acima do limite recomendado de 3,0.`);
  if (t.leads === 0 && t.spend > 0) atencao.push("Nenhum cadastro atribuído no período apesar de investimento ativo — revisar o tipo de conversão monitorado (META_CONVERSION_ACTION_TYPE).");
  return { headline, analises, sinais, atencao: atencao.length ? atencao : mock.atencao, source: "live" as Source };
}

// ---------- 05 Período ----------
export async function getPeriodoData(range: DateRange) {
  const prev = previousRange(range);
  const totalsResult = await safe<{ curr: AccountTotals; prevTotals: AccountTotals } | null>(async () => {
    const [curr, prevTotals] = await Promise.all([getAccountTotals(range), getAccountTotals(prev)]);
    return { curr, prevTotals };
  }, null, "periodo");

  const activitiesResult = await safe<ActivityRow[]>(() => getActivities(range), [], "periodo-activities");
  const alteracoes = activitiesResult.value.length ? activitiesResult.value : mock.alteracoes;

  if (!totalsResult.value) {
    return { periodoKpis: mock.periodoKpis, leitura: mock.leitura, alteracoes, source: "mock" as Source };
  }
  const { curr, prevTotals } = totalsResult.value;
  const periodoKpis: Kpi[] = [
    { label: "Investido no período", value: brl(curr.spend, 0), delta: deltaFmt(curr.spend, prevTotals.spend), note: "vs janela anterior" },
    { label: "Alcance único", value: num(curr.reach), delta: deltaFmt(curr.reach, prevTotals.reach), note: "pessoas distintas" },
    { label: "Cadastros", value: num(curr.leads), delta: deltaFmt(curr.leads, prevTotals.leads), note: "formulários completos" },
    { label: "CPA", value: brl(curr.cpa), delta: deltaFmt(curr.cpa, prevTotals.cpa), note: "custo por cadastro", good: curr.cpa <= prevTotals.cpa },
  ];
  const leitura = [
    `A janela fechou com ${brl(curr.spend, 0)} investidos e ${num(curr.leads)} cadastros no Meta Ads, com custo por cadastro de ${brl(curr.cpa)} (${deltaFmt(curr.cpa, prevTotals.cpa)} vs. período anterior).`,
    `O alcance único foi de ${num(curr.reach)} pessoas com ${num(curr.impressions)} impressões — frequência média de ${curr.frequency.toFixed(2).replace(".", ",")}.`,
    `CTR de ${pctFmt(curr.ctr)} e CPM de ${brl(curr.cpm)} no período analisado.`,
  ];
  return { periodoKpis, leitura, alteracoes, source: "live" as Source };
}

// ---------- 06 Desempenho ----------
export async function getDesempenhoData(range: DateRange) {
  const totalsResult = await safe<AccountTotals | null>(() => getAccountTotals(range), null, "desempenho");
  const dailyResult = await safe<DailyPoint[] | null>(() => getDailySeries(range), null, "desempenho-daily");
  const retentionResult = await safe<{ label: string; value: number }[]>(
    () => getVideoRetention(range),
    mock.retencao.map((r) => ({ label: r.label, value: r.pct })),
    "desempenho-retencao",
  );

  if (!totalsResult.value || !dailyResult.value || !dailyResult.value.length) {
    return {
      bigNumbers: mock.bigNumbers,
      series: mock.series,
      dayLabels: mock.dayLabels,
      interacoes: mock.interacoes,
      interCriativo: mock.interCriativo,
      retencao: mock.retencao,
      source: "mock" as Source,
    };
  }
  const t = totalsResult.value;
  const bigNumbers: Kpi[] = [
    { label: "Investido", value: brl(t.spend, 0), delta: "", note: "" },
    { label: "Impressões", value: compact(t.impressions), delta: "", note: "" },
    { label: "Alcance", value: compact(t.reach), delta: "", note: "" },
    { label: "Cadastros", value: num(t.leads), delta: "", note: "" },
    { label: "CPA", value: brl(t.cpa), delta: "", note: "", good: true },
    { label: "CTR", value: pctFmt(t.ctr), delta: "", note: "" },
    { label: "Cliques no link", value: num(t.linkClicks), delta: "", note: "" },
  ];
  const daily = dailyResult.value;
  const series: Series = {
    investimento: daily.map((d) => d.spend),
    cadastros: daily.map((d) => d.leads),
    alcance: daily.map((d) => d.reach),
    cpa: daily.map((d) => d.cpa),
    interacoes: daily.map((d) => d.interacoes),
  };
  const dayLabels = daily.map((d) => dateBr(d.date));
  const totalInter = t.likes + t.comments + t.shares + t.saves + t.linkClicks || 1;
  const interacoes: LabeledBar[] = [
    { label: "Curtidas", value: num(t.likes), pct: (t.likes / totalInter) * 100, color: "#35D0FF" },
    { label: "Comentários", value: num(t.comments), pct: (t.comments / totalInter) * 100, color: "#2E8FFF" },
    { label: "Compartilhamentos", value: num(t.shares), pct: (t.shares / totalInter) * 100, color: "#9B7BFF" },
    { label: "Salvamentos", value: num(t.saves), pct: (t.saves / totalInter) * 100, color: "#F5B301" },
    { label: "Cliques no link", value: num(t.linkClicks), pct: (t.linkClicks / totalInter) * 100, color: "#21C46A" },
  ];
  const retencao: LabeledBar[] = retentionResult.value.map((r) => ({ label: r.label, value: Math.round(r.value) + "%", pct: r.value }));
  return {
    bigNumbers,
    series,
    dayLabels: dayLabels.length ? dayLabels : mock.dayLabels,
    interacoes,
    interCriativo: mock.interCriativo,
    retencao: retencao.length ? retencao : mock.retencao,
    source: "live" as Source,
  };
}

// ---------- 07 Eficiência ----------
export async function getEficienciaData(range: DateRange) {
  const totalsResult = await safe<AccountTotals | null>(() => getAccountTotals(range), null, "eficiencia");
  const campaignsResult = await safe<CampaignRow[]>(() => getCampaigns(range), [], "eficiencia-campanhas");

  if (!totalsResult.value) {
    return { eficKpis: mock.eficKpis, eficRows: mock.eficRows, eficObjetivo: mock.eficObjetivo, desperdicio: mock.desperdicio, source: "mock" as Source };
  }
  const t = totalsResult.value;
  const eficKpis: Kpi[] = [
    { label: "CPA médio", value: brl(t.cpa), delta: "", note: "", good: true },
    { label: "CPM", value: brl(t.cpm), delta: "", note: "" },
    { label: "Custo por clique", value: brl(t.cpc), delta: "", note: "" },
    { label: "Cliques no link", value: num(t.linkClicks), delta: "", note: "" },
    { label: "CTR", value: pctFmt(t.ctr), delta: "", note: "" },
  ];
  const withLeads = campaignsResult.value.filter((c) => c.leads > 0);
  const cpaValues = withLeads.map((c) => c.cpa);
  const minCpa = cpaValues.length ? Math.min(...cpaValues) : 0;
  const maxCpa = cpaValues.length ? Math.max(...cpaValues) : 1;
  const eficRows = withLeads
    .slice()
    .sort((a, b) => a.cpa - b.cpa)
    .map((c) => ({
      name: c.name,
      cpa: brl(c.cpa),
      vol: num(c.leads),
      color: c.name.toUpperCase().startsWith("KW") ? "#FF7A00" : "#2E8FFF",
      pct: maxCpa > minCpa ? 100 - ((c.cpa - minCpa) / (maxCpa - minCpa)) * 80 : 90,
    }));

  const byObjective = new Map<string, { spend: number; leads: number }>();
  for (const c of campaignsResult.value) {
    const entry = byObjective.get(c.objective) || { spend: 0, leads: 0 };
    entry.spend += c.spend;
    entry.leads += c.leads;
    byObjective.set(c.objective, entry);
  }
  const objRows = Array.from(byObjective.entries()).map(([label, v]) => ({ label, cpa: v.leads > 0 ? v.spend / v.leads : 0 }));
  const maxObjCpa = Math.max(...objRows.map((o) => o.cpa), 1);
  const eficObjetivo: LabeledBar[] = objRows.map((o) => ({
    label: o.label, value: o.cpa > 0 ? brl(o.cpa) : "—", pct: o.cpa > 0 ? 100 - (o.cpa / maxObjCpa) * 60 : 10, color: "#35D0FF",
  }));

  const avgCpa = t.cpa || cpaValues.reduce((a, b) => a + b, 0) / (cpaValues.length || 1);
  const wasteful = campaignsResult.value.filter((c) => c.leads > 0 && c.cpa > avgCpa * 1.25);
  const desperdicio = wasteful.length
    ? wasteful.map((c) => `${c.name}: CPA de ${brl(c.cpa)} — ${Math.round(((c.cpa - avgCpa) / avgCpa) * 100)}% acima da média da conta.`)
    : mock.desperdicio;

  return {
    eficKpis,
    eficRows: eficRows.length ? eficRows : mock.eficRows,
    eficObjetivo: eficObjetivo.length ? eficObjetivo : mock.eficObjetivo,
    desperdicio,
    source: "live" as Source,
  };
}

// ---------- 08 Território ----------
export async function getTerritorioData(range: DateRange) {
  const result = await safe<{ cities: { name: string; spend: number; leads: number; cpa: number }[]; regions: { name: string; spend: number; leads: number; cpa: number }[] } | null>(
    () => getGeoBreakdown(range),
    null,
    "territorio",
  );
  if (!result.value || (!result.value.cities.length && !result.value.regions.length)) {
    return { municipios: mock.municipios, regioes: mock.regioes, source: "mock" as Source };
  }
  const cities = result.value.cities;
  const maxSpend = Math.max(...cities.map((c) => c.spend), 1);
  const municipios: RankRow[] = cities.slice(0, 8).map((c, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    name: c.name,
    value: num(Math.round(c.leads)),
    pct: Math.round((c.spend / maxSpend) * 100),
  }));
  const regioes: RegiaoRow[] = result.value.regions.slice(0, 6).map((r) => ({
    name: r.name,
    invest: brl(r.spend / 1000, 0) + "k",
    cad: num(Math.round(r.leads)),
    cpa: r.cpa > 0 ? brl(r.cpa) : "—",
  }));
  return {
    municipios: municipios.length ? municipios : mock.municipios,
    regioes: regioes.length ? regioes : mock.regioes,
    source: "live" as Source,
  };
}

// ---------- 09 Público ----------
export async function getPublicoData(range: DateRange) {
  const ageResult = await safe<AgeGenderRow[]>(() => getAgeGenderBreakdown(range), [], "publico-idade");
  const deviceResult = await safe<DeviceRow[]>(() => getDeviceBreakdown(range), [], "publico-dispositivo");
  const hourResult = await safe<HourRow[]>(() => getHourlyBreakdown(range), [], "publico-horario");

  const faixas: FaixaRow[] = ageResult.value.length
    ? (() => {
        const maxImp = Math.max(...ageResult.value.flatMap((r) => [r.male, r.female]), 1);
        return ageResult.value.map((r) => ({ label: r.age, male: Math.round((r.male / maxImp) * 100), female: Math.round((r.female / maxImp) * 100) }));
      })()
    : mock.faixas;

  const dispositivos: LabeledBar[] = deviceResult.value.length
    ? deviceResult.value.map((d, i) => ({ label: d.device, value: d.value.toFixed(1).replace(".", ",") + "%", pct: d.value, color: ["#21C46A", "#35D0FF", "#9B7BFF", "#7C8CB3"][i % 4] }))
    : mock.dispositivos;

  const horarios: LabeledBar[] = hourResult.value.length
    ? (() => {
        const max = Math.max(...hourResult.value.map((h) => h.value), 1);
        return hourResult.value.map((h) => ({ label: h.hour, value: "", pct: Math.round((h.value / max) * 100) }));
      })()
    : mock.horarios;

  const segmentos: SegmentoRow[] = ageResult.value.length
    ? ageResult.value
        .filter((r) => r.leads > 0)
        .slice()
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 6)
        .map((r) => ({ name: r.age, cad: num(Math.round(r.leads)), cpa: brl(r.leads > 0 ? r.spend / r.leads : 0), good: true }))
    : mock.segmentos;

  const source: Source = ageResult.source === "live" || deviceResult.source === "live" || hourResult.source === "live" ? "live" : "mock";
  return { faixas, dispositivos, horarios, segmentos: segmentos.length ? segmentos : mock.segmentos, source };
}

// ---------- 10 Biblioteca ----------
export async function getBibliotecaData() {
  const result = await safe<BibliotecaCard[]>(async () => {
    const ads = await searchAdLibrary(100);
    return ads.map((a) => ({
      id: a.id,
      status: a.status,
      copy: a.body || a.linkTitle || "(sem texto de anúncio)",
      start: a.startDate,
      plats: a.platforms || "—",
      spendLabel: a.spendLabel,
      impressionsLabel: a.impressionsLabel,
      snapshotUrl: a.snapshotUrl,
    }));
  }, mock.biblioteca, "biblioteca");
  return { biblioteca: result.value.length ? result.value : mock.biblioteca, source: result.source };
}

// ---------- 11 Linha do tempo ----------
export async function getTimelineData(range: DateRange) {
  const activitiesResult = await safe<ActivityRow[]>(() => getActivities(range, 60), [], "timeline");
  const dailyResult = await safe<DailyPoint[] | null>(() => getDailySeries(range), null, "timeline-daily");

  const diario: DiarioDay[] = groupActivitiesByDay(activitiesResult.value);
  const cpaSeries = dailyResult.value?.length ? dailyResult.value.map((d) => d.cpa) : mock.series.cpa;
  const dayLabels = dailyResult.value?.length ? dailyResult.value.map((d) => dateBr(d.date)) : mock.dayLabels;

  return {
    diario: diario.length ? diario : mock.diario,
    efeitos: mock.efeitos,
    cpaSeries,
    dayLabels,
    source: activitiesResult.source,
  };
}

function groupActivitiesByDay(rows: ActivityRow[]): DiarioDay[] {
  const byDate = new Map<string, DiarioDay>();
  for (const r of rows) {
    const key = r.date || r.time;
    const day = byDate.get(key) || { date: key, weekday: r.weekday, items: [] };
    day.items.push({ tag: r.tag, title: r.title, detail: r.detail, impact: "", up: true });
    byDate.set(key, day);
  }
  return Array.from(byDate.values());
}

// ---------- 12 Comparativo ----------
const PLATFORM_STRENGTH_NOTES: Record<string, string> = {
  "Custo por cadastro": "gera cada cadastro mais barato",
  "Volume de cadastros": "entrega mais cadastros no total",
  "Alcance único": "alcança mais pessoas distintas",
  CTR: "tem anúncios mais clicáveis (CTR maior)",
  "Retenção de vídeo": "prende mais atenção até o fim do vídeo",
  Frequência: "satura menos o público (frequência mais baixa)",
  CPM: "compra impressão mais barata (CPM menor)",
  "Penetração no interior": "cobre melhor o interior do estado",
};

function buildStrengthSummary(platform: "Kwai" | "Meta", rows: ComparativoRow[]): { count: number; total: number; highlights: string[]; summary: string } {
  const wins = rows.filter((r) => r.winner === platform);
  const highlights = wins.map((r) => r.label);
  const notes = wins.map((r) => PLATFORM_STRENGTH_NOTES[r.label]).filter(Boolean).slice(0, 3);
  const summary = notes.length
    ? `${platform} Ads vence em ${wins.length} de ${rows.length} indicadores: ${notes.join("; ")}.`
    : `${platform} Ads não lidera nenhum indicador comparável nesta janela.`;
  return { count: wins.length, total: rows.length, highlights, summary };
}

export async function getComparativoData(range: DateRange) {
  let platCards: PlatCard[];
  let comparativo: ComparativoRow[];
  let source: Source;

  const totalsResult = await safe<AccountTotals | null>(() => getAccountTotals(range), null, "comparativo");
  if (!totalsResult.value || totalsResult.value.leads === 0) {
    platCards = mock.platCards;
    comparativo = mock.comparativo;
    source = "mock";
  } else {
    const t = totalsResult.value;
    const kwaiSpend = KWAI_MOCK_SPEND;
    const kwaiLeads = 11573;
    const kwaiCpa = kwaiSpend / kwaiLeads;
    const total = kwaiSpend + t.spend || 1;

    platCards = [
      { name: "KWAI ADS", verdict: "Dado ilustrativo", color: "#FF7A00", stats: [
        { value: Math.round((kwaiSpend / total) * 100) + "%", label: "da verba" },
        { value: brl(kwaiCpa), label: "CPA" },
        { value: num(kwaiLeads), label: "cadastros" },
      ] },
      { name: "META ADS", verdict: t.cpa < kwaiCpa ? "Melhor custo" : "Maior volume", color: "#2E8FFF", stats: [
        { value: Math.round((t.spend / total) * 100) + "%", label: "da verba" },
        { value: brl(t.cpa), label: "CPA" },
        { value: num(t.leads), label: "cadastros" },
      ] },
    ];

    comparativo = [
      { label: "Custo por cadastro", kwaiV: brl(kwaiCpa), metaV: brl(t.cpa), kwaiPct: normPct(kwaiCpa, t.cpa, true), metaPct: normPct(t.cpa, kwaiCpa, true), winner: kwaiCpa < t.cpa ? "Kwai" : "Meta" },
      { label: "Volume de cadastros", kwaiV: num(kwaiLeads), metaV: num(t.leads), kwaiPct: normPct(kwaiLeads, t.leads, false), metaPct: normPct(t.leads, kwaiLeads, false), winner: kwaiLeads > t.leads ? "Kwai" : "Meta" },
      { label: "CTR", kwaiV: "—", metaV: pctFmt(t.ctr), kwaiPct: 50, metaPct: 50, winner: "Meta" },
      { label: "Frequência", kwaiV: "—", metaV: t.frequency.toFixed(2).replace(".", ","), kwaiPct: 50, metaPct: 50, winner: "Meta" },
      { label: "CPM", kwaiV: "—", metaV: brl(t.cpm), kwaiPct: 50, metaPct: 50, winner: "Meta" },
    ];
    source = "live";
  }

  const kwaiStrength = buildStrengthSummary("Kwai", comparativo);
  const metaStrength = buildStrengthSummary("Meta", comparativo);

  platCards = platCards.map((p, i) => {
    const strength = i === 0 ? kwaiStrength : metaStrength;
    return { ...p, stats: [...p.stats, { value: `${strength.count}/${strength.total}`, label: "indicadores à frente" }] };
  });

  return { platCards, comparativo, kwaiStrength, metaStrength, source };
}

function normPct(a: number, b: number, lowerIsBetter: boolean): number {
  const max = Math.max(a, b) || 1;
  const raw = lowerIsBetter ? (1 - a / max) * 100 : (a / max) * 100;
  return Math.max(15, Math.min(95, Math.round(raw)));
}

// ---------- 13 Simulador ----------
export async function getSimuladorBaseline(range: DateRange) {
  const result = await safe<AccountTotals | null>(() => getAccountTotals(range), null, "simulador");
  if (!result.value || result.value.leads === 0) return { ...mock.simuladorBaseline, source: "mock" as Source };
  const t = result.value;
  const metaCpa = t.cpa;
  const metaCpm = t.cpm;
  return {
    cpaBase: { cadastros: [metaCpa * 0.82, metaCpa] as [number, number], alcance: [metaCpa, metaCpa * 1.2] as [number, number], video: [metaCpa * 0.94, metaCpa * 1.12] as [number, number] },
    cpmBase: { cadastros: [metaCpm * 0.88, metaCpm] as [number, number], alcance: [metaCpm * 0.73, metaCpm * 0.9] as [number, number], video: [metaCpm * 0.8, metaCpm * 1.01] as [number, number] },
    source: "live" as Source,
  };
}
