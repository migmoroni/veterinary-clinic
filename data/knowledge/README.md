# Fonte Canônica De Conhecimento

Este diretório é a única fonte de autoria dos dados públicos compilados para
`system`, `system_media` e `CAS/system`. Apps e packages de runtime consomem
somente os artefatos finalizados pelo `knowledge-builder`.

## Organização Editorial

```text
data/knowledge/
├── catalog/
│   ├── active-ingredients/
│   ├── conditions/
│   ├── manufacturers/
│   ├── products/
│   └── taxonomies/
├── clinical/treatment-protocols/
├── geo/places/
└── life/
    ├── taxonomies/
    │   ├── types/_entity.json
    │   └── sizes/_entity.json
    └── eukaryota/
        └── animalia/.../<taxon>/_entity.json
```

O scanner descobre recursivamente cada `_entity.json`. Um diretório possui
manifesto somente quando representa uma entidade real; sua profundidade não
cria identidade, ancestralidade, classificação nem ordem. Mover uma entidade
sem alterar o manifesto não modifica seu digest lógico.

### Namespace Técnico Reservado

Somente três nomes iniciados por `_` possuem significado para o builder:

```text
<diretórios editoriais livres>/
└── <entidade>/
    ├── _entity.json
    ├── _content/
    │   ├── pt-BR.md
    │   ├── pt-PT.md
    │   ├── gn-PY.md
    │   ├── en-US.md
    │   ├── es-ES.md
    │   └── fr-FR.md
    └── _media/
        └── <subdiretórios e arquivos editoriais>
```

`_content` e `_media` são recursos exclusivos da entidade cujo `_entity.json`
é irmão direto. Qualquer outro nome iniciado por `_`, recurso reservado sem
manifesto proprietário, symlink, arquivo especial ou arquivo técnico fora
desse envelope é recusado. Diretórios sem `_` continuam livres para organização
editorial e não produzem identidade ou relações.

## Locales

Todo mapa localizado possui exatamente, nesta ordem:

```text
pt-BR · pt-PT · gn-PY · en-US · es-ES · fr-FR
```

Não existe fallback. Textos simples são não vazios, aparados e sem Markdown.
Listas preservam a ordem autoral e não contêm duplicatas. Conteúdo editorial
extenso vive nos seis documentos declarados por `contentPath`.

## Entidade Canônica De Vida

`LifeEntity` é o perfil de conhecimento opcional de um táxon. Sua identidade é
um UUIDv4 próprio e `typeTermKey` é a única associação com o termo de
`life:type`. O nome público pertence ao label do termo; aliases, classificações,
seções, conteúdo e mídia pertencem à entidade.

```json
{
  "schemaVersion": 1,
  "entityType": "life",
  "id": "b614e691-9116-4e2f-855f-fb2f1bfe210a",
  "typeTermKey": "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris.poodle",
  "classifications": {
    "originPlaceIds": ["fr"],
    "bodyMetrics": { "size": "medium" }
  },
  "localizedContent": {
    "aliases": {
      "pt-BR": [], "pt-PT": [], "gn-PY": [],
      "en-US": [], "es-ES": [], "fr-FR": []
    }
  },
  "sections": []
}
```

### Taxonomia De Tipos

`life:type`, com ID `life-types`, é uma floresta ordenada no contrato comum de
`terms` e `children`. A profundidade determina o rank fechado:

```text
domain -> kingdom -> phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

- raízes possuem rank `domain` e a profundidade máxima é `variety` (9);
- cada termo possui `key` e `localizedContent.label`, sem aliases;
- `children` contém somente filhos diretos e sua posição define a ordem entre irmãos;
- um termo pode existir sem `LifeEntity`, mas cada termo admite no máximo uma;
- IDs de entidades e chaves taxonômicas são identidades independentes.

O builder deriva pai, rank e ordem exclusivamente da árvore. Chaves, nomes e
diretórios não participam dessa derivação.

### Classificações Opcionais

`classifications` pode ser omitido em qualquer nível. Quando presente, contém
`originPlaceIds`, `bodyMetrics` ou ambos. Ausência significa apenas dado não
disponível ou não aplicável.

`bodyMetrics` contém `size`, `stageMetrics` ou ambos. `size` resolve zero ou um
termo de `life:size`. Classificações não são herdadas entre ancestrais e
descendentes.

```json
{
  "bodyMetrics": {
    "stageMetrics": {
      "periodUnit": "months",
      "male": {
        "newborn": { "period": [null, 1], "weight": { "live": [1, 8] } },
        "young": { "period": [1, 12], "measure": { "height": [24, 55] } },
        "adult": { "period": [12, null], "measure": { "length": [35, 85] } }
      },
      "female": {
        "newborn": { "period": [null, 2], "weight": { "live": [1, 7] } },
        "young": { "period": [2, 11], "measure": { "height": [24, 52] } },
        "adult": { "period": [11, null], "measure": { "length": [35, 80] } }
      }
    }
  }
}
```

`periodUnit` aceita `minutes`, `hours`, `days`, `weeks`, `months` ou `years`.
Cada sexo possui exatamente `newborn`, `young` e `adult`. Seus períodos seguem
`[null, x]`, `[x, y]`, `[y, null]`, com `0 < x < y`. Cada estágio contém peso
vivo, medidas ou ambos. Intervalos são finitos, positivos e ordenados;
`measure` aceita somente `height` e `length`.

## Aplicabilidade De Produtos E Protocolos

Produtos e protocolos usam exclusivamente `applicableTaxonTermKeys`:

```json
{ "applicableTaxonTermKeys": ["eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris"] }
```

Cada chave resolve um termo de qualquer rank e alcança o próprio termo e todos
os descendentes, mesmo quando não existe entidade associada. Um array não pode
conter simultaneamente um ancestral e seu descendente. A expansão percorre
`taxonomy_terms` e não materializa cópias dos descendentes.

`targetSpeciesWarnings` permanece conteúdo clínico localizado e não define
aplicabilidade.

## Vocabulários Controlados

Existem exatamente onze pares canônicos de domínio e propósito. Vida possui:

```text
life:type -> ExactlyOne por LifeEntity
life:size -> ZeroOrOne
```

Os nomes e a hierarquia biológica pertencem a `life:type`; aliases e conteúdo
permanecem nos perfis `LifeEntity`.

Taxonomias compartilhadas são florestas ordenadas. `terms` contém as raízes e
cada termo declara `key`, `localizedContent` e, quando possui descendentes,
`children`. Folhas omitem `children`; a posição em cada array define a ordem
somente entre irmãos.

`key` é uma identidade canônica opaca e pode ser simples ou composta, como
`administrationRoute.epidural`. Seus segmentos não criam ancestrais nem
determinam a posição na árvore. Referências usam a chave integral e precisam
resolver no domínio e propósito corretos.

Para adicionar uma raiz, inclua o termo em `terms`. Para adicionar um filho ou
um novo nível, inclua-o em `children` do pai estrutural sem alterar sua chave.
Depois, execute `pnpm knowledge:audit`, `pnpm knowledge:validate` e os testes do
`knowledge-builder`.

## Demais Entidades

- `product`: tipo, classificações, `applicableTaxonTermKeys`, regiões, fabricante,
  princípios ativos, alvos terapêuticos, `applicableLifeStages`,
  `therapeuticSpectrum`, identificadores, conteúdo e mídia;
- `manufacturer`: tipo, classificações, regiões, website, conteúdo e mídia;
- `active_ingredient`: tipo, classificações, nomenclatura, ATC Vet e conteúdo;
- `condition`: tipo, classificações, regiões e conteúdo;
- `geo_place`: tipo, códigos de país, pai, centroide e nome localizado;
- `treatment_protocol`: tipo clínico, `applicableTaxonTermKeys`, produtos, doses e
  conteúdo localizado;
- `taxonomy`: proprietário fechado de um vocabulário compartilhado.

IDs de produto, fabricante, princípio ativo, condição e protocolo são UUIDv4
minúsculos. Fatos desconhecidos usam `null`, `[]` ou omissão permitida; não são
criados termos artificiais.

`applicableLifeStages` aceita combinações ordenadas de `newborn`, `young` e
`adult`. `therapeuticSpectrum` aceita `broad` ou `narrow` somente em produtos do
ramo `medication`. Ambos são atributos estruturados opcionais do produto e não
taxonomias. Descritores vacinais como `V10`, `polivalente` e `tríplice felina`
vivem exclusivamente em `localizedContent.aliases` do produto correspondente.
Esses aliases participam da busca textual comum; os atributos diretos servem a
filtros estruturados.

## Markdown E Mídia

Entidades com seções declaram `contentPath: "./_content"` e possuem exatamente
um documento por locale em `_content`. Entidades sem seções omitem o campo e
não possuem esse diretório. HTML bruto, links inseguros e arquivos não
declarados são recusados.

Toda mídia editorial vive em `_media`. `media.cover` e `media.gallery` usam
`./_media/<caminho>`, enquanto imagens Markdown usam
`../_media/<caminho>`. A identidade compilada remove o marcador técnico e usa
`<entity_type>/<entity_id>/media/<caminho-interno>`. Em entidades de vida,
toda mídia é compilada com `entity_type = life`. O hash do conteúdo define o
objeto em `CAS/system`; thumbnails são JPEG determinísticos e nenhum arquivo de
`_media` pode permanecer sem referência.

## Inventário E Auditoria

[`inventory.json`](./inventory.json) registra contagens e cobertura do contrato
vigente. [`audit-report.json`](./audit-report.json) registra o resultado da
auditoria canônica. Ambos descrevem somente o estado atual e são conferidos em
conjunto com `knowledge-builder validate` e os testes integrais.
