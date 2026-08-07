# Auditoria De Fronteira De Analytics

## Resumo

Esta pre-fase auditou a area de analytics sem alterar codigo de producao. O estado atual esta funcional: o baseline rodado antes da documentacao passou com `npm run check` e `npm run test:run`, e o `git status --short` inicial mostrava apenas `docs/prompts/refatoracao-monolito-modular-fase-4-2-pre-auditoria-analytics.md` como arquivo novo.

A fronteira principal ja esta bem encaminhada: SQL, agregacao e composicao transversal estao em `packages/app-services/src/analytics`, enquanto rotas, labels, icones, classes, graficos, tabs e interacoes estao em `apps/vet-app`.

O maior desalinhamento e semantico: `packages/types/src/domain/dashboard` contem dados e regras de analytics com vocabulario `Dashboard*`. Para as proximas fases, a direcao recomendada e reservar `dashboard` para rota/tela/layout e usar `clinicAnalytics` ou `analytics` para dados, buckets, status, estudos e ordenacoes.

Tambem ha uma concentracao grande de filtros, agrupamentos e derivacoes semanticas nas paginas `dashboard/general`, `dashboard/pets`, `dashboard/owners` e no componente `TreatmentAnalyticsPage.svelte`. Essas regras funcionam, mas devem ser candidatas a extracao para `@vet/app-services/analytics` na fase 4.3, mantendo no app apenas estado visual, label traduzida e navegacao.

Checks registrados nesta pre-fase:

| Momento | Comando | Resultado |
| --- | --- | --- |
| Baseline | `git status --short` | apenas o prompt da fase 4.2-pre aparecia como untracked |
| Baseline | `npm run check` | passou, `svelte-check found 0 errors and 0 warnings` |
| Baseline | `npm run test:run` | passou, 24 arquivos e 142 testes |
| Final | `npm run check` | passou |
| Final | `npm run test:run` | passou |
| Final | `git diff --check` | passou, sem saida |
| Final | `git status --short` | `?? docs/plans/analytics-boundary-audit.md` e `?? docs/prompts/refatoracao-monolito-modular-fase-4-2-pre-auditoria-analytics.md` |

## Inventario Por Arquivo

### `packages/types/src/domain/dashboard/analytics.ts`

Contem tipos puros, constantes puras e vocabulario ainda nomeado como dashboard:

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `DashboardAnalytics`, `DashboardPetAnalytics`, `DashboardOwnerAnalytics`, `DashboardStudyAnalytics` | tipo puro de analytics | `@vet/types` | Renomear para `ClinicAnalytics*` na fase 4.2. |
| `DashboardBucket`, `DashboardNamedBucket` | tipo puro de bucket | `@vet/types` | Renomear para `AnalyticsBucket` e `AnalyticsNamedBucket`. |
| `DashboardPetStudyItem`, `DashboardOwnerStudyItem`, `DashboardPetStudyOwner`, `DashboardOwnerStudyPet`, `DashboardPetStudyTreatment` | tipo puro de estudo analitico | `@vet/types` | Nomes devem abandonar `Dashboard`. |
| `DashboardSpeciesKey`, `DashboardBreedKey`, `DashboardSexKey`, `DashboardAgeBandKey`, `DashboardPetCountBandKey` | chaves de bucket analitico | `@vet/types` | Mantem valores semanticos; renomear prefixo. |
| `DashboardTreatmentStatusKey`, `DashboardVaccineStatusKey`, `DashboardAntiparasiticStatusKey` | chaves de status agregado | `@vet/types` | Sao analytics, nao UI. |
| `dashboardTreatmentStatusWeight`, `dashboardPetCountBandWeight` | constantes puras de ordenacao semantica | `@vet/types` | Renomear para `clinicAnalyticsTreatmentStatusWeight` e `clinicAnalyticsPetCountBandWeight`. |
| `DashboardPetAnalysisKind`, `DashboardOwnerAnalysisKind`, `dashboardPetAnalysisKinds`, `dashboardOwnerAnalysisKinds` | dimensoes de analise | `@vet/types` ou `@vet/app-services/analytics` | Se continuarem apenas como opcoes de tela, podem ficar no app; se guiarem filtros/ordenacao compartilhados, renomear para `ClinicAnalyticsPetDimension` e `ClinicAnalyticsOwnerDimension`. |
| `DashboardBucketSortField`, `DashboardSortDirection` | estado de ordenacao | `apps/vet-app` ou `@vet/types` | Hoje representam controle visual; so devem ficar em package se a ordenacao for extraida. |
| `DashboardAnalysisView`, `dashboardAnalysisViews` | abas/rotas da dashboard | `apps/vet-app` | Ligado diretamente a `/dashboard/*`; deve sair de `@vet/types`. |
| `DashboardStudyTarget`, `dashboardStudyTargets` | alvo de estudo, hoje acoplado aos nomes das abas | dividir | A parte semantica vira `ClinicAnalyticsStudyTarget`; a parte de rota fica no app. |

