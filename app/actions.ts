"use server";

import { updateTag } from "next/cache";

/**
 * Descarta o cache das consultas à Meta e força a próxima renderização a bater
 * na API de novo.
 *
 * Usa `updateTag` (e não `revalidateTag`): segundo a doc desta versão do Next,
 * `revalidateTag` serve conteúdo obsoleto enquanto revalida em segundo plano,
 * enquanto `updateTag` expira na hora — que é o que se espera de um botão
 * "Atualizar" clicado por quem acabou de mexer no gerenciador. Só funciona
 * dentro de Server Action, que é o caso aqui.
 */
export async function atualizarDados() {
  updateTag("meta");
}
