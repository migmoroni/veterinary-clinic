# Parte 3: Dados Públicos E Publicação

## Objetivo

Fazer `apps/hub-server` orquestrar a compilação dos dados públicos canônicos,
gerar os artefatos de referência por locale e publicar releases globais de
conhecimento completas e assinadas.

Cada release coordena seis pares `system` e `system_media` sob a mesma versão,
com `CAS/system` compartilhado. Esta parte depende da
[base Rails](./02-rails-api-contracts.md) e segue os [contratos comuns](./README.md).

## Fluxo Da Parte

```mermaid
flowchart LR
    SOURCE["data/knowledge<br/>entidades canônicas"] --> JOB["Job Rails"]
    JOB --> BUILDER["knowledge-builder Rust"]
    BUILDER --> CANDIDATE["12 bancos + CAS<br/>build-result.json"]
    CANDIDATE -.-> WORKSPACE["Exportação até a Parte 4<br/>build/knowledge-artifacts"]
    CANDIDATE --> RELEASE["Rails: bootstrap ou delta<br/>por locale"]
    RELEASE --> MANIFEST["Snapshot assinado do manifest"]
    MANIFEST --> API["API pública do hub-server"]
    RELEASE --> API
```

## Dados Públicos

Modelar e validar:

- raças;
- localizações geográficas reutilizáveis;
- fabricantes;
- produtos;
- princípios ativos;
- condições clínicas;
- protocolos públicos;
- mídias públicas associadas aos catálogos.

`data/knowledge` possui os dados fonte públicos. `apps/hub-server` orquestra a
geração dos artefatos pelo `knowledge-builder`. `packages/types` conserva
contratos compartilhados, sem armazenar o catálogo publicado.

Os dados fonte ficam organizados por domínio e diretório de entidade:

```text
data/knowledge/
├── catalog/
│   ├── products/
│   ├── manufacturers/
│   ├── active-ingredients/
│   ├── conditions/
│   └── taxonomies/
├── animals/
│   ├── breeds/
│   └── taxonomies/
├── geo/
│   └── places/
└── clinical/
    └── treatment-protocols/
```

Todo diretório de entidade segue o mesmo envelope físico:

```text
<entity>/
├── _entity.json
├── _content/
│   ├── pt-BR.md
│   ├── pt-PT.md
│   ├── gn-PY.md
│   ├── en-US.md
│   ├── es-ES.md
│   └── fr-FR.md
└── _media/
    └── <arquivo-editorial>.<extensão>
```

Os campos `entityType` e `id` formam a identidade usada pelos bancos e relações.
O `_entity.json` declara um único `contentPath` e associa cada `sectionNumber` a
uma `sectionKey`; o builder não infere semântica pelo rótulo editorial do heading
nem pelo nome das pastas.

`_entity.json` contém os campos estruturais compartilhados, as relações, os
valores localizados simples e a composição do conteúdo Markdown:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "<id-estavel>",
  "species": ["canine"],
  "originPlaceIds": ["england"],
  "regions": ["BRA", "PRT"],
  "sizeTermKey": "medium",
  "relations": {},
  "localizedContent": {
    "name": {
      "pt-BR": "Beagle",
      "pt-PT": "Beagle",
      "gn-PY": "Beagle",
      "en-US": "Beagle",
      "es-ES": "Beagle",
      "fr-FR": "Beagle"
    },
    "aliases": {
      "pt-BR": ["Beagle inglês"],
      "pt-PT": ["Beagle inglês"],
      "gn-PY": [],
      "en-US": ["English Beagle"],
      "es-ES": [],
      "fr-FR": []
    }
  },
  "contentPath": "./_content",
  "sections": [
    {
      "sectionKey": "about",
      "sectionNumber": 1
    }
  ],
  "cover": "./_media/cover.webp"
}
```

Cada arquivo Markdown contém todas as seções editoriais do locale, sem front
matter. Headings de nível `#` começam por `# <sectionNumber>` e delimitam as
seções declaradas no manifesto. Um ponto e texto editorial depois do número são
opcionais e descartados integralmente. Headings inferiores permanecem no corpo
da seção corrente:

```markdown
# 1. Visão geral

Conteúdo localizado da seção.

## Características

![Texto alternativo](../_media/detail.webp "Legenda opcional")
```

Cada domínio possui um schema estrito de `_entity.json`, formatos esperados para
os campos localizados e um conjunto fechado de `sectionKey`. Nomes, aliases,
descrições simples e outros valores localizados ficam diretamente em
`localizedContent`, sempre no JSON do objeto proprietário. Labels e aliases
gerais de tipos, classificações e portes pertencem ao `localizedContent` do termo
taxonômico; as entidades relacionadas armazenam somente suas chaves canônicas
completas. Identificadores científicos e regulatórios permanecem estruturais.
Relações usam IDs estáveis e nunca nomes localizados. Conteúdo editorial rico
fica nos documentos Markdown. O builder usa somente o número do heading e
descarta o delimitador inteiro. A UI resolve o título pelo i18n da `sectionKey`.
As seções formam uma lista plana; headings inferiores organizam somente o corpo
Markdown da seção corrente.

