# Prompt Para Fase 4 Da Refatoração Modular

Refatore a camada compartilhada de bibliotecas para criar `@vet/app-services`,
um package TypeScript de serviços de aplicação reutilizáveis entre apps.

Esta fase move apenas duas áreas:

```text
analytics
search
```

O código de UI, rotas, stores visuais e navegação continua no app. A atuação em
`apps/vet-app` é adaptar imports, chamadas e pequenas fachadas necessárias para
consumir as novas APIs públicas.

## Estado Atual Do Workspace

```text
apps/vet-app/
packages/types/
packages/core-local/
packages/ui/
packages/modules/
packages/core-rust/
```

Crie:

```text
packages/app-services/
```

## Objetivo

Criar uma camada acima dos módulos de negócio para composições reutilizáveis por
mais de um app.

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

`@vet/app-services` pode compor APIs públicas de `@vet/modules` e usar
infraestrutura local de `@vet/core-local` quando necessário.

Regra de decisão:

- contratos, tipos e helpers puros ficam em `@vet/types`;
- infraestrutura local, SQLite client, media, storage, i18n e preferências ficam
  em `@vet/core-local`;
- regra natural de um domínio fica no módulo dono em `@vet/modules`;
- composição reutilizável entre módulos, read models transversais e serviços de
  aplicação reaproveitáveis ficam em `@vet/app-services`;
- rotas, telas, stores visuais, navegação e ciclo de vida específico ficam em
  `apps/*`.

`@vet/app-services` deve conter somente TypeScript de aplicação. Ele não contém
componentes Svelte e não importa `@vet/ui`.

## Estrutura Esperada

```text
packages/app-services/
  package.json
  tsconfig.json
  src/
    index.ts
    analytics/
      index.ts
      clinic-analytics.service.ts
      clinic-counts.read-model.ts
      clinic-analytics.read-model.ts
      treatment-analytics.service.ts
      treatment-analytics.read-model.ts
    search/
      index.ts
      search.service.ts
      search.read-model.ts
```

Se algum nome ficar claramente melhor depois de ler o código, ajuste mantendo a
mesma intenção:

- `analytics`: indicadores, contadores, séries, status, vencimentos e análises
  agregadas;
- `search`: base reutilizável de procura, busca global, scoring, ranking e
  filtro de resultados ativos.

## Package `@vet/app-services`

Crie `packages/app-services/package.json` com exports explícitos:

```json
{
  "name": "@vet/app-services",
  "private": true,
  "version": "0.2.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./analytics": "./src/analytics/index.ts",
    "./search": "./src/search/index.ts"
  },
  "dependencies": {
    "@vet/core-local": "file:../core-local",
    "@vet/modules": "file:../modules",
    "@vet/types": "file:../types"
  }
}
```

Use apenas exports explícitos em `@vet/app-services`.

Crie `packages/app-services/tsconfig.json` seguindo o padrão dos packages atuais:

```json
{
  "extends": "../../apps/vet-app/tsconfig.json",
  "compilerOptions": {
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

O root `package.json` já usa `packages/*` em `workspaces`, então
`packages/app-services` já fica coberto pelo workspace.

Atualize `apps/vet-app/package.json` para declarar:

```json
{
  "dependencies": {
    "@vet/app-services": "file:../../packages/app-services"
  }
}
```

Atualize `package-lock.json` com:

```sh
npm install --package-lock-only
```

## Analytics

Mova a lógica reutilizável de análise de dados para:

```text
packages/app-services/src/analytics/
```

Arquivos atuais a considerar:

```text
apps/vet-app/src/lib/read-models/dashboard.read-model.ts
apps/vet-app/src/lib/services/clinic.service.ts
apps/vet-app/src/lib/components/treatment/TreatmentAnalyticsPage.svelte
packages/modules/src/medical_records/services/dashboard-analytics.service.ts
packages/modules/src/medical_records/repositories/dashboard-analytics.repository.ts
packages/modules/src/medical_records/services/treatment-analytics.service.ts
packages/modules/src/medical_records/repositories/treatment-analytics.repository.ts
packages/modules/src/medical_records/treatment_analytics/index.ts
```

Direção esperada:

- `clinic-counts.read-model.ts` recebe os contadores read-only que hoje estão em
  `apps/vet-app/src/lib/read-models/dashboard.read-model.ts`;
- `clinic-analytics.read-model.ts` recebe a leitura analítica que hoje está em
  `dashboard-analytics.repository.ts`;
- `treatment-analytics.read-model.ts` recebe a leitura analítica que hoje está em
  `treatment-analytics.repository.ts`;
- `clinic-analytics.service.ts` expõe a composição analítica da visão geral;
- `treatment-analytics.service.ts` expõe as composições analíticas de
  tratamentos;
- `analytics/index.ts` expõe a API pública de analytics.

Use estes nomes públicos esperados em `@vet/app-services/analytics`:

```ts
loadClinicAnalyticsOverview
loadTreatmentAnalyticsOverview
loadTreatmentStatusItems
loadTreatmentHistory
loadAnalyticsTreatments
```

Use estes tipos públicos esperados em `@vet/app-services/analytics`:

```ts
ClinicAnalyticsOverview
ClinicTreatmentAnalytics
```

`ClinicAnalyticsOverview` deve preservar a forma de dados que alimenta a visão
analítica atual do app:

```text
counts
vaccines
antiparasitics
analytics
```

`loadDashboard` continua sendo uma fachada do `vet-app`, quando ainda for útil
para o store da aplicação. A composição analítica deve ser delegada para
`loadClinicAnalyticsOverview`.

`TreatmentAnalyticsPage.svelte` deve consumir analytics por:

```ts
@vet/app-services/analytics
```

Depois da migração, remova de `@vet/modules` os exports e arquivos
exclusivamente analíticos:

```text
packages/modules/src/medical_records/repositories/dashboard-analytics.repository.ts
packages/modules/src/medical_records/repositories/treatment-analytics.repository.ts
packages/modules/src/medical_records/services/dashboard-analytics.service.ts
packages/modules/src/medical_records/services/treatment-analytics.service.ts
packages/modules/src/medical_records/treatment_analytics/index.ts
```

Atualize `packages/modules/package.json` removendo o subpath:

```text
./medical_records/treatment_analytics
```

Ao final, analytics deve existir em um único lugar:

```text
@vet/app-services/analytics
```

As APIs operacionais de `medical_records` continuam nos subpaths públicos já
existentes de `@vet/modules/medical_records`.

SQL em `analytics` é permitido apenas em read models read-only.

## Search

Mova a lógica reutilizável de procura para:

```text
packages/app-services/src/search/
```

Arquivos atuais a mover ou dividir:

```text
apps/vet-app/src/lib/read-models/search.read-model.ts
apps/vet-app/src/lib/services/clinic.service.ts
```

A rota de busca continua como tela do app. Extraia dela apenas lógica
reutilizável de aplicação, caso exista.

Direção esperada:

- `search.read-model.ts` fica em `@vet/app-services/search` como read model
  read-only;
- `searchEverywhere` e `filterActiveSearchResults` ficam em
  `search.service.ts`;
- normalização, termos de busca, scoring, ranking, filtros de resultados ativos
  e helpers reutilizáveis de procura ficam em `search.service.ts` ou arquivos
  privados dentro de `search/`;
- `search` serve como base para lógica de procura reutilizável de aplicação, não
  apenas para a rota global `/search`;
- buscas internas que pertencem naturalmente a um domínio continuam no módulo
  dono.

`@vet/app-services/search` pode compor APIs públicas de:

```text
@vet/modules/knowledge
@vet/modules/knowledge/breeds
@vet/modules/knowledge/products
@vet/modules/registry/owners
@vet/modules/registry/pets
@vet/types
@vet/core-local
```

O app deve consumir a busca por:

```ts
import { searchEverywhere, filterActiveSearchResults } from '@vet/app-services/search';
```

Imports diretos de APIs públicas de domínio continuam sendo feitos pelo módulo
dono quando a tela precisar deles:

```ts
import { listOwnerAssociatedContactsByOwnerIds } from '@vet/modules/registry/owners';
import { loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds } from '@vet/modules/registry';
```

## Fronteiras

Garanta estas fronteiras:

- `@vet/app-services` importa `@vet/modules` apenas por subpaths públicos;
- `@vet/app-services` usa caminhos `@vet/...`, nunca `$lib`;
- packages abaixo de `@vet/app-services` no DAG não importam `@vet/app-services`;
- read models em `@vet/app-services` são somente leitura;
- writes continuam nas camadas donas da operação;
- `packages/modules` permanece com módulos de negócio.

## Sequência De Atividades

### Atividade 1: Baseline

Rode:

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
git status --short
```

Registre falhas existentes antes de alterar arquivos.

### Atividade 2: Criar `@vet/app-services`

Crie:

```text
packages/app-services/package.json
packages/app-services/tsconfig.json
packages/app-services/src/index.ts
packages/app-services/src/analytics/index.ts
packages/app-services/src/search/index.ts
```

Configure exports explícitos para:

```text
.
./analytics
./search
```

Atualize `apps/vet-app/package.json` e `package-lock.json`.

Valide:

```sh
npm ls @vet/app-services --workspace apps/vet-app
npm run check
```

### Atividade 3: Extrair Analytics

Mova read models e services analíticos para
`packages/app-services/src/analytics`.

Atualize imports do app para:

```ts
@vet/app-services/analytics
```

Remova de `@vet/modules` os exports públicos exclusivamente analíticos.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 4: Extrair Search

Mova read model e serviços reutilizáveis de procura para
`packages/app-services/src/search`.

Atualize imports do app para:

```ts
@vet/app-services/search
```

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Limpeza De Imports E Fronteiras

Rode:

```sh
rg -n "\\$lib" packages/app-services packages/modules packages/ui packages/core-local packages/types
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
rg -n "@vet/modules/.*/repositories" packages/app-services/src apps/vet-app/src
rg -n "@vet/modules/medical_records/treatment_analytics|loadDashboardAnalytics" apps/vet-app/src packages/app-services/src packages/modules/src
find packages/modules/src -maxdepth 1 -type d \( -name dashboard -o -name analytics -o -name search \) -print
rg -n "from ['\\\"]apps/vet-app|from ['\\\"].*apps/vet-app" packages/app-services/src packages
rg -n "execute|insert|update|delete|softDelete|save|create" packages/app-services/src
```

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

A fase 4 está pronta quando:

- `packages/app-services` existe como package `@vet/app-services`;
- `@vet/app-services` expõe apenas `.`, `./analytics` e `./search`;
- `apps/vet-app` declara `@vet/app-services`;
- analytics vive em `@vet/app-services/analytics`;
- search vive em `@vet/app-services/search`;
- `apps/vet-app` consome analytics e search pelas APIs públicas de
  `@vet/app-services`;
- `@vet/modules` não mantém exports ou cópias dos serviços exclusivamente
  analíticos movidos nesta fase;
- `@vet/modules` não expõe subpath público
  `./medical_records/treatment_analytics`;
- `@vet/app-services` respeita o DAG e não importa app, `$lib`, `@vet/ui` ou
  repositories internos de `@vet/modules`;
- read models de `@vet/app-services` são somente leitura;
- todos os checks finais passam.
