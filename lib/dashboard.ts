import "server-only";
import { isMetaConfigured, isLibraryConfigured } from "@/lib/meta/graph";
import {
  getAccountTotals, getAgeGenderBreakdown, getDailySeries, getDeviceBreakdown, getHourlyBreakdown,
  getPlatformBreakdown, getSegmentBreakdown, getVideoRetention, getGastoAcumulado, EMPTY_TOTALS,
  type AccountTotals, type DailyPoint,
} from "@/lib/meta/insights";
import { getCampaigns, getAdsWithCreatives, getAdsDailySeries, type CampaignRow, type AdCreativeRow, type AdDia } from "@/lib/meta/campaigns";
import { getActivities, type ActivityRow } from "@/lib/meta/activities";
import { getGeoBreakdown, type GeoRow } from "@/lib/meta/geo";
import { getSeguidores, SEGUIDORES_ZERO, type SeguidoresPeriodo } from "@/lib/meta/instagram";
import { searchAdLibraryByCandidate, estaAtivoAgora, esteveAtivoEm, type CandidateLibrary, type LibraryAd } from "@/lib/meta/adLibrary";
import { getCreativeThumbs, thumbFor, EMPTY_THUMBS, type ThumbIndex } from "@/lib/meta/creativeThumbs";
import { KWAI_AVISO, KWAI_DETALHE, getKwaiTotals, kwaiCampaignRows, type KwaiTotals } from "@/lib/kwai";
import { brl, num, compact, pct as pctFmt, delta as deltaFmt, dateBr } from "@/lib/format";
import { previousRange, type DateRange } from "@/lib/period";
import { DATA_ELEICAO, diasAteEleicao } from "@/lib/candidato";
import {
  PLANO_OBJETIVOS, PLANO_FASES, VERBA_TOTAL, IMPRESSOES_PLANO_MI,
  cpmPlanejado, objetivoDaCampanha, type PlanoObjetivoId,
} from "@/lib/plano";
import type { ConversionMetric } from "@/lib/meta/conversion";
import type {
  Kpi, CampaignRowView, ResultCard, CreativeCard, AnaliseCard, LabeledBar,
  RankRow, RegiaoRow, FaixaRow, SegmentoRow, BibliotecaCard, DiarioDay, PlatCard, ComparativoRow, Series,
  CriativoOrdem,
} from "@/lib/types";

/**
 * Camada de leitura do painel. TODOS os números vêm da Meta Marketing API —
 * este projeto não tem mais dataset ilustrativo. Quando uma consulta falha ou o
 * período não tem entrega, a função devolve o estado vazio correspondente em vez
 * de preencher com estimativa.
 */

export type Source = "live" | "mock" | "erro";

/** Executa a consulta; em falha registra o erro e devolve o vazio informado. */
async function safe<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<{ value: T; ok: boolean }> {
  if (!isMetaConfigured()) {
    console.error(`[dashboard] ${label}: META_ACCESS_TOKEN/META_AD_ACCOUNT_ID ausentes`);
    return { value: fallback, ok: false };
  }
  try {
    return { value: await fn(), ok: true };
  } catch (err) {
    console.error(`[dashboard] falha ao buscar ${label}:`, err);
    return { value: fallback, ok: false };
  }
}

/** Falha de consulta vira "erro" — nunca "sem entrega", que seria afirmar um fato falso. */
const sourceOf = (ok: boolean): Source => (ok ? "live" : "erro");

const decimal = (v: number, d = 2) =>
  Number.isFinite(v) ? v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) : "0,00";

function heroKpisFrom(curr: AccountTotals, prev: AccountTotals): Kpi[] {
  return [
    {
      value: brl(curr.spend),
      label: "Investido",
      delta: deltaFmt(curr.spend, prev.spend),
      note: curr.spend >= prev.spend ? "acima do período anterior" : "abaixo do período anterior",
    },
    { value: compact(curr.reach), label: "Pessoas alcançadas", delta: deltaFmt(curr.reach, prev.reach), note: "alcance único" },
    { value: compact(curr.impressions), label: "Impressões", delta: deltaFmt(curr.impressions, prev.impressions), note: "exibições" },
    {
      value: num(curr.conversions),
      label: curr.metric.label,
      delta: deltaFmt(curr.conversions, prev.conversions),
      note: curr.metric.isProxy ? "melhor resultado disponível" : "no período",
    },
    {
      value: curr.cpa > 0 ? brl(curr.cpa) : "—",
      label: curr.metric.costLabel,
      delta: deltaFmt(curr.cpa, prev.cpa),
      note: "média da janela",
      good: curr.cpa > 0 && prev.cpa > 0 ? curr.cpa <= prev.cpa : undefined,
    },
  ];
}

// ---------- 01 Início ----------
export async function getInicioData(range: DateRange) {
  const res = await safe(async () => {
    const [curr, prev] = await Promise.all([getAccountTotals(range), getAccountTotals(previousRange(range))]);
    return heroKpisFrom(curr, prev);
  }, heroKpisFrom(EMPTY_TOTALS, EMPTY_TOTALS), "inicio");
  return { heroKpis: res.value, source: sourceOf(res.ok) };
}

