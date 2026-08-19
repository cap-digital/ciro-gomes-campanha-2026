# Instruções para aplicar no painel do ACM Neto

> **Este arquivo é dirigido ao Claude Code que está trabalhando no repositório do painel do
> ACM Neto.** Leia até o fim antes de alterar qualquer coisa.

## Contexto

O painel do Ciro Gomes (Governador do Ceará 2026) nasceu de um **clone deste repositório em que
você está**. Lá ele foi migrado de um dataset ilustrativo para leitura ao vivo da Meta Marketing
API, e esse caminho revelou um conjunto de defeitos que entregam **número errado sem erro nenhum**.

Como os dois projetos partem do mesmo código, é provável que este painel tenha os mesmos defeitos.
Sua tarefa é diagnosticar quais existem aqui e corrigi-los.

O documento cobre duas levas de trabalho: a **migração para dado ao vivo** (fases 0 a 3) e uma leva
posterior de **responsividade, tema e velocidade** (fase 4), mais o **comparativo de criativos**. As
fases 1 e 4 são as que corrigem defeito; as 2 e 3 são recursos a portar conforme o valor para a
campanha.

**Repositório de referência (público):**
`https://github.com/cap-digital/ciro-gomes-campanha-2026`

Clone-o num diretório temporário para consultar e copiar arquivos:

```bash
git clone --depth 1 https://github.com/cap-digital/ciro-gomes-campanha-2026 /tmp/ref-ciro
```

Dois documentos lá dentro complementam este:
- `MIGRACAO.md` — inventário completo das 80 mudanças, com o *porquê* de cada uma. Consulte quando
  precisar decidir se vale portar algo.
- `.env.example` — o contrato de variáveis de ambiente, comentado.

---

## Regras que valem para tudo

1. **Nada de dado inventado.** Este painel é operado por uma campanha eleitoral para decidir verba.
   Se um número não existe, a tela mostra vazio ou erro — nunca um valor plausível. Não crie
   fallback que preencha buraco com estimativa.
2. **Não copie identidade.** Tudo que é do Ciro/Ceará (foto, malha do estado, plano de mídia,
   regiões, favicon, textos) fica de fora. A seção "Não copiar" lista o que é.
3. **Confirme antes de corrigir.** Cada defeito abaixo vem com um teste. Rode o teste primeiro: se
   este painel não tiver aquele defeito, não mexa.
4. **Leve os comentários junto.** O código de referência tem comentários explicando o porquê de
   cada correção. Eles evitam que alguém "conserte de volta" no futuro.

---

## Fase 0 — Diagnóstico

Rode antes de alterar nada. O objetivo é descobrir **quais** defeitos existem aqui.

```bash
# 1. Soma de actions por substring (infla reações ~3x)
grep -rn "sumActions\|action_type.*includes\|includes.*action_type" lib/

# 2. action_type de compartilhamento errado
grep -rn '"share"' lib/

# 3. date_preset que exclui o dia corrente
grep -rn "date_preset" lib/

# 4. Listagens sem paginação
grep -rn "limit: 200\|limit: 100\|limit:200" lib/

# 5. Campo de targeting pedido com sintaxe aninhada
grep -rn "targeting{" lib/

# 6. Token da Biblioteca indo para o cliente
grep -rn "ad_snapshot_url" lib/

# 7. Dataset ilustrativo ainda em uso
grep -rn "mock" lib/ app/ components/ --include="*.ts" --include="*.tsx"

# 8. Contrato de variáveis de ambiente incompleto
grep -rho "process\.env\.[A-Z_]*" lib/ app/ components/ | sed 's/process.env.//' | sort -u > /tmp/codigo.txt
grep -o "^[A-Z_]*=" .env.example | tr -d '=' | sort -u > /tmp/exemplo.txt
comm -23 /tmp/codigo.txt /tmp/exemplo.txt    # nada aqui = contrato completo

# 9. Tema salvo dentro de efeito de render (destrói a preferência do usuário)
grep -n "localStorage.setItem" components/ThemeProvider.tsx

# 10. Alcance somado junto com breakdown de plataforma (conta gente duas vezes)
grep -n "breakdowns" -A 3 -B 6 lib/meta/campaigns.ts | grep -n "reach"

# 11. Sem esqueleto de carregamento: a navegação trava até a Meta responder
ls app/loading.tsx 2>/dev/null || echo "AUSENTE — cada rota fica parada no cache frio"

# 12. Sem regra de tela estreita: o painel não é usável no celular
grep -c "max-width" app/globals.css

# 13. Chip que encolhe abaixo do próprio texto e se sobrepõe ao vizinho
grep -n "flexShrink" lib/style.ts || echo "AUSENTE em chipStyle — ver 4.3"
```

