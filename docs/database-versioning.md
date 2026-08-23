# Versionamento De Banco E Ritual De Lançamento

O app separa duas versões:

- Versão do app: SemVer público mostrado ao usuário e armazenado em
  `package.json`, Tauri e Cargo.
- Versão da estrutura SQLite: inteiro armazenado em `PRAGMA user_version`.

O banco atual não versionado é adotado como estrutura `v1`. Futuras versões de
estrutura devem ser `v2`, `v3` e assim por diante.

## Contrato Em Execução

O conjunto do usuário em execução fica na área de dados/configuração do Tauri como:

- `veterinary_clinic_user.db`
- `veterinary_clinic_user_media.db`
- `veterinary_clinic_user_logs.db`
- `vault/user/**`

O app possui migrações para bancos que já pertencem à linhagem de estrutura atual.
Bancos de sistema/referência são gerados separadamente pelo app e não fazem
parte de importação/exportação de usuário.

O migrator vive em `packages/core-local/src/sqlite/migrations.ts` e define:

- `CURRENT_SCHEMA_VERSION`;
- runner de migração;
- detecção de suporte/status;
- transação, metadados e validação de integridade.

Migrações incrementais ficam em `packages/core-local/src/sqlite/schema-migrations`:

- `types.ts` define o contrato `SchemaMigration`;
- `registry.ts` importa e ordena migrações `v2+`;
- `versions/` armazena um arquivo por versão depois da linha-base.

`migrations.ts` possui a linha-base `v1` porque cria a estrutura atual do zero.
Futuras migrações não devem ser implementadas dentro de `migrations.ts`; coloque
o corpo em `schema-migrations/versions`.

A conexão SQLite em runtime passa pela ponte Tauri de `storage`. Repositórios
da UI chamam comandos Tauri de storage, e o Rust executa SQL via `rusqlite`.

O sistema de migração também define:

- `schema_migrations`;
- validação de integridade.

`PRAGMA user_version` é a versão autoritativa da estrutura. A tabela
`schema_migrations` é a trilha de auditoria:

```sql
CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  app_version TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Fluxo De Inicialização

`packages/core-local/src/sqlite/client.ts` abre o banco por comandos Rust de storage:

1. pede ao `StorageManager` para abrir/reabrir `veterinary_clinic_user.db`;
2. ativa foreign keys;
3. detecta status da estrutura pelos utilitários de migração;
4. se migração ou adoção for necessária, faz checkpoint WAL, fecha a conexão
   Rust e cria uma cópia local pré-migração;
5. reabre a conexão Rust;
6. roda migrações em transação `BEGIN IMMEDIATE` por comandos de storage;
7. valida `PRAGMA integrity_check` e `PRAGMA foreign_key_check`;
8. faz commit apenas se todas as etapas tiverem sucesso;
9. abre/configura `veterinary_clinic_user_media.db`,
   `veterinary_clinic_system.db` e `veterinary_clinic_system_media.db`.

Se uma migração falhar, a transação é revertida e a cópia pré-migração continua
disponível.

## Estados Suportados

- Banco vazio: cria a estrutura atual e registra `v1`.
- Banco atual não versionado: adotado como `v1` sem reconstruir dados.
- Banco versionado antigo: migrações são aplicadas sequencialmente até
  `CURRENT_SCHEMA_VERSION`.
- Banco futuro: recusado com erro de app desatualizado.
- Banco não versionado desconhecido: recusado. Não adicionar tradutores de
  formatos anteriores ao migrador de execução.

## Importações, Exportações E Replicação

Importação/exportação completa vive em `packages/engine/src/distribution`. Pacotes
nativos carregam os três bancos do usuário e arquivos CAS. Pacotes CSV carregam
`data_csv/`, `media_csv/`, `logs_csv/` e arquivos CAS do usuário.

A identidade da base e o manifesto do pacote vivem em
`veterinary_clinic_user_logs.db`, tabela `database_manifest`; não há
`manifest.json` solto.

Backup/sincronização contínua vive em `packages/engine/src/replication` e usa SQLite
Session changesets em vez de instantâneos completos.

## Quando Uma Nova Versão De Estrutura É Necessária

Crie uma nova migração sempre que uma mudança afetar estrutura persistente ou
semântica de dados já salvos, incluindo:

- adicionar, renomear ou remover tabelas ou colunas;
- adicionar ou alterar índices necessários ao comportamento;
- alterar `CHECK`, `UNIQUE` ou foreign keys;
- mover dados entre tabelas;
- transformar valores existentes;
- alterar significado salvo de uma coluna existente;
- alterar dados default de catálogo/protocolo de forma que precise atualizar
  linhas já existentes.

Não crie migração de estrutura para:

- mudanças apenas de UI;
- utilitários puros de TypeScript/domínio;
- rotinas idempotentes de seed que só inserem defaults ausentes sem mudar linhas
  existentes;
- scripts externos pontuais de conversão.

## Como Adicionar Uma Migração

Nunca edite uma migração que já foi enviada a um cliente. Adicione uma nova.

1. Decida a próxima versão inteira de estrutura.
2. Crie um arquivo em `packages/core-local/src/sqlite/schema-migrations/versions`,
   como `0002_add_field_to_table.ts`.
3. Exporte um objeto `SchemaMigration`.
4. Importe-o em `packages/core-local/src/sqlite/schema-migrations/registry.ts`.
5. Adicione-o a `incrementalSchemaMigrations`.
6. Incremente `CURRENT_SCHEMA_VERSION` em
   `packages/core-local/src/sqlite/migrations.ts`.
7. Defina `introducedInAppVersion` com a versão do app que leva a migração.
8. Implemente `up(database)`.
9. Adicione `verify(database)` quando houver invariantes importantes.
10. Adicione testes de upgrade a partir da versão anterior.
11. Rode as verificações completas de lançamento.

Nomes de migração devem seguir:

```text
0001_baseline_current_schema
0002_add_x_to_y
0003_migrate_old_field_to_new_table
```

Formato de exportação do arquivo:

```ts
import type { SchemaMigration } from '../types.js';

