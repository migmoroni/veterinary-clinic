# Veterinary Clinic

[English README](README.md) | Português

Veterinary Clinic é uma aplicação desktop local-first para rotinas de clínica
veterinária. O foco do projeto é manter dados clínicos sob posse local,
com importação/exportação explícita, backup contínuo por replicação e uma
arquitetura preparada para sincronização futura sem depender de um servidor para
funcionar.

Versão pública atual do app: `0.2.0`.

## Visão Rápida

O projeto é voltado a desenvolvedores. A documentação abaixo prioriza decisões
de arquitetura, organização de código, persistência local e comandos de trabalho.

O app trabalha com:

- tutores, pets, prontuários, lixeira e busca global;
- catálogo de produtos, fabricantes, princípios ativos, condições e raças;
- banco de dados local-first em SQLite;
- mídia original em CAS no disco, com índices e miniaturas em SQLite;
- importação/exportação completa em pacotes nativos ou CSV;
- backup contínuo por patches via SQLite Session Extension.

## Modelo Mental

```text
apps/vet-app -> @vet/modules -> @vet/core-local -> Comandos Tauri -> @vet/core-rust -> SQLite + CAS
```

O ponto central é separar claramente as fronteiras do workspace:

| Fronteira | Papel |
| --- | --- |
| `apps/vet-app` | Shell SvelteKit/Tauri, rotas e composição entre módulos. |
| `packages/types` | Contratos e regras puras de domínio. |
| `packages/core-local` | Runtime local TypeScript: SQLite, i18n, preferências, import/export e mídia. |
| `packages/ui` | Primitivos Svelte reutilizáveis. |
| `packages/modules` | Módulos de negócio: `knowledge`, `registry` e `medical_records`. |
| `packages/core-rust` | Rust compartilhado: `storage`, `distribution` e `replication`. |

Essa separação evita misturar backup vivo, exportação completa e conexão ativa
de banco no mesmo lugar.

## Conjuntos De Dados

Conjunto do usuário:

```text
veterinary_clinic_user.db
veterinary_clinic_user_media.db
veterinary_clinic_user_logs.db
vault/user/xx/yy/<hash_sha256>.bin
```

Conjunto do sistema:

```text
veterinary_clinic_system.db
veterinary_clinic_system_media.db
vault/system/xx/yy/<hash_sha256>.bin
```

O conjunto do usuário é importado, exportado e replicado.
O conjunto do sistema é reconstruído pelo app a partir dos defaults do programa.

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | Svelte 5, SvelteKit, TypeScript |
| Estilo | Tailwind CSS 4 e componentes locais |
| Shell desktop/mobile | Tauri 2 |
| Camada nativa | Rust |
| SQLite | `rusqlite` com SQLite bundled e session extension |
| Mídias | CAS no disco + índice SQLite de mídia |
| Testes e checks | Vitest, `svelte-check`, Cargo |

## Estrutura Do Repositório

| Caminho | Conteúdo |
| --- | --- |
| `apps/vet-app/` | App SvelteKit/Tauri, rotas, stores e composição entre pacotes. |
| `apps/vet-app/src-tauri/` | Casca Tauri do app veterinário e metadados de empacotamento. |
| `packages/types/` | Tipos e contratos puros. |
| `packages/core-local/` | Infra local TypeScript compartilhável. |
| `packages/ui/` | Componentes e primitivas visuais reutilizáveis. |
| `packages/modules/` | Módulos de negócio por feature. |
| `packages/core-rust/` | Storage, distribuição e replicação em Rust. |
| `legacy-to-sqlite/` | Scripts externos para adoção/conversão de bases. |
| `docs/` | Documentação técnica em português. |
| `flatpak/` | Manifesto e apoio para empacotamento Flatpak. |
| `scripts/` | Automação de estado dev, build Flatpak e versionamento. |

## Primeira Execução Em Desenvolvimento

Instale dependências:

```sh
npm ci
```

Execute o app desktop:

```sh
npm run tauri:dev
```

Execute com estado local limpo:

```sh
npm run tauri:dev:new
```

Esse comando limpa bancos, CAS, fila/baselines de replicação, WebView storage e
cache locais de desenvolvimento. Saídas do usuário, como `backups/`, `exports/`
e `import_safety_exports/`, são preservadas.

## Checks

```sh
npm run check
npm run test:run
npm run build
cargo check --workspace
```

## Pacotes

```sh
npm run tauri:appimage
npm run tauri:deb
npm run tauri:flatpak
npm run tauri:msi
```

Android está planejado via Tauri Android:

```sh
npm run tauri:android:dev
npm run tauri:android:build
```

## Scripts Externos De Banco

Os scripts em `legacy-to-sqlite/` não fazem parte da migração em runtime do app.
Eles existem para preparar bases fora da execução normal.

```sh
cd legacy-to-sqlite
npm run adopt:version
```

O script de adoção usa a base de entrada definida em `legacy-to-sqlite/dist/` e
gera o conjunto atual esperado pelo app, incluindo pacote nativo importável.

Conversor CSV legado antigo, quando usado manualmente:

```sh
cd legacy-to-sqlite
npm run build:csv
npm run csv
```

## Documentação Técnica

| Documento | Assunto |
| --- | --- |
| [Arquitetura Geral](docs/architecture.md) | Mapa raiz das fronteiras do app. |
| [Arquitetura De Armazenamento](docs/storage-architecture.md) | `storage`, bancos ativos, CAS, manifesto e comandos. |
| [Arquitetura De Distribuição](docs/distribution-architecture.md) | Import/export nativo e CSV. |
| [Arquitetura De Replicação](docs/replication-architecture.md) | Capture, outbox, targets, applier e sincronização. |
| [Política De Backup](docs/backup-policy.md) | Como backup contínuo e import/export se relacionam. |
| [Versionamento De Banco](docs/database-versioning.md) | Migrações, `user_version` e ritual de lançamento. |
| [Alvos De Construção](docs/build-targets.md) | Build, checks e empacotamento. |
| [Debian 13](docs/development-debian13.md) | Ambiente Linux verificado e dependências. |

READMEs internos:

| Módulo | README |
| --- | --- |
| `storage` | [packages/core-rust/src/storage/README.md](packages/core-rust/src/storage/README.md) |
| `distribution` | [packages/core-rust/src/distribution/README.md](packages/core-rust/src/distribution/README.md) |
| `replication` | [packages/core-rust/src/replication/README.md](packages/core-rust/src/replication/README.md) |

## Versionamento

Para atualizar a versão pública do app:

```sh
npm run version:bump -- patch "Corrigir validacao de importacao"
```

Use `major`, `minor` ou `patch`. O script atualiza metadados do app,
`CHANGELOG.md`, versão gerada e metainfo AppStream.

## Changelog

O changelog raiz permanece em inglês para ser reutilizado em empacotamento e
metadados de distribuição:

[CHANGELOG.md](CHANGELOG.md)

## Licença

MIT. Veja [LICENSE.md](LICENSE.md).
