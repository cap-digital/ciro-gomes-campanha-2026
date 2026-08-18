import type { Metadata } from "next";
import { ThemeProvider, THEME_INIT_SCRIPT } from "@/components/ThemeProvider";
import { AppShell } from "@/components/AppShell";
import { CANDIDATO } from "@/lib/candidato";
import "./globals.css";

export const metadata: Metadata = {
  title: `Painel de Campanha · ${CANDIDATO}`,
  description: "Central de inteligência de mídia — Kwai Ads + Meta Ads",
  // app/icon.svg é servido automaticamente pelo App Router; declarar aqui
  // garante o apple-touch-icon e evita a requisição a /favicon.ico.
  icons: { icon: "/icon.svg", shortcut: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
