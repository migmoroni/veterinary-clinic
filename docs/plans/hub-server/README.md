# Plano De Implementação Do Hub Server

## Objetivo

`apps/hub-server/` é o hub aberto do ecossistema veterinário. Ele concentra dados
públicos, manifests, releases, artefatos de conhecimento e distribuição pública
dos apps.

O `hub-server` não é o servidor operacional do SaaS. Dados privados de usuários,
billing, permissões comerciais, sincronização privada e recursos fechados
pertencem a outro servidor.

## Partes

1. [Preparação local dos artefatos `system`](./01-knowledge-artifacts-preparation.md)
2. [Base Rails e contratos públicos](./02-rails-api-contracts.md)
3. [Dados públicos e publicação](./03-public-knowledge-publication.md)
4. [Consumo dos artefatos nos apps](./04-app-artifact-consumption.md)
5. [Updater Tauri com ambiente local](./05-tauri-updater-local.md)
6. [Repositório dedicado e GitHub Releases](./06-github-releases-ci.md)

As partes são executadas em ordem. Cada uma termina com testes e critérios de
aceite próprios antes do início da seguinte.

## Decisões De Arquitetura

- A aplicação Rails fica em `apps/hub-server/`, seguindo o padrão `apps/*` do
  workspace.
- O servidor começa em Rails 8 API com SQLite.
- A API pública usa o namespace `/api/v1`.
- A API interna usa Bearer Token via `INTERNAL_RELEASE_TOKEN`.
- O manifest é o contrato público usado pelos apps para descobrir releases,
  fontes e downloads.
- O `hub-server` é o plano de controle. Providers como GitHub, Cloudflare R2 e
  IPFS podem armazenar e entregar os bytes.
- A source `hub_server` de prioridade 1 é o caminho padrão dos apps.
- GitHub Releases é o primeiro provider externo de artefatos versionados.
- Cloudflare R2, GitLab e IPFS ficam previstos no contrato e desativados até suas
  fases próprias.
- `system_media.db` é o índice canônico das mídias públicas de sistema.
- `CAS/system` contém objetos imutáveis endereçados por SHA-256.
- A preparação local usa uma `build_version` inteira e sempre produz bancos
  completos para desenvolvimento e builds dos apps.
- Cada versão de conhecimento coordena `system`, `system_media` e `CAS/system`
  como uma unidade indivisível.
- Releases de app e de conhecimento são independentes de canal. Os canais mantêm
  apenas ponteiros para releases publicadas.
- Cada canal de conhecimento possui snapshots assinados, sequenciais e
  expirantes do manifest.
- Revisões `generation.0` são bootstraps completos; revisões
  `generation.revision` posteriores são deltas encadeados.
- Pacotes globais de bootstrap e delta são meios de transporte; não são fontes de
  verdade.
- Artefatos e manifests publicados são imutáveis.
- Versão do app, versão dos schemas SQLite e versão global de conhecimento são
  conceitos independentes.
- Site público e painel administrativo entram em uma fase própria.

## Fronteiras De Responsabilidade

```text
apps/hub-server/
  dados públicos, geração, publicação, manifests e APIs

apps/vet-app/
  consumo, validação, instalação e atualização

packages/core-local/
  schemas e utilitários SQLite reutilizáveis

packages/engine/
  operações nativas de armazenamento, integridade e distribuição

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
  system_schema_version
  system_media_schema_version
  status
  notes
  published_at
  metadata

KnowledgeArtifact
  knowledge_release_id
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

`system_schema_version` e `system_media_schema_version` permanecem separados da
versão de conhecimento. Cada `KnowledgeArtifact` representa um conteúdo.
`KnowledgeArtifactSource` atende artefatos de conhecimento com endereço fixo.

### Componentes Da Release

```text
KnowledgeReleasePackage
  knowledge_release_id
  knowledge_artifact_id
  package_kind
  descriptor_checksum_sha256

KnowledgeReleaseComponent
  knowledge_release_id
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
```

`KnowledgeReleasePackage` liga a release ao único ZIP de bootstrap ou delta.
`package_kind` corresponde a `bootstrap` ou `delta`. O checksum do artefato
protege o ZIP completo, enquanto `descriptor_checksum_sha256` protege o
`release.json` interno.

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
app. Toda revisão delta possui patches para ambos os bancos, pois os dois
registram a versão global em seus próprios metadados.

O componente `cas_system` usa entradas `CAS/<hash>` dentro do pacote global. Seu
estado final é definido pelos hashes do `system_media` da mesma versão.

`KnowledgeCasObjectSource` não cria um registro por hash. Os hashes e os
metadados das mídias vêm de `system_media.db`. A configuração é própria do canal
e permanece separada da entrega dos pacotes globais.

`KnowledgeDeliverySource` define um padrão que inclui obrigatoriamente
`{releaseId}` para o pacote global. `{generation}` e `{revision}` podem compor o
nome legível. Cada provider aparece no máximo uma vez por canal e tipo de
entrega. O manifest publicado captura essas configurações em
`deliverySources.bootstrap[]` e `deliverySources.delta[]`; releases e componentes
não recebem cópias dessas linhas.

`KnowledgeManifestSnapshot` é imutável depois de publicado. `sequence` é um
inteiro positivo, monotônico e único por canal. Um novo snapshot pode apontar
para a mesma `KnowledgeRelease` quando mudam apenas sources, validade ou outros
metadados de distribuição.

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
ponteiros do canal em uma transação idempotente própria.

## Contrato De Artefatos

Todo artefato recompõe publicamente estes dados:

```text
artifact_type
app_name
platform
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

