# Prompt Para Fase 4.4 Da Refatoração Modular

Refatore `@vet/app-services/analytics` para criar uma API canônica de consulta
analítica.

Esta fase deve definir a linguagem pública de analytics do pacote. A API
principal deve ser `queryAnalytics(...)`, usando o padrão **Query Object +
Specification Pattern**.

## Objetivo

Criar uma fachada simples para consultas analíticas:

```ts
queryAnalytics({
  target: 'pets',
  rows,
  dimensions,
  filters,
  groupBy: ['petBreed', 'petVaccineStatus'],
  measure: 'count',
  sort: { by: 'count', direction: 'desc' },
  selectedBucket,
  limit: 16
});
```

Essa API deve esconder os detalhes repetitivos de:

```text
Map
deduplicação
fallback de chaves
filtro
bucketização
bucket cruzado
ordenação
percentual
top bucket
limite
fatores ativos
seleção de bucket
```

As rotas não precisam ser reescritas nesta fase. Elas podem continuar usando os
selectors atuais. A fase 4.5 usará esta API para criar view models e enxugar as
rotas.

## Fluxo Esperado

```text
@vet/types/clinic-analytics.js
  contratos e helpers puros compartilhados

@vet/app-services/analytics
  read models
  services de leitura
  queryAnalytics(...)
  dimension specs
  selectors existentes usando queryAnalytics por baixo

apps/vet-app
  continua consumindo selectors públicos existentes
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

## Direção Arquitetural

Não adicione dependência externa de dataframe, OLAP ou visualização nesta fase.

A melhoria desejada é uma API própria, pequena, determinística e testada. Se no
futuro alguma biblioteca for adotada, ela deve ficar por baixo de
`queryAnalytics(...)`, sem vazar para selectors ou rotas.

## Arquivos

Crie:

```text
packages/app-services/src/analytics/analytics-query.ts
packages/app-services/src/analytics/clinic-study-analytics.types.ts
packages/app-services/src/analytics/analytics-dimensions.ts
packages/app-services/src/analytics/__tests__/analytics-query.test.ts
packages/app-services/src/analytics/__tests__/analytics-dimensions.test.ts
```

Edite:

```text
packages/app-services/src/analytics/index.ts
packages/app-services/src/analytics/analytics-bucket.selectors.ts
packages/app-services/src/analytics/clinic-pet-analytics.selectors.ts
packages/app-services/src/analytics/clinic-owner-analytics.selectors.ts
packages/app-services/src/analytics/clinic-study-analytics.selectors.ts
packages/app-services/src/analytics/treatment-analytics.selectors.ts
```

Mantenha `*.read-model.ts` como implementação interna. Não exporte read models
pela API pública de `@vet/app-services/analytics`.

## API Canônica

Implemente `packages/app-services/src/analytics/analytics-query.ts`.

### Tipos

```ts
import type {
  AnalyticsBucketSortField,
  AnalyticsSortDirection
} from '@vet/types/clinic-analytics.js';

export type AnalyticsKey = string;
export type AnalyticsTargetId = string;
export type AnalyticsDimensionId = string;
export type AnalyticsFilterId = string;
export type AnalyticsMeasure = 'count';

export type AnalyticsKeyComparator<Key extends AnalyticsKey = AnalyticsKey> = (
  firstKey: Key,
  secondKey: Key
) => number;

export interface AnalyticsDimensionSpec<
  Row,
  Id extends AnalyticsDimensionId = AnalyticsDimensionId,
  Key extends AnalyticsKey = AnalyticsKey
> {
  id: Id;
  keys: (row: Row) => readonly Key[];
  fallbackKey: Key;
  compareKeys?: AnalyticsKeyComparator<Key>;
  missingKeys?: readonly Key[];
}

export interface AnalyticsFilterSpec<
  Row,
  Id extends AnalyticsFilterId = AnalyticsFilterId
> {
  id: Id;
  valueKey: string;
  isActive: boolean;
  matches: (row: Row) => boolean;
}

