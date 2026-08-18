import "server-only";
import { graphAccount, metaEnv } from "./graph";
import type { DateRange } from "@/lib/period";

/**
 * Crescimento de seguidores do perfil do Instagram.
 *
 * Vem da Instagram Graph API (`/{ig-id}/insights?metric=follower_count`), não
 * dos insights de anúncio: a conta de anúncios não expõe nenhuma action de
 * "seguir". Portanto este número é o crescimento do PERFIL — soma o efeito de
 * mídia paga e de conteúdo orgânico, e não é atribuível só à campanha.
 *
 * A janela da API é limitada a 30 dias por requisição.
 */

const MAX_DIAS = 30;

export type SeguidoresPeriodo = {
  /** Novos seguidores somados no período consultado. */
  novos: number;
  /** Total de seguidores do perfil hoje. */
  total: number;
  /** @cirogomes, para exibição. */
  username: string;
  /** Série diária, para gráfico. */
  diario: { date: string; novos: number }[];
  /** true quando a janela pedida foi cortada pelo limite de 30 dias da API. */
  janelaCortada: boolean;
};

export const SEGUIDORES_ZERO: SeguidoresPeriodo = {
  novos: 0,
  total: 0,
  username: "",
  diario: [],
  janelaCortada: false,
};

type PerfilIg = { id: string; username: string; followers_count: number };

/**
 * Descobre o perfil do Instagram ligado à página monitorada.
 * Pode ser fixado por META_INSTAGRAM_ID quando a página tiver mais de um.
 */
async function getPerfil(): Promise<PerfilIg | null> {
  const fixo = (process.env.META_INSTAGRAM_ID || "").trim();
  if (fixo) {
    const p = await graphAccount<PerfilIg>(fixo, { fields: "id,username,followers_count" }, 3600);
    return p?.id ? p : null;
  }

  const pageId = metaEnv().libraryPages.split(",")[0]?.split(":")[0]?.trim();
  if (!pageId) return null;

  const res = await graphAccount<{ instagram_business_account?: PerfilIg }>(
    pageId,
    { fields: "instagram_business_account{id,username,followers_count}" },
    3600,
  );
  return res.instagram_business_account?.id ? res.instagram_business_account : null;
}

/** Recorta a janela para o máximo aceito pela API do Instagram. */
function janelaValida(range: DateRange): { since: string; until: string; cortada: boolean } {
  const until = new Date(`${range.until}T00:00:00Z`);
  const since = new Date(`${range.since}T00:00:00Z`);
  const dias = Math.round((until.getTime() - since.getTime()) / 86400000);
  if (dias <= MAX_DIAS) return { since: range.since, until: range.until, cortada: false };
  const novoSince = new Date(until);
  novoSince.setUTCDate(novoSince.getUTCDate() - MAX_DIAS);
  return { since: novoSince.toISOString().slice(0, 10), until: range.until, cortada: true };
}

export async function getSeguidores(range: DateRange): Promise<SeguidoresPeriodo> {
  const perfil = await getPerfil();
  if (!perfil) return SEGUIDORES_ZERO;

  const janela = janelaValida(range);
  const res = await graphAccount<{ data?: { name: string; values: { end_time: string; value: number }[] }[] }>(
    `${perfil.id}/insights`,
    {
      metric: "follower_count",
      period: "day",
      since: janela.since,
      until: janela.until,
    },
    600,
  );

  const serie = res.data?.find((d) => d.name === "follower_count")?.values ?? [];
  const diario = serie.map((v) => ({ date: v.end_time.slice(0, 10), novos: Number(v.value) || 0 }));

  return {
    novos: diario.reduce((a, d) => a + d.novos, 0),
    total: perfil.followers_count || 0,
    username: perfil.username || "",
    diario,
    janelaCortada: janela.cortada,
  };
}
