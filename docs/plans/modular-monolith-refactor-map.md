# Mapa Para Extrair O App Atual Para Workspace Modular

Atualizado em 2026-08-04.

Este documento registra o estado real do app atual e o mapeia para o alvo
informado: um repositorio publico `veterinary-apps` com varios aplicativos em
`apps/` e motor reutilizavel em `packages/`.

O objetivo e transformar o projeto atual no primeiro aplicativo do workspace:

```text
apps/vet-app
```

e extrair, aos poucos, o que for reutilizavel para:

```text
packages/types
packages/ui
packages/core-rust
packages/core-local
packages/modules
```

Use junto com:

- [Arquitetura Geral](../architecture.md)
- [Arquitetura De Armazenamento](../storage-architecture.md)
- [Arquitetura De Distribuicao](../distribution-architecture.md)
- [Arquitetura De Replicacao Local-First](../replication-architecture.md)
- [Versionamento De Banco E Ritual De Lancamento](../database-versioning.md)
- [Plano De Refatoracao De Prontuarios Para Timeline Clinica](medical-records-timeline-refactor.md)
- [Plano De Intercambio FHIR Via Distribution](fhir-interchange-distribution-plan.md)
- [Plano Do Server Open](server-open-plan.md)

## Modelo Alvo

```text
veterinary-apps/
  Cargo.toml
  pnpm-workspace.yaml

  apps/
    vet-app/
      src-tauri/
      src/routes/

    lab-app/
    customer-app/
    store-app/
    cleaner-app/
    pharma-app/

  server-open/

  packages/
    types/
    ui/
    core-rust/
    core-local/
    modules/
```

## Papel Do `server-open`

`server-open` faz parte da estrategia open source do workspace, mas nao e o
backend operacional do produto SaaS.

Ele deve concentrar:

- dados fonte publicos usados para gerar bancos de referencia;
- pacotes prontos/versionados para `system`, `system_media` e `CAS/system`;
- manifests de versao, hashes, tamanho, changelog e compatibilidade;
- updates completos ou incrementais para os apps;
- empacotamento, publicacao e metadados de builds dos apps.

Os apps devem consumir esses pacotes prontos. Eles nao devem carregar JSONs
fonte dos catalogos publicos nem gerar internamente os bancos publicos de
referencia.

Operacoes de SaaS, contas comerciais, billing, sincronizacao privada e recursos
fechados pertencem a outro servidor, fora do escopo deste repositorio publico.

## Principio Da Migracao

O app atual deve continuar funcionando enquanto o workspace nasce.

Movimentos seguros:

1. Primeiro mover o app inteiro para `apps/vet-app`.
2. Depois extrair pacotes compartilhados um por vez.
3. Manter fachadas estaveis para o app enquanto imports internos mudam.
4. Rodar checks depois de cada bloco pequeno.
5. Evitar alterar schema SQLite junto com movimentacao de pastas.

## Estado Real Hoje

O repositorio atual ainda e um app unico.

```text
/
  package.json
  package-lock.json
  vite.config.ts
  svelte.config.js
  tsconfig.json
  src/
  src-tauri/
  legacy-to-sqlite/
  docs/
  flatpak/
  scripts/
```

Stack atual:

- UI: Svelte 5, SvelteKit, TypeScript.
- Shell: Tauri 2.
- Nativo: Rust.
- Persistencia: SQLite por comandos Tauri `storage_*`; Rust executa queries com
  `rusqlite`.
- Midia: CAS no disco, metadados em SQLite.
- Checks: `npm run check`, `npm run test:run`, `npm run build`, `cargo check`.

Fluxo mental atual:

```text
src/routes
  -> src/lib/services
  -> src/lib/persistence/repositories
  -> src/lib/persistence/sqlite/client.ts
  -> invoke('storage_select' | 'storage_execute')
  -> src-tauri/src/storage
  -> SQLite + CAS
```

Backend Rust atual:

```text
src-tauri/src/storage      bancos ativos, CAS, manifesto, hard delete
src-tauri/src/distribution importacao/exportacao completa
src-tauri/src/replication  backup/sync continuo por patches
```

## Mapa Raiz Atual Para Alvo

| Atual | Alvo inicial | Observacao |
| --- | --- | --- |
| `src/` | `apps/vet-app/src/` | Primeiro mover sem quebrar comportamento. |
| `src-tauri/` | `apps/vet-app/src-tauri/` | Tauri app especifico do veterinario. |
| `package.json` | `apps/vet-app/package.json` + root workspace | Separar scripts do app e scripts globais. |
| `vite.config.ts` | `apps/vet-app/vite.config.ts` | Ajustar paths/aliases. |
| `svelte.config.js` | `apps/vet-app/svelte.config.js` | Ajustar paths/aliases. |
| `tsconfig.json` | root base + `apps/vet-app/tsconfig.json` | Criar config compartilhada depois. |
| `src-tauri/Cargo.toml` | `apps/vet-app/src-tauri/Cargo.toml` | Depois depender de `packages/core-rust`. |
| `legacy-to-sqlite/` | `packages/core-local/tools/legacy-to-sqlite` ou `tools/legacy-to-sqlite` | Ferramenta externa; nao entra no runtime. |
| `docs/` | `docs/` | Continuar na raiz do workspace. |
| `flatpak/` | `apps/vet-app/flatpak/` ou `packaging/vet-app/flatpak` | Empacotamento do app veterinario. |
| `scripts/` | `tools/` ou `packages/core-local/scripts` | Separar scripts globais de scripts do app. |

