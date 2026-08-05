# Prompt Para Refatorar O Monolito Para Monolito Modular

Refatore o repositório atual do app veterinário de uma arquitetura monolítica
para uma arquitetura de monolito modular, seguindo Package by Feature.

Esta refatoração deve reorganizar o código que existe hoje. Não redesenhe
produto, tela, schema ou regra de negócio junto com a movimentação.

## Objetivo

Transformar apenas o código do app atual em um workspace modular.

Nesta etapa, altere estes conjuntos:

```text
apps/vet-app/
packages/types/
packages/ui/
packages/core-local/
packages/core-rust/
packages/modules/
```

Preserve no lugar atual as pastas que não fazem parte da aplicação movida nem
dos packages extraídos, por exemplo:

```text
docs/
scripts/
flatpak/
legacy-to-sqlite/
```

O app funcional atual passa a morar em:

```text
apps/vet-app/
```

## Estrutura Inicial Do Workspace

Crie a estrutura base:

```text
Cargo.toml
package.json
package-lock.json
Cargo.lock

apps/
  vet-app/

packages/
  types/
  ui/
  core-local/
  core-rust/
  modules/
```

O repositório atual usa `npm` com `package-lock.json`. Preserve npm nesta
refatoração. Configure workspaces no `package.json` da raiz e mantenha o
`package-lock.json` na raiz.

O repositório atual não tem `Cargo.toml` na raiz. Crie esse `Cargo.toml` como
workspace Rust e promova o lockfile atual de `src-tauri/Cargo.lock` para
`Cargo.lock` na raiz.

Mova o app atual para:

```text
src -> apps/vet-app/src
src-tauri -> apps/vet-app/src-tauri
static -> apps/vet-app/static
```

Não mova artefatos de build. `src-tauri/target/` deve ser descartado da
movimentação e continuar ignorado pelo git.

Também não mova:

```text
build/
.svelte-kit/
node_modules/
```

Depois ajuste configs, scripts, aliases, imports e manifests até o mesmo app
compilar no novo caminho.

## Packages

### `packages/types`

Contratos puros compartilhados:

- tipos de `owner`;
- tipos de `pet`;
- tipos de `medical_record`/`record`;
- tipos de `treatment`;
- tipos de `treatment_protocol`;
- tipos de `image_collection`;
- tipos de `search`;
- tipos de `practice_profile`;
- tipos compartilhados de catalog items.

Este package não deve depender de Svelte, Tauri, SQLite ou runtime do app.

### `packages/ui`

Componentes visuais reutilizáveis:

- `src/lib/components/ui`;
- `src/lib/components/forms`;
- componentes compartilhados sem regra de negócio;
- estilos e tokens reutilizáveis.

Componentes com fluxo específico de `owners`, `pets`, `records`, `treatments`
ou catalog items devem ficar no módulo de negócio correspondente ou no
`vet-app`.

### `packages/core-local`

Código TypeScript local reutilizável:

- bridge nativa;
- preferências;
- i18n comum;
- cliente/adaptadores SQLite usados hoje;
- mídia genérica;
- import/export/backup TS.

Mantenha o schema principal e as migrations no `vet-app` nesta etapa.

### `packages/core-rust`

Código Rust reutilizável:

- `storage`;
- `distribution`;
- `replication`;
- utilitários compartilhados usados pelo Tauri.

`apps/vet-app/src-tauri` deve ficar como camada de integração: registra comandos
Tauri e chama funções do crate compartilhado.

### `packages/modules`

Módulos de negócio do app atual.

Extraia primeiro estes módulos:

```text
packages/modules/src/
  knowledge/
  registry/
  medical_records/
```

## Módulos Atuais

### `knowledge`

Código atual relacionado a reference data/catalog:

- `formulary`;
- `breeds`;
- `products`;
- `active_ingredients`;
- `conditions`;
- `manufacturers`;
- `settings/products`;
- catalog defaults;
- catalog repositories;
- catalog services;
- catalog components.

### `registry`

Código atual relacionado a cadastro:

- `owners`;
- `pets`;
- `contacts`;
- `addresses`;
- relação entre `owners` e `pets`;
- `veterinarian_profiles`;
- `workplaces`;
- `practice_profile`;

### `medical_records`

Código atual relacionado ao histórico clínico do pet:

- `records`;
- `medical_records`;
- `treatment`;
- `treatment_protocol`;
- `vaccines`;
- `antiparasitics`;
- `treatment_analytics`;
- rotas de `records`;
- rotas de `vaccines`;
- rotas de `antiparasitics`;
- dashboards de `vaccines` e `antiparasitics`.

Dentro de `medical_records`, organize subpastas conforme o código atual pedir,
por exemplo:

```text
medical_records/
  records/
  treatments/
  treatment_protocols/
  treatment_analytics/
```

## Sequência De Atividades

Trabalhe em etapas pequenas. Em cada atividade:

1. mova apenas o conjunto de arquivos daquela etapa;
2. ajuste imports e exports;
3. rode os checks indicados;
4. só avance quando o app voltar a compilar ou quando a falha estiver
   documentada como existente no baseline.

### Atividade 0: Baseline

Objetivo: registrar o estado do app antes da refatoração.

Ações:

- rode os checks atuais;
- registre `git status --short`;
- anote quais falhas já existiam antes de mover arquivos.

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
git status --short
```

Saída esperada:

- lista de checks que passaram;
- lista de checks que falharam;
- estado inicial do git registrado.

### Atividade 1: Criar A Casca Do Workspace

Objetivo: criar a estrutura de workspace sem extrair lógica ainda.

Ações:

- crie `apps/vet-app`;
- crie `packages/types`;
- crie `packages/ui`;
- crie `packages/core-local`;
- crie `packages/core-rust`;
- crie `packages/modules`;
- crie `Cargo.toml` de workspace na raiz;
- configure o `Cargo.toml` da raiz com os members
  `apps/vet-app/src-tauri` e `packages/core-rust`;
- transforme o `package.json` da raiz em manifest de workspace npm;
- configure workspaces npm no `package.json` da raiz com `apps/*` e
  `packages/*`;
- mantenha `package-lock.json` na raiz.

Saída esperada:

- estrutura base existe;
- nenhuma regra de negócio foi movida ainda.

### Atividade 2: Mover O App Inteiro Para `apps/vet-app`

Objetivo: fazer o mesmo app compilar no novo caminho antes de extrair packages.

Ações:

- mova `src` para `apps/vet-app/src`;
- mova `src-tauri` para `apps/vet-app/src-tauri`;
- mova `static` para `apps/vet-app/static`;
- mova `src-tauri/Cargo.lock` para `Cargo.lock` na raiz;
- não mova `src-tauri/target`;
- preserve `docs`, `scripts`, `flatpak`, `legacy-to-sqlite` e demais pastas de
  apoio no lugar atual.

Atualize:

- crie `apps/vet-app/package.json` a partir do manifest atual do app;
- deixe o `package.json` da raiz apenas como orquestrador do workspace;
- mantenha no root `package.json` scripts delegadores para `apps/vet-app`;
- mova `vite.config.ts` para `apps/vet-app/vite.config.ts`;
- mova `svelte.config.js` para `apps/vet-app/svelte.config.js`;
- mova `tsconfig.json` para `apps/vet-app/tsconfig.json`;
- mova e ajuste `src-tauri/tauri.conf.json`;
- mova e preserve `src-tauri/build.rs`;
- mova e preserve `src-tauri/capabilities`;
- mova e preserve `src-tauri/icons`;
- mova e preserve `src-tauri/desktop`;
- mova e preserve `src-tauri/metainfo`;
- ajuste aliases de SvelteKit/Vite/TypeScript;
- mantenha em `apps/vet-app/package.json` os scripts atuais de `dev`, `build`,
  `preview`, `check`, `test`, `test:run` e `tauri`;
- ajuste paths em `apps/vet-app/src-tauri/tauri.conf.json`, incluindo
  `$schema`, `licenseFile`, `changelog`, arquivos de desktop/metainfo e
  comandos de build;
- `.gitignore`, incluindo ignores para `/target`, `/apps/vet-app/build` e
  `/apps/vet-app/.svelte-kit`.

Scripts delegadores esperados no root `package.json`:

| Script | Comando |
| --- | --- |
| `check` | `npm --workspace apps/vet-app run check` |
| `test:run` | `npm --workspace apps/vet-app run test:run` |
| `build` | `npm --workspace apps/vet-app run build` |
| `dev` | `npm --workspace apps/vet-app run dev` |
| `tauri` | `npm --workspace apps/vet-app run tauri` |

Checks:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path apps/vet-app/src-tauri/Cargo.toml
```

Saída esperada:

- o app atual compila em `apps/vet-app`;
- comportamento preservado;
- ainda não houve extração lógica.

### Atividade 3: Preparar Exports Dos Packages

Objetivo: deixar os packages prontos para receber código sem quebrar resolução
de imports.

Ações:

- crie `package.json` em `packages/types`;
- crie `package.json` em `packages/ui`;
- crie `package.json` em `packages/core-local`;
- crie `package.json` em `packages/modules`;
- crie `Cargo.toml` em `packages/core-rust`;
- crie `src/index.ts` nos packages TypeScript;
- crie `src/lib.rs` em `packages/core-rust`;
- crie `tsconfig.json` nos packages TypeScript;
- configure aliases internos;
- ajuste `tsconfig` para resolver os packages;
- mantenha exports vazios ou mínimos até mover código real.

Checks:

```sh
npm run check
```

Saída esperada:

- imports entre app e packages podem ser resolvidos;
- nenhum código de domínio foi alterado ainda.

### Atividade 4: Extrair `packages/types`

Objetivo: mover contratos puros primeiro.

Ações:

- mova tipos de `owner`;
- mova tipos de `pet`;
- mova tipos de `medical_record`/`record`;
- mova tipos de `treatment`;
- mova tipos de `treatment_protocol`;
- mova tipos de `image_collection`;
- mova tipos de `search`;
- mova tipos de `practice_profile`;
- mova tipos compartilhados de catalog items;
- atualize imports no `vet-app`.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- `packages/types` não depende de Svelte, Tauri, SQLite ou runtime do app;
- app e testes continuam resolvendo os tipos.

### Atividade 5: Extrair `packages/ui`

Objetivo: mover apenas UI reutilizável.

Ações:

- mova `src/lib/components/ui`;
- mova `src/lib/components/forms`;
- mova componentes compartilhados sem regra de negócio;
- mova estilos e tokens reutilizáveis;
- atualize imports no `vet-app`.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- `packages/ui` não conhece rotas ou services do app;
- componentes específicos continuam no app ou nos módulos.

### Atividade 6: Extrair `packages/core-local`

Objetivo: mover infraestrutura TypeScript local reutilizável.

Ações:

- mova bridge nativa;
- mova preferências;
- mova i18n comum;
- mova cliente/adaptadores SQLite usados hoje;
- mova mídia genérica;
- mova import/export/backup TS;
- mantenha schema principal e migrations no `vet-app`.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- código local reutilizável saiu do app;
- migrations e schema continuam preservados;
- fluxo local-first continua funcionando.

### Atividade 7: Extrair `packages/core-rust`

Objetivo: mover o motor Rust reutilizável.

Ações:

- mova `storage`;
- mova `distribution`;
- mova `replication`;
- mova utilitários Rust compartilhados;
- deixe `apps/vet-app/src-tauri` como camada de integração dos comandos Tauri.

Checks:

```sh
cargo check --manifest-path apps/vet-app/src-tauri/Cargo.toml
npm run check
```

Saída esperada:

- crate compartilhado compila;
- Tauri continua registrando os comandos do app.

### Atividade 8: Extrair `packages/modules/src/knowledge`

Objetivo: mover o código atual de reference data/catalog.

Ações:

- mova código de `formulary`;
- mova código de `breeds`;
- mova código de `products`;
- mova código de `active_ingredients`;
- mova código de `conditions`;
- mova código de `manufacturers`;
- mova catalog defaults, repositories, services e components relacionados;
- mantenha rotas específicas em `apps/vet-app`, compondo o módulo.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- `knowledge` concentra o código reutilizável de catalog/reference data;
- rotas atuais de catalog continuam funcionando.

### Atividade 9: Extrair `packages/modules/src/registry`

Objetivo: mover o código atual de cadastro.

Ações:

- mova código de `owners`;
- mova código de `pets`;
- mova código de `contacts`;
- mova código de `addresses`;
- mova código da relação entre `owners` e `pets`;
- mova código de `veterinarian_profiles`, `workplaces` e `practice_profile`;
- mantenha rotas específicas em `apps/vet-app`, compondo o módulo.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- `registry` concentra o código reutilizável de cadastro;
- fluxos de `owners` e `pets` continuam funcionando.

### Atividade 10: Extrair `packages/modules/src/medical_records`

Objetivo: mover o código atual de histórico clínico.

Ações:

- mova código de `records`;
- mova código de `medical_records`;
- mova código de `treatment`;
- mova código de `treatment_protocol`;
- mova código de `vaccines`;
- mova código de `antiparasitics`;
- mova código de `treatment_analytics`;
- mantenha rotas específicas em `apps/vet-app`, compondo o módulo.

Checks:

```sh
npm run check
npm run test:run
```

Saída esperada:

- `medical_records` concentra o código clínico atual;
- fluxos de `records`, `vaccines`, `antiparasitics` e protocolos continuam
  funcionando.

### Atividade 11: Revisão Final De Fronteiras

Objetivo: limpar imports, conferir responsabilidades e validar o workspace.

Ações:

- remova imports quebrados ou atalhos temporários sem uso;
- confirme que `packages/types` não importa packages locais;
- confirme que `packages/ui` não importa app;
- confirme que `packages/modules` não depende de rotas;
- confirme que `apps/vet-app` faz a composição das telas;
- confira que `docs`, `scripts`, `flatpak` e `legacy-to-sqlite` ficaram no lugar
  atual.

Checks finais:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path apps/vet-app/src-tauri/Cargo.toml
```

Saída esperada:

- workspace compila;
- fronteiras estão claras;
- comportamento atual foi preservado;
- falhas restantes estão documentadas.

## Regras De Dependência

- `packages/types` não importa packages locais.
- `packages/ui` pode importar `types`, mas não importa apps.
- `packages/core-rust` não conhece apps.
- `packages/core-local` pode importar `types` e chamar comandos Tauri.
- `packages/modules` pode importar `types`, `ui` e `core-local`.
- `apps/vet-app` pode importar todos os packages.

Evite imports internos diretos entre módulos de negócio. Quando dois módulos
precisarem se comunicar, use contratos públicos ou composição em `apps/vet-app`.

## Persistência

Movimentação de arquivos não deve alterar schema SQLite.

Preserve:

- tabelas;
- colunas;
- índices;
- constraints;
- `user_version`;
- comportamento das migrations atuais.

## Arquivos Sensíveis

Trate com cuidado especial:

```text
src/lib/persistence/sqlite/migrations.ts
src/lib/persistence/sqlite/schema-migrations/**
src/lib/services/clinic.service.ts
src/lib/stores/clinic.svelte.ts
src/routes/+page.svelte
src/routes/formulary/**
src/routes/owners/**
src/routes/pets/**
src/routes/records/**
src/routes/vaccines/**
src/routes/antiparasitics/**
src/routes/dashboard/vaccines/**
src/routes/dashboard/antiparasitics/**
src/routes/settings/products/**
src/routes/settings/protocols/**
src-tauri/src/lib.rs
src-tauri/src/storage/**
src-tauri/src/distribution/**
src-tauri/src/replication/**
```

Depois da movimentação inicial, os caminhos que começam com `src/` e
`src-tauri/` passam a ser lidos sob `apps/vet-app/`.

## Checks

Depois de cada bloco relevante:

```sh
npm run check
npm run test:run
```

Ao final:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path apps/vet-app/src-tauri/Cargo.toml
```

Quando algum check falhar por problema anterior à refatoração, registre a falha
e mostre que ela já existia no baseline.

## Fluxos Para Conferir

Verifique que continuam funcionando:

- criar/editar `owner`;
- criar/editar `pet`;
- abrir perfil do `pet`;
- abrir `records`;
- criar/editar `record`;
- abrir `vaccines`;
- abrir `antiparasitics`;
- abrir dashboards de `vaccines` e `antiparasitics`;
- abrir `formulary`;
- abrir `breeds`;
- salvar item em `settings/products`;
- salvar protocolo em `settings/protocols`;
- importar base nativa;
- exportar pacote nativo;
- exportar CSV;
- configurar backup;
- restaurar item da lixeira;
- fazer exclusão definitiva.

## Critério De Conclusão

A refatoração está pronta quando:

- o app compila em `apps/vet-app`;
- os packages existem e têm responsabilidades claras;
- `knowledge`, `registry` e `medical_records` foram extraídos a partir do código
  atual;
- imports respeitam as fronteiras definidas;
- o schema SQLite foi preservado;
- os fluxos atuais continuam funcionando;
- os checks obrigatórios foram executados ou a falha foi documentada.
