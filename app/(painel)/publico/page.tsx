import { getPublicoData } from "@/lib/dashboard";
import { resolveRange } from "@/lib/period";
import type { SearchParams } from "@/lib/url";
import { PublicoClient } from "@/components/PublicoClient";

export default async function PublicoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const data = await getPublicoData(range);

  return (
    <PublicoClient
      faixas={data.faixas}
      dispositivos={data.dispositivos}
      horarios={data.horarios}
      segmentos={data.segmentos}
      resultLabel={data.resultLabel}
      costLabel={data.costLabel}
      source={data.source}
    />
  );
}
