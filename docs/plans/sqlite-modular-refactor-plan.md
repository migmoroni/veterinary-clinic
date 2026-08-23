# Plano De Versionamento E Refatoração Modular Do SQLite

## Objetivo

Organizar `packages/core-local/src/sqlite` em uma arquitetura de migrations por banco, com versionamento independente para cada arquivo SQLite usado pelo app.

O plano é dividido em três partes:

1. formalizar versão técnica para todos os bancos;
2. centralizar a esteira de versão SQLite no Rust;
3. refatorar a estrutura interna de migrations em pastas menores por escopo.

A refatoração preserva o comportamento funcional do app. Alterações de schema de domínio, novas tabelas de produto ou mudanças em campos clínicos ficam fora deste plano.

## Bancos Versionados

Cada arquivo SQLite deve ter versão própria via `PRAGMA user_version`.

```text
user/main      veterinary_clinic_user.db
user/media     veterinary_clinic_user_media.db
user/logs      veterinary_clinic_user_logs.db
system/main    banco de referência system
system/media   banco de mídia system
```

Os bancos `system/main` e `system/media` não fazem parte de importação ou
exportação de dados do usuário. Seu ciclo de vida é interno ao sistema: criação,
validação de versão, atualização controlada pelo app.

Versões sugeridas:

```ts
CURRENT_USER_MAIN_SCHEMA_VERSION
CURRENT_USER_MEDIA_SCHEMA_VERSION
CURRENT_USER_LOGS_SCHEMA_VERSION
CURRENT_SYSTEM_MAIN_SCHEMA_VERSION
CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
```

O versionamento técnico do SQLite vive no `PRAGMA user_version`. Qualquer manifesto interno de produto continua tendo papel próprio e não substitui a versão técnica do arquivo de banco.

## Parte 1: Versionamento Dos Bancos

### Objetivo

Adicionar e validar versão técnica em todos os bancos SQLite, antes de reorganizar os arquivos de migrations.

### Resultado Esperado

Ao final desta parte:

- cada banco possui `PRAGMA user_version` coerente com sua constante;
- cada banco recusa versões futuras;
- migrations e validações conhecem o tipo de banco que estão abrindo;
- o script `legacy-to-sqlite/adopt-version-db.mjs` gera os três bancos de usuário com suas versões;
- a criação dos bancos `system/main` e `system/media` também grava suas versões;
- importação, exportação e validação de pacotes consideram a versão correta de cada banco do bundle de usuário.

### Organização Alvo

```text
packages/core-local/src/sqlite/
├── schema-versions.ts
├── client.ts
├── media.ts
└── migrations.ts
```

Nesta parte, a estrutura pode continuar concentrada nos arquivos atuais. O objetivo é estabilizar a regra de versão antes da divisão modular.

### Ajustes No TypeScript

Criar `packages/core-local/src/sqlite/schema-versions.ts`:

```ts
export const CURRENT_USER_MAIN_SCHEMA_VERSION = 1;
export const CURRENT_USER_MEDIA_SCHEMA_VERSION = 1;
export const CURRENT_USER_LOGS_SCHEMA_VERSION = 1;
export const CURRENT_SYSTEM_MAIN_SCHEMA_VERSION = 1;
export const CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION = 1;
```

`migrations.ts` deve usar `CURRENT_USER_MAIN_SCHEMA_VERSION` no lugar da constante genérica atual.

`runMigrations` deve continuar migrando o banco `user/main`.

`runSystemMigrations` deve usar `CURRENT_SYSTEM_MAIN_SCHEMA_VERSION`.

`configureMediaDatabase` deve passar a validar e gravar versão conforme o banco:

```ts
configureMediaDatabase(database, 'user');
configureMediaDatabase(database, 'system');
```

Para `user/media`, usar `CURRENT_USER_MEDIA_SCHEMA_VERSION`.

Para `system/media`, usar `CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION`.

### Ajustes No Rust Engine

Os bancos criados diretamente pelo Rust também devem gravar `PRAGMA user_version`.

Em `packages/engine/src/storage/sqlite.rs`, o fluxo de abertura deve:

- aplicar PRAGMAs;
- criar o schema base do tipo de banco;
- validar versão futura;
- gravar a versão atual quando o banco estiver vazio ou sem versão;
- manter o manifesto de logs como responsabilidade própria do banco de logs.

Constantes equivalentes devem existir no Rust para:

```rust
CURRENT_USER_MEDIA_SCHEMA_VERSION
CURRENT_USER_LOGS_SCHEMA_VERSION
CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION
```

Se o banco `system/main` for migrado pelo TypeScript, sua constante permanece em `core-local`. Se algum fluxo nativo validar esse banco, a versão também deve ser conhecida no Rust.

### Script De Adoção

`legacy-to-sqlite/adopt-version-db.mjs` deve gravar versão nos três bancos de usuário que gera:

```text
veterinary_clinic_user.db
veterinary_clinic_user_media.db
veterinary_clinic_user_logs.db
```

O banco `user/main` usa `CURRENT_USER_MAIN_SCHEMA_VERSION`.

O banco `user/media` usa `CURRENT_USER_MEDIA_SCHEMA_VERSION`.

O banco `user/logs` usa `CURRENT_USER_LOGS_SCHEMA_VERSION`.

O pacote final gerado pelo script deve carregar bancos já versionados.

### Distribution, Importação E Exportação

Os fluxos de distribution devem validar a versão correta por banco do bundle de usuário.

Distribution inclui:

```text
user/main
user/media
user/logs
```

Distribution não inclui:

```text
system/main
system/media
```

Na importação native:

- `user/main` valida contra `CURRENT_USER_MAIN_SCHEMA_VERSION`;
- `user/media` valida contra `CURRENT_USER_MEDIA_SCHEMA_VERSION`;
- `user/logs` valida contra `CURRENT_USER_LOGS_SCHEMA_VERSION`.

Na importação CSV:

- o banco `user/main` recebe versão de `user/main`;
- o banco `user/media` recebe versão de `user/media`;
- o banco `user/logs` recebe versão de `user/logs`.

Na exportação native e CSV, os bancos de usuário exportados devem preservar o `PRAGMA user_version`.

### Validação Da Parte 1

Executar:

```sh
npm run check
npm run test:run
cargo check
```

Validar especificamente:

- banco `user/main` vazio recebe versão correta;
- banco `system/main` vazio recebe versão correta;
- banco `user/media` vazio recebe versão correta;
- banco `system/media` vazio recebe versão correta;
- banco `user/logs` vazio recebe versão correta;
- banco com versão futura é recusado no fluxo correto;
- `legacy-to-sqlite/adopt-version-db.mjs` gera três bancos de usuário com `PRAGMA user_version > 0`;
- importação native recusa pacote com versão futura em qualquer banco do bundle de usuário;
- importação CSV cria bancos versionados.

## Parte 1.1: Esteira De Versão Em Rust

Antes da refatoração modular, a decisão sobre versão deve ser centralizada no
Rust.

Plano dedicado:

[sqlite-version-pipeline-rust-plan.md](sqlite-version-pipeline-rust-plan.md)

Regra:

```text
version = 0 ou version < atual  -> migration_required
version = atual                 -> current
version > atual                 -> from_future
```

`migration_required` entra na esteira de migração/adoption do banco. `current`
pode ser consumido. `from_future` é recusado.

## Parte 2: Refatoração Modular Das Migrations

### Objetivo

Dividir a implementação de migrations, schemas, índices, validações e seeds em arquivos menores, organizados por dono do banco.

Esta parte usa o versionamento criado na Parte 1 como base.

A separação final entre criação, migração e operação é detalhada em:

[sqlite-create-migrations-operations-plan.md](sqlite-create-migrations-operations-plan.md)

### Limite Técnico Da Parte 2

Esta parte mantém em TypeScript as migrations e rotinas de schema que vivem em
`packages/core-local/src/sqlite`, incluindo `user/main`, `system/main` e a
fachada atual de mídia.

O Rust segue responsável pelas áreas que pertencem ao `engine`:

- classificação de versão SQLite;
- validação em fluxos de distribution;
- abertura e criação dos bancos controlados pelo storage nativo;
- esteira de versão para `user/media`, `system/media` e `user/logs` quando esses
  bancos são abertos pelo `engine`.

