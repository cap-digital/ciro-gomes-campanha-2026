export type Kpi = { label: string; value: string; delta: string; note: string; good?: boolean };

export type CampaignRowView = {
  name: string;
  objective: string;
  spend: string;
  cpa: string;
  status: string;
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
};

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
  winner: "Kwai" | "Meta";
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