**Os greps dão falso positivo — leia o contexto antes de mexer.** Rodando os mesmos comandos no
repositório de referência (onde tudo já está corrigido) eles ainda acusam:

- `date_preset` → um comentário que **alerta** para não usar `maximum`.
- `limit: 200` → o default **correto**, dentro de `graphAccountAll`. O defeito é `limit` fixo *sem*
  seguir `paging.next`; com a paginação, o limite por página é esperado.
- `targeting{` → um comentário documentando a armadilha.
- `ad_snapshot_url` → a declaração do tipo e o `fields` da requisição, que são legítimos. O defeito
  é usar essa URL no **cliente**; pedir o campo não é problema.
- `mock` → as uniões de tipo `"live" | "mock" | "erro"`, que são o estado de origem do dado.
- `localStorage.setItem` → no arquivo já corrigido ele aparece **uma vez**, dentro de `toggle()`.
  O defeito é aparecer dentro de um `useEffect` que roda a cada render. Veja **4.1**.
- `flexShrink` → no arquivo corrigido aparece dentro de `chipStyle`; a ausência é que é o defeito.

Em todos os casos, confirme se é uso real ou menção antes de alterar.

Depois, com o painel rodando e credenciais válidas, confira contra o Gerenciador de Anúncios:

- Reações e interações estão ~3× acima do gerenciador?
- "Compartilhamentos" aparece 0 mesmo com engajamento alto?
- A soma dos gastos diários do gráfico bate com o total acumulado?
- Selecionando "Tudo" ou 30+ dias, o gráfico diário para em 25 pontos?
- A contagem de campanhas e anúncios bate com o gerenciador?
- Existe algum `EAA` no HTML servido? (`curl <rota> | grep EAA`)
- Escolhendo o tema claro e trocando de página, ele **volta** para o escuro? (defeito 4.1)
- Abrindo qualquer rota num celular (ou em 390px de largura no navegador), dá para usar? Os
  quadrados ficam um abaixo do outro ou o painel exige rolagem lateral?

---

## Fase 1 — Correções de dados (faça primeiro)

Cada item: sintoma → como confirmar → o que fazer.

### 1.1 Soma de actions por substring infla reações ~3×

**Sintoma.** Reações e interações muito acima do Gerenciador.
**Causa.** `a.action_type.includes("like")` casa com `like`, `post_reaction` **e**
`onsite_conversion.post_net_like` — o mesmo evento contado três vezes.

Em `lib/meta/graph.ts`, substitua a soma por comparação exata:

```ts
/**
 * Soma apenas os action_types EXATAMENTE iguais aos informados.
 * Casar por substring conta o mesmo evento várias vezes.
 */
export function sumActionsExact(actions: GraphAction[] | undefined, types: string[]): number {
  if (!actions?.length) return 0;
  const wanted = new Set(types);
  return actions.filter((a) => wanted.has(a.action_type)).reduce((acc, a) => acc + n(a.value), 0);
}

/** Soma todas as entradas de uma lista (usar para listas de vídeo). */
export function sumAll(actions: GraphAction[] | undefined): number {
  if (!actions?.length) return 0;
  return actions.reduce((acc, a) => acc + n(a.value), 0);
}
```

Migre **todos** os chamadores. Onde havia o hack `sumActions(arr, [""])`, use `sumAll(arr)`.

### 1.2 Compartilhamentos sempre zero

**Sintoma.** A barra "Compartilhamentos" fica em 0 permanentemente.
**Causa.** Na Meta o action_type de compartilhamento de publicação é `post`, não `share`.

Em `lib/meta/insights.ts`, fixe o dicionário de tipos reais:

```ts
/** action_types exatos por tipo de interação, conforme a Graph API devolve. */
const ACTION = {
  reactions: ["post_reaction"],
  comments: ["comment"],
  shares: ["post"],
  saves: ["onsite_conversion.post_save"],
  linkClicks: ["link_click"],
  videoViews: ["video_view"],
  postEngagement: ["post_engagement"],
} as const;
```

Antes de confiar, liste o que a **conta do ACM** devolve de verdade:

