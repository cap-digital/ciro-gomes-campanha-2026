import { getTerritorioData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { TerritorioClient } from "@/components/TerritorioClient";

export default async function TerritorioPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getTerritorioData(range);

  return (
    <TerritorioClient
      municipios={data.municipios}
      regioes={data.regioes}
      resultLabel={data.resultLabel}
      costLabel={data.costLabel}
      source={data.source}
    />
  );
}