## Apps

### `apps/vet-app`

E o produto atual. Deve receber quase tudo no primeiro movimento:

```text
src/
src-tauri/
static/
vite.config.ts
svelte.config.js
tsconfig.json
```

Escopo do app:

- prontuario;
- tutores e pets;
- tratamentos, vacinas, antiparasitarios;
- agenda e prescricoes quando nascerem;
- exames, laudos e DICOM quando forem parte do fluxo do veterinario;
- splits financeiros quando existirem;
- configuracoes locais, backup, import/export e perfil do profissional.

### `apps/lab-app`, `apps/customer-app`, `apps/store-app`, `apps/cleaner-app`, `apps/pharma-app`

Futuros. Criar apenas quando houver produto/fluxo. Nao criar placeholders
pesados agora.

O `customer-app`, por exemplo, deve consumir DTOs/public views vindos de
`medical_records/timeline`, `medical_records/treatments`,
`medical_records/medications` e `medical_records/prescriptions`, como carteira
vacinal, medicacoes, receitas e historico resumido. A logica clinica de montagem
desses eventos continua partindo do veterinario e dos modulos de
`medical_records`.

O `lab-app` futuro deve consumir `diagnostics` como modulo produtor de exames,
laudos e imagens. O `vet-app` tambem pode usar `diagnostics` quando precisar
gerar ou estruturar exames, mas a visualizacao desses itens dentro do historico
do pet fica em `medical_records/exams`.

## Packages

### `packages/types`

Contratos compartilhaveis e estaveis.

Entram aqui primeiro:

| Atual | Alvo |
| --- | --- |
| `src/lib/domain/shared/uuid.ts` | `packages/types/src/shared/uuid.ts` ou manter em `core-local` se tiver runtime. |
| `src/lib/domain/owner/owner.ts` | `packages/types/src/registry/owner.ts` |
| `src/lib/domain/pet/pet.ts` | `packages/types/src/registry/pet.ts` |
| `src/lib/domain/medical-record/medical-record.ts` | `packages/types/src/medical_records/record.ts`, `encounter.ts` e `block.ts` |
| `src/lib/domain/treatment/treatment.ts` | desmembrar entre `packages/types/src/medical_records/treatments`, `medications` e `prescriptions` |
| `src/lib/domain/treatment/protocol.ts` | `packages/types/src/medical_records/treatments/protocols` e `treatments/plans` |
| `src/lib/domain/search/search.ts` | `packages/types/src/search/search.ts` |
| `src/lib/domain/image-collection/image-collection.ts` | `packages/types/src/media/image-collection.ts` |
| `src/lib/domain/practice-profile/practice-profile.ts` | `packages/types/src/practice/practice-profile.ts` |

Regra: `types` nao deve importar Svelte, Tauri, SQLite, DOM ou repositorios.
Se o arquivo tem funcao de runtime com dependencia de ambiente, ele deve ficar
em `core-local` ou em `modules`.

### `packages/ui`

Design system Svelte 5 e componentes reutilizaveis.

Entram aqui primeiro:

| Atual | Alvo |
| --- | --- |
| `src/lib/components/ui/*` | `packages/ui/src/components/*` |
| `src/lib/components/forms/*` | `packages/ui/src/forms/*` |
| `src/lib/components/shared/BinaryImage.svelte` | `packages/ui/src/media/BinaryImage.svelte` ou `core-local` se depender de storage. |
| `src/lib/components/shared/RoutePlaceholder.svelte` | `packages/ui/src/layout/RoutePlaceholder.svelte` |
| `src/app.css` | dividir entre tokens globais do app e base do `packages/ui`. |

Componentes que conhecem tutor, pet, produto, prontuario ou tratamento nao devem
ir para `ui`; eles pertencem a `packages/modules`.

### `packages/core-rust`

Crate Rust compartilhado para motor local.

Candidatos do Rust atual:

| Atual | Alvo |
| --- | --- |
| `src-tauri/src/storage/*` | `packages/core-rust/src/storage/*` |
| `src-tauri/src/distribution/*` | `packages/core-rust/src/distribution/*` |
| `src-tauri/src/replication/*` | `packages/core-rust/src/replication/*` |
| `src-tauri/src/file_manager.rs` | app-specific ou `core-rust/src/platform/file_manager.rs`, conforme uso por outros apps. |
| `src-tauri/src/system_fonts.rs` | app-specific ou `core-rust/src/platform/system_fonts.rs`. |