```bash
curl -sG "https://graph.facebook.com/v25.0/act_<ID>/insights" \
  --data-urlencode "fields=actions" \
  --data-urlencode 'time_range={"since":"AAAA-MM-DD","until":"AAAA-MM-DD"}' \
  --data-urlencode "access_token=$TOKEN" | python3 -m json.tool
```

### 1.3 `date_preset=maximum` exclui o dia corrente

**Sintoma.** Gasto acumulado bem abaixo do real; o percentual do plano não fecha com a soma dos dias.
**Causa.** Apesar do nome, `maximum` devolve até **ontem**. No painel do Ciro isso escondia quase
metade do acumulado.

Substitua por janela explícita terminando **hoje**, no fuso da conta:

```ts
const range = { since: INICIO_DA_CONTA, until: hojeNoFusoDaConta() };
// fields=spend, time_range: JSON.stringify(range), level: "account"
```

Confirme o comportamento na conta do ACM comparando os dois:

```bash
# repare no date_start/date_stop que cada um devolve
curl -sG ".../insights" --data-urlencode "fields=spend,date_start,date_stop" \
  --data-urlencode "date_preset=maximum" --data-urlencode "access_token=$TOKEN"
```

### 1.4 Listagens truncadas em silêncio

**Sintoma.** Contagem de campanhas/anúncios menor que a do gerenciador; gasto total subestimado.
**Causa.** `limit: 200` fixo sem seguir `paging.next`.

Adicione em `lib/meta/graph.ts` e migre todas as listagens (`/campaigns`, `/ads`, `/adsets`,
`/insights` por nível, `/activities`):

```ts
export async function graphAccountAll<T>(path: string, params: Params, maxPages = 25, revalidate?: number): Promise<T[]> {
  const { token } = metaEnv();
  let url = buildUrl(path, { limit: 200, ...params }, token);
  const out: T[] = [];

  for (let page = 0; page < maxPages; page++) {
    const res = await fetchJson<GraphPaged<T>>(url, path, revalidate ?? 120);
    out.push(...(res.data || []));
    const next = res.paging?.next;
    if (!next) break;
    url = next;
  }
  return out;
}
```

Elimine também qualquer teto arbitrário que vire "total" na tela (ex.: `getAds(range, 40)` e a
página exibindo `.length` como "N anúncios da conta").

### 1.5 Série diária perde dias

**Sintoma.** O gráfico diário para em 25 pontos; dias recentes somem.
**Causa.** Com `time_increment=1` cada dia é uma linha e o `/insights` pagina em 25 por padrão.
A API também **não garante ordem**.

Use `graphAccountAll` com `limit: 500` e ordene:

```ts
rows.slice().sort((a, b) => (a.date_start || "").localeCompare(b.date_start || ""))
```

### 1.6 `targeting{geo_locations}` volta vazio

**Sintoma.** O painel de território fica sem municípios.
**Causa.** A sintaxe aninhada não traz o conteúdo. É preciso pedir `targeting` inteiro e ler
`geo_locations` do objeto devolvido.

```ts
// errado: fields: "id,name,targeting{geo_locations}"
// certo:  fields: "id,name,targeting"
```

Confirme na conta do ACM comparando as duas chamadas — uma volta `cities: []` e a outra não.

### 1.7 Token vazando no HTML (segurança)

**Sintoma.** `curl <rota> | grep EAA` retorna algo.
**Causa.** O `ad_snapshot_url` da Ad Library vem com `?access_token=...` embutido e era usado direto
no `href` do card.

Troque pelo permalink público, que não carrega credencial:

