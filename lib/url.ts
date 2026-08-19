export type SearchParams = Record<string, string | string[] | undefined>;

export function buildHref(route: string, searchParams: SearchParams, overrides: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") p.set(k, v);
  }
  // String vazia REMOVE o parâmetro. Serve para os filtros zerarem a página:
  // trocar de status estando na página 2 cairia num intervalo que talvez nem
  // exista no resultado novo.
  for (const [k, v] of Object.entries(overrides)) {
    if (v === "") p.delete(k);
    else p.set(k, v);
  }
  const qs = p.toString();
  return qs ? `${route}?${qs}` : route;
}
