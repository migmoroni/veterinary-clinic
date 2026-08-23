# Prompt Para Fase 4.2-pre Da Refatoração Modular

Faça uma auditoria arquitetural da área de analytics antes das próximas fases de
renomeação semântica e extração de regras para packages.

Esta pré-fase não deve alterar código de produção. O objetivo é criar um mapa de
decisão claro, baseado no estado atual do projeto, indicando o que deve ficar no
app e o que deve ir para packages seguindo o DAG.

## Objetivo

Mapear o que hoje está relacionado a analytics, especialmente nas rotas de
dashboard do `vet-app`, e classificar cada item no destino correto:

```text
@vet/types
@vet/core-local
@vet/modules
@vet/app-services/analytics
apps/vet-app
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

## Escopo Da Auditoria

Analise estes arquivos e diretórios:

```text
packages/types/src/domain/dashboard/
packages/types/src/clinic-analytics.ts
packages/app-services/src/analytics/
apps/vet-app/src/routes/dashboard/
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
```

Use também buscas por termos:

```sh
rg -n "Dashboard|dashboard|Analytics|analytics|bucket|Bucket|study|Study|statusWeight|AgeBand|sort|filter|group|reduce|map\\(" packages/types/src packages/app-services/src apps/vet-app/src/routes/dashboard apps/vet-app/src/lib/components/treatment
```

## Classificação Esperada

Classifique cada item encontrado com esta regra:

```text
Tipo puro de analytics
  -> @vet/types

Constante pura de analytics
  -> @vet/types

Helper determinístico puro, sem i18n, rota, UI ou banco
  -> @vet/types

Read model, SQL, consulta e agregação de dados
  -> @vet/app-services/analytics

Filtro, ordenação, agrupamento ou derivação semântica de analytics
  -> @vet/app-services/analytics

Composição transversal entre dados de vários domínios
  -> @vet/app-services/analytics

Regra operacional natural de um domínio
  -> @vet/modules

Infraestrutura local, storage, SQLite client, media ou preferências
  -> @vet/core-local

Rota, link, href, query params, estado de tela, tab ativa e navegação
  -> apps/vet-app

Label traduzida, cor, ícone, classe CSS, layout, card, gráfico e interação visual
  -> apps/vet-app
```

## Vocabulário Alvo

Avalie nomes que ainda usam `Dashboard*` para dados ou regras de analytics.

Use esta direção semântica:

```text
dashboard
  rota, tela, layout e experiência visual do app

analytics
  dados, métricas, agregações, séries, buckets, status e estudos
```

Proponha renomes, sem aplicar ainda, usando uma tabela:

```text
Nome atual
Nome proposto
Destino
Motivo
Risco
```

Exemplos de direção:

```text
DashboardAnalytics -> ClinicAnalytics
DashboardBucket -> AnalyticsBucket
DashboardNamedBucket -> AnalyticsNamedBucket
DashboardStudyAnalytics -> ClinicAnalyticsStudy
DashboardPetStudyItem -> ClinicAnalyticsPetStudyItem
DashboardOwnerStudyItem -> ClinicAnalyticsOwnerStudyItem
DashboardAnalysisView -> AnalyticsView ou DashboardView, conforme o uso real
DashboardStudyTarget -> ClinicAnalyticsStudyTarget
dashboardTreatmentStatusWeight -> clinicAnalyticsTreatmentStatusWeight
dashboardPetCountBandWeight -> clinicAnalyticsPetCountBandWeight
dashboardAgeBand -> clinicAnalyticsAgeBand
dashboardAgeBandYear -> clinicAnalyticsAgeBandYear
dashboardAgeBandSortValue -> clinicAnalyticsAgeBandSortValue
dashboardAgeMonthBandKeys -> clinicAnalyticsAgeMonthBandKeys
```

Quando um nome estiver ligado diretamente à rota ou aba visual da dashboard,
marque como item de app. Quando estiver ligado a dado calculado ou regra de
análise, marque como item de analytics.

## Pontos Que Devem Ser Investigados

Mapeie especialmente:

```text
apps/vet-app/src/routes/dashboard/+layout.svelte
apps/vet-app/src/routes/dashboard/general/+page.svelte
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
packages/app-services/src/analytics/clinic-analytics.read-model.ts
packages/app-services/src/analytics/clinic-analytics.service.ts
packages/app-services/src/analytics/treatment-analytics.read-model.ts
packages/app-services/src/analytics/treatment-analytics.service.ts
packages/types/src/domain/dashboard/analytics.ts
packages/types/src/domain/dashboard/age-bands.ts
```

Para cada arquivo, identifique:

```text
imports de tipos/helpers de analytics
funções locais de filtro
funções locais de ordenação
funções locais de agrupamento
funções locais de cálculo de percentual/largura/total
funções locais que combinam owners, pets, vacinas ou antiparasitários
funções locais que são apenas label, cor, ícone, href ou layout
estado local de tela
query params e navegação
```

## Produto Final

Crie um documento em:

```text
docs/plans/analytics-boundary-audit.md
```

O documento deve ter esta estrutura:

```text
# Auditoria De Fronteira De Analytics

