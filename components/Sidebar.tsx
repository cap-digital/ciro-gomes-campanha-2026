"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { CANDIDATO, NUMERO, FOTO_CANDIDATO } from "@/lib/candidato";
import { useTheme } from "./ThemeProvider";
import { sair } from "@/app/login/acoes";

/**
 * Aplica a largura da barra ANTES da primeira pintura.
 *
 * Sem isto a página abriria com a barra estreita e ela pularia para larga assim
 * que o React lesse a preferência — o mesmo tipo de piscada que o tema já
 * evitava. O atributo fica no <html>, e todo o resto é CSS.
 */
export const RAIL_INIT_SCRIPT = `
try {
  if (localStorage.getItem('rail') === 'aberto') {
    document.documentElement.setAttribute('data-rail', 'aberto');
  }
} catch (e) {}
`;

const railIcon = {
  width: 28,
  height: 28,
  flex: "0 0 28px",
  borderRadius: 99,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  /**
   * Cor explícita e clara: a barra lateral é escura NOS DOIS TEMAS. Sem isto os
   * ícones herdam --text, que no tema claro é azul-marinho — e some no fundo.
   */
  color: "rgba(255,255,255,.72)",
} as const;

function Tooltip({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <span
      className="rail-dica"
      style={{
        position: "absolute",
        left: 40,
        top: "50%",
        transform: "translateY(-50%)",
        background: "#0A1226",
        color: "#fff",
        fontSize: 11.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
        padding: "6px 11px",
        borderRadius: 9,
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 14px 28px -12px rgba(0,0,0,.8)",
        pointerEvents: "none",
        zIndex: 40,
        display: show ? "block" : "none",
      }}
    >
      {children}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hover, setHover] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [aberta, setAberta] = useState(false);
  const { theme, toggle } = useTheme();
  const qs = searchParams.toString();

  // Fecha ao trocar de página: o clique navega, e um menu aberto por cima do
  // conteúdo novo obrigaria um segundo toque só para sair dele.
  useEffect(() => setMenu(false), [pathname]);

  // Lê a preferência já aplicada pelo script de inicialização, para o botão
  // nascer com o rótulo certo.
  useEffect(() => {
    setAberta(document.documentElement.getAttribute("data-rail") === "aberto");
  }, []);

  /**
   * A gravação acontece só aqui, no clique — nunca num efeito de render. É a
   * mesma armadilha que derrubava o tema claro: um efeito que grava a cada
   * render salva o valor inicial por cima da preferência real.
   */
  function alternarBarra() {
    const proximo = !aberta;
    setAberta(proximo);
    const raiz = document.documentElement;
    if (proximo) raiz.setAttribute("data-rail", "aberto");
    else raiz.removeAttribute("data-rail");
    try {
      localStorage.setItem("rail", proximo ? "aberto" : "fechado");
    } catch {}
  }

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  return (
    <aside className="rail" style={{ width: 74, flex: "0 0 74px", padding: "8px 8px 8px 10px", display: "flex", flexDirection: "column", minHeight: 0, zIndex: 5 }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: "var(--rail)",
          borderRadius: 32,
          boxShadow: "var(--railShadow)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "10px 8px",
          gap: 6,
        }}
        className="rail-caixa"
      >
        {/* Foto e nome na mesma linha. Recolhida, a barra mostra só a foto;
            aberta, o nome entra à direita dela — e não abaixo, onde roubava
            uma linha inteira de altura da barra. */}
        <div className="rail-id" style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto", minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              flex: "0 0 38px",
              borderRadius: 99,
              background: "var(--slot8)",
              border: "2px solid rgba(255,255,255,.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image
              src={FOTO_CANDIDATO}
              alt={CANDIDATO}
              width={38}
              height={38}
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 14%" }}
            />
          </div>
          <span className="rail-rotulo rail-nome">
            {CANDIDATO} {NUMERO}
          </span>
        </div>

        <div className="rail-div" style={{ height: 1, width: 26, background: "rgba(255,255,255,.12)", flex: "0 0 1px" }} />

        {/* Menu de telas estreitas. Fica oculto no desktop pelo CSS; no celular
            ele substitui a fileira de ícones, que com 13 itens virava alvos
            minúsculos e sem rótulo — e cujo tooltip de hover ficava preso na
            tela depois do toque, porque toque não tem "sair do hover". */}
        <button
          className="rail-menu-botao"
          onClick={() => setMenu((v) => !v)}
          aria-expanded={menu}
          aria-label={menu ? "Fechar menu de navegação" : "Abrir menu de navegação"}
          style={{ display: "none", alignItems: "center", gap: 9, minHeight: 44, padding: "0 14px 0 10px", borderRadius: 99, cursor: "pointer", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", color: "#fff", fontFamily: "inherit" }}
        >
          <span className="ms" style={{ fontSize: 22, lineHeight: 1, color: "#fff" }}>{menu ? "close" : "menu"}</span>
          {/* "Menu", não o nome da página: o cabeçalho logo abaixo já diz em que
              tela você está, e repetir a palavra a 40px de distância não informa. */}
          <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>Menu</span>
        </button>

        {menu && (
          <>
            {/* Véu: fecha ao tocar fora, sem precisar acertar o botão de novo. */}
            <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, background: "rgba(4,10,26,.5)", zIndex: 40 }} />
            <nav
              className="rail-menu"
              style={{ position: "absolute", top: "calc(100% + 6px)", left: 8, right: 8, maxHeight: "78vh", overflowY: "auto", background: "var(--rail)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 18, boxShadow: "0 30px 60px -18px rgba(0,0,0,.85)", padding: 7, display: "flex", flexDirection: "column", gap: 2, zIndex: 41 }}
            >
              {NAV_ITEMS.map((item) => {
                const ativo = pathname === item.route;
                return (
                  <Link
                    key={item.id}
                    href={qs ? `${item.route}?${qs}` : item.route}
                    onClick={() => setMenu(false)}
                    scroll={false}
                    style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44, padding: "0 12px", borderRadius: 11, background: ativo ? "#fff" : "transparent", color: ativo ? "#0A1226" : "rgba(255,255,255,.82)", fontSize: 14, fontWeight: ativo ? 700 : 500 }}
                  >
                    <span className="ms" style={{ fontSize: 20, lineHeight: 1, color: ativo ? "#0A1226" : item.color, flex: "0 0 20px" }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </>
        )}

        <nav className="rail-nav" style={{ flex: "1 1 auto", overflow: "visible", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-evenly", gap: 0 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.route;
            return (
              <Link
                key={item.id}
                href={qs ? `${item.route}?${qs}` : item.route}
                onMouseEnter={() => setHover(item.id)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
                scroll={false}
              >
                <span
                  className="ms"
                  style={{
                    ...railIcon,
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "#0A1226" : "rgba(255,255,255,.62)",
                    boxShadow: active ? `0 8px 18px -6px ${item.color}99` : "none",
                    transition: "all .18s ease",
                  }}
                >
                  {item.icon}
                </span>
                {/* O rótulo está sempre no DOM: quem decide se aparece é o CSS,
                    conforme a barra esteja recolhida ou aberta. Renderizar
                    condicionalmente causaria diferença entre servidor e cliente. */}
                <span className="rail-rotulo">{item.label}</span>
                {/* Com a barra aberta o nome já está à vista — o balão vira ruído. */}
                <Tooltip show={hover === item.id && !aberta}>{item.label}</Tooltip>
              </Link>
            );
          })}
        </nav>

        <div className="rail-div" style={{ height: 1, width: 26, background: "rgba(255,255,255,.12)", flex: "0 0 1px" }} />

        {/* Expandir/recolher. Fica oculto no celular, onde a barra já virou
            faixa horizontal com menu próprio. */}
        <button
          className="rail-expandir"
          onClick={alternarBarra}
          aria-expanded={aberta}
          aria-label={aberta ? "Recolher a barra lateral" : "Expandir a barra lateral"}
          onMouseEnter={() => setHover("__expandir")}
          onMouseLeave={() => setHover(null)}
          style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", background: "none", border: "none", padding: 0, fontFamily: "inherit", flex: "0 0 auto" }}
        >
          <span
            className="ms"
            style={{
              ...railIcon,
              background: hover === "__expandir" ? "rgba(255,255,255,.12)" : "transparent",
              color: hover === "__expandir" ? "#fff" : railIcon.color,
              transition: "all .18s ease",
            }}
          >
            {aberta ? "chevron_left" : "chevron_right"}
          </span>
          <span className="rail-rotulo">{aberta ? "Recolher" : "Expandir"}</span>
          <Tooltip show={hover === "__expandir" && !aberta}>Expandir a barra</Tooltip>
        </button>

        <div className="rail-pe" style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            onClick={toggle}
            onMouseEnter={() => setHover("__theme")}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
          >
            <span
              className="ms"
              style={{
                ...railIcon,
                background: hover === "__theme" ? "rgba(255,255,255,.12)" : "transparent",
                color: hover === "__theme" ? "#fff" : railIcon.color,
                transition: "all .18s ease",
              }}
            >
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
            <span className="rail-rotulo">{theme === "dark" ? "Tema claro" : "Tema escuro"}</span>
            <Tooltip show={hover === "__theme" && !aberta}>{theme === "dark" ? "Tema claro" : "Tema escuro"}</Tooltip>
          </div>
          {/* O ícone já existia, mas não fazia nada. Vira um form porque sair
              encerra a sessão no servidor — não é navegação. */}
          <form
            action={sair}
            onMouseEnter={() => setHover("__exit")}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer", position: "relative", display: "flex", alignItems: "center", borderRadius: 99 }}
          >
          <button type="submit" aria-label="Sair do painel" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center" }}>
            <span
              className="ms"
              style={{
                ...railIcon,
                background: hover === "__exit" ? "rgba(255,255,255,.12)" : "transparent",
                color: hover === "__exit" ? "#fff" : railIcon.color,
                transition: "all .18s ease",
              }}
            >
              logout
            </span>
            <span className="rail-rotulo">Sair</span>
          </button>
            <Tooltip show={hover === "__exit" && !aberta}>Sair</Tooltip>
          </form>
        </div>
      </div>
    </aside>
  );
}
