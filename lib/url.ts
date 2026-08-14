export type SearchParams = Record<string, string | string[] | undefined>;

export function buildHref(route: string, searchParams: SearchParams, overrides: Record<string, string> = {}): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") p.set(k, v);
  }
  for (const [k, v] of Object.entries(overrides)) p.set(k, v);
  const qs = p.toString();
  return qs ? `${route}?${qs}` : route;
}