### `packages/types/src/domain/dashboard/age-bands.ts`

Contem helper deterministico puro de analytics:

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `dashboardAgeMonthBandKeys` | constante pura | `@vet/types` | Renomear para `clinicAnalyticsAgeMonthBandKeys`. |
| `dashboardAgeBand` | helper puro sem i18n/UI/banco | `@vet/types` | Renomear para `clinicAnalyticsAgeBand`. |
| `dashboardAgeBandYear` | parser puro de chave | `@vet/types` | Renomear para `clinicAnalyticsAgeBandYear`. |
| `dashboardAgeBandSortValue` | ordenacao semantica pura | `@vet/types` | Renomear para `clinicAnalyticsAgeBandSortValue`. |

### `packages/types/src/clinic-analytics.ts`

Barrel publico estreito para analytics de clinica. Hoje reexporta `domain/dashboard/age-bands.js` e `domain/dashboard/analytics.js`.

Destino recomendado: manter como API publica temporaria durante a renomeacao 4.2, apontando depois para arquivos renomeados como `domain/clinic-analytics/*` ou equivalente.

### `packages/app-services/src/analytics/clinic-analytics.read-model.ts`

Arquivo bem posicionado em `@vet/app-services/analytics`: usa `selectMany`, consulta owners/pets/tratamentos, agrega buckets e monta o snapshot transversal da clinica.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `PetAnalyticsRow`, `OwnerAnalyticsRow`, `PetOwnerAnalyticsRow`, `LatestTreatmentAnalyticsRow` | DTO local de SQL | `@vet/app-services/analytics` | Sem acao. |
| `listPetRows`, `listOwnerRows`, `listPetOwnerRows`, `listLatestTreatmentRows` | read model SQL | `@vet/app-services/analytics` | Sem acao. |
| `incrementBucket`, `toBuckets`, `toNamedBuckets`, `incrementNamedBucket` | helper de agregacao | `@vet/app-services/analytics` | Pode virar helper interno compartilhado se 4.3 extrair mais regras. |
| `petCountBand`, `completeAgeBuckets`, `worstVaccineStatus`, `worstAntiparasiticStatus` | regra semantica de analytics | `@vet/types` ou `@vet/app-services/analytics` | Ha duplicacao no app; consolidar na 4.3. |
| `locationLabel`, `locationKey`, `cityLabel` | normalizacao semantica de localidade para analytics | `@vet/app-services/analytics` | Mantem sem i18n e sem rota. |
| `buildPetAnalytics`, `buildOwnerAnalytics`, `buildStudyAnalytics` | composicao transversal de dados | `@vet/app-services/analytics` | Sem acao estrutural; renomear `Dashboard*` na 4.2. |
| `getDashboardAnalytics` | API interna com nome `Dashboard` | `@vet/app-services/analytics` | Renomear para `getClinicAnalytics` na 4.2. |

### `packages/app-services/src/analytics/clinic-analytics.service.ts`

Compoe contadores, overview de tratamentos, historico e analytics geral.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `ClinicTreatmentAnalytics`, `ClinicAnalyticsOverview` | tipo de retorno de app-service | `@vet/app-services/analytics` ou `@vet/types` se virar contrato compartilhado | Hoje e contrato do service; pode permanecer. |
| `loadClinicAnalyticsOverview` | app service de leitura | `@vet/app-services/analytics` | Sem acao; trocar `DashboardAnalytics` por `ClinicAnalytics` na 4.2. |

