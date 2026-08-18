import { getBibliotecaData } from "@/lib/dashboard";
import { BibliotecaClient } from "@/components/BibliotecaClient";

export const dynamic = "force-dynamic";

export default async function BibliotecaPage() {
  const data = await getBibliotecaData();
  return (
    <BibliotecaClient
      porCandidato={data.porCandidato}
      comparativoAtivos={data.comparativoAtivos}
      source={data.source}
    />
  );
}