`apps/vet-app/src-tauri` deve ficar como casca Tauri:

```text
apps/vet-app/src-tauri/src/lib.rs
  registra comandos
  configura plugins
  inicializa StorageManager vindo de core-rust
```

Regra: `core-rust` nao deve conhecer `vet-app`, `lab-app` ou rotas Svelte.

### `packages/core-local`

Ponte TypeScript local-first para apps Svelte/Tauri.

Candidatos atuais:

| Atual | Alvo |
| --- | --- |
| `src/lib/persistence/sqlite/client.ts` | `packages/core-local/src/persistence/sqlite/client.ts` |
| `src/lib/persistence/sqlite/media.ts` | `packages/core-local/src/persistence/sqlite/media.ts` |
| `src/lib/persistence/sqlite/migrations.ts` | inicialmente fica no `vet-app`; extrair por etapas. |
| `src/lib/persistence/sqlite/schema-migrations/*` | inicialmente fica no `vet-app`; depois migracoes por app/modulo. |
| `src/lib/native/*` | `packages/core-local/src/native/*` |
| `src/lib/i18n/index.ts` e `state.svelte.ts` | `packages/core-local/src/i18n/*` se for comum aos apps; dicionarios especificos podem ficar por app/modulo. |
| `src/lib/domain/shared/*` com logica runtime | `packages/core-local/src/domain/shared/*` |
| `src/lib/domain/geo/*` | `packages/core-local/src/geo/*` |
| `src/lib/domain/preferences/*` | `packages/core-local/src/preferences/*` |
| `src/lib/services/preferences.service.ts` | `packages/core-local/src/preferences/preferences.service.ts` |
| `src/lib/services/app-version.service.ts` | `packages/core-local/src/app/app-version.service.ts` |
| `src/lib/services/client-state.service.ts` | `packages/core-local/src/app/client-state.service.ts` |
| `src/lib/services/cep.service.ts` | `packages/core-local/src/geo/cep.service.ts` |
| `src/lib/services/contact.service.ts` | `packages/core-local/src/native/contact.service.ts` ou modulo futuro `communications`. |

Regra: `core-local` pode conhecer Tauri e Svelte runes, mas nao deve conhecer
detalhes internos de `vet-app`.

### `packages/modules`

Monolito modular reutilizavel por apps. A estrutura alvo possui 9 modulos
top-level em `packages/modules/src`: `knowledge`, `registry`, `scheduler`,
`diagnostics`, `medical_records`, `financial`, `fiscal`, `communications` e
`cloud_bridge`.

Esta e a estrutura conceitual alvo para a organizacao de negocio. Os nomes dos
modulos sao importantes como mapa mental; as subpastas internas e
responsabilidades detalhadas ainda precisam ser validadas contra o codigo real
deste repositorio.

```text
packages/modules/
  src/
    knowledge/
      breeds/
      products/
      active_ingredients/
      conditions/
      manufacturers/
    registry/
    scheduler/
    diagnostics/
    medical_records/
      record/
      encounters/
      blocks/
      timeline/
      clinical_notes/
      measurements/
      medications/
      prescriptions/
      treatments/
        plans/
        protocols/
        events/
      procedures/
      exams/
        requests/
        reports/
        imaging/
        files/
      attachments/
    financial/
    fiscal/
    communications/
    cloud_bridge/
```

Leitura correta desta arvore:

- ela representa a composicao conceitual final do negocio;
- ela orienta a extracao sem exigir que todos os slots ja existam hoje;
- `scheduler`, `diagnostics`, `financial`, `fiscal`, `communications` e
  `cloud_bridge` sao principalmente slots futuros;
- `medical_records` e o modulo clinico maior; nele ficam atendimentos,
  blocos de prontuario, notas clinicas, medicoes, medicacoes, prescricoes,
  tratamentos, procedimentos, exames, anexos, planos e protocolos como partes da
  mesma historia longitudinal do pet;
- `medical_records/exams` cobre solicitacao, visualizacao e referencia historica
  de exames, laudos, imagens e arquivos DICOM; geracao, emissao e processamento
  pertencem a `diagnostics`;
- `medical_records` pode importar de `diagnostics` somente contratos publicos e
  utilitarios necessarios para abrir arquivos ou estruturar dados de exames;
- `timeline` deve ser a camada que compoe eventos clinicos, sem apagar os
  subdominios internos responsaveis por cada tipo de evento;
- modulos de negocio devem ser tratados como irmaos sempre que possivel; quando
  precisarem conversar, preferir IDs, contratos em `packages/types`, eventos ou
  composicao no app, em vez de imports diretos entre internos de modulos.