Produtos referenciam princípios ativos por IDs de entidades
`active_ingredient`. Alvos, perfis vacinais, estágios de vida e escopos
terapêuticos usam taxonomias próprias. A busca deriva seus termos dessas relações
e não publica conceitos genéricos de busca como classificações de produto.

O builder resolve caminhos relativos dentro da entidade, analisa Markdown por
AST, aplica a allowlist, normaliza o AST deterministicamente e constrói o modelo
semântico canônico. Em seguida calcula SHA-256, deriva uma `media_key` de
`entityType`, `id` e caminho relativo, grava `media_key -> contentHash` no
`system_media` aplicável e materializa o objeto no `CAS/system`. O conteúdo
compilado seguro recebe referências `knowledge-media://asset/<media-key>`; a
fonte de autoria nunca contém essa URI.

Para cada entidade e locale, o builder separa o documento pelos headings
numerados e compõe todas as seções em um único `content_json` versionado. A ordem
do array `sections` representa a ordem da página, e cada item contém `sectionKey`
e o Markdown normalizado. Pacotes publicados
transportam esse documento dentro do banco `system`; não são criadas tabelas,
linhas ou artefatos independentes por seção.

Alterar os bytes preservando o caminho editorial mantém a `media_key` e produz
outro objeto CAS imutável. Renomear a mídia exige atualizar as referências e
produz outra chave técnica. Bytes idênticos continuam deduplicados pelo hash.

Na saída física do builder, cada objeto usa a disposição
`CAS/system/<2-hex>/<2-hex>/<hash>.bin`. O Hub localiza os objetos pelo relatório
do build e pelo resolvedor de hash; ele não deduz a identidade a partir da pasta
editorial da mídia.

A validação exige exatamente os seis locales em cada campo de
`localizedContent`, inclusive nos termos taxonômicos, e um documento Markdown por
locale em cada entidade com seções. O processo recusa ID duplicado, referência
inexistente, chave taxonômica parcial ou de outro domínio, locale desconhecido,
mapa localizado incompleto, front matter, arquivo não declarado, `sectionKey`
inválida, `sectionNumber` ausente, repetido, descontínuo ou fora de ordem, seção
ausente ou adicional, conteúdo antes da primeira seção, AST incompatível, HTML
bruto, nó fora da allowlist, protocolo não permitido, caminho absoluto, remoto
ou que resolva fora da entidade e mídia não referenciada. A projeção de cada
locale combina o manifesto com seu documento e produz o mesmo conjunto de IDs e
relações não localizáveis nos seis bancos.

## Fronteira Com A Preparação Local

O mesmo `knowledge-builder` Rust da Parte 1B produz o estado integral candidato,
composto pelos seis pares de bancos finais, pela união CAS referenciada e por
`build-result.json`. O Rails reserva primeiro a identidade da release em estado
`draft`, fornece essa identidade em `build-context.json` e transforma o resultado
validado em uma release publicável:

- uma nova geração produz um bootstrap completo por locale;
- uma revisão compara cada locale com a release anterior e produz um delta por
  locale;
- os pacotes, patches e manifests são derivados e validados pelo `hub-server`.

A fronteira operacional é:

```mermaid
flowchart LR
    DATA["data/knowledge"] --> BUILDER["tools/knowledge-builder"]
    JOB["Solid Queue job"] --> BUILDER
    BUILDER --> RESULT["Staging + build-result.json"]
    RESULT --> SERVICES["Services Rails de release"]
    SERVICES --> RELEASES["Releases publicáveis"]
```

Nesta parte:

- usar `data/knowledge/` como fonte canônica configurada para o job;
- incluir ou montar essa fonte como diretório somente leitura no ambiente do
  Hub;
- compilar o `knowledge-builder` e incluí-lo no ambiente do Hub por build
  multi-stage;
- executar o binário em job assíncrono com argumentos separados, sem shell;
- reservar sob lock o `releaseId`, `generation`, `revision` e predecessor antes
  de montar `build-context.json`;
- usar um diretório exclusivo por job em
  `apps/hub-server/tmp/knowledge-builds/<job-id>/`;
- aplicar timeout, limite de recursos, lock de geração e ambiente mínimo;
- recusar código de saída diferente de zero;
- validar `schemaVersion`, `builderVersion`, `sourceDigestSha256`, os seis locales,
  identidade da release, versões e fingerprints de schema, checksums, digests e
  o contrato de `projection-report.json` declarado por `build-result.json`;
- exigir cobertura integral de entidades e relações, sem item não consumido ou
  referência não resolvida;
- resolver somente caminhos relativos normalizados dentro do staging e validar
  tamanho e SHA-256 de cada arquivo declarado;
- calcular o SHA-256 dos bytes de `build-result.json` e persistir toda a
  proveniência em `KnowledgeRelease`;
- exigir que `knowledge_build_metadata` nos doze bancos corresponda ao
  `build-result.json` e seja coerente em cada par;
- exigir que `knowledge_release_metadata` nos doze bancos corresponda ao draft e
  ao locale projetado;
- nunca editar os bancos produzidos pelo builder;
- mover somente artefatos validados para o armazenamento persistente configurado;
- manter em Ruby somente jobs, estados, releases, patches, pacotes, assinatura,
  manifests, publicação e providers;
- impedir DDL, seeds, projeção de locale ou montagem de `CAS/system` em Ruby.

