import { brl, compact, num, pct } from "@/lib/format";

/**
 * Métricas prioritárias que o usuário pode escolher nos componentes.
 *
 * Um único lugar define rótulo, formatação e direção (custo: menor é melhor).
 * As páginas que oferecem seletor importam daqui, para o mesmo nome e a mesma
 * formatação valerem em Território, Público, Criativos, Campanhas e Eficiência.
 */
export type MetricaId = "investimento" | "impressoes" | "alcance" | "cliques" | "resultados" | "cpa" | "cpm";

export type MetricaDef = {
  id: MetricaId;
  label: string;
  /** Versão curta para chips com pouco espaço. */
  curto: string;
  /** Custos: menor é melhor — inverte a leitura de ranking e cor. */
  menorMelhor?: boolean;
  /** Médias/derivadas não podem ser somadas entre linhas. */
  derivada?: boolean;
  formatar: (v: number) => string;
  /** Forma compacta, para caber em card e rótulo de gráfico. */
  compacto: (v: number) => string;
};

export const METRICAS: Record<MetricaId, MetricaDef> = {
  investimento: {
    id: "investimento",
    label: "Investimento",
    curto: "Investimento",
    formatar: (v) => brl(v, 0),
    compacto: (v) => brl(v, 0),
  },
  impressoes: {
    id: "impressoes",
    label: "Impressões",
    curto: "Impressões",
    formatar: (v) => num(Math.round(v)),
    compacto: compact,
  },
  alcance: {
    id: "alcance",
    label: "Alcance",
    curto: "Alcance",
    formatar: (v) => num(Math.round(v)),
    compacto: compact,
  },
  cliques: {
    id: "cliques",
    label: "Cliques no link",
    curto: "Cliques",
    formatar: (v) => num(Math.round(v)),
    compacto: compact,
  },
  resultados: {
    id: "resultados",
    label: "Resultados",
    curto: "Resultados",
    formatar: (v) => num(Math.round(v)),
    compacto: compact,
  },
  cpa: {
    id: "cpa",
    label: "Custo por resultado",
    curto: "CPA",
    menorMelhor: true,
    derivada: true,
    formatar: (v) => (v > 0 ? brl(v) : "—"),
    compacto: (v) => (v > 0 ? brl(v) : "—"),
  },
  cpm: {
    id: "cpm",
    label: "CPM",
    curto: "CPM",
    menorMelhor: true,
    derivada: true,
    formatar: (v) => (v > 0 ? brl(v) : "—"),
    compacto: (v) => (v > 0 ? brl(v) : "—"),
  },
};

/** Números crus de uma linha qualquer (município, faixa, criativo, campanha). */
export type LinhaMetricas = {
  investimento: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  resultados: number;
  cpa: number;
  cpm: number;
};

export const LINHA_ZERO: LinhaMetricas = {
  investimento: 0, impressoes: 0, alcance: 0, cliques: 0, resultados: 0, cpa: 0, cpm: 0,
};

export function valorDe(linha: LinhaMetricas, id: MetricaId): number {
  return linha[id] ?? 0;
}

/**
 * Rótulo da métrica ajustado à conversão vigente da conta.
 * "Resultados"/"Custo por resultado" viram "Conversas"/"Custo por conversa" etc.
 */
export function rotularMetricas(shortLabel: string, costLabel: string): Record<MetricaId, MetricaDef> {
  return {
    ...METRICAS,
    resultados: { ...METRICAS.resultados, label: shortLabel, curto: shortLabel },
    cpa: { ...METRICAS.cpa, label: costLabel },
  };
}

/** Conjuntos usados por página — nem toda métrica faz sentido em todo lugar. */
export const METRICAS_TERRITORIO: MetricaId[] = ["alcance", "investimento", "impressoes", "cliques", "resultados", "cpa"];
export const METRICAS_PUBLICO: MetricaId[] = ["impressoes", "investimento", "cliques", "resultados", "cpa"];
export const METRICAS_CRIATIVOS: MetricaId[] = ["investimento", "impressoes", "cliques", "cpa"];
export const METRICAS_CAMPANHAS: MetricaId[] = ["investimento", "impressoes", "alcance", "resultados", "cpa"];
export const METRICAS_EFICIENCIA: MetricaId[] = ["cpa", "cpm", "investimento", "cliques", "resultados"];

/** Percentual seguro para largura de barra. */
export function pctDe(valor: number, max: number): number {
  if (!(max > 0) || !Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, (valor / max) * 100));
}

export { pct };
