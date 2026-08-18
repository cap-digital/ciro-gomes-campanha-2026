/**
 * Plano de mídia da campanha — Ciro Gomes, Governador do Ceará 2026.
 *
 * ESTE É O ÚNICO LUGAR A EDITAR quando o plano mudar. O simulador, o pacing e
 * as comparações plano×realizado leem tudo daqui; nada é replicado em outro
 * arquivo. Os valores abaixo vieram do plano de mídia entregue pela campanha.
 *
 * Regra: aqui ficam METAS (o que se pretende gastar). Custo real (CPM/CPA) nunca
 * é escrito aqui — vem sempre da API da Meta.
 */

export type PlanoObjetivoId = "conversao" | "engajamento" | "whatsapp" | "regionalizacao" | "seguidores";

export type PlanoObjetivo = {
  id: PlanoObjetivoId;
  label: string;
  verba: number;
  /** Frase curta do plano: para que esse objetivo serve. */
  papel: string;
  descricao: string;
  color: string;
};

export const VERBA_TOTAL = 2_000_000;

export const PLANO_OBJETIVOS: PlanoObjetivo[] = [
  {
    id: "conversao",
    label: "Conversão",
    verba: 565_000,
    papel: "O que ganha voto",
    descricao:
      "A conversa persuasiva com quem ainda pende para a oposição, feita para mover a decisão. É a prioridade da reta final.",
    color: "#35D0FF",
  },
  {
    id: "engajamento",
    label: "Engajamento",
    verba: 446_000,
    papel: "Abastece todo o funil",
    descricao:
      "Mantém a página viva e gera curtidas, comentários e compartilhamentos. É o que dá credibilidade ao candidato e forma o público que será convertido depois.",
    color: "#2E8FFF",
  },
  {
    id: "whatsapp",
    label: "Grupos de WhatsApp",
    verba: 351_000,
    papel: "Canal direto até o voto",
    descricao:
      "Traz mais gente para os grupos, um canal de contato direto e recorrente com o eleitor, que não depende do alcance das redes. Ganha peso da fase 2 em diante.",
    color: "#21C46A",
  },
  {
    id: "regionalizacao",
    label: "Regionalização",
    verba: 344_000,
    papel: "Precisão por cidade",
    descricao:
      "Leva a mensagem certa para cada cidade do Ceará, falando com a realidade local — mais atenção e menos desperdício de verba.",
    color: "#F5B301",
  },
  {
    id: "seguidores",
    label: "Novos seguidores",
    verba: 294_000,
    papel: "Base própria e futura",
    descricao:
      "Cresce a base de seguidores: um canal próprio e gratuito que rende alcance nas fases seguintes e um contato direto até o dia do voto.",
    color: "#9B7BFF",
  },
];

export type PlanoFaseId = "f1" | "f2" | "f3";

export type PlanoFase = {
  id: PlanoFaseId;
  label: string;
  curto: string;
  pct: number;
  verba: number;
  /** Impressões projetadas pelo próprio plano, em milhões. */
  impressoesMi: number;
  foco: string;
  descricao: string;
};

export const PLANO_FASES: PlanoFase[] = [
  {
    id: "f1",
    label: "Fase 1 · Início",
    curto: "Início",
    pct: 25,
    verba: 500_000,
    impressoesMi: 52.5,
    foco: "Base: engajamento + seguidores",
    descricao:
      "Construir base. Peso maior em engajamento e novos seguidores, com a regionalização mapeando as cidades e os grupos de WhatsApp começando a encher. A conversão fica quase zerada: primeiro é preciso formar público.",
  },
  {
    id: "f2",
    label: "Fase 2 · Meio",
    curto: "Meio",
    pct: 35,
    verba: 700_000,
    impressoesMi: 65.1,
    foco: "Consolidação + início da conversão",
    descricao:
      "Consolidar e virar a chave. O engajamento segue forte, os grupos de WhatsApp ganham peso como canal direto e a conversão começa a ligar, conforme os públicos amadurecem.",
  },
  {
    id: "f3",
    label: "Fase 3 · Reta final",
    curto: "Reta final",
    pct: 40,
    verba: 800_000,
    impressoesMi: 59.9,
    foco: "Voto — conversão direta",
    descricao:
      "Vira-voto domina. Metade da verba da fase vai para a conversão, falando com quem ainda pende para a oposição. Os grupos de WhatsApp seguem fortes o canal direto até o dia do voto.",
  },
];

