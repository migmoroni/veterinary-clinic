# Prompt Para Fase 4.5 Da Refatoração Modular

Use a API `queryAnalytics(...)`, criada na fase 4.4, para criar view models
semânticos de analytics e enxugar as rotas de dashboard.

Esta fase não redesenha a UI. Ela troca lógica analítica local por chamadas a
view models puros em `@vet/app-services/analytics`.

## Objetivo

As rotas devem parar de montar localmente:

```text
buckets
buckets cruzados
opções de filtro com contagem
fatores ativos
percentuais numéricos
top bucket
limites de listas analíticas
normalização de dimensões
seleção válida de bucket
listas relacionadas filtradas
```

Essas responsabilidades passam para view models semânticos no pacote.

As rotas continuam responsáveis por:

```text
t(...)
i18n.locale
labels traduzidas
ícones
classes CSS
hrefs
query params
estado $state e $derived
componentes Svelte
largura visual de barras
avatares
chunking visual
diálogos
```

## Arquivos

Crie:

```text
packages/app-services/src/analytics/clinic-pet-analytics.view-model.ts
packages/app-services/src/analytics/clinic-owner-analytics.view-model.ts
packages/app-services/src/analytics/clinic-study-analytics.view-model.ts
packages/app-services/src/analytics/__tests__/clinic-pet-analytics.view-model.test.ts
packages/app-services/src/analytics/__tests__/clinic-owner-analytics.view-model.test.ts
packages/app-services/src/analytics/__tests__/clinic-study-analytics.view-model.test.ts
```

Edite:

```text
packages/app-services/src/analytics/index.ts
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
```

## Tipos Compartilhados

Use os tipos criados na fase 4.4 em:

```text
packages/app-services/src/analytics/clinic-study-analytics.types.ts
```

Não redefina tipos de estudo nos view models.

`ClinicAnalyticsStudyDimension` deve continuar sendo alias de
`ClinicAnalyticsQueryDimension`. Os view models não devem criar uma segunda
taxonomia de dimensões.

## Base Da Fase 4.4

Use como fonte de verdade:

```text
analytics-query.ts
analytics-dimensions.ts
clinic-study-analytics.types.ts
clinic-study-analytics.selectors.ts
```

Não recrie regras de bucketização, fallback, deduplicação, ordenação semântica,
seleção de bucket ou enumeração de linhas canônicas dentro das rotas.

O view model geral deve usar:

```text
queryAnalytics(...)
clinicAnalyticsQueryDimensions
listClinicAnalyticsQueryRows(...)
listClinicAnalyticsTargetDimensions(...)
defaultClinicAnalyticsPrimaryDimension(...)
defaultClinicAnalyticsSecondaryDimension(...)
normalizeClinicAnalyticsQueryDimensions(...)
```

Preserve a semântica já aplicada na fase 4.4: quando o target for `vaccines` ou
`antiparasitics`, as dimensões do mesmo domínio devem considerar o item atual da
linha canônica, não todos os tratamentos agregados do pet.

## View Model De Pets

Implemente
`packages/app-services/src/analytics/clinic-pet-analytics.view-model.ts`.

```ts
export interface ClinicPetAnalyticsBucketView extends AnalyticsBucket {
  percent: number;
}

export interface ClinicPetAnalyticsViewModelInput {
  analytics: ClinicAnalytics | null | undefined;
  pets: readonly ClinicAnalyticsPetStudyItem[];
  activeDimension: ClinicAnalyticsPetDimension;
  selectedBucketKey: string;
  bucketSortField: AnalyticsBucketSortField;
  bucketSortDirection: AnalyticsSortDirection;
  listSortOrder: ClinicAnalyticsPetSortOrder;
  bucketLimit: number;
  labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
  locale: string;
}

export interface ClinicPetAnalyticsViewModel {
  buckets: ClinicPetAnalyticsBucketView[];
  limitedBuckets: ClinicPetAnalyticsBucketView[];
  selectedBucket: ClinicPetAnalyticsBucketView | null;
  listedPets: ClinicAnalyticsPetStudyItem[];
  totalCount: number;
  selectedCount: number;
  selectedPercent: number;
  topBucket: ClinicPetAnalyticsBucketView | null;
}

export function buildClinicPetAnalyticsViewModel(
  input: ClinicPetAnalyticsViewModelInput
): ClinicPetAnalyticsViewModel;
```

O view model deve usar `queryAnalytics(...)` por baixo. A rota
`dashboard/pets` deve consumir um único objeto derivado:

```ts
const petAnalyticsView = $derived(
  buildClinicPetAnalyticsViewModel({
    analytics: dashboard?.analytics,
    pets: allPets,
    activeDimension: activeAnalysis,
    selectedBucketKey,
    bucketSortField,
    bucketSortDirection,
    listSortOrder: sortOrder,
    bucketLimit: 16,
    labelForKey: bucketLabel,
    locale: i18n.locale
  })
);
```

A rota deve ler buckets, seleção, lista, percentual e top bucket desse objeto.
Os buckets retornados já devem conter `percent`; a rota apenas formata o número
e calcula largura visual de barras.

Mapeie `ClinicAnalyticsPetDimension` para `ClinicAnalyticsQueryDimension` assim:

```text
species -> petSpecies
breed -> petBreed
sex -> petSex
age -> petAge
vaccineStatus -> petVaccineStatus
```

O view model deve chamar `queryAnalytics(...)` com `target: 'pets'`,
`groupBy` de uma dimensão e `selectedBucket` derivado de `selectedBucketKey`.
Depois deve ordenar a lista com `sortClinicAnalyticsPets(...)`.

Preserve o universo de buckets que os selectors atuais já entregam a partir de
`analytics`, incluindo faixas de idade com contagem zero. O view model deve
fundir esse universo com o resultado de `queryAnalytics(...)` antes de ordenar e
calcular percentuais.

## View Model De Owners

Implemente
`packages/app-services/src/analytics/clinic-owner-analytics.view-model.ts`.

```ts
export interface ClinicOwnerAnalyticsBucketView extends ClinicAnalyticsOwnerBucket {
  percent: number;
}

export interface ClinicOwnerAnalyticsViewModelInput {
  analytics: ClinicAnalytics | null | undefined;
  owners: readonly ClinicAnalyticsOwnerStudyItem[];
  activeDimension: ClinicAnalyticsOwnerDimension;
  selectedBucketKey: string;
  bucketSortField: AnalyticsBucketSortField;
  bucketSortDirection: AnalyticsSortDirection;
  listSortOrder: ClinicAnalyticsOwnerSortOrder;
  bucketLimit: number;
  labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
  locale: string;
}

export interface ClinicOwnerAnalyticsViewModel {
  buckets: ClinicOwnerAnalyticsBucketView[];
  limitedBuckets: ClinicOwnerAnalyticsBucketView[];
  selectedBucket: ClinicOwnerAnalyticsBucketView | null;
  listedOwners: ClinicAnalyticsOwnerStudyItem[];
  totalCount: number;
  selectedCount: number;
  selectedPercent: number;
  topBucket: ClinicOwnerAnalyticsBucketView | null;
}

export function buildClinicOwnerAnalyticsViewModel(
  input: ClinicOwnerAnalyticsViewModelInput
): ClinicOwnerAnalyticsViewModel;
```

O view model deve usar `queryAnalytics(...)` por baixo. A rota
`dashboard/owners` deve consumir um único objeto derivado com buckets, seleção,
lista, percentual e top bucket.

Os buckets retornados já devem conter `percent`; a rota apenas formata o número
e calcula largura visual de barras.

Mapeie `ClinicAnalyticsOwnerDimension` para `ClinicAnalyticsQueryDimension`
assim:

```text
location -> ownerLocation
petCount -> ownerPetCount
petSpecies -> ownerPetSpecies
petAge -> petAge
petVaccineStatus -> ownerPetVaccineStatus
```

O view model deve preservar `label` quando o bucket tiver label persistida, como
em localidade de owner. Ele pode receber `labelForBucket` apenas para ordenação
semântica por label traduzida, sem importar i18n.

Preserve o universo de buckets que os selectors atuais já entregam a partir de
`analytics`, incluindo faixas de idade de pets com contagem zero e labels
persistidas. O view model deve fundir esse universo com o resultado de
`queryAnalytics(...)` antes de ordenar e calcular percentuais.

## View Model Do Estudo Geral

Implemente
`packages/app-services/src/analytics/clinic-study-analytics.view-model.ts`.

Importe de `clinic-study-analytics.types.ts`:

```text
ClinicAnalyticsStudyDimension
ClinicAnalyticsStudyFilterFactor
ClinicAnalyticsStudyFilters
ClinicAnalyticsStudyTreatmentSummary
ClinicAnalyticsStudyBucket
ClinicAnalyticsStudyBucketSelection
```