O diretório `tmp/` é staging descartável e nunca armazena uma release publicada.
O armazenamento persistente do Hub conserva pacotes, bancos necessários à cadeia
de patches e objetos CAS conforme a política de retenção.

Ao concluir esta parte, existe uma única fonte canônica em `data/knowledge/` e um
único compilador em `tools/knowledge-builder/`. O app ainda mantém o consumo local
estabelecido na Parte 1C até a refatoração de aquisição da Parte 4.

`buildVersion` identifica a execução e o namespace de saída do builder. Ela é
interna, não entra no manifest público e não determina `generation` ou
`revision`. A release pública recebe sua identidade no `hub-server` antes da
invocação e o builder apenas a materializa nos bancos.

## Comandos Operacionais

```text
rails knowledge:validate
rails knowledge:build
rails knowledge:build_database_patches
rails knowledge:build_release_components
rails knowledge:build_release_package
rails knowledge:prepare_workspace
rails knowledge:publish_release
rails knowledge:promote_channel
rails knowledge:replicate_manifests
```

`knowledge:validate` e `knowledge:build` invocam respectivamente `validate` e
`build` na CLI Rust. `knowledge:publish_release` orquestra build, validação,
empacotamento e publicação do conteúdo imutável. `knowledge:promote_channel` cria
o próximo snapshot assinado e troca o ponteiro do canal. Uma execução repetida
com a mesma entrada, versão do builder e configuração produz os mesmos artefatos
e reutiliza objetos CAS existentes.
`knowledge:replicate_manifests` retoma cópias pendentes sem alterar o snapshot, a
sequência ou a release do canal.

`knowledge:prepare_workspace` invoca o mesmo binário Rust com `data/knowledge` e
o destino `build/knowledge-artifacts` consumido pelo app ao final da Parte 1C e usa
um contexto com `release: null`. Essa tarefa mantém o desenvolvimento e os builds
executáveis durante esta parte sem duplicar compilador ou dados fonte. Ela não
publica release, não cria outra identidade pública e é retirada na Parte 4,
quando o app passa a consumir a API. O `knowledge-builder` permanece.

Os comandos de build e publicação operam sobre o conjunto completo de seis
locales. Não existe publicação parcial de um locale sob uma versão global.

## Versão Global

A versão de conhecimento possui dois inteiros:

```text
generation.revision
```

Exemplos:

```text
1.0  bootstrap completo da geração 1
1.1  delta de 1.0 para 1.1
1.2  delta de 1.1 para 1.2
2.0  bootstrap completo consolidado da geração 2
2.1  delta de 2.0 para 2.1
```

`1.10` representa geração `1`, revisão `10`. Versões são comparadas como pares de
inteiros, nunca como números decimais. O par é globalmente único e uma release
pode ser promovida para mais de um canal.

Uma versão é criada somente quando o conjunto público está pronto para ser
entregue aos apps. Alterações editoriais ainda não publicadas permanecem fora da
cadeia pública.

## Artefatos De Bootstrap

Uma release `generation.0` produz seis pacotes:

```text
knowledge-bootstrap-2.0-pt-BR-<release-id>.zip
knowledge-bootstrap-2.0-pt-PT-<release-id>.zip
knowledge-bootstrap-2.0-gn-PY-<release-id>.zip
knowledge-bootstrap-2.0-en-US-<release-id>.zip
knowledge-bootstrap-2.0-es-ES-<release-id>.zip
knowledge-bootstrap-2.0-fr-FR-<release-id>.zip
```

Cada pacote contém:

```text
knowledge-bootstrap-2.0-pt-BR-<release-id>.zip
├── release.json
├── databases/
│   ├── system.db
│   └── system_media.db
└── CAS/
    └── <hashes referenciados>
```

Os bancos são snapshots completos do locale. `CAS/` contém todos os objetos
referenciados pelo `system_media.db` daquele locale e versão. Objetos sem
referência não entram no pacote. O mesmo objeto pode aparecer em mais de um ZIP,
mas converge para um único arquivo no CAS compartilhado do app e do servidor.
O empacotador lê a disposição fragmentada da saída do builder e usa
`CAS/<hash>` como caminho interno canônico de transporte. Essa normalização não
altera bytes nem identidade do objeto.

## Artefatos De Delta

Uma release com revisão positiva produz seis pacotes equivalentes a:

```text
knowledge-delta-2.2-pt-BR-<release-id>.zip
```

O pacote contém:

```text
knowledge-delta-2.2-pt-BR-<release-id>.zip
├── release.json
├── database-patches/
│   ├── system.bsdiff
│   └── system_media.bsdiff
└── CAS/
    └── <objetos adicionados, quando houver>
```

Patches de banco usam `bsdiff_v1`, compatível com BSDIFF40, sobre os bytes exatos
dos bancos da release anterior. Cada descritor declara:

- checksum SHA-256 exigido da base;
- checksum SHA-256 do patch compactado;
- checksum SHA-256 do banco final;
- tamanho do patch e do banco final;
- formato e caminho interno do patch.

O delta CAS contém somente objetos adicionados ao locale na revisão. Remoções
acontecem pela retirada de referências em seu `system_media`; objetos físicos
permanecem no cofre para permitir rollback e são tratados por uma rotina
posterior de garbage collection.

