/**
 * Imposto sobre a mídia, e a conversão entre bruto e líquido.
 *
 * O plano de mídia é escrito em valores BRUTOS: os R$ 3.000.000 previstos já
 * incluem imposto. O que sai do gerenciador de anúncios é LÍQUIDO — é a mídia
 * de fato entregue, sem o imposto.
 *
 * Comparar os dois direto é o erro que este módulo existe para evitar: dá um
 * percentual de verba gasta menor do que o real, e uma média diária necessária
 * menor do que a real.
 *
 * A alíquota é uma fatia do BRUTO, não um acréscimo sobre o líquido:
 * de R$ 100 brutos, R$ 12,15 vão para imposto e R$ 87,85 viram mídia. Por isso
 * a volta é uma divisão, não uma soma de 12,15%.
 *
 * O Kwai não tem imposto: lá bruto e líquido são o mesmo número.
 */
export const IMPOSTO_META = 0.1215;

export type ModoImposto = "com" | "sem";

/** Lê o modo da URL, com "com imposto" como padrão (a linguagem do plano). */
export function resolveImposto(valor: unknown): ModoImposto {
  return valor === "sem" ? "sem" : "com";
}

/** Líquido → bruto. Use no que vem da Meta. */
export function paraBruto(liquido: number): number {
  return liquido / (1 - IMPOSTO_META);
}

/** Bruto → líquido. Use na verba do plano. */
export function paraLiquido(bruto: number): number {
  return bruto * (1 - IMPOSTO_META);
}

/** Alíquota formatada para a tela ("12,15%"). */
export const IMPOSTO_ROTULO = `${(IMPOSTO_META * 100).toFixed(2).replace(".", ",")}%`;