### `packages/app-services/src/analytics/treatment-analytics.read-model.ts`

Arquivo bem posicionado em app-services: normaliza filtros, consulta tratamentos, monta overview, lista itens por status e historico.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `LatestTreatmentRow`, `TreatmentHistoryRow`, `AnalyticsTreatmentRow` | DTO local de SQL | `@vet/app-services/analytics` | Sem acao. |
| `statusOrder` | constante de ordenacao semantica | `@vet/types/domain/treatment/analytics` ou `@vet/app-services/analytics` | Pode ser exportada se o app tambem ordenar status. |
| `parseOwnerIds`, `normalizeStatus`, `normalizeDueFilterMode`, `normalizeDueDate`, `normalizeDueFilter`, `normalizePeriod`, `normalizeTreatmentFilter` | normalizacao semantica de filtro | `@vet/app-services/analytics` | Sem acao, exceto evitar duplicacao com UI em 4.3. |
| `listLatestTreatmentRows`, `listTreatmentHistory`, `listAnalyticsTreatments` | read model SQL | `@vet/app-services/analytics` | Sem acao. |
| `mapStatusItem`, `sortStatusItems`, `getTreatmentAnalyticsOverview`, `listTreatmentStatusItems` | derivacao e ordenacao semantica | `@vet/app-services/analytics` | Sem acao; `sortStatusItems` pode expor criterio se o app precisar reordenar. |

### `packages/app-services/src/analytics/treatment-analytics.service.ts`

Facade fina sobre o read model. Deve permanecer em `@vet/app-services/analytics`.

### `packages/app-services/src/analytics/clinic-counts.read-model.ts`

Read model SQL simples para contadores de owners, pets e prontuarios. Deve permanecer em `@vet/app-services/analytics`.

### `packages/app-services/src/analytics/index.ts`

Barrel publico de app-services. Deve continuar exportando apenas services, nao read models.

### `apps/vet-app/src/routes/dashboard/+layout.svelte`

Arquivo de app. Concentra:

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `viewOptions` com labelKey e icone | label/icone/layout | `apps/vet-app` | Deve permanecer. |
| `activeView`, `resolveActiveView`, `viewHref` | rota, pathname, href e tab ativa | `apps/vet-app` | `DashboardAnalysisView` deveria virar tipo local `DashboardView`. |
| `clinic.init`, `clinic.refresh`, loading/error/setup | estado de tela/orquestracao | `apps/vet-app` | Deve permanecer. |

### `apps/vet-app/src/routes/dashboard/+page.ts` e `+page.svelte`

`+page.ts` redireciona para `/dashboard/general`; `+page.svelte` mostra fallback/link. Ambos sao app puro por rota/navegacao/layout.

### `apps/vet-app/src/routes/dashboard/vaccines/+page.svelte` e `antiparasitics/+page.svelte`

Wrappers de rota que passam `kind` e `basePath` para `TreatmentAnalyticsPage`. Devem permanecer no app.

### `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte`

