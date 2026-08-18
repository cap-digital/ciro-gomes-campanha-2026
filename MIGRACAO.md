# Do Ceará para a Bahia

Handoff técnico do painel de campanha. O painel do Ciro Gomes nasceu de um clone do painel do
ACM Neto e foi migrado de um dataset ilustrativo para leitura ao vivo da Meta Marketing API.
Esse caminho revelou armadilhas que entregam número errado **sem erro nenhum** — e como os dois
projetos partem do mesmo código, é provável que o painel do ACM tenha as mesmas.

**80 mudanças catalogadas** · 58 copiar direto · 18 adaptar · 4 não copiar

> Versão navegável, com a seção de configuração e o checklist de verificação:
> https://claude.ai/code/artifact/a63f34c8-3001-4b9b-823e-52b26ea7b449

## Se você só for ler uma coisa

Seis defeitos que não mostram erro na tela — mostram um número plausível e errado:

1. **Reações ~3x infladas** — somar `action_type` por substring conta o mesmo evento três vezes.
2. **Compartilhamentos sempre zero** — na Meta o action_type é `post`, não `share`.
3. **Gasto acumulado pela metade** — `date_preset=maximum` exclui o dia corrente.
4. **Listas truncadas em silêncio** — sem seguir `paging.next`, tudo para na primeira página.
5. **Série diária perdendo dias** — com `time_increment=1` o `/insights` pagina de 25 em 25.
6. **Token no HTML** — `ad_snapshot_url` vem com o `access_token` embutido.

## Armadilhas da API da Meta

_25 itens_

### Somar actions por substring inflava reações ~3x — trocado por comparação exata

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** `sumActions(actions, matchers)`, que filtrava com `a.action_type.includes(m)`, foi substituída por `sumActionsExact(actions, types)` em lib/meta/graph.ts, casando o action_type EXATO via `Set.has()`. Todos os chamadores (insights, campanhas, criativos, geo) migraram. Foi criada também `sumAll(actions)` para os casos em que se quer mesmo a soma de todas as entradas (listas de vídeo), no lugar do hack `sumActions(arr, [""])`.

**Por quê.** Comentário em lib/meta/graph.ts: o matcher "like" casava simultaneamente com `like`, `post_reaction` e `onsite_conversion.post_net_like`, somando o mesmo evento três vezes. O usuário via um número de reações ~3x maior que o do Gerenciador de Anúncios, e o card de 'interações' herdava o erro.

**Como replicar.** Procure no painel do ACM por `sumActions(` ou qualquer `.includes(` aplicado a `action_type` e troque por comparação exata com Set. Depois confira reações e interações contra o Gerenciador — se estavam ~3x acima, é este bug.

Arquivos: `lib/meta/graph.ts` · `lib/meta/insights.ts` · `lib/meta/campaigns.ts`

### Compartilhamentos sempre zerados: o action_type de share na Meta é `post`, não `share`

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** Criado o dicionário `ACTION` em lib/meta/insights.ts com os action_types reais devolvidos pela Graph API: reactions=`post_reaction`, comments=`comment`, shares=`post`, saves=`onsite_conversion.post_save`, linkClicks=`link_click`, videoViews=`video_view`, postEngagement=`post_engagement`. Os mesmos tipos são usados no nível de anúncio em campaigns.ts.

**Por quê.** O código anterior pedia `sumActions(row.actions, ["share"])`. A Meta nunca devolve um action_type contendo 'share' para compartilhamento de publicação — ela devolve `post`. Resultado: a barra 'Compartilhamentos' ficava permanentemente em 0 e o total de interações vinha subestimado, sem nenhum erro na tela.

**Como replicar.** No painel do ACM, se 'Compartilhamentos' aparece 0 com engajamento alto, é este bug. Copie o bloco `const ACTION = {...}` e use `sumActionsExact(row.actions, [...ACTION.shares])`.

Arquivos: `lib/meta/insights.ts` · `lib/meta/campaigns.ts`

### `date_preset=maximum` EXCLUI o dia corrente e subestimava o gasto acumulado pela metade

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** `getGastoAcumulado()` passou a usar `time_range` explícito ({since: início da conta, until: hoje}) via `rangeAcumulado()` de lib/period.ts, com um comentário 'ATENÇÃO: NÃO usar date_preset=maximum aqui'.

**Por quê.** Comentário no código: apesar do nome, `maximum` devolvia 10/08..17/08 e deixava de fora os R$ 6.735 gastos no próprio dia — quase metade do acumulado. O usuário via a barra de pacing da verba muito abaixo do real e o percentual do plano não fechava com a soma dos dias do gráfico.

**Como replicar.** Grep por `date_preset` no painel do ACM. Onde houver `maximum` (ou `lifetime`), troque por `time_range` com `until = hoje no fuso da conta`. Valide somando os spends diários e comparando com o acumulado.

Arquivos: `lib/meta/insights.ts` · `lib/period.ts`

### Paginação ausente: `limit: 200` fixo truncava campanhas, conjuntos e anúncios em silêncio

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** Criada `graphAccountAll<T>(path, params, maxPages = 25, revalidate)` em lib/meta/graph.ts, que segue `paging.next` até acabar (default `limit: 200` por página). Todas as listagens (/campaigns, /ads, /adsets, /insights por nível, /activities) migraram de `graphAccount` + limit fixo para `graphAccountAll`.

**Por quê.** Comentário no código: a campanha cresce ao longo do período (novos conjuntos e anúncios toda semana), então um limit fixo truncaria os dados silenciosamente. Na prática o painel mostraria 'a conta tem N anúncios' com N errado, e o gasto total por campanha/anúncio ficaria menor que o real, sem nenhuma indicação de erro.

**Como replicar.** Copie `graphAccountAll` inteira e substitua toda chamada de listagem que hoje usa `limit: 200`. Atenção: `maxPages = 25` (≈5.000 linhas com o limit default) continua sendo teto — se a conta do ACM for maior, suba o valor ou logue quando o laço terminar por maxPages.

Arquivos: `lib/meta/graph.ts` · `lib/meta/campaigns.ts` · `lib/meta/geo.ts` · `lib/meta/activities.ts`

### Série diária perdia dias: `/insights` com `time_increment=1` pagina de 25 em 25

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** `getDailySeries` passou a usar `graphAccountAll` com `limit: 500` e a ordenar as linhas por `date_start` (`localeCompare`) antes de mapear.

**Por quê.** Comentário no código: com `time_increment=1` cada dia vira uma linha e o /insights pagina em 25 por padrão — uma janela de mais de 25 dias perderia dias silenciosamente (a campanha vai até outubro). Além disso a API não garante ordem: sem o sort, o gráfico de linha do tempo desenhava os dias fora de ordem.

**Como replicar.** No painel do ACM, selecione 'Tudo' ou 30+ dias e conte os pontos do gráfico diário. Se pararem em 25, aplique paginação + `sort((a,b)=>(a.date_start||'').localeCompare(b.date_start||''))`.

Arquivos: `lib/meta/insights.ts`

### Escada de conversão dinâmica: fim do 'Custo por cadastro: R$ 0,00' numa conta sem cadastros

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** Novo módulo lib/meta/conversion.ts com `CONVERSION_LADDER`: lista ordenada de métricas candidatas (cadastro > conversa iniciada > clique no link > engajamento), cada uma com seus action_types exatos e um pacote de rótulos (label, shortLabel, costLabel, unit, unitPlural, isProxy). `resolveFromActions()` olha as actions que a conta REALMENTE devolveu no período e retorna a primeira faixa com volume > 0; `EMPTY_METRIC` cobre período sem entrega. `META_CONVERSION_ACTION_TYPE` deixou de ter default 'lead' e passou a significar 'forçar' — inclusive um custom conversion desconhecido, que vira uma métrica sintética 'Conversões'.

**Por quê.** O código antigo fazia `sumActions(row.actions, [conversionActionType || 'lead'])`. Numa conta só de ENGAJAMENTO/RECONHECIMENTO isso dá 0 → cpa = 0 → a tela exibia literalmente 'Cadastros: 0' e 'Custo por cadastro: R$ 0,00', afirmando um fato falso e parecendo painel quebrado. Com a escada, o painel mostra o melhor resultado que existe hoje, marca `isProxy` e migra sozinho para cadastro quando campanhas de conversão entrarem — sem deploy.

**Como replicar.** Copiar lib/meta/conversion.ts quase inteiro (é agnóstico de candidato). Revisar só a ordem/os degraus da escada conforme o plano de mídia do ACM (se lá houver campanhas de mensagem/WhatsApp, `conversa` pode subir; se houver muito vídeo, considerar um degrau de ThruPlay). Deixar META_CONVERSION_ACTION_TYPE VAZIO no .env para a autodetecção valer.

Arquivos: `lib/meta/conversion.ts` · `lib/meta/insights.ts` · `lib/meta/graph.ts` · `.env.example`

### Dupla contagem de conversão entre janelas de atribuição do mesmo evento

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** `countFor()` em lib/meta/conversion.ts percorre os action_types da faixa e retorna o PRIMEIRO com volume > 0, em vez de somar todos.

**Por quê.** Comentário no código: a Meta devolve variações do mesmo evento — `onsite_conversion.messaging_conversation_started_7d` e `onsite_conversion.total_messaging_connection` descrevem a mesma conversa com janelas diferentes; o mesmo vale para `lead` × `onsite_conversion.lead_grouped` × `offsite_conversion.fb_pixel_lead`. Somar tudo dobrava ou triplicava o volume de resultados e derrubava artificialmente o CPA.

**Como replicar.** Sempre que o painel do ACM somar uma lista de action_types de conversão, trocar por 'primeiro com volume'. Conferir o número resultante contra a coluna 'Resultados' do Gerenciador.

Arquivos: `lib/meta/conversion.ts`

### Retenção de vídeo com base errada: 25% aparecia sempre como 100%

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** `getVideoRetention` passou a pedir `video_play_actions` e usá-lo como base (com fallback para `video_view` e, por último, p25), e devolve `[]` quando não há reproduções, em vez de dividir por `p25 || 1`. Foi acrescentado também `video_thruplay_watched_actions` aos BASE_FIELDS para o KPI de ThruPlays.

**Por quê.** O código antigo usava `const base = p25 || 1`, o que forçava o ponto de 25% a valer sempre exatamente 100% — a curva de retenção era matematicamente incapaz de mostrar queda no primeiro quartil. E sem nenhum vídeo na conta, o `|| 1` produzia uma curva falsa 100/0/0/0 em vez de esconder o gráfico.

**Como replicar.** Se o gráfico de retenção do ACM mostra 25% = 100%, é este bug. Pedir `video_play_actions` e `video_thruplay_watched_actions` nos fields e usar plays como denominador.

Arquivos: `lib/meta/insights.ts` · `lib/meta/graph.ts`

### `targeting{geo_locations}` (sintaxe aninhada) volta VAZIO — é preciso pedir `targeting` inteiro

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** A consulta de conjuntos em lib/meta/geo.ts passou de `fields: "id,name,targeting{geo_locations}"` para `fields: "id,name,targeting"`, lendo `adset.targeting.geo_locations` do objeto devolvido.

**Por quê.** Comentário no código: com a sintaxe de campo aninhado a conta devolve o objeto vazio, sem erro HTTP. O painel de Território ficava completamente sem municípios (tabela vazia) mesmo com a segmentação preenchida no Gerenciador.

**Como replicar.** Grep por `targeting{` no painel do ACM e trocar por `targeting`. Se a aba de território estiver vazia lá, esta é a causa mais provável.

Arquivos: `lib/meta/geo.ts`

### `ad_snapshot_url` da Biblioteca embute o access_token — nunca pode ir ao cliente

`Copiar direto` · `Segurança` · impacto de não replicar: **alta**

**O que mudou.** `toLibraryAd` em lib/meta/adLibrary.ts deixou de repassar `ad.ad_snapshot_url` e passou a montar o link público `https://www.facebook.com/ads/library/?id=${ad.id}` no campo `snapshotUrl`.

**Por quê.** Comentário no código ('NUNCA usar ad_snapshot_url no cliente'): a Meta embute o access_token nessa URL, e o card da Biblioteca renderizava esse href no HTML servido ao navegador — o token da Ad Library vazava para qualquer visitante do painel. O link público abre o mesmo anúncio sem credencial.

**Como replicar.** Grep por `ad_snapshot_url` no painel do ACM. Se aparecer em qualquer prop de componente cliente, trocar imediatamente pelo link público por id e ROTACIONAR o token da Ad Library que ficou exposto.

Arquivos: `lib/meta/adLibrary.ts` · `components/BibliotecaClient.tsx`

### Duas definições de 'anúncio ativo' na Biblioteca: o gráfico dizia 61, o painel dizia 33

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** Criadas duas funções explícitas e exportadas em lib/meta/adLibrary.ts: `estaAtivoAgora(stopTs)` (sem data de fim OU fim no futuro) — única definição de 'ativo neste momento' — e `esteveAtivoEm(startISO, stopISO, dia)` para a série histórica. O último ponto da série (hoje) reaproveita `estaAtivoAgora`.