export interface AnalyticsSort<DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId> {
  by: AnalyticsBucketSortField | DimensionId;
  direction: AnalyticsSortDirection;
}

export interface AnalyticsBucketSelection<DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId> {
  groupBy: readonly DimensionId[];
  keys: readonly AnalyticsKey[];
}

export interface AnalyticsQuery<
  Row,
  TargetId extends AnalyticsTargetId = AnalyticsTargetId,
  DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId,
  FilterId extends AnalyticsFilterId = AnalyticsFilterId
> {
  target: TargetId;
  rows: readonly Row[];
  dimensions: Readonly<Record<DimensionId, AnalyticsDimensionSpec<Row, DimensionId>>>;
  filters?: readonly AnalyticsFilterSpec<Row, FilterId>[];
  groupBy: readonly [DimensionId] | readonly [DimensionId, DimensionId];
  measure: AnalyticsMeasure;
  sort?: AnalyticsSort<DimensionId>;
  selectedBucket?: AnalyticsBucketSelection<DimensionId> | null;
  limit?: number;
  labelForKey?: (dimension: DimensionId, key: AnalyticsKey) => string;
  locale?: string;
}

export interface AnalyticsQueryBucket<
  DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId
> {
  key: string;
  groupBy: readonly DimensionId[];
  keys: readonly AnalyticsKey[];
  count: number;
}

export interface AnalyticsActiveFactor<FilterId extends AnalyticsFilterId = AnalyticsFilterId> {
  id: FilterId;
  valueKey: string;
  count: number;
}

export interface AnalyticsQueryResult<
  Row,
  TargetId extends AnalyticsTargetId = AnalyticsTargetId,
  DimensionId extends AnalyticsDimensionId = AnalyticsDimensionId,
  FilterId extends AnalyticsFilterId = AnalyticsFilterId
> {
  target: TargetId;
  groupBy: readonly DimensionId[];
  rows: Row[];
  listedRows: Row[];
  buckets: AnalyticsQueryBucket<DimensionId>[];
  limitedBuckets: AnalyticsQueryBucket<DimensionId>[];
  selectedBucket: AnalyticsQueryBucket<DimensionId> | null;
  activeFactors: AnalyticsActiveFactor<FilterId>[];
  totalCount: number;
  selectedCount: number;
  selectedPercent: number;
  topBucket: AnalyticsQueryBucket<DimensionId> | null;
}
```

### Função Principal

```ts
export function queryAnalytics<
  Row,
  TargetId extends AnalyticsTargetId,
  DimensionId extends AnalyticsDimensionId,
  FilterId extends AnalyticsFilterId = AnalyticsFilterId
>(
  query: AnalyticsQuery<Row, TargetId, DimensionId, FilterId>
): AnalyticsQueryResult<Row, TargetId, DimensionId, FilterId>;
```

### Helpers Públicos Do Engine

```ts
export function normalizeAnalyticsKeys<Key extends AnalyticsKey>(
  keys: readonly Key[],
  fallbackKey: Key
): Key[];

export function analyticsBucketKey(keys: readonly AnalyticsKey[]): string;

export function compareAnalyticsMissingLast<Key extends AnalyticsKey>(
  firstKey: Key,
  secondKey: Key,
  missingKeys?: readonly Key[]
): number;

export function analyticsPercent(input: {
  value: number;
  total: number;
}): number;