Cada locale da release sempre descreve os três componentes. `cas_system` usa
`deliveryMode: unchanged` quando seu conjunto não muda e `index_only` quando a
mudança ocorre apenas pela retirada de referências. Esses modos não publicam um
arquivo artificial.

Os doze bancos sempre recebem a nova versão e seu locale em
`knowledge_release_metadata`. Consequentemente, toda revisão delta publica um
patch para `system` e outro para `system_media` em cada locale, mesmo quando a
alteração adicional de um deles é vazia.

## Manifest De Conhecimento

O payload assinado contém todos os locales. O exemplo detalha `pt-BR`; `pt-PT`,
`gn-PY`, `en-US`, `es-ES` e `fr-FR` repetem a mesma estrutura e são obrigatórios
no documento publicado:

```json
{
  "schemaVersion": 1,
  "snapshotId": "<snapshot-uuid-stable-42>",
  "manifestSequence": 42,
  "releaseId": "<uuid-2.2>",
  "currentVersion": {
    "generation": 2,
    "revision": 2
  },
  "channel": "stable",
  "supportedAppVersions": {
    "min": "0.2.0",
    "max": null
  },
  "supportedLocales": [
    "pt-BR",
    "pt-PT",
    "gn-PY",
    "en-US",
    "es-ES",
    "fr-FR"
  ],
  "locales": {
    "pt-BR": {
      "bootstrap": {
        "releaseId": "<uuid-2.0>",
        "version": {
          "generation": 2,
          "revision": 0
        },
        "package": {
          "locale": "pt-BR",
          "artifactType": "knowledge_bootstrap_package",
          "descriptorPath": "release.json",
          "descriptorChecksumSha256": "<release-json-sha256>",
          "checksumSha256": "<bootstrap-package-sha256>",
          "sizeBytes": 123456,
          "signature": "<signature>"
        },
        "components": {
          "system": {
            "deliveryMode": "snapshot",
            "entryPath": "databases/system.db",
            "entryChecksumSha256": "<system-2.0-sha256>",
            "entrySizeBytes": 123456,
            "schemaVersion": 1,
            "targetChecksumSha256": "<system-2.0-sha256>",
            "targetSizeBytes": 123456
          },
          "systemMedia": {
            "deliveryMode": "snapshot",
            "entryPath": "databases/system_media.db",
            "entryChecksumSha256": "<system-media-2.0-sha256>",
            "entrySizeBytes": 123456,
            "schemaVersion": 1,
            "targetChecksumSha256": "<system-media-2.0-sha256>",
            "targetSizeBytes": 123456
          },
          "casSystem": {
            "deliveryMode": "snapshot",
            "entryPrefix": "CAS/",
            "targetSetDigestSha256": "<sorted-hash-set-sha256>",
            "artifactHashCount": 1234,
            "targetHashCount": 1234
          }
        }
      },
      "deltas": [
        {
          "releaseId": "<uuid-2.1>",
          "fromVersion": {
            "generation": 2,
            "revision": 0
          },
          "toVersion": {
            "generation": 2,
            "revision": 1
          },
          "package": {
            "locale": "pt-BR",
            "artifactType": "knowledge_delta_package",
            "descriptorPath": "release.json",
            "descriptorChecksumSha256": "<release-json-sha256>",
            "checksumSha256": "<delta-package-sha256>",
            "sizeBytes": 17845,
            "signature": "<signature>"
          },
          "components": {
            "system": {
              "deliveryMode": "patch",
              "entryPath": "database-patches/system.bsdiff",
              "entryChecksumSha256": "<system-patch-sha256>",
              "entrySizeBytes": 2500,
              "patchFormat": "bsdiff_v1",
              "baseChecksumSha256": "<system-2.0-sha256>",
              "targetChecksumSha256": "<system-2.1-sha256>",
              "targetSizeBytes": 124000
            },
            "systemMedia": {
              "deliveryMode": "patch",
              "entryPath": "database-patches/system_media.bsdiff",
              "entryChecksumSha256": "<system-media-patch-sha256>",
              "entrySizeBytes": 3000,
              "patchFormat": "bsdiff_v1",
              "baseChecksumSha256": "<system-media-2.0-sha256>",
              "targetChecksumSha256": "<system-media-2.1-sha256>",
              "targetSizeBytes": 124000
            },
            "casSystem": {
              "deliveryMode": "patch",
              "entryPrefix": "CAS/",
              "baseSetDigestSha256": "<cas-2.0-set-digest>",
              "targetSetDigestSha256": "<cas-2.1-set-digest>",
              "artifactHashCount": 42,
              "targetHashCount": 1276
            }
          }
        },
        {
          "releaseId": "<uuid-2.2>",
          "fromVersion": {
            "generation": 2,
            "revision": 1
          },
          "toVersion": {
            "generation": 2,
            "revision": 2
          },
          "package": {
            "locale": "pt-BR",
            "artifactType": "knowledge_delta_package",
            "descriptorPath": "release.json",
            "descriptorChecksumSha256": "<release-json-sha256>",
            "checksumSha256": "<delta-package-sha256>",
            "sizeBytes": 8989,
            "signature": "<signature>"
          },
          "components": {
            "system": {
              "deliveryMode": "patch",
              "entryPath": "database-patches/system.bsdiff",
              "entryChecksumSha256": "<system-patch-sha256>",
              "entrySizeBytes": 400,
              "patchFormat": "bsdiff_v1",
              "baseChecksumSha256": "<system-2.1-sha256>",
              "targetChecksumSha256": "<system-2.2-sha256>",
              "targetSizeBytes": 124100
            },
            "systemMedia": {
              "deliveryMode": "patch",
              "entryPath": "database-patches/system_media.bsdiff",
              "entryChecksumSha256": "<system-media-patch-sha256>",
              "entrySizeBytes": 1800,
              "patchFormat": "bsdiff_v1",
              "baseChecksumSha256": "<system-media-2.1-sha256>",
              "targetChecksumSha256": "<system-media-2.2-sha256>",
              "targetSizeBytes": 125000
            },
            "casSystem": {
              "deliveryMode": "patch",
              "entryPrefix": "CAS/",
              "baseSetDigestSha256": "<cas-2.1-set-digest>",
              "targetSetDigestSha256": "<cas-2.2-set-digest>",
              "artifactHashCount": 18,
              "targetHashCount": 1294
            }
          }
        }
      ]
    }
  },
  "deliverySources": {
    "bootstrap": [
      {
        "provider": "hub_server",
        "priority": 1,
        "enabled": true,
        "transport": "http",
        "urlPattern": "/api/v1/knowledge/releases/{releaseId}/locales/{locale}/package"
      },
      {
        "provider": "github",
        "priority": 2,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<github-assets-base>/knowledge-bootstrap-{generation}.{revision}-{locale}-{releaseId}.zip"
      },
      {
        "provider": "cloudflare_r2",
        "priority": 3,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<r2-assets-base>/knowledge-bootstrap-{generation}.{revision}-{locale}-{releaseId}.zip"
      },
      {
        "provider": "gitlab",
        "priority": 4,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<gitlab-assets-base>/knowledge-bootstrap-{generation}.{revision}-{locale}-{releaseId}.zip"
      }
    ],
    "delta": [
      {
        "provider": "hub_server",
        "priority": 1,
        "enabled": true,
        "transport": "http",
        "urlPattern": "/api/v1/knowledge/releases/{releaseId}/locales/{locale}/package"
      },
      {
        "provider": "github",
        "priority": 2,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<github-assets-base>/knowledge-delta-{generation}.{revision}-{locale}-{releaseId}.zip"
      },
      {
        "provider": "cloudflare_r2",
        "priority": 3,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<r2-assets-base>/knowledge-delta-{generation}.{revision}-{locale}-{releaseId}.zip"
      },
      {
        "provider": "gitlab",
        "priority": 4,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<gitlab-assets-base>/knowledge-delta-{generation}.{revision}-{locale}-{releaseId}.zip"
      }
    ]
  },
  "cas": {
    "branch": "system",
    "indexDatabase": "system_media",
    "hashAlgorithm": "sha256",
    "hashEncoding": "hex",
    "objects": {
      "pathTemplate": "CAS/system/{hash}",
      "sources": []
    }
  },
  "publishedAt": "2026-08-13T12:00:00Z",
  "expiresAt": "2026-08-20T12:00:00Z",
  "changelog": []
}
```

