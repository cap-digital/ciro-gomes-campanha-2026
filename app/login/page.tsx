import Image from "next/image";
import { redirect } from "next/navigation";
import { CANDIDATO, CARGO, ANO, FOTO_CANDIDATO } from "@/lib/candidato";
import { FormularioLogin } from "@/components/FormularioLogin";
import { jaAutenticado } from "./acoes";

export const metadata = { title: `Entrar · Painel ${CANDIDATO}` };

export default async function LoginPage() {
  // Quem já tem sessão não precisa ver a tela de senha de novo.
  if (await jaAutenticado()) redirect("/inicio");

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="login-caixa"
        style={{
          width: "min(880px,100%)",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,.9fr)",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 22,
          boxShadow: "var(--shadow)",
          overflow: "hidden",
        }}
      >
        {/* Lado da identidade: mesma linguagem do herói do painel, para quem
            entra reconhecer de imediato onde está. */}
        <div
          className="login-marca"
          style={{
            position: "relative",
            padding: "34px 32px",
            background: "linear-gradient(115deg,#0B2A6B 0%,#0E3E9E 45%,#1157C9 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 24,
            minHeight: 380,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                fontFamily: "'Inter',sans-serif",
                fontSize: 10,
                letterSpacing: ".28em",
                color: "#9CC8FF",
                textTransform: "uppercase",
              }}
            >
              Painel de campanha
            </div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Poppins',sans-serif",
                fontWeight: 900,
                fontSize: "clamp(24px,3vw,34px)",
                lineHeight: 0.98,
                letterSpacing: "-.02em",
                textTransform: "uppercase",
                color: "#fff",
              }}
            >
              Central de
              <br />
              inteligência
              <br />
              <span style={{ color: "#35D0FF" }}>de mídia</span>
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                flex: "0 0 46px",
                borderRadius: 99,
                overflow: "hidden",
                border: "2px solid rgba(255,255,255,.28)",
                background: "var(--slot8)",
              }}
            >
              <Image
                src={FOTO_CANDIDATO}
                alt={CANDIDATO}
                width={46}
                height={46}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 14%" }}
              />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>{CANDIDATO}</div>
              <div style={{ fontSize: 11, color: "#B9CCF2" }}>
                {CARGO} · {ANO}
              </div>
            </div>
          </div>

          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 5, display: "flex" }}>
            <div style={{ flex: 1, background: "#E4222B" }} />
            <div style={{ flex: 2, background: "#35D0FF" }} />
          </div>
        </div>

        <div style={{ padding: "34px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontWeight: 800, fontSize: 17 }}>Acesso restrito</div>
            <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
              Este painel mostra investimento e desempenho da campanha. Entre com as credenciais da equipe.
            </div>
          </div>

          <FormularioLogin siteKey={siteKey} />
        </div>
      </div>
    </div>
  );
}
