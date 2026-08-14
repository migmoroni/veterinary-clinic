# Parte 3: Dados Públicos E Publicação

## Objetivo

Fazer `apps/hub-server` concentrar os dados públicos, gerar os artefatos de
referência e publicar releases globais de conhecimento completas e assinadas.

Cada release coordena `system`, `system_media` e `CAS/system` sob a mesma versão.
Esta parte depende da [base Rails](./02-rails-api-contracts.md) e segue os
[contratos comuns](./README.md).

## Dados Públicos

Modelar e validar:

- raças;
- fabricantes;
- produtos;
- princípios ativos;
- condições clínicas;
- protocolos públicos;
- mídias públicas associadas aos catálogos.

`apps/hub-server` possui operacionalmente os dados fonte públicos e a geração dos
artefatos. `packages/types` conserva contratos compartilhados, sem armazenar o
catálogo publicado.

## Fronteira Com A Preparação Local

O gerador Ruby produz primeiro um estado integral candidato, composto pelos dois
bancos finais e pelo conjunto CAS referenciado. A publicação transforma esse
estado em uma release pública:

- uma nova geração produz um bootstrap completo;
- uma revisão compara o candidato com a release anterior e produz um delta;
- os pacotes, patches e manifests são derivados e validados no `hub-server`.

A `build_version` inteira usada na preparação local identifica somente uma saída
de desenvolvimento ou build. Ela não entra no manifest público e não determina
`generation` ou `revision`. A release pública recebe sua identidade dentro do
`hub-server`.

## Comandos Operacionais

```text
rails knowledge:validate
rails knowledge:build_system
rails knowledge:build_system_media
rails knowledge:build_cas_system
rails knowledge:build_database_patches
rails knowledge:build_release_components
rails knowledge:build_release_package
rails knowledge:publish_release
rails knowledge:promote_channel
```

`knowledge:publish_release` orquestra geração, validação e publicação do conteúdo
imutável. `knowledge:promote_channel` cria o próximo snapshot assinado e troca o
ponteiro do canal. Uma execução repetida com a mesma entrada, versão e
configuração produz os mesmos artefatos e reutiliza objetos CAS existentes.

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

Uma release `generation.0` produz:

```text
knowledge-bootstrap-2.0-<release-id>.zip
```

O pacote contém:

```text
knowledge-bootstrap-2.0-<release-id>.zip
├── release.json
├── databases/
│   ├── system.db
│   └── system_media.db
└── CAS/
    └── <hashes referenciados>
```

Os bancos são snapshots completos. `CAS/` contém todos os objetos referenciados
pelo `system_media.db` da versão. Objetos sem referência não entram no pacote.

## Artefatos De Delta

Uma release com revisão positiva pode produzir:

```text
knowledge-delta-2.2-<release-id>.zip
```

O pacote contém:

```text
knowledge-delta-2.2-<release-id>.zip
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

O delta CAS contém somente objetos adicionados na revisão. Remoções acontecem
pela retirada de referências em `system_media`; objetos físicos permanecem no
cofre para permitir rollback e são tratados por uma rotina posterior de garbage
collection.

Uma release sempre descreve os três componentes. `cas_system` usa
`deliveryMode: unchanged` quando seu conjunto não muda e `index_only` quando a
mudança ocorre apenas pela retirada de referências. Esses modos não publicam um
arquivo artificial.

Os dois bancos sempre recebem a nova versão em `knowledge_release_metadata`.
Consequentemente, toda revisão delta publica um patch para `system` e outro para
`system_media`, mesmo quando a alteração adicional de um deles é vazia.

## Manifest De Conhecimento

O payload assinado contém, no mínimo:

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
  "bootstrap": {
    "releaseId": "<uuid-2.0>",
    "version": {
      "generation": 2,
      "revision": 0
    },
    "package": {
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
  ],
  "deliverySources": {
    "bootstrap": [
      {
        "provider": "hub_server",
        "priority": 1,
        "enabled": true,
        "transport": "http",
        "urlPattern": "/api/v1/knowledge/releases/{releaseId}/package"
      },
      {
        "provider": "github",
        "priority": 2,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<github-assets-base>/knowledge-bootstrap-{generation}.{revision}-{releaseId}.zip"
      },
      {
        "provider": "cloudflare_r2",
        "priority": 3,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<r2-assets-base>/knowledge-bootstrap-{generation}.{revision}-{releaseId}.zip"
      },
      {
        "provider": "gitlab",
        "priority": 4,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<gitlab-assets-base>/knowledge-bootstrap-{generation}.{revision}-{releaseId}.zip"
      }
    ],
    "delta": [
      {
        "provider": "hub_server",
        "priority": 1,
        "enabled": true,
        "transport": "http",
        "urlPattern": "/api/v1/knowledge/releases/{releaseId}/package"
      },
      {
        "provider": "github",
        "priority": 2,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<github-assets-base>/knowledge-delta-{generation}.{revision}-{releaseId}.zip"
      },
      {
        "provider": "cloudflare_r2",
        "priority": 3,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<r2-assets-base>/knowledge-delta-{generation}.{revision}-{releaseId}.zip"
      },
      {
        "provider": "gitlab",
        "priority": 4,
        "enabled": false,
        "transport": "http",
        "urlPattern": "https://<gitlab-assets-base>/knowledge-delta-{generation}.{revision}-{releaseId}.zip"
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
`deliverySources` resolve cada pacote global obrigatoriamente por `{releaseId}`.
`{generation}` e `{revision}` podem compor o nome legível do arquivo, mas não são
a identidade usada pelo resolver.
`cas.objects.sources[]` permanece um contrato separado para reconciliação por
`{hash}`.

O `release.json` interno usa a mesma identidade, versão, tipo de pacote e
descritores de componentes declarados no item correspondente do manifest. Seu
campo `artifactHashes` lista, em ordem lexicográfica e sem duplicatas, cada hash
presente sob `CAS/`. `artifactHashCount` deve ser igual ao tamanho dessa lista.

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

Os padrões da source `hub_server` seguem:

```text
/api/v1/knowledge/releases/{releaseId}/package
/api/v1/cas/system/{hash}
```

Cada provider aparece uma vez em `deliverySources.bootstrap` e uma vez em
`deliverySources.delta`. Os itens de `bootstrap` e `deltas[]` informam somente
versão, pacote, integridade e estado dos componentes; a URL efetiva resulta da
substituição dos placeholders na source habilitada.

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

Um job periódico renova canais cujo snapshot se aproxima de `expiresAt`. A
renovação cria a próxima sequência para a mesma release usando as sources
vigentes. Falha de assinatura ou publicação conserva o snapshot e o ponteiro
atuais e gera alerta operacional antes da expiração.

## Cadeia De Releases

- O bootstrap possui revisão zero e não depende de outra release.
- Todo delta aponta para a revisão imediatamente anterior da mesma geração.
- A cadeia publicada não contém revisões ausentes ou duplicadas.
- Cada componente declara seu estado final na versão.
- Os dois bancos registram a geração e a revisão em
  `knowledge_release_metadata`.
- A base de cada patch coincide com o checksum final do componente anterior.
- O digest do conjunto CAS é calculado sobre a lista ordenada dos hashes
  referenciados pelo `system_media` da versão.
- `artifactHashCount` conta objetos transportados pelo pacote global;
  `targetHashCount` conta hashes referenciados no estado final.
- O último delta termina exatamente em `currentVersion`.
- O manifest contém somente o bootstrap da geração vigente e os deltas necessários
  até a versão atual.

## Consolidação

Uma nova geração é publicada quando a política operacional determina. A decisão
considera:

- período desde o bootstrap vigente;
- quantidade de deltas acumulados;
- soma dos tamanhos dos deltas em relação ao bootstrap;
- mudanças relevantes nos schemas;
- custo de instalação e recuperação para clientes novos ou atrasados.

O bootstrap consolidado contém os bancos finais completos e apenas os objetos
CAS referenciados por seu `system_media`. A geração começa em revisão zero.
Mudança incompatível de schema exige nova geração e faixa de versões de app
compatível. Mudança aditiva somente entra como delta quando os apps suportados
conseguem consumir o schema resultante.

O Hub conserva os bancos finais exatos das revisões publicadas na cadeia vigente.
Esses arquivos são as bases imutáveis usadas para gerar e verificar patches
posteriores.

## Publicação Da Release

```text
criar KnowledgeRelease em draft
-> gerar bancos finais e CAS em staging
-> gerar bancos completos ou patches conforme release_kind
-> calcular checksums, tamanhos e digest do conjunto CAS
-> criar os três KnowledgeReleaseComponent
-> gerar release.json canônico
-> montar e validar o ZIP global
-> criar KnowledgeArtifact e KnowledgeReleasePackage
-> validar os bancos finais e todos os objetos CAS
-> materializar no armazenamento persistente do Hub os objetos CAS ausentes
-> validar a cadeia global e os estados de cada componente
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
```

Nenhum arquivo de staging fica publicamente acessível antes da conclusão. Falha
na publicação deixa a release indisponível. Falha na promoção preserva o snapshot
e o ponteiro vigentes.

## Regras De Publicação

- Todos os artefatos obrigatórios existem antes de publicar.
- Os três componentes pertencem à mesma versão global.
- Os dois bancos registram a mesma versão global em
  `knowledge_release_metadata`.
- Patches reproduzem exatamente os checksums finais declarados.
- Hash, tamanho e assinatura do pacote correspondem aos bytes entregues.
- `release.json` corresponde ao descritor declarado no manifest.
- `artifactHashes` corresponde exatamente às entradas CAS do pacote.
- Todas as delivery sources resolvem o mesmo pacote imutável.
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
- Retirada ou substituição altera os ponteiros por meio de novo snapshot, sem
  reescrever snapshots existentes.

## Testes

Cobrir:

- geração e integridade dos bancos finais;
- geração de bootstrap global;
- geração e verificação de `release.json`;
- geração de um único ZIP global por release;
- geração e aplicação de patch binário para cada banco;
- patches dos dois bancos em toda revisão;
- componente CAS `index_only` e `unchanged` sem artefato;
- geração do delta CAS e digest do conjunto final;
- consolidação em nova geração;
- materialização segura do CAS persistente do Hub;
- recusa de revisão ausente, duplicada ou com predecessor incorreto;
- recusa de patch com base ou resultado divergente;
- recusa de conjunto CAS incompatível com `system_media`;
- geração canônica e assinatura do manifest;
- promoção da mesma release para mais de um canal;
- snapshot posterior para a mesma release após alteração de source;
- sequência concorrente sob lock, expiração e recusa de validade excessiva;
- renovação antecipada para a mesma release e alerta diante de falha;
- recusa de assinatura inválida;
- recusa de source habilitada com destino não permitido;
- fallback do pacote completo entre delivery sources habilitadas;
- publicação idempotente completa;
- preservação do canal diante de falha parcial;
- imutabilidade após publicação;
- resolução de pacotes globais e objetos individuais pela API pública;
- resolução do pacote exclusivamente por `releaseId`.

## Critérios De Aceite

- O `hub-server` possui e valida os dados públicos.
- Toda versão coordena `system`, `system_media` e `CAS/system`.
- A versão usa geração e revisão inteiras.
- Os dois bancos registram a mesma versão global.
- O bootstrap instala o estado completo da geração.
- Os deltas formam uma cadeia contínua até `currentVersion`.
- Cada release é distribuída por um único pacote global.
- Sources são declaradas uma vez por provider e tipo de entrega.
- Todo patch de banco exige a base correta e produz o checksum final esperado.
- `system_media.db` descreve o conjunto CAS final da release.
- O manifest representa separadamente as versões técnicas dos bancos.
- O armazenamento persistente do Hub resolve todos os hashes antes de habilitar
  sua source individual.
- O manifest é assinado e verificável pelas chaves confiáveis do app.
- Publicar uma release não altera canais.
- A promoção cria um snapshot sequencial e troca o canal de forma transacional.
- Publicação incompleta não se torna visível.

## Próxima Parte

[Parte 4: Consumo dos artefatos nos apps](./04-app-artifact-consumption.md)
