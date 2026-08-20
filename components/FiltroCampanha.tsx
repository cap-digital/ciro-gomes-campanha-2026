"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtro por campanha, com seleção múltipla.
 *
 * Escreve na URL (e não em estado local) para o recorte sobreviver a refresh e
 * poder ser compartilhado com a equipe. Cada campanha vira um parâmetro
 * `campanha` repetido — em vez de um valor único com separador — porque nome de
 * campanha aqui traz colchetes, espaços e traços, e qualquer separador
 * escolhido acabaria aparecendo dentro de algum nome.
 */
export function FiltroCampanha({ campanhas, atuais }: { campanhas: string[]; atuais: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function fora(e: MouseEvent) {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    }
    function esc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      window.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function aplicar(selecionadas: string[]) {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("campanha");
    // Nenhuma marcada significa "todas": some com o parâmetro em vez de listar
    // as 4 campanhas na URL.
    if (selecionadas.length && selecionadas.length < campanhas.length) {
      for (const c of selecionadas) p.append("campanha", c);
    }
    // Volta para a primeira página: o resultado novo pode ter menos páginas que
    // a que está aberta agora.
    p.delete("pagina");
    const qs = p.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function alternar(c: string) {
    aplicar(atuais.includes(c) ? atuais.filter((x) => x !== c) : [...atuais, c]);
  }

  if (!campanhas.length) return null;

  const todas = atuais.length === 0;
  const rotulo = todas
    ? "Todas as campanhas"
    : atuais.length === 1
      ? atuais[0]
      : `${atuais.length} campanhas`;

  return (
    <div ref={caixa} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-label="Filtrar por campanha"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: todas ? "var(--soft)" : "#2E8FFF",
          border: `1px solid ${todas ? "var(--line)" : "rgba(255,255,255,.18)"}`,
          color: todas ? "var(--text2)" : "#fff",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "inherit",
          padding: "6px 9px",
          maxWidth: 260,
          cursor: "pointer",
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rotulo}</span>
        <span className="ms" style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>
          {aberto ? "expand_less" : "expand_more"}
        </span>
      </button>

      {aberto && (
        <div
          className="filtro-campanha"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 30,
            minWidth: 280,
            maxWidth: 420,
            maxHeight: 320,
            overflowY: "auto",
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            boxShadow: "var(--shadow)",
            padding: 7,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <button
            onClick={() => aplicar([])}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minHeight: 34,
              padding: "0 9px",
              borderRadius: 8,
              background: todas ? "var(--soft)" : "transparent",
              border: "none",
              color: "var(--text)",
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: "inherit",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            Todas as campanhas
          </button>
          <div style={{ height: 1, background: "var(--line)", margin: "3px 0" }} />
          {campanhas.map((c) => {
            const marcada = atuais.includes(c);
            return (
              <label
                key={c}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  minHeight: 34,
                  padding: "0 9px",
                  borderRadius: 8,
                  background: marcada ? "rgba(46,143,255,.14)" : "transparent",
                  fontSize: 11.5,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() => alternar(c)}
                  style={{ accentColor: "#2E8FFF", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
