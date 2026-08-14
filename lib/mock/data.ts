import { brl, num } from "@/lib/format";
import type {
  Kpi,
  CampaignRowView,
  ResultCard,
  SplitCard,
  CreativeCard,
  AnaliseCard,
  LabeledBar,
  AlteracaoRow,
  RankRow,
  RegiaoRow,
  FaixaRow,
  SegmentoRow,
  BibliotecaCard,
  DiarioDay,
  PlatCard,
  ComparativoRow,
  Series,
} from "@/lib/types";

/**
 * Dataset ilustrativo usado quando MOCK_DADOS=true ou como referência/placeholder
 * para o que a API da Kwai forneceria (sem credenciais configuradas neste projeto).
 */

export const series: Series = {
  investimento: [18400, 21200, 19800, 24500, 28900, 26400, 31200, 29800, 34100, 32600, 37400, 35900, 41200, 38700],
  cadastros: [980, 1120, 1040, 1310, 1580, 1420, 1690, 1610, 1880, 1740, 2020, 1950, 2210, 2090],
  alcance: [41000, 46500, 44200, 52800, 61200, 57400, 68300, 64900, 74100, 70200, 81600, 77300, 88400, 83900],
  cpa: [18.8, 18.9, 19.0, 18.7, 18.3, 18.6, 18.5, 18.5, 18.1, 18.7, 18.5, 18.4, 18.6, 18.5],
  interacoes: [6200, 7100, 6800, 8400, 9600, 9100, 10800, 10200, 11900, 11100, 12800, 12200, 13900, 13100],
};

export const dayLabels = ["02/08", "03/08", "04/08", "05/08", "06/08", "07/08", "08/08"];

export const heroKpis: Kpi[] = [
  { value: brl(487213.44), label: "Investido", delta: "+5,5%", note: "acima do pacing" },
  { value: "2,41 mi", label: "Pessoas alcançadas", delta: "+7,1%", note: "alcance único" },
  { value: "6,08 mi", label: "Impressões", delta: "-3,5%", note: "exibições" },
  { value: "26.312", label: "Cadastros", delta: "+9,4%", note: "no período" },
  { value: brl(18.52), label: "Custo por cadastro", delta: "-2,8%", note: "média da janela", good: true },
];

export const totalInvest = brl(487213.44);

export const splitCards: SplitCard[] = [
  { name: "Kwai Ads", pct: "38%", value: brl(185141.1), note: "4 campanhas · CPA R$ 16,20", color: "#FF7A00" },
  { name: "Meta Ads", pct: "62%", value: brl(302072.34), note: "5 campanhas · CPA R$ 20,10", color: "#2E8FFF" },
];

export const resultCards: ResultCard[] = [
  { label: "Impressões", value: "6,08 mi", delta: "-3,5%" },
  { label: "Alcance único", value: "2,41 mi", delta: "+7,1%" },
  { label: "Frequência", value: "2,52", delta: "+1,2%" },
  { label: "Cliques no link", value: "184.902", delta: "+6,3%" },
  { label: "CTR", value: "3,04%", delta: "+0,4%" },
  { label: "CPM", value: brl(80.13), delta: "-1,9%", good: true },
];

export const kwaiCampaigns: CampaignRowView[] = [
  { name: "KW · Cadastro Salvador", objective: "Conversão · lead", spend: brl(64210), cpa: "R$ 15,40", status: "ATIVA" },
  { name: "KW · Vídeo Interior BA", objective: "Visualizações", spend: brl(48930), cpa: "R$ 17,10", status: "ATIVA" },
  { name: "KW · Retargeting 30d", objective: "Conversão · lead", spend: brl(41200), cpa: "R$ 14,80", status: "ATIVA" },
  { name: "KW · Teste criativo agosto", objective: "Alcance", spend: brl(30801), cpa: "R$ 19,60", status: "TESTE" },
];

