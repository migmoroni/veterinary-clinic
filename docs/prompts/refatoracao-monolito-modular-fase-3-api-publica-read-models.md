# Prompt Para Fase 3 Da Refatoração Modular

Refatore os ajustes finais de fronteira depois da fase 2 do monolito modular.

Esta fase parte do workspace atual:

```text
apps/vet-app/
packages/types/
packages/ui/
packages/core-local/
packages/engine/
packages/modules/
```

Não redesenhe produto, tela, schema SQLite, fluxo clínico, banco de dados,
import/export, empacotamento ou regra de negócio. O objetivo é resolver os três
pontos arquiteturais remanescentes:

1. declarar corretamente a dependência real de `@vet/ui` em `@vet/core-local`;
2. reduzir a API pública dos módulos, removendo repositories da superfície pública;
3. organizar read models SQL do `vet-app` para que o app componha módulos sem virar
   um mini-monolito de persistência.

## Regra Geral

Mantenha o DAG da fase 2:

```text
@vet/types
  ↓
@vet/core-local
  ↓
@vet/ui
  ↓
@vet/modules
  ↓
apps/vet-app
```

Um item mais abaixo pode importar itens acima. Um item acima não pode importar
itens abaixo.

Para Rust:

```text
packages/engine
  ↓
apps/vet-app/src-tauri
```

## Objetivo 1: Corrigir Dependência De `@vet/ui`

`packages/ui/src` usa i18n de `@vet/core-local`.

Formalize isso no manifest:

```json
{
  "dependencies": {
    "@vet/core-local": "file:../core-local",
    "@vet/types": "file:../types"
  }
}
```

Depois valide:

```sh
npm ls @vet/core-local --workspace packages/ui
```

Resultado esperado: `@vet/core-local` aparece como dependência de
`packages/ui`.

Não remova i18n dos componentes de UI nesta fase. A decisão desta fase é assumir
que `@vet/ui` pode consumir `@vet/core-local` para i18n comum, conforme definido
na fase 2.

## Objetivo 2: Estreitar API Pública Dos Módulos

`packages/modules/package.json` já deve manter exports explícitos. Preserve isso.

Agora reduza o conteúdo reexportado pelos `index.ts` públicos.

Regra:

- repositories são detalhe interno do módulo;
- o app não deve consumir repositories diretamente;
- outros módulos não devem consumir repositories de módulo irmão;
- APIs públicas devem expor components, services, queries ou use cases com nome
  de domínio;
- services internos podem importar repositories por caminho relativo dentro do
  próprio módulo.

### Ajuste Dos `index.ts`

Revise estes arquivos:

```text
packages/modules/src/knowledge/index.ts
packages/modules/src/knowledge/*/index.ts
packages/modules/src/registry/index.ts
packages/modules/src/registry/owners/index.ts
packages/modules/src/registry/pets/index.ts
packages/modules/src/medical_records/index.ts
packages/modules/src/medical_records/records/index.ts
packages/modules/src/medical_records/treatments/index.ts
packages/modules/src/medical_records/treatment_protocols/index.ts
packages/modules/src/medical_records/treatment_analytics/index.ts
```

Remova exports públicos como:

```ts
export * from './repositories/...';
export * from '../repositories/...';
```

Antes de remover, confira quem consome cada símbolo.

Quando o app estiver usando uma função de repository, crie ou mova uma função
equivalente para o service público do subdomínio.

Exemplos de direção:

```ts
// interno do módulo
packages/modules/src/registry/repositories/owner.repository.ts

// API pública do módulo
packages/modules/src/registry/services/owner.service.ts
packages/modules/src/registry/owners/index.ts
```

```ts
// interno do módulo
packages/modules/src/medical_records/repositories/medical-record.repository.ts

// API pública do módulo
packages/modules/src/medical_records/services/record.service.ts
packages/modules/src/medical_records/records/index.ts
```

Não altere comportamento. Quando a mudança for apenas de fronteira, o service
pode delegar para o repository com a mesma validação e o mesmo retorno.

### Regra Para Nomes

Use nomes de domínio, não nomes técnicos de persistência.

Preferir:

```ts
loadOwnerProfile
listOwnersByPet
loadPetById
listRecordsByPet
loadTreatmentCatalogItems
listTreatmentStatusItems
```

Evitar na API pública:

```ts
select...
execute...
...Repository
...Row
map...Row
```

Tipos de row, SQL helpers e mappers de row continuam internos.

## Objetivo 3: Organizar Read Models SQL Do `vet-app`

`apps/vet-app` pode compor módulos. Isso continua correto.