Componente misto. Tem muita UI correta no app e algumas regras candidatas a extracao.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `ActiveTab`, `SortOrder`, `TreatmentAnalyticsConfig`, `treatmentAnalyticsConfigs` | estado de tela e rota/basePath | `apps/vet-app` | Deve permanecer. |
| `statusOptionStyles` | cor/classe CSS | `apps/vet-app` | Deve permanecer. |
| `dueFilterMode`, `status`, `periodStartDate`, `periodEndDate`, `period`, `selectedNormalizedName`, tabs e loading flags | estado local de tela | `apps/vet-app` | Deve permanecer. |
| `normalizeStatus`, `normalizeDueFilterMode`, `normalizePeriod`, `normalizeOrder` | normalizacao de query/controle | app ou app-services | A parte de query fica app; regras duplicadas com app-services podem ser centralizadas em 4.3. |
| `statusCount`, `statusPercent`, `statusPercentLabel`, `historyWidth` | percentual/largura para UI | `apps/vet-app` | Manter; nao e regra de dominio. |
| `sortStatusItems`, `sortHistoryPoints` | ordenacao semantica local | `@vet/app-services/analytics` ou helper em `@vet/types` | Candidata a 4.3, especialmente se a lista ja vem do app-service e so muda direcao visual. |
| `updateUrl`, `initialActiveTab` | query params e navegacao | `apps/vet-app` | Deve permanecer. |
| `loadStatusData`, `loadHistoryData`, `loadCatalogData` | orquestracao de tela chamando app-services | `apps/vet-app` | Deve permanecer enquanto estado/loading forem locais. |
| `loadVisiblePetAvatars`, `withOwnerContacts`, `openContactDialog` | hidratacao visual/interacao | `apps/vet-app` com `@vet/modules` | Manter no app, a menos que vire requisito de read model reutilizavel. |
| `petProfileHref`, labels, icones, markup | rota/UI | `apps/vet-app` | Deve permanecer. |

### `apps/vet-app/src/routes/dashboard/pets/+page.svelte`

Pagina de app com UI forte e regras de listagem/buckets que podem ser extraidas.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `PetSortOrder`, `activeAnalysis`, `selectedBucketKey`, sort state, `visiblePets`, loading/chunking | estado visual | `apps/vet-app` | Deve permanecer. |
| `bucketsForAnalysis`, `bucketTotal`, `topBucket` | selecao/derivacao de buckets | `@vet/app-services/analytics` na 4.3 | Pode virar read model derivado para a pagina. |
| `bucketPercent`, `bucketWidth`, `selectedPercent` | calculo para apresentacao | `apps/vet-app` | Percentual textual pode ficar no app; a contagem base pode vir pronta. |
| `bucketUnknownCompare`, `bucketAnalysisBaseCompare`, `sortBuckets` | ordenacao semantica de buckets | `@vet/app-services/analytics` ou `@vet/types` | Usa labels/i18n em alguns casos; separar comparadores semanticos de labels. |
| `petMatchesBucket`, `filterPetsByBucket`, `sortPets` | filtro/ordenacao semantica de lista | `@vet/app-services/analytics` | Candidata direta para 4.3. |
| `speciesLabel`, `breedLabel`, `sexLabel`, `ageBandLabel`, `vaccineStatusLabel`, `bucketLabel` | label traduzida | `apps/vet-app` | Deve permanecer. |
| `petProfileHref`, `PetAvatar`, `loadVisiblePetAvatars` | rota/UI/media visual | `apps/vet-app` | Deve permanecer. |

### `apps/vet-app/src/routes/dashboard/owners/+page.svelte`

Pagina de app com duplicacao de regras ja existentes em app-services.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `OwnerSortOrder`, `OwnerBucket`, estados de sort/filtro/lista/loading | estado de tela | `apps/vet-app` | Deve permanecer. |
| `incrementBucket`, `ensureBucket`, `toBuckets`, `addUnique` | agregacao local | `@vet/app-services/analytics` se reutilizavel | Candidata a helper compartilhado com `clinic-analytics.read-model.ts`. |
| `ownerPetCountBand`, `ownerVaccineStatus`, `ownerPetSpeciesKeys`, `ownerPetAgeKeys` | regra semantica | `@vet/app-services/analytics` ou `@vet/types` | Duplicam logica de analytics; extrair na 4.3. |
| `locationBuckets`, `petCountBuckets`, `petVaccineStatusBuckets`, `petSpeciesBuckets`, `petAgeBuckets` | montagem de buckets para a pagina | `@vet/app-services/analytics` | Candidata a read model derivado de owners. |
| `bucketUnknownCompare`, `bucketAnalysisBaseCompare`, `sortBuckets`, `filterOwnersByBucket`, `sortOwners` | ordenacao/filtro semantico | `@vet/app-services/analytics` | Separar partes com i18n/labels. |
| `speciesLabel`, `ageBandLabel`, `petCountLabel`, `vaccineStatusLabel`, `bucketLabel` | label traduzida | `apps/vet-app` | Deve permanecer. |
| `ownerProfileHref`, avatar helpers, chunking | rota/UI/media visual | `apps/vet-app` | Deve permanecer. |

