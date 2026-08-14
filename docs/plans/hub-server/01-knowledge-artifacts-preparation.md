# Parte 1: Preparação Local Dos Artefatos `system`

## Objetivo

Organizar o processo local que gera `system`, `system_media` e `CAS/system` como
uma ferramenta determinística, testável e isolada do runtime. `apps/vet-app`
consome os artefatos completos em desenvolvimento e nos builds empacotáveis.

Cada execução materializa um estado integral dos dados públicos. A identidade
local desse estado é `build_version`, representada por um inteiro positivo.

## Escopo

- gerar o banco completo `system`;
- gerar o banco completo `system_media`;
- montar e validar o cofre incremental `CAS/system`;
- atribuir uma `build_version` inteira à saída completa;
- calcular o SHA-256 dos bancos e objetos referenciados;
- registrar as versões técnicas independentes dos dois bancos;
- retirar a geração dos bancos e do CAS de dentro do app;
- preparar os artefatos para desenvolvimento e builds empacotáveis.

Esta parte produz somente estados completos. O modelo público de releases e a
montagem dos seus meios de distribuição pertencem à Parte 3.

## Local Do Código

A orquestração fica em:

```text
scripts/knowledge-artifacts/
```

Essa pasta concentra a leitura dos dados públicos, a criação dos dois bancos, a
montagem do CAS, as validações e a escrita da saída local versionada.

Schemas e utilitários SQLite reutilizáveis permanecem nos packages donos:

```text
packages/core-local/src/sqlite/create/system/main/
packages/core-local/src/sqlite/create/system/media/
packages/core-local/src/sqlite/create/shared/
```

Os dados fonte públicos usados nesta parte ficam em:

```text
packages/types/src/catalog/defaults/
packages/types/src/domain/**/defaults/
```

Na Parte 3, `apps/hub-server` possui operacionalmente esses dados e implementa a
geração em Ruby. `packages/types` conserva contratos, tipos e utilitários
compartilhados.

Nenhum código de geração fica em:

```text
apps/vet-app/
packages/modules/
```

## Saída Local

```text
build/knowledge-artifacts/
├── CAS/
│   └── system/
│       └── <hashes SHA-256>
└── versions/
    └── <build_version>/
        ├── veterinary_clinic_system.db
        ├── veterinary_clinic_system_media.db
        └── checksums.sha256
```

`build_version` aceita somente inteiros positivos e identifica o conjunto
completo produzido pela execução. Ela não representa versão de schema nem versão
pública de distribuição.

`CAS/system` é único e incremental. Objetos existentes são reaproveitados entre
builds; o processo adiciona conteúdo ausente sem duplicar o cofre por versão.

`system_media.db` é o índice canônico. A geração lê seus hashes, garante que cada
objeto esperado existe em `CAS/system` e verifica se o conteúdo corresponde ao
SHA-256 declarado. Objetos não referenciados podem permanecer no cofre, mas não
são incluídos nos recursos de um app.

`checksums.sha256` cobre os dois bancos e todos os objetos CAS referenciados pelo
`system_media.db` daquela `build_version`. O diretório `build/` é saída gerada e
nunca é fonte de verdade.

## Determinismo

Para os mesmos dados fonte, `build_version`, versões técnicas e configuração, o
processo produz bancos com o mesmo conteúdo lógico e os mesmos checksums.
Timestamps e outros valores voláteis não entram na saída sem uma entrada
explícita.

O processo valida:

- `build_version` como inteiro positivo;
- schemas e `PRAGMA user_version` dos dois bancos;
- `PRAGMA integrity_check` dos dois bancos;
- unicidade e formato dos hashes de mídia;
- presença e SHA-256 de todos os objetos CAS referenciados;
- ausência de referência de mídia sem objeto correspondente;
- correspondência entre os arquivos produzidos e `checksums.sha256`.

Cada execução escreve primeiro em staging, valida toda a saída e só então move o
diretório para `versions/<build_version>`. Objetos CAS são gravados em arquivo
temporário, validados por hash e movidos atomicamente para o cofre.

Uma execução nunca altera uma versão já finalizada com bytes diferentes. Para
materializar outro estado completo, usa-se uma nova `build_version`.

## Consumo Local Em Desenvolvimento

O ambiente de desenvolvimento seleciona explicitamente uma `build_version` e
usa:

```text
build/knowledge-artifacts/versions/<build_version>/veterinary_clinic_system.db
build/knowledge-artifacts/versions/<build_version>/veterinary_clinic_system_media.db
build/knowledge-artifacts/CAS/system/
```

Antes de iniciar o app, o comando de preparação verifica os checksums dos bancos
e a presença dos objetos referenciados. O app abre os bancos como recursos de
sistema e não executa sua geração.

## Consumo Nos Builds Dos Apps

O build seleciona explicitamente uma `build_version`, inclui os dois bancos e
copia de `CAS/system` somente os hashes referenciados por seu
`system_media.db`.

A regra vale para:

```text
tauri:build
tauri:appimage
tauri:deb
tauri:msi
tauri:flatpak
```

O build empacotável falha com uma mensagem que informa o comando de preparação
quando a versão solicitada, um banco ou um objeto CAS obrigatório está ausente.
O build do app não executa a geração por conta própria.

## Entregáveis

```text
veterinary_clinic_system.db completo
veterinary_clinic_system_media.db completo
CAS/system único e incremental
checksums.sha256 por build_version
```

## Testes

Cobrir:

- geração completa e repetível;
- validação e seleção de `build_version` inteira;
- recusa de sobrescrita divergente da mesma `build_version`;
- `PRAGMA integrity_check` dos bancos;
- `PRAGMA user_version` independente de cada banco;
- SHA-256 dos bancos;
- correspondência entre `system_media.db` e `CAS/system`;
- detecção de objeto CAS ausente ou corrompido;
- reaproveitamento de objetos CAS já existentes;
- consumo dos artefatos pelo app em desenvolvimento;
- cópia exclusiva dos objetos referenciados para builds empacotáveis;
- ausência de geração pelo app;
- falha clara para entrada inválida ou artefato ausente.

## Critérios De Aceite

- A geração roda por comando explícito.
- Cada saída completa possui uma `build_version` inteira positiva.
- Os dois bancos possuem versão técnica própria e passam na validação SQLite.
- Todo hash de `system_media.db` possui objeto CAS válido.
- `checksums.sha256` descreve exatamente os bancos e objetos referenciados.
- O app consome uma versão explícita de `build/knowledge-artifacts` em
  desenvolvimento.
- Os builds empacotáveis recebem os bancos e somente o conjunto CAS necessário.
- O app não gera bancos ou CAS públicos em desenvolvimento, runtime ou build.
- A geração completa pode ser implementada pelo `hub-server` na Parte 3 sem levar
  responsabilidades de runtime para o app.

## Próxima Parte

[Parte 2: Base Rails e contratos públicos](./02-rails-api-contracts.md)