Comecar pelos modulos que existem de fato no app atual:

- `knowledge`;
- `registry`;
- `medical_records`;
- um agregador leve de `analytics`, se necessario.

## Leitura Dos 9 Modulos Conceituais

| Modulo alvo | Responsabilidade | Estado no codigo atual |
| --- | --- | --- |
| `knowledge` | Referencia estatica/semicatalogada: racas, produtos, principios ativos, condicoes e fabricantes. | Existe com bastante codigo em catalogos, formulario e guia de racas. |
| `registry` | Cadastros de tutores, pets, contatos e vinculos. | Existe em owners/pets, mas algumas telas tambem compoem prontuarios e tratamentos. |
| `scheduler` | Agenda futura. Deve ser irmao, nao base para outros modulos por import direto. | Nao existe como modulo funcional hoje. |
| `diagnostics` | Modulo produtor de exames, laudos, imagens diagnosticas, DICOM e parametros diagnosticos. Deve servir tanto `vet-app` quanto futuro `lab-app`. | Nao existe como modulo funcional hoje. |
| `medical_records` | Modulo clinico longitudinal do pet: `record`, `encounters`, `blocks`, `timeline`, `clinical_notes`, `measurements`, `medications`, `prescriptions`, `treatments`, `procedures`, `exams` e `attachments`. | Existe em records e tratamentos, hoje espalhado entre tela de pet, prontuario, vacinas, antiparasitarios e protocolos. |
| `financial` | Financeiro/comercial futuro. | Nao existe como modulo funcional hoje. |
| `fiscal` | Fiscal/tributario futuro. | Nao existe como modulo funcional hoje. |
| `communications` | Comunicacao, alertas e filas futuras. | Ha apenas servicos pontuais de contato/link; nao ha modulo completo. |
| `cloud_bridge` | Extensao de nuvem, APIs e sincronizacoes remotas futuras. | Nao existe como modulo de negocio; replicacao local-first atual fica no core Rust/local. |

## Modulos Existentes No App Atual

### `knowledge`

Conhecimento de referencia: produtos, fabricantes, principios ativos, condicoes
e racas.

Arquivos atuais:

```text
src/routes/formulary/**
src/routes/breeds/**
src/routes/settings/products/+page.svelte
src/lib/components/catalog/**
src/lib/components/reference/**
src/lib/components/product/**
src/lib/components/pet/BreedReferenceDetail.svelte
src/lib/domain/catalog/**
src/lib/domain/product/**
src/lib/domain/manufacturer/**
src/lib/domain/active-ingredient/**
src/lib/domain/condition/**
src/lib/domain/pet/breed-reference.ts
src/lib/domain/pet/default-breed-reference.ts
src/lib/domain/pet/defaults/**
src/lib/catalog/defaults/**
src/lib/services/catalog.service.ts
src/lib/services/breed-reference.service.ts
src/lib/persistence/repositories/product-catalog.repository.ts
src/lib/persistence/repositories/manufacturer-catalog.repository.ts
src/lib/persistence/repositories/active-ingredient-catalog.repository.ts
src/lib/persistence/repositories/condition-catalog.repository.ts
src/lib/persistence/repositories/breed-reference.repository.ts
```

Alvo:

```text
packages/modules/src/knowledge/
  breeds/
  products/
  active_ingredients/
  conditions/
  manufacturers/
```

Observacao importante: principios ativos devem continuar com foco de utilidade
clinica para veterinario, nao como catalogo farmaceutico/regulatorio pesado.

### `registry`

Cadastro de tutores, pets, contatos, responsaveis e vinculos tutor-pet.

Arquivos atuais:

```text
src/routes/owners/**
src/routes/pets/new/+page.svelte
src/lib/components/owner/**
src/lib/components/pet/PetAvatar.svelte
src/lib/components/pet/PetAvatarEditorDialog.svelte
src/lib/components/pet/PetTaxonomyPicker.svelte
src/lib/domain/owner/**
src/lib/domain/pet/pet.ts
src/lib/domain/pet/taxonomy.ts
src/lib/services/owner.service.ts
src/lib/services/pet.service.ts
src/lib/services/avatar.service.ts
src/lib/persistence/repositories/owner.repository.ts
src/lib/persistence/repositories/pet.repository.ts
```

Alvo:

```text
packages/modules/src/registry/
  domain/
  services/
  persistence/
  components/
```

Atencao: `pet.service.ts` hoje carrega prontuarios e tratamentos do pet. Na
extracao, separar a parte de cadastro da parte clinica para evitar acoplamento
forte entre `registry` e `medical_records`.

### `diagnostics`

Modulo futuro para gerar, estruturar e processar exames, laudos e imagens
diagnosticas, incluindo DICOM. Ele deve ser reutilizavel pelo `vet-app` e pelo
futuro `lab-app`.