// ---------- 02 Campanhas ----------
export async function getCampanhasData(range: DateRange) {
  const kwai: KwaiTotals = await getKwaiTotals();

  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const [campaigns, daily, acumulado, seguidores] = await Promise.all([
      getCampaigns(range, totals.metric),
      getDailySeries(range, totals.metric),
      getGastoAcumulado(),
      // O crescimento de seguidores não pode derrubar a página se a API do
      // Instagram falhar — é informação complementar.
      getSeguidores(range).catch(() => SEGUIDORES_ZERO),
    ]);
    return { totals, campaigns, daily, acumulado, seguidores };
  }, { totals: EMPTY_TOTALS, campaigns: [] as CampaignRow[], daily: [] as DailyPoint[], acumulado: 0, seguidores: SEGUIDORES_ZERO }, "campanhas");

  const { totals, campaigns, daily, acumulado, seguidores } = res.value;
  const totalInvest = kwai.spend + totals.spend;
  const kwaiPct = totalInvest > 0 ? Math.round((kwai.spend / totalInvest) * 100) : 0;

  const metaCampaigns: CampaignRowView[] = campaigns.map((c) => ({
    name: c.label,
    objective: c.objective,
    spend: brl(c.spend, 0),
    cpa: c.cpa > 0 ? brl(c.cpa) : "—",
    status: c.status,
    // Números crus para o seletor de métrica da lista.
    metricas: {
      investimento: c.spend,
      impressoes: c.impressions,
      alcance: c.reach,
      cliques: 0,
      resultados: c.conversions,
      cpa: c.cpa,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
    },
  }));

  const resultCards: ResultCard[] = [
    { label: "Impressões", value: num(totals.impressions), delta: "" },
    { label: "Alcance único", value: num(totals.reach), delta: "" },
    { label: "Frequência", value: decimal(totals.frequency), delta: "" },
    // Prefere o número atribuído aos anúncios; sem ele, mostra o crescimento do
    // perfil e diz explicitamente que é do perfil, para ninguém confundir com a
    // coluna do gerenciador.
    totals.followsAds > 0
      ? { label: "Seguidores via anúncios", value: num(totals.followsAds), delta: "" }
      : { label: "Novos seguidores", value: num(seguidores.novos), delta: "" },
    { label: "CTR", value: pctFmt(totals.ctrLink), delta: "" },
    { label: "CPM", value: brl(totals.cpm), delta: "", good: true },
  ];

  return {
    totalInvest: brl(totalInvest, 0),
    kwaiPct,
    metaPct: 100 - kwaiPct,
    splitCards: [
      {
        name: "Kwai Ads",
        pct: kwaiPct + "%",
        value: brl(kwai.spend, 0),
        note: `${KWAI_AVISO} · ${KWAI_DETALHE.toLowerCase()}`,
        color: "#FF7A00",
      },
      {
        name: "Meta Ads",
        pct: 100 - kwaiPct + "%",
        value: brl(totals.spend, 0),
        note: `${campaigns.length} ${campaigns.length === 1 ? "campanha" : "campanhas"} · CPA ${totals.cpa > 0 ? brl(totals.cpa) : "—"}`,
        color: "#2E8FFF",
      },
    ],
    resultCards,
    kwaiCampaigns: kwaiCampaignRows(),
    metaCampaigns,
    resultLabel: totals.metric.shortLabel,
    costLabel: totals.metric.costLabel,
    seguidores,
    /**
     * Pacing da verba da campanha. `gasto` é o ACUMULADO da conta (não o da
     * janela), senão trocar o período faria o percentual do plano oscilar.
     */
    pacing: (() => {
      const gasto = acumulado + kwai.spend;
      const dias = diasAteEleicao();
      const restante = Math.max(0, VERBA_TOTAL - gasto);
      return {
        budget: VERBA_TOTAL,
        gasto,
        restante,
        pctGasto: VERBA_TOTAL > 0 ? (gasto / VERBA_TOTAL) * 100 : 0,
        diasRestantes: dias,
        dataEleicao: DATA_ELEICAO,
        // Quanto precisa sair por dia daqui até o 1º turno para usar toda a verba.
        mediaDiariaNecessaria: dias > 0 ? restante / dias : restante,
        // Ritmo atual, para comparar com o necessário.
        mediaDiariaAtual: daily.length ? daily.reduce((a, d) => a + d.spend, 0) / daily.length : 0,
      };
    })(),
    // `leads` mantém o nome esperado pelo gráfico da página de campanhas.
    daily: daily.map((d) => ({ date: d.date, spend: d.spend, leads: d.conversions, cpa: d.cpa })),
    source: sourceOf(res.ok),
  };
}

// ---------- 03 Criativos ----------
export async function getCriativosData(range: DateRange, ordem: CriativoOrdem = "investimento", status = "todos", campanha = "todas") {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    // Sem teto: a campanha sobe anúncios aos poucos, cidade a cidade. Qualquer
    // limite fixo aqui viraria "a conta tem N anúncios" mentindo para o usuário.
    const [ads, campanhas, series] = await Promise.all([
      getAdsWithCreatives(range, totals.metric),
      getCampaigns(range, totals.metric),
      // Curva dia a dia de cada anúncio, para o gráfico do comparativo.
      getAdsDailySeries(range),
    ]);
    // Objetivo vem da campanha: o comparativo precisa dele para avisar quando
    // duas peças não são comparáveis (otimizadas para metas diferentes).
    const objetivoPorCampanha = new Map(campanhas.map((c) => [c.id, c.objective]));
    return { ads, metric: totals.metric, objetivoPorCampanha, series };
  }, {
    ads: [] as AdCreativeRow[],
    metric: EMPTY_TOTALS.metric,
    objetivoPorCampanha: new Map<string, string>(),
    series: new Map<string, AdDia[]>(),
  }, "criativos");

  const { ads, metric, objetivoPorCampanha, series } = res.value;

  // O filtro é montado a partir dos status que a conta REALMENTE devolveu —
  // nada de listar opções que não existem, nem esconder um status novo.
  const statusDisponiveis = Array.from(new Set(ads.map((a) => a.status))).sort();
  // As campanhas do dropdown saem dos próprios anúncios: só aparece o que existe.
  const campanhasDisponiveis = Array.from(new Set(ads.map((a) => a.campaignName).filter(Boolean))).sort();
  const filtrados = ads
    .filter((a) => status === "todos" || a.status === status)
    .filter((a) => campanha === "todas" || a.campaignName === campanha);

  // "Menor CPA" é o único critério crescente, e anúncios sem CPA vão para o fim
  // em vez de fingirem ser os mais baratos.
  const ordenado = [...filtrados].sort((a, b) => {
    switch (ordem) {
      case "impressoes":
        return b.impressions - a.impressions;
      case "cliques":
        return b.clicks - a.clicks;
      case "interacoes":
        return b.interacoes - a.interacoes;
      default:
        return b.spend - a.spend;
    }
  });

  const valorDaOrdem = (a: AdCreativeRow): string => {
    switch (ordem) {
      case "impressoes":
        return `${compact(a.impressions)} impr.`;
      case "cliques":
        return `${num(a.clicks)} ${a.clicks === 1 ? "clique" : "cliques"}`;
      case "interacoes":
        return `${num(a.interacoes)} ${a.interacoes === 1 ? "interação" : "interações"}`;
      default:
        return brl(a.spend, 0);
    }
  };

  const criativos: CreativeCard[] = ordenado.map((a) => ({
    name: a.label,
    platform: a.platform,
    spend: brl(a.spend, 0),
    cpa: a.cpa > 0 ? brl(a.cpa) : "—",
    score: a.score,
    status: a.status,
    thumbnailUrl: a.thumbnailUrl,
    permalink: a.permalink,
    ordemValue: valorDaOrdem(a),
    interacoes: num(a.interacoes),
    campanha: a.campaignName,
  }));
  return {
    criativos,
    ordem,
    status,
    statusDisponiveis,
    campanha,
    campanhasDisponiveis,
    totalSemFiltro: ads.length,
    // Dados crus para o comparativo de criativos, sem os filtros aplicados.
    paraComparar: ads.map((a) => ({
      id: a.id,
      nome: a.label,
      campanha: a.campaignName,
      objetivo: objetivoPorCampanha.get(a.campaignId) || "—",
      status: a.status,
      thumbnailUrl: a.thumbnailUrl,
      permalink: a.permalink,
      investimento: a.spend,
      impressoes: a.impressions,
      alcance: a.reach,
      cliques: a.clicks,
      cliquesTotais: a.clicksAll,
      resultados: a.conversions,
      interacoes: a.interacoes,
      reacoes: a.reactions,
      comentarios: a.comments,
      compartilhamentos: a.shares,
      salvos: a.saves,
      videoPlays: a.videoPlays,
      video3s: a.video3s,
      thruplays: a.thruplays,
      videoP100: a.videoP100,
      cpa: a.cpa,
      cpm: a.impressions > 0 ? (a.spend / a.impressions) * 1000 : 0,
      cpc: a.clicks > 0 ? a.spend / a.clicks : 0,
      cpcTotal: a.clicksAll > 0 ? a.spend / a.clicksAll : 0,
      cpe: a.interacoes > 0 ? a.spend / a.interacoes : 0,
      custoPorMilAlcancadas: a.reach > 0 ? (a.spend / a.reach) * 1000 : 0,
      custoPorThruplay: a.thruplays > 0 ? a.spend / a.thruplays : 0,
      ctr: a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0,
      ctrTotal: a.impressions > 0 ? (a.clicksAll / a.impressions) * 100 : 0,
      taxaInteracao: a.engRate,
      frequencia: a.reach > 0 ? a.impressions / a.reach : 0,
      vtr: a.impressions > 0 ? (a.thruplays / a.impressions) * 100 : 0,
      hookRate: a.impressions > 0 ? (a.video3s / a.impressions) * 100 : 0,
      retencao: a.videoPlays > 0 ? (a.videoP100 / a.videoPlays) * 100 : 0,
      serie: series.get(a.id) ?? [],
    })),
    resultLabel: metric.shortLabel,
    source: sourceOf(res.ok),
  };
}

