# Plano De Separação SQLite Em Create, Migrations E Operations

## Objetivo

Organizar `packages/core-local/src/sqlite` em três fronteiras explícitas:

- `create`: prepara cada banco para uso, criando o schema atual ou chamando o runtime dono daquele banco;
- `migrations`: executa migrações incrementais entre versões;
- `operations`: concentra as operações do dia a dia sobre bancos já preparados.

A mudança preserva o schema de domínio, as versões de banco e as fachadas públicas atuais.

## Modelo Mental

O app não decide se um banco é preparado por TypeScript ou pelo `engine`. Ele passa pela fronteira correta:

```text
app
-> sqlite/client.ts
-> sqlite/create/*
-> TypeScript ou engine, conforme o dono do banco
```

`create` responde como o banco nasce e fica pronto para uso.

`migrations` responde como um banco muda de uma versão para outra.

`operations` responde como o app usa o banco depois que ele está pronto.

## Estrutura Alvo

```text
packages/core-local/src/sqlite/
├── client.ts
├── media.ts                         # fachada pública estável
├── migrations.ts                    # fachada pública estável
├── schema-versions.ts
│
├── create/
│   ├── shared/
│   │   ├── catalog-entities.ts
│   │   ├── catalog-sql.ts
│   │   ├── integrity.ts
│   │   ├── schema-version.ts
│   │   ├── sql-utils.ts
│   │   ├── table-introspection.ts
│   │   └── types.ts
│   │
│   ├── user/
│   │   ├── main/
│   │   │   ├── assertions.ts
│   │   │   ├── cleanup-system-data.ts
│   │   │   ├── indexes.ts
│   │   │   └── schema.ts
│   │   │
│   │   ├── media/
│   │   │   ├── profile.ts
│   │   │   └── schema.ts
│   │   │
│   │   └── logs/
│   │       ├── profile.ts
│   │       └── schema.ts
│   │
│   └── system/
│       ├── main/
│       │   ├── assertions.ts
│       │   ├── indexes.ts
│       │   ├── refresh.ts
│       │   ├── schema.ts
│       │   └── seeds.ts
│       │
│       └── media/
│           ├── profile.ts
│           └── schema.ts
│
├── migrations/
│   ├── profiles.ts
│   ├── runner.ts
│   ├── status.ts
│   │
│   ├── user/
│   │   ├── main/
│   │   │   ├── baseline.ts
│   │   │   ├── registry.ts
│   │   │   └── versions/
│   │   │
│   │   ├── media/
│   │   │   └── registry.ts
│   │   │
│   │   └── logs/
│   │       └── registry.ts
│   │
│   └── system/
│       ├── main/
│       │   └── registry.ts
│       │
│       └── media/
│           └── registry.ts
│
└── operations/
    └── media/
        ├── hash.ts
        ├── repository.ts
        ├── sql.ts
        ├── thumbnail.ts
        └── types.ts
```

As pastas podem omitir arquivos vazios. Quando um banco não possui migrações incrementais em TypeScript, o `registry.ts` pode exportar uma lista vazia e documentar o dono do runtime via tipos constantes.

## Regras De Responsabilidade

### `create`

`create` contém o estado atual conhecido de cada banco:

- DDL do schema atual;
- índices atuais;
- assertions do schema atual;
- seeds necessários para preparar `system/main`;
- descrições de bancos preparados pelo `engine`;
- funções `ensure*Database` quando a preparação é acionada pelo TypeScript.

Para bancos preparados pelo `engine`, `create` declara a fronteira usada pelo app e não duplica o runtime nativo.

### `migrations`

`migrations` contém apenas a esteira de mudança de versão:

- status de schema;
- registry de migrações;
- baseline;
- execução transacional de migrações incrementais;
- backfill de metadata de migration;
- composição com `create` após aplicar migrações.

`migrations` pode chamar `create` para materializar ou validar o schema atual.
`create` não deve depender de `migrations`.

### `operations`

`operations` contém uso operacional de banco já preparado:

- repositórios;
- SQL de leitura/escrita de rotina;
- hash e normalização de mídia;
- thumbnail;
- comandos Tauri relacionados ao uso de mídia;
- helpers que não criam nem migram schema.

`operations` não cria banco implicitamente. Quem prepara banco é `client.ts` por meio de `create`.

## Fluxo De Abertura Dos Bancos

