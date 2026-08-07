# Prompt Para Fase 4.2 Da Refatoração Modular

Refatore o vocabulário de analytics para separar claramente o que é dado
analítico do que é tela de dashboard.

Esta fase é uma renomeação semântica e uma limpeza de fronteira de tipos. O
comportamento visual e os resultados calculados devem permanecer iguais.

## Objetivo

Reservar o termo `dashboard` para rotas, telas, abas, links e layout do app.

Usar `clinicAnalytics` ou `analytics` para dados, métricas, buckets, status,
estudos, ordenações e helpers puros de análise.

Fluxo esperado:

```text
@vet/types
  contratos e helpers puros de analytics

@vet/app-services/analytics
  read models, SQL read-only, agregações e composição transversal

apps/vet-app/src/routes/dashboard
  rotas, tabs, href, labels, ícones, gráficos, estado visual e interação
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

O plano de auditoria orienta os destinos. Esta fase executa apenas a renomeação
semântica e o deslocamento dos tipos de rota que hoje estão em `@vet/types`.

## Arquivos Alvo

Edite:

```text
packages/types/src/domain/dashboard/analytics.ts
packages/types/src/domain/dashboard/age-bands.ts
packages/types/src/domain/dashboard/__tests__/age-bands.test.ts
packages/types/src/clinic-analytics.ts
packages/types/src/index.ts
packages/app-services/src/analytics/clinic-analytics.read-model.ts
packages/app-services/src/analytics/clinic-analytics.service.ts
apps/vet-app/src/routes/dashboard/+layout.svelte
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
```

Verifique também os imports afetados com `rg`.

## Estrutura Esperada Em `@vet/types`

Mova o domínio compartilhado de analytics para:

```text
packages/types/src/domain/clinic-analytics/
  analytics.ts
  age-bands.ts
  __tests__/
    age-bands.test.ts
```

Atualize:

```text
packages/types/src/clinic-analytics.ts
packages/types/src/index.ts
```

`packages/types/src/clinic-analytics.ts` deve reexportar os arquivos novos:

```ts
export * from './domain/clinic-analytics/age-bands.js';
export * from './domain/clinic-analytics/analytics.js';
```

Consumidores externos devem importar analytics compartilhado por:

```ts
@vet/types/clinic-analytics.js
```

Dentro de `@vet/types`, use imports relativos quando fizer mais sentido.

Remova os arquivos de `packages/types/src/domain/dashboard/` ao final da
renomeação. O domínio compartilhado de analytics deve existir em
`domain/clinic-analytics`.

## Vocabulário Alvo

Renomeie os contratos de analytics:

```text
DashboardAnalytics -> ClinicAnalytics
DashboardPetAnalytics -> ClinicPetAnalytics
DashboardOwnerAnalytics -> ClinicOwnerAnalytics
DashboardStudyAnalytics -> ClinicAnalyticsStudy
DashboardBucket -> AnalyticsBucket
DashboardNamedBucket -> AnalyticsNamedBucket
DashboardPetStudyItem -> ClinicAnalyticsPetStudyItem
DashboardOwnerStudyItem -> ClinicAnalyticsOwnerStudyItem
DashboardPetStudyOwner -> ClinicAnalyticsPetOwnerSnapshot
DashboardOwnerStudyPet -> ClinicAnalyticsOwnerPetSnapshot
DashboardPetStudyTreatment -> ClinicAnalyticsPetTreatmentSnapshot
DashboardSpeciesKey -> ClinicAnalyticsSpeciesKey
DashboardBreedKey -> ClinicAnalyticsBreedKey
DashboardSexKey -> ClinicAnalyticsSexKey
DashboardAgeBandKey -> ClinicAnalyticsAgeBandKey
DashboardPetCountBandKey -> ClinicAnalyticsPetCountBandKey
DashboardTreatmentStatusKey -> ClinicAnalyticsTreatmentStatusKey
DashboardVaccineStatusKey -> ClinicAnalyticsVaccineStatusKey
DashboardAntiparasiticStatusKey -> ClinicAnalyticsAntiparasiticStatusKey
DashboardPetAnalysisKind -> ClinicAnalyticsPetDimension
DashboardOwnerAnalysisKind -> ClinicAnalyticsOwnerDimension
DashboardBucketSortField -> AnalyticsBucketSortField
DashboardSortDirection -> AnalyticsSortDirection
DashboardStudyTarget -> ClinicAnalyticsStudyTarget
```

Renomeie as constantes e helpers:

```text
dashboardStudyTargets -> clinicAnalyticsStudyTargets
dashboardVaccineStatusKeys -> clinicAnalyticsVaccineStatusKeys
dashboardAntiparasiticStatusKeys -> clinicAnalyticsAntiparasiticStatusKeys
dashboardPetAnalysisKinds -> clinicAnalyticsPetDimensions
dashboardOwnerAnalysisKinds -> clinicAnalyticsOwnerDimensions
dashboardTreatmentStatusWeight -> clinicAnalyticsTreatmentStatusWeight
dashboardPetCountBandWeight -> clinicAnalyticsPetCountBandWeight
dashboardAgeMonthBandKeys -> clinicAnalyticsAgeMonthBandKeys
dashboardAgeBand -> clinicAnalyticsAgeBand
dashboardAgeBandYear -> clinicAnalyticsAgeBandYear
dashboardAgeBandSortValue -> clinicAnalyticsAgeBandSortValue
getDashboardAnalytics -> getClinicAnalytics
```

Não mantenha uma API pública paralela com os nomes `Dashboard*` em `@vet/types`
ou `@vet/app-services/analytics`. A fase deve terminar com os consumidores
ajustados para os nomes novos.

## Tipos De Rota Da Dashboard

`DashboardAnalysisView` e `dashboardAnalysisViews` representam abas e rotas da
tela `/dashboard`. Eles devem ficar no app.

Em:

```text
apps/vet-app/src/routes/dashboard/+layout.svelte
```

defina localmente:

```ts
type DashboardView = 'general' | 'vaccines' | 'antiparasitics' | 'pets' | 'owners';