// ---------- 04 Análises ----------
export async function getAnalisesData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const [campaigns, platforms, seguidores] = await Promise.all([
      getCampaigns(range, totals.metric),
      getPlatformBreakdown(range, totals.metric),
      getSeguidores(range).catch(() => SEGUIDORES_ZERO),
    ]);
    return { totals, campaigns, platforms, seguidores };
  }, {
    totals: EMPTY_TOTALS,
    campaigns: [] as CampaignRow[],
    platforms: [] as Awaited<ReturnType<typeof getPlatformBreakdown>>,
    seguidores: SEGUIDORES_ZERO,
  }, "analises");

  const { totals: t, campaigns, platforms, seguidores } = res.value;
  const m = t.metric;

  if (!t.spend) {
    return {
      headline: res.ok
        ? "Sem entrega registrada no período selecionado."
        : "Não foi possível consultar a Meta — os números abaixo não refletem a campanha.",
      analises: [] as AnaliseCard[],
      sinais: [] as LabeledBar[],
      atencao: [res.ok
        ? "Nenhuma impressão ou investimento no período — verifique se há campanhas ativas na janela."
        : "Falha na consulta à Graph API. Verifique o token (expira em 10/10/2026) e os limites de requisição."],
      source: sourceOf(res.ok),
    };
  }

  const headline =
    `No período, o Meta Ads investiu ${brl(t.spend, 0)} e gerou ${num(t.conversions)} ${m.unitPlural.toLowerCase()} ` +
    `a ${t.cpa > 0 ? brl(t.cpa) : "—"} cada. Alcance de ${compact(t.reach)} pessoas com frequência ${decimal(t.frequency)} e CTR de ${pctFmt(t.ctr)}.`;

  const analises: AnaliseCard[] = [];

  analises.push({
    tag: "EFICIÊNCIA",
    title: `${m.costLabel} em ${t.cpa > 0 ? brl(t.cpa) : "—"}`,
    text: `${num(t.conversions)} ${m.unitPlural.toLowerCase()} a partir de ${brl(t.spend, 0)} investidos. CPM de ${brl(t.cpm)} e custo por clique de ${brl(t.cpc)}.`,
    src: "Meta Ads",
  });

  analises.push({
    tag: "ALCANCE",
    title: `Frequência média de ${decimal(t.frequency)}`,
    text:
      t.frequency > 3
        ? `Cada pessoa viu os anúncios ${decimal(t.frequency)} vezes — acima de 3,0 já indica saturação. Vale ampliar público ou renovar criativo.`
        : `Cada pessoa alcançada viu os anúncios ${decimal(t.frequency)} vezes, dentro da faixa saudável. Ainda há espaço para intensificar antes de saturar.`,
    src: "Meta Ads",
  });

  const topCampaign = campaigns.filter((c) => c.cpa > 0).sort((a, b) => a.cpa - b.cpa)[0];
  if (topCampaign) {
    analises.push({
      tag: "CAMPANHA",
      title: `Melhor custo: ${topCampaign.objective}`,
      text: `"${topCampaign.label}" entrega ${m.unit} a ${brl(topCampaign.cpa)}, com ${brl(topCampaign.spend, 0)} investidos e ${num(topCampaign.conversions)} ${m.unitPlural.toLowerCase()}.`,
      src: "Meta Ads",
    });
  }

  const topPlatform = platforms[0];
  if (topPlatform && platforms.length > 1) {
    const share = t.spend > 0 ? Math.round((topPlatform.spend / t.spend) * 100) : 0;
    analises.push({
      tag: "PLATAFORMA",
      title: `${topPlatform.platform} concentra ${share}% da verba`,
      text: `${platforms.map((p) => `${p.platform}: ${brl(p.spend, 0)}`).join(" · ")}. Distribuição definida pelo posicionamento dos conjuntos.`,
      src: "Meta Ads",
    });
  }

  if (seguidores.novos > 0) {
    const media = seguidores.diario.length ? seguidores.novos / seguidores.diario.length : 0;
    const custo = seguidores.novos > 0 ? t.spend / seguidores.novos : 0;
    analises.push({
      tag: "SEGUIDORES",
      title: `${num(seguidores.novos)} novos seguidores no perfil`,
      text:
        `O perfil @${seguidores.username} chegou a ${num(seguidores.total)} seguidores, com média de ` +
        `${num(Math.round(media))} por dia. Dividindo o investimento pelo crescimento dá ${brl(custo)} por seguidor — ` +
        "referência de ordem de grandeza, não custo de aquisição: o número soma mídia paga e alcance orgânico." +
        (t.followsAds > 0 ? ` Atribuídos diretamente aos anúncios: ${num(t.followsAds)}.` : ""),
      src: "Instagram",
    });
  }

  if (t.videoViews > 0) {
    analises.push({
      tag: "CRIATIVO",
      title: `${compact(t.videoViews)} visualizações de vídeo`,
      text: `${num(t.thruplays)} ThruPlays no período. Engajamento total de ${num(t.postEngagement)} interações com as publicações.`,
      src: "Meta Ads",
    });
  }

  const sinais: LabeledBar[] = [];
  const satur = Math.max(0, Math.min(100, Math.round(((t.frequency - 1) / 3) * 100)));
  sinais.push({ label: "Saturação de frequência", value: `${satur}/100`, pct: satur, color: "#E4222B" });
  const ctrScore = Math.max(0, Math.min(100, Math.round((t.ctr / 2) * 100)));
  sinais.push({ label: "Atratividade do criativo (CTR)", value: `${ctrScore}/100`, pct: ctrScore, color: "#21C46A" });
  if (t.impressions > 0) {
    const engRate = Math.max(0, Math.min(100, Math.round((t.postEngagement / t.impressions) * 1000)));
    sinais.push({ label: "Engajamento por mil impressões", value: `${engRate}/100`, pct: engRate, color: "#35D0FF" });
  }
  if (t.videoViews > 0) {
    const thru = Math.max(0, Math.min(100, Math.round((t.thruplays / t.videoViews) * 100)));
    sinais.push({ label: "Conclusão de vídeo (ThruPlay)", value: `${thru}/100`, pct: thru, color: "#9B7BFF" });
  }
  if (campaigns.length) {
    const ativas = campaigns.filter((c) => c.status === "ATIVA").length;
    const pctAtivas = Math.round((ativas / campaigns.length) * 100);
    sinais.push({ label: "Campanhas ativas", value: `${ativas}/${campaigns.length}`, pct: pctAtivas, color: "#2E8FFF" });
  }

  const atencao: string[] = [];
  if (t.frequency > 3) atencao.push(`Frequência média em ${decimal(t.frequency)} — acima do limite recomendado de 3,0.`);
  if (m.isProxy) {
    atencao.push(
      `A conta ainda não registra cadastros: o painel está usando "${m.label.toLowerCase()}" como resultado principal. ` +
      "Assim que entrarem campanhas de conversão, a métrica troca sozinha.",
    );
  }
  const caros = campaigns.filter((c) => c.cpa > 0 && t.cpa > 0 && c.cpa > t.cpa * 1.25);
  for (const c of caros.slice(0, 3)) {
    atencao.push(`"${c.label}" com ${m.costLabel.toLowerCase()} de ${brl(c.cpa)} — ${Math.round(((c.cpa - t.cpa) / t.cpa) * 100)}% acima da média da conta.`);
  }
  if (!atencao.length) atencao.push("Nenhum alerta de saturação, custo ou entrega no período.");

  return { headline, analises, sinais, atencao, source: sourceOf(res.ok) };
}

