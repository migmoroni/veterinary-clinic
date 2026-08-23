# Plano De Implementação Do Hub Server

## Objetivo

`apps/hub-server/` é o hub aberto do ecossistema veterinário. Ele orquestra a
publicação dos dados públicos e concentra manifests, releases, artefatos de
conhecimento e distribuição pública dos apps.

O `hub-server` não é o servidor operacional do SaaS. Dados privados de usuários,
billing, permissões comerciais, sincronização privada e recursos fechados
pertencem a outro servidor.

## Partes

0. [Migração do workspace para pnpm](./00-pnpm-workspace-migration.md)
1. [Parte 1A: dados canônicos de conhecimento](./01a-canonical-knowledge-data.md)
2. [Parte 1B: `knowledge-builder` e artefatos locais](./01b-knowledge-builder.md)
3. [Parte 1C: consumo local dos artefatos `system`](./01c-app-system-consumption.md)
4. [Parte 2: base Rails e contratos públicos](./02-rails-api-contracts.md)
5. [Parte 3: dados públicos e publicação](./03-public-knowledge-publication.md)
6. [Parte 4: consumo dos artefatos nos apps](./04-app-artifact-consumption.md)
7. [Parte 5: updater Tauri com ambiente local](./05-tauri-updater-local.md)
8. [Parte 6: repositório dedicado e GitHub Releases](./06-github-releases-ci.md)

A pré-fase, as subpartes 1A, 1B e 1C e as partes seguintes são executadas em
ordem. Cada documento termina com testes e critérios de aceite próprios.

## Evolução Do Fluxo

```mermaid
flowchart LR
    P0["Pré-fase 0<br/>workspace pnpm"]
    P1A["Parte 1A<br/>fonte canônica"]
    P1B["Parte 1B<br/>builder Rust"]
    P1C["Parte 1C<br/>consumo local"]
    P2["Parte 2<br/>base Rails + contratos"]
    P3["Parte 3<br/>Rails orquestra builder + releases"]
    P4["Parte 4<br/>apps consomem a API"]
    P5["Parte 5<br/>updater Tauri local"]
    P6["Parte 6<br/>GitHub + CI/CD"]

    P0 --> P1A --> P1B --> P1C --> P2 --> P3 --> P4 --> P5 --> P6
```

As mudanças de origem dos artefatos são deliberadas:

```mermaid
flowchart TB
    subgraph S1["Partes 1A, 1B e 1C"]
        D1["data/knowledge<br/>fonte canônica"] --> G1["knowledge-builder Rust"]
        G1 --> B1["build/knowledge-artifacts"]
        B1 --> A1["Apps em desenvolvimento e build"]
    end

    subgraph S2["Partes 3 e 4"]
        D2["data/knowledge"] --> G2["Mesmo knowledge-builder Rust"]
        R2["Rails: jobs, releases e manifest"] --> G2
        G2 --> R2
        R2 --> H2["API do hub-server"]
        H2 --> A2["Apps"]
    end

    subgraph S3["Parte 6"]
        H3["Hub: source primária"] --> A3["Apps"]
        GH3["GitHub: réplica e fallback"] --> A3
    end

    S1 --> S2 --> S3
```

A Pré-fase 0 estabelece pnpm como único gerenciador do workspace JavaScript. A
Parte 1A estabelece `data/knowledge` como fonte canônica, a Parte 1B implementa o
`knowledge-builder` definitivo em Rust e a Parte 1C faz os apps consumirem os
artefatos locais. A Parte 3 faz o `hub-server` invocar a mesma ferramenta e
assumir releases, assinatura e publicação. A Parte 4 substitui a aquisição local
pelo contrato de distribuição do Hub. A Parte 6 acrescenta o GitHub como provider
externo.

## Decisões De Arquitetura

- A aplicação Rails fica em `apps/hub-server/`, seguindo o padrão `apps/*` do
  workspace.
