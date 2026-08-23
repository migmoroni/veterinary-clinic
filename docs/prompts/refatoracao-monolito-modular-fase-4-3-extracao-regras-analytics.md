# Prompt Para Fase 4.3 Da Refatoração Modular

Extraia regras reutilizáveis de analytics que ainda estão em páginas Svelte e
leve essas regras para `@vet/app-services/analytics`.

Esta fase organiza lógica de seleção, filtro, ordenação, agrupamento e derivação
semântica. A UI continua no app.

## Objetivo

Reduzir a lógica analítica dentro das rotas de dashboard, mantendo nelas apenas
estado visual, tradução, navegação, componentes e renderização.

Fluxo esperado:

```text
@vet/types/clinic-analytics.js
  tipos e helpers puros compartilhados

@vet/app-services/analytics
  read models
  services de leitura
  selectors puros de analytics
  filtros, ordenações, agrupamentos e derivações reutilizáveis

apps/vet-app
  rotas
  labels traduzidas
  ícones
  classes CSS
  hrefs
  query params
  estado visual
  gráficos e componentes Svelte
```

Use este DAG:

```text
@vet/types
  ↓
@vet/core-local
  ↓
@vet/ui
  ↓
@vet/modules
  ↓
@vet/app-services
  ↓
apps/vet-app
```

Um item mais abaixo pode importar itens acima. Um item acima não pode importar
itens abaixo.

## Referência Da Fase

Use como mapa de decisão:

```text
docs/plans/analytics-boundary-audit.md
```

A fase 4.2 deixou analytics em `@vet/types/clinic-analytics.js`. Use esse
contrato como base para as extrações.

## Arquivos Alvo

Edite:

```text
packages/app-services/src/analytics/index.ts
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
```

Crie:

```text
packages/app-services/src/analytics/analytics-bucket.selectors.ts
packages/app-services/src/analytics/clinic-pet-analytics.selectors.ts
packages/app-services/src/analytics/clinic-owner-analytics.selectors.ts
packages/app-services/src/analytics/clinic-study-analytics.selectors.ts
packages/app-services/src/analytics/treatment-analytics.selectors.ts
packages/app-services/src/analytics/__tests__/analytics-bucket.selectors.test.ts
packages/app-services/src/analytics/__tests__/clinic-pet-analytics.selectors.test.ts
packages/app-services/src/analytics/__tests__/clinic-owner-analytics.selectors.test.ts
packages/app-services/src/analytics/__tests__/clinic-study-analytics.selectors.test.ts
packages/app-services/src/analytics/__tests__/treatment-analytics.selectors.test.ts
```

Atualize `packages/app-services/src/analytics/index.ts` para exportar services e
selectors. Não exporte arquivos `*.read-model.ts`.

## Regra De Fronteira

Pode ir para `@vet/app-services/analytics`:

```text
seleção de buckets por dimensão
comparação semântica de status, idade e quantidade
filtro por bucket
ordenação de listas analíticas
agrupamento em buckets
deduplicação de entidades por id
resolução de alvo analítico
montagem de séries e cruzamentos usando chaves
normalização de filtros reutilizáveis
```

Deve ficar em `apps/vet-app`:

```text
t(...)
i18n.locale
labels traduzidas
ícones
classes CSS
href
query params
window
requestAnimationFrame
estado $state e $derived
componentes Svelte
largura visual de barras
percentual textual de tela
avatares e diálogos
```

Selectors em `@vet/app-services/analytics` devem retornar dados com chaves,
contagens, ids e snapshots. Labels traduzidas são resolvidas pelo app.

Quando uma ordenação precisar preservar a ordem por label visível, o selector
pode receber uma função pura `labelForKey` e um `locale` como parâmetros. O
package não importa i18n nem chama `t(...)`.

## API Esperada Dos Selectors

### `analytics-bucket.selectors.ts`

Centralize helpers genéricos:

```ts
export function toAnalyticsBuckets<Key extends string>(buckets: Map<Key, number>): AnalyticsBucket<Key>[];

export function compareAnalyticsUnknownLast(firstKey: string, secondKey: string): number;

export function sortAnalyticsBuckets<Key extends string>(input: {
  buckets: AnalyticsBucket<Key>[];
  field: AnalyticsBucketSortField;
  direction: AnalyticsSortDirection;
  compareByAnalysis: (first: AnalyticsBucket<Key>, second: AnalyticsBucket<Key>) => number;
}): AnalyticsBucket<Key>[];
```

