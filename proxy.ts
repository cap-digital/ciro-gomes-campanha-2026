import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, lerSessao } from "@/lib/auth";

/**
 * Desvia para /login quem não tem sessão.
 *
 * Nesta versão do Next o arquivo `middleware.ts` foi renomeado para `proxy.ts`
 * (ver node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md).
 *
 * Esta checagem é OTIMISTA, como a própria documentação classifica: serve para
 * cortar o tráfego cedo, não é a barreira de segurança. A barreira está em
 * `app/(painel)/layout.tsx`, no servidor, por onde toda página do painel passa.
 * Um proxy sozinho já foi contornado por cabeçalho forjado no passado — por
 * isso as duas camadas, e não só esta.
 */
export default async function proxy(req: NextRequest) {
  const sessao = await lerSessao(req.cookies.get(COOKIE_SESSAO)?.value);
  if (sessao) return NextResponse.next();

  const destino = new URL("/login", req.url);
  return NextResponse.redirect(destino);
}

export const config = {
  /**
   * Tudo, menos: a própria tela de login, os arquivos internos do Next, o
   * favicon e a foto do candidato — que a tela de login precisa carregar antes
   * de haver sessão.
   */
  matcher: ["/((?!login|_next/static|_next/image|icon.svg|favicon.ico|.*\\.png$).*)"],
};