export const metaCampaigns: CampaignRowView[] = [
  { name: "MT · Cadastro RMS", objective: "Geração de cadastros", spend: brl(98420), cpa: "R$ 18,90", status: "ATIVA" },
  { name: "MT · Vídeo institucional", objective: "ThruPlay", spend: brl(72310), cpa: "R$ 21,40", status: "ATIVA" },
  { name: "MT · Interior — Feira/Vitória", objective: "Geração de cadastros", spend: brl(58900), cpa: "R$ 20,10", status: "ATIVA" },
  { name: "MT · Retargeting engajados", objective: "Conversão", spend: brl(44120), cpa: "R$ 16,70", status: "ATIVA" },
  { name: "MT · Público frio 25-44", objective: "Alcance", spend: brl(28322), cpa: "R$ 24,30", status: "PAUSADA" },
];

export const criativos: CreativeCard[] = [
  ["Vídeo 30s · Saúde", "Kwai", 48210, 16.1, 86],
  ["Carrossel · Obras", "Meta", 39100, 19.4, 72],
  ["Reels · Depoimento", "Meta", 35400, 17.8, 79],
  ["Vídeo 15s · Emprego", "Kwai", 31200, 15.2, 91],
  ["Estático · Cadastro", "Meta", 28700, 21.9, 58],
  ["Vídeo 45s · Interior", "Kwai", 26400, 18.6, 66],
  ["Reels · Educação", "Meta", 24100, 20.3, 61],
  ["Vídeo 20s · Segurança", "Kwai", 21800, 16.9, 74],
  ["Estático · Agenda", "Meta", 18300, 23.1, 49],
  ["Vídeo 30s · Mobilidade", "Kwai", 15900, 17.4, 68],
].map(([name, platform, spend, cpa, score]) => ({
  name: name as string,
  platform: platform as string,
  spend: brl(spend as number, 0),
  cpa: brl(cpa as number),
  score: score as number,
}));

export const analiseHeadline =
  "Nos últimos 7 dias o investimento cresceu 5,5% e os cadastros 9,4%, com CPA caindo para R$ 18,52. O Kwai entrega cadastro 19% mais barato, mas o Meta responde por 62% do volume total e concentra o alcance no interior.";

export const analises: AnaliseCard[] = [
  ["EFICIÊNCIA", "Kwai puxa o CPA médio para baixo", "Com 38% da verba o Kwai gera 44% dos cadastros. Cada R$ 10 mil deslocados para lá projetam ~180 cadastros adicionais.", "Kwai Ads"],
  ["ALCANCE", "Frequência subindo em Salvador", "A frequência na RMS chegou a 3,1 contra 2,1 no interior. Sinal de saturação — vale ampliar público ou trocar criativo.", "Meta Ads"],
  ["CRIATIVO", "Vídeo curto domina a conversão", "Peças de até 20s respondem por 61% dos cadastros e retêm 48% até o fim, contra 27% dos vídeos longos.", "Ambas"],
  ["PÚBLICO", "25-44 concentra o cadastro", "A faixa 25-44 é 57% dos cadastros com CPA 12% abaixo da média. 55+ tem o maior custo.", "Meta Ads"],
  ["TERRITÓRIO", "Interior com espaço para escala", "Feira de Santana e Vitória da Conquista têm CPA abaixo da média e cobertura de apenas 41% do público estimado.", "Ambas"],
  ["RITMO", "Pacing 5,5% acima do planejado", "Mantido o ritmo atual, a verba do mês se esgota 3 dias antes do fim da janela.", "Planejamento"],
].map(([tag, title, text, src]) => ({ tag, title, text, src }));

