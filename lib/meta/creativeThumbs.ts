import "server-only";
import { graphAccountAll, metaEnv } from "./graph";
import { parseAdSet, parseAd, tokens } from "./taxonomy";

/**
 * Miniaturas reais dos criativos, para o preview da Biblioteca de Anúncios.
 *
 * Por que precisa disto: a Ad Library API NÃO devolve imagem — os únicos campos
 * criativos são textos, mais o `ad_snapshot_url`, que embute o access_token e
 * portanto não pode ir para o navegador. Buscar o snapshot pelo servidor também
 * não resolve: a página monta as imagens por JavaScript.
 *
 * O que dá para fazer: para o PRÓPRIO candidato temos acesso à conta de anúncios,
 * e aí a Marketing API entrega `image_url`/`thumbnail_url` de verdade. Este módulo
 * indexa esses criativos e casa com os anúncios da Biblioteca por (1) texto do
 * criativo e (2) token de localização da taxonomia — que cobre os darkposts, cujo
 * corpo não vem preenchido.
 *
 * Para concorrentes não há caminho: não temos acesso à conta deles.
 */

type RawAd = {
  id: string;
  name?: string;
  creative?: {
    thumbnail_url?: string;
    image_url?: string;
    body?: string;
    object_story_spec?: {
      link_data?: { message?: string; picture?: string };
      video_data?: { message?: string; image_url?: string };
      photo_data?: { message?: string; url?: string };
    };
  };
};

/** `big` = veio de image_url (tamanho cheio). thumbnail_url é sempre 64x64. */
export type Thumb = { url: string; big: boolean };

export type ThumbIndex = {
  /** Miniatura pelo texto do criativo normalizado. */
  byBody: Map<string, Thumb>;
  /** Miniatura pelo município (token de LOCALIZACAO da taxonomia). */
  byLocal: Map<string, Thumb>;
  size: number;
};

export const EMPTY_THUMBS: ThumbIndex = { byBody: new Map(), byLocal: new Map(), size: 0 };

/** Normaliza texto para servir de chave: sem acento, sem espaço duplo, minúsculo. */
export function normText(s: string | undefined): string {
  return (s || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .slice(0, 80);
}

function normLocal(s: string | undefined): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function messageOf(ad: RawAd): string {
  const c = ad.creative;
  const spec = c?.object_story_spec;
  return c?.body || spec?.link_data?.message || spec?.video_data?.message || spec?.photo_data?.message || "";
}

function pictureOf(ad: RawAd): Thumb | undefined {
  const c = ad.creative;
  const spec = c?.object_story_spec;
  // image_url e as imagens do object_story_spec vêm em tamanho cheio;
  // thumbnail_url é sempre 64x64 e só serve como último recurso.
  const big = c?.image_url || spec?.video_data?.image_url || spec?.photo_data?.url || spec?.link_data?.picture;
  if (big) return { url: big, big: true };
  return c?.thumbnail_url ? { url: c.thumbnail_url, big: false } : undefined;
}

/**
 * Extrai o município citado num texto de anúncio da Biblioteca.
 * Ex.: "Juntos vamos mudar Granja. Ciro Governador 45." -> "GRANJA"
 */
export function localFromBody(body: string | undefined): string {
  const m = (body || "").match(/vamos mudar\s+([^.!?\n]+)/i);
  return m ? normLocal(m[1]) : "";
}

/** Indexa os criativos da conta de anúncios do próprio candidato. */
export async function getCreativeThumbs(): Promise<ThumbIndex> {
  const { accountId } = metaEnv();
  const ads = await graphAccountAll<RawAd>(`${accountId}/ads`, {
    fields: "id,name,creative{thumbnail_url,image_url,body,object_story_spec}",
  });

  const byBody = new Map<string, Thumb>();
  const byLocal = new Map<string, Thumb>();

  for (const ad of ads) {
    const pic = pictureOf(ad);
    if (!pic) continue;

    const body = messageOf(ad);
    if (body) byBody.set(normText(body), pic);

    // Darkposts não trazem corpo: caem no token de localização do nome.
    // O nome do anúncio pode ter a cidade tanto no seu próprio token quanto
    // herdada do conjunto — tenta os dois.
    const doAnuncio = parseAd(ad.name);
    const candidatos = [doAnuncio.nome, ...tokens(ad.name)].filter(Boolean) as string[];
    for (const c of candidatos) {
      const key = normLocal(c);
      if (key && key.length > 2 && !byLocal.has(key)) byLocal.set(key, pic);
    }
    if (body) {
      const local = localFromBody(body);
      if (local && !byLocal.has(local)) byLocal.set(local, pic);
    }
  }

  return { byBody, byLocal, size: byBody.size + byLocal.size };
}

/** Resolve a miniatura de um anúncio da Biblioteca, ou undefined se não houver. */
export function thumbFor(index: ThumbIndex, body: string | undefined): Thumb | undefined {
  const direct = index.byBody.get(normText(body));
  if (direct) return direct;
  const local = localFromBody(body);
  return local ? index.byLocal.get(local) : undefined;
}

/** Conjunto usado só para diagnóstico do parser de conjunto (mantém a API coesa). */
export const _internals = { normLocal, parseAdSet };