**Por quê.** Comentário no código, citando a divergência real 61 × 33. O status antigo era `ad.ad_delivery_stop_time ? 'PAUSADO' : 'ATIVO'`, que marcava como pausado qualquer anúncio com data de fim AGENDADA no futuro; e o gráfico usava outro critério por dia. Duas telas do mesmo painel mostravam contagens diferentes para a mesma coisa.

**Como replicar.** Comparar no painel do ACM o número de 'ativos' do card com o último ponto do gráfico de ativos. Se divergirem, centralizar numa única função exportada e chamá-la nos dois lugares.

Arquivos: `lib/meta/adLibrary.ts` · `lib/dashboard.ts`

### CTR e CPC da Meta usam `clicks` (todos os cliques), incoerente com o volume de cliques exibido

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** `AccountTotals` ganhou `ctrLink` e `cpcLink`, calculados sobre `inline_link_clicks` (ctrLink = linkClicks/impressions*100; cpcLink = spend/linkClicks). Os campos crus `ctr`/`cpc` da API continuam disponíveis, mas as telas de Campanhas, Desempenho e Eficiência passaram a exibir as versões de link.

**Por quê.** Comentário no código: os campos `ctr`/`cpc` da Meta são calculados sobre `clicks`, que inclui curtida, comentário e clique no perfil. O painel mostrava 'Cliques' com `inline_link_clicks` e ao lado um CTR calculado sobre outra base — dois números que não fechavam entre si na mesma tela.

**Como replicar.** Adicionar `inline_link_clicks` aos `fields` e derivar ctrLink/cpcLink. Decidir UMA definição de clique para o painel do ACM e usar a mesma base em todos os KPIs derivados.

Arquivos: `lib/meta/insights.ts` · `lib/dashboard.ts`

### `thumbnail_url` é SEMPRE 64x64 — a grade de criativos ficava pixelada

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** Nova função `creativeImage()` em lib/meta/campaigns.ts que prioriza `image_url`, depois `object_story_spec.video_data.image_url`, `photo_data.url`, `link_data.picture`, e só usa `thumbnail_url` como último recurso. Os fields do criativo passaram a pedir `creative{id,thumbnail_url,image_url,instagram_permalink_url,effective_object_story_id,object_story_spec}`. Foi criada também `creativePermalink()`, que abre o post real (Instagram permalink, ou Facebook montado a partir de `effective_object_story_id` no formato pageId_postId).

**Por quê.** Comentário no código: `thumbnail_url` devolve ≈1 KB em 64x64; nesta conta `image_url` devolve 1080x1440. Usar o thumbnail numa grade de cards deixa tudo borrado.

**Como replicar.** Grep por `thumbnail_url` no painel do ACM; onde alimentar card grande, trocar pela cascata de `creativeImage()`.

Arquivos: `lib/meta/campaigns.ts` · `lib/meta/creativeThumbs.ts`

### Filtro `effective_status: [ACTIVE, PAUSED]` na /ads escondia peças com gasto no período

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** A listagem de anúncios deixou de filtrar por `effective_status` na chamada e deixou de ter `limit = 20` default (hoje `limit = Infinity`); agora busca todos os anúncios paginando e descarta apenas os que não tiveram `spend > 0` na janela. O status virou coluna traduzida (`statusLabelAd`), montada a partir dos status que a conta realmente devolveu, com concordância de gênero própria para anúncio.

**Por quê.** Anúncio arquivado, excluído ou pausado pelo conjunto (`ADSET_PAUSED`, `ADSET_PAUSED_BY_AD_LIMIT`) sumia da grade mesmo tendo consumido verba no período analisado — o somatório dos criativos não fechava com o investimento total da conta. O `limit = 20` default também escondia peças silenciosamente.

**Como replicar.** Somar o `spend` dos cards de criativo do ACM e comparar com o KPI 'Investido'. Se não fechar, remover o filtro de status da query e filtrar por gasto na janela.

Arquivos: `lib/meta/campaigns.ts` · `lib/dashboard.ts`

### Plataforma do anúncio vinha da primeira linha do breakdown, não da dominante

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** Com `breakdowns: publisher_platform` no nível de anúncio, cada peça devolve várias linhas. Agora todas são somadas e um `Map byPlatform` guarda o gasto por plataforma; a etiqueta usa a plataforma com maior investimento (`dominant`). Foram acrescentados `audience_network` e `messenger` ao mapa de rótulos, que antes caíam em 'Meta'.

**Por quê.** O código antigo fazia `entry.platform = row.publisher_platform` da primeira linha vista, então um anúncio com 95% do gasto no Instagram podia aparecer rotulado como 'Facebook' (ou 'Audience Network') dependendo da ordem que a API devolvesse.

**Como replicar.** Copiar o bloco `byPlatform` + `dominant`. Vale a mesma lógica para qualquer breakdown usado como rótulo (dispositivo, posicionamento).

Arquivos: `lib/meta/campaigns.ts`

### Score do criativo era uma fórmula sem base (leads/gasto×1000, clampado em 100)

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** O score virou relativo: 100 para o melhor CPA da janela, `Math.max(1, round((melhorCPA/cpa)*100))` para os demais. Sem nenhuma conversão atribuída no período, usa impressões por real investido como proxy de entrega, normalizado pelo melhor.

**Por quê.** A fórmula antiga (`min(100, round((leads/(spend||1))*1000))`) saturava em 100 ou dava 0 para praticamente toda peça — o selo de score no card não distinguia nada. O `spend||1` também mascarava divisão por zero.

**Como replicar.** Se o painel do ACM mostra score 0 ou 100 na maioria dos cards, substituir pela normalização relativa ao melhor CPA da janela.

Arquivos: `lib/meta/campaigns.ts`

### Estatísticas por conjunto eram sobrescritas em vez de acumuladas

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** Em lib/meta/geo.ts, `statsByAdset.set(id, {...})` virou leitura do valor anterior e `+=` para spend, impressions, reach, clicks e conversions. Também passou a ignorar conjuntos com `spend <= 0`.

**Por quê.** Com paginação (ou qualquer quebra que gere mais de uma linha por adset_id), o `set` direto descartava todas as linhas anteriores e mantinha só a última — o município ficava com uma fração do gasto real, sem erro visível.

**Como replicar.** Revisar todo `Map.set` que agrega linhas de insights no painel do ACM (geo, criativos, plataformas) e garantir acumulação. Observação para o porte: `getCampaigns` em campaigns.ts ainda usa `set` direto por campaign_id — hoje é seguro porque não há breakdown ali, mas o padrão não se sustenta se alguém acrescentar um.

Arquivos: `lib/meta/geo.ts`

### Quebras de público pediam só `impressions` — sem verba, cliques nem resultado por segmento

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** Todas as quebras (age/gender, impression_device, hourly, e a nova publisher_platform) passaram a pedir `CAMPOS_QUEBRA = "spend,impressions,reach,inline_link_clicks,actions"` e a devolver o bloco completo `QuebraMetricas` (investimento, impressoes, alcance, cliques, resultados, cpa, cpm), com `acumular()` somando e `fecharQuebra()` calculando cpa/cpm só quando o denominador é > 0. O `limit` subiu de 200 para 500 e o filtro de idade virou `!/^(unknown|desconhec)/i` (antes só `!== "unknown"`).

**Por quê.** Antes o device breakdown devolvia apenas um percentual de impressões e o age/gender comparava homens×mulheres só por impressão — não dava para responder 'quanto custou cada faixa'. O filtro antigo deixava passar linhas 'Desconhecido'/'—' que apareciam como uma faixa etária real na tabela.

**Como replicar.** Copiar `QuebraMetricas`, `QUEBRA_ZERO`, `acumular()`, `fecharQuebra()` e `CAMPOS_QUEBRA`; aplicar às mesmas quatro quebras no painel do ACM.

Arquivos: `lib/meta/insights.ts`

### Zero falso: CPA R$ 0,00 e delta '+0,0%' onde não havia base de comparação

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** `delta()` em lib/format.ts devolve string vazia quando `prev` é 0 ou não finito (antes devolvia '+0,0%'); o componente Pill já retorna null com delta vazio e o KpiCard só renderiza a linha quando há `delta || note`, então o KPI simplesmente aparece sem pill. Todo custo derivado passou a ser exibido como '—' quando o denominador é zero (`cpa > 0 ? brl(cpa) : "—"` em KPIs, cards, tabelas e em METRICAS.cpa/cpm). `pctDe()` guarda contra max <= 0.

**Por quê.** Comentário em lib/format.ts: afirmar estabilidade ('+0,0%') onde não existe janela anterior é inventar informação — a conta só começou a veicular em 16/08/2026, e um '+0,0%' verde ao lado de um número novo lê como 'estável'. E 'Custo por resultado: R$ 0,00' lia-se como 'custo zero', quando o correto é 'sem resultado atribuído'.

**Como replicar.** Grep por `R$ 0,00` e por `+0,0%` na tela do ACM em um período sem entrega. Aplicar a mesma regra: sem denominador, '—'. Antes de mudar `delta()`, verificar se algum consumidor faz `delta.startsWith("+")` sem checar string vazia.

Arquivos: `lib/format.ts` · `lib/metricas.ts` · `lib/dashboard.ts` · `components/ui/Pill.tsx` · `components/ui/Kpi.tsx`

### `total_follows` volta VAZIO na Marketing API — fallback documentado para o Instagram Graph API

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** `total_follows` continua nos BASE_FIELDS e alimenta `followsAds` em AccountTotals (a coluna 'Seguidores no Instagram' do gerenciador); quando vem 0, o dashboard exibe 'Novos seguidores' vindo do novo módulo lib/meta/instagram.ts, que consulta `/{ig-id}/insights?metric=follower_count&period=day`. O módulo descobre o perfil automaticamente pelo campo `instagram_business_account` da primeira página de META_AD_LIBRARY_PAGES (override por META_INSTAGRAM_ID), cacheia o perfil por 3600s e a série por 600s, e `janelaValida()` recorta a janela aos 30 dias que a API aceita, marcando `janelaCortada: true`. Estado vazio: SEGUIDORES_ZERO.

**Por quê.** Comentário em insights.ts: o campo foi testado em conta/campanha/conjunto/anúncio, nas versões v21/v23/v25 e com todas as janelas de atribuição, e sempre volta vazio nesta conta — quem copiar vai perder horas descobrindo isso sozinho. E o número do perfil NÃO é atribuível à mídia (soma orgânico), por isso o rótulo muda de 'Seguidores via anúncios' para 'Novos seguidores' com a nota 'crescimento do perfil'; são dois números diferentes com o mesmo nome, e rotular a diferença evita que o time compare com o gerenciador e ache que um dos dois está errado. Sem o recorte de 30 dias, o preset 'Tudo' devolvia erro da API do Instagram e derrubava a página.

**Como replicar.** Copiar lib/meta/instagram.ts inteiro (ele já se auto-descobre pela página da Biblioteca do ACM). Manter os DOIS caminhos e os rótulos distintos, manter a chamada envolvida em `.catch(() => SEGUIDORES_ZERO)` para o Instagram não derrubar a página, e garantir os escopos instagram_basic e instagram_manage_insights no token.

Arquivos: `lib/meta/insights.ts` · `lib/meta/instagram.ts` · `lib/dashboard.ts` · `.env.example`

### /activities sem `fields` explícito produzia linha do tempo ilegível

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **baixa**

**O que mudou.** A chamada passou a pedir `fields: "event_type,event_time,translated_event_type,actor_name,object_name,object_type,extra_data"`, ganhou um mapa `EVENT_LABEL` com 18 eventos traduzidos, e `detailFrom()` monta 'nome do objeto · valor antigo → valor novo' lendo `old_value/new_value`, `old_budget/new_budget`, `old_status/new_status` do `extra_data`. Revalidate baixo (5s), porque é o log de quem mexeu no gerenciador agora.

**Por quê.** Sem `fields`, a edge devolve só o conjunto default: o título vinha como `update_ad_set_budget` cru e o detalhe era um despejo genérico de `Object.entries(extra_data)` no formato 'chave: valor'. Ninguém conseguia ler a linha do tempo de alterações da conta.

**Como replicar.** Copiar activities.ts quase direto — o mapa de eventos e a leitura do extra_data são independentes de candidato.

Arquivos: `lib/meta/activities.ts`

### Alcance somado em quebras não é alcance único — a limitação ficou documentada no tipo

`Copiar direto` · `Armadilha da API` · impacto de não replicar: **baixa**

**O que mudou.** O campo `reach` de `GeoRow` recebeu comentário explicando que é a SOMA do alcance dos conjuntos daquele município, não alcance único de verdade; o texto argumenta por que a sobreposição é pequena nesta conta (um conjunto por cidade).

**Por quê.** A Graph API só devolve alcance único no nível agregado da consulta; somar alcance de linhas de breakdown conta a mesma pessoa mais de uma vez. Sem o aviso, alguém somaria o alcance dos municípios e reportaria um número maior que o alcance total da conta.

