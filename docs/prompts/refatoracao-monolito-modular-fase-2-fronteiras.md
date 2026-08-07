# Prompt Para Fase 2 Da Refatoração Modular

Refatore a arquitetura modular atual para endurecer fronteiras entre packages e
módulos de negócio.

Esta fase parte do workspace já existente:

```text
apps/vet-app/
packages/types/
packages/ui/
packages/core-local/
packages/engine/
packages/modules/
```

Não redesenhe produto, tela, schema SQLite, fluxo clínico, banco de dados,
import/export ou regras de negócio. O objetivo é fazer a arquitetura atual ficar
mais consistente, previsível e resistente a dependências cíclicas.

## Objetivo

Transformar a organização modular atual em um DAG claro de dependências.

Use esta regra:

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

O diagrama mostra direção permitida de consumo. Um item mais abaixo na lista pode
importar itens acima dele. Um item acima não pode importar itens abaixo dele.

Para Rust:

```text
packages/engine
  ↓
apps/vet-app/src-tauri
```

`packages/engine` não conhece apps. `apps/vet-app/src-tauri` registra comandos
Tauri e chama o crate compartilhado.

## Regras De Dependência

### `@vet/types`

`@vet/types` é a base de contratos puros.

Pode conter:

- tipos;
- constantes puras;
- validadores puros;
- helpers determinísticos sem runtime de app;
- contratos compartilhados entre módulos.

Não pode importar:

- `@vet/core-local`;
- `@vet/ui`;
- `@vet/modules`;
- código de `apps/vet-app`;
- Svelte;
- Tauri;
- SQLite;
- APIs de navegador.

Essa regra vale também para testes dentro de `packages/types`.

### `@vet/core-local`

`@vet/core-local` é infraestrutura TypeScript local reutilizável.

Pode importar:

- `@vet/types`;
- APIs Tauri;
- plugins Tauri usados pelo app atual.

Pode conter:

- cliente/adaptadores SQLite;
- bridge nativa;
- i18n comum;
- preferências genéricas;
- mídia genérica;
- helpers locais reutilizáveis;
- import/export/backup TypeScript quando forem infraestrutura local.

Não pode importar:

- `@vet/ui`;
- `@vet/modules`;
- código de `apps/vet-app`.

### `@vet/ui`

`@vet/ui` é design system e UI reutilizável.

Pode importar:

- `@vet/types`;
- `@vet/core-local`, quando o componente realmente depender do i18n ou de outra
  infraestrutura comum já formalizada no package.

Se `@vet/ui` continuar usando `@vet/core-local`, declare `@vet/core-local` no
`package.json` de `packages/ui`.

Não pode importar:

- `@vet/modules`;
- código de `apps/vet-app`;
- services ou repositories de negócio.

Componentes com fluxo específico de `owners`, `pets`, `records`, `treatments`,
catalog items ou settings de negócio pertencem aos módulos correspondentes ou ao
`vet-app`, não ao design system.

### `@vet/modules`

`@vet/modules` contém os módulos de negócio atuais:

```text
packages/modules/src/
  knowledge/
  registry/
  medical_records/
```

Pode importar:

- `@vet/types`;
- `@vet/core-local`;
- `@vet/ui`.

Não pode importar:

- código de `apps/vet-app`;
- rotas SvelteKit;
- stores locais do app;
- aliases `$lib`.

Dentro de `packages/modules`, não use `@vet/modules/...` para imports internos.
Use imports relativos dentro do mesmo módulo.

Módulos irmãos não devem importar repositories, services ou components internos
uns dos outros. Quando uma tela ou fluxo precisar juntar dados de `knowledge`,
`registry` e `medical_records`, faça a composição em `apps/vet-app`.

Contratos compartilhados entre módulos ficam em `@vet/types`.

### `apps/vet-app`

`apps/vet-app` é a camada de composição do aplicativo atual.

Pode importar:

- `@vet/types`;
- `@vet/core-local`;
- `@vet/ui`;
- `@vet/modules`;
- código local de `apps/vet-app/src/lib`.

Deve conter:

- rotas SvelteKit;
- stores locais do app;
- composição de telas;
- agregadores que juntam mais de um módulo de negócio;
- fluxos que são específicos do `vet-app`.