Nao ha modulo funcional equivalente no codigo atual. Quando nascer, ele deve
expor uma API publica pequena para:

- contratos de exame/laudo/imagem diagnostica;
- estrutura de metadados necessaria para visualizacao;
- utilitarios para abrir/interpretar arquivos quando isso for compartilhavel;
- servicos de geracao/emissao/processamento de laudos e exames.

`medical_records/exams` pode consumir os contratos e utilitarios publicos de
`diagnostics` para mostrar exames, imagens e laudos no historico do pet.
`diagnostics` permanece independente da timeline do prontuario para gerar um
exame ou laudo.

### `medical_records`

Modulo clinico longitudinal do pet. Ele deve ser dono da experiencia de
historico medico: pasta clinica unica, atendimentos, linha do tempo, notas
clinicas, medicoes, medicacoes, prescricoes, tratamentos, procedimentos,
exames/laudos, imagens, anexos, planos e protocolos.

`timeline` deve consumir os subdominios internos e montar uma visao unica. A
regra de negocio de vacinas, antiparasitarios, reforcos, validade, receitas e
protocolos fica dentro de `medical_records`, distribuida por blocos praticos e
tabelas de dominio.

Para exames, a fronteira e diferente: `exams` representa a presenca,
solicitacao, visualizacao e referencia do exame no historico clinico. A geracao,
emissao, processamento e estruturacao diagnostica vivem em `diagnostics`.

Modelo interno recomendado:

```text
medical_records/
  record/                    pasta clinica unica do pet
  encounters/                atendimentos e sessoes clinicas
  blocks/                    envelopes genericos da timeline
  timeline/                  read model visual do historico longitudinal
  clinical_notes/            notas clinicas, texto livre, avaliacao e evolucao
  measurements/              peso, escore corporal, sinais vitais e achados
  medications/               medicacoes pontuais
  prescriptions/             receitas e prescricoes como documentos clinicos
  treatments/
    plans/                   planos individuais do pet
    protocols/               protocolos reutilizaveis
    events/                  vacinas, antiparasitarios, reforcos e aplicacoes
  procedures/                procedimentos, internacao e condutas
  exams/
    requests/                solicitacoes de exame
    reports/                 laudos e resultados diagnosticos
    imaging/                 imagens, estudos e referencias DICOM
    files/                   arquivos diagnosticos associados
  attachments/               anexos livres adicionados pelo veterinario
```

A lista canonica de `medical_record_blocks.block_type` para o prontuario e:

```text
clinical_note
measurements
medication
prescription
treatment
procedure
exam
attachment
```

Cada bloco cria uma linha em `medical_record_blocks` e linhas nas tabelas
especificas daquele tipo. `treatment` coordena planos, protocolos e eventos
longitudinais. `medication` cobre medicacoes pontuais. `prescription` cobre a
receita/prescricao como documento clinico. `exam` cobre solicitacao, laudo,
imagem diagnostica, DICOM e arquivos diagnosticos do prontuario. `attachment`
cobre midias adicionais livres e referencia ao arquivo no CAS.

Imagens diagnosticas e arquivos DICOM ficam em `exam`. Midias adicionais livres
anexadas pelo veterinario ficam em `attachment`.

O detalhamento de semantica dos blocos e da refatoracao do fluxo de treatments
esta em [Plano De Refatoracao De Prontuarios Para Timeline Clinica](medical-records-timeline-refactor.md).

Arquivos atuais:

```text
src/routes/records/**
src/routes/vaccines/**
src/routes/antiparasitics/**
src/routes/dashboard/vaccines/**
src/routes/dashboard/antiparasitics/**
src/routes/settings/protocols/+page.svelte
src/lib/components/records/**
src/lib/components/treatment/**
src/lib/components/pet/TreatmentPanel.svelte
src/lib/components/pet/TreatmentDueBadge.svelte
src/lib/domain/medical-record/**
src/lib/domain/treatment/**
src/lib/services/record.service.ts
src/lib/services/treatment.service.ts
src/lib/services/treatment-protocol.service.ts
src/lib/services/treatment-analytics.service.ts
src/lib/persistence/repositories/medical-record.repository.ts
src/lib/persistence/repositories/treatment.repository.ts
src/lib/persistence/repositories/treatment-protocol.repository.ts
src/lib/persistence/repositories/treatment-analytics.repository.ts
```

Alvo:

```text
packages/modules/src/medical_records/
  record/
  encounters/
  blocks/
  timeline/
  clinical_notes/
  measurements/
  medications/
  prescriptions/
  treatments/
    plans/
    protocols/
    events/
  procedures/
  exams/
    requests/
    reports/
    imaging/
    files/
  attachments/
  state.svelte.ts
  types.ts
```

### `analytics`

O dashboard atual cruza dados de cadastro, tratamentos e catalogos. Pode virar
modulo proprio ou ficar como composicao do `vet-app`.