**Como replicar.** Manter o comentário ao portar e nunca apresentar a soma de alcance por quebra como 'alcance único' na UI do ACM. Na Bahia, se houver conjuntos multi-cidade, a sobreposição é maior — reavaliar o argumento.

Arquivos: `lib/meta/geo.ts`

### Cidade fantasma "Geral Ce" liderando o ranking de municípios com ~39% da verba

`Adaptar` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** Em `getGeoBreakdown`, conjunto cuja segmentação tem `regions` mas não tem `cities` passou a ir para uma linha estadual própria ('Ceará · segmentação estadual'), fora do ranking de municípios. O fallback pelo token de LOCALIZACAO da taxonomia só é aceito se o token não casar com o regex `NAO_E_MUNICIPIO` (GERAL, GERAL CE, CE, CEARA, ABERTO, TODOS, ESTADO, ESTADUAL, BR, BRASIL). Conjunto sem nenhuma pista de local também vira estadual, em vez de sumir. Conjunto com várias cidades é rateado proporcionalmente (`share = 1/names.length`). Foram expostos `unmapped` (municípios sem macrorregião) com console.warn.

**Por quê.** Comentário no código: o fallback pelo nome criava a cidade 'Geral Ce', que liderava o ranking de municípios com ~39% da verba — um município inexistente no topo da tela de Território. A linha estadual preserva a verba (é real, só não é atribuível a município) e o `unmapped` impede que uma cidade nova desapareça em silêncio.

**Como replicar.** Copiar a lógica, trocando os tokens do regex pelos equivalentes da Bahia (GERAL BA, BA, BAHIA, ...) e o rótulo 'Ceará · segmentação estadual' por 'Bahia · segmentação estadual'.

Arquivos: `lib/meta/geo.ts` · `lib/dashboard.ts`

### Janelas de data calculadas em UTC pulavam um dia à noite (a Meta usa o fuso da CONTA)

`Adaptar` · `Armadilha da API` · impacto de não replicar: **alta**

**O que mudou.** lib/period.ts passou a formatar datas com `toLocaleDateString('en-CA', { timeZone: TZ_CONTA })` (en-CA já entrega YYYY-MM-DD) e a calcular 'hoje' via `hojeNaConta()`. O fuso vem de `META_ACCOUNT_TIMEZONE` (default America/Fortaleza). Foi corrigido também `CAMPAIGN_START` para a data real de criação da conta (2026-08-10), limite inferior do preset 'Tudo' e de `rangeAcumulado()`.

**Por quê.** Comentário no código: a Meta interpreta `time_range` no fuso da conta; com `new Date().toISOString()` a janela pulava um dia entre 21h e 24h no horário local — quem abrisse o painel à noite via um dia a mais/a menos de gasto do que o Gerenciador.

**Como replicar.** Ler o fuso real em /act_<id>?fields=timezone_name e setar META_ACCOUNT_TIMEZONE (a Bahia é America/Bahia). ATENÇÃO ao copiar: `previousRange()` e `daysBetween()` ainda fazem parse em `T00:00:00Z` e formatam no fuso da conta — verificado no repo: `previousRange({since:'2026-08-10'})` devolve until '2026-08-08' em vez de '2026-08-09'. Corrija esse resto de off-by-one ao portar (o mesmo vale para o primeiro dia de daysBetween).

Arquivos: `lib/period.ts` · `.env.example`

### Biblioteca de Anúncios: consulta por página, paginação por cursor e recorte temporal

`Adaptar` · `Armadilha da API` · impacto de não replicar: **media**

**O que mudou.** `fetchPageAds` consulta UMA página por vez (até 20 iterações de 100 via `paging.cursors.after`, teto default de 600 por candidato), aplica `ad_delivery_date_min` (env META_AD_LIBRARY_DESDE) e marca `truncado` quando bate no teto — a UI então mostra 'N+' em vez de um total falso. `monitoredPages()` passou a fazer o parse correto de META_AD_LIBRARY_PAGES nos dois formatos (`id:Nome,id:Nome` e só-IDs), tratando a primeira página como a do próprio candidato; o código antigo fazia `libraryPages.split(":")[0]`, que só funcionava para uma página. Cada página tem try/catch próprio e campo `erro`.

**Por quê.** Três sintomas: (1) numa busca conjunta com todos os page_ids, o candidato com mais anúncios ocupa as primeiras páginas e os concorrentes simplesmente não apareciam; (2) sem `ad_delivery_date_min`, a Biblioteca devolve as campanhas antigas (o Elmano tem anúncios de 2022) que enchiam a primeira página e escondiam o que está no ar; (3) sem paginar, o 'total' exibido era o limite do próprio fetch, não o número de anúncios do candidato. E a falha de uma página não pode derrubar as outras.

**Como replicar.** Copiar `monitoredPages`/`fetchPageAds`/`searchAdLibraryByCandidate`. Trocar apenas os page_ids no .env (primeiro = ACM Neto, demais = adversários da Bahia) e a data de META_AD_LIBRARY_DESDE.

Arquivos: `lib/meta/adLibrary.ts` · `.env.example`

## Arquitetura

_18 itens_

### A métrica de conversão é resolvida UMA vez e injetada em todas as quebras

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** `getAccountTotals()` resolve a métrica do período e a devolve dentro de AccountTotals (campo `metric`). Todas as funções de quebra passaram a RECEBER essa métrica como parâmetro obrigatório: getCampaigns(range, metric), getDailySeries, getAgeGenderBreakdown, getSegmentBreakdown, getDeviceBreakdown, getHourlyBreakdown, getPlatformBreakdown, getGeoBreakdown, getAdsWithCreatives. Em lib/dashboard.ts o padrão é sempre: buscar totals primeiro, depois disparar as quebras em Promise.all com `totals.metric`.

**Por quê.** Se cada quebra resolvesse a própria métrica, o município A poderia contar 'conversas' e o B 'engajamentos' — os números da mesma tela não somariam e o ranking compararia coisas diferentes. Injetar a métrica resolvida uma vez garante que KPI, série diária, mapa, faixa etária e lista de campanhas contem exatamente o mesmo action_type. É injeção de dependência aplicada à definição de 'resultado'.

**Como replicar.** Ao portar, manter a assinatura com `metric: ConversionMetric` nas funções de insights do ACM e NUNCA chamar resolveFromActions dentro de uma quebra. O ponto de entrada é sempre getAccountTotals.

Arquivos: `lib/meta/insights.ts` · `lib/meta/campaigns.ts` · `lib/meta/geo.ts` · `lib/dashboard.ts`

### Rótulos do painel derivam da métrica vigente e descem até os componentes (resultLabel/costLabel)

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** Todas as funções getXData de lib/dashboard.ts devolvem `resultLabel` (metric.shortLabel) e `costLabel` (metric.costLabel), que as páginas passam como props para TerritorioClient, PublicoClient, CampaignListPanel e SimuladorClient. No cliente, `rotularMetricas(resultLabel, costLabel)` (lib/metricas.ts) clona o catálogo sobrescrevendo só 'resultados' e 'cpa'. O KPI do hero usa metric.label/metric.costLabel, `metric.isProxy` vira a nota 'melhor resultado disponível', o título do painel de Eficiência virou `{data.costLabel} × volume — por campanha` e os chips A/B de Desempenho usam `data.metricLabels[k]` no lugar da constante METRIC_LABELS.

**Por quê.** Sem isso, a tela diria 'Cadastros' enquanto o número somado é de conversas iniciadas — mentira sobre o que o número significa, e o tipo de inconsistência que faz a pessoa duvidar do painel inteiro. Com a propagação, trocar a conversão renomeia automaticamente KPI, chip do seletor, cabeçalho de ranking, tooltip do mapa, título de Eficiência e frases geradas.

**Como replicar.** Nas páginas do ACM, encaminhar resultLabel/costLabel de cada getXData para os componentes cliente e usar rotularMetricas em vez de strings fixas ('Cadastros', 'Custo por cadastro'). Se a conta do ACM otimizar mesmo para lead, o mecanismo devolve 'Cadastros' e não atrapalha.

Arquivos: `lib/dashboard.ts` · `lib/metricas.ts` · `components/TerritorioClient.tsx` · `components/PublicoClient.tsx` · `components/CampaignListPanel.tsx` · `app/publico/page.tsx`

### Remoção do dataset ilustrativo: safe() devolve estado vazio tipado e a origem distingue 'erro'

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** lib/mock/data.ts (334 linhas) foi apagado e nenhum arquivo o referencia. O helper `safe<T>()` de lib/dashboard.ts mudou de assinatura: antes devolvia { value, source } e caía no dataset ilustrativo quando isMockMode() ou em qualquer exceção; agora devolve { value, ok } e o fallback é o ESTADO VAZIO tipado daquele domínio. O tipo Source virou 'live' | 'mock' | 'erro' e `sourceOf(ok)` só produz 'live' ou 'erro'.

**Por quê.** Era o problema estrutural mais grave do painel clonado: quando o token expirava ou uma consulta falhava, a tela continuava bonita mostrando números fictícios com um selo amarelo discreto — e uma decisão de verba podia ser tomada em cima deles. Separar 'zero real' de 'não consegui consultar' é a diferença entre um painel confiável e um painel decorativo.

**Como replicar.** No projeto do ACM: apagar lib/mock/data.ts, trocar cada fallback de mock pelo estado vazio correspondente, adotar o par safe()/sourceOf e atualizar DataSourceBadge para os três estados. Compilar com TypeScript: os erros apontam exatamente cada ponto que ainda dependia do mock.

Arquivos: `lib/dashboard.ts` · `components/ui/Pill.tsx`

### Cada módulo exporta a sua constante de estado vazio — o que tornou a remoção do mock possível

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** O padrão que substituiu o dataset ilustrativo: EMPTY_TOTALS (insights.ts, já com metric = resolveFromActions(undefined)), EMPTY_METRIC (conversion.ts), QUEBRA_ZERO (insights.ts), SEGUIDORES_ZERO (instagram.ts), EMPTY_THUMBS (creativeThumbs.ts), KWAI_ZERADO (kwai.ts), EMPTY_SERIES e LINHA_ZERO (dashboard.ts / metricas.ts), mais arrays vazios tipados nos fallbacks de safe(). Cada getXData compõe o seu fallback a partir dessas constantes, e o KPI do hero é montado com heroKpisFrom(EMPTY_TOTALS, EMPTY_TOTALS).

**Por quê.** Sem um 'vazio' bem tipado por domínio, remover o mock quebraria as páginas (undefined em toda parte) ou exigiria checagem defensiva em cada componente. Com o vazio como cidadão de primeira classe, a página renderiza a mesma estrutura com zeros e '—', e o selo de origem informa se aquilo é falha ou ausência de entrega.

**Como replicar.** Antes de apagar o mock do ACM, criar a constante de estado vazio de cada módulo de dados; só então trocar os fallbacks. É a ordem que evita quebrar as páginas no meio da migração.

Arquivos: `lib/meta/insights.ts` · `lib/meta/conversion.ts` · `lib/meta/instagram.ts` · `lib/meta/creativeThumbs.ts` · `lib/kwai.ts` · `lib/metricas.ts`

### Páginas e gráficos deixaram de cair em série mock quando não há dado

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** app/campanhas/page.tsx importava `dayLabels` e `series` do mock e fazia `data.daily?.length ? real : mockSeries.investimento` em cada linha do gráfico; agora consome `data.daily` direto, sem ternário. O mesmo padrão de mistura foi eliminado em todas as getXData (havia 30+ pontos de `x.length ? x : mock.x` em lib/dashboard.ts, incluindo retenção de vídeo, faixas, dispositivos, horários, segmentos, biblioteca e desperdício).

**Por quê.** O fallback por campo era o pior caso do mock: metade da tela real, metade ilustrativa, sem nenhuma marcação de qual era qual — o gráfico desenhava uma curva bonita e inventada e a pessoa lia tendência onde não havia dado. A limpeza foi segura porque o SvgLines de components/ui/Chart.tsx (não alterado) já renderiza 'sem dados no período' quando todas as séries chegam vazias.

**Como replicar.** Auditar com `grep -rn "mock" app/ components/ lib/` e remover TODO ternário `real : mock`. Antes de apagar, conferir se cada componente de gráfico/tabela trata array vazio; onde não tratar, escrever o estado vazio primeiro.

Arquivos: `app/campanhas/page.tsx` · `lib/dashboard.ts` · `components/ui/Chart.tsx`

### isMockMode()/MOCK_DADOS substituídos por isMetaConfigured() e isLibraryConfigured()

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** O antigo graph.ts tinha isMockMode(), ligado por MOCK_DADOS=true ou pela simples ausência de token/conta. Foi removido e substituído por dois predicados explícitos e independentes: `isMetaConfigured()` (token + ad account) e `isLibraryConfigured()` (token e páginas da Biblioteca, que são credenciais separadas). Falta de configuração agora produz console.error com o nome da variável ausente e origem 'erro'; getBibliotecaData tem seu próprio short-circuit.