export const sinais: LabeledBar[] = [
  { label: "Saturação de frequência", value: "78/100", pct: 78, color: "#E4222B" },
  { label: "Qualidade do criativo", value: "86/100", pct: 86, color: "#21C46A" },
  { label: "Cobertura territorial", value: "54/100", pct: 54, color: "#F5B301" },
  { label: "Eficiência de custo", value: "72/100", pct: 72, color: "#35D0FF" },
  { label: "Diversidade de público", value: "63/100", pct: 63, color: "#9B7BFF" },
  { label: "Ritmo de entrega", value: "91/100", pct: 91, color: "#2E8FFF" },
];

export const atencao: string[] = [
  "Frequência acima de 3,0 na RMS há 4 dias seguidos.",
  "Campanha MT · Público frio 25-44 com CPA 31% acima da média — pausada em 07/08.",
  "Pacing projeta esgotamento da verba 3 dias antes do fim do mês.",
];

export const periodoKpis: Kpi[] = [
  { label: "Investido no período", value: brl(487213.44), delta: "+5,5%", note: "vs janela anterior" },
  { label: "Alcance único", value: "2,41 mi", delta: "+7,1%", note: "pessoas distintas" },
  { label: "Cadastros", value: "26.312", delta: "+9,4%", note: "formulários completos" },
  { label: "CPA", value: brl(18.52), delta: "-2,8%", note: "custo por cadastro", good: true },
];

export const leitura: string[] = [
  "A janela de 7 dias fechou com R$ 487.213,44 investidos e 26.312 cadastros. O custo por cadastro caiu de R$ 19,05 para R$ 18,52, movimento puxado principalmente pelo Kwai, que operou a R$ 16,20.",
  "O alcance único cresceu 7,1% enquanto as impressões recuaram 3,5% — a campanha ficou menos repetitiva e mais ampla, efeito da troca de criativos feita em 05/08.",
  "O Meta segue como base de volume: 62% da verba e 56% dos cadastros, com forte presença na Região Metropolitana. O Kwai concentra performance no interior e em públicos mais jovens.",
  "Recomendação para a próxima janela: deslocar de 8% a 12% da verba do Meta para o Kwai no interior, e renovar as peças da RMS antes que a frequência ultrapasse 3,5.",
];

export const alteracoes: AlteracaoRow[] = [
  { time: "08/08 09:12", title: "Orçamento ajustado", detail: "KW · Retargeting 30d: R$ 6k → R$ 8,5k/dia" },
  { time: "07/08 18:40", title: "Campanha pausada", detail: "MT · Público frio 25-44 — CPA 31% acima da média" },
  { time: "07/08 11:05", title: "Novo criativo", detail: "3 peças de vídeo 15s subidas no Kwai" },
  { time: "06/08 16:22", title: "Público ampliado", detail: "MT · Interior: raio 40km → 65km" },
  { time: "05/08 08:50", title: "Troca de criativos", detail: "RMS: 4 peças substituídas por saturação" },
];

export const criativosMini = [
  ["Vídeo 30s · Saúde", "CPA R$ 16,10"],
  ["Carrossel · Obras", "CPA R$ 19,40"],
  ["Reels · Depoimento", "CPA R$ 17,80"],
  ["Vídeo 15s · Emprego", "CPA R$ 15,20"],
  ["Estático · Cadastro", "CPA R$ 21,90"],
  ["Vídeo 45s · Interior", "CPA R$ 18,60"],
].map(([name, metric]) => ({ name, metric }));

export const bigNumbers: Kpi[] = [
  { label: "Investido", value: brl(487213, 0), delta: "+5,5%", note: "" },
  { label: "Impressões", value: "6,08 mi", delta: "-3,5%", note: "" },
  { label: "Alcance", value: "2,41 mi", delta: "+7,1%", note: "" },
  { label: "Cadastros", value: "26.312", delta: "+9,4%", note: "" },
  { label: "CPA", value: brl(18.52), delta: "-2,8%", note: "", good: true },
  { label: "CTR", value: "3,04%", delta: "+0,4%", note: "" },
  { label: "ThruPlay", value: "1,42 mi", delta: "+11,2%", note: "" },
];