export function limitAnalyticsRows<Row>(
  rows: readonly Row[],
  limit: number
): Row[];
```

`analytics-bucket.selectors.ts` pode preservar
`compareAnalyticsUnknownLast(...)` como alias de compatibilidade para
`compareAnalyticsMissingLast(...)`, mas a API nova deve usar o nome
`missing`.

`analyticsBucketKey(keys)` deve usar uma serialização estável que não dependa de
separador textual simples. Use `JSON.stringify(keys)` para evitar colisões entre
chaves compostas.

## Semântica Da API

`queryAnalytics(...)` deve:

```text
1. validar que groupBy possui 1 ou 2 dimensões;
2. lançar erro claro quando groupBy ou sort.by apontar para dimensão inexistente;
3. aplicar apenas filtros ativos;
4. aplicar filtros ativos com lógica AND;
5. montar buckets com base em groupBy;
6. deduplicar chaves por row antes de contar;
7. usar dimension.fallbackKey quando dimension.keys(row) retornar vazio;
8. gerar bucket.key estável por analyticsBucketKey(bucket.keys);
9. ordenar por count desc quando sort não for informado;
10. ordenar por count asc/desc quando sort.by for 'count';
11. ordenar por análise usando a primeira dimensão de groupBy quando sort.by for 'analysis';
12. ordenar por uma dimensão específica quando sort.by for o id de uma dimensão presente em groupBy;
13. usar dimension.compareKeys quando existir;
14. usar labelForKey + locale quando não houver compareKeys e labelForKey existir;
15. usar localeCompare da própria key como último fallback;
16. manter missingKeys no fim da ordenação por análise, em asc e desc;
17. retornar rows filtradas apenas pelos filtros ativos;
18. retornar listedRows filtradas pelos filtros ativos e selectedBucket válido;
19. retornar listedRows igual a rows quando selectedBucket vier vazio ou inválido;
20. retornar selectedBucket null quando a seleção não existir nos buckets;
21. calcular totalCount com base em rows filtradas;
22. calcular selectedCount com base em listedRows;
23. calcular selectedPercent com 1 casa decimal;
24. retornar topBucket como o primeiro bucket ordenado;
25. retornar limitedBuckets sem mutar buckets;
26. retornar activeFactors com uma contagem individual por filtro ativo;
27. considerar selectedBucket válido apenas quando groupBy e keys forem compatíveis com a consulta.
```

`activeFactors` deve contar quantas linhas do conjunto original satisfazem cada
filtro ativo individualmente. Essa contagem não deve depender dos outros filtros
ativos da mesma consulta.

`unknown` representa ausência de informação cadastral e deve entrar em
`missingKeys`.

`untracked` representa ausência de acompanhamento registrado, mas é uma chave
analítica válida. Ele só deve entrar em `missingKeys` se a dimension spec
declarar isso explicitamente.

## Dimension Specs

Antes de implementar as specs, crie
`packages/app-services/src/analytics/clinic-study-analytics.types.ts`.

Esse arquivo é o ponto neutro para os tipos semânticos compartilhados entre:

```text
analytics-dimensions.ts
clinic-study-analytics.selectors.ts
clinic-study-analytics.view-model.ts
testes de analytics
```

`analytics-dimensions.ts` não deve importar tipos de
`clinic-study-analytics.selectors.ts`. Os selectors podem importar types e
specs, mas specs não podem depender dos selectors.

### Tipos Neutros Esperados

```ts
import type {
  ClinicAnalyticsAntiparasiticStatusKey,
  ClinicAnalyticsOwnerStudyItem,
  ClinicAnalyticsPetStudyItem,
  ClinicAnalyticsStudyTarget,
  ClinicAnalyticsVaccineStatusKey
} from '@vet/types/clinic-analytics.js';

export type ClinicAnalyticsQueryTarget = ClinicAnalyticsStudyTarget;

export type ClinicAnalyticsQueryDimension =
  | 'petSpecies'
  | 'petBreed'
  | 'petSex'
  | 'petAge'
  | 'petVaccineStatus'
  | 'petAntiparasiticStatus'
  | 'ownerCity'
  | 'ownerLocation'
  | 'ownerPetCount'
  | 'ownerPetVaccineStatus'
  | 'ownerPetAntiparasiticStatus'
  | 'ownerPetSpecies'
  | 'vaccine'
  | 'vaccineStatus'
  | 'antiparasitic'
  | 'antiparasiticStatus';

export type ClinicAnalyticsStudyDimension = ClinicAnalyticsQueryDimension;

export type ClinicAnalyticsQueryFilter =
  | 'petSpecies'
  | 'petBreed'
  | 'petSex'
  | 'petAge'
  | 'ownerCity'
  | 'ownerPetCount'
  | 'vaccine'
  | 'vaccineStatus'
  | 'antiparasitic'
  | 'antiparasiticStatus';