// ---------- 05 Período ----------
export async function getPeriodoData(range: DateRange) {
  const res = await safe(async () => {
    const [curr, prev] = await Promise.all([getAccountTotals(range), getAccountTotals(previousRange(range))]);
    const activities = await getActivities(range);
    return { curr, prev, activities };
  }, { curr: EMPTY_TOTALS, prev: EMPTY_TOTALS, activities: [] as ActivityRow[] }, "periodo");

  const { curr, prev, activities } = res.value;
  const m = curr.metric;

  const periodoKpis: Kpi[] = [
    { label: "Investido no período", value: brl(curr.spend, 0), delta: deltaFmt(curr.spend, prev.spend), note: "vs janela anterior" },
    { label: "Alcance único", value: num(curr.reach), delta: deltaFmt(curr.reach, prev.reach), note: "pessoas distintas" },
    { label: m.label, value: num(curr.conversions), delta: deltaFmt(curr.conversions, prev.conversions), note: "no período" },
    {
      label: m.costLabel,
      value: curr.cpa > 0 ? brl(curr.cpa) : "—",
      delta: deltaFmt(curr.cpa, prev.cpa),
      note: "custo unitário",
      good: curr.cpa > 0 && prev.cpa > 0 ? curr.cpa <= prev.cpa : undefined,
    },
  ];

  const leitura = curr.spend
    ? [
        `A janela fechou com ${brl(curr.spend, 0)} investidos e ${num(curr.conversions)} ${m.unitPlural.toLowerCase()} no Meta Ads, a ${curr.cpa > 0 ? brl(curr.cpa) : "—"} cada${deltaFmt(curr.cpa, prev.cpa) ? ` (${deltaFmt(curr.cpa, prev.cpa)} vs. período anterior)` : " — sem janela anterior para comparar"}.`,
        `O alcance único foi de ${num(curr.reach)} pessoas com ${num(curr.impressions)} impressões — frequência média de ${decimal(curr.frequency)}.`,
        `CTR de ${pctFmt(curr.ctr)}, CPM de ${brl(curr.cpm)} e custo por clique de ${brl(curr.cpc)} no período analisado.`,
        `Engajamento: ${num(curr.likes)} reações, ${num(curr.comments)} comentários e ${num(curr.shares)} compartilhamentos.`,
      ]
    : ["Sem entrega registrada no período selecionado."];

  const alteracoes = activities.map((a) => ({ time: a.time, title: a.title, detail: a.detail }));

  return { periodoKpis, leitura, alteracoes, source: sourceOf(res.ok) };
}

// ---------- 06 Desempenho ----------
const EMPTY_SERIES: Series = { investimento: [], cadastros: [], alcance: [], cpa: [], interacoes: [] };