```ts
snapshotUrl: ad.id ? `https://www.facebook.com/ads/library/?id=${ad.id}` : ""
```

Depois **verifique em todas as rotas**, não só na que você mexeu.

### 1.8 Rótulo de conversão que não existe na conta

**Sintoma.** A tela diz "Cadastros: 0" e "Custo por cadastro: R$ 0,00" numa conta que não tem
conversão de cadastro.
**Causa.** O código assume `lead` como métrica de resultado.

Copie `lib/meta/conversion.ts` do repositório de referência. Ele define uma escada
(cadastro → conversa iniciada → clique → engajamento), resolve a partir das actions que a conta
**realmente devolveu** e expõe os rótulos (`label`, `shortLabel`, `costLabel`, `unitPlural`).
Quando entrarem campanhas de cadastro, o painel migra sozinho.

Depois faça os rótulos descerem até os componentes: as páginas devem receber `resultLabel` e
`costLabel` da camada de dados, em vez de ter "Cadastros" escrito no JSX.

### 1.9 Definições divergentes da mesma coisa

Se houver mais de um lugar decidindo "o que é um anúncio ativo" (ou qualquer conceito), unifique
numa função só. No painel do Ciro, o gráfico dizia 61 ativos e o painel lateral 33, porque um
comparava com *agora* e o outro com *hoje*.

### 1.10 Alcance somado por plataforma conta a mesma pessoa duas vezes

**Sintoma:** alcance acima do real e frequência abaixo do real — os dois erram juntos, porque
frequência é impressões ÷ alcance. Não aparece como erro; aparece como bom desempenho.

**Causa:** a consulta de anúncios usa `breakdowns: "publisher_platform"` para descobrir em qual
plataforma cada peça entregou. Impressão é aditiva e pode ser somada entre plataformas; **alcance
não é**. Quem viu o anúncio no Facebook e no Instagram é uma pessoa só, e vira duas na soma.

**Como confirmar:** peça alcance dos dois jeitos e compare.

```bash
# com breakdown (soma as linhas por plataforma)
curl -s -G "https://graph.facebook.com/v25.0/act_<ID>/insights" \
  -d access_token=$TOKEN -d level=ad -d breakdowns=publisher_platform \
  -d "fields=ad_id,reach" -d "time_range={'since':'AAAA-MM-DD','until':'AAAA-MM-DD'}"

# sem breakdown (o número correto)
curl -s -G "https://graph.facebook.com/v25.0/act_<ID>/insights" \
  -d access_token=$TOKEN -d level=ad -d "fields=ad_id,reach,frequency" \
  -d "time_range={'since':'AAAA-MM-DD','until':'AAAA-MM-DD'}"