### `apps/vet-app/src/routes/dashboard/general/+page.svelte`

Maior concentrador de regra local. Mistura configuracao visual do estudo com filtros e cruzamentos semanticos.

| Item | Classificacao | Destino recomendado | Observacoes |
| --- | --- | --- | --- |
| `StudyTarget`, `StudyDimension`, `StudyVisualizationMode`, `StudyPanel`, estados `study*` e `selectedStudyBucket` | estado/controle de tela | dividir | Alvo/dimensao semantica pode ir para package; modo visual/painel fica app. |
| `studyTargetOptions`, `availableStudyDimensions`, `studyDimensionOptions` | opcoes com label/icone e disponibilidade por tela | `apps/vet-app` | Pode usar uma lista semantica vinda de package, mas labels/icones ficam app. |
| `studyVaccineItems`, `studyAntiparasiticItems` | derivacao semantica de tratamentos por pet | `@vet/app-services/analytics` | Candidata a 4.3. |
| `study*Options`, `namedOwnerOptions`, `studyBuckets`, `toDashboardBuckets` | montagem de opcoes/buckets | dividir | Contagem e chaves em app-services; labels em app. |
| `studyPetMatches*`, `ownerMatchesOwnerFilters`, `filterStudy*`, `resolveStudyTarget*`, `countStudyTargetForFactor` | filtro e composicao semantica | `@vet/app-services/analytics` | Candidata principal da fase 4.3. |
| `ownerPetCountBand`, `ownerVaccineStatus`, `ownerAntiparasiticStatus` | regra semantica duplicada | `@vet/types` ou `@vet/app-services/analytics` | Consolidar com owners/read-model. |
| `activePetDimensionLabels`, `ownerPetDimensionLabels`, `vaccineDimensionLabels`, `antiparasiticDimensionLabels`, `ownerDimensionLabels`, `buildStudyVisualizationBuckets` | cruzamento analitico por dimensoes | `@vet/app-services/analytics` com chaves, nao labels | Hoje usa labels traduzidas; extrair como chaves e deixar renderizacao no app. |
| `chartGroupTotal`, `chartBucketPercentLabel`, `maxChartBucketCount`, `topChartBuckets`, `bucketWidth` | calculo visual/grafico | `apps/vet-app` | Manter, exceto `top` se virar requisito semantico. |
| `speciesLabel`, `breedLabel`, `sexLabel`, `ageBandLabel`, status labels, `renderBucketLabel` | label traduzida | `apps/vet-app` | Deve permanecer. |
| `studyPetProfileHref`, `ownerProfileHref`, markup, icones, classes | rota/UI | `apps/vet-app` | Deve permanecer. |

## Mapa De Decisao