const dashboardViews = ['general', 'vaccines', 'antiparasitics', 'pets', 'owners'] as const satisfies readonly DashboardView[];
```

Use `DashboardView` apenas para navegação, aba ativa e montagem de `href`.

## Alvo De Estudo Analítico

`ClinicAnalyticsStudyTarget` deve representar o alvo semântico de uma análise:

```ts
export type ClinicAnalyticsStudyTarget = 'vaccines' | 'antiparasitics' | 'pets' | 'owners';

export const clinicAnalyticsStudyTargets = ['vaccines', 'antiparasitics', 'pets', 'owners'] as const satisfies readonly ClinicAnalyticsStudyTarget[];
```

Mesmo que os valores coincidam com segmentos de rota hoje, o tipo compartilhado
deve ser tratado como alvo analítico, não como view de dashboard.

## App-services De Analytics

Atualize `packages/app-services/src/analytics/clinic-analytics.read-model.ts`:

```text
usar imports de @vet/types/clinic-analytics.js
trocar Dashboard* por ClinicAnalytics* ou Analytics*
trocar dashboardAgeBand* por clinicAnalyticsAgeBand*
trocar dashboardTreatmentStatusWeight por clinicAnalyticsTreatmentStatusWeight
renomear getDashboardAnalytics para getClinicAnalytics
```

Atualize `packages/app-services/src/analytics/clinic-analytics.service.ts` para
usar `getClinicAnalytics` e o tipo `ClinicAnalytics`.

A API pública de `@vet/app-services/analytics` deve continuar expondo:

```ts
loadClinicAnalyticsOverview
loadTreatmentAnalyticsOverview
loadTreatmentStatusItems
loadTreatmentHistory
loadAnalyticsTreatments
```

Esta fase não muda SQL nem regras de agregação. Apenas renomeia símbolos e
imports.

## Rotas De Dashboard

Atualize as páginas:

```text
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
```

Use os novos imports de:

```ts
@vet/types/clinic-analytics.js
```

Troque nomes de tipos, constantes e helpers conforme o vocabulário alvo.

Mantenha no app:

```text
labels traduzidas
ícones
classes CSS
links e hrefs
query params
estado visual
tabs
gráficos
interações
helpers que retornam texto traduzido
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