```

**Correção:** duas consultas em paralelo. A com breakdown continua servindo para plataforma,
impressões, cliques e ações; uma segunda, **sem breakdown**, traz alcance e as métricas de vídeo.
Ver `getAdsExtras()` em `lib/meta/campaigns.ts` do repositório de referência.

**Teste de que ficou certo:** calcule `impressões ÷ alcance` e compare com o campo `frequency` que a
própria Meta devolve. Batendo até a quarta casa, o alcance está correto.

---

## Fase 2 — Módulos a copiar

Do `/tmp/ref-ciro`. Todos são agnósticos de candidato salvo onde indicado.

| Arquivo | O que faz | Adaptação |
|---|---|---|
| `lib/meta/conversion.ts` | Escada de métrica de resultado | nenhuma |
| `lib/metricas.ts` | Catálogo de métricas selecionáveis (rótulo, formato, direção) | nenhuma |
| `lib/kwai.ts` | Plataforma não iniciada, zerada e sinalizada | nenhuma |
| `lib/candidato.ts` | Identidade centralizada + dias até a eleição | trocar defaults e o fuso |
| `app/actions.ts` | Server action de forçar atualização | nenhuma |
| `components/BotaoAtualizar.tsx` | Botão de atualizar (usa a action acima) | nenhuma |
| `lib/meta/instagram.ts` | Crescimento de seguidores do perfil | nenhuma (descobre o perfil pela página) |
| `lib/meta/taxonomy.ts` | Lê a taxonomia de nomes como *dica*, nunca contrato | ajustar prefixo fixo e as listas de hints |
| `lib/meta/creativeThumbs.ts` | Casa Ad Library × Marketing API para ter imagem | ajustar o regex que extrai cidade do texto |
| `lib/plano.ts` | Plano de mídia como fonte única | **substituir** pelo plano do ACM |
| `app/loading.tsx` | Esqueleto de carregamento (streaming) | nenhuma |
| `components/FiltroCampanha.tsx` | Dropdown de campanha que escreve na URL | nenhuma |
| `components/ComparativoCriativos.tsx` | Comparar 2–3 peças: tabela, leitura e curva diária | nenhuma |

Para o botão de atualizar, marque as chamadas com uma tag de cache:

```ts
fetch(url, { next: { revalidate, tags: ["meta"] } })
```

e na server action use `updateTag("meta")` — não `revalidateTag`. Nesta versão do Next,
`revalidateTag` serve conteúdo obsoleto enquanto revalida em segundo plano; `updateTag` expira na
hora, que é o esperado de um botão "Atualizar".

### Remoção do dataset ilustrativo

Se este painel ainda usa mock, o caminho que funcionou foi:

1. Cada módulo exporta a sua constante de estado vazio (`EMPTY_TOTALS`, `SEGUIDORES_ZERO`, etc.).
2. A função `safe()` devolve `{ value, ok }` — em falha, o estado vazio **tipado**, não mock.
3. A origem do dado passa a ter três estados: `live` / `mock` / **`erro`**. Falha de API **não pode**
   ser exibida como "sem entrega no período" — isso afirma um fato falso.
4. Só então apague o arquivo de mock e conserte o que quebrar.

---

## Fase 3 — Interface

Portar conforme o valor para a campanha. Nada aqui é pré-requisito das fases anteriores.

- **Seletor de métrica** por página (`lib/metricas.ts` + componente cliente). No Ciro está em
  Território, Público, Campanhas e Eficiência.
- **Biblioteca de Anúncios com concorrentes**: `META_AD_LIBRARY_PAGES` aceita
  `id:Nome,id:Nome`; a primeira página é o próprio candidato. Consulte **uma página por vez** — numa
  busca conjunta o candidato com mais anúncios ocupa todos os primeiros resultados. Use
  `ad_delivery_date_min` para não trazer campanhas de eleições passadas.
- **Mapa do estado em SVG** (`components/MapaCeara.tsx`): sem biblioteca e sem servidor de tiles.
  Copiar o componente e trocar só o import da malha. Ver "Dados da Bahia" abaixo.
- **Tabela de interações por criativo**, ordenada por **taxa** de engajamento — taxa é comparável
  entre peças com entregas muito diferentes; volume não é.
- **Pacing da verba**: percentual gasto, dias até o 1º turno e média diária necessária.
- **Filtro de status em Criativos**, montado a partir dos status que a conta realmente devolve.
- **Comparativo de criativos** (`components/ComparativoCriativos.tsx`): o usuário escolhe 2 ou 3
  peças e compara. Três decisões que valem copiar junto:
  - **Tabela de números, sem barra.** A barra repetia a informação do próprio número e enchia a
    tela de cor. Uma coluna por peça, melhor valor em verde.
  - **Aviso de objetivo diferente.** Se as peças estão em campanhas com objetivos distintos, a Meta
    otimizou cada uma para uma meta própria: `resultados` e `custo por resultado` deixam de ser
    comparáveis e a linha para de marcar vencedor. CTR, CPM e taxa de interação seguem válidos.
  - **Frequência não marca vencedor.** Nem alta nem baixa é boa por si só.
- **Leitura gerada dos números**, sem texto fixo e sem modelo de linguagem: a função monta frases a
  partir dos próprios valores (quem tem melhor CTR, quem compra impressão mais barata, se os volumes
  de entrega são comparáveis). Cuidado que custou uma correção: quando o divisor é quase zero a razão
  explode — chegou a "451× a média". Acima de 10×, troque "N vezes melhor" por "a outra peça não
  registrou clique nenhum".
- **Curva diária por peça** (`level=ad` + `time_increment=1`). Dois cuidados que mudam a leitura:
  - Dia sem entrega **não é zero**, é buraco na linha. Zerar sugere queda de desempenho onde o
    anúncio nem estava no ar.
  - Métrica de custo em dia sem denominador (nenhum clique) também é buraco. Zero faria a linha
    despencar como se o dia tivesse saído de graça.
  - Alcance e frequência **não entram** no gráfico: alcance é gente única e somar o de cada dia
    contaria de novo quem voltou a ver a peça.
- **Catálogo amplo de taxas e custos** no comparativo — CPM, custo por mil alcançadas, CPC (link),
  CPC (todos), CPE, custo por ThruPlay, custo por resultado, CTR (link), CTR (todos), taxa de
  interação, frequência, hook rate, VTR e retenção. As de vídeo **somem** quando nenhuma peça
  escolhida é vídeo (na conta do Ciro, 6 de 58 anúncios) — sete linhas zeradas seriam só ruído.
- **Antes de escolher as métricas, pergunte à conta o que ela devolve.** Vários campos existem na API
  e voltam vazios. Rode uma consulta pedindo tudo e conte em quantos anúncios cada campo tem valor:

  ```bash
  curl -s -G "https://graph.facebook.com/v25.0/act_<ID>/insights" \
    -d access_token=$TOKEN -d level=ad -d limit=500 \
    -d "time_range={'since':'AAAA-MM-DD','until':'AAAA-MM-DD'}" \
    -d "fields=ad_id,spend,impressions,reach,clicks,inline_link_clicks,actions,\
video_play_actions,video_thruplay_watched_actions,video_p100_watched_actions"
  ```

  No painel do Ciro isso evitou publicar métricas mortas — e é a mesma lição do `total_follows`, que
  é campo válido da API e volta vazio nessa conta.
- Correções pequenas que valem: linha tracejada fina demais nos gráficos, ícones da barra lateral
  sem cor própria (somem no tema claro), chips decorativos que parecem clicáveis e não filtram nada.

### Dados da Bahia

Os endpoints do IBGE servem qualquer UF. Bahia é **29** (Ceará é 23). Confirmado: 417 municípios,
14.141.626 habitantes.

```bash
# malha municipal (GeoJSON)
curl "https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=intermediaria"