Use esses helpers nos selectors específicos de pets, owners e estudos.

### `clinic-pet-analytics.selectors.ts`

Extraia de `apps/vet-app/src/routes/dashboard/pets/+page.svelte`:

```text
bucketsForAnalysis
bucketUnknownCompare
bucketAnalysisBaseCompare sem labels traduzidas internas
bucketAnalysisCompare
sortBuckets
petMatchesBucket
filterPetsByBucket
sortPets
```

API esperada:

```ts
export type ClinicAnalyticsPetSortOrder = 'name' | 'age' | 'vaccineStatus' | 'owner';

export function selectClinicPetAnalyticsBuckets(
  analytics: ClinicAnalytics,
  dimension: ClinicAnalyticsPetDimension
): AnalyticsBucket[];

export function sortClinicPetAnalyticsBuckets(input: {
  buckets: AnalyticsBucket[];
  dimension: ClinicAnalyticsPetDimension;
  field: AnalyticsBucketSortField;
  direction: AnalyticsSortDirection;
  labelForKey: (dimension: ClinicAnalyticsPetDimension, key: string) => string;
  locale: string;
}): AnalyticsBucket[];

export function filterClinicAnalyticsPetsByBucket(
  pets: ClinicAnalyticsPetStudyItem[],
  dimension: ClinicAnalyticsPetDimension,
  bucketKey: string
): ClinicAnalyticsPetStudyItem[];

export function sortClinicAnalyticsPets(
  pets: ClinicAnalyticsPetStudyItem[],
  order: ClinicAnalyticsPetSortOrder
): ClinicAnalyticsPetStudyItem[];
```

O app continua responsável por `bucketLabel`, `speciesLabel`, `breedLabel`,
`sexLabel`, `ageBandLabel`, `vaccineStatusLabel`, `bucketPercent`,
`bucketWidth`, `topBucketText`, avatares e links.

### `clinic-owner-analytics.selectors.ts`

Extraia de `apps/vet-app/src/routes/dashboard/owners/+page.svelte`:

```text
ownerPetCountBand
ownerVaccineStatus
ownerPetSpeciesKeys
ownerPetAgeKeys
locationBuckets
petCountBuckets
petVaccineStatusBuckets
petSpeciesBuckets
petAgeBuckets
bucketsForAnalysis
bucketUnknownCompare
bucketAnalysisBaseCompare sem labels traduzidas internas
bucketAnalysisCompare
sortBuckets
ownerMatchesBucket
filterOwnersByBucket
sortOwners
```

Inclua também o status de antiparasitários, pois a página geral já precisa dessa
mesma regra.

API esperada:

```ts
export type ClinicAnalyticsOwnerSortOrder = 'name' | 'location' | 'petCount' | 'vaccineStatus';
export type ClinicAnalyticsOwnerBucket = AnalyticsBucket & { label?: string | null };

export function clinicAnalyticsOwnerPetCountBand(value: number): ClinicAnalyticsPetCountBandKey;

export function clinicAnalyticsOwnerVaccineStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsVaccineStatusKey;

export function clinicAnalyticsOwnerAntiparasiticStatus(owner: ClinicAnalyticsOwnerStudyItem): ClinicAnalyticsAntiparasiticStatusKey;

export function selectClinicOwnerAnalyticsBuckets(input: {
  analytics: ClinicAnalytics;
  owners: ClinicAnalyticsOwnerStudyItem[];
  dimension: ClinicAnalyticsOwnerDimension;
}): ClinicAnalyticsOwnerBucket[];

export function sortClinicOwnerAnalyticsBuckets(input: {
  buckets: ClinicAnalyticsOwnerBucket[];
  dimension: ClinicAnalyticsOwnerDimension;
  field: AnalyticsBucketSortField;
  direction: AnalyticsSortDirection;
  labelForBucket: (dimension: ClinicAnalyticsOwnerDimension, bucket: ClinicAnalyticsOwnerBucket) => string;
  locale: string;
}): ClinicAnalyticsOwnerBucket[];

export function filterClinicAnalyticsOwnersByBucket(
  owners: ClinicAnalyticsOwnerStudyItem[],
  dimension: ClinicAnalyticsOwnerDimension,
  bucketKey: string
): ClinicAnalyticsOwnerStudyItem[];

export function sortClinicAnalyticsOwners(
  owners: ClinicAnalyticsOwnerStudyItem[],
  order: ClinicAnalyticsOwnerSortOrder,
  locale: string
): ClinicAnalyticsOwnerStudyItem[];
```