- O workspace JavaScript exige Node.js `>=22.0.0`, usa a linha 22.x no ambiente
  local e no CI, adota pnpm `11.22.0`,
  `pnpm-workspace.yaml`, um único `pnpm-lock.yaml` e dependências internas com
  `workspace:*`.
- As partes do Hub usam somente comandos pnpm; não mantêm lockfiles ou comandos
  concorrentes de outro gerenciador.
- `tools/knowledge-builder/` é um binário Rust membro do Cargo Workspace e o
  único compilador de dados canônicos para `system`, `system_media` e
  `CAS/system`.
- `data/knowledge/` na raiz é a única fonte de autoria dos dados públicos. O
  diretório não pertence ao app, ao Rails nem a um package de código.
- `geo/` é um domínio de conhecimento compartilhado. Localizações usam
  `entityType: "geo_place"`; raças e outros domínios apenas referenciam seus IDs
  conforme o papel exercido pela relação.
- O `hub-server` executa o builder por uma CLI versionada e valida seu
  `build-result.json`; ele não mantém outra implementação do compilador em Ruby.
- O servidor começa em Rails 8 API com SQLite.
- A API pública usa o namespace `/api/v1`.
- A API interna usa Bearer Token via `INTERNAL_RELEASE_TOKEN`.
- O manifest é o contrato público usado pelos apps para descobrir releases,
  fontes e downloads.
- O `hub-server` é o único emissor dos manifests de conhecimento. Providers
  externos hospedam réplicas byte a byte dos snapshots assinados.
- O `hub-server` é o plano de controle. Providers como GitHub, Cloudflare R2 e
  IPFS podem armazenar e entregar os bytes.
- A source `hub_server` de prioridade 1 é o caminho padrão para descoberta do
  manifest e entrega dos pacotes.
- GitHub Releases é o primeiro provider externo de artefatos versionados.
- Cloudflare R2, GitLab e IPFS ficam previstos no contrato e desativados até suas
  fases próprias.
- Os dados fonte de conhecimento são organizados por domínio e entidade. Cada
  entidade possui `entity.json` para estrutura e composição, fragmentos
  Markdown por locale e um diretório `media/` com os bytes editoriais.
- `entity.json` associa explicitamente cada diretório de conteúdo a um campo ou
  `sectionKey` padronizado. O builder não deduz semântica do nome das pastas.
- Os JSONs não contêm nomes de tabelas ou colunas. `entityType` seleciona um Data
  Mapper explícito, e o DDL do builder é a fonte de verdade da projeção
  relacional.
- Cada build registra cobertura de entidades e relações e fingerprints dos
  schemas efetivamente materializados.
- Nomes, aliases, descrições e seções de conhecimento ficam em Markdown puro,
  sem front matter, e são projetados diretamente no banco do locale; o app não
  usa i18n como fonte paralela de conhecimento.
- As seções de cada item são compiladas em um único `content_json` versionado. A
  árvore ordenada organiza a página, e cada nó contém seu Markdown normalizado;
  não existem tabelas independentes por seção.
- O builder interpreta Markdown por AST, aplica uma allowlist fechada, normaliza
  o resultado deterministicamente e projeta somente a representação compilada
  segura. O digest da fonte usa o modelo semântico canônico, sem depender de
  caminhos editoriais de conteúdo.
- Mídias de autoria usam nomes e caminhos relativos legíveis. O builder deriva
  uma `media_key`, calcula o SHA-256, reescreve as referências Markdown para o
  contrato interno e registra `media_key -> contentHash` em `system_media`.
- Cada locale possui seu próprio `system_media.db`, que indexa somente as mídias
  exigidas por aquele conjunto localizado.
- `CAS/system` contém objetos imutáveis endereçados por SHA-256.
- No app, o cofre físico de sistema usa
  `vault/system/<2-hex>/<2-hex>/<hash>.bin`, conforme o resolvedor do
  `engine/storage`.
- `system`, `system_media` e `vault/system` são instalados a partir de artefatos
  prontos e permanecem em somente leitura para o runtime de conhecimento.