```ts
export interface ClinicAnalyticsStudyFilterOptions {
  species: AnalyticsBucket[];
  breeds: AnalyticsBucket[];
  sexes: AnalyticsBucket[];
  ages: AnalyticsBucket[];
  vaccines: AnalyticsNamedBucket[];
  vaccineStatuses: AnalyticsBucket<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: AnalyticsNamedBucket[];
  antiparasiticStatuses: AnalyticsBucket<ClinicAnalyticsAntiparasiticStatusKey>[];
  cities: AnalyticsNamedBucket[];
  ownerPetCounts: AnalyticsBucket<ClinicAnalyticsPetCountBandKey>[];
}

export interface ClinicAnalyticsStudyActiveFactor {
  factor: ClinicAnalyticsStudyFilterFactor;
  valueKey: string;
  count: number;
}

export interface ClinicAnalyticsStudyBucketView extends ClinicAnalyticsStudyBucket {
  percent: number;
}

export interface ClinicAnalyticsStudyViewModelInput {
  target: ClinicAnalyticsStudyTarget;
  primaryDimension: ClinicAnalyticsStudyDimension;
  secondaryDimension: ClinicAnalyticsStudyDimension;
  selectedBucket: ClinicAnalyticsStudyBucketSelection | null;
  pets: readonly ClinicAnalyticsPetStudyItem[];
  owners: readonly ClinicAnalyticsOwnerStudyItem[];
  filters: ClinicAnalyticsStudyFilters;
  bucketLimit: number;
  listLimit: number;
}

export interface ClinicAnalyticsStudyViewModel {
  availableDimensions: ClinicAnalyticsStudyDimension[];
  primaryDimension: ClinicAnalyticsStudyDimension;
  secondaryDimension: ClinicAnalyticsStudyDimension;
  defaultPrimaryDimension: ClinicAnalyticsStudyDimension;
  defaultSecondaryDimension: ClinicAnalyticsStudyDimension;
  filterOptions: ClinicAnalyticsStudyFilterOptions;
  activeFactors: ClinicAnalyticsStudyActiveFactor[];
  buckets: ClinicAnalyticsStudyBucketView[];
  limitedBuckets: ClinicAnalyticsStudyBucketView[];
  bucketTotal: number;
  bucketMaxCount: number;
  selectedBucket: ClinicAnalyticsStudyBucketSelection | null;
  listedPets: ClinicAnalyticsPetStudyItem[];
  listedOwners: ClinicAnalyticsOwnerStudyItem[];
  listedVaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  listedAntiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
  limitedListedPets: ClinicAnalyticsPetStudyItem[];
  limitedListedOwners: ClinicAnalyticsOwnerStudyItem[];
  limitedListedVaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  limitedListedAntiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}

export function buildClinicAnalyticsStudyViewModel(
  input: ClinicAnalyticsStudyViewModelInput
): ClinicAnalyticsStudyViewModel;
```

O view model deve usar `queryAnalytics(...)` para montar os buckets cruzados e
as listas filtradas pelo bucket selecionado.

O fluxo interno esperado é:

```text
1. montar vaccines e antiparasitics com os helpers públicos atuais;
2. resolver o target filtrado com resolveClinicAnalyticsStudyTarget(...);
3. normalizar primaryDimension e secondaryDimension com normalizeClinicAnalyticsQueryDimensions(...);
4. montar linhas canônicas com listClinicAnalyticsQueryRows(...);
5. chamar queryAnalytics(...) com clinicAnalyticsQueryDimensions;
6. converter os buckets do engine para ClinicAnalyticsStudyBucketView;
7. validar selectedBucket contra o resultado do engine;
8. retornar listas filtradas e limitadas pelo bucket validado.
```

Ele também deve montar:

```text
dimensões disponíveis pelo target
dimensões normalizadas quando a seleção atual não for válida para o target
opções de filtro com contagem
fatores ativos com contagem
alvo resolvido após filtros
buckets cruzados
seleção cruzada validada
listas relacionadas filtradas pelo bucket selecionado
listas limitadas para renderização
total de buckets
maior contagem de bucket para apoiar largura visual nas rotas
```

## Semântica Das Opções De Filtro

O view model geral deve retornar opções de filtro com contagem usando estas
regras:

```text
species conta pets por espécie
breeds conta pets por raça, respeitando species quando species estiver selecionada
sexes conta pets por sexo
ages conta pets por faixa etária
vaccines lista produtos vacinais existentes no snapshot analítico
vaccineStatuses conta status vacinais do produto selecionado quando houver produto selecionado
vaccineStatuses conta status vacinais do alvo vaccines quando target for vaccines
vaccineStatuses conta status vacinais agregados por pet nos demais targets
antiparasitics lista produtos antiparasitários existentes no snapshot analítico
antiparasiticStatuses conta status do produto antiparasitário selecionado quando houver produto selecionado
antiparasiticStatuses conta status do alvo antiparasitics quando target for antiparasitics
antiparasiticStatuses conta status antiparasitários agregados por pet nos demais targets
cities conta owners por cidade
ownerPetCounts conta owners por faixa de quantidade de pets
```