export async function getDesempenhoData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const [daily, retention, ads, seguidores] = await Promise.all([
      getDailySeries(range, totals.metric),
      getVideoRetention(range),
      getAdsWithCreatives(range, totals.metric),
      getSeguidores(range).catch(() => SEGUIDORES_ZERO),
    ]);
    return { totals, daily, retention, ads, seguidores };
  }, {
    totals: EMPTY_TOTALS,
    daily: [] as DailyPoint[],
    retention: [] as { label: string; value: number }[],
    ads: [] as AdCreativeRow[],
    seguidores: SEGUIDORES_ZERO,
  }, "desempenho");

  const { totals: t, daily, retention, ads, seguidores } = res.value;
  const m = t.metric;

  const bigNumbers: Kpi[] = [
    { label: "Investido", value: brl(t.spend, 0), delta: "", note: "" },
    { label: "Impressões", value: compact(t.impressions), delta: "", note: "" },
    { label: "Alcance", value: compact(t.reach), delta: "", note: "" },
    { label: m.label, value: num(t.conversions), delta: "", note: "" },
    t.followsAds > 0
      ? { label: "Seguidores via anúncios", value: num(t.followsAds), delta: "", note: "atribuídos à mídia" }
      : { label: "Novos seguidores", value: num(seguidores.novos), delta: "", note: "crescimento do perfil" },
    { label: "CTR", value: pctFmt(t.ctrLink), delta: "", note: "" },
    { label: "ThruPlays", value: compact(t.thruplays), delta: "", note: "" },
  ];

  const series: Series = daily.length
    ? {
        investimento: daily.map((d) => d.spend),
        cadastros: daily.map((d) => d.conversions),
        alcance: daily.map((d) => d.reach),
        cpa: daily.map((d) => d.cpa),
        interacoes: daily.map((d) => d.interacoes),
      }
    : EMPTY_SERIES;

  const totalInter = t.likes + t.comments + t.shares + t.saves + t.linkClicks || 1;
  const interacoes: LabeledBar[] = [
    { label: "Reações", value: num(t.likes), pct: (t.likes / totalInter) * 100, color: "#35D0FF" },
    { label: "Comentários", value: num(t.comments), pct: (t.comments / totalInter) * 100, color: "#2E8FFF" },
    { label: "Compartilhamentos", value: num(t.shares), pct: (t.shares / totalInter) * 100, color: "#9B7BFF" },
    { label: "Salvamentos", value: num(t.saves), pct: (t.saves / totalInter) * 100, color: "#F5B301" },
    { label: "Cliques no link", value: num(t.linkClicks), pct: (t.linkClicks / totalInter) * 100, color: "#21C46A" },
  ];

  // Tabela de interações por criativo, ordenada por taxa de engajamento —
  // taxa é comparável entre peças com entregas muito diferentes; volume não é.
  const interCriativo = [...ads]
    .filter((a) => a.impressions > 0)
    .sort((a, b) => b.engRate - a.engRate)
    .slice(0, 12)
    .map((a) => ({
      nome: a.label,
      impressoes: a.impressions,
      reacoes: a.reactions,
      comentarios: a.comments,
      compartilhamentos: a.shares,
      salvos: a.saves,
      taxa: a.engRate,
      cor: a.platform === "Instagram" ? "#9B7BFF" : a.platform === "Facebook" ? "#2E8FFF" : "#35D0FF",
    }));
  const retencao: LabeledBar[] = retention.map((r) => ({ label: r.label, value: decimal(r.value, 1) + "%", pct: r.value }));

  // Peça com melhor taxa e entrega abaixo da média é a candidata natural a
  // receber mais verba — é a leitura que a sala de mídia faz na tabela.
  let destaqueCriativo = "";
  if (interCriativo.length > 2) {
    const mediaImp = interCriativo.reduce((a, c) => a + c.impressoes, 0) / interCriativo.length;
    const top = interCriativo[0];
    if (top.impressoes < mediaImp) {
      destaqueCriativo = `"${top.nome}" tem a maior taxa (${pctFmt(top.taxa)}) com entrega abaixo da média das peças — candidata natural a receber verba.`;
    } else {
      destaqueCriativo = `"${top.nome}" lidera em taxa (${pctFmt(top.taxa)}) já com a maior entrega — pouco espaço para ganho só realocando verba.`;
    }
  }

  return {
    bigNumbers,
    series,
    dayLabels: daily.map((d) => dateBr(d.date)),
    interacoes,
    interCriativo,
    destaqueCriativo,
    retencao,
    // Rótulos do seletor de métrica: acompanham a conversão ativa no período.
    metricLabels: {
      investimento: "Investimento",
      cadastros: m.shortLabel,
      alcance: "Alcance",
      cpa: "CPA",
      interacoes: "Interações",
    } as Record<keyof Series, string>,
    source: sourceOf(res.ok),
  };
}

// ---------- 07 Eficiência ----------
export async function getEficienciaData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const campaigns = await getCampaigns(range, totals.metric);
    return { totals, campaigns };
  }, { totals: EMPTY_TOTALS, campaigns: [] as CampaignRow[] }, "eficiencia");

  const { totals: t, campaigns } = res.value;
  const m = t.metric;

  const eficKpis: Kpi[] = [
    { label: `${m.costLabel} médio`, value: t.cpa > 0 ? brl(t.cpa) : "—", delta: "", note: "", good: true },
    { label: "CPM", value: brl(t.cpm), delta: "", note: "" },
    { label: "Custo por clique no link", value: brl(t.cpcLink), delta: "", note: "" },
    { label: "Cliques no link", value: num(t.linkClicks), delta: "", note: "" },
    { label: "CTR do link", value: pctFmt(t.ctrLink), delta: "", note: "" },
  ];

  const withCpa = campaigns.filter((c) => c.cpa > 0);
  const cpaValues = withCpa.map((c) => c.cpa);
  const minCpa = cpaValues.length ? Math.min(...cpaValues) : 0;
  const maxCpa = cpaValues.length ? Math.max(...cpaValues) : 0;
  const eficRows = withCpa
    .slice()
    .sort((a, b) => a.cpa - b.cpa)
    .map((c) => ({
      name: c.label,
      cpa: brl(c.cpa),
      vol: num(c.conversions),
      color: "#2E8FFF",
      pct: maxCpa > minCpa ? 100 - ((c.cpa - minCpa) / (maxCpa - minCpa)) * 80 : 90,
      metricas: {
        investimento: c.spend,
        impressoes: c.impressions,
        alcance: c.reach,
        cliques: 0,
        resultados: c.conversions,
        cpa: c.cpa,
        cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      },
    }));

  const byObjective = new Map<string, { spend: number; conversions: number }>();
  for (const c of campaigns) {
    const entry = byObjective.get(c.objective) || { spend: 0, conversions: 0 };
    entry.spend += c.spend;
    entry.conversions += c.conversions;
    byObjective.set(c.objective, entry);
  }
  const objRows = Array.from(byObjective.entries()).map(([label, v]) => ({
    label,
    cpa: v.conversions > 0 ? v.spend / v.conversions : 0,
  }));
  const maxObjCpa = Math.max(...objRows.map((o) => o.cpa), 1);
  const eficObjetivo: LabeledBar[] = objRows
    .sort((a, b) => a.cpa - b.cpa)
    .map((o) => ({
      label: o.label,
      value: o.cpa > 0 ? brl(o.cpa) : "—",
      pct: o.cpa > 0 ? Math.max(10, 100 - (o.cpa / maxObjCpa) * 60) : 10,
      color: "#35D0FF",
    }));

  const desperdicio: string[] = [];
  const caras = campaigns.filter((c) => c.cpa > 0 && t.cpa > 0 && c.cpa > t.cpa * 1.25);
  for (const c of caras) {
    desperdicio.push(
      `"${c.label}": ${m.costLabel.toLowerCase()} de ${brl(c.cpa)} com ${brl(c.spend, 0)} investidos — ${Math.round(((c.cpa - t.cpa) / t.cpa) * 100)}% acima da média da conta.`,
    );
  }
  const semResultado = campaigns.filter((c) => c.spend > 0 && c.conversions === 0);
  for (const c of semResultado) {
    desperdicio.push(`"${c.label}": ${brl(c.spend, 0)} investidos sem ${m.unit} atribuído no período.`);
  }
  if (!desperdicio.length) {
    desperdicio.push(
      campaigns.length
        ? "Nenhuma campanha com custo fora da faixa da conta no período."
        : "Sem campanhas com entrega no período selecionado.",
    );
  }

  return { eficKpis, eficRows, eficObjetivo, desperdicio, costLabel: m.costLabel, resultLabel: m.shortLabel, source: sourceOf(res.ok) };
}