O que precisa ser evitado é o app virar uma segunda camada de persistência
genérica.

Classifique os arquivos atuais de composição e leitura:

```text
apps/vet-app/src/lib/services/clinic.service.ts
apps/vet-app/src/lib/services/pet-profile.service.ts
apps/vet-app/src/lib/services/record-aggregate.service.ts
apps/vet-app/src/lib/repositories/search.repository.ts
apps/vet-app/src/lib/repositories/stats.repository.ts
```

Use estas regras:

- composição que apenas junta APIs públicas de módulos pode ficar em
  `apps/vet-app/src/lib/services`;
- SQL que pertence claramente a um único domínio deve voltar para o módulo dono
  como service/query público;
- SQL que cruza domínios e existe para uma tela, dashboard ou busca global do
  app pode ficar no `vet-app`, mas deve morar em `apps/vet-app/src/lib/read-models`;
- read models do app são somente leitura;
- read models do app não fazem writes, imports, deletes, mutations ou efeitos
  colaterais;
- read models do app não devem ser reexportados por packages;
- read models do app devem ter nomes ligados ao fluxo do app, como
  `search.read-model.ts`, `dashboard.read-model.ts` ou
  `current-record.read-model.ts`.

Depois da classificação, remova ou esvazie `apps/vet-app/src/lib/repositories`
se ele só existir para esses read models.

### O Que Não Fazer

Não mova uma query cross-module para `registry`, `knowledge` ou
`medical_records` apenas para tirar SQL do app. Isso recria acoplamento escondido.

Não crie um módulo top-level novo para analytics, dashboard, search ou app-shell
nesta fase.

Não crie abstração genérica de repository para todos os módulos.

Não coloque repositories em `@vet/types`.

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

Registre falhas existentes antes de alterar fronteiras.

### Atividade 2: Corrigir Manifest De `@vet/ui`

Atualize `packages/ui/package.json`.

Valide:

```sh
npm ls @vet/core-local --workspace packages/ui
npm run check
npm run test:run
```

### Atividade 3: Mapear Uso Público De Repositories

Rode:

```sh
rg -n "export \\* from ['\\\"].*repositories" packages/modules/src
rg -n "@vet/modules/.*/repositories" apps/vet-app/src packages
rg -n "from ['\\\"]@vet/modules" apps/vet-app/src
```

Para cada função de repository consumida pelo app, crie uma API pública em service
ou query do subdomínio correspondente.

### Atividade 4: Remover Reexports De Repositories

Remova reexports de repositories nos `index.ts` públicos.

Atualize imports do app para consumir services ou queries públicas.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 5: Classificar Read Models Do App

Crie `apps/vet-app/src/lib/read-models` para SQL read-only que cruza módulos e é
específico do app.

Mova arquivos de leitura cross-module para essa pasta.

Mova queries de domínio único para o módulo dono, expondo apenas service/query
público.

Valide:

```sh
npm run check
npm run test:run
```

### Atividade 6: Revisão Final

Rode buscas de garantia:

```sh
rg -n "\\$lib" packages
rg -n "@vet/(core-local|ui|modules)" packages/types/src
rg -n "@vet/(ui|modules)" packages/core-local/src
rg -n "@vet/modules" packages/ui/src
rg -n "@vet/modules/" packages/modules/src
rg -n "@vet/modules/.*/repositories" apps/vet-app/src
rg -n "export \\* from ['\\\"].*repositories" packages/modules/src
rg -n "execute\\(|selectMany\\(|selectOne\\(" apps/vet-app/src/lib
```

Para a última busca, avalie manualmente:

- SQL em `apps/vet-app/src/lib/read-models` é aceitável quando for read-only e
  cross-module;
- SQL em `apps/vet-app/src/lib/services` deve ser movido ou justificado como
  composição específica do app.

Checks finais:

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
git diff --check
```

## Critério De Conclusão

A fase 3 está pronta quando:

- `packages/ui/package.json` declara `@vet/core-local`;
- `npm ls @vet/core-local --workspace packages/ui` mostra a dependência;
- `@vet/modules` não expõe repositories por `index.ts` público;
- `apps/vet-app` não importa repositories de `@vet/modules`;
- repositories permanecem internos aos módulos;
- services públicos preservam o comportamento atual;
- read models SQL cross-module do app ficam em
  `apps/vet-app/src/lib/read-models`;
- read models do app são somente leitura;
- composição entre módulos continua no `apps/vet-app`;
- `treatments` continua dentro de `medical_records`;
- todos os checks finais passam.
