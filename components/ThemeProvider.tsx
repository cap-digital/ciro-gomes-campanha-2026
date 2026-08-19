"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
type ThemeCtx = { theme: Theme; toggle: () => void };

const Ctx = createContext<ThemeCtx>({ theme: "dark", toggle: () => {} });

export const THEME_INIT_SCRIPT = `
try {
  var t = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as Theme | null) || "dark";
    setTheme(stored);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  /**
   * A gravação acontece só aqui, na escolha do usuário — nunca num efeito de
   * render.
   *
   * Antes o efeito acima também gravava. No primeiro render o estado ainda é o
   * "dark" do useState, então ele salvava "dark" por cima da preferência real
   * antes de o efeito de leitura chegar a aplicá-la. Com o StrictMode ligado
   * (next.config.mjs) o React monta os efeitos duas vezes, e na segunda a
   * leitura já encontrava o valor corrompido: quem escolhia o tema claro voltava
   * para o escuro a cada navegação, com o localStorage sobrescrito.
   */
  const toggle = () =>
    setTheme((t) => {
      const proximo: Theme = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("theme", proximo);
      } catch {}
      return proximo;
    });

  return <Ctx.Provider value={{ theme, toggle }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  return useContext(Ctx);
}