export const migration0002AddXToY = {
  version: 2,
  name: '0002_add_x_to_y',
  introducedInAppVersion: '2.1.0',
  async up(database) {
    await database.execute('ALTER TABLE example ADD COLUMN x TEXT');
  },
  async verify(database) {
    // Verificações opcionais.
  }
} satisfies SchemaMigration;
```

O registry valida versões duplicadas, lacunas e migrações acima de
`CURRENT_SCHEMA_VERSION`.

Para alterações complexas de tabela SQLite, prefira o padrão seguro de rebuild:

1. criar uma nova tabela com a estrutura desejada;
2. copiar dados da tabela antiga;
3. validar contagens e relacionamentos;
4. remover a tabela antiga;
5. renomear a nova tabela;
6. recriar índices e triggers;
7. rodar verificações específicas da migração.

## Ritual De Versionamento

Use um comando para alterar a versão pública do app:

```sh
pnpm version:bump -- minor "Adicionar migracao de estrutura para protocolos vacinais"
```

Escolha `major`, `minor` ou `patch` conforme o impacto do lançamento. A nota pode
ser passada como string posicional ou com `--change` repetido:

```sh
pnpm version:bump -- patch --change "Corrigir validacao de importacao de backup" --change "Melhorar metadados do pacote Linux"
```

O script atualiza:

- `package.json`;
- `pnpm-lock.yaml` não é editado pelo script e permanece válido quando somente as
  versões dos manifests locais mudam;
- `apps/vet-app/src-tauri/tauri.conf.json`;
- `apps/vet-app/src-tauri/Cargo.toml`;
- entrada do pacote no `Cargo.lock`;
- `packages/core-local/src/generated/app-version.ts`;
- `CHANGELOG.md`;
- `apps/vet-app/src-tauri/metainfo/io.github.migmoroni.VeterinaryClinic.metainfo.xml`.

A UI mostra a versão em Ajustes. No Tauri, lê a versão de execução; em dev/web,
usa o fallback gerado.

## Verificações Obrigatórias Antes De Lançamento

Antes de enviar um pacote com mudança de banco:

```sh
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

Também testar:

- criação de banco vazio novo;
- abertura e migração do banco de produção anterior;
- preservação de tutores, pets, prontuários, vacinas, tratamentos
  antiparasitários e ajustes;
- criação da cópia pré-migração;
- recusa de versão futura de estrutura;
- importação SQLite de toda versão suportada;
- exportação/importação CSV com logs e manifesto;
- pacote Tauri da plataforma alvo do cliente.

## Linha-Base Atual

Estrutura `v1` é a primeira versão formal de estrutura. Ela representa a estrutura
SQLite atual na versão `0.2.0` do app, antes de futuras migrações incrementais.
