"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { CANDIDATO, CARGO, ANO } from "@/lib/candidato";
import { ChipLink, ChipRow } from "./ui/Chip";
import { DateRangePicker } from "./DateRangePicker";
import { BotaoAtualizar } from "./BotaoAtualizar";

/**
 * Plataformas do painel.
 *
 * `indisponivel` marca a plataforma que ainda não veicula: o chip fica visível
 * (a campanha vai ter Kwai) mas não é clicável. Antes ele navegava para
 * ?platform=kwai sem que nada lesse esse parâmetro — o chip acendia e a tela
 * seguia mostrando os números do Meta, como se fossem do Kwai.
 * Quando o Kwai entrar, basta remover `indisponivel` e ligar o filtro na
 * camada de dados.
 */
const PLATFORMS: { id: string; label: string; accent?: string; indisponivel?: boolean }[] = [
  { id: "todas", label: "Todas" },
  { id: "kwai", label: "Kwai", accent: "#FF7A00", indisponivel: true },
  { id: "meta", label: "Meta", accent: "#2E8FFF" },
];

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = NAV_ITEMS.find((n) => n.route === pathname) ?? NAV_ITEMS[0];
  const platform = searchParams.get("platform") || "todas";

  function withParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <header
      style={{
        height: 60,
        flex: "0 0 60px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 20px",
        borderBottom: "1px solid var(--line)",
        background: "var(--panel2)",
        zIndex: 2,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "'Poppins',sans-serif",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-.01em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {current.label}
        </div>
        {/* Antes mostrava só a rota ("/campanhas"), que não diz nada a quem usa.
            Agora identifica de quem é o painel e de que eleição se trata. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden" }}>
          <span style={{ fontWeight: 700, color: "var(--text2)" }}>{CANDIDATO}</span>
          <span style={{ color: "var(--dim)" }}>·</span>
          <span>{CARGO}</span>
          <span style={{ color: "var(--dim)" }}>·</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontVariantNumeric: "tabular-nums" }}>{ANO}</span>
        </div>
      </div>

      <ChipRow>
        {PLATFORMS.map((p) =>
          p.indisponivel ? (
            <span
              key={p.id}
              title="Campanha ainda não iniciada no Kwai Ads"
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "6px 11px",
                borderRadius: 8,
                whiteSpace: "nowrap",
                color: "var(--dim)",
                border: "1px dashed var(--line)",
                cursor: "not-allowed",
              }}
            >
              {p.label}
            </span>
          ) : (
            <ChipLink key={p.id} href={withParam("platform", p.id)} active={platform === p.id} accent={p.accent}>
              {p.label}
            </ChipLink>
          ),
        )}
      </ChipRow>

      <DateRangePicker />

      <BotaoAtualizar />
    </header>
  );
}