// ---------- 08 Território ----------
export type LinhaGeo = {
  nome: string;
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  cpa: number;
  cpm: number;
};

const paraLinha = (r: GeoRow): LinhaGeo => ({
  nome: r.name,
  investimento: r.spend,
  impressoes: r.impressions,
  alcance: r.reach,
  cliques: r.clicks,
  resultados: r.conversions,
  cpa: r.cpa,
  cpm: r.cpm,
});

export async function getTerritorioData(range: DateRange) {
  const metricRefRes = await safe(() => getAccountTotals(range), EMPTY_TOTALS, "territorio-metric");
  const metricRef = metricRefRes.value.metric;

  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    return getGeoBreakdown(range, totals.metric);
  }, { cities: [] as GeoRow[], regions: [] as GeoRow[], unmapped: [] as string[], estadual: null }, "territorio");

  const { cities, regions, unmapped } = res.value;
  // Município novo fora do mapa de macrorregiões não pode sumir em silêncio.
  if (unmapped.length) {
    console.warn(`[territorio] ${unmapped.length} município(s) sem macrorregião mapeada: ${unmapped.join(", ")}`);
  }

  return {
    municipios: cities.map(paraLinha),
    regioes: regions.map(paraLinha),
    metricLabel: metricRef.label.toLowerCase(),
    resultLabel: metricRef.shortLabel,
    costLabel: metricRef.costLabel,
    source: sourceOf(res.ok),
  };
}

// ---------- 09 Público ----------
export async function getPublicoData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const [age, devices, hours, segments] = await Promise.all([
      getAgeGenderBreakdown(range, totals.metric),
      getDeviceBreakdown(range, totals.metric),
      getHourlyBreakdown(range, totals.metric),
      getSegmentBreakdown(range, totals.metric),
    ]);
    return { totals, age, devices, hours, segments };
  }, {
    totals: EMPTY_TOTALS,
    age: [] as Awaited<ReturnType<typeof getAgeGenderBreakdown>>,
    devices: [] as Awaited<ReturnType<typeof getDeviceBreakdown>>,
    hours: [] as Awaited<ReturnType<typeof getHourlyBreakdown>>,
    segments: [] as Awaited<ReturnType<typeof getSegmentBreakdown>>,
  }, "publico");

  const { totals: t, age, devices, hours, segments } = res.value;

  // Cada quebra devolve TODAS as métricas; o cliente escolhe qual exibir.
  return {
    faixas: age.map((r) => ({ label: r.age, homens: r.male, mulheres: r.female, total: r.total })),
    dispositivos: devices.map(({ device, ...m }) => ({ label: device, ...m })),
    horarios: hours.map(({ hour, ...m }) => ({ label: hour, ...m })),
    segmentos: segments,
    resultLabel: t.metric.shortLabel,
    costLabel: t.metric.costLabel,
    source: sourceOf(res.ok),
  };
}

// ---------- 10 Biblioteca ----------
export type CandidatoGrupo = {
  pageId: string;
  candidato: string;
  proprio: boolean;
  total: number;
  ativos: number;
  /** true quando o total é um piso (bateu no teto do fetch). */
  truncado: boolean;
  erro?: string;
  cards: BibliotecaCard[];
};

function toBibliotecaCard(a: LibraryAd, thumbs: ThumbIndex): BibliotecaCard {
  return {
    id: a.id,
    status: a.status,
    copy: a.body || a.linkTitle || "(sem texto de anúncio)",
    start: a.startDate,
    plats: a.platforms || "—",
    spendLabel: a.spendLabel,
    impressionsLabel: a.impressionsLabel,
    snapshotUrl: a.snapshotUrl,
    candidato: a.candidato,
    proprio: a.proprio,
    // Concorrentes não têm miniatura: não temos acesso à conta de anúncios deles.
    thumbUrl: a.proprio ? thumbFor(thumbs, a.body)?.url : undefined,
    thumbBig: a.proprio ? thumbFor(thumbs, a.body)?.big : undefined,
  };
}

/**
 * Biblioteca de Anúncios do próprio candidato + das páginas concorrentes
 * monitoradas (ver META_AD_LIBRARY_PAGES). `biblioteca` mantém só os anúncios
 * do próprio candidato; `porCandidato` traz cada página separada, incluindo
 * os adversários.
 */
export async function getBibliotecaData() {
  if (!isLibraryConfigured()) {
    console.error("[dashboard] biblioteca: META_AD_LIBRARY_TOKEN/META_AD_LIBRARY_PAGES ausentes");
    return {
      biblioteca: [] as BibliotecaCard[],
      porCandidato: [] as CandidatoGrupo[],
      concorrentes: [] as CandidatoGrupo[],
      comparativoAtivos: { dias: [], series: [], totais: [] } as ComparativoAtivos,
      source: "erro" as Source,
    };
  }

  let ok = true;
  let grupos: CandidateLibrary[] = [];
  let thumbs: ThumbIndex = EMPTY_THUMBS;
  try {
    const [g, t] = await Promise.all([
      searchAdLibraryByCandidate(600),
      // A falha do índice de miniaturas não pode derrubar a Biblioteca.
      isMetaConfigured() ? getCreativeThumbs().catch(() => EMPTY_THUMBS) : Promise.resolve(EMPTY_THUMBS),
    ]);
    grupos = g;
    thumbs = t;
    if (grupos.every((x) => x.erro)) ok = false;
  } catch (err) {
    console.error("[dashboard] falha ao buscar biblioteca:", err);
    ok = false;
  }

  const porCandidato: CandidatoGrupo[] = grupos.map((g) => ({
    pageId: g.pageId,
    candidato: g.candidato,
    proprio: g.proprio,
    total: g.total,
    ativos: g.ativos,
    truncado: g.truncado,
    erro: g.erro,
    cards: g.ads.map((a) => toBibliotecaCard(a, thumbs)),
  }));

  const proprio = porCandidato.find((g) => g.proprio);

  return {
    biblioteca: proprio?.cards ?? [],
    porCandidato,
    concorrentes: porCandidato.filter((g) => !g.proprio),
    comparativoAtivos: serieAnunciosAtivos(grupos),
    source: sourceOf(ok),
  };
}

