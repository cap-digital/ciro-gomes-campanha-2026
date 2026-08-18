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
};

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