### Atividade 2: Mover O Domínio De Analytics

Crie:

```text
packages/types/src/domain/clinic-analytics/
```

Mova e renomeie:

```text
packages/types/src/domain/dashboard/analytics.ts -> packages/types/src/domain/clinic-analytics/analytics.ts
packages/types/src/domain/dashboard/age-bands.ts -> packages/types/src/domain/clinic-analytics/age-bands.ts
packages/types/src/domain/dashboard/__tests__/age-bands.test.ts -> packages/types/src/domain/clinic-analytics/__tests__/age-bands.test.ts
```

Aplique o vocabulário alvo nos arquivos movidos e nos testes.

Atualize:

```text
packages/types/src/clinic-analytics.ts
packages/types/src/index.ts
```

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 3: Separar Os Tipos De Rota Da Dashboard

Remova `DashboardAnalysisView` e `dashboardAnalysisViews` de `@vet/types`.

Crie `DashboardView` e `dashboardViews` localmente em:

```text
apps/vet-app/src/routes/dashboard/+layout.svelte
```

Atualize `viewOptions`, `resolveActiveView` e `viewHref`.

Valide:

```sh
npm run check
```

### Atividade 4: Renomear App-services

Atualize:

```text
packages/app-services/src/analytics/clinic-analytics.read-model.ts
packages/app-services/src/analytics/clinic-analytics.service.ts
```

Troque os nomes `Dashboard*` pelos nomes `ClinicAnalytics*`/`Analytics*`.

Renomeie:

```text
getDashboardAnalytics -> getClinicAnalytics
```

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Atualizar Consumidores Do App

Atualize imports e nomes nas páginas:

```text
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
```

Preserve comportamento, layout, labels, filtros visuais e navegação.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 6: Verificar Vocabulário E Fronteiras

Rode:

```sh
rg -n "@vet/types/domain/dashboard" packages apps
rg -n "Dashboard[A-Z]|dashboardAge|dashboardTreatment|dashboardPetCount|dashboardStudy|dashboardVaccine|dashboardAntiparasitic|dashboardPetAnalysis|dashboardOwnerAnalysis|getDashboardAnalytics" packages/types/src packages/app-services/src
rg -n "Dashboard[A-Z]|dashboardAge|dashboardTreatment|dashboardPetCount|dashboardStudy|dashboardVaccine|dashboardAntiparasitic|dashboardPetAnalysis|dashboardOwnerAnalysis|getDashboardAnalytics" packages/types/src/domain/clinic-analytics packages/app-services/src/analytics
rg -n "Dashboard[A-Z]" apps/vet-app/src/routes/dashboard
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
```

Resultado esperado:

```text
nenhum import de @vet/types/domain/dashboard
nenhum nome Dashboard* em @vet/types ou @vet/app-services/analytics
em apps/vet-app/src/routes/dashboard, DashboardView pode aparecer como tipo local de rota
nomes com dashboard aparecem apenas quando forem rota, tela, layout ou caminho do app
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

- `packages/types/src/domain/clinic-analytics/` contém os contratos e helpers de
  analytics;
- `packages/types/src/domain/dashboard/` não contém mais contratos
  compartilhados de analytics;
- `@vet/types/clinic-analytics.js` é o import público usado pelos consumidores;
- `@vet/app-services/analytics` usa `ClinicAnalytics*` e `Analytics*`;
- `apps/vet-app/src/routes/dashboard/+layout.svelte` possui o tipo local
  `DashboardView`;
- `dashboard` permanece apenas como vocabulário de rota, tela, layout e
  experiência visual;
- a UI e os dados apresentados continuam equivalentes;
- os checks finais passam.