Nesta fase, mover composição para `apps/vet-app` é uma decisão correta quando a
lógica junta módulos diferentes ou ainda pertence claramente ao fluxo do app
atual. Não force essa lógica para dentro de um package apenas para deixar o app
menor.

Uma lógica que ficar em `apps/vet-app` poderá virar package em refatoração
posterior quando houver sinal claro de que ela é reutilizável, estável ou pertence
de fato a um domínio específico. Nesta fase, a prioridade é limpar dependências e
responsabilidades sem antecipar abstrações.

## Ajustes Esperados

### 1. Corrigir Dependências Declaradas

Revise todos os `package.json` dos packages TypeScript.

Cada package deve declarar as dependências locais que realmente importa.

Exemplos:

- se `packages/ui/src` importa `@vet/core-local`, `packages/ui/package.json`
  deve declarar `@vet/core-local`;
- se um teste dentro de `packages/types` importa `@vet/core-local`, mova o teste
  para o package correto ou remova essa dependência;
- nenhum package deve funcionar apenas por vazamento do workspace.

### 2. Remover API Pública Acidental

Revise `exports` em `packages/modules/package.json`.

Remova exports wildcard que exponham detalhes internos, como:

```json
"./*.js": "./src/*.ts",
"./*.svelte": "./src/*.svelte",
"./*": "./src/*"
```

Substitua por subpaths públicos explícitos.

Exports públicos esperados:

```json
{
  ".": "./src/index.ts",
  "./knowledge": "./src/knowledge/index.ts",
  "./knowledge/breeds": "./src/knowledge/breeds/index.ts",
  "./knowledge/products": "./src/knowledge/products/index.ts",
  "./knowledge/active_ingredients": "./src/knowledge/active_ingredients/index.ts",
  "./knowledge/conditions": "./src/knowledge/conditions/index.ts",
  "./knowledge/manufacturers": "./src/knowledge/manufacturers/index.ts",
  "./registry": "./src/registry/index.ts",
  "./registry/owners": "./src/registry/owners/index.ts",
  "./registry/pets": "./src/registry/pets/index.ts",
  "./medical_records": "./src/medical_records/index.ts",
  "./medical_records/records": "./src/medical_records/records/index.ts",
  "./medical_records/treatments": "./src/medical_records/treatments/index.ts",
  "./medical_records/treatment_protocols": "./src/medical_records/treatment_protocols/index.ts",
  "./medical_records/treatment_analytics": "./src/medical_records/treatment_analytics/index.ts"
}
```

Se o app precisar consumir um componente ou service de um subdomínio, reexporte
esse item pelo `index.ts` público do subdomínio correspondente.

Não faça imports no app como:

```ts
import X from '@vet/modules/registry/components/...';
import { y } from '@vet/modules/medical_records/repositories/...';
```

Prefira:

```ts
import { OwnerAvatar } from '@vet/modules/registry/owners';
import { loadRecordDetails } from '@vet/modules/medical_records/records';
```

### 3. Remover `core_services` E `core_repositories` De `@vet/modules`

`packages/modules/src/core_services` e
`packages/modules/src/core_repositories` não são módulos de negócio.

Classifique cada arquivo:

- infraestrutura local reutilizável vai para `packages/core-local`;
- composição específica do app vai para `apps/vet-app/src/lib/services`;
- regra de negócio de `knowledge` vai para `packages/modules/src/knowledge`;
- regra de negócio de `registry` vai para `packages/modules/src/registry`;
- regra de negócio de `medical_records` vai para
  `packages/modules/src/medical_records`.

Depois da classificação, remova imports públicos como:

```ts
@vet/modules/core_services/...
@vet/modules/core_repositories/...
```

### 4. Reduzir Imports Entre Módulos Irmãos

Procure imports diretos entre `knowledge`, `registry` e `medical_records`.

Casos a corrigir:

- `registry` chamando repository interno de `medical_records`;
- `medical_records` chamando repository interno de `registry`;
- `knowledge` chamando repository interno de outro módulo;
- componentes de um módulo importando componentes internos de outro módulo.

Quando houver agregação entre módulos, mova a composição para
`apps/vet-app/src/lib/services` ou para uma função local da rota que consome os
módulos.

Exemplo de direção desejada:

```ts
// apps/vet-app compõe
const pet = await getPet(petId);
const owners = await listOwnersByPet(petId);
const records = await listRecordsByPet(petId);
const treatments = await listTreatmentsByPet(...);
```

Cada módulo expõe sua API pública. O app junta as partes.

### 5. Manter `treatments` Dentro De `medical_records`

Não crie módulo top-level `treatments`.

O código atual de:

- vacinas;
- antiparasitários;
- tratamentos;
- protocolos;
- analytics de tratamentos;

continua dentro de `packages/modules/src/medical_records`.

Use subpaths públicos:

```text
@vet/modules/medical_records/treatments
@vet/modules/medical_records/treatment_protocols
@vet/modules/medical_records/treatment_analytics
```

### 6. Atualizar Imports Do App

Atualize `apps/vet-app/src` para consumir apenas APIs públicas.

Permitido:

```ts
@vet/modules/knowledge
@vet/modules/knowledge/products
@vet/modules/registry
@vet/modules/registry/owners
@vet/modules/registry/pets
@vet/modules/medical_records
@vet/modules/medical_records/records
@vet/modules/medical_records/treatments
```

Evite:

```ts
@vet/modules/*/repositories/...
@vet/modules/*/services/...
@vet/modules/*/components/...
@vet/modules/core_services/...
@vet/modules/core_repositories/...
```

Se algo precisa ser consumido pelo app, torne isso parte explícita do `index.ts`
público correto.

### 7. Atualizar Documentação Operacional

Atualize documentação operacional que ainda aponta para caminhos anteriores.

Mínimo esperado:

- `README.md`;
- `README.pt-BR.md`;
- docs técnicos com comandos de check/build;
- links internos para `storage`, `distribution` e `replication`;
- caminhos de migrations e schema, conforme a posição atual no código.

Os comandos finais devem apontar para:

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
```

## Sequência De Atividades

### Atividade 1: Auditoria De Imports

Rode buscas para mapear violações:

```sh
rg -n "\\$lib" packages
rg -n "@vet/(core-local|ui|modules)" packages/types/src
rg -n "@vet/(ui|modules)" packages/core-local/src
rg -n "@vet/modules" packages/ui/src
rg -n "@vet/modules/" packages/modules/src
rg -n "@vet/modules/.*/(repositories|services|components)" apps/vet-app/src
rg -n "@vet/modules/core_(services|repositories)" apps/vet-app/src packages/modules/src
```

Registre os pontos encontrados e corrija por grupo.

### Atividade 2: Corrigir Manifests

Atualize `package.json` de cada package para declarar dependências reais.

Depois rode:

```sh
npm run check
npm run test:run
```

### Atividade 3: Fechar Exports Públicos

Crie ou ajuste `index.ts` públicos nos subdomínios dos módulos.

Depois remova wildcard exports de `@vet/modules` e atualize imports do app para
usar apenas subpaths públicos.

Depois rode:

```sh
npm run check
npm run test:run
```

### Atividade 4: Classificar `core_services` E `core_repositories`

Mova cada arquivo para `core-local`, para um módulo de negócio ou para a camada
local do app conforme a responsabilidade.

Depois rode:

```sh
npm run check
npm run test:run
```

### Atividade 5: Remover Dependências Entre Módulos Irmãos

Mova agregações entre `knowledge`, `registry` e `medical_records` para o
`vet-app`.

Depois rode:

```sh
npm run check
npm run test:run
```

### Atividade 6: Atualizar Docs Operacionais

Atualize documentação com os caminhos atuais.

Depois rode:

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
git diff --check
```

## Critério De Conclusão

A fase 2 está pronta quando:

- `@vet/types` não importa nenhum package local;
- `@vet/core-local` não importa `@vet/ui`, `@vet/modules` ou app;
- `@vet/ui` não importa `@vet/modules` ou app;
- `@vet/modules` não importa app;
- `packages/modules/src` não usa `@vet/modules/...` para imports internos;
- `apps/vet-app` consome módulos por APIs públicas;
- `packages/modules/package.json` não expõe wildcard genérico;
- `core_services` e `core_repositories` não aparecem como subpaths públicos de
  `@vet/modules`;
- `treatments` continua dentro de `medical_records`;
- documentação operacional aponta para a estrutura atual;
- todos os checks finais passam.

## Checks Finais Obrigatórios

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
git diff --check
```
