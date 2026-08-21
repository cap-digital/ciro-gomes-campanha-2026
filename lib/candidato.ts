/**
 * Identidade do candidato exibida no painel. Os valores podem ser sobrescritos
 * pelas variáveis NEXT_PUBLIC_* (ver .env.example) sem tocar no código.
 */
export const CANDIDATO = process.env.NEXT_PUBLIC_CANDIDATO || "Ciro Gomes";
export const CARGO = process.env.NEXT_PUBLIC_CARGO || "Governador · Ceará";
export const PARTIDO = process.env.NEXT_PUBLIC_PARTIDO || "PSDB";
/** Número de urna. Aparece ao lado do nome na barra lateral. */
export const NUMERO = process.env.NEXT_PUBLIC_NUMERO || "45";
export const ANO = (process.env.NEXT_PUBLIC_DATA_ELEICAO || "2026").slice(0, 4);

/** Data do 1º turno (ISO). Base para a contagem regressiva e o pacing. */
export const DATA_ELEICAO = process.env.NEXT_PUBLIC_DATA_ELEICAO || "2026-10-04";

/** Dias restantes até o 1º turno, contados no fuso da conta. */
export function diasAteEleicao(hojeISO?: string): number {
  const hoje = hojeISO || new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
  const ms = new Date(`${DATA_ELEICAO}T00:00:00Z`).getTime() - new Date(`${hoje}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Foto oficial usada no hero e na sidebar (arquivo em /public). */
export const FOTO_CANDIDATO = "/ciro-gomes.png";