/** Paleta do comparativo: o próprio candidato sempre no ciano do painel. */
const CANDIDATO_CORES = ["#35D0FF", "#F5B301", "#9B7BFF", "#21C46A", "#E4222B", "#FF7A00", "#2E8FFF"];

export type ComparativoAtivos = {
  dias: string[];
  series: { candidato: string; color: string; proprio: boolean; values: number[] }[];
  /**
   * Totais por candidato somando as FAIXAS declaradas na Biblioteca. Cada
   * anúncio vem num intervalo (ex.: R$ 100–199), então o total também é um
   * intervalo: soma dos pisos até soma dos tetos. Não é valor exato — a Meta
   * não publica o número cheio de anúncio político.
   */
  totais: {
    candidato: string;
    color: string;
    proprio: boolean;
    ativos: number;
    total: number;
    gastoMin: number;
    gastoMax: number;
    imprMin: number;
    imprMax: number;
  }[];
};

/**
 * Quantos anúncios cada candidato manteve ativos em cada dia.
 *
 * Derivado das datas reais de veiculação de cada anúncio na Biblioteca: um
 * anúncio conta no dia D se começou até D e ainda não havia parado. Nenhuma
 * estimativa envolvida.
 */
function serieAnunciosAtivos(grupos: CandidateLibrary[]): ComparativoAtivos {
  const comAds = grupos.filter((g) => g.ads.some((a) => a.startISO));
  if (!comAds.length) return { dias: [], series: [], totais: [] };

  // A janela é montada A PARTIR DE HOJE, para trás. Montá-la a partir do anúncio
  // mais antigo faria o gráfico parar num passado distante quando um candidato
  // tem arquivo de eleições anteriores na Biblioteca.
  const JANELA_DIAS = 45;
  const hoje = new Date();
  const janelaISO: string[] = [];
  for (let i = JANELA_DIAS - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setUTCDate(d.getUTCDate() - i);
    janelaISO.push(d.toISOString().slice(0, 10));
  }

  const series = comAds.map((g, i) => ({
    candidato: g.candidato,
    color: g.proprio ? CANDIDATO_CORES[0] : CANDIDATO_CORES[(i % (CANDIDATO_CORES.length - 1)) + 1],
    proprio: g.proprio,
    values: janelaISO.map((d, i) =>
      // Último ponto = hoje: usa o mesmo critério de "ativo agora" do painel,
      // para o "N hoje" do gráfico bater com os "N ativos" da visão geral.
      i === janelaISO.length - 1
        ? g.ads.filter((a) => a.startISO && a.startISO <= d && estaAtivoAgora(a.stopTs)).length
        : g.ads.filter((a) => esteveAtivoEm(a.startISO, a.stopISO, d)).length,
    ),
  }));

  const totais = series.map((s) => {
    const g = comAds.find((x) => x.candidato === s.candidato);
    const ads = g?.ads ?? [];
    return {
      candidato: s.candidato,
      color: s.color,
      proprio: s.proprio,
      ativos: s.values[s.values.length - 1] ?? 0,
      total: ads.length,
      gastoMin: ads.reduce((a, x) => a + x.spendMin, 0),
      gastoMax: ads.reduce((a, x) => a + x.spendMax, 0),
      imprMin: ads.reduce((a, x) => a + x.impressionsMin, 0),
      imprMax: ads.reduce((a, x) => a + x.impressionsMax, 0),
    };
  });

  return { dias: janelaISO.map(dateBr), series, totais };
}