Arquivos atuais:

```text
src/routes/dashboard/**
src/lib/domain/dashboard/**
src/lib/services/dashboard-analytics.service.ts
src/lib/persistence/repositories/dashboard-analytics.repository.ts
src/lib/persistence/repositories/stats.repository.ts
src/lib/services/clinic.service.ts
src/lib/stores/clinic.svelte.ts
```

Recomendacao: manter a composicao agregada em `apps/vet-app` no inicio. O
modelo conceitual revisado nao inclui `analytics` como modulo de negocio; por
isso, so extrair para package se mais de um app realmente precisar do mesmo
agregador.

### `data lifecycle`

Importacao, exportacao, backup, replicacao, lixeira e auditoria.

Arquivos atuais:

```text
src/routes/settings/data/+page.svelte
src/routes/settings/backups/+page.svelte
src/routes/settings/trash/+page.svelte
src/lib/services/database-export.service.ts
src/lib/services/database-import.service.ts
src/lib/services/csv-export.service.ts
src/lib/services/csv-import.service.ts
src/lib/services/replication-backup.service.ts
src/lib/services/backup.service.ts
src/lib/services/trash.service.ts
src/lib/persistence/repositories/backup.repository.ts
src/lib/persistence/repositories/trash.repository.ts
src-tauri/src/storage/**
src-tauri/src/distribution/**
src-tauri/src/replication/**
```

Alvo:

- UI fica em `apps/vet-app/src/routes/settings/...`;
- TS comum vai para `packages/core-local`;
- Rust comum vai para `packages/core-rust`.

## Rotas Atuais Do `vet-app`

| Rota atual | Papel | Destino no workspace |
| --- | --- | --- |
| `/` | setup, home e painel inicial | `apps/vet-app/src/routes/+page.svelte` |
| `/search` | busca global | `apps/vet-app/src/routes/search/+page.svelte` |
| `/new` | atalhos de criacao | `apps/vet-app/src/routes/new/+page.svelte` |
| `/owners/new` | criar tutor | `apps/vet-app`, consumindo `modules/registry` |
| `/owners/[id]` | perfil/edicao de tutor | `apps/vet-app`, consumindo `modules/registry` |
| `/owners/[id]/pets/new` | criar ou vincular pet ao tutor | `apps/vet-app`, consumindo `modules/registry` |
| `/pets/new` | criar pet a partir de tutor escolhido | `apps/vet-app`, consumindo `modules/registry` |
| `/pets/[petId]` | perfil do pet com prontuarios/tratamentos | `apps/vet-app`, compondo `registry` + `medical_records/timeline` |
| `/records/[id]` | prontuario | `apps/vet-app`, consumindo `modules/medical_records` |
| `/formulary/**` | produtos, fabricantes, principios ativos e condicoes | `apps/vet-app`, consumindo `modules/knowledge` |
| `/breeds/**` | guia de racas | `apps/vet-app`, consumindo `modules/knowledge` |
| `/vaccines` | analytics de vacinas | `apps/vet-app`, consumindo `modules/medical_records/treatments` e read models de timeline |
| `/antiparasitics` | analytics de antiparasitarios | `apps/vet-app`, consumindo `modules/medical_records/treatments` e read models de timeline |
| `/dashboard/**` | estudos/analytics cruzados | inicialmente `apps/vet-app` |
| `/settings/data` | import/export | `apps/vet-app` + `core-local/core-rust` |
| `/settings/backups` | backup continuo | `apps/vet-app` + `core-local/core-rust` |
| `/settings/preferences` | idioma/tipografia/autosave | `apps/vet-app` + `core-local` |
| `/settings/profile` | perfil do veterinario/local | `apps/vet-app` + `core-local` ou modulo futuro `practice` |
| `/settings/products` | administracao de produtos | `apps/vet-app` + `modules/knowledge` |
| `/settings/protocols` | protocolos clinicos | `apps/vet-app` + `modules/medical_records/treatments/protocols` |
| `/settings/trash` | lixeira e auditoria | `apps/vet-app` + `core-local/core-rust` |

## Schema E Persistencia

Fonte de verdade atual:

```text
src/lib/persistence/sqlite/migrations.ts
src/lib/persistence/sqlite/schema-migrations/registry.ts
src/lib/persistence/sqlite/schema-migrations/types.ts
```

Versao atual:

```ts
CURRENT_SCHEMA_VERSION = 1
BASELINE_APP_VERSION = '0.2.0'
```

Tabelas principais do banco operacional do usuario:

```text
owners
veterinarian_profiles
workplaces
addresses
image_collections
image_collection_items
contacts
owner_additional_responsibles
pets
pet_owners
medical_records
app_settings
schema_migrations
backup_history
user_product_catalog_items
treatment_protocols
treatment_protocol_items
treatment_protocol_doses
pet_treatments
```

