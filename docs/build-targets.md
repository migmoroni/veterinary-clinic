# Alvos De Construção

Versão atual do app: `0.2.0`.

Regras de migração de estrutura e lançamento estão em
[Versionamento De Banco E Ritual De Lançamento](database-versioning.md).

## Desenvolvimento

```sh
pnpm dev
pnpm tauri:dev
```

## Verificações

```sh
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

Quando alterar a estrutura SQLite canônica ou regras de importação, valide também
as ferramentas externas de adoção/importação:

```sh
pnpm adopt:version
```

O script de adoção gera o conjunto atual do usuário e um ZIP nativo importável
pelo módulo `distribution`.

Quando alterar a estrutura SQLite de execução, adicione uma nova migração,
incremente `CURRENT_SCHEMA_VERSION` e atualize a versão pública do app:

```sh
pnpm version:bump -- minor "Adicionar migracao de estrutura para protocolos vacinais"
pnpm check
pnpm test:run
pnpm build
cargo check --workspace
```

O script de versionamento calcula a próxima versão `major`, `minor` ou `patch`.
Ele também adiciona uma entrada no topo de `CHANGELOG.md` e no metainfo
AppStream usado por visualizadores de pacotes Linux. Use `--change` repetido
para várias notas de lançamento.

Antes de lançar, teste também migração a partir do banco de produção anterior e
rode o pacote Tauri da plataforma alvo do cliente.

## Pacotes Desktop

```sh
pnpm tauri:appimage
pnpm tauri:deb
pnpm tauri:flatpak
pnpm tauri:msi
```

O suporte Flatpak usa `flatpak-builder`, não um alvo nativo do Tauri. Veja
`flatpak/README.md` para runtimes necessários e comandos de instalação local.

O pacote MSI deve ser produzido no Windows ou em um executor CI compatível.

Bundles Linux incluem desktop entry, metainfo AppStream, arquivos de licença e
o changelog raiz como metadados de pacote.

## Android

Android está planejado via Tauri Android:

```sh
pnpm tauri:android:dev
pnpm tauri:android:build
```

Rode `tauri android init` depois que o build desktop estiver saudável e o SDK
Android estiver configurado.