export type ClinicAnalyticsStudyFilterFactor =
  | 'vaccine'
  | 'vaccineStatus'
  | 'antiparasitic'
  | 'antiparasiticStatus'
  | 'species'
  | 'breed'
  | 'sex'
  | 'age'
  | 'city'
  | 'ownerPetCount';

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

export interface ClinicAnalyticsStudyBucketSelection extends ClinicAnalyticsStudyBucket {
  primaryDimension: ClinicAnalyticsStudyDimension;
  secondaryDimension: ClinicAnalyticsStudyDimension;
}

export interface ClinicAnalyticsStudyResolvedTarget {
  pets: ClinicAnalyticsPetStudyItem[];
  owners: ClinicAnalyticsOwnerStudyItem[];
  vaccines: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}
```

`ClinicAnalyticsQueryDimension` é a taxonomia canônica de dimensões para
`queryAnalytics(...)`.

`ClinicAnalyticsStudyDimension` deve ser apenas alias de
`ClinicAnalyticsQueryDimension`. Não mantenha duas famílias paralelas de
dimensões.

Depois de criar esse arquivo, atualize `clinic-study-analytics.selectors.ts`
para importar esses tipos dele, em vez de defini-los localmente.

Para preservar a API pública atual, `clinic-study-analytics.selectors.ts` deve
reexportar os tipos movidos:

```ts
export type {
  ClinicAnalyticsQueryDimension,
  ClinicAnalyticsQueryFilter,
  ClinicAnalyticsQueryRow,
  ClinicAnalyticsQueryTarget,
  ClinicAnalyticsStudyBucket,
  ClinicAnalyticsStudyBucketSelection,
  ClinicAnalyticsStudyDimension,
  ClinicAnalyticsStudyFilterFactor,
  ClinicAnalyticsStudyFilters,
  ClinicAnalyticsStudyResolvedTarget,
  ClinicAnalyticsStudyTreatmentSummary
} from './clinic-study-analytics.types.js';
```

### Linha Canônica

Defina uma linha canônica para consultas cruzadas:

```ts
export type ClinicAnalyticsQueryRow =
  | {
      kind: 'pet';
      pet: ClinicAnalyticsPetStudyItem;
      owners: readonly ClinicAnalyticsOwnerStudyItem[];
    }
  | {
      kind: 'owner';
      owner: ClinicAnalyticsOwnerStudyItem;
    }
  | {
      kind: 'vaccine';
      vaccine: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>;
      pet: ClinicAnalyticsPetStudyItem;
      owners: readonly ClinicAnalyticsOwnerStudyItem[];
    }
  | {
      kind: 'antiparasitic';
      antiparasitic: ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>;
      pet: ClinicAnalyticsPetStudyItem;
      owners: readonly ClinicAnalyticsOwnerStudyItem[];
    };
```

`ClinicAnalyticsQueryRow` também deve ficar em
`clinic-study-analytics.types.ts`.

### Specs Esperadas

Implemente `packages/app-services/src/analytics/analytics-dimensions.ts`
importando tipos de `clinic-study-analytics.types.ts`.

### Exports Esperados

```ts
export const clinicAnalyticsMissingKeys: readonly string[];

export const clinicAnalyticsQueryDimensions: Record<
  ClinicAnalyticsQueryDimension,
  AnalyticsDimensionSpec<ClinicAnalyticsQueryRow, ClinicAnalyticsQueryDimension>
>;

export function listClinicAnalyticsQueryRows(input: {
  target: ClinicAnalyticsQueryTarget;
  pets: readonly ClinicAnalyticsPetStudyItem[];
  owners: readonly ClinicAnalyticsOwnerStudyItem[];
  vaccines: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsVaccineStatusKey>[];
  antiparasitics: readonly ClinicAnalyticsStudyTreatmentSummary<ClinicAnalyticsAntiparasiticStatusKey>[];
}): ClinicAnalyticsQueryRow[];

