"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtro por campanha. Escreve na URL (e não em estado local) para o recorte
 * sobreviver a refresh e poder ser compartilhado com a equipe.
 */
export function FiltroCampanha({ campanhas, atual }: { campanhas: string[]; atual: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function escolher(valor: string) {
    const p = new URLSearchParams(searchParams.toString());
    if (valor === "todas") p.delete("campanha");
    else p.set("campanha", valor);
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  if (!campanhas.length) return null;

  return (
    <select
      value={atual}
      onChange={(e) => escolher(e.target.value)}
      aria-label="Filtrar por campanha"
      style={{
        background: atual === "todas" ? "var(--soft)" : "#2E8FFF",
        border: `1px solid ${atual === "todas" ? "var(--line)" : "rgba(255,255,255,.18)"}`,
        color: atual === "todas" ? "var(--text2)" : "#fff",
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "inherit",
        padding: "6px 9px",
        maxWidth: 240,
        cursor: "pointer",
      }}
    >
      <option value="todas">Todas as campanhas</option>
      {campanhas.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}