- `engine/distribution` instala bytes públicos verificados;
  `engine/storage` apenas abre e lê o conjunto de sistema ativo.
- A criação, as migrations e a escrita de `user/main`, `user/media`, `user/logs`
  e `vault/user` permanecem independentes desse fluxo.
- A preparação local usa uma `build_version` inteira e sempre produz bancos
  completos para os seis locales suportados.
- Cada bundle declara `includedKnowledgeLocales` e um `defaultKnowledgeLocale`
  obrigatoriamente incluído. Um locale ausente só é ativado depois de seus
  artefatos serem obtidos e validados.
- Recursos de conhecimento incorporados são descritos por um
  `knowledge-bundle.json` versionado. Ele registra a seleção de locales e sua
  origem local ou publicada, sem substituir o manifest assinado de releases.
- Cada versão de conhecimento coordena os seis pares `system` e `system_media`
  sob uma release global. Cada par é instalado como unidade indivisível e usa o
  `CAS/system` compartilhado.
- Releases de app e de conhecimento são independentes de canal. Os canais mantêm
  apenas ponteiros para releases publicadas.
- Cada canal de conhecimento possui snapshots assinados, sequenciais e
  expirantes do manifest.
- Revisões `generation.0` são bootstraps completos; revisões
  `generation.revision` posteriores são deltas encadeados.
- Pacotes de locale de bootstrap e delta são meios de transporte; não são fontes
  de verdade.
- Artefatos e manifests publicados são imutáveis.
- Versão do app, versão dos schemas SQLite e versão global de conhecimento são
  conceitos independentes.
- Site público e painel administrativo entram em uma fase própria.

## Fronteiras De Responsabilidade

```mermaid
flowchart LR
    DATA["Dados públicos canônicos"] --> BUILDER["tools/knowledge-builder<br/>compilação Rust"]
    HUB["apps/hub-server<br/>jobs, releases, manifests e APIs"] --> BUILDER
    BUILDER --> HUB
    HUB --> APP["apps/*<br/>consumo, validação e instalação"]
    HUB --> PROVIDERS["Providers externos<br/>réplicas e entrega de bytes"]
    PROVIDERS --> APP
    CORE["packages/core-local<br/>leitura e contratos SQLite"] --> APP
    ENGINE["packages/engine<br/>armazenamento, integridade e distribuição"] --> APP
```

```text
data/knowledge/
  autoria dos dados públicos canônicos

apps/hub-server/
  orquestração, publicação, manifests e APIs

tools/knowledge-builder/
  validação, projeção, geração dos bancos, CAS e relatório do build

apps/vet-app/
  consumo, validação, instalação e atualização

packages/core-local/
  queries, contratos de leitura e validação de compatibilidade SQLite

packages/engine/
  armazenamento gravável do usuário, leitura dos recursos ativos de sistema,
  integridade e distribuição

providers externos/
  armazenamento e entrega de bytes publicados
```

O app não gera `system`, `system_media` ou `CAS/system` em desenvolvimento,
runtime ou build empacotável. O servidor não recebe dados privados dos usuários.

## Modelo De Releases

### Releases De Apps

```text
Release
  app_name
  version
  notes
  status
  published_at
  metadata

ReleaseArtifact
  release_id
  artifact_type
  platform
  checksum_sha256
  size_bytes
  signature
  metadata

ReleaseArtifactSource
  release_artifact_id
  provider
  priority
  enabled
  transport
  url
  storage_key
  metadata
```

`ReleaseArtifact` identifica um conteúdo imutável. `ReleaseArtifactSource`
informa onde os mesmos bytes estão disponíveis. Adicionar um provider não cria
outro artefato.

### Releases De Conhecimento