## Resumo

## Inventário Por Arquivo

## Mapa De Decisão

## Vocabulário Alvo

## Itens Para Fase 4.2: Renomeação Semântica

## Itens Para Fase 4.3: Extração De Regras Para App-services

## Itens Que Devem Permanecer No App

## Riscos E Ordem Recomendada
```

## Regras Da Pré-fase

Faça apenas leitura e documentação.

Alterações permitidas:

```text
criar docs/plans/analytics-boundary-audit.md
```

Não altere arquivos de código, package.json, lockfile, testes ou prompts nesta
pré-fase.

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
git status --short
npm run check
npm run test:run
```

Registre falhas existentes no documento final, se houver.

### Atividade 2: Inventariar Tipos E Helpers

Analise:

```text
packages/types/src/domain/dashboard/analytics.ts
packages/types/src/domain/dashboard/age-bands.ts
packages/types/src/clinic-analytics.ts
packages/app-services/src/analytics/
```

Liste tipos, constantes e helpers que ainda usam vocabulário `Dashboard`.

### Atividade 3: Inventariar Rotas De Dashboard

Analise:

```text
apps/vet-app/src/routes/dashboard/
```

Separe o que é regra analítica do que é decisão visual da rota.

### Atividade 4: Inventariar Analytics De Tratamentos

Analise:

```text
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
packages/app-services/src/analytics/treatment-analytics.read-model.ts
packages/app-services/src/analytics/treatment-analytics.service.ts
```

Separe filtros e ordenações semânticas de escolhas visuais da página.

### Atividade 5: Montar Mapa De Decisão

Para cada item relevante, preencha uma tabela:

```text
Arquivo
Item
Tipo do item
Destino recomendado
Motivo
Fase sugerida
Observações
```

Use fases sugeridas:

```text
4.2-renomeacao
4.3-extracao
manter-no-app
sem-acao
```

### Atividade 6: Checks Finais

Rode:

```sh
npm run check
npm run test:run
git diff --check
git status --short
```

## Critério De Conclusão

A pré-fase está pronta quando:

- `docs/plans/analytics-boundary-audit.md` existe;
- o documento classifica os itens por arquivo;
- o documento separa claramente `@vet/types`, `@vet/app-services/analytics` e
  `apps/vet-app`;
- o documento propõe vocabulário alvo para substituir nomes `Dashboard*` que
  representam dados ou regras de analytics;
- o documento lista o que fica no app por ser rota, UI, navegação, label, cor,
  ícone, layout ou estado visual;
- o documento indica uma ordem recomendada para fases 4.2 e 4.3;
- nenhum arquivo de código foi alterado;
- os checks finais foram registrados.