# população residente — Censo 2022, agregado 4709, variável 93
curl "https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N6%5BN3%5B29%5D%5D"
```

Junte pelo código IBGE do município e grave no **mesmo formato de chaves** de
`lib/geo/ceara-malha.json`: `uf`, `bbox`, `municipios[]` com `cod`, `nome`, `c` (centroide
`[lon, lat]`), `a` (anéis do polígono) e `p` (população), mais `populacaoTotal` e `fontePopulacao`.
O componente lê tudo do próprio JSON — nenhuma outra alteração é necessária.

A Bahia tem mais que o dobro de municípios do Ceará: simplifique os polígonos (decimar os pontos de
cada anel, arredondar coordenadas para 3 casas) para o arquivo não passar de ~300 KB.

Crie também `lib/geo/bahia.ts` com a mesma estrutura de `ceara.ts` (`MACRORREGIOES`, `register()`,
`normalize()`, `macrorregiaoDe()`, `ordemMacrorregiao()`), usando as regiões da Bahia. Copie
`normalize()` sem alterar. **Confira a cobertura**: todo município da malha precisa cair numa
região, senão o balde "Outras regiões" vira a maior do painel.

---

## Fase 4 — Responsividade, tema e velocidade

Três frentes que não são "dado errado", mas decidem se o painel é usável. Todas foram feitas depois
da migração, no painel do Ciro.

### 4.1 O tema claro não sobrevive à navegação (e destrói a preferência)

**Sintoma:** o usuário escolhe o tema claro, muda de página e volta o escuro — e o valor salvo é
sobrescrito, então a escolha se perde de vez. A troca em si **funciona**; o defeito só aparece na
navegação seguinte, que é o motivo de passar despercebido.

A gravidade depende do StrictMode, então teste nos dois modos e não descarte como "coisa de
desenvolvimento":

| Modo | O que medi / o que se espera |
|---|---|
| `next dev` com `reactStrictMode: true` | **Preferência destruída.** Medido: amostras `light → light → dark → dark…` e `localStorage` gravado como `dark`. |
| Produção, sem StrictMode | A gravação indevida no primeiro render continua acontecendo, então no mínimo há **piscada** do tema a cada carregamento. Não medi este caso — verifique com `npm run build && npm start`. |

**Causa:** o mesmo `useEffect` que aplica `data-theme` também grava no `localStorage`:

```tsx
const [theme, setTheme] = useState<Theme>("dark");

useEffect(() => {                                  // lê a preferência
  setTheme((localStorage.getItem("theme") as Theme) || "dark");
}, []);

useEffect(() => {                                  // ← o defeito
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);            // grava "dark" no 1º render
}, [theme]);
```

No primeiro render `theme` ainda é o `"dark"` do `useState`, então o segundo efeito **salva "dark"
por cima da preferência real** antes de o primeiro efeito conseguir aplicá-la.

Sem StrictMode isso se resolve sozinho no render seguinte, porque o primeiro efeito já tinha lido
`"light"` numa variável local — sobra a piscada. Com `reactStrictMode: true` o React monta os efeitos
duas vezes, e na **segunda** montagem a leitura já encontra o `"dark"` que a primeira gravou: aí a
preferência é perdida de verdade, e nenhuma navegação futura recupera.

**Como confirmar:** pelo navegador, escolha o tema claro, navegue para outra rota e veja se voltou ao
escuro; confira `localStorage.getItem('theme')` no console. Automatizado, amostre o atributo durante
o carregamento:

```js
// com a preferência já em "light", recarregue e amostre a cada 120ms
setInterval(() => console.log(document.documentElement.getAttribute("data-theme")), 120);
// defeituoso: light → light → dark → dark → dark…
```

**Correção:** a gravação sai do efeito e passa a acontecer **só na ação do usuário**. O efeito fica
responsável apenas por aplicar o atributo, que é idempotente.

```tsx
useEffect(() => {
  document.documentElement.setAttribute("data-theme", theme);
}, [theme]);

