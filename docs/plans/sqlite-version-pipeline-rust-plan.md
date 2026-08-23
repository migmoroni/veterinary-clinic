# Plano Da Fase 1.1: Esteira De Versão SQLite Em Rust

## Objetivo

Centralizar no Rust a leitura, classificação e decisão inicial sobre versões de schema dos bancos SQLite.

Esta fase cria uma esteira simples e explícita:

```text
version = 0 ou version < atual  -> migration_required
version = atual                 -> current
version > atual                 -> from_future
```

Bancos antigos ou sem versão não são consumidos diretamente. Eles entram em uma esteira de migração. Bancos na versão atual podem ser consumidos. Bancos de versão superior são recusados.

## Resultado Esperado

Ao final desta fase:

- o Rust possui um classificador único de versão de schema;
- `storage`, `distribution` e futuros migrators usam a mesma regra;
- bancos novos continuam nascendo com `PRAGMA user_version` atual;
- bancos existentes com versão menor que a atual não são tratados como erro fatal;
- bancos com versão superior à suportada continuam sendo recusados;
- mídia e logs recebem a versão atual pelo Rust quando o schema é reconhecido;
- `user/main` e `system/main` podem continuar sendo migrados pelo TypeScript enquanto a migração total para Rust não ocorre.

## Regra De Versão

Todo banco SQLite tem versão técnica própria via `PRAGMA user_version`.

Estados:

| Estado | Condição | Ação |
| --- | --- | --- |
| `current` | `version === targetVersion` | Pode ser consumido. |
| `migration_required` | `version >= 0 && version < targetVersion` | Deve passar pela esteira de migração do banco. |
| `from_future` | `version > targetVersion` | Recusar abertura ou importação quando o banco fizer parte de pacote importável. |

`version = 0` é tratado como versão anterior à atual. Ele representa banco antigo, não versionado ou recém-criado antes do carimbo técnico.

## Estrutura Recomendada

```text
packages/engine/src/storage/
├── schema_version.rs
├── sqlite.rs
└── ...
```

`schema_version.rs` deve concentrar:

```rust
pub(crate) enum SchemaVersionStatus {
    Current,
    MigrationRequired { from: i64, to: i64 },
    FromFuture { found: i64, supported: i64 },
}

pub(crate) fn read_schema_version(connection: &Connection) -> Result<i64, String>;

pub(crate) fn classify_schema_version(
    current_version: i64,
    target_version: i64,
) -> SchemaVersionStatus;

pub(crate) fn set_schema_version(
    connection: &Connection,
    version: i64,
) -> Result<(), String>;

pub(crate) fn ensure_not_from_future(
    status: SchemaVersionStatus,
) -> Result<SchemaVersionStatus, String>;
```

O nome pode variar, mas a responsabilidade deve ficar concentrada em um ponto.

## Escopo Por Banco

### `user/media`

O Rust já cria o schema base do banco de mídia do usuário.

Nesta fase, ele deve:

- classificar versão;
- recusar versão futura;
- criar schema quando vazio;
- migrar/adotar para a versão atual quando o schema existente for reconhecido;
- gravar `CURRENT_USER_MEDIA_SCHEMA_VERSION` após migração/adoption.

### `system/media`

O Rust já cria o schema base do banco de mídia do sistema.

Nesta fase, ele deve:

- classificar versão;
- recusar versão futura;
- criar schema quando vazio;
- migrar/adotar para a versão atual quando o schema existente for reconhecido;
- gravar `CURRENT_SYSTEM_MEDIA_SCHEMA_VERSION` após migração/adoption.

### `user/logs`

O Rust já cria o schema base do banco de logs do usuário.

Nesta fase, ele deve:

- classificar versão;
- recusar versão futura;
- criar schema quando vazio;
- migrar/adotar para a versão atual quando o schema existente for reconhecido;
- gravar `CURRENT_USER_LOGS_SCHEMA_VERSION` após migração/adoption;
- manter `database_manifest.schema_version` como versão lógica do manifesto, separada do `PRAGMA user_version`.

### `user/main`

O Rust pode classificar a versão para validar importação/exportação e preparar a migração futura.

Enquanto as migrations de `user/main` vivem em TypeScript:

- `version < CURRENT_USER_MAIN_SCHEMA_VERSION` deve ser classificado como `migration_required`;
- a execução da migration continua no migrator atual;
- `version > CURRENT_USER_MAIN_SCHEMA_VERSION` deve ser recusado.