```text
KnowledgeRelease
  generation
  revision
  release_kind
  previous_release_id
  build_version
  builder_version
  build_result_schema_version
  build_result_checksum_sha256
  source_digest_sha256
  system_schema_version
  system_media_schema_version
  status
  notes
  published_at
  metadata

KnowledgeReleaseLocale
  knowledge_release_id
  locale

KnowledgeArtifact
  knowledge_release_locale_id
  artifact_type
  checksum_sha256
  size_bytes
  signature
  metadata

KnowledgeArtifactSource
  knowledge_artifact_id
  provider
  priority
  enabled
  transport
  url
  storage_key
  metadata
```

`generation` e `revision` são inteiros e formam a versão apresentada como
`generation.revision`. `release_kind` aceita `bootstrap` ou `delta`.
`previous_release_id` é nulo no bootstrap e obrigatório no delta.
O par `generation`, `revision` é globalmente único e não depende de canal.

`build_version`, `builder_version`, `build_result_schema_version`,
`build_result_checksum_sha256` e `source_digest_sha256` registram a proveniência
da compilação. Retry do mesmo draft conserva esses valores quando repete a mesma
entrada e o mesmo builder; qualquer mudança exige descartar o resultado preparado
e executar outra compilação antes da validação.

`system_schema_version` e `system_media_schema_version` permanecem separados da
versão de conhecimento. Cada `KnowledgeArtifact` representa um conteúdo.
`KnowledgeArtifactSource` atende artefatos de conhecimento com endereço fixo.

Cada release possui exatamente um `KnowledgeReleaseLocale` para cada locale
suportado: `pt-BR`, `pt-PT`, `gn-PY`, `en-US`, `es-ES` e `fr-FR`. A release só
pode ser publicada quando os seis filhos estão completos e validados.

### Componentes Da Release

```text
KnowledgeReleasePackage
  knowledge_release_locale_id
  knowledge_artifact_id
  package_kind
  descriptor_checksum_sha256

KnowledgeReleaseComponent
  knowledge_release_locale_id
  component
  delivery_mode
  entry_path
  entry_prefix
  entry_checksum_sha256
  entry_size_bytes
  patch_format
  base_checksum_sha256
  target_checksum_sha256
  target_size_bytes
  base_set_digest_sha256
  target_set_digest_sha256
  artifact_hash_count
  target_hash_count

KnowledgeCasObjectSource
  channel
  provider
  priority
  enabled
  transport
  url_pattern
  cid_field
  hash_algorithm
  hash_encoding
  metadata

KnowledgeDeliverySource
  channel
  delivery_kind
  provider
  priority
  enabled
  transport
  url_pattern
  metadata

KnowledgeManifestSnapshot
  channel
  sequence
  knowledge_release_id
  payload
  checksum_sha256
  signature
  key_id
  published_at
  expires_at

KnowledgeManifestSource
  channel
  provider
  priority
  enabled
  transport
  current_url_pattern
  snapshot_url_pattern
  required_for_healthy_channel
  metadata

KnowledgeManifestReplica
  knowledge_manifest_snapshot_id
  knowledge_manifest_source_id
  checksum_sha256
  immutable_url
  current_url
  status
  published_at
  verified_at
  error_code
```

`KnowledgeReleasePackage` liga um locale da release ao seu único ZIP de bootstrap
ou delta. Cada release possui seis pacotes, um por locale. `package_kind`
corresponde a `bootstrap` ou `delta`. O checksum do artefato protege o ZIP
completo, enquanto `descriptor_checksum_sha256` protege o `release.json` interno.

`component` aceita `system`, `system_media` ou `cas_system`. `delivery_mode`
aceita `snapshot`, `patch`, `index_only` ou `unchanged`:

- `snapshot` entrega o componente completo em uma release bootstrap;
- `patch` entrega a diferença entre a release anterior e a atual;
- `index_only` altera o conjunto lógico CAS por meio de `system_media`, sem
  entregar novos objetos;
- `unchanged` registra que o estado final é igual ao anterior e não possui
  entrada de conteúdo no pacote.