// ---------- 11 Linha do tempo ----------
export async function getTimelineData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const [activities, daily] = await Promise.all([
      getActivities(range, 100),
      getDailySeries(range, totals.metric),
    ]);
    return { totals, activities, daily };
  }, { totals: EMPTY_TOTALS, activities: [] as ActivityRow[], daily: [] as DailyPoint[] }, "timeline");

  const { totals: t, activities, daily } = res.value;

  const diario = groupActivitiesByDay(activities);

  // Efeitos observados: variações reais entre dias consecutivos da janela.
  const efeitos: string[] = [];
  for (let i = 1; i < daily.length; i++) {
    const prev = daily[i - 1];
    const curr = daily[i];
    if (prev.cpa > 0 && curr.cpa > 0) {
      const diff = ((curr.cpa - prev.cpa) / prev.cpa) * 100;
      if (Math.abs(diff) >= 10) {
        efeitos.push(
          `${dateBr(curr.date)}: ${t.metric.costLabel.toLowerCase()} ${diff < 0 ? "caiu" : "subiu"} ${decimal(Math.abs(diff), 1)}% ` +
          `frente a ${dateBr(prev.date)} (${brl(prev.cpa)} → ${brl(curr.cpa)}).`,
        );
      }
    }
    if (prev.spend > 0) {
      const diff = ((curr.spend - prev.spend) / prev.spend) * 100;
      if (Math.abs(diff) >= 30) {
        efeitos.push(
          `${dateBr(curr.date)}: investimento ${diff < 0 ? "recuou" : "cresceu"} ${decimal(Math.abs(diff), 1)}% ` +
          `(${brl(prev.spend, 0)} → ${brl(curr.spend, 0)}).`,
        );
      }
    }
  }
  if (!efeitos.length) {
    efeitos.push(
      daily.length > 1
        ? "Sem variação relevante de custo ou investimento entre os dias da janela."
        : "Janela com um único dia de entrega — sem base de comparação diária ainda.",
    );
  }

  return {
    diario,
    efeitos: efeitos.slice(0, 6),
    cpaSeries: daily.map((d) => d.cpa),
    dayLabels: daily.map((d) => dateBr(d.date)),
    source: sourceOf(res.ok),
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

// ---------- 12 Plataformas ----------
function buildStrengthSummary(
  platform: "Kwai" | "Meta",
  rows: ComparativoRow[],
  kwaiIniciada: boolean,
): { count: number; total: number; highlights: string[]; summary: string } {
  // "R$ 0" do Kwai não é dado: só conta como comparável o que tem valor dos dois lados.
  const comparaveis = rows.filter((r) => r.kwaiV !== "—" && r.metaV !== "—" && !/^R\$ 0(,00)?$/.test(r.kwaiV));
  const wins = comparaveis.filter((r) => r.winner === platform);
  if (platform === "Kwai" && !kwaiIniciada) {
    return {
      count: 0,
      total: rows.length,
      highlights: [],
      summary: `${KWAI_AVISO} no Kwai Ads — sem dados para comparar. A comparação entre plataformas fica disponível quando a veiculação começar.`,
    };
  }
  if (!comparaveis.length) {
    return {
      count: 0,
      total: rows.length,
      highlights: [],
      summary: "Ainda não há indicadores comparáveis entre as duas plataformas nesta janela.",
    };
  }
  return {
    count: wins.length,
    total: comparaveis.length,
    highlights: wins.map((r) => r.label),
    summary: `${platform} Ads lidera ${wins.length} de ${comparaveis.length} indicadores comparáveis.`,
  };
}

/** Sem dado do Kwai não existe vencedor: declarar "Meta" seria vitória por W.O. */
const SEM_VENCEDOR = "—" as ComparativoRow["winner"];

export async function getComparativoData(range: DateRange) {
  const kwai = await getKwaiTotals();
  const res = await safe(() => getAccountTotals(range), EMPTY_TOTALS, "comparativo");
  const t = res.value;
  const m = t.metric;
  const total = kwai.spend + t.spend;

  const platCards: PlatCard[] = [
    {
      name: "KWAI ADS",
      verdict: KWAI_AVISO,
      color: "#FF7A00",
      stats: [
        { value: total > 0 ? Math.round((kwai.spend / total) * 100) + "%" : "0%", label: "da verba" },
        { value: "—", label: m.costLabel.replace("Custo por ", "Custo/") },
        { value: "0", label: m.unitPlural.toLowerCase() },
      ],
    },
    {
      name: "META ADS",
      verdict: kwai.iniciada ? "Comparar" : "Única plataforma ativa",
      color: "#2E8FFF",
      stats: [
        { value: total > 0 ? Math.round((t.spend / total) * 100) + "%" : "0%", label: "da verba" },
        { value: t.cpa > 0 ? brl(t.cpa) : "—", label: m.costLabel.replace("Custo por ", "Custo/") },
        { value: num(t.conversions), label: m.unitPlural.toLowerCase() },
      ],
    },
  ];

  // Sem Kwai em veiculação, o lado esquerdo fica explicitamente vazio ("—")
  // em vez de receber número estimado.
  const comparativo: ComparativoRow[] = [
    { label: m.costLabel, kwaiV: "—", metaV: t.cpa > 0 ? brl(t.cpa) : "—", kwaiPct: 0, metaPct: t.cpa > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: `Volume de ${m.unitPlural.toLowerCase()}`, kwaiV: "—", metaV: num(t.conversions), kwaiPct: 0, metaPct: t.conversions > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: "Investimento", kwaiV: "—", metaV: brl(t.spend, 0), kwaiPct: 0, metaPct: t.spend > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: "Alcance único", kwaiV: "—", metaV: num(t.reach), kwaiPct: 0, metaPct: t.reach > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: "CTR", kwaiV: "—", metaV: pctFmt(t.ctr), kwaiPct: 0, metaPct: t.ctr > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: "Frequência", kwaiV: "—", metaV: decimal(t.frequency), kwaiPct: 0, metaPct: t.frequency > 0 ? 90 : 0, winner: SEM_VENCEDOR },
    { label: "CPM", kwaiV: "—", metaV: brl(t.cpm), kwaiPct: 0, metaPct: t.cpm > 0 ? 90 : 0, winner: SEM_VENCEDOR },
  ];

  return {
    platCards,
    comparativo,
    kwaiStrength: buildStrengthSummary("Kwai", comparativo, kwai.iniciada),
    metaStrength: buildStrengthSummary("Meta", comparativo, kwai.iniciada),
    source: sourceOf(res.ok),
  };
}

// ---------- 13 Simulador de cenários sobre o plano ----------
/**
 * Base de custo REAL por objetivo do plano.
 *
 * Cada campanha da conta é atribuída a um objetivo do plano (regras em
 * lib/plano.ts) e o CPM/CPA daquele objetivo sai do agregado dessas campanhas.
 * Objetivo sem campanha correspondente na janela fica com `temBase: false` e
 * NÃO recebe custo estimado — o simulador mostra a lacuna em vez de inventar.
 */
export type BaseObjetivo = {
  id: PlanoObjetivoId;
  label: string;
  color: string;
  papel: string;
  /** Meta de verba do plano. */
  verbaPlano: number;
  /** Já investido nesse objetivo na janela consultada. */
  investido: number;
  cpm: number;
  cpa: number;
  impressoes: number;
  conversions: number;
  campanhas: number;
  temBase: boolean;
};

export async function getSimuladorData(range: DateRange) {
  const res = await safe(async () => {
    const totals = await getAccountTotals(range);
    const campaigns = await getCampaigns(range, totals.metric);
    return { totals, campaigns };
  }, { totals: EMPTY_TOTALS, campaigns: [] as CampaignRow[] }, "simulador");

  const { totals: t, campaigns } = res.value;

  const agregados = new Map<PlanoObjetivoId, { spend: number; imp: number; conv: number; n: number }>();
  let semAtribuicao = 0;
  for (const c of campaigns) {
    const alvo = objetivoDaCampanha(c.objectiveRaw, c.name);
    if (!alvo) {
      semAtribuicao += c.spend;
      continue;
    }
    const e = agregados.get(alvo) || { spend: 0, imp: 0, conv: 0, n: 0 };
    e.spend += c.spend;
    e.imp += c.impressions;
    e.conv += c.conversions;
    e.n += 1;
    agregados.set(alvo, e);
  }

  const objetivos: BaseObjetivo[] = PLANO_OBJETIVOS.map((o) => {
    const a = agregados.get(o.id);
    const imp = a?.imp ?? 0;
    const spend = a?.spend ?? 0;
    const conv = a?.conv ?? 0;
    return {
      id: o.id,
      label: o.label,
      color: o.color,
      papel: o.papel,
      verbaPlano: o.verba,
      investido: spend,
      cpm: imp > 0 ? (spend / imp) * 1000 : 0,
      cpa: conv > 0 ? spend / conv : 0,
      impressoes: imp,
      conversions: conv,
      campanhas: a?.n ?? 0,
      temBase: spend > 0 && imp > 0,
    };
  });

  const fases = PLANO_FASES.map((f) => ({
    id: f.id,
    label: f.label,
    curto: f.curto,
    pct: f.pct,
    verba: f.verba,
    impressoesPlanoMi: f.impressoesMi,
    foco: f.foco,
    descricao: f.descricao,
    cpmPlanejado: cpmPlanejado(f),
  }));

  return {
    verbaTotal: VERBA_TOTAL,
    objetivos,
    fases,
    /** Métrica de conversão vigente, para os rótulos acompanharem a conta. */
    resultLabel: t.metric.shortLabel,
    unitPlural: t.metric.unitPlural,
    costLabel: t.metric.costLabel,
    /** CPM médio real da conta — referência quando o objetivo não tem base própria. */
    cpmConta: t.cpm,
    cpaConta: t.cpa,
    frequencia: t.frequency,
    investidoTotal: t.spend,
    /** Verba de campanhas que nenhuma regra de atribuição cobriu. */
    semAtribuicao,
    cpmPlanoGeral: cpmPlanejado(),
    impressoesPlanoMi: IMPRESSOES_PLANO_MI,
    source: sourceOf(res.ok),
  };
}
