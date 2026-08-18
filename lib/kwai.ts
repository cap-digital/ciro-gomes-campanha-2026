import "server-only";
import type { CampaignRowView } from "@/lib/types";

/**
 * Kwai Ads — a campanha ainda não começou nesta plataforma.
 *
 * Enquanto não houver credenciais, o painel mostra a plataforma explicitamente
 * zerada e sinalizada, em vez de esconder o bloco ou preencher com estimativa.
 * Quando os tokens chegarem, basta preencher KWAI_ACCESS_TOKEN / KWAI_ACCOUNT_ID
 * e implementar `getKwaiTotals` com a chamada real — todo o resto do painel já
 * consome estes mesmos campos.
 */

export const KWAI_AVISO = "Campanha ainda não iniciada";
export const KWAI_DETALHE = "Sem veiculação no Kwai Ads até o momento";

export function isKwaiConfigured(): boolean {
  return Boolean(process.env.KWAI_ACCESS_TOKEN && process.env.KWAI_ACCOUNT_ID);
}

export type KwaiTotals = {
  iniciada: boolean;
  spend: number;
  impressions: number;
  reach: number;
  conversions: number;
  cpa: number;
  cpm: number;
  ctr: number;
  frequency: number;
};

export const KWAI_ZERADO: KwaiTotals = {
  iniciada: false,
  spend: 0,
  impressions: 0,
  reach: 0,
  conversions: 0,
  cpa: 0,
  cpm: 0,
  ctr: 0,
  frequency: 0,
};

export async function getKwaiTotals(): Promise<KwaiTotals> {
  // Sem integração ativa: retorna zerado e sinalizado como não iniciada.
  if (!isKwaiConfigured()) return KWAI_ZERADO;
  return KWAI_ZERADO;
}

/**
 * Linha única na lista de campanhas informando o estado da plataforma.
 * Usa o mesmo formato das campanhas reais para não alterar o componente de lista.
 */
export function kwaiCampaignRows(): CampaignRowView[] {
  return [
    {
      name: KWAI_AVISO,
      objective: KWAI_DETALHE,
      spend: "R$ 0,00",
      cpa: "—",
      status: "NÃO INICIADA",
    },
  ];
}