O pacote retorna chaves, contagens, ids e labels persistidos quando já existirem
nos dados, como nomes de vacinas, antiparasitários e cidades. A rota transforma
isso em opções traduzidas do `Select`.

## Tratamentos

Atualize `TreatmentAnalyticsPage.svelte` para reaproveitar helpers genéricos de
analytics quando a regra for analítica:

```text
percentual numérico
totalização de listas
limite de pontos ou barras quando aplicável
ordenação já extraída na fase anterior
```

Não altere semânticas visuais específicas de tratamento. Se uma regra depender
de texto de apresentação, como label de percentual mínimo, ela deve continuar no
componente.

Mantenha no componente:

```text
query params
abas
loading
chunking
contatos
avatares
diálogos
labels traduzidas
largura visual específica de barras
```

## Testes Obrigatórios

Adicione testes cobrindo:

```text
view model de pets com bucket selecionado
view model de pets com bucket inválido
view model de pets com top bucket e selectedPercent
view model de pets preservando buckets de idade já completados pelo analytics
view model de owners com bucket selecionado
view model de owners com bucket inválido
view model de owners com top bucket e selectedPercent
view model de owners preservando labels persistidas e buckets de idade já completados pelo analytics
view model geral com target pets
view model geral com target owners
view model geral com target vaccines
view model geral com target antiparasitics
view model geral com target vaccines contendo múltiplas vacinas no mesmo pet
view model geral com target antiparasitics contendo múltiplos antiparasitários no mesmo pet
view model geral normalizando dimensões inválidas
view model geral invalidando seleção cruzada inexistente
view model geral montando opções de filtro com contagem
view model geral montando fatores ativos com contagem
view model geral aplicando bucketLimit e listLimit
```

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
git status --short
npm run check
npm run test:run
```

Registre falhas existentes antes de alterar arquivos.

### Atividade 2: Criar View Models

Crie os três arquivos `*.view-model.ts` e seus testes.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 3: Enxugar Rotas De Pets E Owners

Atualize `dashboard/pets` e `dashboard/owners` para consumirem os view models.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 4: Enxugar Rota Geral

Atualize `dashboard/general` para consumir `buildClinicAnalyticsStudyViewModel`.

A rota deve continuar convertendo chaves para labels traduzidas, mas não deve
montar localmente opções com contagem, fatores ativos, dimensões disponíveis ou
buckets cruzados.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Ajustar Tratamentos

Atualize `TreatmentAnalyticsPage.svelte` para usar helpers genéricos quando
couber, sem mover lógica visual.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 6: Atualizar API Pública

Atualize `packages/app-services/src/analytics/index.ts` para exportar os view
models.

Valide:

```sh
npm run check
```

### Atividade 7: Verificar Fronteiras

Rode:

```sh
rg -n "from '\\$app|from '\\$lib|\\.svelte|t\\(|i18n\\.locale|href|window|requestAnimationFrame|class=" packages/app-services/src/analytics
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
rg -n "function (studySpeciesOptions|studyBreedOptions|studySexOptions|studyAgeOptions|studyVaccineOptions|studyAntiparasiticOptions|studyVaccineStatusOptions|studyAntiparasiticStatusOptions|studyCityOptions|studyOwnerPetCountOptions|studyFactorSummaries|studyFactorCount|availableStudyDimensions|defaultStudyPrimaryDimension|defaultStudySecondaryDimension|bucketPercent|topBucket|topBucketText|chartGroupTotal|chartBucketPercentLabel|topChartBuckets)" apps/vet-app/src/routes/dashboard
```

Resultado esperado:

```text
@vet/app-services/analytics não importa app, lib local, Svelte, i18n visual ou navegação
nenhum package acima importa @vet/app-services
as rotas não mantêm regras analíticas que pertencem aos view models
```

### Atividade 8: Checks Finais

Rode:

```sh
npm run check
npm run test:run
npm run build
git diff --check
git status --short
```

## Critério De Conclusão

A fase está concluída quando:

- pets, owners e estudo geral possuem view models semânticos;
- os view models usam `queryAnalytics(...)`;
- as rotas consomem view models em vez de montarem regras analíticas locais;
- labels, ícones, hrefs, query params, classes CSS, avatares e diálogos
  continuam nas rotas/componentes;
- `@vet/app-services/analytics` continua sem Svelte, `$lib`, `$app`, `t(...)`,
  `href`, `window`, `requestAnimationFrame` e classes CSS;
- os testes cobrem os view models principais;
- os checks finais passam.
