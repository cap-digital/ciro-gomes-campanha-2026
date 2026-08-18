"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { atualizarDados } from "@/app/actions";

/**
 * Força uma releitura da API da Meta, ignorando o cache do Next.
 *
 * Dois passos: a server action descarta o cache das consultas marcadas com a
 * tag "meta", e o `router.refresh()` re-renderiza a rota atual — sem isso o
 * cache cairia mas a tela continuaria mostrando o que já estava pintado.
 */
export function BotaoAtualizar() {
  const router = useRouter();
  const [pendente, startTransition] = useTransition();
  const [emAtualizacao, setEmAtualizacao] = useState(false);
  const [horaUltima, setHoraUltima] = useState<string | null>(null);

  const ocupado = pendente || emAtualizacao;

  async function atualizar() {
    if (ocupado) return;
    setEmAtualizacao(true);
    try {
      await atualizarDados();
      startTransition(() => router.refresh());
      setHoraUltima(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } finally {
      setEmAtualizacao(false);
    }
  }

  return (
    <button
      onClick={atualizar}
      disabled={ocupado}
      title={horaUltima ? `Última atualização forçada às ${horaUltima}` : "Buscar os dados mais recentes na Meta"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        cursor: ocupado ? "progress" : "pointer",
        fontSize: 11,
        fontWeight: 600,
        padding: "6px 11px",
        borderRadius: 8,
        whiteSpace: "nowrap",
        background: "transparent",
        color: ocupado ? "var(--dim)" : "#35D0FF",
        border: "1px solid rgba(53,208,255,.35)",
        fontFamily: "inherit",
        opacity: ocupado ? 0.7 : 1,
      }}
    >
      <span
        className="ms"
        style={{
          fontSize: 14,
          lineHeight: 1,
          display: "block",
          animation: ocupado ? "girar 900ms linear infinite" : "none",
        }}
      >
        refresh
      </span>
      {ocupado ? "Atualizando…" : "Atualizar"}
    </button>
  );
}
