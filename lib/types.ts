export type Kpi = { label: string; value: string; delta: string; note: string; good?: boolean };

export type CampaignRowView = {
  name: string;
  objective: string;
  spend: string;
  cpa: string;
  status: string;
  /** Números crus, para a lista poder trocar a métrica exibida. */
  metricas?: {
    investimento: number;
    impressoes: number;
    alcance: number;
    cliques: number;
    resultados: number;
    cpa: number;
    cpm: number;
  };
};

export type ResultCard = { label: string; value: string; delta: string; good?: boolean };

export type SplitCard = { name: string; pct: string; value: string; note: string; color: string };

export type CreativeCard = {
  name: string;
  platform: string;
  spend: string;
  cpa: string;
  score: number;
  thumbnailUrl?: string;
  /** Status do anúncio na conta (ATIVO, PAUSADO, EM ANÁLISE...). */
  status: string;
  /** Link público do post, para abrir o anúncio ao clicar na imagem. */
  permalink?: string;
  /** Valor da métrica pela qual a grade está ordenada. */
  ordemValue?: string;
};

/**
 * Critérios de ordenação da página de criativos.
 *
 * "Resultados" saiu de propósito: cada objetivo de campanha tem um resultado
 * diferente que importa (engajamento conta interação, reconhecimento conta
 * alcance, mensagens conta conversa). Ordenar peças de objetivos distintos por
 * um número só compara coisas que não são comparáveis. Ficam aqui apenas os
 * critérios que valem para qualquer objetivo.
 */
export const CRIATIVO_ORDENS = [
  { id: "investimento", label: "Investimento" },
  { id: "impressoes", label: "Impressões" },
  { id: "cliques", label: "Cliques" },
  { id: "cpa", label: "Menor CPA" },
] as const;

export type CriativoOrdem = (typeof CRIATIVO_ORDENS)[number]["id"];

export type AnaliseCard = { tag: string; title: string; text: string; src: string };

export type LabeledBar = { label: string; value: string; pct: number; color?: string };

export type AlteracaoRow = { time: string; title: string; detail: string };

export type RankRow = { rank: string; name: string; value: string; pct: number };

export type RegiaoRow = { name: string; invest: string; cad: string; cpa: string };

export type FaixaRow = { label: string; male: number; female: number };

export type SegmentoRow = { name: string; cad: string; cpa: string; good: boolean };

export type BibliotecaCard = {
  id: string;
  status: string;
  copy: string;
  start: string;
  plats: string;
  spendLabel?: string;
  impressionsLabel?: string;
  snapshotUrl?: string;
  /** Página/candidato de origem do anúncio (própria ou concorrente monitorado). */
  candidato?: string;
  proprio?: boolean;
  /** Miniatura real do criativo. Só existe para o próprio candidato (ver creativeThumbs). */
  thumbUrl?: string;
  /** true quando a imagem tem resolução cheia (não é a miniatura de 64px). */
  thumbBig?: boolean;
};

export type DiarioItem = { tag: string; title: string; detail: string; impact: string; up: boolean };
export type DiarioDay = { date: string; weekday: string; items: DiarioItem[] };

export type PlatCard = { name: string; verdict: string; color: string; stats: { value: string; label: string }[] };

export type ComparativoRow = {
  label: string;
  kwaiV: string;
  metaV: string;
  kwaiPct: number;
  metaPct: number;
  winner: "Kwai" | "Meta" | "—";
};

export type CenarioBar = { label: string; value: string; pct: number; active?: boolean };

export type Series = {
  investimento: number[];
  cadastros: number[];
  alcance: number[];
  cpa: number[];
  interacoes: number[];
};

export const METRIC_LABELS: Record<string, string> = {
  investimento: "Investimento",
  cadastros: "Cadastros",
  alcance: "Alcance",
  cpa: "CPA",
  interacoes: "Interações",
};