export const interacoes: LabeledBar[] = [
  { label: "Curtidas", value: num(48210), pct: 100, color: "#35D0FF" },
  { label: "Comentários", value: num(12840), pct: 34, color: "#2E8FFF" },
  { label: "Compartilhamentos", value: num(9310), pct: 26, color: "#9B7BFF" },
  { label: "Salvamentos", value: num(6120), pct: 18, color: "#F5B301" },
  { label: "Cliques no perfil", value: num(21400), pct: 52, color: "#21C46A" },
];

export const interCriativo = [92, 78, 71, 64, 58, 49, 41, 33].map((v, i) => ({ label: "C" + (i + 1), pct: v }));

export const retencao: LabeledBar[] = [
  ["0s", 100],
  ["25%", 74],
  ["50%", 58],
  ["75%", 44],
  ["100%", 31],
].map(([label, v]) => ({ label: label as string, value: v + "%", pct: v as number }));

export const eficKpis: Kpi[] = [
  { label: "CPA médio", value: brl(18.52), delta: "-2,8%", note: "", good: true },
  { label: "CPM", value: brl(80.13), delta: "-1,9%", note: "", good: true },
  { label: "Custo por clique", value: brl(2.64), delta: "+0,8%", note: "", good: false },
  { label: "Taxa de conversão", value: "14,2%", delta: "+1,6%", note: "" },
  { label: "Verba em campanhas eficientes", value: "71%", delta: "+4,0%", note: "" },
];

export const eficRows = [
  ["KW · Retargeting 30d", 14.8, 2784, "#FF7A00"],
  ["KW · Cadastro Salvador", 15.4, 4169, "#FF7A00"],
  ["MT · Retargeting engajados", 16.7, 2642, "#2E8FFF"],
  ["KW · Vídeo Interior BA", 17.1, 2861, "#FF7A00"],
  ["MT · Cadastro RMS", 18.9, 5207, "#2E8FFF"],
  ["KW · Teste criativo agosto", 19.6, 1572, "#FF7A00"],
  ["MT · Interior — Feira/Vitória", 20.1, 2930, "#2E8FFF"],
  ["MT · Vídeo institucional", 21.4, 3379, "#2E8FFF"],
  ["MT · Público frio 25-44", 24.3, 1166, "#2E8FFF"],
].map(([name, cpa, vol, color]) => ({
  name: name as string,
  cpa: brl(cpa as number),
  vol: num(vol as number),
  color: color as string,
  pct: 100 - (((cpa as number) - 14) / 11) * 80,
}));

export const eficObjetivo: LabeledBar[] = [
  { label: "Conversão · cadastro", value: "R$ 16,90", pct: 88, color: "#21C46A" },
  { label: "Retargeting", value: "R$ 15,70", pct: 94, color: "#35D0FF" },
  { label: "Vídeo / ThruPlay", value: "R$ 21,40", pct: 62, color: "#F5B301" },
  { label: "Alcance / topo", value: "R$ 24,30", pct: 41, color: "#E4222B" },
];

export const desperdicio: string[] = [
  "R$ 28,3 mil aplicados em público frio 25-44 com CPA 31% acima da média — realocação libera ~1,5 mil cadastros.",
  "Vídeos acima de 40s consomem 18% da verba e entregam 9% dos cadastros.",
  "Overlap de 22% entre os públicos de RMS e Interior no Meta: parte das impressões é paga duas vezes.",
];

export const municipios: RankRow[] = [
  ["Salvador", 6420, 100],
  ["Feira de Santana", 3180, 49],
  ["Vitória da Conquista", 2410, 38],
  ["Camaçari", 1870, 29],
  ["Juazeiro", 1520, 24],
  ["Itabuna", 1340, 21],
  ["Ilhéus", 1180, 18],
  ["Barreiras", 960, 15],
].map(([name, v, p], i) => ({ rank: String(i + 1).padStart(2, "0"), name: name as string, value: num(v as number), pct: p as number }));

