import "server-only";
import { graphAccount, metaEnv, sumActionsExact, type GraphAction, type GraphInsightRow, type GraphPaged } from "./graph";
import type { DateRange } from "@/lib/period";

/**
 * Qual "resultado" o painel usa como conversão principal.
 *
 * A conta muda de objetivo ao longo da campanha: hoje só existe ENGAJAMENTO e
 * RECONHECIMENTO, amanhã podem entrar campanhas de cadastro/lead. Em vez de fixar
 * um action_type, o painel olha o que a conta realmente devolveu no período e
 * escolhe a melhor métrica disponível na escada abaixo — sem precisar de deploy.
 */
export type ConversionMetric = {
  key: string;
  /** action_types exatos somados para compor o volume. */
  actionTypes: string[];
  /** Rótulo plural usado nos KPIs. */
  label: string;
  /** Versão curta, para chips e seletores com pouco espaço. */
  shortLabel: string;
  /** Rótulo do custo unitário. */
  costLabel: string;
  /** Substantivo singular, para frases geradas. */
  unit: string;
  /** Substantivo plural, para frases geradas. */
  unitPlural: string;
  /** true quando não é um cadastro de fato, e sim o melhor proxy disponível. */
  isProxy: boolean;
  /**
   * Se o custo unitário desta métrica merece espaço na tela.
   *
   * "Conversa iniciada" conta uma janela de mensagem aberta, não uma intenção
   * declarada — dividir a verba por esse número dá um "custo" que ninguém usa
   * para decidir nada. Onde ele apareceria, o painel mostra CPM, que mede
   * compra de mídia e é comparável entre campanhas, contas e plataformas.
   */
  custoUtil: boolean;
};

/** Rótulo do custo que vale a pena mostrar para esta métrica. */
export function rotuloCusto(m: ConversionMetric): string {
  return m.custoUtil ? m.costLabel : "CPM";
}

/**
 * O mesmo rótulo, para uso no meio de uma frase.
 *
 * "Custo por cadastro" vira minúsculo naturalmente; "CPM" é sigla e ficaria
 * "cpm de R$ 4,17", que se lê como erro de digitação.
 */
export function rotuloCustoEmFrase(m: ConversionMetric): string {
  return m.custoUtil ? m.costLabel.toLowerCase() : rotuloCusto(m);
}

/** O valor que acompanha `rotuloCusto` — os dois andam sempre juntos. */
export function valorCusto(m: ConversionMetric, cpa: number, cpm: number): number {
  return m.custoUtil ? cpa : cpm;
}

/** CPM a partir de gasto e impressões, com guarda de divisão por zero. */
export function cpmDe(spend: number, impressions: number): number {
  return impressions > 0 ? (spend / impressions) * 1000 : 0;
}

/**
 * Ordem de preferência: do resultado mais "fundo de funil" para o mais raso.
 * A primeira faixa com volume > 0 no período vence.
 */
export const CONVERSION_LADDER: ConversionMetric[] = [
  {
    key: "cadastro",
    actionTypes: [
      "lead",
      "onsite_conversion.lead_grouped",
      "onsite_conversion.lead_form_submit",
      "offsite_conversion.fb_pixel_lead",
      "complete_registration",
      "offsite_conversion.fb_pixel_complete_registration",
      "submit_application",
      "onsite_conversion.messaging_welcome_message_view_lead",
    ],
    label: "Cadastros",
    shortLabel: "Cadastros",
    costLabel: "Custo por cadastro",
    unit: "cadastro",
    unitPlural: "cadastros",
    isProxy: false,
    custoUtil: true,
  },
  {
    key: "conversa",
    actionTypes: [
      "onsite_conversion.messaging_conversation_started_7d",
      "onsite_conversion.total_messaging_connection",
    ],
    label: "Conversas iniciadas",
    shortLabel: "Conversas",
    costLabel: "Custo por conversa",
    unit: "conversa",
    unitPlural: "conversas",
    isProxy: true,
    // Único degrau da escada cujo custo não vai para a tela. Ver `custoUtil`.
    custoUtil: false,
  },
  {
    key: "clique",
    actionTypes: ["link_click"],
    label: "Cliques no link",
    shortLabel: "Cliques",
    costLabel: "Custo por clique",
    unit: "clique",
    unitPlural: "cliques",
    isProxy: true,
    custoUtil: true,
  },
  {
    key: "engajamento",
    actionTypes: ["post_engagement"],
    label: "Engajamentos",
    shortLabel: "Engajamentos",
    costLabel: "Custo por engajamento",
    unit: "engajamento",
    unitPlural: "engajamentos",
    isProxy: true,
    custoUtil: true,
  },
];

/** Usada quando a conta ainda não devolveu nenhuma action (período sem entrega). */
export const EMPTY_METRIC: ConversionMetric = {
  key: "sem-resultado",
  actionTypes: [],
  label: "Resultados",
    shortLabel: "Resultados",
  costLabel: "Custo por resultado",
  unit: "resultado",
  unitPlural: "resultados",
  isProxy: true,
  custoUtil: true,
};

/**
 * Só soma o primeiro action_type com volume dentro da faixa. Evita dupla contagem
 * quando a Meta devolve variações da mesma conversão (ex.: `messaging_conversation_started_7d`
 * e `total_messaging_connection` descrevem o mesmo evento com janelas diferentes).
 */
export function countFor(actions: GraphAction[] | undefined, metric: ConversionMetric): number {
  for (const type of metric.actionTypes) {
    const v = sumActionsExact(actions, [type]);
    if (v > 0) return v;
  }
  return 0;
}

/** Escolhe a melhor métrica disponível a partir das actions realmente devolvidas. */
export function resolveFromActions(actions: GraphAction[] | undefined): ConversionMetric {
  if (!actions?.length) return EMPTY_METRIC;

  const forced = (process.env.META_CONVERSION_ACTION_TYPE || "").trim();
  if (forced) {
    const known = CONVERSION_LADDER.find((m) => m.actionTypes.includes(forced));
    if (known) return known;
    // action_type customizado (ex.: conversão personalizada do pixel)
    return {
      key: forced,
      actionTypes: [forced],
      label: "Conversões",
    shortLabel: "Conversões",
      costLabel: "Custo por conversão",
      unit: "conversão",
      unitPlural: "conversões",
      isProxy: false,
      // Conversão configurada à mão pela equipe: se foi escolhida de propósito,
      // o custo dela interessa.
      custoUtil: true,
    };
  }

  for (const metric of CONVERSION_LADDER) {
    if (countFor(actions, metric) > 0) return metric;
  }
  return EMPTY_METRIC;
}

/**
 * Resolve a métrica de conversão do período consultando a conta.
 * A chamada reaproveita o cache de fetch do Next (mesma URL das outras consultas
 * de insights), então não gera requisição extra na prática.
 */
export async function getConversionMetric(range: DateRange): Promise<ConversionMetric> {
  const { accountId } = metaEnv();
  const res = await graphAccount<GraphPaged<GraphInsightRow>>(`${accountId}/insights`, {
    fields: "actions",
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    level: "account",
  });
  return resolveFromActions(res.data?.[0]?.actions);
}