O envelope `authenticity` definido no índice envolve o payload inteiro.
`deliverySources` resolve cada pacote obrigatoriamente por `{releaseId}` e
`{locale}`. `{generation}` e `{revision}` podem compor o nome legível do arquivo,
mas não são a identidade completa usada pelo resolver.
`cas.objects.sources[]` permanece um contrato separado para reconciliação por
`{hash}`.

O `release.json` interno usa a mesma identidade, versão, locale, tipo de pacote e
descritores de componentes declarados no item correspondente do manifest. Seu
campo `artifactHashes` lista, em ordem lexicográfica e sem duplicatas, cada hash
presente sob `CAS/`. `artifactHashCount` deve ser igual ao tamanho dessa lista.
O descritor também inclui `buildVersion`, `builderVersion`,
`buildResultSchemaVersion`, `buildResultChecksumSha256` e
`sourceDigestSha256`. Esses campos são copiados da proveniência validada da
release e permitem conferir `knowledge_build_metadata` nos bancos transportados
ou reconstruídos por patch.

Sources previstas inicialmente:

```text
hub_server       priority 1  enabled true
github           priority 2  enabled false
cloudflare_r2    priority 3  enabled false
gitlab           priority 4  enabled false
ipfs             priority 5  enabled false, somente objects
```

IPFS usa `cidField` para localizar o CID no índice de mídia. O app sempre valida
o conteúdo recebido pelo SHA-256 local, independentemente do provider.

As manifest sources formam uma configuração de descoberta separada:

```text
hub_server       priority 1  enabled true
github           priority 2  enabled false
cloudflare_r2    priority 3  enabled false
gitlab           priority 4  enabled false
```

Cada manifest source define `currentUrlPattern`, `snapshotUrlPattern` e
`requiredForHealthyChannel`. O caminho `current` entrega o snapshot assinado
vigente do canal. O caminho de snapshot inclui `{channel}`, `{sequence}` e
`{snapshotId}` e permanece imutável.

