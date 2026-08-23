# Prompt Para Fase 4.1 Da Refatoração Modular

Refine a fronteira de `@vet/app-services/search` para que o package contenha a
lógica reutilizável de busca sem carregar decisões de navegação do app.

O resultado compartilhado de busca deve representar o alvo encontrado no
ecossistema veterinário. Cada app decide como transformar esse alvo em rota,
link, ação visual ou navegação.

## Objetivo

Remover `href` do contrato compartilhado de busca e mover o mapeamento de rotas
para `apps/vet-app`.

Fluxo esperado:

```text
@vet/app-services/search
  executa SQL/read models
  busca catálogos e entidades
  normaliza texto
  ranqueia resultados
  filtra resultados ativos
  devolve SearchResult sem rota

apps/vet-app
  consome SearchResult
  decide href de cada kind
  renderiza links
  mantém estado visual e histórico local da tela
```

## Arquivos Alvo

Edite:

```text
packages/types/src/domain/search/search.ts
packages/app-services/src/search/search.read-model.ts
packages/app-services/src/search/search.service.ts
apps/vet-app/src/routes/search/+page.svelte
```

Verifique:

```text
packages/app-services/src/analytics/
```

## Contrato De Busca

Em `packages/types/src/domain/search/search.ts`, ajuste `SearchResult` para não
ter `href`.

Forma esperada:

```ts
export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  ownerId: string | null;
  petId: string | null;
  title: string;
  subtitle: string;
  referenceImageBytes?: Uint8Array | null;
  ownerAvatarBytes?: Uint8Array | null;
  petAvatarBytes?: Uint8Array | null;
  ownerContacts?: OwnerAssociatedContact[];
}
```

Mantenha `SEARCH_RESULT_KINDS`, `CLINIC_SEARCH_RESULT_KINDS`,
`REFERENCE_SEARCH_RESULT_KINDS` e os type guards públicos.

## Search Em `@vet/app-services`

Em `packages/app-services/src/search/search.read-model.ts`, remova a montagem de
rotas.

Direção esperada:

- remover helper de rota como `resultHref`;
- remover `href` dos objetos retornados por `searchClinic`;
- preservar SQL, filtro de ativos, score, owners, pets, avatares e contatos.

Em `packages/app-services/src/search/search.service.ts`, faça o mesmo para
resultados de referência.

Direção esperada:

- remover `href` de resultados de `breed`, `product`, `manufacturer`,
  `activeIngredient` e `condition`;
- ajustar `searchResultKey` para usar apenas identidade de busca, como
  `kind:id`;
- preservar `searchEverywhere`, `filterActiveSearchResults`, ranking, scoring,
  normalização e filtros por `SearchResultKind`.

O package deve continuar exportando:

```ts
searchEverywhere
filterActiveSearchResults
```

## Rotas No `vet-app`

Em `apps/vet-app/src/routes/search/+page.svelte`, crie uma camada local de
apresentação para navegação.

Modelo sugerido:

```ts
type RoutedSearchResult = SearchResult & { href: string };

function searchResultHref(result: SearchResult): string {
  if (result.kind === 'owner') return `/owners/${result.id}`;
  if (result.kind === 'pet') return `/pets/${result.id}`;
  if (result.kind === 'breed') return `/breeds/${result.id}`;
  if (result.kind === 'product') return `/formulary/products/${result.id}`;
  if (result.kind === 'manufacturer') return `/formulary/manufacturers/${result.id}`;
  if (result.kind === 'activeIngredient') return `/formulary/active-ingredients/${result.id}`;
  return `/formulary/conditions/${result.id}`;
}

function routeSearchResult(result: SearchResult): RoutedSearchResult {
  return { ...result, href: searchResultHref(result) };
}
```

A tela deve continuar usando `href` apenas no tipo local roteável.

Ajuste o estado da rota para separar dados de busca e apresentação:

```text
searchEverywhere retorna SearchResult[]
estado visual renderiza RoutedSearchResult[]
recentes persistidos usam SearchResult sem href
hidratação de recentes retorna SearchResult[]
antes de renderizar, a rota aplica routeSearchResult
```

Atualize helpers locais como:

```text
resultKey
persistableSearchResult
hydrateRecentResults
visibleResults
rememberResult
```

`resultKey` deve usar identidade de busca, como:

```ts
`${result.kind}:${result.id}`
```

## Verificação De Analytics

Confirme que `packages/app-services/src/analytics` não possui links, rotas,
`href`, ícones, classes CSS ou decisões visuais.

Se houver algum mapeamento de rota dentro de `analytics`, mova esse mapeamento
para o consumidor em `apps/vet-app`.

Dados semânticos como `kind`, `status`, `period`, datas, contadores e séries
continuam válidos em `@vet/app-services/analytics`.

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
npm run check
npm run test:run
git status --short
```

Registre falhas existentes antes de alterar arquivos.

### Atividade 2: Ajustar O Tipo Compartilhado

Remova `href` de `SearchResult` em:

```text
packages/types/src/domain/search/search.ts
```

Atualize os consumidores afetados.

Valide:

```sh
npm run check
```

### Atividade 3: Ajustar `@vet/app-services/search`

Remova a montagem de rotas em:

```text
packages/app-services/src/search/search.read-model.ts
packages/app-services/src/search/search.service.ts
```

Preserve a lógica de busca, ranking, scoring, filtros e hidratação de dados.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 4: Criar Roteamento Local Da Busca

Em `apps/vet-app/src/routes/search/+page.svelte`, crie o tipo local roteável e
os helpers de navegação da tela.

Garanta que a rota continue:

```text
buscando resultados
filtrando por kind
carregando recentes
removendo recentes inativos
hidratando avatares e contatos
abrindo contatos de owner
renderizando links
```

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Verificar Fronteiras

Rode:

```sh
rg -n "href|/owners|/pets|/breeds|/formulary|/dashboard" packages/app-services/src/search packages/app-services/src/analytics
rg -n "href:" packages/types/src/domain/search/search.ts packages/app-services/src/search
rg -n "\\$lib" packages/app-services/src
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
rg -n "execute|insert|update|delete|softDelete|save|create" packages/app-services/src/search packages/app-services/src/analytics
```

Os dois primeiros comandos devem confirmar que rotas e `href` ficaram fora de
`@vet/app-services` e do contrato compartilhado de `SearchResult`.

Para a última busca, avalie manualmente:

- `create` em nomes de tipos ou helpers puros pode ser aceitável;
- SQL read-only pode usar `selectMany` e `selectOne`;
- `execute`, `insert`, `update`, `delete`, `softDelete` e writes não devem existir
  em read models de `@vet/app-services`.

### Atividade 6: Checks Finais

Rode:

```sh
npm ls @vet/app-services --workspace apps/vet-app
npm run check
npm run test:run
npm run build
cargo check --workspace
git diff --check
git status --short
```

## Critério De Conclusão

A fase 4.1 está pronta quando:

- `SearchResult` não possui `href`;
- `@vet/app-services/search` não monta rotas;
- `searchEverywhere` e `filterActiveSearchResults` continuam funcionando;
- `apps/vet-app/src/routes/search/+page.svelte` decide o `href` localmente;
- recentes de busca são persistidos sem `href`;
- resultados antigos com campo extra em `localStorage` continuam sendo
  normalizados sem quebrar a tela;
- `@vet/app-services/analytics` não possui rotas ou decisões visuais;
- o DAG continua respeitado;
- todos os checks finais passam.