Tabelas principais do banco de sistema/referencia:

```text
breed_reference_items
manufacturer_catalog_items
active_ingredient_catalog_items
condition_catalog_items
product_catalog_items
product_active_ingredients
treatment_protocols
treatment_protocol_items
treatment_protocol_doses
image_collections
image_collection_items
```

Tabelas nativas auxiliares:

```text
blobs
database_manifest
permanent_deletion_logs
system_audit_logs
```

Regra: movimentacao de arquivos nao deve alterar schema. Se alterar tabela,
coluna, indice, FK, `CHECK`, seed com significado persistente ou `user_version`,
seguir `docs/database-versioning.md`.

## Ordem Recomendada

### Fase 0: Baseline

Antes de mover:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Registrar `git status --short`.

### Fase 1: Workspace Sem Extracao Logica

Criar a casca:

```text
Cargo.toml
pnpm-workspace.yaml
apps/vet-app/
packages/types/
packages/ui/
packages/core-rust/
packages/core-local/
packages/modules/
server-open/
```

Mover o app inteiro:

```text
src -> apps/vet-app/src
src-tauri -> apps/vet-app/src-tauri
static -> apps/vet-app/static
```

Objetivo da fase: compilar exatamente o mesmo app em novo caminho.

### Fase 2: Extrair `packages/types`

Mover apenas contratos puros, sem Tauri/Svelte/SQLite.

Prioridade:

1. owner/pet/medical-record/treatment, ja colocando tratamentos sob
   `medical_records`;
2. image collection;
3. search;
4. practice profile.

### Fase 3: Extrair `packages/ui`

Mover componentes visuais genericos:

1. `components/ui`;
2. `components/forms`;
3. componentes shared sem regra de negocio;
4. tokens CSS reaproveitaveis.

### Fase 4: Extrair `packages/core-local`

Mover ponte TS local:

1. `native`;
2. preferencias;
3. i18n comum;
4. cliente SQLite e adaptadores estritamente necessarios;
5. media generica;
6. import/export/backup TS.

Manter `migrations.ts` e `schema-migrations/` no app. A separacao profunda
entre criacao de banco, migracao de banco e arquivos por banco/modulo acontece
em fase propria, depois de `medical_records` e do plano FHIR.

### Fase 5: Extrair `packages/core-rust`

Mover o motor Rust:

1. `storage`;
2. `distribution`;
3. `replication`;
4. contratos Rust compartilhados;
5. comandos Tauri ficam registrados no app, chamando funcoes do crate.

Objetivo: `apps/vet-app/src-tauri` vira casca fina.

### Fase 6: Extrair `packages/modules`

Mover modulos nesta ordem:

1. `knowledge`, por ser mais leitura/defaults;
2. `registry`;
3. `medical_records`, ja mantendo tratamentos, vacinas, antiparasitarios,
   prescricoes, exames e procedimentos dentro da fronteira do modulo clinico;
4. analytics apenas se for realmente reutilizavel.

`diagnostics` nasce quando houver fluxo real de geracao, emissao ou
processamento de exames/laudos/imagens, especialmente para servir `vet-app` e
`lab-app`.

Depois de cada modulo, rodar:

```sh
npm run check
npm run test:run
```

Objetivo desta fase: criar a fronteira modular correta sem redesenhar ainda o
modelo interno de prontuarios.

### Fase 7: Refatorar `medical_records`

Executar [Plano De Refatoracao De Prontuarios Para Timeline Clinica](medical-records-timeline-refactor.md)
dentro do modulo `medical_records` ja extraido.

Esta fase redesenha:

- schema de `medical_records`, `medical_record_encounters` e
  `medical_record_blocks`;
- tabelas especificas dos blocos;
- repositorios e services;
- UI de timeline no perfil do pet;
- tratamentos, prescricoes, exames e procedimentos como blocos clinicos;
- conversao de dados por `adopt-version-db-p2.mjs`.

### Fase 8: Planejar Intercambio FHIR

Executar [Plano De Intercambio FHIR Via Distribution](fhir-interchange-distribution-plan.md)
como formato geral de importacao/exportacao do software, dentro de
`distribution`.

### Fase 9: Refatorar `persistence/sqlite`

Separar a persistencia SQLite em arquivos e responsabilidades mais claros:

- criacao de bancos separada de migracao de bancos;
- schema operacional separado dos bancos de sistema, midia e demais bancos;
- arquivos por banco e por conjunto de tabelas;
- migrations pequenas, ordenadas e rastreaveis;
- repositorios continuando a depender de contratos publicos dos modulos;
- sem redesenhar regras clinicas nesta fase.

Esta fase acontece depois do workspace modular, depois da refatoracao de
`medical_records` e depois do plano FHIR, porque nesse ponto os limites reais
de schema e interoperabilidade ja estao mais claros.

### Fase 10: Apps Futuros