Pacotes globais de conhecimento usam `deliverySources.bootstrap[]` ou
`deliverySources.delta[]`, com `urlPattern` no lugar de `url`. O padrão resolve o
pacote por `{releaseId}`, podendo também usar `{generation}` e `{revision}` no
nome do arquivo. `storage_key` permanece um dado interno do servidor e
componentes internos não possuem source própria.

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
- `knowledge_generation`: geração do bootstrap global, iniciada em `1`.
- `knowledge_revision`: revisão incremental dentro da geração, iniciada em `0`.
- `manifest_schema_version`: versão do contrato JSON do manifest.
- `manifest_sequence`: sequência monotônica do snapshot assinado dentro do canal.

`knowledge_generation` e `knowledge_revision` são armazenados e comparados como
inteiros. A versão textual `1.10` significa geração `1`, revisão `10`; ela nunca
é tratada como número decimal.

Uma versão `1.0` contém snapshots completos dos dois bancos e do conjunto CAS.
As versões `1.1`, `1.2` e seguintes contêm deltas encadeados. A versão `2.0`
inicia outra geração com um bootstrap completo consolidado.

Os bancos `system` e `system_media` contêm uma tabela singleton:

```sql
CREATE TABLE knowledge_release_metadata (
    singleton INTEGER PRIMARY KEY CHECK(singleton = 1),
    release_id TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK(generation >= 1),
    revision INTEGER NOT NULL CHECK(revision >= 0)
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
    "bootstrap": {},
    "deltas": [],
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

Um job periódico publica uma nova sequência para a mesma release antes da
expiração. Falha de renovação preserva o snapshot vigente e produz alerta com
antecedência suficiente para intervenção.

O updater Tauri conserva o mecanismo oficial de assinatura do próprio updater.
O adapter do `hub-server` não substitui nem enfraquece essa verificação.

## Contrato De Atualização Global

O manifest declara:

- `currentVersion`: geração e revisão vigentes;
- `bootstrap`: release `generation.0` com snapshots de `system`, `system_media` e
  `CAS/system`;
- `deltas[]`: cadeia ordenada de releases posteriores ao bootstrap;
- `components`: estado e entrega de `system`, `system_media` e `cas_system` em
  cada release;
- `package`: checksum, tamanho, assinatura e descritor do ZIP global;
- `deliverySources`: padrões por provider para resolver pacotes de bootstrap e
  delta;
- `objects`: sources para reconciliação individual do CAS por hash.

Cada pacote contém um `release.json` canônico. O descritor repete a identidade e
a versão da release, o tipo do pacote e os descritores dos três componentes. Para
o CAS, ele inclui `artifactHashes`, uma lista ordenada e sem duplicatas com os
hashes transportados naquele ZIP. O checksum do descritor e o checksum do pacote
devem coincidir com o manifest assinado.

Cada delta contém `fromVersion`, `toVersion` e os três componentes. Os dois bancos
usam `deliveryMode: patch`, com checksum da base, checksum do resultado e o
`entryPath` correspondente. O CAS usa `patch`, `index_only` ou `unchanged`
conforme a mudança no conjunto de hashes.

Invariantes obrigatórias:

- `bootstrap.version.revision` é `0`;
- `bootstrap.version.generation` é igual a `currentVersion.generation`;
- o primeiro delta parte da versão do bootstrap;
- cada `fromVersion` é igual ao `toVersion` do delta anterior;
- todo `toVersion` pertence à geração vigente e incrementa a revisão em uma
  unidade;
- o último `toVersion` é igual a `currentVersion`;
- cada release descreve os três componentes e seus estados finais;
- cada release possui exatamente um pacote global com checksum e assinatura;
- o `release.json` pertence à mesma release e coincide com os componentes do
  manifest;
- todo delta possui patches válidos para `system` e `system_media`;
- componentes `patch` possuem base idêntica ao estado final anterior;
- os hashes de `system_media` na versão final são resolvíveis no `CAS/system`;
- cada URL de pacote inclui o `releaseId` da release correspondente;
- sources habilitadas não repetem prioridade dentro do mesmo tipo;
- toda source habilitada resolve o mesmo pacote global imutável.

O servidor recusa a publicação quando alguma invariante falha. O app nunca tenta
descobrir uma revisão incrementando URLs que não estejam declaradas.

## Regras De Segurança

- Manifests de produção, artefatos executáveis e pacotes globais exigem assinatura
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
- Publicação parcial nunca troca o ponteiro do canal.

## Ordem Recomendada

1. Implementar e validar a Parte 1.
2. Implementar e validar a Parte 2.
3. Implementar e validar a Parte 3.
4. Implementar e validar a Parte 4.
5. Implementar e validar a Parte 5.
6. Mover o projeto para o repositório dedicado.
7. Implementar e validar a Parte 6.

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