/**
 * Como cada campanha real da conta é atribuída a um objetivo do plano.
 *
 * A atribuição é EXCLUSIVA e na ordem abaixo (a primeira que casar vence), para
 * a mesma verba nunca ser contada em dois objetivos. Isso importa porque
 * "Regionalização" no plano é uma tática que atravessa os outros objetivos: as
 * campanhas geolocalizadas também são de engajamento. Aqui elas contam como
 * regionalização, e o engajamento fica com as campanhas de alcance geral.
 *
 * As regras olham o objetivo da Meta e os tokens da taxonomia de nomes. Se a
 * equipe mudar o padrão de nome, ajuste aqui.
 */
export type RegraAtribuicao = {
  objetivo: PlanoObjetivoId;
  /** Casa contra o `objective` bruto da Meta (OUTCOME_*). */
  objetivoMeta?: RegExp;
  /** Casa contra o nome completo da campanha (tokens da taxonomia). */
  nome?: RegExp;
};

export const REGRAS_ATRIBUICAO: RegraAtribuicao[] = [
  { objetivo: "whatsapp", objetivoMeta: /MESSAGES/i, nome: /WHATS|MENSAG|CONVERSA|GRUPO/i },
  { objetivo: "conversao", objetivoMeta: /OUTCOME_LEADS|OUTCOME_SALES|CONVERSIONS|LEAD_GENERATION/i, nome: /CONVERS[AÃ]O|CADASTRO|VOTO/i },
  { objetivo: "seguidores", objetivoMeta: /PAGE_LIKES/i, nome: /SEGUIDOR|CURTIDA.*P[AÁ]GINA|FOLLOW/i },
  { objetivo: "regionalizacao", nome: /GEOLOCALIZAD|CIDADES|MUNIC[IÍ]PIO|REGIONAL/i },
  { objetivo: "engajamento", objetivoMeta: /OUTCOME_ENGAGEMENT|OUTCOME_AWARENESS|POST_ENGAGEMENT|VIDEO_VIEWS|REACH|BRAND_AWARENESS/i },
];

/** Objetivo do plano correspondente a uma campanha real; null se nada casar. */
export function objetivoDaCampanha(objetivoMeta: string, nome: string): PlanoObjetivoId | null {
  for (const r of REGRAS_ATRIBUICAO) {
    const casaObjetivo = r.objetivoMeta ? r.objetivoMeta.test(objetivoMeta) : false;
    const casaNome = r.nome ? r.nome.test(nome) : false;
    if (casaObjetivo || casaNome) return r.objetivo;
  }
  return null;
}

export const objetivoPorId = (id: PlanoObjetivoId) => PLANO_OBJETIVOS.find((o) => o.id === id);
export const fasePorId = (id: PlanoFaseId) => PLANO_FASES.find((f) => f.id === id);

/** Impressões totais projetadas pelo plano (milhões). */
export const IMPRESSOES_PLANO_MI = PLANO_FASES.reduce((a, f) => a + f.impressoesMi, 0);

/** CPM que o plano assume, derivado das próprias metas de verba e impressões. */
export function cpmPlanejado(fase?: PlanoFase): number {
  const verba = fase ? fase.verba : VERBA_TOTAL;
  const imp = (fase ? fase.impressoesMi : IMPRESSOES_PLANO_MI) * 1_000_000;
  return imp > 0 ? (verba / imp) * 1000 : 0;
}