const toggle = () =>
  setTheme((t) => {
    const proximo: Theme = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", proximo); } catch {}
    return proximo;
  });
```

Mantenha o script inline que roda antes da hidratação (`THEME_INIT_SCRIPT`) — é ele que evita a
piscada. Depois de corrigir, as amostras ficam `light` desde o primeiro quadro.

> **Consequência de auditoria:** enquanto esse defeito existe, o tema claro **nunca foi testado de
> verdade** em nenhuma página, porque toda navegação o derrubava. Corrija primeiro, depois varra as
> rotas no tema claro procurando contraste ruim.

### 4.2 Navegação que trava até a Meta responder

**Sintoma:** clicar num ícone da barra lateral e a tela ficar parada, sem sinal nenhum, por vários
segundos no cache frio.

**Causa:** sem `app/loading.tsx`, o Next segura a navegação inteira até o servidor terminar de falar
com a Meta.

**Correção:** copie `app/loading.tsx` do repositório de referência. Ele desenha um esqueleto que
aparece na hora, e o conteúdo entra por streaming quando fica pronto. No painel do Ciro o TTFB caiu
de ~6,5 s para ~0,1 s. Meça antes e depois:

```bash
for r in <rotas>; do curl -s -o /dev/null -w "$r %{time_starttransfer}s\n" "http://localhost:3000/$r"; done
```

Vale junto: uma janela de revalidação única (`revalidate` padrão em `graphFetch`) em vez de cada
chamada escolher a sua.

### 4.3 Telas estreitas

O obstáculo é específico deste código: **o painel é escrito com estilo inline**, que vence qualquer
seletor de folha de estilo. Não adianta escrever uma media query "normal" — ela perde para o
`style={{ gridTemplateColumns: "repeat(12,...)" }}` que está no JSX.

A técnica que funcionou, sem reescrever as páginas:

1. **Ganchos de classe** nos contêineres que precisam mudar. No Ciro:
   `.shell`, `.rail`, `.rail-caixa`, `.rail-nav`, `.cabecalho`, `.pagina` (moldura);
   `.pag` (raiz de cada página), `.emp` (cada bloco de painéis lado a lado),
   `.painel` (o componente `Panel`), `.grafico` (o `<svg>` de cada gráfico).
2. **Uma media query com `!important`** em `app/globals.css` (~900px) que solta a altura fixa,
   transforma a barra lateral em faixa horizontal no topo e força coluna única.

Copie o bloco `@media (max-width: 900px)` de `app/globals.css` e aplique as mesmas classes. Cinco
armadilhas que custaram tempo, todas com correção no arquivo de referência:

- **Não force `overflow: visible` no `.emp`.** Alguns desses blocos usam `overflow: hidden` de
  propósito — no Ciro, o herói tem uma decoração absoluta que vazava 27px para fora da tela quando o
  `overflow` foi liberado.
- **`overflow-x: auto` zera o tamanho mínimo automático de um item flex.** Num contêiner de altura
  fixa, o elemento encolhe até 0px e some atrás do bloco seguinte. Aconteceu com a tabela do
  comparativo, que existia no DOM com 310px de altura e era invisível. Corrija com `flexShrink: 0`.
- **`min-width: 0` no reset global faz o chip encolher abaixo do próprio texto**, e um passa por cima
  do outro numa régua apertada. A correção é `flexShrink: 0` dentro de `chipStyle` — resolve em todo
  o painel de uma vez.
- **Gráfico com `height: 100%` mede zero** quando o painel perde a altura fixa. Precisa de piso:
  `.painel { min-height: 190px }` e `.grafico { min-height: 170px }`.
- **Tabela de muitas colunas deve rolar, não espremer.** Um `min-width` na `<table>` faz ela rolar
  dentro do painel em vez de reduzir o nome da peça a `"F…"`.

Cabeçalhos de painel que juntam rótulo + selo numa linha precisam de `flexWrap: "wrap"`, senão o selo
escapa da borda assim que o rótulo cresce.

**Como verificar sem depender do olho:** meça a largura do documento e liste quem estoura.

```js
// rode em cada rota, com a janela em 390px
const vw = document.documentElement.clientWidth;
const maus = [...document.querySelectorAll("body *")].filter((el) => {
  const r = el.getBoundingClientRect();
  return r.width && r.height && r.right > vw + 1 && getComputedStyle(el).position !== "fixed";
});
console.log({ scrollW: document.documentElement.scrollWidth, vw, estouram: maus.length });
```

`scrollW === vw` em todas as rotas significa que nada rola para o lado. Repita em 768px e na largura
de desktop para garantir que a media query não vazou.

---

## Não copiar

| O quê | Por quê |
|---|---|
| `public/ciro-gomes.png` | Foto do outro candidato |
| `app/icon.svg` | Favicon com o número 45 |
| `lib/geo/ceara-malha.json` e `lib/geo/ceara.ts` | Geografia do Ceará |
| `lib/plano.ts` | Plano de mídia e verba da campanha do Ciro |
| Defaults de `lib/candidato.ts` | Nome, cargo, partido, data |
| Qualquer credencial | Nunca esteve no repositório, e não deve estar |

Ao trocar a foto: os valores de `objectPosition` (14% na barra lateral, 18% no hero) foram
calibrados para o enquadramento daquela imagem. Reajuste para a nova.

---

## Verificação final

```bash
npx tsc --noEmit
npm run build
```

Com o painel rodando, para cada rota e em pelo menos três janelas (7 dias, tudo, e uma janela
**sem entrega**):

```bash
for r in <rotas>; do
  curl -s -o /dev/null -w "$r %{http_code}\n" "http://localhost:3000/$r?period=tudo"
  curl -s "http://localhost:3000/$r?period=tudo" | grep -c "NaN\|Infinity\|EAA"