| Arquivo | Item | Tipo do item | Destino recomendado | Motivo | Fase sugerida | Observacoes |
| --- | --- | --- | --- | --- | --- | --- |
| `packages/types/src/domain/dashboard/analytics.ts` | Tipos `Dashboard*Analytics`, `Dashboard*Study*`, buckets e status | tipos puros | `@vet/types` | Contratos compartilhados sem UI/banco | 4.2-renomeacao | Renomear para `ClinicAnalytics*`/`Analytics*`. |
| `packages/types/src/domain/dashboard/analytics.ts` | `DashboardAnalysisView`, `dashboardAnalysisViews` | rota/tabs | `apps/vet-app` | Valores sao segmentos da dashboard | 4.2-renomeacao | Nao devem guiar package de dominio. |
| `packages/types/src/domain/dashboard/analytics.ts` | `DashboardStudyTarget`, `dashboardStudyTargets` | alvo semantico + acoplamento a rota | dividir | `general` nao e alvo analitico, outros valores tambem sao rotas | 4.2-renomeacao | Criar alvo semantico independente. |
| `packages/types/src/domain/dashboard/age-bands.ts` | `dashboardAgeBand*` | helper puro | `@vet/types` | Deterministico e sem i18n | 4.2-renomeacao | Trocar prefixo para `clinicAnalytics`. |
| `packages/app-services/src/analytics/clinic-analytics.read-model.ts` | SQL e builders de snapshot | read model/agregacao | `@vet/app-services/analytics` | Compoe owners, pets e tratamentos | sem-acao | Apenas renomear tipos usados. |
| `packages/app-services/src/analytics/treatment-analytics.read-model.ts` | normalizacao de filtros, historico, status items | read model/derivacao | `@vet/app-services/analytics` | Consulta e deriva dados de tratamento | sem-acao | Pode expor comparadores na 4.3. |
| `apps/vet-app/src/routes/dashboard/+layout.svelte` | tabs, hrefs, icones, refresh | rota/UI | `apps/vet-app` | Navegacao e experiencia visual | manter-no-app | Tipo de view deve ser local. |
| `apps/vet-app/src/routes/dashboard/pets/+page.svelte` | filtros/sorts por bucket e lista | derivacao semantica | `@vet/app-services/analytics` | Reutilizavel e testavel sem Svelte | 4.3-extracao | Separar de labels traduzidas. |
| `apps/vet-app/src/routes/dashboard/owners/+page.svelte` | buckets derivados de owners/pets | derivacao semantica | `@vet/app-services/analytics` | Duplica regra do read model | 4.3-extracao | `ownerPetCountBand` deve ser consolidado. |
| `apps/vet-app/src/routes/dashboard/general/+page.svelte` | filtros de estudo e cruzamentos | derivacao semantica | `@vet/app-services/analytics` | E o maior bloco de regra analitica no app | 4.3-extracao | Extrair com chaves, nao labels. |
| `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte` | query params, tabs, basePath, href | rota/estado de tela | `apps/vet-app` | Depende de URL e UI | manter-no-app | Sem extracao. |
| `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte` | sort local de status/historico | ordenacao semantica | `@vet/app-services/analytics` ou `@vet/types` | Pode ser compartilhado/testado | 4.3-extracao | So extrair comparadores, nao labels/URL. |
| `apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte` | percentuais, barras, chunks, avatares, dialog | apresentacao/interacao | `apps/vet-app` | Visual/performance de tela | manter-no-app | Deve permanecer. |

## Vocabulario Alvo

