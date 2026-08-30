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
    ├── taxonomies/sizes/entity.json
    └── eukaryota/
        ├── entity.json
        └── animalia/.../<taxon>/entity.json
```

O scanner descobre recursivamente cada `entity.json`. Um diretório possui
manifesto somente quando representa uma entidade real; sua profundidade não
cria identidade, ancestralidade, classificação nem ordem. Mover uma entidade
sem alterar o manifesto não modifica seu digest lógico.

## Locales

Todo mapa localizado possui exatamente, nesta ordem:

```text
pt-BR · pt-PT · gn-PY · en-US · es-ES · fr-FR
```

Não existe fallback. Textos simples são não vazios, aparados e sem Markdown.
Listas preservam a ordem autoral e não contêm duplicatas. Conteúdo editorial
extenso vive nos seis documentos declarados por `contentPath`.

## Entidade Canônica De Vida

`LifeEntity` representa qualquer domínio, reino, filo, classe, ordem, família,
gênero, espécie, raça ou variedade. O papel clínico do organismo pertence ao
contrato que referencia seu ID, não à entidade de vida.

```json
{
  "schemaVersion": 1,
  "entityType": "life",
  "id": "poodle",
  "taxonomy": {
    "domain": "eukaryota",
    "kingdom": "animalia",
    "phylum": "chordata",
    "class": "mammalia",
    "order": "carnivora",
    "family": "canidae",
    "genus": "canis",
    "species": "canis-lupus-familiaris",
    "breed": "poodle",
    "variety": null
  },
  "classifications": {
    "originPlaceIds": ["fr"],
    "bodyMetrics": { "size": "medium" }
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Poodle", "pt-PT": "Poodle", "gn-PY": "Caniche",
      "en-US": "Poodle", "es-ES": "Caniche", "fr-FR": "Caniche"
    },
    "aliases": {
      "pt-BR": [], "pt-PT": [], "gn-PY": [],
      "en-US": [], "es-ES": [], "fr-FR": []
    }
  },
  "sections": []
}
```

### Identidade Taxonômica

As posições são fechadas e ordenadas:

```text
domain -> kingdom -> phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

- `domain` nunca é nulo;
- as posições não nulas formam um prefixo contínuo;
- o `id` ocupa a última posição não nula;
- posições inferiores à entidade são `null`;
- cada ancestral resolve um `LifeEntity` do nível correspondente e declara o
  mesmo prefixo;
- cada descendente repete explicitamente toda a cadeia superior.

O caminho editorial não participa dessa resolução. Não existem `parentKey`,
listas de espécies, aliases taxonômicos ou inferência por nome de pasta.

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

Produtos e protocolos usam exclusivamente `applicableTaxonIds`:

```json
{ "applicableTaxonIds": ["canis-lupus-familiaris"] }
```

Cada ID resolve qualquer um dos dez níveis e alcança a própria entidade e todos
os descendentes. Um array não pode conter simultaneamente um ancestral e seu
descendente. A expansão usa as colunas taxonômicas compiladas e não materializa
cópias dos descendentes.

`targetSpeciesWarnings` permanece conteúdo clínico localizado e não define
aplicabilidade.

## Vocabulários Controlados

Existem exatamente 13 pares canônicos de domínio e propósito. Doze pertencem
aos catálogos e um classifica vida:

```text
life:size -> ZeroOrOne
```

Os dez níveis biológicos obtêm nomes, aliases, conteúdo e ancestralidade dos
próprios `LifeEntity`. Eles não são termos de uma taxonomia paralela.

Taxonomias compartilhadas usam termos ordenados com `key`, `parentKey`, `order`
e `localizedContent`. Cada referência precisa resolver no domínio e propósito
corretos.

## Demais Entidades

- `product`: tipo, classificações, `applicableTaxonIds`, regiões, fabricante,
  princípios ativos, relações terapêuticas, identificadores, conteúdo e mídia;
- `manufacturer`: tipo, classificações, regiões, website, conteúdo e mídia;
- `active_ingredient`: tipo, classificações, nomenclatura, ATC Vet e conteúdo;
- `condition`: tipo, classificações, regiões e conteúdo;
- `geo_place`: tipo, códigos de país, pai, centroide e nome localizado;
- `treatment_protocol`: tipo clínico, `applicableTaxonIds`, produtos, doses e
  conteúdo localizado;
- `taxonomy`: proprietário fechado de um vocabulário compartilhado.

IDs de produto, fabricante, princípio ativo, condição e protocolo são UUIDv4
minúsculos. Fatos desconhecidos usam `null`, `[]` ou omissão permitida; não são
criados termos artificiais.

## Markdown E Mídia

Entidades com seções declaram `contentPath` e possuem exatamente um documento
por locale. HTML bruto, links inseguros e arquivos não declarados são recusados.

Mídia estrutural usa `media.cover` e `media.gallery`; imagens Markdown também
resolvem dentro do diretório proprietário. Em entidades de vida, toda mídia é
compilada com `entity_type = life`. O hash do conteúdo define o objeto em
`CAS/system`; thumbnails são JPEG determinísticos.

## Inventário E Auditoria

[`inventory.json`](./inventory.json) registra contagens e cobertura do contrato
vigente. [`audit-report.json`](./audit-report.json) registra o resultado da
auditoria canônica. Ambos descrevem somente o estado atual e são conferidos em
conjunto com `knowledge-builder validate` e os testes integrais.