Os padrões da source `hub_server` são:

```text
/api/v1/knowledge/manifest?channel={channel}&app_name={appName}&app_version={appVersion}
/api/v1/knowledge/channels/{channel}/manifests/{sequence}/{snapshotId}
```

Uma source estática usa:

```text
manifests/{channel}/current.json
manifests/{channel}/{sequence}-{snapshotId}.json
```

A configuração não integra o payload do manifest, pois o app precisa conhecê-la
antes da descoberta. Os providers recebem os bytes canônicos produzidos pelo Hub
e não executam serialização ou assinatura próprias.

Os padrões da source `hub_server` seguem:

```text
/api/v1/knowledge/releases/{releaseId}/locales/{locale}/package
/api/v1/cas/system/{hash}
```

Cada provider aparece uma vez em `deliverySources.bootstrap` e uma vez em
`deliverySources.delta`. Os itens de `locales[locale].bootstrap` e
`locales[locale].deltas[]` informam versão, locale, pacote, integridade e estado
dos componentes; a URL efetiva resulta da substituição dos placeholders na
source habilitada.

## Snapshots De Canal

`KnowledgeRelease` não pertence a um canal. Depois que uma release está
publicada, ela pode ser promovida para qualquer canal compatível.

Cada promoção cria um `KnowledgeManifestSnapshot` com:

- `snapshotId` imutável;
- `manifestSequence` inteiro, positivo e imediatamente posterior ao vigente;
- release publicada selecionada pelo canal;
- sources vigentes capturadas no payload;
- `publishedAt` e `expiresAt` assinados;
- checksum, assinatura e `keyId`.

Uma alteração somente de source ou validade cria outro snapshot apontando para a
mesma release. A sequência é alocada sob lock do canal. Persistência do snapshot
e troca de `KnowledgeChannelRelease` ocorrem na mesma transação.

A transação também grava uma outbox para replicação. Cada worker publica
exatamente o documento persistido no caminho imutável da source, atualiza o
caminho `current` e lê novamente a resposta para conferir tamanho e checksum.
Falhas registram a réplica como pendente ou falha e são retomadas de forma
idempotente.

A transação do banco e a publicação em providers externos não formam uma
transação distribuída. O Hub oferece o novo snapshot imediatamente após a
promoção, enquanto as réplicas convergem. Quando houver source externa marcada
como obrigatória, o canal só é considerado saudável quando ela e a source
`hub_server` entregam o mesmo checksum. Uma réplica anterior ainda vigente é
segura durante essa janela, e o atraso gera diagnóstico operacional.

Um job periódico renova canais cujo snapshot se aproxima de `expiresAt`. A
renovação cria a próxima sequência para a mesma release usando as sources
vigentes. Falha de assinatura ou publicação conserva o snapshot e o ponteiro
atuais e gera alerta operacional antes da expiração.

## Cadeia De Releases

- Cada bootstrap de locale possui revisão zero e não depende de outra release.
- Todo delta de locale aponta para a revisão imediatamente anterior da mesma
  geração.
- A cadeia publicada não contém revisões ausentes ou duplicadas.
- Cada locale declara seus três componentes e o estado final na versão.
- Os doze bancos registram geração, revisão e locale em
  `knowledge_release_metadata`.
- A base de cada patch coincide com o checksum final do componente anterior.
- O digest CAS de cada locale é calculado sobre a lista ordenada dos hashes
  referenciados por seu `system_media`.
- `artifactHashCount` conta objetos transportados no pacote do locale;
  `targetHashCount` conta hashes referenciados no estado final daquele locale.
- O último delta de cada locale termina exatamente em `currentVersion`.
- O manifest contém, para cada locale, somente o bootstrap da geração vigente e
  os deltas necessários até a versão atual.

## Consolidação

Uma nova geração é publicada quando a política operacional determina. A decisão
considera:

- período desde o bootstrap vigente;
- quantidade de deltas acumulados;
- soma dos tamanhos dos deltas em relação ao bootstrap;
- mudanças relevantes nos schemas;
- custo de instalação e recuperação para clientes novos ou atrasados.

Cada bootstrap consolidado contém o par de bancos final de seu locale e apenas os
objetos CAS referenciados pelo respectivo `system_media`. A geração começa em
revisão zero para os seis locales. Mudança incompatível de schema exige nova
geração e faixa de versões de app compatível. Mudança aditiva somente entra como
delta quando os apps suportados conseguem consumir o schema resultante.

O Hub conserva os doze bancos finais exatos das revisões publicadas na cadeia
vigente. Esses arquivos são as bases imutáveis usadas para gerar e verificar
patches posteriores.

## Publicação Da Release

```text
criar KnowledgeRelease em draft
-> criar os seis KnowledgeReleaseLocale
-> gerar os seis pares de bancos e a união CAS em staging
-> validar IDs e relações estruturais equivalentes entre locales
-> gerar bancos completos ou patches para cada locale conforme release_kind
-> calcular checksums, tamanhos e digest CAS de cada locale
-> criar os três KnowledgeReleaseComponent de cada locale
-> gerar um release.json canônico por locale
-> montar e validar os seis ZIPs
-> criar KnowledgeArtifact e KnowledgeReleasePackage para cada locale
-> validar os doze bancos finais e todos os objetos CAS
-> materializar no armazenamento persistente do Hub os objetos CAS ausentes
-> validar a cadeia global e os estados de todos os locales
-> mudar release para published
```