| Nome atual | Nome proposto | Destino | Motivo | Risco |
| --- | --- | --- | --- | --- |
| `DashboardAnalytics` | `ClinicAnalytics` | `@vet/types` | Snapshot analitico da clinica, nao tela | Alto: contrato usado por app-services e app. |
| `DashboardPetAnalytics` | `ClinicPetAnalytics` | `@vet/types` | Agregados de pets | Medio. |
| `DashboardOwnerAnalytics` | `ClinicOwnerAnalytics` | `@vet/types` | Agregados de owners | Medio. |
| `DashboardStudyAnalytics` | `ClinicAnalyticsStudy` | `@vet/types` | Area de estudo analitico | Medio. |
| `DashboardBucket` | `AnalyticsBucket` | `@vet/types` | Bucket generico | Baixo. |
| `DashboardNamedBucket` | `AnalyticsNamedBucket` | `@vet/types` | Bucket generico com label opcional | Baixo. |
| `DashboardPetStudyItem` | `ClinicAnalyticsPetStudyItem` | `@vet/types` | Item de estudo analitico | Medio. |
| `DashboardOwnerStudyItem` | `ClinicAnalyticsOwnerStudyItem` | `@vet/types` | Item de estudo analitico | Medio. |
| `DashboardPetStudyOwner` | `ClinicAnalyticsPetOwnerSnapshot` | `@vet/types` | Owner dentro do estudo de pet | Medio. |
| `DashboardOwnerStudyPet` | `ClinicAnalyticsOwnerPetSnapshot` | `@vet/types` | Pet dentro do estudo de owner | Medio. |
| `DashboardPetStudyTreatment` | `ClinicAnalyticsPetTreatmentSnapshot` | `@vet/types` | Tratamento dentro do estudo | Medio. |
| `DashboardSpeciesKey` | `ClinicAnalyticsSpeciesKey` | `@vet/types` | Chave de bucket | Baixo. |
| `DashboardBreedKey` | `ClinicAnalyticsBreedKey` | `@vet/types` | Chave de bucket | Baixo. |
| `DashboardSexKey` | `ClinicAnalyticsSexKey` | `@vet/types` | Chave de bucket | Baixo. |
| `DashboardAgeBandKey` | `ClinicAnalyticsAgeBandKey` | `@vet/types` | Chave de bucket | Medio por testes. |
| `DashboardPetCountBandKey` | `ClinicAnalyticsPetCountBandKey` | `@vet/types` | Chave de bucket | Baixo. |
| `DashboardTreatmentStatusKey` | `ClinicAnalyticsTreatmentStatusKey` | `@vet/types` | Status agregado com `untracked` | Medio. |
| `DashboardVaccineStatusKey` | `ClinicAnalyticsVaccineStatusKey` | `@vet/types` | Alias semantico | Baixo. |
| `DashboardAntiparasiticStatusKey` | `ClinicAnalyticsAntiparasiticStatusKey` | `@vet/types` | Alias semantico | Baixo. |
| `DashboardAnalysisView` | `DashboardView` | `apps/vet-app` | View de rota/tela | Medio: layout e redirects. |
| `dashboardAnalysisViews` | `dashboardViews` | `apps/vet-app` | Lista de tabs/rotas | Medio. |
| `DashboardStudyTarget` | `ClinicAnalyticsStudyTarget` | `@vet/types` ou `@vet/app-services/analytics` | Alvo semantico de estudo | Alto: hoje reaproveita nomes de rotas. |
| `dashboardStudyTargets` | `clinicAnalyticsStudyTargets` | `@vet/types` ou `@vet/app-services/analytics` | Constante semantica | Medio. |
| `DashboardPetAnalysisKind` | `ClinicAnalyticsPetDimension` | `@vet/types` | Dimensao de analise | Medio. |
| `DashboardOwnerAnalysisKind` | `ClinicAnalyticsOwnerDimension` | `@vet/types` | Dimensao de analise | Medio. |
| `DashboardBucketSortField` | `AnalyticsBucketSortField` | `@vet/types` ou app | Ordenacao de bucket | Baixo se mantiver alias temporario. |
| `DashboardSortDirection` | `AnalyticsSortDirection` | `@vet/types` ou app | Ordenacao generica | Baixo. |
| `dashboardTreatmentStatusWeight` | `clinicAnalyticsTreatmentStatusWeight` | `@vet/types` | Peso semantico de status | Medio. |
| `dashboardPetCountBandWeight` | `clinicAnalyticsPetCountBandWeight` | `@vet/types` | Peso semantico de faixa de pets | Medio. |
| `dashboardAgeBand` | `clinicAnalyticsAgeBand` | `@vet/types` | Helper puro | Medio por import amplo. |
| `dashboardAgeBandYear` | `clinicAnalyticsAgeBandYear` | `@vet/types` | Helper puro | Medio por uso em labels. |
| `dashboardAgeBandSortValue` | `clinicAnalyticsAgeBandSortValue` | `@vet/types` | Helper de ordenacao | Medio. |
| `dashboardAgeMonthBandKeys` | `clinicAnalyticsAgeMonthBandKeys` | `@vet/types` | Constante pura | Baixo. |
| `getDashboardAnalytics` | `getClinicAnalytics` | `@vet/app-services/analytics` | Read model de analytics, nao rota | Medio. |
| `ClinicDashboard` | `ClinicDashboardSnapshot` ou remover alias | `apps/vet-app` | Alias local para consumo de tela | Baixo. |

## Itens Para Fase 4.2: Renomeacao Semantica