`entry_path`, `entry_checksum_sha256` e `entry_size_bytes` validam a entrada fixa
de banco ou patch no pacote. `entry_prefix` identifica exclusivamente o diretório
`CAS/`; o `release.json` enumera os hashes transportados sob esse prefixo. Esses
campos são nulos em `index_only` e `unchanged`. Componentes não possuem source
própria.

Patches de `system` e `system_media` usam `bsdiff_v1`, compatível com o formato
BSDIFF40, sempre sobre os bytes exatos do banco publicado anterior.
`base_checksum_sha256` protege a entrada e `target_checksum_sha256` protege o
banco resultante. Os bancos de sistema são abertos em modo somente leitura pelo
app. Toda revisão delta possui patches para os dois bancos de cada locale, pois
todos registram a versão global em seus próprios metadados.

O componente `cas_system` usa entradas `CAS/<hash>` dentro do pacote do locale.
Seu estado final é definido pelos hashes do `system_media` do mesmo locale e da
mesma versão. Objetos iguais em pacotes diferentes convergem para o mesmo caminho
do CAS compartilhado.

`KnowledgeCasObjectSource` não cria um registro por hash. Os hashes e os
metadados das mídias vêm do `system_media.db` do locale instalado. A configuração
é própria do canal e permanece separada da entrega dos pacotes.

`KnowledgeDeliverySource` define um padrão que inclui obrigatoriamente
`{releaseId}` e `{locale}` para resolver um pacote sem ambiguidade.
`{generation}` e `{revision}` podem compor o nome legível. Cada provider aparece
no máximo uma vez por canal e tipo de entrega. O manifest publicado captura essas configurações em
`deliverySources.bootstrap[]` e `deliverySources.delta[]`; releases e componentes
não recebem cópias dessas linhas.

`KnowledgeManifestSnapshot` é imutável depois de publicado. `sequence` é um
inteiro positivo, monotônico e único por canal. Um novo snapshot pode apontar
para a mesma `KnowledgeRelease` quando mudam apenas sources, validade ou outros
metadados de distribuição.

`KnowledgeManifestSource` configura onde o documento canônico pode ser
descoberto. `current_url_pattern` resolve a cópia vigente do canal;
`snapshot_url_pattern` resolve a cópia imutável por `{channel}`, `{sequence}` e
`{snapshotId}`. `current_url_pattern` também pode usar `{appName}` e
`{appVersion}` quando a source possui resolução dinâmica. Essa configuração não
vive dentro do manifest que está sendo descoberto. Os apps recebem uma lista
mínima e permitida de manifest sources em sua configuração de distribuição.

`KnowledgeManifestReplica` registra a publicação e a verificação de cada cópia.
Uma réplica válida possui exatamente os mesmos bytes e o mesmo checksum do
snapshot persistido pelo Hub nos caminhos imutável e `current`. Providers nunca
remontam, alteram ou assinam o payload.

### Ponteiros De Canal

```text
AppChannelRelease
  app_name
  channel
  release_id

KnowledgeChannelRelease
  channel
  knowledge_release_id
  knowledge_manifest_snapshot_id
```

Esses registros apontam para a release publicada vigente em cada canal. O
snapshot indicado por `knowledge_manifest_snapshot_id` pertence ao mesmo canal e
aponta para a mesma release. A promoção troca os dois ponteiros na mesma
transação que publica o novo snapshot assinado.

## Ciclo De Publicação

Releases de app e de conhecimento seguem o mesmo ciclo:

```text
draft -> validating -> published -> withdrawn
```

- `draft`: recebe metadados e artefatos.
- `validating`: verifica arquivos, hashes, tamanhos, assinaturas e contratos.
- `published`: fica imutável e pode ser apontada por um canal.
- `withdrawn`: deixa de ser oferecida sem alterar seu conteúdo histórico.