### `user/main`

```text
client.ts
-> create/user/main
-> migrations/user/main, quando houver versão a aplicar
-> create/user/main/assertions
```

O schema atual continua em TypeScript.

### `system/main`

```text
client.ts
-> create/system/main
-> refresh/schema/seeds/indexes
```

`system/main` continua sendo preparado em TypeScript. Seus dados são públicos e
controlados pelo app.

### `user/media`

```text
client.ts
-> create/user/media
-> engine, quando aberto pelo storage nativo
-> operations/media para uso cotidiano
```

`create/user/media` mantém a descrição TypeScript do schema e a fronteira com o
`engine`.

### `system/media`

```text
client.ts
-> create/system/media
-> engine, quando aberto pelo storage nativo
-> operations/media para uso cotidiano
```

`system/media` não recebe campos exclusivos de mídia do usuário.

### `user/logs`

```text
client.ts
-> create/user/logs
-> engine
```

`user/logs` é banco do `engine`. Em TypeScript, `create/user/logs` declara a
descrição usada pelo app e pelo perfil de banco.

## Fachadas Públicas

As fachadas permanecem estáveis:

```text
@vet/core-local/sqlite/client.js
@vet/core-local/sqlite/media.js
@vet/core-local/sqlite/migrations.js
```

`sqlite/media.ts` reexporta a API operacional de `operations/media` e, quando necessário, funções de criação de mídia usadas por `client.ts`.

`sqlite/migrations.ts` reexporta a API pública de status e runner, mas sua implementação fica em `migrations/runner.ts` e `migrations/status.ts`.

## Ordem De Execução

1. Criar `sqlite/create` e mover para lá os módulos que representam schema atual.
2. Mover utilitários compartilhados de schema para `create/shared` quando forem usados por criação/assertions.
3. Criar `sqlite/operations/media` e mover para lá hash, thumbnail, repository, comandos Tauri e SQL operacional.
4. Separar SQL operacional de mídia em `operations/media/sql.ts`.
5. Manter DDL de mídia em `create/user/media/schema.ts` e `create/system/media/schema.ts`.
6. Transformar `sqlite/media.ts` em fachada pública sobre `operations/media` e `create/*/media`.
7. Criar `migrations/runner.ts` e `migrations/status.ts`.
8. Manter registry incremental de `user/main` em `migrations/user/main`.
9. Mover `profiles.ts` para `migrations/profiles.ts` ou `create/profiles.ts`, escolhendo um único dono e mantendo os imports consistentes.
10. Ajustar `client.ts` para preparar bancos pela fronteira `create`.
11. Rodar validações.

## Regras De Importação

- `client.ts` pode importar `create`.
- `migrations` pode importar `create`.
- `operations` não importa `create`.
- `create` não importa `migrations`.
- `create/system/main/seeds.ts` pode usar `operations/media/repository.ts` quando precisa gravar mídia padrão em banco já preparado.
- `operations/media` pode importar apenas tipos, SQL operacional e helpers operacionais.
- `engine` não é importado diretamente por módulos de domínio; a chamada passa por `client.ts` ou por adaptadores nativos já existentes.

## Critérios De Aceite

- `sqlite/create` existe e contém a preparação de schema atual por banco.
- `sqlite/migrations` contém a esteira de mudança de versão, não o DDL completo do estado atual como responsabilidade principal.
- `sqlite/operations/media` contém a operação cotidiana de mídia.
- `sqlite/media.ts` e `sqlite/migrations.ts` continuam funcionando como fachadas públicas.
- `user/main`, `user/media`, `user/logs`, `system/main` e `system/media` aparecem explicitamente na estrutura.
- O app prepara bancos por `client.ts` e `create`, sem espalhar decisão de runtime pelas rotas ou repositórios.
- Nenhuma alteração de schema de domínio é introduzida.
- Nenhuma migration é portada para Rust nesta mudança.

## Validação

Executar:

```sh
npm run check
npm run test:run
cargo check
cargo test
git diff --check
```

Validar especificamente:

- criação de banco vazio `user/main`;
- criação de banco vazio `system/main`;
- abertura de `user/media`;
- abertura de `system/media`;
- abertura de `user/logs`;
- recusa de versão futura;
- adoção de banco atual sem versão quando aplicável;
- importação native;
- importação CSV;
- exportação native;
- exportação CSV.