O app continua responsável por labels, percentuais visuais, largura de barras,
avatares, links e renderização.

### `treatment-analytics.selectors.ts`

Extraia de `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte`
apenas funções puras reutilizáveis:

```text
normalizeStatus
normalizeDueFilterMode
normalizePeriodStartDate
normalizePeriodEndDate
normalizePeriod
normalizeOrder
sortStatusItems
sortHistoryPoints
```

API esperada:

```ts
export type TreatmentAnalyticsSortOrder = 'recent' | 'old';

export function normalizeTreatmentAnalyticsStatus(value: string | null): TreatmentStatusKey;

export function normalizeTreatmentAnalyticsDueFilterMode(value: string | null): TreatmentDueFilterMode;

export function normalizeTreatmentAnalyticsPeriodStartDate(value: string | null): string;

export function normalizeTreatmentAnalyticsPeriodEndDate(value: string | null): string;

export function normalizeTreatmentAnalyticsPeriod(value: string | null): TreatmentHistoryPeriod;

export function normalizeTreatmentAnalyticsSortOrder(value: string | null): TreatmentAnalyticsSortOrder;

export function sortTreatmentAnalyticsStatusItems(
  source: TreatmentStatusItem[],
  order: TreatmentAnalyticsSortOrder
): TreatmentStatusItem[];

export function sortTreatmentAnalyticsHistoryPoints(
  source: TreatmentHistoryPoint[],
  order: TreatmentAnalyticsSortOrder
): TreatmentHistoryPoint[];
```

Query params, `URLSearchParams`, `window.history.replaceState`, tabs, loading,
chunks, contatos, avatares e markup continuam no componente Svelte.

### `clinic-study-analytics.selectors.ts`

Extraia de `apps/vet-app/src/routes/dashboard/general/+page.svelte` as regras de
estudo analítico:

```text
studyVaccineItems
studyAntiparasiticItems
filtros combinados de pets
filtros combinados de owners
resolução de pets relacionados
resolução de owners relacionados
resolução de vacinas relacionadas
resolução de antiparasitários relacionados
contagem de fatores ativos
deduplicação por pet
deduplicação por owner
montagem de buckets cruzados por dimensão
```

Crie tipos semânticos no próprio selector:

```ts
export type ClinicAnalyticsStudyDimension =
  | 'vaccine'
  | 'vaccineStatus'
  | 'antiparasitic'
  | 'antiparasiticStatus'
  | 'petSpecies'
  | 'petBreed'
  | 'petSex'
  | 'petAge'
  | 'petVaccineStatus'
  | 'petAntiparasiticStatus'
  | 'ownerCity'
  | 'ownerPetCount'
  | 'ownerPetVaccineStatus'
  | 'ownerPetAntiparasiticStatus'
  | 'ownerPetSpecies';

export interface ClinicAnalyticsStudyFilters {
  species: string;
  breed: string;
  sex: string;
  age: string;
  vaccineStatus: string;
  vaccineNormalizedName: string;
  antiparasiticStatus: string;
  antiparasiticNormalizedName: string;
  city: string;
  ownerPetCount: string;
}

export interface ClinicAnalyticsStudyTreatmentSummary<StatusKey extends string> {
  id: string;
  pet: ClinicAnalyticsPetStudyItem;
  normalizedName: string;
  name: string;
  dose: string;
  appliedAt: string;
  dueAt: string;
  daysUntilDue: number;
  status: StatusKey;
}

export interface ClinicAnalyticsStudyBucket {
  primaryKey: string;
  secondaryKey: string;
  count: number;
}
```

API esperada:

```ts
export function listClinicAnalyticsStudyVaccines(
  pets: ClinicAnalyticsPetStudyItem[]
): ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];

export function listClinicAnalyticsStudyAntiparasitics(
  pets: ClinicAnalyticsPetStudyItem[]
): ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];

export function filterClinicAnalyticsStudyPets(
  pets: ClinicAnalyticsPetStudyItem[],
  filters: ClinicAnalyticsStudyFilters
): ClinicAnalyticsPetStudyItem[];

export function filterClinicAnalyticsStudyOwners(
  owners: ClinicAnalyticsOwnerStudyItem[],
  filters: ClinicAnalyticsStudyFilters
): ClinicAnalyticsOwnerStudyItem[];

export function resolveClinicAnalyticsStudyTarget(input: {
  target: ClinicAnalyticsStudyTarget;
  pets: ClinicAnalyticsPetStudyItem[];
  owners: ClinicAnalyticsOwnerStudyItem[];
  vaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
  filters: ClinicAnalyticsStudyFilters;
}): {
  pets: ClinicAnalyticsPetStudyItem[];
  owners: ClinicAnalyticsOwnerStudyItem[];
  vaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
};

export function buildClinicAnalyticsStudyBuckets(input: {
  target: ClinicAnalyticsStudyTarget;
  primaryDimension: ClinicAnalyticsStudyDimension;
  secondaryDimension: ClinicAnalyticsStudyDimension;
  pets: ClinicAnalyticsPetStudyItem[];
  owners: ClinicAnalyticsOwnerStudyItem[];
  vaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}): ClinicAnalyticsStudyBucket[];
```

O selector deve retornar `primaryKey` e `secondaryKey`, não labels traduzidas.
No app, converta essas chaves para labels com helpers locais.

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
git status --short
npm run check
npm run test:run
```

Registre falhas existentes antes de alterar arquivos.

### Atividade 2: Criar Selectors Genéricos

Crie `analytics-bucket.selectors.ts` e seus testes.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 3: Extrair Analytics De Pets

Crie `clinic-pet-analytics.selectors.ts`.

Atualize `apps/vet-app/src/routes/dashboard/pets/+page.svelte` para consumir os
selectors e manter apenas UI, labels, estado visual, avatares e links.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 4: Extrair Analytics De Owners

Crie `clinic-owner-analytics.selectors.ts`.

Atualize `apps/vet-app/src/routes/dashboard/owners/+page.svelte` para consumir
os selectors e manter apenas UI, labels, estado visual, avatares e links.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Extrair Selectors De Tratamentos

Crie `treatment-analytics.selectors.ts`.

Atualize `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte`
para consumir os normalizadores e ordenadores extraídos.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 6: Extrair Estudo Analítico Geral

Crie `clinic-study-analytics.selectors.ts`.

Atualize `apps/vet-app/src/routes/dashboard/general/+page.svelte` para consumir
os selectors e manter no app apenas:

```text
opções com labelKey
labels traduzidas
ícones
estado visual
tabs
filtros como campos da tela
montagem de href
gráfico, tabela e markup
```

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 7: Atualizar API Pública

Atualize `packages/app-services/src/analytics/index.ts` para exportar:

```text
clinic-analytics.service.ts
treatment-analytics.service.ts
analytics-bucket.selectors.ts
clinic-pet-analytics.selectors.ts
clinic-owner-analytics.selectors.ts
clinic-study-analytics.selectors.ts
treatment-analytics.selectors.ts
```

Não exporte:

```text
clinic-counts.read-model.ts
clinic-analytics.read-model.ts
treatment-analytics.read-model.ts
```

Valide:

```sh
npm run check
```

### Atividade 8: Verificar Fronteiras

Rode:

```sh
rg -n "from '\\$app|from '\\$lib|\\.svelte|t\\(|i18n\\.locale|href|window|requestAnimationFrame|class=" packages/app-services/src/analytics
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
rg -n "function (bucketsForAnalysis|sortBuckets|filterPetsByBucket|sortPets|ownerPetCountBand|ownerVaccineStatus|ownerAntiparasiticStatus|studyVaccineItems|studyAntiparasiticItems|filterStudyPets|filterStudyOwners|buildStudyVisualizationBuckets|sortStatusItems|sortHistoryPoints)" apps/vet-app/src/routes/dashboard apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
```

Resultado esperado:

```text
@vet/app-services/analytics não importa app, lib local, Svelte, i18n visual ou navegação
nenhum package acima importa @vet/app-services
as funções semânticas extraídas não permanecem duplicadas nas páginas
```

### Atividade 9: Checks Finais

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

- `@vet/app-services/analytics` contém selectors puros de analytics;
- as páginas de dashboard usam esses selectors para seleção, filtro, ordenação
  e agrupamento;
- `TreatmentAnalyticsPage.svelte` usa selectors compartilhados para
  normalização e ordenação;
- labels, ícones, hrefs, classes CSS, query params e estado visual continuam no
  app;
- selectors retornam chaves e dados, não labels traduzidas;
- os selectors possuem testes focados;
- o DAG continua sem import cíclico;
- os checks finais passam.