**Por quê.** Ausência de credencial não é um modo de operação válido — era isso que fazia o painel abrir 'funcionando' com dados falsos em qualquer ambiente sem .env. Separar os dois checks importa porque a Biblioteca de Anúncios usa token próprio: a conta pode estar OK e a Biblioteca não, e o painel precisa degradar só o bloco afetado.

**Como replicar.** Remover MOCK_DADOS do .env.example e do código do ACM e adotar os dois predicados; garantir que a mensagem de erro cite a variável que faltou.

Arquivos: `lib/meta/graph.ts` · `lib/dashboard.ts` · `.env.example`

### Simulador reconstruído sobre o plano real, projetando com CPM/CPA reais

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** getSimuladorBaseline foi substituída por getSimuladorData e o SimuladorClient foi reescrito. A função antiga fabricava baselines multiplicando o CPA real por constantes inventadas (cpaBase: [metaCpa*0.82, metaCpa]; cpmBase por foco: 0.88/0.73/0.8/1.01) e caía num baseline mock quando leads == 0; os 3 controles eram fictícios (verba livre de R$ 50k a 800k, split Kwai×Meta, um 'foco' ilustrativo) sobre um gráfico de cenários '% Kwai'. A nova agrega as campanhas REAIS por objetivo do plano e calcula o CPM/CPA de cada objetivo a partir desse agregado, expondo BaseObjetivo com `temBase` (spend>0 && impressões>0). Na tela: seleção de FASE, 5 sliders de objetivo com pesos iniciais do plano, badge 'sem base', botão 'Voltar ao plano', indicador âmbar quando a soma dos pesos foge de 100%, 4 KPIs, tabela verba/entrega por objetivo, leitura textual comparando CPM real × CPM assumido pelo plano e aviso de verba sem atribuição.

**Por quê.** Multiplicador arbitrário produz projeção que parece precisa e não é — a pior espécie de número num painel de decisão de verba. O simulador antigo simulava um mundo que não existe (verba arbitrária, plataforma que não veicula, constantes ilustrativas). Usar o custo real por objetivo e sinalizar explicitamente a lacuna quando o objetivo ainda não rodou preserva a honestidade da projeção.

**Como replicar.** Portar getSimuladorData + SimuladorClient (o componente é agnóstico: lê tudo de `dados`) e apagar qualquer baseline com multiplicador fixo. A lógica é genérica; só o conteúdo de lib/plano.ts muda.

Arquivos: `lib/dashboard.ts` · `components/SimuladorClient.tsx` · `app/simulador/page.tsx` · `lib/plano.ts`

### lib/metricas.ts: catálogo único de métricas selecionáveis (rótulo, formatação e direção)

`Copiar direto` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** Novo módulo com o dicionário METRICAS (investimento, impressoes, alcance, cliques, resultados, cpa, cpm). Cada MetricaDef traz label, `curto` (para chips estreitos), `formatar`, `compacto`, e duas flags semânticas: `menorMelhor` (custo — inverte ranking e cor) e `derivada` (média, não pode ser somada nem percentualizada entre linhas). Traz ainda os conjuntos por página (METRICAS_TERRITORIO, METRICAS_PUBLICO, METRICAS_CRIATIVOS, METRICAS_CAMPANHAS, METRICAS_EFICIENCIA), `rotularMetricas(shortLabel, costLabel)`, `pctDe()` (percentual clampado 0–100 para largura de barra, com guarda contra max <= 0) e `valorDe`.

**Por quê.** Antes cada tela formatava e nomeava a métrica do seu jeito. Centralizando, 'CPM' tem o mesmo nome, o mesmo formato e a mesma direção de ranking em Território, Público, Criativos, Campanhas e Eficiência, e o comportamento de custo (menor é melhor) não precisa ser relembrado em cada componente — TerritorioClient usa `metrica.menorMelhor` para inverter a ordenação e PublicoClient usa `metrica.derivada` para suprimir percentuais sem sentido.

**Como replicar.** Copiar lib/metricas.ts sem alteração — não há nada de Ceará nele (só depende de lib/format.ts). Ajustar apenas os conjuntos por página se o painel do ACM tiver telas diferentes. É pré-requisito de TerritorioClient, PublicoClient e do seletor do CampaignListPanel.

Arquivos: `lib/metricas.ts` · `components/TerritorioClient.tsx` · `components/PublicoClient.tsx` · `components/CampaignListPanel.tsx` · `components/MapaCeara.tsx`

### Servidor entrega números crus por linha (LinhaMetricas) para o cliente trocar de métrica sem refetch

`Copiar direto` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** O contrato de dados passou a carregar TODAS as métricas de cada linha, não só a que será exibida: CampaignRowView ganhou o campo opcional `metricas` (investimento, impressoes, alcance, cliques, resultados, cpa, cpm), o mesmo shape de LinhaMetricas/LINHA_ZERO em lib/metricas.ts e de LinhaGeo em TerritorioClient; as quebras de público usam o acumulador `QuebraMetricas` e o dashboard devolve `{ label, ...m }`. O seletor de métrica é 100% client-side (useState + useMemo).

**Por quê.** Trocar a métrica exibida é uma pergunta de leitura, não uma nova consulta. Enviando os números crus uma vez, o seletor responde instantaneamente, sem round-trip ao servidor nem nova chamada à Graph API (que tem rate limit), e o cliente nunca precisa recalcular derivadas — cpa e cpm já vêm calculados na linha.

**Como replicar.** No ACM, garantir que as quebras devolvam o objeto completo de métricas por linha e que os componentes de ranking recebam a linha inteira, indexando por MetricaId.

Arquivos: `lib/types.ts` · `lib/metricas.ts` · `lib/meta/insights.ts` · `lib/dashboard.ts` · `components/CampaignListPanel.tsx` · `components/TerritorioClient.tsx`

### Consumidores da taxonomia: rótulo de campanha, fallback de município e chave de darkpost

`Copiar direto` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** Três módulos consomem lib/meta/taxonomy.ts com papéis distintos: campaigns.ts usa campaignLabel/adLabel para o nome exibido e parseCampaign para extrair `metaDesempenho`; geo.ts usa `parseAdSet(...).localizacao` apenas como FALLBACK quando o conjunto não tem cities nem custom_locations no targeting, filtrando o token com NAO_E_MUNICIPIO antes de aceitá-lo; creativeThumbs.ts usa parseAd/tokens para casar darkposts (que não têm corpo de texto) pelo token de localização.

**Por quê.** Demonstra o padrão certo: a taxonomia nunca substitui o dado estruturado da API, só cobre os buracos que a API deixa. Sem o fallback, conjuntos com segmentação por raio/custom location sumiriam do mapa; sem o token de localização, os darkposts ficariam sem miniatura.

**Como replicar.** Manter a mesma ordem de precedência ao portar (API primeiro, nome depois) e revisar o filtro de 'não é município' com a lista de cidades da Bahia.

Arquivos: `lib/meta/campaigns.ts` · `lib/meta/geo.ts` · `lib/meta/creativeThumbs.ts` · `lib/meta/taxonomy.ts`

### Botão "Atualizar" que realmente descarta o cache (app/actions.ts + tag 'meta')

`Copiar direto` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** Nova Server Action `atualizarDados()` que chama `updateTag('meta')`; todo fetch da Graph API passou a ser feito com `{ next: { revalidate, tags: ['meta'] } }` em lib/meta/graph.ts. No Header, o avatar 'RC' com 'Sala de mídia / gestor@campanha' (dado inventado, sem autenticação por trás) foi removido e substituído por <BotaoAtualizar/>, que aguarda a action e então dispara `router.refresh()` dentro de startTransition, com estado ocupado (botão desabilitado, cursor `progress`, texto 'Atualizando…', ícone `refresh` girando pela nova keyframe `girar` em globals.css) e o horário da última atualização forçada no `title`.

**Por quê.** São necessários dois passos: sem o `router.refresh()` o cache cairia mas a tela continuaria pintada com os dados antigos, dando impressão de botão quebrado. E `updateTag` foi escolhido em vez de `revalidateTag` porque, nesta versão do Next, revalidateTag serve conteúdo obsoleto enquanto revalida em segundo plano — não é o que se espera de um botão clicado por quem acabou de mexer no gerenciador de anúncios.

**Como replicar.** Copiar app/actions.ts, BotaoAtualizar.tsx, a keyframe `girar` e a troca no Header; adicionar `tags:['meta']` no fetch central do ACM. Conferir na doc do Next instalado se `updateTag` existe naquela versão.

Arquivos: `app/actions.ts` · `components/BotaoAtualizar.tsx` · `lib/meta/graph.ts` · `components/Header.tsx` · `app/globals.css`

### Fronteira servidor/cliente: getXData server-only compõe, componentes *Client só interagem

`Copiar direto` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** A camada lib/dashboard.ts é 'server-only' e continua sendo o único ponto que compõe dados para cada rota (uma função getXData por página), mas as telas que ganharam interação viraram componentes cliente dedicados, criados nesta migração: TerritorioClient, PublicoClient, BibliotecaClient, MapaCeara e o SimuladorClient reescrito. As páginas viraram cascas finas (ler searchParams → resolveRange → getXData → passar props). Os módulos de acesso à API (graph, insights, campaigns, geo, conversion, instagram, creativeThumbs, kwai, adLibrary, taxonomy) abrem com `import 'server-only'`.

**Por quê.** Mantém a interatividade (seletor de métrica, filtro, mapa, simulador) sem transformar a página inteira em client component — o que exigiria expor dados ou credenciais ao navegador. O 'server-only' é a trava mecânica dessa fronteira: um import indevido quebra o build em vez de vazar o token silenciosamente.

**Como replicar.** Ao portar os componentes interativos para o ACM, manter as páginas como Server Components e adicionar 'server-only' no topo de todo módulo que toque a Graph API.

Arquivos: `lib/dashboard.ts` · `lib/meta/graph.ts` · `lib/meta/conversion.ts` · `lib/meta/instagram.ts` · `lib/meta/creativeThumbs.ts` · `lib/kwai.ts`

### lib/plano.ts: o plano de mídia vira fonte única, separado do dado real

`Adaptar` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** Novo módulo que declara o plano de mídia: VERBA_TOTAL (R$ 2.000.000), PLANO_OBJETIVOS (5 objetivos com verba, papel, descrição e cor), PLANO_FASES (3 fases com pct, verba e impressões projetadas), IMPRESSOES_PLANO_MI e `cpmPlanejado(fase?)`, que DERIVA o CPM assumido pelo plano das próprias metas (verba/impressões) em vez de repetir um número. O comentário no topo fixa a regra: aqui só entram METAS; custo real (CPM/CPA) nunca é escrito no arquivo, vem sempre da Meta.

**Por quê.** Antes o simulador tinha verba, divisão e baselines chumbados dentro do componente. Com o plano num só módulo, mudar a verba ou o peso de um objetivo é editar um arquivo — simulador, pacing e a comparação plano×realizado leem tudo daqui e ficam coerentes automaticamente. A separação meta×realizado impede o erro clássico de alimentar a projeção com um número inventado.

**Como replicar.** Copiar a ESTRUTURA do arquivo e substituir integralmente os valores pelo plano de mídia do ACM Neto (verba total, objetivos, fases, impressões projetadas). NÃO copiar os números do Ceará: eles produziriam pacing e simulação falsos na Bahia.

Arquivos: `lib/plano.ts` · `lib/dashboard.ts` · `components/SimuladorClient.tsx`

### REGRAS_ATRIBUICAO: campanha real → objetivo do plano, com casamento exclusivo e sobra visível

`Adaptar` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** lib/plano.ts define REGRAS_ATRIBUICAO (objetivo do plano × regex sobre o `objective` bruto da Meta × regex sobre o nome da campanha) e `objetivoDaCampanha(objetivoMeta, nome)`, que percorre as regras EM ORDEM e devolve a primeira que casar — atribuição exclusiva. Em getSimuladorData, a verba de campanhas que nenhuma regra classificou é acumulada em `semAtribuicao` e exibida no SimuladorClient com a instrução literal de ajustar REGRAS_ATRIBUICAO.

**Por quê.** 'Regionalização' no plano é uma tática que atravessa os outros objetivos — campanhas geolocalizadas também são de engajamento. Sem exclusividade, a mesma verba seria contada duas vezes e o realizado somaria mais que o gasto. E como a atribuição depende do padrão de nomes da equipe, a verba não classificada precisa aparecer na tela em vez de sumir: é o sinal de que a regra ficou desatualizada.

**Como replicar.** Reescrever as regex de `nome` com os tokens da taxonomia usada na conta do ACM e conferir a ordem (a primeira que casa vence). Manter o card de `semAtribuicao` na tela — é o alarme de regra defasada. Se o padrão de nomes for outro e as regras não casarem, TUDO cai em 'sem atribuição'.

Arquivos: `lib/plano.ts` · `lib/dashboard.ts` · `components/SimuladorClient.tsx`

### Pacing da verba: plano + dias até a eleição + gasto acumulado da conta