export const regioes: RegiaoRow[] = [
  ["Região Metropolitana", 148900, 8420, 17.68],
  ["Interior Norte", 92400, 4980, 18.55],
  ["Interior Sul", 86100, 4610, 18.68],
  ["Oeste", 74300, 3910, 19.0],
  ["Extremo Sul", 85513, 4392, 19.47],
].map(([name, inv, cad, cpa]) => ({
  name: name as string,
  invest: brl((inv as number) / 1000, 0) + "k",
  cad: num(cad as number),
  cpa: brl(cpa as number),
}));

export const faixas: FaixaRow[] = [
  ["18-24", 34, 41],
  ["25-34", 72, 79],
  ["35-44", 86, 92],
  ["45-54", 61, 68],
  ["55-64", 38, 44],
  ["65+", 21, 26],
].map(([label, m, f]) => ({ label: label as string, male: m as number, female: f as number }));

export const dispositivos: LabeledBar[] = [
  { label: "Android", value: "68%", pct: 68, color: "#21C46A" },
  { label: "iOS", value: "26%", pct: 26, color: "#35D0FF" },
  { label: "Desktop", value: "5%", pct: 5, color: "#9B7BFF" },
  { label: "Outros", value: "1%", pct: 1, color: "#7C8CB3" },
];

export const horarios: LabeledBar[] = ["6h", "8h", "10h", "12h", "14h", "16h", "18h", "19h", "20h", "21h", "22h", "0h"].map(
  (label, i) => ({ label, value: "", pct: [22, 38, 46, 58, 52, 64, 82, 94, 100, 88, 66, 34][i], color: i >= 6 && i <= 9 ? "#35D0FF" : "rgba(46,143,255,.35)" }),
);

export const segmentos: SegmentoRow[] = [
  ["Mulheres 35-44 · RMS", "4.812", "R$ 15,90", true],
  ["Homens 25-34 · Interior", "3.940", "R$ 16,40", true],
  ["Mulheres 45-54 · RMS", "3.104", "R$ 17,80", true],
  ["Homens 35-44 · Oeste", "2.760", "R$ 18,90", true],
  ["Mulheres 18-24 · Interior", "2.190", "R$ 21,30", false],
  ["Homens 55+ · RMS", "1.480", "R$ 26,70", false],
].map(([name, cad, cpa, good]) => ({ name: name as string, cad: cad as string, cpa: cpa as string, good: good as boolean }));

export const bibFilters = ["Ativos", "Inativos", "Vídeo", "Imagem"];

export const biblioteca: BibliotecaCard[] = [
  ["ATIVO", "2398410", "Mais saúde para a Bahia: mutirão de consultas em 40 municípios", "12/07/2026", "FB · IG"],
  ["ATIVO", "2398455", "Emprego e renda: o que já foi entregue e o que vem pela frente", "15/07/2026", "FB · IG · AN"],
  ["ATIVO", "2398512", "Cadastre-se para receber a agenda da campanha", "18/07/2026", "IG"],
  ["ATIVO", "2398577", "Obras de mobilidade em Salvador — depoimento de moradores", "21/07/2026", "FB · IG"],
  ["ATIVO", "2398634", "Educação em tempo integral: a meta para 2027", "25/07/2026", "FB"],
  ["ATIVO", "2398690", "ACM Neto na CBN Bahia — íntegra da entrevista", "29/07/2026", "FB · IG"],
  ["PAUSADO", "2398701", "Segurança pública: plano para o interior", "30/07/2026", "FB · IG"],
  ["ATIVO", "2398744", "Participe: envie sua proposta para o programa de governo", "02/08/2026", "IG · AN"],
].map(([status, id, copy, start, plats]) => ({ status: status as string, id: id as string, copy: copy as string, start: start as string, plats: plats as string }));

