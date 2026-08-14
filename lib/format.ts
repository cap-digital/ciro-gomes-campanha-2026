export function brl(v: number, d = 2): string {
  const value = Number.isFinite(v) ? v : 0;
  return (
    "R$ " +
    value.toLocaleString("pt-BR", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
}

export function num(v: number): string {
  const value = Number.isFinite(v) ? v : 0;
  return value.toLocaleString("pt-BR");
}

export function pct(v: number, d = 1): string {
  const value = Number.isFinite(v) ? v : 0;
  return value.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
}

export function compact(v: number): string {
  const value = Number.isFinite(v) ? v : 0;
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(2).replace(".", ",") + " mi";
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(1).replace(".", ",") + " mil";
  return num(value);
}

export function delta(curr: number, prev: number): string {
  if (!Number.isFinite(prev) || prev === 0) return "+0,0%";
  const d = ((curr - prev) / Math.abs(prev)) * 100;
  const sign = d >= 0 ? "+" : "";
  return sign + d.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%";
}

export function dateBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

export function dateBrFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
