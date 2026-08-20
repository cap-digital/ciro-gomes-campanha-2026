import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { COOKIE_SESSAO, lerSessao } from "@/lib/auth";

/**
 * Moldura do painel — e a barreira de acesso que vale.
 *
 * O `proxy.ts` também redireciona quem não tem sessão, mas a própria
 * documentação do Next trata aquilo como checagem OTIMISTA: serve para desviar
 * o tráfego cedo, não para proteger. A verificação que conta é esta, no
 * servidor, no caminho por onde toda página do painel passa a renderizar.
 *
 * `(painel)` é um grupo de rotas: não aparece na URL, só existe para o /login
 * ficar de fora desta moldura e desta checagem.
 */
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const sessao = await lerSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) redirect("/login");

  return <AppShell>{children}</AppShell>;
}
