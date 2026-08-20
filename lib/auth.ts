/**
 * Acesso ao painel: sessão assinada em cookie, sem banco e sem dependência.
 *
 * É um painel de um usuário só. Em vez de guardar sessões em algum lugar, o
 * cookie carrega o próprio conteúdo (quem e até quando) e uma assinatura HMAC
 * feita com AUTH_SECRET. Sem o segredo não dá para forjar; com ele, o servidor
 * confere em memória, sem ida a lugar nenhum.
 *
 * Usa Web Crypto (`crypto.subtle`), e não o `crypto` do Node, porque este
 * módulo é importado também pelo `proxy.ts` — que pode acabar rodando fora do
 * runtime principal.
 */

export const COOKIE_SESSAO = "painel_sessao";

/** Quanto tempo a sessão vale. Sete dias: o painel é consultado todo dia. */
export const DURACAO_SESSAO_S = 7 * 24 * 60 * 60;

type Sessao = { u: string; exp: number };

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(norm + "=".repeat((4 - (norm.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function chave(segredo: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function assinar(dados: string, segredo: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await chave(segredo), new TextEncoder().encode(dados));
  return b64url(new Uint8Array(mac));
}

/**
 * Comparação em tempo constante.
 *
 * `a === b` para de comparar no primeiro byte diferente, e o tempo dessa parada
 * conta ao atacante quantos bytes ele já acertou. Aqui o laço percorre tudo
 * sempre, e a diferença de tamanho vira diferença de conteúdo.
 */
function igualEmTempoConstante(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    dif |= (x[i] ?? 0) ^ (y[i] ?? 0);
  }
  return dif === 0;
}

function segredoObrigatorio(): string {
  const s = process.env.AUTH_SECRET;
  // Falha alto e cedo: sem segredo, "assinar" viraria teatro e qualquer um
  // montaria um cookie válido.
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET ausente ou curto demais — a sessão não pode ser assinada.");
  }
  return s;
}

/** Token de sessão para gravar no cookie. */
export async function criarSessao(usuario: string): Promise<string> {
  const corpo: Sessao = { u: usuario, exp: Math.floor(Date.now() / 1000) + DURACAO_SESSAO_S };
  const dados = b64url(new TextEncoder().encode(JSON.stringify(corpo)));
  return `${dados}.${await assinar(dados, segredoObrigatorio())}`;
}

/** Devolve a sessão se o token for autêntico e estiver no prazo; senão, null. */
export async function lerSessao(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  const [dados, assinatura] = token.split(".");
  if (!dados || !assinatura) return null;
  try {
    const esperada = await assinar(dados, segredoObrigatorio());
    if (!igualEmTempoConstante(assinatura, esperada)) return null;
    const corpo = JSON.parse(new TextDecoder().decode(deB64url(dados))) as Sessao;
    if (!corpo?.exp || corpo.exp * 1000 < Date.now()) return null;
    return corpo;
  } catch {
    return null;
  }
}

/** Confere usuário e senha contra as variáveis de ambiente. */
export function credenciaisConferem(usuario: string, senha: string): boolean {
  const u = process.env.AUTH_EMAIL;
  const s = process.env.AUTH_SENHA;
  if (!u || !s) return false;
  // Os dois lados são sempre avaliados: com `&&` o resultado do primeiro diria
  // se o usuário existe antes mesmo de a senha ser olhada.
  const okUsuario = igualEmTempoConstante(usuario.trim(), u);
  const okSenha = igualEmTempoConstante(senha, s);
  return okUsuario && okSenha;
}

/**
 * Valida o desafio do Turnstile junto à Cloudflare.
 *
 * Sem esta checagem no SERVIDOR o widget é só enfeite: o formulário pode ser
 * enviado direto, sem passar pela página. O token é de uso único.
 */
export async function turnstileValido(token: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Sem chave configurada o desafio não é exigido — é o que permite rodar o
  // painel localmente sem credenciais da Cloudflare.
  if (!secret) return true;
  if (!token) return false;

  const corpo = new URLSearchParams({ secret, response: token });
  if (ip) corpo.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: corpo,
      cache: "no-store",
    });
    const json = (await r.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

/** O Turnstile só aparece se houver chave de site configurada. */
export const TURNSTILE_ATIVO = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
