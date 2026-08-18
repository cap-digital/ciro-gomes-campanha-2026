/**
 * Agrupamento de municípios do Ceará em macrorregiões.
 *
 * Por que existe: a Graph API não entrega performance por município. O breakdown
 * `region` da Meta só desce até a unidade federativa — nesta conta ele devolve
 * uma linha só ("Ceará"). Os municípios vêm da segmentação dos conjuntos de
 * anúncios (`targeting.geo_locations.cities`), que é dado real da conta; o mapa
 * abaixo apenas agrupa esses municípios em regiões para o painel de Território.
 *
 * Isto é DADO DE REFERÊNCIA GEOGRÁFICA, não métrica: todos os números
 * (investimento, resultados, CPA) continuam vindo da API. Municípios que não
 * estiverem no mapa caem em "Outras regiões" — nada é perdido e nenhum total
 * fica errado. Para refinar, basta acrescentar entradas aqui.
 */

export const MACRORREGIOES = [
  "Grande Fortaleza",
  "Norte · Sobral",
  "Sertão Central · Inhamuns",
  "Cariri · Centro Sul",
  "Litoral Leste · Jaguaribe",
] as const;

export type Macrorregiao = (typeof MACRORREGIOES)[number] | "Outras regiões";

const MAP: Record<string, Macrorregiao> = {};

function register(regiao: Macrorregiao, municipios: string[]) {
  for (const m of municipios) MAP[normalize(m)] = regiao;
}

/** Remove acentos, caixa e pontuação para casar "SAO GONCALO" com "São Gonçalo". */
export function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

// Região Metropolitana de Fortaleza + entorno imediato
register("Grande Fortaleza", [
  "Fortaleza", "Caucaia", "Maracanaú", "Maranguape", "Pacatuba", "Eusébio", "Aquiraz",
  "Itaitinga", "Horizonte", "Pacajus", "São Gonçalo do Amarante", "Cascavel", "Chorozinho",
  "Guaiúba", "Paracuru", "Paraipaba", "Pindoretama", "São Luís do Curu", "Trairi",
  // Maciço de Baturité — vizinho imediato da RMF
  "Acarape", "Aracoiaba", "Aratuba", "Barreira", "Baturité", "Capistrano",
  "Guaramiranga", "Itapiúna", "Mulungu", "Ocara", "Pacoti", "Palmácia", "Redenção",
]);

// Norte, Litoral Norte, Serra da Ibiapaba e região de Sobral
register("Norte · Sobral", [
  "Sobral", "Camocim", "Granja", "Viçosa do Ceará", "Tianguá", "Ubajara", "São Benedito",
  "Guaraciaba do Norte", "Ipu", "Acaraú", "Itarema", "Amontada", "Itapipoca", "Itapajé",
  "Itapagé", "Uruburetama", "Massapê", "Coreaú", "Barroquinha", "Chaval", "Bela Cruz",
  "Marco", "Morrinhos", "Cruz", "Jijoca de Jericoacoara", "Reriutaba", "Cariré", "Groaíras",
  "Meruoca", "Alcântaras", "Pacujá", "Mucambo", "Frecheirinha", "Graça", "Pires Ferreira",
  "Varjota", "Carnaubal", "Senador Sá", "Moraújo", "Uruoca", "Martinópole", "Miraíma",
  "Tururu", "Umirim", "Apuiarés", "General Sampaio", "Pentecoste", "Itaitinga do Norte",
  "Santana do Acaraú", "Forquilha", "Irauçuba", "Tejuçuoca", "Trairí",
  "Croatá", "Hidrolândia", "Ibiapina",
]);

// Sertão Central, Inhamuns e Sertões de Crateús
register("Sertão Central · Inhamuns", [
  "Quixadá", "Quixeramobim", "Boa Viagem", "Pedra Branca", "Canindé", "Senador Pompeu",
  "Mombaça", "Solonópole", "Milhã", "Banabuiú", "Ibaretama", "Ibicuitinga", "Choró",
  "Tauá", "Arneiroz", "Aiuaba", "Parambu", "Quiterianópolis", "Independência", "Crateús",
  "Novo Oriente", "Ipaporanga", "Ararendá", "Poranga", "Ipueiras", "Catunda",
  "Monsenhor Tabosa", "Tamboril", "Nova Russas", "Santa Quitéria", "Deputado Irapuan Pinheiro",
  "Piquet Carneiro", "Paramoti", "Caridade", "Itatira", "Madalena", "Dep. Irapuan Pinheiro",
]);

// Cariri, Centro Sul e Vale do Salgado
register("Cariri · Centro Sul", [
  "Juazeiro do Norte", "Crato", "Barbalha", "Brejo Santo", "Mauriti", "Missão Velha",
  "Milagres", "Abaiara", "Jardim", "Porteiras", "Penaforte", "Jati", "Santana do Cariri",
  "Nova Olinda", "Farias Brito", "Altaneira", "Caririaçu", "Granjeiro", "Várzea Alegre",
  "Iguatu", "Acopiara", "Cedro", "Icó", "Orós", "Quixelô", "Baixio", "Ipaumirim",
  "Lavras da Mangabeira", "Umari", "Aurora", "Barro", "Assaré", "Antonina do Norte",
  "Araripe", "Campos Sales", "Potengi", "Salitre", "Tarrafas", "Catarina", "Saboeiro",
  "Cariús", "Jucás",
]);

// Litoral Leste e Vale do Jaguaribe
register("Litoral Leste · Jaguaribe", [
  "Aracati", "Beberibe", "Fortim", "Icapuí", "Itaiçaba", "Jaguaruana", "Russas",
  "Limoeiro do Norte", "Morada Nova", "Quixeré", "Tabuleiro do Norte", "Alto Santo",
  "São João do Jaguaribe", "Jaguaretama", "Jaguaribara", "Jaguaribe", "Pereiro", "Ererê",
  "Iracema", "Potiretama", "Palhano",
]);

/** Macrorregião de um município do Ceará; "Outras regiões" quando não mapeado. */
export function macrorregiaoDe(municipio: string): Macrorregiao {
  return MAP[normalize(municipio)] || "Outras regiões";
}

/** Ordem de exibição estável no painel. */
export function ordemMacrorregiao(nome: string): number {
  const i = (MACRORREGIOES as readonly string[]).indexOf(nome);
  return i === -1 ? MACRORREGIOES.length : i;
}