### `system/main`

O banco `system/main` não faz parte de importação/exportação de dados do usuário.
Seu ciclo de vida é interno ao sistema: criação local, validação de versão,
atualização controlada pelo app.

Enquanto as migrations de `system/main` vivem em TypeScript:

- `version < CURRENT_SYSTEM_MAIN_SCHEMA_VERSION` deve ser classificado como `migration_required`;
- a execução da migration continua no migrator atual;
- `version > CURRENT_SYSTEM_MAIN_SCHEMA_VERSION` deve ser recusado.

O estado `migration_required` em `system/main` significa atualização do banco de
referência do sistema, não importação de pacote do usuário.

## Ajustes Em `storage/sqlite.rs`

O fluxo de abertura deve ficar conceitualmente assim:

```text
open connection
apply pragmas
read PRAGMA user_version
classify version

if from_future:
  error

if current:
  ensure schema invariants
  return connection

if migration_required:
  run banco-specific migration/adoption
  set PRAGMA user_version = target
  validate schema invariants
  return connection
```

Para bancos vazios, a criação do schema é a migration inicial.

Para mídia/logs existentes com `version = 0`, a esteira deve reconhecer o schema atual quando possível e apenas carimbar a versão atual.

## Ajustes Em Distribution

`packages/engine/src/distribution/sqlite.rs` deve usar o mesmo classificador.

Distribution trata apenas o bundle de dados do usuário:

```text
user/main
user/media
user/logs
```

`system/main` e `system/media` não são exportados nem importados por esses
fluxos.

Na importação native:

- `from_future` recusa;
- `current` permite;
- `migration_required` deve direcionar para a esteira de migração/adoption do banco antes de substituir os bancos ativos.

Na importação CSV:

- bancos gerados devem nascer com a versão atual;
- a validação final deve resultar em `current`.

Na exportação:

- native preserva o `PRAGMA user_version`;
- CSV gera bancos temporários na versão atual durante importação.

Para bancos `system`, o classificador é usado no ciclo de vida interno do
storage, não em distribution.

## Relação Com TypeScript

O TypeScript continua podendo executar migrations de `user/main` e `system/main` nesta etapa.

A decisão arquitetural é:

- Rust passa a ser o dono da classificação de versão;
- TypeScript deixa de ter regras próprias divergentes;
- enquanto uma migration ainda mora em TypeScript, o Rust pode retornar ou permitir o estado `migration_required` para que o migrator TS rode;
- mídia e logs ficam sob responsabilidade efetiva do Rust.

## Testes Necessários

Adicionar testes Rust para:

- `classify_schema_version(0, 1) -> MigrationRequired`;
- `classify_schema_version(1, 1) -> Current`;
- `classify_schema_version(2, 1) -> FromFuture`;
- banco `user/media` vazio nasce com versão atual;
- banco `system/media` vazio nasce com versão atual;
- banco `user/logs` vazio nasce com versão atual;
- banco `user/media` com schema reconhecido e `version = 0` passa para versão atual;
- banco `system/media` com schema reconhecido e `version = 0` passa para versão atual;
- banco `user/logs` com schema reconhecido e `version = 0` passa para versão atual;
- banco de mídia/logs com versão futura é recusado;
- validação native classifica cada banco do bundle de usuário contra a versão correta.

Adicionar ou ajustar testes TypeScript somente quando necessário para confirmar que as fachadas públicas atuais continuam estáveis.

## Validação

Executar:

```sh
cargo check
cargo test
npm run check
npm run test:run
```

Quando o ambiente não tiver runtime JavaScript disponível, registrar essa limitação e rodar ao menos:

```sh
cargo check
cargo test
git diff --check
```

## Critérios De Aceite

- Existe um classificador único de versão no Rust.
- `version = 0` e versões menores que a atual entram em `migration_required`.
- versões iguais à atual entram em `current`.
- versões superiores entram em `from_future` e são recusadas.
- mídia e logs recebem a versão atual pelo Rust quando o schema é reconhecido.
- `user/main` e `system/main` continuam usando as migrations TypeScript atuais.
- Distribution deixa de validar versões com lógica booleana e passa a usar a classificação comum.
- Nenhuma alteração de schema de domínio é introduzida.