`Adaptar` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** getCampanhasData passou a devolver um bloco `pacing` que cruza três fontes: VERBA_TOTAL (lib/plano.ts), `diasAteEleicao()` (lib/candidato.ts) e `getGastoAcumulado()` (insights, janela explícita até hoje). Calcula budget, gasto, restante, pctGasto, diasRestantes, dataEleicao, mediaDiariaNecessaria (restante/dias até o 1º turno) e mediaDiariaAtual. Na tela de Campanhas entraram 3 cards em `repeat(auto-fit, minmax(158px,1fr))` — 'Já investido' (% do plano + 'Ainda disponível R$ X'), 'Dias até o 1º turno' (com a data) e 'Média diária necessária' (verde quando o ritmo atual alcança o necessário, vermelho quando não, com a nota 'ritmo atual R$ X/dia') — mais uma barra de progresso da verba. O painel ganhou `overflow: auto` e `flexShrink: 0` nos blocos.

**Por quê.** 'Investimento total' sozinho não diz se a campanha está adiantada ou atrasada; o pacing responde a pergunta que o coordenador de mídia realmente faz. O comentário registra a decisão de ancorar no ACUMULADO da conta e não na janela: senão trocar o período faria o mesmo plano aparecer 20% ou 80% consumido, sem motivo. O `auto-fit` existe para os cards quebrarem linha em painel estreito em vez de espremer e sobrepor rótulos.

**Como replicar.** Portar o bloco `pacing` e o JSX. ADAPTAR: VERBA_TOTAL é a do plano da Bahia (aqui é R$ 2.000.000); a data do 1º turno provavelmente é a mesma (04/10/2026), mas conferir; o fuso do cálculo de dias vem de lib/candidato.ts e precisa virar America/Bahia. Se a campanha do ACM veicular Kwai de verdade, somar o gasto do Kwai ao acumulado.

Arquivos: `lib/dashboard.ts` · `lib/plano.ts` · `lib/candidato.ts` · `lib/meta/insights.ts` · `app/campanhas/page.tsx`

### lib/kwai.ts: plataforma não iniciada modelada explicitamente, no lugar do dado ilustrativo

`Adaptar` · `Arquitetura` · impacto de não replicar: **alta**

**O que mudou.** Novo módulo que representa o Kwai como plataforma sem veiculação: KWAI_AVISO/KWAI_DETALHE (textos), isKwaiConfigured() (checa KWAI_ACCESS_TOKEN/KWAI_ACCOUNT_ID), o objeto KWAI_ZERADO com `iniciada: false`, getKwaiTotals() (hoje sempre zerado) e kwaiCampaignRows(), que devolve UMA linha no mesmo formato CampaignRowView das campanhas reais, com status 'NÃO INICIADA'. O dashboard usa esses valores no split de verba, nos platCards e na tabela comparativa, onde o lado do Kwai fica '—' e o vencedor vira SEM_VENCEDOR ('—'); ComparativoRow.winner foi ampliado para aceitar '—'. Antes existiam KWAI_MOCK_SPEND = 185141.1 e campanhas fictícias do Kwai no mock.

**Por quê.** O painel anterior exibia R$ 185 mil de investimento em Kwai que não existiam, e a comparação entre plataformas declarava um vencedor comparando dado real com dado fictício. Modelar o estado 'não iniciada' mantém o bloco na tela (a plataforma está no plano) sem inventar número, e deixa a porta aberta: quando os tokens chegarem, basta implementar getKwaiTotals — o resto do painel já consome esses mesmos campos.

**Como replicar.** Se o painel do ACM tiver Kwai realmente em veiculação, NÃO copiar o zeramento: implementar getKwaiTotals de verdade mantendo o mesmo tipo KwaiTotals. Se o Kwai também não rodou lá, copiar como está trocando os textos.

Arquivos: `lib/kwai.ts` · `lib/dashboard.ts` · `lib/types.ts` · `.env.example`

### lib/meta/taxonomy.ts: taxonomia de nomes lida como dica, nunca como contrato

`Adaptar` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** Novo módulo que lê o padrão de nomes da conta ([ELEICOES2026] [OBJETIVO] [META DESEMPENHO] [AMBIENTE] etc.). `tokens()` extrai o conteúdo entre colchetes e descarta o prefixo fixo para as posições seguintes valerem com ou sem ele; `freeText()` recupera o que sobra fora dos colchetes. parseCampaign/parseAdSet/parseAd são posicionais COM heurística: listas de hints (POSICIONAMENTO_HINTS, PUBLICO_HINTS, OBJETIVO_HINTS) identificam o token pelo conteúdo e o que sobra no meio vira localização, então a leitura sobrevive à troca de ordem. Toda função devolve campos `undefined` em vez de lançar erro. adLabel() e campaignLabel() geram rótulos curtos (sem o prefixo fixo, truncando em 64 caracteres).

**Por quê.** A equipe de mídia altera o padrão de nomes quando precisa e sobem nomes fora do padrão o tempo todo; um parser rígido derrubaria páginas inteiras. O comentário do módulo fixa a hierarquia correta: onde a Graph API expõe o dado estruturado (ex.: targeting.geo_locations.cities), a API tem precedência e a taxonomia entra só como reforço ou fallback.

**Como replicar.** Copiar o módulo e ajustar: (1) FIXED_PREFIX para o prefixo da conta do ACM, (2) as listas de hints se a nomenclatura da Bahia usar outros termos, (3) o regex de formato em parseAd. A estrutura tolerante a falha deve ser mantida como está.

Arquivos: `lib/meta/taxonomy.ts`

### lib/meta/creativeThumbs.ts: índice que dá imagem aos anúncios da Biblioteca casando duas APIs

`Adaptar` · `Arquitetura` · impacto de não replicar: **media**

**O que mudou.** Novo módulo que lista os criativos da PRÓPRIA conta (/{account}/ads com creative{thumbnail_url,image_url,body,object_story_spec}) e monta um índice duplo: `byBody` (texto do criativo normalizado) e `byLocal` (token de município, para darkposts sem corpo). `thumbFor()` resolve primeiro por texto e depois por local; o tipo Thumb carrega `big`, que distingue imagem em tamanho cheio (image_url / object_story_spec) da miniatura de 64x64. `normText`/`normLocal` normalizam acento, espaço e caixa; `localFromBody` extrai a cidade do texto do anúncio.

**Por quê.** A Ad Library API não devolve imagem — só textos e o ad_snapshot_url, que embute o access_token e por isso não pode ir para o navegador; buscar o snapshot pelo servidor também não resolve porque a página monta as imagens por JavaScript. Como para o próprio candidato existe acesso à conta de anúncios, a Marketing API fornece a imagem real. Para concorrentes não há caminho, e o dashboard só aplica miniatura quando `proprio` é true.

**Como replicar.** Copiar o módulo; a mecânica é genérica. ADAPTAR o regex de `localFromBody` (hoje casa 'vamos mudar <cidade>', o texto da campanha do Ciro) para o padrão de copy do ACM, ou remover esse atalho e ficar só com o casamento por texto e por token da taxonomia.

Arquivos: `lib/meta/creativeThumbs.ts` · `lib/dashboard.ts` · `lib/types.ts` · `components/BibliotecaClient.tsx`

## Interface

_31 itens_

