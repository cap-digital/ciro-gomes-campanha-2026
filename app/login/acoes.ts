"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_SESSAO, DURACAO_SESSAO_S, credenciaisConferem, criarSessao, lerSessao, turnstileValido } from "@/lib/auth";

export type EstadoLogin = { erro?: string };

/**
 * Entrada no painel.
 *
 * A ordem importa: o desafio da Cloudflare é conferido ANTES das credenciais.
 * Assim, quem tenta adivinhar a senha em massa precisa resolver um desafio a
 * cada tentativa, em vez de disparar milhares de requisições contra o
 * comparador.
 */
export async function entrar(_anterior: EstadoLogin, dados: FormData): Promise<EstadoLogin> {
  const usuario = String(dados.get("usuario") ?? "");
  const senha = String(dados.get("senha") ?? "");
  const desafio = String(dados.get("cf-turnstile-response") ?? "");

  const cabecalhos = await headers();
  const ip = cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim();

  if (!(await turnstileValido(desafio, ip))) {
    return { erro: "Não foi possível confirmar que você não é um robô. Recarregue a página e tente de novo." };
  }

  if (!credenciaisConferem(usuario, senha)) {
    // Espera antes de responder. Não impede um ataque decidido, mas encarece a
    // tentativa e some com a diferença de tempo entre "usuário existe" e não.
    await new Promise((r) => setTimeout(r, 600));
    // Mensagem única de propósito: dizer qual dos dois campos errou entrega
    // metade da credencial.
    return { erro: "Usuário ou senha incorretos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESSAO, await criarSessao(usuario), {
    httpOnly: true, // fora do alcance de qualquer JavaScript da página
    sameSite: "lax", // não acompanha requisição vinda de outro site
    secure: process.env.NODE_ENV === "production", // em https, só em https
    path: "/",
    maxAge: DURACAO_SESSAO_S,
  });

  // `redirect` funciona lançando — precisa ficar fora de try/catch.
  redirect("/inicio");
}

export async function sair(): Promise<void> {
  (await cookies()).delete(COOKIE_SESSAO);
  redirect("/login");
}

/** Usado pela tela de login para não pedir senha a quem já entrou. */
export async function jaAutenticado(): Promise<boolean> {
  return Boolean(await lerSessao((await cookies()).get(COOKIE_SESSAO)?.value));
}