export const diario: DiarioDay[] = [
  ["08/08", "sexta", [["VERBA", "Orçamento diário elevado no Kwai", "Retargeting 30d: R$ 6k → R$ 8,5k", "CPA -4,1%", true]]],
  ["07/08", "quinta", [
    ["STATUS", "Campanha pausada no Meta", "Público frio 25-44, CPA 31% acima da média", "CPA -2,3%", true],
    ["CRIATIVO", "3 vídeos de 15s subidos no Kwai", "Temas: emprego, saúde, mobilidade", "CTR +0,6%", true],
  ]],
  ["06/08", "quarta", [["PÚBLICO", "Raio ampliado no interior", "40km → 65km em Feira e Vitória", "Alcance +12%", true]]],
  ["05/08", "terça", [["CRIATIVO", "Troca de peças na RMS", "4 criativos substituídos por saturação", "Freq. -0,4", true]]],
  ["04/08", "segunda", [["VERBA", "Realocação entre plataformas", "R$ 22k migrados do Meta para o Kwai", "CPA -1,8%", true]]],
  ["03/08", "domingo", [["STATUS", "Aumento de lance no leilão", "Lance manual em 2 conjuntos do Meta", "CPM +3,2%", false]]],
].map(([date, weekday, items]) => ({
  date: date as string,
  weekday: weekday as string,
  items: (items as [string, string, string, string, boolean][]).map(([tag, title, detail, impact, up]) => ({ tag, title, detail, impact, up })),
}));

export const efeitos: string[] = [
  "As trocas de criativo de 05/08 derrubaram a frequência de 3,1 para 2,7 sem perda de cadastros.",
  "A realocação de R$ 22 mil para o Kwai em 04/08 reduziu o CPA consolidado em R$ 0,34.",
  "A pausa do público frio em 07/08 é a mudança de maior efeito isolado na janela.",
];

export const platCards: PlatCard[] = [
  { name: "KWAI ADS", verdict: "Melhor custo", color: "#FF7A00", stats: [{ value: "38%", label: "da verba" }, { value: "R$ 16,20", label: "CPA" }, { value: "11.573", label: "cadastros" }] },
  { name: "META ADS", verdict: "Maior volume", color: "#2E8FFF", stats: [{ value: "62%", label: "da verba" }, { value: "R$ 20,10", label: "CPA" }, { value: "14.739", label: "cadastros" }] },
];

export const comparativo: ComparativoRow[] = [
  ["Custo por cadastro", "R$ 16,20", "R$ 20,10", 86, 66, "Kwai"],
  ["Volume de cadastros", "11.573", "14.739", 68, 88, "Meta"],
  ["Alcance único", "0,92 mi", "1,49 mi", 58, 92, "Meta"],
  ["CTR", "3,61%", "2,74%", 90, 68, "Kwai"],
  ["Retenção de vídeo", "52%", "38%", 88, 62, "Kwai"],
  ["Frequência", "1,9", "2,9", 82, 54, "Kwai"],
  ["CPM", "R$ 68,40", "R$ 88,90", 88, 62, "Kwai"],
  ["Penetração no interior", "64%", "41%", 84, 55, "Kwai"],
].map(([label, kwaiV, metaV, kp, mp, winner]) => ({
  label: label as string,
  kwaiV: kwaiV as string,
  metaV: metaV as string,
  kwaiPct: kp as number,
  metaPct: mp as number,
  winner: winner as "Kwai" | "Meta",
}));

export const simuladorBaseline = {
  cpaBase: { cadastros: [15.6, 19.1], alcance: [18.9, 22.4], video: [17.4, 20.8] } as Record<string, [number, number]>,
  cpmBase: { cadastros: [70.2, 90.1], alcance: [58.4, 72.6], video: [64.0, 81.3] } as Record<string, [number, number]>,
};