1. Criar nomes `ClinicAnalytics*` e `Analytics*` em `@vet/types`, preservando aliases antigos temporarios se necessario para reduzir risco.
2. Renomear `dashboardAgeBand*`, `dashboardTreatmentStatusWeight` e `dashboardPetCountBandWeight` para `clinicAnalytics*`.
3. Separar `DashboardAnalysisView` e `dashboardAnalysisViews` como tipos/constantes locais do app, porque representam tabs e rotas de `/dashboard`.
4. Renomear `DashboardStudyTarget` para um alvo semantico independente de rota.
5. Renomear `getDashboardAnalytics` para `getClinicAnalytics` e ajustar `loadClinicAnalyticsOverview`.
6. Atualizar `packages/types/src/clinic-analytics.ts` para exportar os novos nomes e, durante transicao, aliases antigos se a mudanca ficar grande.
7. Atualizar testes de age bands para o novo vocabulario.

## Itens Para Fase 4.3: Extracao De Regras Para App-services

1. Extrair regras semanticas duplicadas:
   - `ownerPetCountBand`;
   - `ownerVaccineStatus`;
   - `ownerAntiparasiticStatus`;
   - conversao de `Map` para buckets ordenados;
   - comparadores por status, idade e quantidade de pets.
2. Em `dashboard/pets`, mover para app-services:
   - `bucketsForAnalysis`;
   - `sortBuckets`;
   - `filterPetsByBucket`;
   - `sortPets`.
3. Em `dashboard/owners`, mover para app-services:
   - `petSpeciesBuckets`;
   - `petAgeBuckets`;
   - `filterOwnersByBucket`;
   - `sortOwners`.
4. Em `dashboard/general`, mover para app-services:
   - flatten de vacinas/antiparasitarios por pet;
   - filtros combinados de pets, owners, vacinas e antiparasitarios;
   - resolucao de alvo do estudo;
   - buckets cruzados por dimensao, usando chaves semanticas em vez de labels traduzidas.
5. Em `TreatmentAnalyticsPage`, avaliar extrair comparadores/normalizadores duplicados, mas manter query params e estado visual no app.
6. Criar testes focados para regras extraidas, preferencialmente em `packages` com Vitest.

## Itens Que Devem Permanecer No App

Devem continuar em `apps/vet-app`:

- rotas `/dashboard/*`, redirects e `href`;
- `basePath` de vacinas/antiparasitarios;
- query params, `URLSearchParams`, `window.history.replaceState` e tab ativa;
- labels traduzidas com `t(...)` e formatacao por `i18n.locale`;
- icones Lucide, classes Tailwind, cards, tabelas, graficos, barras e largura visual;
- `statusOptionStyles`, cores e classes de status;
- estados `$state`, `$derived` voltados a interacao visual;
- carregamento em chunks e `requestAnimationFrame`;
- hidratacao visual de avatares;
- dialog de contato do owner;
- links para perfis de pets e owners;
- textos como `speciesLabel`, `breedLabel`, `ageBandLabel`, `vaccineStatusLabel`, quando retornam label traduzida.

## Riscos E Ordem Recomendada

1. Comecar por renomeacao com aliases temporarios em `@vet/types`. Isso reduz o risco de quebrar app-services e paginas grandes ao mesmo tempo.
2. Separar primeiro o que e rota: `DashboardAnalysisView` deve virar app-local antes de renomear todo o restante, porque ele mistura vocabulario de dashboard com analytics.
3. Renomear helpers puros de idade e pesos de status logo depois, mantendo testes de age bands como rede de seguranca.
4. Renomear contratos grandes (`DashboardAnalytics`, `DashboardStudyAnalytics`, itens de estudo) em uma mudanca mecanica e com `npm run check` logo em seguida.
5. Na fase 4.3, extrair uma pagina por vez. A ordem mais segura e:
   - `dashboard/pets`, por ser menor;
   - `dashboard/owners`, por duplicar regras de owner/pet;
   - `TreatmentAnalyticsPage`, apenas comparadores/normalizadores;
   - `dashboard/general`, por ser a mais ampla e com mais risco.
6. Em toda extracao de regra, retornar chaves semanticas e counts pelo app-service. Labels, cores, icones, hrefs e formato visual continuam no app.
7. Evitar mover funcoes que chamam `t(...)`, acessam `window`, montam `href`, manipulam `$state` ou dependem de componentes Svelte.
8. Validar cada fatia com `npm run check` e `npm run test:run`; para regras extraidas, adicionar testes antes de mexer na UI seguinte.