Uma release somente muda para `published` quando todos os artefatos obrigatórios
estão disponíveis. Publicar a release não altera canais. A promoção de canal
carrega as configurações de entrega, cria o próximo snapshot assinado e troca os
ponteiros do canal em uma transação idempotente própria. Uma outbox durável
replica os bytes assinados nas manifest sources habilitadas e verifica cada cópia
por checksum. A saúde operacional do canal exige a source `hub_server` e ao menos
uma source externa marcada como obrigatória quando essa source estiver
implementada.

## Contrato De Artefatos

Todo artefato recompõe publicamente estes dados:

```text
artifact_type
app_name
platform
locale
version
checksum_sha256
size_bytes
signature
published_at
metadata
```

Artefatos de endereço fixo usam `sources[]`, com estes campos públicos:

```text
provider
priority
enabled
transport
url
```

Pacotes de locale usam `deliverySources.bootstrap[]` ou
`deliverySources.delta[]`, com `urlPattern` no lugar de `url`. O padrão resolve o
pacote por `{releaseId}` e `{locale}`, podendo também usar `{generation}` e
`{revision}` no nome do arquivo. `storage_key` permanece um dado interno do
servidor e componentes internos não possuem source própria.

Providers aceitos pelo contrato:

```text
hub_server
github
cloudflare_r2
gitlab
ipfs
local
```

Tipos de artefato persistidos:

```text
app_binary
app_bundle
app_updater_manifest
knowledge_bootstrap_package
knowledge_delta_package
```

`knowledge_cas_object` é um tipo de entrega do manifest. Ele resolve um objeto
por hash sem criar um `KnowledgeArtifact` para cada mídia.

## Versionamento

- `app_version`: versão SemVer do app publicado.
- `system_schema_version`: versão técnica do banco `system`.
- `system_media_schema_version`: versão técnica do banco `system_media`.
- `knowledge_generation`: geração dos bootstraps de locale, iniciada em `1`.
- `knowledge_revision`: revisão incremental dentro da geração, iniciada em `0`.
- `manifest_schema_version`: versão do contrato JSON do manifest.
- `manifest_sequence`: sequência monotônica do snapshot assinado dentro do canal.

`knowledge_generation` e `knowledge_revision` são armazenados e comparados como
inteiros. A versão textual `1.10` significa geração `1`, revisão `10`; ela nunca
é tratada como número decimal.

Uma versão `1.0` contém, para cada locale, snapshots completos dos dois bancos e
do conjunto CAS correspondente. As versões `1.1`, `1.2` e seguintes contêm
deltas encadeados para os seis locales. A versão `2.0` inicia outra geração com
seis bootstraps completos consolidados.

Os bancos `system` e `system_media` contêm uma tabela singleton:

```sql
CREATE TABLE knowledge_release_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    release_id TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK(generation >= 1),
    revision INTEGER NOT NULL CHECK(revision >= 0),
    locale TEXT NOT NULL
);
```

`PRAGMA user_version` continua representando somente a versão técnica do schema.
Os campos de `knowledge_release_metadata` identificam o conteúdo público global.

O consumidor recusa schema de manifest que não entende, versão de app fora da
faixa suportada e release anterior à instalada. Downgrade somente ocorre por um
fluxo explícito de recuperação.

## Manifest Assinado

O manifest de conhecimento é um snapshot assinado e imutável. Sua forma lógica é:

```json
{
  "payload": {
    "schemaVersion": 1,
    "snapshotId": "<uuid>",
    "manifestSequence": 42,
    "releaseId": "<uuid>",
    "currentVersion": {
      "generation": 2,
      "revision": 2
    },
    "channel": "stable",
    "supportedAppVersions": {
      "min": "0.2.0",
      "max": null
    },
    "supportedLocales": ["pt-BR", "pt-PT", "gn-PY", "en-US", "es-ES", "fr-FR"],
    "locales": {
      "pt-BR": {
        "bootstrap": {},
        "deltas": []
      }
    },
    "deliverySources": {
      "bootstrap": [],
      "delta": []
    },
    "cas": {
      "objects": {}
    },
    "publishedAt": "2026-08-11T12:00:00Z",
    "expiresAt": "2026-08-18T12:00:00Z",
    "changelog": []
  },
  "authenticity": {
    "algorithm": "ed25519",
    "canonicalization": "jcs",
    "keyId": "knowledge-2026-01",
    "signature": "<base64>"
  }
}
```