Publicar a release não modifica `KnowledgeChannelRelease` nem cria um manifest.

## Promoção Do Canal

```text
selecionar uma KnowledgeRelease publicada
-> adquirir lock do canal
-> alocar a próxima manifestSequence
-> carregar as KnowledgeDeliverySource e KnowledgeCasObjectSource vigentes
-> montar o payload canônico com release e sources vigentes
-> definir publishedAt e expiresAt
-> assinar e verificar o KnowledgeManifestSnapshot
-> persistir o snapshot e trocar KnowledgeChannelRelease na mesma transação
-> gravar outbox para as manifest sources habilitadas
-> publicar os mesmos bytes nos caminhos imutável e current
-> verificar checksum de cada réplica
-> confirmar a saúde do canal conforme as sources obrigatórias
```

Nenhum arquivo de staging fica publicamente acessível antes da conclusão. Falha
na publicação deixa a release indisponível. Falha anterior à confirmação da
transação de promoção preserva o snapshot e o ponteiro vigentes. Falha posterior
em uma réplica conserva o novo snapshot no Hub, marca o canal como degradado e
aciona retry sem gerar outra sequência.

## Regras De Publicação

- Todos os artefatos obrigatórios existem antes de publicar.
- Os seis locales obrigatórios pertencem à mesma versão global.
- Cada locale possui exatamente um pacote e três componentes.
- Os doze bancos registram a mesma versão global e o locale correspondente em
  `knowledge_release_metadata`.
- IDs e relações não localizáveis permanecem equivalentes entre locales.
- Patches reproduzem exatamente os checksums finais declarados.
- Hash, tamanho e assinatura de cada pacote correspondem aos bytes entregues.
- Cada `release.json` corresponde à release e ao locale declarados no manifest.
- `artifactHashes` corresponde exatamente às entradas CAS do pacote do locale.
- Todas as delivery sources resolvem os mesmos pacotes imutáveis.
- URLs habilitadas usam providers, hosts e transports permitidos.
- O manifest é gerado a partir dos registros normalizados.
- `manifestSequence` incrementa exatamente uma unidade em relação ao snapshot
  vigente do canal.
- `expiresAt` é posterior a `publishedAt` e respeita a duração máxima configurada.
- A source `hub_server` para objeto individual somente é habilitada quando o
  armazenamento persistente do Hub contém todos os hashes da release.
- O snapshot assinado persiste exatamente os bytes devolvidos pela API.
- Uma release publicada não aceita alterações em artefatos ou componentes.
- Um snapshot publicado não aceita alterações de payload, sources, validade ou
  assinatura.
- Somente o Hub aloca `manifestSequence` e assina snapshots.
- Toda réplica contém exatamente os bytes canônicos persistidos no Hub.
- O caminho `current` nunca contém um ponteiro sem assinatura nem depende de
  resolução `latest`.
- Falha de réplica não cria nova sequência e é retomada pela outbox.
- Retirada ou substituição altera os ponteiros por meio de novo snapshot, sem
  reescrever snapshots existentes.

## Testes

Cobrir:

- mesma fixture produzindo os mesmos checksums pela execução direta e pela
  orquestração Rails do builder;
- inclusão do binário Rust no ambiente executável do Hub;
- invocação por argumentos sem interpolação de shell;
- diretório de staging exclusivo por job e limpeza após sucesso ou falha;
- timeout, código de saída não zero e concorrência sob lock;
- reserva atômica do draft antes da invocação do builder;
- retry idempotente usando a mesma identidade de draft;
- bloqueio de publicação e promoção enquanto o draft não possui build válido;
- contexto público com `releaseId`, geração e revisão coerentes com o draft;
- predecessor do draft coerente com a cadeia global;
- recusa de `build-result.json` ausente, malformado ou incompatível;
- recusa de `builderVersion`, `sourceDigestSha256`, checksum ou locale divergente;
- recusa de fingerprint de schema divergente;
- recusa de relatório de projeção ausente, inválido ou com cobertura incompleta;
- recusa de caminho absoluto, com `..` ou fora do staging;
- recusa de relatório ou banco cuja identidade pública diverge do draft;
- ausência de alteração nos bancos depois da saída do builder;
- ausência de DDL, seeds, projeção ou geração de CAS em Ruby;
- ausência de catálogos publicados em `packages/types`;
- preparação do layout local pelo mesmo builder Rust em um workspace limpo;
- inicialização do app com os artefatos exportados durante esta parte;
- validação dos schemas de `_entity.json`, dos mapas localizados JSON e dos
  contratos Markdown de cada domínio;
- um diretório de entidade por ID e integridade de todas as referências
  estruturais;
- presença exata dos seis locales em cada campo de `localizedContent`;
- conteúdo simples projetado diretamente do JSON, sem diretório `localized/`;
- resolução de toda referência taxonômica por chave canônica completa;
- ausência de labels e aliases taxonômicos duplicados nas entidades;
- resolução integral das relações entre produtos e princípios ativos;
- decomposição de combinações farmacológicas em relações individuais;
- ausência de chaves ou termos `searchConcept.*`;
- presença de um Markdown por locale em cada entidade com seções;
- associação de cada `sectionNumber` a uma `sectionKey` no manifesto;
- delimitação das seções por headings iniciados por `# <n>`, analisados via AST;
- descarte do heading delimitador e ausência de `sectionNumber` e texto editorial
  na saída;
