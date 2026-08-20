import { getSimuladorData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { SimuladorClient } from "@/components/SimuladorClient";

export default async function SimuladorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const dados = await getSimuladorData(range);
  return <SimuladorClient dados={dados} />;
}