O esqueleto detalha somente a chave `pt-BR`. Um snapshot publicável contém as
seis chaves declaradas em `supportedLocales`, cada uma com bootstrap e cadeia de
deltas completos.

A assinatura cobre o `payload` serializado com JSON Canonicalization Scheme. O
app mantém as chaves públicas confiáveis por `keyId`, verifica a assinatura antes
de interpretar URLs e persiste a maior `manifestSequence` aceita por canal.
Sequência menor é replay; sequência igual só é aceita para o mesmo `snapshotId` e
checksum. O app recusa snapshots expirados, respeitando uma tolerância de relógio
limitada. Rotação de chave exige uma versão do app que já confie na nova chave
antes de seu uso na publicação.

O endpoint usa `ETag` derivado do checksum do snapshot e
`Cache-Control: public, max-age=300, must-revalidate`. A expiração assinada é a
barreira final contra respostas antigas mantidas por cache ou provider. Quando
não consegue obter um snapshot vigente, o app conserva a release ativa, mas não
instala conteúdo novo a partir de um snapshot expirado.

O app conhece uma lista ordenada de manifest sources permitidas. Ele consulta a
source habilitada de maior prioridade e usa a seguinte diante de indisponibilidade,
timeout, resposta inválida, assinatura inválida, expiração ou sequência anterior
à já aceita. O primeiro snapshot aceitável encerra a descoberta; o app não
consulta todos os providers em cada inicialização.

Cada source publica o mesmo documento em dois endereços lógicos:

```text
manifests/<channel>/current.json
manifests/<channel>/<sequence>-<snapshotId>.json
```

`current.json` contém o snapshot assinado completo, não um ponteiro sem
assinatura. Ele é um alias mutável de descoberta do canal e não identifica o
artefato. O caminho com sequência e `snapshotId` é a identidade imutável usada
para auditoria e recuperação. Nenhuma source usa `latest` como identidade. A
replicação externa converge por outbox e retry; uma réplica temporariamente
atrasada pode oferecer o snapshot anterior ainda vigente, mas nunca outro
conteúdo sob a mesma sequência.

Um job periódico publica uma nova sequência para a mesma release antes da
expiração. Falha de renovação preserva o snapshot vigente e produz alerta com
antecedência suficiente para intervenção.

O updater Tauri conserva o mecanismo oficial de assinatura do próprio updater.
O adapter do `hub-server` não substitui nem enfraquece essa verificação.

## Contrato De Atualização Por Locale

O manifest declara:

- `currentVersion`: geração e revisão vigentes;
- `locales`: mapa completo dos locales suportados;
- `locales[locale].bootstrap`: pacote `generation.0` com snapshots do par de
  bancos e do conjunto CAS daquele locale;
- `locales[locale].deltas[]`: cadeia ordenada dos pacotes posteriores;
- `components`: estado e entrega de `system`, `system_media` e `cas_system` em
  cada pacote de locale;
- `package`: locale, checksum, tamanho, assinatura e descritor do ZIP;
- `deliverySources`: padrões por provider para resolver pacotes de bootstrap e
  delta;
- `objects`: sources para reconciliação individual do CAS por hash.

Cada pacote contém um `release.json` canônico. O descritor repete a identidade, a
versão e o locale da release, o tipo do pacote e os descritores dos três
componentes. Para o CAS, ele inclui `artifactHashes`, uma lista ordenada e sem
duplicatas com os hashes transportados naquele ZIP. O checksum do descritor e o
checksum do pacote devem coincidir com o manifest assinado.