- composição determinística de um `content_json` localizado por entidade, com
  lista plana ordenada e Markdown compilado;
- recusa de front matter, AST inválido e conteúdo não declarado;
- projeção isolada de cada locale sem alterar campos estruturais;
- projeção de `geo_place` como domínio compartilhado e resolução de todos os
  `originPlaceIds` das raças;
- composição de capas e imagens Markdown em cada `system_media`;
- resolução segura das referências relativas de mídia;
- geração e validação da relação `mediaKey -> contentHash`;
- alteração de bytes no mesmo caminho preservando `mediaKey` e mantendo objetos
  CAS anteriores;
- alteração de bytes produzindo patch de `system_media` e adição CAS, sem exigir
  mudança nas referências compiladas;
- geração e integridade dos bancos finais;
- geração dos seis pares de bancos;
- igualdade de IDs e relações estruturais entre locales;
- recusa de locale ausente, desconhecido ou incompleto;
- geração dos seis bootstraps na mesma versão global;
- geração e verificação de `release.json` por locale;
- proveniência do `release.json` idêntica a `knowledge_build_metadata` nos bancos;
- geração de seis ZIPs por release;
- geração e aplicação de patch binário para cada banco;
- patches dos doze bancos em toda revisão;
- componente CAS `index_only` e `unchanged` sem artefato;
- geração do delta CAS e digest do conjunto final;
- consolidação em nova geração;
- materialização segura do CAS persistente do Hub;
- recusa de revisão ausente, duplicada ou com predecessor incorreto;
- recusa de patch com base ou resultado divergente;
- recusa de conjunto CAS incompatível com o `system_media` do locale;
- geração canônica e assinatura do manifest;
- promoção da mesma release para mais de um canal;
- snapshot posterior para a mesma release após alteração de source;
- sequência concorrente sob lock, expiração e recusa de validade excessiva;
- publicação e verificação das réplicas de manifest;
- retry idempotente de réplica sem alteração de sequência;
- source `current` contendo exatamente o snapshot canônico;
- atraso de réplica mantendo o canal disponível pelo Hub;
- renovação antecipada para a mesma release e alerta diante de falha;
- recusa de assinatura inválida;
- recusa de source habilitada com destino não permitido;
- fallback do pacote completo entre delivery sources habilitadas;
- publicação idempotente completa;
- preservação do canal diante de falha parcial;
- imutabilidade após publicação;
- resolução de pacotes de locale e objetos individuais pela API pública;
- resolução do pacote exclusivamente pelo par `releaseId` e `locale`.

## Critérios De Aceite

- O `hub-server` valida os dados públicos canônicos antes de preparar uma
  release.
- `tools/knowledge-builder` é o único compilador dos artefatos públicos.
- O Rails invoca a CLI Rust e valida integralmente `build-result.json` antes de
  registrar os artefatos.
- O Rails valida o checksum e a cobertura integral de `projection-report.json`.
- Toda release pública reserva sua identidade antes do build e os doze bancos
  registram exatamente essa identidade e seus respectivos locales.
- O ambiente executável do Hub contém uma versão explícita do builder.
- Ruby não implementa DDL, seeds, projeção de locale nem montagem do CAS.
- Os catálogos publicados possuem `data/knowledge/` como única fonte de autoria.
- O Hub consegue usar o builder para materializar a saída local necessária ao app
  até a Parte 4.
- Os dados fonte são organizados por domínio e diretório de entidade, com
  `localizedContent` inline no `_entity.json`, referências taxonômicas por chaves
  canônicas completas, um documento Markdown por locale e mídias referenciadas
  por caminhos relativos.
- Toda versão coordena os seis pares de bancos e o `CAS/system` compartilhado.
- A versão usa geração e revisão inteiras.
- Os doze bancos registram a mesma versão global e seus respectivos locales.
- Cada bootstrap instala o estado completo de um locale na geração.
- Os deltas de cada locale formam uma cadeia contínua até `currentVersion`.
- Cada release é distribuída por seis pacotes, um para cada locale.
- Sources são declaradas uma vez por provider e tipo de entrega.
- Todo patch de banco exige a base correta e produz o checksum final esperado.
- Cada `system_media.db` descreve o conjunto CAS final de seu locale.
- O manifest representa separadamente as versões técnicas dos bancos.
- O armazenamento persistente do Hub resolve todos os hashes antes de habilitar
  sua source individual.
- O manifest é assinado e verificável pelas chaves confiáveis do app.
- O mesmo manifest assinado é resolvível pela source principal e, quando
  configurada, por uma source externa habilitada.
- Publicar uma release não altera canais.
- A promoção cria um snapshot sequencial e troca o canal de forma transacional.
- A replicação externa é verificável, idempotente e observável.
- Release ou snapshot canônico incompleto não se torna visível pelo Hub.

## Próxima Parte

[Parte 4: Consumo dos artefatos nos apps](./04-app-artifact-consumption.md)
