# Instruções para aplicar no painel do ACM Neto

> **Este arquivo é dirigido ao Claude Code que está trabalhando no repositório do painel do
> ACM Neto.** Leia até o fim antes de alterar qualquer coisa.

## Contexto

O painel do Ciro Gomes (Governador do Ceará 2026) nasceu de um **clone deste repositório em que
você está**. Lá ele foi migrado de um dataset ilustrativo para leitura ao vivo da Meta Marketing
API, e esse caminho revelou um conjunto de defeitos que entregam **número errado sem erro nenhum**.

Como os dois projetos partem do mesmo código, é provável que este painel tenha os mesmos defeitos.
Sua tarefa é diagnosticar quais existem aqui e corrigi-los.

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

Em todos os casos, confirme se é uso real ou menção antes de alterar.

Depois, com o painel rodando e credenciais válidas, confira contra o Gerenciador de Anúncios:

- Reações e interações estão ~3× acima do gerenciador?
- "Compartilhamentos" aparece 0 mesmo com engajamento alto?
- A soma dos gastos diários do gráfico bate com o total acumulado?
- Selecionando "Tudo" ou 30+ dias, o gráfico diário para em 25 pontos?
- A contagem de campanhas e anúncios bate com o gerenciador?
- Existe algum `EAA` no HTML servido? (`curl <rota> | grep EAA`)

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

Ao terminar, relate o que **não** foi aplicado e por quê — defeito que não existia aqui, decisão que
depende do time, ou item que precisa de dado que você não tem.