A refatoração organiza a implementação TypeScript atual em módulos menores, com
limites claros por banco e feature, sem criar nova estratégia de runtime.

### Estrutura Recomendada

```text
packages/core-local/src/sqlite/
├── client.ts
├── media.ts
├── migrations.ts
├── schema-versions.ts
│
├── migrations/
│   ├── shared/
│   │   ├── checks.ts
│   │   ├── constants.ts
│   │   ├── integrity.ts
│   │   ├── migration-runner.ts
│   │   ├── schema-status.ts
│   │   ├── sql-utils.ts
│   │   └── table-introspection.ts
│   │
│   ├── user/
│   │   ├── main/
│   │   │   ├── schema.ts
│   │   │   ├── indexes.ts
│   │   │   ├── assertions.ts
│   │   │   ├── cleanup-system-data.ts
│   │   │   └── features/
│   │   │       ├── registry.ts
│   │   │       ├── practice.ts
│   │   │       ├── medical-records.ts
│   │   │       ├── treatments.ts
│   │   │       ├── catalog-overrides.ts
│   │   │       ├── media-collections.ts
│   │   │       ├── settings.ts
│   │   │       └── backup.ts
│   │   │
│   │   ├── media/
│   │   │   ├── schema.ts
│   │   │   ├── assertions.ts
│   │   │   └── migrations.ts
│   │   │
│   │   └── logs/
│   │       ├── schema.ts
│   │       ├── assertions.ts
│   │       └── migrations.ts
│   │
│   └── system/
│       ├── main/
│       │   ├── schema.ts
│       │   ├── indexes.ts
│       │   ├── assertions.ts
│       │   ├── refresh.ts
│       │   ├── seeds.ts
│       │   └── features/
│       │       ├── knowledge.ts
│       │       ├── treatment-protocols.ts
│       │       └── media-collections.ts
│       │
│       └── media/
│           ├── schema.ts
│           ├── assertions.ts
│           └── migrations.ts
│
└── media/
    ├── index.ts
    ├── hash.ts
    ├── mime.ts
    ├── repository.ts
    ├── tauri-commands.ts
    └── thumbnail.ts
```

`migrations.ts` e `media.ts` permanecem como fachadas públicas.

Os imports públicos atuais continuam disponíveis:

```text
@vet/core-local/sqlite/client.js
@vet/core-local/sqlite/media.js
@vet/core-local/sqlite/migrations.js
```

### Organização De `user/main`

O banco operacional do usuário deve ficar dividido por capacidades:

| Arquivo | Responsabilidade |
| --- | --- |
| `user/main/features/registry.ts` | `owners`, `owner_additional_responsibles`, `contacts`, `pets`, `pet_owners` |
| `user/main/features/practice.ts` | `veterinarian_profiles`, `workplaces`, `addresses` |
| `user/main/features/media-collections.ts` | `image_collections`, `image_collection_items` |
| `user/main/features/medical-records.ts` | `medical_records` |
| `user/main/features/treatments.ts` | `treatment_protocols`, `treatment_protocol_items`, `treatment_protocol_doses`, `pet_treatments` |
| `user/main/features/catalog-overrides.ts` | `user_product_catalog_items` |
| `user/main/features/settings.ts` | `app_settings`, `schema_migrations` |
| `user/main/features/backup.ts` | `backup_history` |

Cada feature concentra criação de tabelas, índices e validação do próprio conjunto.

### Organização De `user/media`

O banco de mídia do usuário concentra:

- tabela `blobs`;
- metadados de thumbnail;
- controle de sync;
- soft delete;
- versão própria.

As funções públicas de mídia continuam disponíveis por `@vet/core-local/sqlite/media.js`.

### Organização De `user/logs`

O banco de logs do usuário concentra:

- `database_manifest`;
- `permanent_deletion_logs`;
- `system_audit_logs`;
- versão própria.

O manifesto continua representando identidade e estado lógico do pacote do usuário. A versão técnica do schema continua em `PRAGMA user_version`.

### Organização De `system/main`

O banco `system/main` deve ficar dividido por dados públicos versionados:

| Arquivo | Responsabilidade |
| --- | --- |
| `system/main/features/media-collections.ts` | `image_collections`, `image_collection_items` do banco `system` |
| `system/main/features/knowledge.ts` | raças, fabricantes, princípios ativos, condições, produtos e relações de ingredientes |
| `system/main/features/treatment-protocols.ts` | protocolos e doses de tratamentos fornecidos pelo sistema |
| `system/main/seeds.ts` | sincronização dos dados padrão no banco `system` |
| `system/main/refresh.ts` | detecção e reconstrução de schema `system` quando necessário |

### Organização De `system/media`

O banco de mídia do sistema concentra:

- tabela `blobs`;
- metadados de thumbnail;
- dados de upload/sync quando aplicável;
- versão própria.

Ele não deve carregar campos exclusivos de mídia do usuário, como `removed_at`, `updated_at` ou `updated_by`, salvo mudança explícita de schema em plano próprio.

## Perfis De Banco Por App

A refatoração deve preparar o código para perfis por app, mas o perfil completo do `vet-app` continua sendo o padrão.

Formato sugerido:

```ts
export interface SqliteDatabaseProfile {
	id: string;
	user: {
		main: readonly SqliteSchemaFeature[];
		media: readonly SqliteSchemaFeature[];
		logs: readonly SqliteSchemaFeature[];
	};
	system: {
		main: readonly SqliteSchemaFeature[];
		media: readonly SqliteSchemaFeature[];
	};
}
```

Perfil inicial:

```ts
export const vetAppDatabaseProfile = {
	id: 'vet-app',
	user: {
		main: [
			registryUserFeature,
			practiceUserFeature,
			mediaCollectionsUserFeature,
			medicalRecordsUserFeature,
			treatmentsUserFeature,
			catalogOverridesUserFeature,
			settingsUserFeature,
			backupUserFeature
		],
		media: [userMediaFeature],
		logs: [userLogsFeature]
	},
	system: {
		main: [
			mediaCollectionsSystemFeature,
			knowledgeSystemFeature,
			treatmentProtocolsSystemFeature
		],
		media: [systemMediaFeature]
	}
} satisfies SqliteDatabaseProfile;
```

O perfil define quais grupos de tabelas pertencem a cada app. O runner continua aplicando o perfil padrão do `vet-app`.

## Ordem De Execução Da Parte 2

1. Extrair utilitários compartilhados para `migrations/shared`.
2. Extrair `user/main` em schema, indexes, assertions e features.
3. Extrair `system/main` em schema, indexes, assertions, refresh, seeds e features.
4. Extrair `user/media` e `system/media`.
5. Extrair `user/logs`.
6. Criar tipos de perfil e perfil padrão do `vet-app`.
7. Ajustar runners para executar por banco e perfil.
8. Manter fachadas públicas estáveis.
9. Dividir `media.ts` em implementação interna menor.
10. Rodar checks e testes.

## Validação Obrigatória Da Parte 2

Executar:

```sh
npm run check
npm run test:run
cargo check
```

Validar especificamente:

- criação de banco vazio para cada tipo de banco;
- adoção de banco `user/main` atual sem versionamento;
- recusa de versão futura em cada banco;
- recusa de schema desconhecido quando aplicável;
- criação e preenchimento do banco `system/main`;
- abertura dos bancos `user/media`, `system/media` e `user/logs`;
- importação native;
- importação CSV;
- exportação native;
- exportação CSV.

## Critérios De Aceite

- Cada arquivo SQLite tem versão técnica própria.
- O `vet-app` abre e cria todos os bancos normalmente.
- Os imports públicos atuais continuam funcionando.
- Os testes de migration continuam passando.
- Os fluxos de distribution validam versões por banco.
- `legacy-to-sqlite/adopt-version-db.mjs` gera bancos de usuário versionados.
- `migrations.ts` deixa de concentrar a maior parte da implementação.
- `media.ts` deixa de concentrar DDL, hash, thumbnail, comandos Tauri e repository no mesmo arquivo.
- A estrutura permite perfis de banco para futuros apps.
- Nenhuma alteração de schema de domínio é introduzida por esta refatoração.