export function listClinicAnalyticsTargetDimensions(
  target: ClinicAnalyticsQueryTarget
): ClinicAnalyticsQueryDimension[];

export function defaultClinicAnalyticsPrimaryDimension(
  target: ClinicAnalyticsQueryTarget
): ClinicAnalyticsQueryDimension;

export function defaultClinicAnalyticsSecondaryDimension(
  target: ClinicAnalyticsQueryTarget
): ClinicAnalyticsQueryDimension;

export function normalizeClinicAnalyticsQueryDimensions(input: {
  target: ClinicAnalyticsQueryTarget;
  primaryDimension: ClinicAnalyticsQueryDimension;
  secondaryDimension: ClinicAnalyticsQueryDimension;
}): {
  primaryDimension: ClinicAnalyticsQueryDimension;
  secondaryDimension: ClinicAnalyticsQueryDimension;
};
```

### Regras Das Specs

As specs devem centralizar:

```text
chaves de espécie
chaves de raça
chaves de sexo
chaves de idade
chaves de cidade
chaves de localidade
chaves de quantidade de pets por owner
chaves de status vacinal
chaves de status antiparasitário
chaves de produto vacinal
chaves de produto antiparasitário
comparação semântica de idade
comparação semântica de status
comparação semântica de quantidade de pets
fallback unknown para informação cadastral ausente
fallback untracked para acompanhamento ausente
```

## Adaptação Dos Selectors Existentes

Atualize os selectors existentes para usar `queryAnalytics(...)` por baixo,
preservando a API pública já criada na fase 4.3.

### `analytics-bucket.selectors.ts`

Preserve estes exports:

```ts
export function toAnalyticsBuckets<Key extends string>(
  buckets: Map<Key, number>
): AnalyticsBucket<Key>[];

export function compareAnalyticsUnknownLast(
  firstKey: string,
  secondKey: string
): number;

export function sortAnalyticsBuckets<Key extends string>(input: {
  buckets: AnalyticsBucket<Key>[];
  field: AnalyticsBucketSortField;
  direction: AnalyticsSortDirection;
  compareByAnalysis: (first: AnalyticsBucket<Key>, second: AnalyticsBucket<Key>) => number;
}): AnalyticsBucket<Key>[];
```

Internamente, use as regras do novo engine. Corrija a ordenação para que
`unknown` permaneça no fim em ordem ascendente e descendente por análise.

### Pets, Owners E Estudo Geral

Mantenha os exports públicos atuais dos arquivos:

```text
clinic-pet-analytics.selectors.ts
clinic-owner-analytics.selectors.ts
clinic-study-analytics.selectors.ts
treatment-analytics.selectors.ts
```

Refatore a implementação para delegar ao engine quando houver:

```text
bucketização
filtro por bucket
bucket cruzado
top bucket
percentual
limite
ordenação por count
ordenação por análise
fallback de chaves
deduplicação de chaves
```

Não mude o comportamento visível das rotas nesta fase.

## Exemplos Obrigatórios No Código

Inclua testes que demonstrem o uso real da API.

### Bucket Simples

```ts
const result = queryAnalytics({
  target: 'pets',
  rows,
  dimensions,
  groupBy: ['petBreed'],
  measure: 'count',
  sort: { by: 'count', direction: 'desc' }
});
```

### Bucket Cruzado

```ts
const result = queryAnalytics({
  target: 'pets',
  rows,
  dimensions,
  filters,
  groupBy: ['petBreed', 'petVaccineStatus'],
  measure: 'count',
  sort: { by: 'count', direction: 'desc' },
  selectedBucket: {
    groupBy: ['petBreed', 'petVaccineStatus'],
    keys: ['spitz_alemao', 'overdue']
  },
  limit: 16
});
```

### Ordenação Por Label Externa

```ts
const result = queryAnalytics({
  target: 'pets',
  rows,
  dimensions,
  groupBy: ['petBreed'],
  measure: 'count',
  sort: { by: 'analysis', direction: 'asc' },
  labelForKey: (_dimension, key) => labels[key] ?? key,
  locale: 'pt-BR'
});
```

## Testes Obrigatórios

Adicione ou atualize testes cobrindo:

```text
queryAnalytics com bucket simples
queryAnalytics com bucket cruzado
queryAnalytics com filtros ativos
queryAnalytics ignorando filtros inativos
queryAnalytics com selectedBucket válido
queryAnalytics com selectedBucket inválido
queryAnalytics com limit
queryAnalytics com topBucket
queryAnalytics com activeFactors
queryAnalytics com sort count asc e desc
queryAnalytics com sort analysis asc e desc
queryAnalytics mantendo unknown no fim em analysis asc e desc
queryAnalytics usando labelForKey quando compareKeys não existir
normalizeAnalyticsKeys com fallback
analyticsPercent arredondando para 1 casa decimal
selectors antigos preservando comportamento público
```

## Regras De Fronteira

Pode ir para `@vet/app-services/analytics`:

```text
queryAnalytics
dimension specs
bucketização
filtros analíticos
ordenação semântica
percentuais numéricos
totais
limites de listas
fatores ativos
seleção de bucket
normalização de chaves
```

Deve ficar fora de `@vet/app-services/analytics`:

```text
t(...)
i18n.locale como store global
componentes Svelte
classes CSS
ícones
hrefs
query params
window
requestAnimationFrame
avatares
diálogos
```

`@vet/app-services/analytics` pode receber `locale` e `labelForKey` como
parâmetros de função. O package não deve importar i18n nem chamar `t(...)`.

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
git status --short
npm run check
npm run test:run
```