### Badge de origem do dado ganha o estado "erro"

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** DataSourceBadge (components/ui/Pill.tsx) aceitava só `"live" | "mock"` e exibia 'Dados ao vivo · Meta' ou 'Dados ilustrativos'. Agora aceita `"live" | "mock" | "erro"`: live = verde 'Dados ao vivo · Meta'; erro = vermelho 'Falha ao consultar a Meta' (#FF8189 sobre rgba(228,34,43,.16)); mock = âmbar 'Sem dados'. Um badge também foi acrescentado ao cabeçalho da linha do tempo comparativa em Desempenho, que era o único painel de gráfico sem indicação de origem.

**Por quê.** Zero por falha de API e zero por ausência de entrega são coisas opostas e ficavam visualmente idênticas. Num painel de campanha isso vira decisão errada de verba.

**Como replicar.** Copiar o componente. Requer que `sourceOf()` na camada de dados devolva 'erro' quando a chamada falha.

Arquivos: `components/ui/Pill.tsx` · `lib/dashboard.ts` · `app/desempenho/page.tsx`

### Público: um seletor de métrica aplicado aos 4 painéis simultaneamente

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** app/publico/page.tsx (86 linhas de JSX) virou casca de 22 linhas e o conteúdo foi para components/PublicoClient.tsx (182 linhas). Uma linha de chips no topo (METRICAS_PUBLICO, roxo #9B7BFF quando ativo, impressões como padrão) troca a métrica de faixa etária, dispositivo, horário e segmentos ao mesmo tempo. O layout passou de 3 colunas × 2 linhas para 2×2 com `minmax(0,1fr)` nas duas direções.

**Por quê.** Antes cada quebra vinha pré-formatada do servidor numa métrica única e fixa. Cruzar 'qual faixa etária clica mais' com 'qual faixa etária custa menos' exigia trocar de tela; agora é um clique, e as quatro visões continuam falando da mesma métrica.

**Como replicar.** Copiar PublicoClient.tsx e a page. Depende de getPublicoData devolver TODAS as métricas por linha (faixas/dispositivos/horários/segmentos) em vez de strings prontas — essa mudança é da camada de dados.

Arquivos: `components/PublicoClient.tsx` · `app/publico/page.tsx` · `lib/metricas.ts`

### Biblioteca de Anúncios: abas por candidato, incluindo concorrentes

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** app/biblioteca/page.tsx caiu de 191 para 15 linhas e todo o conteúdo virou components/BibliotecaClient.tsx (876 linhas). O painel recebe `porCandidato: CandidatoBiblioteca[]` — um grupo por página monitorada — e mostra um botão por candidato à direita; clicar troca a grade de cards, a visão geral, a distribuição por plataforma e o 'Em destaque'. O próprio candidato é o padrão (`porCandidato.find(c => c.proprio)`).

**Por quê.** Biblioteca de Anúncios só é útil em campanha se der para olhar o adversário. Antes o painel mostrava apenas os próprios anúncios, e a comparação era feita fora do painel, na Biblioteca pública da Meta.

**Como replicar.** Copiar BibliotecaClient.tsx e a page — o componente não tem nada hardcoded de candidato. A lista de páginas monitoradas vem de META_AD_LIBRARY_PAGES; na Bahia trocar pelos page IDs do ACM Neto (primeiro) + adversários baianos.

Arquivos: `components/BibliotecaClient.tsx` · `app/biblioteca/page.tsx` · `lib/dashboard.ts`

### Biblioteca: preview real do criativo, com layout diferente para concorrente

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O quadrado cinza de 64px virou um componente `Preview` que renderiza a imagem real. O AdCard muda de forma conforme haja miniatura: com preview usa grid `104px minmax(0,1fr)` e corta a copy em 2 linhas; SEM preview (caso dos concorrentes) o bloco de imagem desaparece, a copy ganha 3 linhas e entra um botão 'Ver anúncio na Biblioteca ↗' no rodapé do card.

**Por quê.** Sem preview, um painel de biblioteca de anúncios é uma lista de textos. A Ad Library API não devolve imagem e o `ad_snapshot_url` não pode ir ao navegador (embute o token), então a miniatura só existe para o próprio candidato, via Marketing API. Deixar o card do concorrente com um retângulo cinza vazio parece bug; transformar o espaço vago em CTA para a Biblioteca pública resolve o que o painel não pode resolver sozinho.

**Como replicar.** Copiar Preview, VerNaBiblioteca e AdCard. Depende de lib/meta/creativeThumbs.ts; na Bahia, conferir se a taxonomia de nomes das campanhas tem token de localização equivalente, senão o casamento de darkpost falha.

Arquivos: `components/BibliotecaClient.tsx` · `lib/meta/creativeThumbs.ts` · `lib/types.ts`

### Modal comparativo: anúncios ativos por candidato ao longo do tempo

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** Botão 'Ver comparativo' abre um modal (fixed, overlay rgba(4,10,26,.72) com backdrop-filter, fecha por clique fora, botão × e tecla Escape via listener em useEffect) com um gráfico de linhas de 45 dias e escala COMPARTILHADA entre candidatos. Detalhe técnico deliberado: as linhas ficam no SVG com `preserveAspectRatio="none"` e `vector-effect: non-scaling-stroke`, enquanto marcadores, rótulos de fim de linha e tooltip são HTML posicionado em porcentagem — dentro de um viewBox esticado um `<circle>` SVG viraria elipse. A linha do próprio candidato usa strokeWidth 2.8 contra 1.5 dos concorrentes.

**Por quê.** É a leitura de disputa: quem está subindo pressão de mídia e quem parou. A escala compartilhada é o que impede a comparação de enganar, e o traço mais grosso no próprio candidato é a linha que a sala de mídia acompanha.

**Como replicar.** Copiar ComparativoChart e ComparativoModal inteiros — são agnósticos de candidato. O dado vem de `serieAnunciosAtivos()` em lib/dashboard.ts. Atenção à janela: ela é montada a partir de HOJE para trás (45 dias), justamente porque adversários com arquivo de eleições anteriores puxariam o gráfico para um passado distante.

Arquivos: `components/BibliotecaClient.tsx` · `lib/dashboard.ts`

### Criativos: filtro de status e ordenação reais, no lugar de chips decorativos

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** Os chips 'Todos / Kwai / Meta / Vídeo / Estático' eram `<div>` com `cursor: default` e o primeiro fixo em azul — não filtravam nada. Foram substituídos por dois grupos de ChipLink navegáveis por searchParams: STATUS ('Todos (n)' + os status que a conta realmente devolveu, verde #21C46A no ATIVO) e ORDENAR (CRIATIVO_ORDENS: Investimento, Impressões, Cliques, Menor CPA). O texto à direita virou 'N de M anúncios · clique para abrir a publicação'.

**Por quê.** Filtro falso é pior que ausência de filtro: o usuário acha que aplicou um filtro e lê números errados. Nota de design registrada em lib/types.ts: 'Resultados' foi deixado FORA das ordens de propósito, porque cada objetivo de campanha tem um resultado diferente (engajamento conta interação, reconhecimento conta alcance, mensagens conta conversa) e ordenar peças de objetivos distintos por um número só compara o incomparável. A nota sobre Kwai ilustrativo saiu porque não há mais dado ilustrativo no painel.

**Como replicar.** Copiar o bloco de chips e CRIATIVO_ORDENS de lib/types.ts. A page lê `sp.ordem` e `sp.status` e valida contra a lista antes de passar para getCriativosData. O mesmo padrão (só oferecer o filtro que existe nos dados) vale para a Biblioteca.

Arquivos: `app/criativos/page.tsx` · `lib/types.ts` · `lib/dashboard.ts`

### Criativos: grade sem teto de 10, badge de status e link para a publicação

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O `slice(0,10)` e o `gridTemplateRows: "1fr 1fr"` saíram; entrou `gridAutoRows: minmax(210px,1fr)` com `alignContent: start`, então a grade cresce e rola. A área da imagem virou `<a>` para `c.permalink`, com badge de status no canto inferior esquerdo (verde para ATIVO, escuro para PAUSAD/ARQUIV/EXCLU, âmbar para o resto) e ícone ↗ no canto superior direito quando há link. O rodapé do card mostra `c.ordemValue` (o valor da métrica pela qual a grade está ordenada) em vez do gasto fixo.

**Por quê.** Comentário no dashboard sobre o teto: 'a campanha sobe anúncios aos poucos, cidade a cidade — qualquer limite fixo aqui viraria "a conta tem N anúncios" mentindo para o usuário'. O permalink resolve a pergunta imediata de quem vê o card ('como é essa peça inteira?'), e mostrar o valor da ordenação evita ordenar por cliques e ler gasto.

**Como replicar.** Copiar a grade e os campos `status`, `permalink`, `ordemValue` em CreativeCard. Requer que o fetch de anúncios peça `effective_status` e `creative{instagram_permalink_url, effective_object_story_id}`.

Arquivos: `app/criativos/page.tsx` · `lib/types.ts` · `lib/meta/campaigns.ts`

### Desempenho: tabela de interações por criativo no lugar de barras verticais

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O painel central trocou `VerticalBar` (barras sem número, rótulo cortado) por uma tabela de 7 colunas: Peça, Impr., Reações, Coment., Compart., Salvos, Engaj. — com cabeçalho sticky (`position: sticky; top: 0; background: var(--panel)`), linhas zebradas (`i % 2 ? var(--soft)`), quadradinho colorido por plataforma antes do nome (Instagram #9B7BFF, Facebook #2E8FFF, resto #35D0FF), truncamento com ellipsis via `maxWidth: 0` na primeira célula, taxa de engajamento em verde nos 3 primeiros e estado vazio 'sem interações no período'. A ordenação é por TAXA de engajamento, não por volume, e o subtítulo diz isso.

**Por quê.** Comentário no dashboard: 'taxa é comparável entre peças com entregas muito diferentes; volume não é'. As barras verticais mostravam só uma métrica agregada sem número; a tabela expõe as 5 interações que a Meta devolve separadamente, que é o que a sala de mídia usa para decidir realocação.

**Como replicar.** Copiar o <table> inteiro. Requer que getDesempenhoData devolva `interCriativo` com {nome, impressoes, reacoes, comentarios, compartilhamentos, salvos, taxa, cor} — o mapeamento de action types (post_reaction, comment, post, onsite_conversion.post_save) está em lib/meta/campaigns.ts.

Arquivos: `app/desempenho/page.tsx` · `lib/dashboard.ts` · `lib/meta/campaigns.ts`

### Barra lateral: cor explícita nos ícones (correção de contraste no tema claro)

`Copiar direto` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O objeto `railIcon` em components/Sidebar.tsx ganhou `color: "rgba(255,255,255,.72)"`. Os botões de tema e de sair também ganharam estado de hover (fundo rgba(255,255,255,.12), ícone #fff, `transition: all .18s ease`) que os itens de navegação já tinham.

**Por quê.** Comentário no arquivo: a barra lateral é escura NOS DOIS TEMAS, e sem a cor explícita os ícones herdavam --text, que no tema claro é azul-marinho — e sumiam no fundo escuro da barra, deixando a navegação inteira invisível. O caso geral: qualquer superfície que não segue o tema precisa declarar suas próprias cores em vez de herdar tokens globais.

**Como replicar.** Copiar as duas mudanças diretamente para o Sidebar do ACM. Correção pura, sem dependência de dado.

Arquivos: `components/Sidebar.tsx`

### Tokens de tema dedicados ao mapa (--mapaFill / --mapaStroke)

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Adicionados dois tokens em app/globals.css nos dois temas: escuro `rgba(255,255,255,.05)` / `rgba(255,255,255,.16)`; claro `rgba(20,45,100,.1)` / `rgba(20,45,100,.34)`.

**Por quê.** Comentário no arquivo: --soft/--line são fracos demais para desenhar 184 contornos e ainda deixar as bolhas legíveis por cima, e no tema claro 4,5% de opacidade simplesmente some sobre fundo branco. Tokens próprios permitem calibrar o peso do traço sem mexer no resto do design system.

**Como replicar.** Copiar as 4 declarações de token para o globals.css do ACM (blocos `:root` e `[data-theme="light"]`). Os valores servem como estão.

Arquivos: `app/globals.css` · `components/MapaCeara.tsx`

### Público: barra bidirecional homens×mulheres e supressão de % em métricas derivadas

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Faixa etária virou barra bidirecional (homens crescendo para a esquerda em #35D0FF, mulheres para a direita em #FF7BC8) com escala compartilhada `maxFaixa` entre os dois lados e `title` com o valor formatado; as cores mudaram do par azul/amarelo (#2E8FFF/#F5B301) para ciano/rosa. Em Dispositivo, além do valor aparece a participação percentual — mas apenas quando `!metrica.derivada`. Em Horário, a barra fica em ciano cheio quando ≥80% do pico e translúcida abaixo. Em Segmentos, o verde de 'bom' respeita `menorMelhor`.

**Por quê.** Escala compartilhada é o que torna a comparação entre gêneros honesta. E a supressão da % em métricas derivadas evita exibir um percentual que não significa nada (somar CPA/CPM entre dispositivos não faz sentido) — o erro mais comum em painel com seletor de métrica.

**Como replicar.** Copiar como está. A regra `!metrica.derivada` vem do flag em lib/metricas.ts; se o painel do ACM adicionar novas métricas médias (frequência, CTR), marcar `derivada: true` nelas.

Arquivos: `components/PublicoClient.tsx` · `lib/metricas.ts`

### Biblioteca: filtro de status que só oferece o que existe

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Os 4 chips decorativos ('Ativos / Inativos / Vídeo / Imagem') — que eram `<div>` sem onClick, com o primeiro sempre aceso — foram substituídos por botões reais: 'Todos (n)', 'Ativos (n)', 'Pausados (n)', com contagem. `statusDisponiveis` filtra `["ATIVO","PAUSADO"]` mantendo só os que existem de fato na lista do candidato selecionado, e o bloco inteiro some se nenhum existir. O texto do cabeçalho acompanha o filtro.

**Por quê.** Chip que não filtra é pior que chip nenhum: o usuário acha que aplicou um filtro e lê números errados. Ocultar status inexistente evita a experiência de clicar e receber uma grade vazia.

**Como replicar.** Copiar como está. Mesmo padrão aplicado à página de Criativos — vale replicar nos dois.

Arquivos: `components/BibliotecaClient.tsx`

### Biblioteca: "Em destaque" prioriza imagem em resolução cheia (thumbBig)

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** O slot grande antes era um retângulo `var(--slot10)` de 90px fixos. Agora escolhe o anúncio por ordem de preferência: ativo COM `thumbBig` → qualquer um com `thumbBig` → ativo mais recente → mais recente. `thumbBig` marca que a imagem veio de `image_url` (resolução cheia) e não de `thumbnail_url` (sempre 64×64). Quando não há imagem grande, o bloco de imagem some e o CTA vai para `marginTop: auto`.

**Por quê.** Ampliar a miniatura de 64px da Meta num slot grande resulta em borrão. A flag `thumbBig` deixa o componente escolher o candidato certo em vez de arriscar.

**Como replicar.** Copiar `buildOverview()` e o painel 'Em destaque'. Garantir que BibliotecaCard tenha `thumbUrl` e `thumbBig` e que o fetch de criativos peça `image_url` antes de `thumbnail_url`.

Arquivos: `components/BibliotecaClient.tsx` · `lib/types.ts` · `lib/meta/creativeThumbs.ts`

### Biblioteca: visão geral calculada sobre todos os anúncios, não só os 8 visíveis

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** `buildOverview(cards, todos)` passou a receber dois argumentos: a distribuição por plataforma e o total/ativos/pausados são computados sobre TODOS os anúncios do candidato, e só o 'Em destaque' olha os 8 cards visíveis. O número grande ganha sufixo '+' quando `truncado` é true.

**Por quê.** Contar só os 8 cards da grade dava leitura enviesada da presença em cada rede — comentário explícito no código. E exibir '600' sem o '+' quando o número é na verdade um piso é afirmar precisão que não existe.

**Como replicar.** Copiar a assinatura de buildOverview e a renderização `{total}{truncado ? "+" : ""}`. Requer que o grupo por candidato traga `total`, `ativos` e `truncado` da camada de dados.

Arquivos: `components/BibliotecaClient.tsx` · `lib/dashboard.ts`

### Modal comparativo: gasto e impressões exibidos em FAIXA, não em valor cheio

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Componente CardsFaixa mostra, por candidato, 'Gasto declarado' e 'Impressões estimadas' como intervalo (ex.: 'R$ 12.000 – R$ 24.000'), somando os pisos e os tetos dos anúncios (spendMin/spendMax/impressionsMin/impressionsMax vindos de `rangeBounds` em adLibrary.ts); quando min == max exibe um número só. A nota 'faixa somada dos anúncios' fica no cabeçalho de cada bloco, e as cores acompanham as linhas do gráfico.

**Por quê.** A Biblioteca publica gasto e impressões de anúncio político em intervalos, nunca o valor cheio. Exibir um número único ali seria inventar precisão — e num painel de campanha isso vira citação errada em reunião.

**Como replicar.** Copiar CardsFaixa. Requer que a camada de dados some spendMin/spendMax/impressionsMin/impressionsMax por candidato (já está em serieAnunciosAtivos).

Arquivos: `components/BibliotecaClient.tsx` · `lib/dashboard.ts` · `lib/meta/adLibrary.ts`

### Modal comparativo: leitura em texto gerada dos próprios números

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** `lerComparativo()` produz frases a partir da série: quem lidera hoje e por quanto (ou empate, ou 'nenhum dos N tem anúncio ativo hoje'); e por candidato — se está zerado há N dias e quando foi o pico, ou se subiu/recuou/ficou estável comparado com 7 dias atrás, sempre citando o pico e a data. As frases entram num bloco 'LEITURA' ciano abaixo da legenda.

**Por quê.** Comentário no código: 'nada de texto fixo: se a disputa virar, o texto vira junto'. É a diferença entre um gráfico que alguém precisa interpretar e um painel que já entrega a conclusão — sem risco de ficar desatualizado como um texto redigido à mão.

**Como replicar.** Copiar `lerComparativo()` e ComparativoLeitura sem alteração — as frases são montadas de `series[].candidato` e `values[]`, sem nome de candidato hardcoded.

Arquivos: `components/BibliotecaClient.tsx`

### Desempenho: frase de destaque gerada abaixo da tabela de criativos

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Rodapé com bolinha âmbar e uma frase gerada: se a peça de maior taxa tem entrega ABAIXO da média das peças, 'candidata natural a receber verba'; se já tem a maior entrega, 'pouco espaço para ganho só realocando verba'. Só aparece com mais de 2 criativos.

**Por quê.** É exatamente a leitura que a sala de mídia faz olhando a tabela — automatizá-la economiza a reunião e evita a conclusão errada de que a peça líder em taxa sempre merece mais verba.

**Como replicar.** Copiar o bloco `data.destaqueCriativo` e o cálculo em lib/dashboard.ts (compara impressões do top com a média das peças). Sem nada específico de Ceará.

Arquivos: `app/desempenho/page.tsx` · `lib/dashboard.ts`

### Desempenho: proporções do grid ajustadas para a tabela caber

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** O grid dos três painéis inferiores foi de `1fr / 1.2fr / 1fr` para `.85fr / 2.3fr / .85fr`, dando quase o triplo de largura ao painel central.

**Por quê.** A tabela de interações por criativo tem 7 colunas e quebrava coluna no espaço antigo. É a mudança de layout que torna o painel novo utilizável.

**Como replicar.** Aplicar junto com a tabela de interações; sem o ajuste de largura a tabela fica ilegível.

Arquivos: `app/desempenho/page.tsx`

### Desempenho: linha tracejada legível no tema claro

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** A série B do gráfico comparativo foi de `#F5B301` com `width: 0.7` para `#E08A00` com `width: 2`, e a série A de 0.9 para 1.8. Comentário no arquivo: '0,7px tracejado sumia no fundo claro; 2px com traço mais longo fica legível'.

**Por quê.** Correção de tema claro concreta: amarelo fino tracejado sobre branco é praticamente invisível, e era a linha de comparação — a métrica B do painel.

**Como replicar.** Aplicar os mesmos valores no gráfico equivalente do ACM. Vale auditar qualquer outro `strokeWidth` abaixo de 1 no SvgLines do painel.

Arquivos: `app/desempenho/page.tsx`

### Campanhas: lista com seletor de métrica e contagem honesta de ativas

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** CampaignListPanel ganhou um `<select>` com METRICAS_CAMPANHAS (Investimento, Impressões, Alcance, Resultados, CPA); a coluna direita mostra `metrica.compacto(c.metricas[metricaId])` e a linha de baixo mostra 'CPA R$ X' quando a métrica é investimento, ou o nome da métrica nos outros casos. A contagem 'N ativas' passou a filtrar `status !== "NÃO INICIADA"` e devolve 'sem campanhas' quando não sobra nenhuma. O campo de busca encolheu de 148px fixos para `flex: 1 1 90px` com placeholder 'Buscar...'.

**Por quê.** Contar a linha de aviso ('Kwai não iniciada') como campanha ativa dava '1 ativa' num painel sem campanha nenhuma. E poder olhar a lista por alcance ou por CPA sem sair da tela é o pedido mais frequente de quem usa a lista.

**Como replicar.** Copiar o componente. Requer o campo opcional `metricas` em CampaignRowView; sem ele o componente cai no `c.spend` formatado, então dá para portar em duas etapas.

Arquivos: `components/CampaignListPanel.tsx` · `lib/types.ts` · `lib/metricas.ts`

### Período: mini-cards de criativo verticais e clicáveis

`Copiar direto` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Os 6 mini-cards de criativo eram horizontais com uma miniatura de 34px ao lado do texto. Viraram cards verticais: a imagem ocupa toda a altura disponível (`flex: 1` com `gridTemplateRows: minmax(0,1fr)` no container), badge de status no canto superior esquerdo, e o rodapé mostra gasto + CPA (antes só CPA). O card inteiro virou `<a>` para `c.permalink` com `title` 'nome — abrir publicação'.

**Por quê.** Comentário no arquivo: 'o criativo é a informação principal aqui, então a imagem fica com o espaço'. Miniatura de 34px não permite reconhecer a peça, que é justamente para que serve o painel.

**Como replicar.** Copiar o bloco. Depende dos campos `status` e `permalink` em CreativeCard — os mesmos exigidos pela página de Criativos.

Arquivos: `app/periodo/page.tsx` · `lib/types.ts`

### Território: fundo listrado de placeholder removido do container do mapa

`Copiar direto` · `Interface` · impacto de não replicar: **baixa**

**O que mudou.** O container do mapa não usa mais `background: var(--slot12)`. Ficou `borderRadius: 12, overflow: hidden` com fundo transparente, com comentário explicando que o padrão competia visualmente com os contornos dos municípios e com as bolhas.

**Por quê.** Os `--slotN` são texturas de placeholder do mockup. Onde entra conteúdo real, elas viram ruído.

**Como replicar.** Ao trocar qualquer placeholder por conteúdo real no painel do ACM, remover o `var(--slotN)` do container. Vale também para o hero de Início e para os cards de criativo.

Arquivos: `components/TerritorioClient.tsx`

### Mapa do estado desenhado em SVG puro, com bolhas por município

`Adaptar` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O painel de Território tinha um retângulo cinza com o texto '[ mapa da Bahia · choropleth ]'. Foi substituído por components/MapaCeara.tsx (313 linhas), que desenha os 184 contornos municipais em <path> SVG e sobrepõe bolhas por município. A projeção é equirretangular com correção de cosseno na longitude (calculada a partir do bbox da malha), o raio da bolha é `base + sqrt(valor/max)*escala` para que a ÁREA fique proporcional ao número, e as bolhas são ordenadas por raio decrescente para as menores não ficarem escondidas atrás das maiores. Não usa biblioteca de mapa nem servidor de tiles — funciona offline.

**Por quê.** Território era o único painel 100% placeholder. Com dado real de segmentação por cidade (targeting.geo_locations.cities), a leitura geográfica é o que a sala de mídia mais pede numa campanha estadual, e um choropleth por biblioteca externa traria dependência, custo de tiles e problema de CSP.

**Como replicar.** Copiar MapaCeara.tsx inteiro e trocar apenas o import da malha (`@/lib/geo/ceara-malha.json` → malha da Bahia). Toda a lógica de projeção, escala de bolha e tooltip é agnóstica de estado: ela lê `bbox`, `municipios` e `populacaoTotal` do próprio JSON. Renomear o componente para MapaBahia para não confundir.

Arquivos: `components/MapaCeara.tsx` · `components/TerritorioClient.tsx` · `app/territorio/page.tsx`

### Território: seletor de métrica com inversão correta para métricas de custo

`Adaptar` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** components/TerritorioClient.tsx (novo, 211 linhas) oferece 6 chips de métrica (alcance é o padrão) que reordenam o ranking e redimensionam as bolhas. Para CPA (`menorMelhor`) o ranking inverte (menor primeiro) e a barra usa `maxRanking - valor + 1`. E o mapa NÃO passa a dimensionar por custo: quando a métrica é de custo, a bolha volta a usar o investimento e o valor de custo aparece como linha `detalhe` no tooltip.

**Por quê.** Alcance é o padrão porque em campanha eleitoral a pergunta é 'quantas pessoas dessa cidade eu atingi', não quanto gastei nela. E a inversão do mapa evita o erro clássico de bolha grande significar coisa ruim sem o usuário perceber.

**Como replicar.** Copiar TerritorioClient.tsx e ajustar só o import do mapa. A page vira ~20 linhas passando municipios/regioes/resultLabel/costLabel/source.

Arquivos: `components/TerritorioClient.tsx` · `app/territorio/page.tsx` · `lib/metricas.ts`

### Cabeçalho: chip do Kwai desativado em vez de navegar para um filtro que não existia

`Adaptar` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** O tipo PLATFORMS em components/Header.tsx ganhou a flag `indisponivel`. Quando marcada, o chip vira um `<span>` com borda tracejada, cor --dim, `cursor: not-allowed` e `title: "Campanha ainda não iniciada no Kwai Ads"` — não é mais um link. O comentário no arquivo documenta o bug e a saída: quando o Kwai entrar, basta remover `indisponivel` e ligar o filtro na camada de dados.

**Por quê.** É o pior tipo de bug de interface — silencioso e convincente: o chip navegava para `?platform=kwai` sem que NADA lesse esse parâmetro, então ele acendia em azul e a tela seguia mostrando os números do Meta como se fossem do Kwai.

**Como replicar.** Copiar a flag e o branch de renderização. ADAPTAR: verificar em lib/dashboard.ts do ACM se o parâmetro `platform` é realmente lido. Se for e o Kwai veicular, deixar o chip clicável; se continuar sem leitor, marcar `indisponivel: true` — ou implementar o filtro.

Arquivos: `components/Header.tsx`

### Mapa: alternância município ↔ macrorregião

`Adaptar` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Botão 'Ver por regiões / Ver por município' no cabeçalho do painel. No modo região as bolhas somam valor e alcance por macrorregião, e a POSIÇÃO da bolha é a média das coordenadas das cidades ponderada pelo próprio valor (a bolha cai onde a verba está); a população da região soma TODOS os municípios dela, não só os anunciados. Os contornos também mudam: no modo região cada município é pintado com a cor da sua macrorregião (fill `+33`, stroke `+88`), e a legenda vira lista de regiões em vez de escala de tamanho.

**Por quê.** Município a município fica ilegível com 184 bolhas; por região a leitura estratégica (onde a campanha está concentrada) aparece de imediato. Somar população de todos os municípios da região, e não só dos anunciados, evita inflar artificialmente a % de penetração.

**Como replicar.** Vem junto com o MapaCeara; só depende de lib/geo/<estado>.ts existir. Na Bahia, com 417 municípios, o modo região fica ainda mais importante — considere torná-lo o padrão (`useState<ModoMapa>("regiao")` em TerritorioClient).

Arquivos: `components/MapaCeara.tsx` · `components/TerritorioClient.tsx`

### Mapa: tooltip com penetração populacional e ressalva para >100%

`Adaptar` · `Interface` · impacto de não replicar: **media**

**O que mudou.** Ao passar o mouse numa bolha aparece um tooltip HTML (posicionado em % sobre o SVG, com flip automático para a esquerda quando x>60%) mostrando: valor da métrica, população residente (Censo 2022), pessoas alcançadas e % da população. Acima de 100% o número vira âmbar (#FFCF54) em vez de verde e ganha a explicação: 'Acima de 100% é esperado: a segmentação inclui quem esteve recentemente na cidade, e o alcance da Meta conta contas, não pessoas'. O mesmo tratamento aparece na coluna % do ranking Top municípios (via `title`).

**Por quê.** Alcance absoluto não diz nada sem denominador — 50 mil pessoas em Fortaleza e em Sobral são coisas muito diferentes. E >100% acontece de verdade nos dados da Meta; sem a nota, o usuário conclui que o painel está errado e perde confiança em tudo.

**Como replicar.** Copiar junto com o mapa. Só funciona se o JSON da malha da Bahia trouxer `p` (população) por município. Manter a frase de ressalva literalmente — ela é sobre como a Meta conta alcance, não sobre o Ceará.

Arquivos: `components/MapaCeara.tsx` · `components/TerritorioClient.tsx`

### Território: ranking Top municípios com % da população e fonte declarada

`Adaptar` · `Interface` · impacto de não replicar: **media**

**O que mudou.** O ranking passou de lista fixa formatada no servidor para 14 linhas com grid variável: quando a métrica é `alcance` aparece uma 5ª coluna com % da população (verde até 100%, âmbar acima), e uma nota de rodapé 'População: IBGE · Censo 2022 · a % compara o alcance da Meta com a população residente' com o texto completo da fonte no `title`. Municípios sem valor na métrica são filtrados fora.

**Por quê.** Colocar a fonte na tela (e no title) evita a pergunta 'de onde veio essa população' toda vez que alguém abre o painel, e a % é o número que a coordenação de campo realmente usa.

**Como replicar.** Copiar junto. As constantes FONTE_POPULACAO / FONTE_POPULACAO_CURTA são exportadas pelo MapaCeara e lidas do JSON — basta que o JSON da Bahia traga o campo `fontePopulacao` correto.

Arquivos: `components/TerritorioClient.tsx` · `components/MapaCeara.tsx`

### Malha municipal + população do Censo vendorizadas num único JSON

`Não copiar` · `Interface` · impacto de não replicar: **alta**

**O que mudou.** Criado lib/geo/ceara-malha.json (~172 KB) com `{uf, bbox, municipios:[{cod,nome,c:[lon,lat],a:[anéis],p:população}], populacaoTotal, fontePopulacao}` — 184 municípios do Ceará, população IBGE Censo 2022, total 8.794.957. O componente exporta FONTE_POPULACAO lendo o campo `fontePopulacao` do próprio arquivo, para a nota exibida na tela nunca divergir do dado usado no cálculo.

**Por quê.** Sem geometria e sem população não existe mapa nem % de penetração. Vendorizar (em vez de baixar do IBGE em runtime) mantém o painel funcionando sem rede externa e sem CSP quebrando.

**Como replicar.** NÃO copiar este arquivo — ele é do Ceará. Gerar o equivalente para a Bahia (417 municípios) a partir da malha municipal do IBGE + agregado 4709/variável 93 do Censo 2022, mantendo EXATAMENTE o mesmo formato de chaves (uf, bbox, municipios[].c/.a/.p, populacaoTotal, fontePopulacao). Atenção: a Bahia tem mais que o dobro de municípios — vale simplificar os polígonos para o arquivo não passar de ~300 KB.

Arquivos: `lib/geo/ceara-malha.json` · `components/MapaCeara.tsx`

### Agrupamento de municípios em macrorregiões, com cores próprias

`Não copiar` · `Interface` · impacto de não replicar: **media**

**O que mudou.** lib/geo/ceara.ts registra 5 macrorregiões do Ceará (Grande Fortaleza; Norte · Sobral; Sertão Central · Inhamuns; Cariri · Centro Sul; Litoral Leste · Jaguaribe) com fallback 'Outras regiões', mais `normalize()` (tira acento, caixa e pontuação, para casar 'SAO GONCALO' com 'São Gonçalo') e `ordemMacrorregiao()` para ordem de exibição estável. MapaCeara.tsx tem a paleta CORES_REGIAO casada com esses nomes.

**Por quê.** A Meta não entrega performance por município e o breakdown `region` só desce até a UF. O agrupamento é dado de referência geográfica, não métrica — todos os números continuam vindo da API, e município não mapeado cai em 'Outras regiões' sem que nenhum total fique errado.

**Como replicar.** Criar lib/geo/bahia.ts com a MESMA estrutura (MACRORREGIOES, register(), normalize(), macrorregiaoDe(), ordemMacrorregiao()) usando as regiões da Bahia — ex.: RM Salvador, Oeste/Barreiras, Sudoeste/Vitória da Conquista, Chapada/Feira de Santana, Extremo Sul, Baixo Sul, São Francisco. Copiar `normalize()` sem alterar. Atualizar CORES_REGIAO com uma cor por região nova.

Arquivos: `lib/geo/ceara.ts` · `components/MapaCeara.tsx`

### Mockup de referência .dc.html atualizado para o Ceará

`Não copiar` · `Interface` · impacto de não replicar: **baixa**

**O que mudou.** O arquivo 'Painel Kwai Meta.dc.html' (o protótipo estático que originou o painel) teve todos os textos regionais trocados: ACM Neto → Ciro Gomes, Bahia → Ceará, Salvador → Fortaleza, RMS → RMF, 'Feira/Vitória' → 'Sobral/Cariri', 'mapa da Bahia' → 'mapa do Ceará', nomes de campanhas mock e textos de análise. Também recebeu a foto e o gradiente do hero.

**Por quê.** É o documento de referência de design; deixá-lo falando da Bahia num projeto do Ceará confunde quem for consultá-lo depois.

**Como replicar.** NÃO copiar — no projeto do ACM este arquivo já está correto (Bahia). Só vale portar dele a mudança estrutural do hero (img + gradiente sobre o placeholder), se quiserem manter o mockup em dia com o painel.

Arquivos: `Painel Kwai Meta.dc.html`

## Identidade e configuração

_6 itens_

### Cabeçalho: identificação do candidato no lugar da rota

`Copiar direto` · `Identidade` · impacto de não replicar: **media**

**O que mudou.** Sob o título da página, a linha que mostrava a rota ('/campanhas') virou 'Candidato · Cargo · Ano', lendo CANDIDATO/CARGO/ANO de lib/candidato.ts, com o nome em negrito na cor --text2 e separadores em --dim.

**Por quê.** Comentário no arquivo: 'antes mostrava só a rota, que não diz nada a quem usa'. O painel é aberto por gente de campanha, não por desenvolvedor; a rota era informação de debug ocupando o espaço nobre do cabeçalho, e a identificação evita confusão quando o mesmo time opera painéis de candidatos diferentes.

**Como replicar.** Copiar o bloco no Header; o mecanismo é idêntico, só os valores de lib/candidato.ts mudam.

Arquivos: `components/Header.tsx` · `lib/candidato.ts`

### Versão da Graph API subida de v22.0 para v25.0 (default do código e do .env)

`Copiar direto` · `Configuração` · impacto de não replicar: **baixa**

**O que mudou.** `DEFAULT_VERSION` em lib/meta/graph.ts passou de 'v22.0' para 'v25.0'; `META_API_VERSION=v25.0` documentado no .env.example.

**Por quê.** Versões da Graph API são depreciadas em ~2 anos e param de responder; campos usados aqui (`total_follows`, `publisher_platform` com threads, `video_thruplay_watched_actions`) dependem de versão recente. Rodar numa versão vencida derruba o painel inteiro de uma vez, sem aviso prévio na UI.

**Como replicar.** Conferir a versão fixada no painel do ACM e subir para a mesma v25.0 (ou a atual), testando as quebras e os campos de vídeo depois.

Arquivos: `lib/meta/graph.ts` · `.env.example`

### lib/candidato.ts + variáveis NEXT_PUBLIC_: identidade centralizada e sobrescrevível por env

`Adaptar` · `Identidade` · impacto de não replicar: **alta**

**O que mudou.** Novo módulo concentrando CANDIDATO, CARGO, PARTIDO, ANO, DATA_ELEICAO, FOTO_CANDIDATO e `diasAteEleicao()` (nunca devolve negativo). Cada valor tem default no código e override por NEXT_PUBLIC_*: NEXT_PUBLIC_CANDIDATO (texto livre — vira título da aba, nome no Header, nome em caixa alta no hero e alt da foto), NEXT_PUBLIC_CARGO (padrão 'Cargo · Estado'), NEXT_PUBLIC_PARTIDO (sigla) e NEXT_PUBLIC_DATA_ELEICAO (ISO YYYY-MM-DD, de onde sai ANO via .slice(0,4)). Consumido por app/layout.tsx (metadata), app/inicio/page.tsx (hero), Header.tsx, Sidebar.tsx e lib/dashboard.ts (pacing). No .env.example as três primeiras estão VAZIAS de propósito.

**Por quê.** Antes cada arquivo lia process.env.NEXT_PUBLIC_* com seu próprio fallback duplicado — app/layout.tsx tinha `|| "ACM Neto"` e app/inicio/page.tsx repetia `|| "ACM Neto"` / `|| "Governador · Bahia"`; o título da aba e o hero podiam divergir, e trocar de candidato exigia caçar strings. Com um módulo só, o clone do painel é uma edição de arquivo (ou de .env), e deixar as envs vazias no exemplo evita empurrar a identidade de um candidato para quem clonar.

**Como replicar.** Copiar o módulo trocando os defaults ('ACM Neto', 'Governador · Bahia', sigla do partido, data do 1º turno) e apontando FOTO_CANDIDATO para a foto dele; substituir todas as leituras diretas de process.env.NEXT_PUBLIC_* nas páginas por imports deste módulo. No .env.local do ACM: NEXT_PUBLIC_CANDIDATO=ACM Neto, NEXT_PUBLIC_CARGO=Governador · Bahia, etc. ATENÇÃO: NEXT_PUBLIC_* é embutida no bundle em build time — mudar o valor exige rebuild, não só restart.

Arquivos: `lib/candidato.ts` · `app/layout.tsx` · `app/inicio/page.tsx` · `components/Header.tsx` · `components/Sidebar.tsx` · `lib/dashboard.ts`

### Fuso horário "America/Fortaleza" cravado dentro de lib/candidato.ts

`Adaptar` · `Configuração` · impacto de não replicar: **media**

**O que mudou.** `diasAteEleicao()` usa `new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" })` com a string cravada no código, enquanto lib/period.ts lê o mesmo conceito de META_ACCOUNT_TIMEZONE (default America/Fortaleza). São dois lugares com a mesma informação e só um é configurável.

**Por quê.** A intenção é contar o dia no fuso da conta de anúncios, não em UTC (senão a contagem regressiva vira o dia à noite e o pacing verba/dia sai errado). Ficou meio-configurável: quem trocar só a env continua com Fortaleza na contagem regressiva.

**Como replicar.** Ao portar, trocar a string por America/Bahia — ou, melhor, importar o mesmo TZ_CONTA de lib/period.ts para ficar um valor só. Na prática BA e CE são ambos UTC-3, então o efeito é nulo hoje; corrigir mesmo assim para o painel não mentir se for reusado em outro estado.

Arquivos: `lib/candidato.ts` · `lib/period.ts`

### Favicon próprio em app/icon.svg, declarado no metadata

`Adaptar` · `Identidade` · impacto de não replicar: **media**

**O que mudou.** Criado app/icon.svg: quadrado 64×64 rx=14 com gradiente azul (#0B2A6B → #1157C9), o número '45' em Poppins 800 branco e uma faixa inferior bicolor (vermelho #E4222B em 1/3, ciano #35D0FF em 2/3, mesma proporção da faixa do hero). Em app/layout.tsx foi acrescentado `icons: { icon, shortcut, apple: "/icon.svg" }`, com comentário explicando que o App Router já serve app/icon.svg automaticamente, mas declarar aqui garante o apple-touch-icon e evita a requisição a /favicon.ico.

**Por quê.** Aba sem ícone é aba que ninguém acha entre 20 abertas — e num painel que fica aberto o dia todo isso conta. O número do partido é o identificador visual mais rápido.

**Como replicar.** Copiar a ESTRUTURA do SVG e a linha `icons:` do layout; trocar o '45' pelo número do ACM Neto, o gradiente pelas cores da campanha baiana e a faixa inferior pelas cores da identidade dele. O título do metadata já lê de lib/candidato.ts. NÃO usar o ícone do Ciro como está.

Arquivos: `app/icon.svg` · `app/layout.tsx`

### Foto oficial do candidato em /public, no lugar dos placeholders

`Não copiar` · `Identidade` · impacto de não replicar: **alta**

**O que mudou.** Adicionado public/ciro-gomes.png (800x1068, ~1,2 MB), apontado por FOTO_CANDIDATO em lib/candidato.ts. Substitui dois placeholders: o texto '[ foto do candidato ]' no hero da home e o quadradinho com a palavra 'foto' na sidebar. No hero é usado via next/image com `fill` + `priority` + `sizes="(max-width: 1200px) 40vw, 480px"` e objectPosition 'center 18%', com `overflow: hidden` no container e um gradiente sobreposto `linear-gradient(180deg, rgba(11,42,107,0) 42%, rgba(8,26,68,.72) 78%, rgba(6,18,50,.94) 100%)` para o nome (agora em #fff explícito) ficar legível; na sidebar em 38x38 com objectFit cover e objectPosition 'center 14%'.

**Por quê.** Placeholder de foto num painel entregue ao cliente parece produto inacabado e derruba a credibilidade da tela de abertura. O gradiente existe porque texto branco direto sobre foto é ilegível dependendo do enquadramento, e o objectPosition deslocado para o topo existe porque em retrato o corte central decapita o rosto.

**Como replicar.** NUNCA copiar o arquivo do Ciro. Colocar a foto do ACM em public/ (recorte retrato ~3:4, rosto no terço superior), apontar FOTO_CANDIDATO para ela e REAJUSTAR os dois objectPosition (14% e 18%) ao novo enquadramento — os valores foram calibrados para esta imagem. Copiar o gradiente e o `overflow: hidden` como estão. Otimizar antes de subir: 1,2 MB de PNG é peso desnecessário num hero (WebP/AVIF resolve).

Arquivos: `public/ciro-gomes.png` · `lib/candidato.ts` · `app/inicio/page.tsx` · `components/Sidebar.tsx`

## Dados da Bahia

Os mesmos endpoints do IBGE servem qualquer UF — Bahia é `29`, Ceará é `23`.
Confirmado: 417 municípios, 14.141.626 habitantes.

```bash
# malha municipal (GeoJSON)
curl "https://servicodados.ibge.gov.br/api/v3/malhas/estados/BA?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=intermediaria"

# população residente — Censo 2022, agregado 4709, variável 93
curl "https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N6%5BN3%5B29%5D%5D"
```

Junte pelo código IBGE e grave no mesmo formato de chaves de `lib/geo/ceara-malha.json`
(`uf`, `bbox`, `municipios[].cod/.nome/.c/.a/.p`, `populacaoTotal`, `fontePopulacao`) — o
componente do mapa lê tudo do próprio JSON. A Bahia tem mais que o dobro de municípios:
simplifique os polígonos para o arquivo não passar de ~300 KB.

## Conferência do contrato de variáveis

```bash
grep -rho "process\.env\.[A-Z_]*" lib/ app/ components/ | sed 's/process.env.//' | sort -u > /tmp/codigo.txt
grep -o "^[A-Z_]*=" .env.example | tr -d '=' | sort -u > /tmp/exemplo.txt
comm -23 /tmp/codigo.txt /tmp/exemplo.txt   # nada aqui = contrato completo
```

## Limitações conhecidas

- A Biblioteca de Anúncios **nunca** vai bater com o gerenciador: fontes e semânticas diferentes.
- Não há imagem de criativo para concorrentes — a Ad Library API não devolve imagem.
- `total_follows` (seguidores atribuídos) é campo válido mas volta vazio; o painel usa o
  crescimento do perfil e já pede o campo para trocar sozinho se a Meta passar a devolver.
- Município vem da **segmentação**, não da entrega: o breakdown `region` só desce até a UF.
- Penetração acima de 100% é esperada (segmentação inclui quem esteve na cidade; alcance conta contas).
- O painel **não é responsivo** abaixo de ~768px.