done
```

Checklist:

- [ ] Nenhuma rota retorna erro em nenhuma janela.
- [ ] Zero `NaN` e `Infinity` no HTML.
- [ ] Zero ocorrências de `EAA` (token) em qualquer rota.
- [ ] Janela sem entrega mostra "sem entrega", não números fantasma.
- [ ] Sem credencial, a tela acusa **falha**, não zeros.
- [ ] Reações, compartilhamentos, campanhas e anúncios batem com o Gerenciador.
- [ ] Nenhum rótulo diz "Cadastros" se a conta não tem conversão de cadastro.
- [ ] `comm -23 /tmp/codigo.txt /tmp/exemplo.txt` sai vazio.
- [ ] Em 390px e 768px, `document.documentElement.scrollWidth` é igual à largura da tela em **todas**
      as rotas, e os quadrados ficam um abaixo do outro.
- [ ] Em largura de desktop o layout não mudou (a media query não vazou).
- [ ] Escolhendo o tema claro e navegando entre rotas, ele **permanece** claro.
- [ ] Console limpo: zero erro e zero aviso em cada rota.

### Conferindo os números contra a própria Meta

Toda métrica derivada (CPM, CPC, CTR, frequência, custo por ThruPlay) tem um campo equivalente que a
Meta calcula sozinha. Peça os dois na mesma consulta e compare anúncio a anúncio — é a diferença
entre "eu acho que a conta está certa" e "a Meta confirma que está".

```bash
curl -s -G "https://graph.facebook.com/v25.0/act_<ID>/insights" \
  -d access_token=$TOKEN -d level=ad -d limit=500 \
  -d "time_range={'since':'AAAA-MM-DD','until':'AAAA-MM-DD'}" \
  -d "fields=ad_id,spend,impressions,reach,frequency,clicks,inline_link_clicks,\
cpm,cpc,ctr,cost_per_inline_link_click,inline_link_click_ctr,cost_per_thruplay"
```

Compare `spend/impressions*1000` com `cpm`, `impressions/reach` com `frequency`, e assim por diante.
No painel do Ciro a maior divergência entre as sete métricas, nos 58 anúncios, ficou em 0,07% —
arredondamento. Qualquer coisa acima de ~0,5% é defeito, não arredondamento.

**Atenção:** alguns desses campos vêm como **lista de ações**, não como número. `cost_per_thruplay`
devolve `[{"action_type": "video_view", "value": "0.13417"}]`. Ler com `Number()` dá `NaN`/zero e
inventa uma divergência que não existe — foi exatamente o que aconteceu na primeira rodada dessa
conferência.

Ao terminar, relate o que **não** foi aplicado e por quê — defeito que não existia aqui, decisão que
depende do time, ou item que precisa de dado que você não tem.