Registre falhas existentes antes de alterar arquivos.

### Atividade 2: Criar `analytics-query.ts`

Implemente a API canônica `queryAnalytics(...)`, seus tipos e helpers públicos.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 3: Criar Tipos Neutros E Dimensions

Crie `clinic-study-analytics.types.ts`.

Mova para ele os tipos semânticos de estudo que hoje ficam em
`clinic-study-analytics.selectors.ts`.

Depois implemente `analytics-dimensions.ts` usando esses tipos neutros.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 4: Adaptar Selectors

Refatore os selectors existentes para usarem `queryAnalytics(...)` onde isso
reduzir duplicação e preservar clareza.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Atualizar API Pública

Atualize `packages/app-services/src/analytics/index.ts` para exportar:

```text
clinic-analytics.service.ts
treatment-analytics.service.ts
analytics-query.ts
clinic-study-analytics.types.ts
analytics-dimensions.ts
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

### Atividade 6: Verificar Fronteiras

Rode:

```sh
rg -n "from '\\$app|from '\\$lib|\\.svelte|t\\(|i18n\\.locale|href|window|requestAnimationFrame|class=" packages/app-services/src/analytics
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
```

Resultado esperado:

```text
@vet/app-services/analytics não importa app, lib local, Svelte, i18n visual ou navegação
nenhum package acima importa @vet/app-services
```

### Atividade 7: Checks Finais

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

- `queryAnalytics(...)` é a API canônica de consulta analítica;
- `analytics-query.ts` contém tipos, função principal e helpers públicos;
- `clinic-study-analytics.types.ts` contém tipos compartilhados de estudo e
  evita dependência circular entre specs e selectors;
- `analytics-dimensions.ts` contém specs reutilizáveis de dimensões;
- `ClinicAnalyticsStudyDimension` é alias de `ClinicAnalyticsQueryDimension`;
- selectors existentes preservam API pública e usam o engine onde fizer sentido;
- a ordenação por análise mantém `unknown` no fim em asc e desc;
- não há dependência externa nova de analytics;
- `@vet/app-services/analytics` continua sem Svelte, `$lib`, `$app`, `t(...)`,
  `href`, `window`, `requestAnimationFrame` e classes CSS;
- arquivos `*.read-model.ts` continuam fora da API pública;
- testes demonstram o uso de `queryAnalytics(...)` com bucket simples, bucket
  cruzado, filtros, seleção, ordenação e labels externas;
- os checks finais passam.
