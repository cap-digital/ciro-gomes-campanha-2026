"use client";

import { useActionState, useEffect, useRef } from "react";
import { entrar, type EstadoLogin } from "@/app/login/acoes";

/**
 * Widget do Turnstile.
 *
 * O script é carregado uma vez e o widget é montado à mão, em vez de deixar a
 * renderização automática cuidar disso: o React remonta o formulário a cada
 * tentativa falha, e a renderização automática duplicaria o desafio na tela.
 * O token é de uso único — depois de uma falha, o widget precisa ser reiniciado.
 */
function Turnstile({ siteKey, reiniciar }: { siteKey: string; reiniciar: number }) {
  const caixa = useRef<HTMLDivElement>(null);
  const idWidget = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    function montar() {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!api || !caixa.current || cancelado) return;
      if (idWidget.current) {
        api.reset(idWidget.current);
        return;
      }
      idWidget.current = api.render(caixa.current, { sitekey: siteKey, theme: "dark" });
    }

    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) {
      montar();
    } else {
      const existente = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      if (existente) {
        existente.addEventListener("load", montar);
      } else {
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.defer = true;
        s.dataset.turnstile = "1";
        s.addEventListener("load", montar);
        document.head.appendChild(s);
      }
    }
    return () => {
      cancelado = true;
    };
  }, [siteKey, reiniciar]);

  return <div ref={caixa} style={{ minHeight: 65 }} />;
}

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; theme?: string }) => string;
  reset: (id: string) => void;
};

const campo: React.CSSProperties = {
  background: "var(--soft)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 13.5,
  color: "var(--text)",
  fontFamily: "inherit",
  width: "100%",
};

export function FormularioLogin({ siteKey }: { siteKey: string | null }) {
  const [estado, acao, enviando] = useActionState<EstadoLogin, FormData>(entrar, {});

  return (
    <form action={acao} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>Usuário</span>
        <input name="usuario" autoComplete="username" required autoFocus style={campo} />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 10, letterSpacing: ".14em", color: "var(--muted)", textTransform: "uppercase" }}>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required style={campo} />
      </label>

      {/* `reiniciar` muda a cada erro: o token do Turnstile vale uma vez só, e
          sem reiniciar o widget a segunda tentativa falharia sozinha. */}
      {siteKey && <Turnstile siteKey={siteKey} reiniciar={estado.erro ? 1 : 0} />}

      {estado.erro && (
        <div
          role="alert"
          style={{
            background: "var(--warnBg)",
            border: "1px solid var(--warnBorder)",
            color: "var(--warnText)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {estado.erro}
        </div>
      )}

      <button
        type="submit"
        disabled={enviando}
        style={{
          cursor: enviando ? "progress" : "pointer",
          background: "linear-gradient(135deg,#2E8FFF 0%,#35D0FF 100%)",
          color: "#04122B",
          border: "1px solid rgba(255,255,255,.22)",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13.5,
          fontWeight: 700,
          fontFamily: "inherit",
          opacity: enviando ? 0.7 : 1,
          marginTop: 2,
        }}
      >
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