Criar `lab-app`, `customer-app`, `store-app`, `cleaner-app` e `pharma-app`
somente quando houver um fluxo minimo real. Eles devem consumir os packages,
nao puxar codigo interno de `apps/vet-app`.

## Arquivos Grandes Para Cuidado Especial

| Arquivo | Por que exige cuidado |
| --- | --- |
| `src/lib/persistence/sqlite/migrations.ts` | Schema, seed, indices, deteccao e migracao em um arquivo grande. |
| `src/lib/services/clinic.service.ts` | Boot, dashboard, busca global e agregacao de catalogos. |
| `src/lib/stores/clinic.svelte.ts` | Estado reativo principal da home. |
| `src/routes/+page.svelte` | Setup/home/dashboard inicial. |
| `src/routes/formulary/+page.svelte` | Explorer de conhecimento com muitos filtros. |
| `src/routes/owners/[id]/+page.svelte` | Tela grande de tutor. |
| `src/routes/pets/[petId]/+page.svelte` | Perfil do pet combinando cadastro e clinico. |
| `src/routes/settings/products/+page.svelte` | Admin de catalogo com imagens. |
| `src/routes/settings/protocols/+page.svelte` | Protocolos clinicos e doses. |
| `src-tauri/src/lib.rs` | Registro de todos os comandos Tauri. |
| `src-tauri/src/storage/data.rs` | `StorageManager`, caminhos e conexoes. |

## Guardrails

- `packages/types` nao importa nenhum outro package local.
- `packages/ui` pode importar `types`, mas nao deve importar app especifico.
- `packages/core-rust` nao conhece apps.
- `packages/core-local` pode importar `types` e chamar comandos Tauri, mas nao
  conhece rotas de app.
- `packages/modules` pode importar `types`, `ui` e `core-local`.
- Modulos de negocio em `packages/modules` devem evitar imports internos entre
  irmaos; quando houver cruzamento, compor no app ou usar contratos/eventos.
- Excecao controlada: `medical_records/exams` pode importar apenas a API publica
  minima de `diagnostics` para contratos, abertura de arquivos e estruturacao de
  dados de exames/laudos/imagens.
- Dentro de `medical_records`, subdominios clinicos podem conversar por
  contratos internos do proprio modulo; `timeline` e a camada de composicao.
- `apps/vet-app` pode importar todos os packages.
- Outros apps futuros nao podem importar codigo de `apps/vet-app`.
- `server-open` compartilha contratos por `packages/types`; nao deve depender
  de UI ou Tauri.

## Checks Funcionais Apos Movimentos

Fluxos minimos:

- abrir app sem banco e criar nova base;
- importar base nativa;
- criar tutor;
- editar tutor;
- criar pet;
- abrir pet e ver prontuarios/tratamentos;
- criar/editar prontuario;
- abrir catalogo de produtos/fabricantes/principios ativos/condicoes/racas;
- salvar produto de usuario;
- salvar protocolo;
- exportar pacote nativo;
- exportar CSV;
- configurar backup;
- abrir caminho exportado/backup no gerenciador de arquivos;
- restaurar item da lixeira;
- fazer exclusao definitiva.

Checks:

```sh
npm run check
npm run test:run
npm run build
cargo check --manifest-path apps/vet-app/src-tauri/Cargo.toml
```

Enquanto o app ainda estiver no caminho atual:

```sh
cargo check --manifest-path src-tauri/Cargo.toml
```

Se mexer em schema ou scripts de adocao:

```sh
cd legacy-to-sqlite
npm run adopt:version
```

## Perguntas A Fechar Antes Da IA Mover Codigo

1. O workspace vai usar `pnpm` ou `bun` como gerenciador principal?
2. O repo atual sera convertido in-place para `veterinary-apps` ou o app sera
   movido para um novo repositorio?
3. `migrations.ts` deve continuar pertencendo ao `vet-app` inicialmente?
4. `analytics` sera package reutilizavel ou composicao exclusiva do `vet-app`?
5. `practice-profile` fica em `core-local/practice` ou vira modulo proprio?
6. As URLs atuais do `vet-app` devem ser preservadas no primeiro lancamento do
   workspace?

## Ordem De Leitura Para Outra IA

1. `README.pt-BR.md`
2. `docs/architecture.md`
3. `docs/storage-architecture.md`
4. `docs/database-versioning.md`
5. `src/lib/persistence/sqlite/client.ts`
6. `src/lib/persistence/sqlite/migrations.ts`
7. `src-tauri/src/lib.rs`
8. `src/lib/services/clinic.service.ts`
9. `src/lib/stores/clinic.svelte.ts`
10. Este documento
11. `docs/plans/fases.md`
12. `docs/plans/medical-records-timeline-refactor.md`
13. `docs/plans/fhir-interchange-distribution-plan.md`
14. `docs/plans/server-open-plan.md`