Cada delta de locale contém `fromVersion`, `toVersion` e os três componentes. Os
dois bancos usam `deliveryMode: patch`, com checksum da base, checksum do
resultado e o `entryPath` correspondente. O CAS usa `patch`, `index_only` ou
`unchanged` conforme a mudança no conjunto de hashes daquele locale.

Invariantes obrigatórias:

- o manifest declara exatamente os seis locales suportados;
- cada release possui exatamente um pacote por locale;
- cada `bootstrap.version.revision` é `0`;
- cada `bootstrap.version.generation` é igual a `currentVersion.generation`;
- para cada locale, o primeiro delta parte da versão do bootstrap;
- para cada locale, cada `fromVersion` é igual ao `toVersion` anterior;
- todo `toVersion` pertence à geração vigente e incrementa a revisão em uma
  unidade;
- o último `toVersion` de cada locale é igual a `currentVersion`;
- cada pacote descreve os três componentes e seus estados finais;
- o `release.json` pertence à mesma release e ao mesmo locale declarados no
  manifest;
- todo delta de locale possui patches válidos para `system` e `system_media`;
- componentes `patch` possuem base idêntica ao estado final anterior;
- os IDs e relações não localizáveis são equivalentes entre os seis bancos
  `system` da mesma release;
- os hashes de cada `system_media` final são resolvíveis no `CAS/system`;
- cada URL de pacote inclui o `releaseId` e o `locale` correspondentes;
- sources habilitadas não repetem prioridade dentro do mesmo tipo;
- toda source habilitada resolve os mesmos pacotes de locale imutáveis.

O servidor recusa a publicação quando alguma invariante falha. O app nunca tenta
descobrir uma revisão incrementando URLs que não estejam declaradas.

## Regras De Segurança

- Manifests de produção, artefatos executáveis e pacotes de locale exigem assinatura
  válida.
- SHA-256 é obrigatório para bancos, pacotes e objetos CAS.
- A API usa HTTPS fora do desenvolvimento local.
- URLs de redirect são construídas a partir da configuração do provider e usam
  esquemas e hosts permitidos.
- O parâmetro de objeto CAS aceita exatamente 64 caracteres hexadecimais
  minúsculos.
- Nenhum parâmetro público é concatenado diretamente a um caminho local.
- A API interna aplica comparação segura do token, rotação, rate limit,
  idempotência e limites de payload.
- Tokens, assinaturas privadas e URLs sensíveis não aparecem em logs.
- Downloads usam limites de tamanho, tempo, redirects e concorrência.
- Publicação parcial da release ou do snapshot canônico no Hub nunca troca o
  ponteiro do canal.
- O Hub é o único emissor de sequência e assinatura de manifest.
- Réplicas externas são verificadas contra o checksum canônico antes de serem
  consideradas saudáveis.

## Ordem Recomendada

1. Implementar e validar a Pré-fase 0.
2. Implementar e validar a Parte 1A.
3. Implementar e validar a Parte 1B.
4. Implementar e validar a Parte 1C.
5. Implementar e validar a Parte 2.
6. Implementar e validar a Parte 3.
7. Implementar e validar a Parte 4.
8. Implementar e validar a Parte 5.
9. Mover o projeto para o repositório dedicado.
10. Implementar e validar a Parte 6.

## Expansões Previstas

- **Cloudflare R2:** armazenamento de objetos por hash, cache imutável, upload
  incremental e fallback HTTP.
- **GitLab:** espelhamento do repositório, CI, releases e fallback de artefatos.
- **IPFS:** CID em `system_media`, publicação de objetos e validação final pelo
  SHA-256 local antes da gravação.

As sources dessas expansões permanecem no contrato com `enabled: false` até que
tenham implementação, publicação e testes próprios.

## Fora De Escopo

- front-end web separado;
- painel administrativo visual;
- site público do projeto;
- implementação de Cloudflare R2, GitLab ou IPFS;
- servidor SaaS fechado;
- dados privados de usuários;
- sincronização privada;
- billing e permissões comerciais;
- geração de prontuários ou dados clínicos privados.
