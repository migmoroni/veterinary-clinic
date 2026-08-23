# Fonte Canônica De Conhecimento

Este diretório contém a fonte de autoria dos dados públicos de conhecimento da
clínica. Ele cobre o conteúdo que alimenta `system` e `system_media` e que será
compilado para `CAS/system` pelo `knowledge-builder`.

O app e os packages não leem este diretório. Bancos SQLite, hashes, caminhos CAS
e URIs internas são artefatos compilados e não integram o contrato de autoria.

## Escopo

Estão incluídos produtos, fabricantes, princípios ativos, condições, raças,
localidades geográficas, taxonomias e protocolos públicos. `user/main`,
`user/media`, `user/logs`, `CAS/user`, textos de interface e placeholders do app
estão excluídos.

Os defaults públicos atuais não contêm bytes de mídia. Por isso não há arquivos
em `media/`; quando existirem, eles ficarão junto à entidade proprietária e serão
referenciados por caminhos relativos.

## Organização

```text
data/knowledge/
├── README.md
├── inventory.json
├── audit-report.json
├── catalog/
│   ├── products/medications/{vaccines,antiparasitics}/
│   ├── manufacturers/
│   ├── active-ingredients/
│   ├── conditions/
│   └── taxonomies/
├── animals/
│   ├── breeds/{canine,feline}/
│   └── taxonomies/
├── geo/places/
└── clinical/treatment-protocols/
```

Cada entidade ocupa um diretório e é descoberta pela presença de `entity.json`.
O caminho serve somente à organização editorial; `entityType` e `id` definem a
identidade e o schema.

## Locales E Valores Simples

Todo mapa localizado contém exatamente estas chaves, nesta ordem:

```text
pt-BR
pt-PT
gn-PY
en-US
es-ES
fr-FR
```

Não existe fallback entre locales. Campos opcionais sem conteúdo em nenhum
locale são omitidos como unidade. Quando presentes, campos escalares usam texto
simples não vazio e listas usam arrays, inclusive `[]` para um locale sem itens.

Textos simples são UTF-8 de uma linha, sem espaços externos, caracteres de
controle ou estrutura Markdown. Listas preservam a ordem autoral e não possuem
duplicatas dentro de um locale.

```text
LocalizedText     = Record<KnowledgeLocale, string>
LocalizedTextList = Record<KnowledgeLocale, string[]>
```

## Manifestos E `localizedContent`

O envelope comum é:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "beagle"
}
```

Todo conteúdo localizado simples pertence a `localizedContent` no mesmo objeto
que o possui. O valor é sempre o mapa tipado, nunca um caminho:

```json
{
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
      "pt-BR": [],
      "pt-PT": [],
      "gn-PY": [],
      "en-US": [],
      "es-ES": [],
      "fr-FR": []
    }
  }
}
```

O contrato cobre `name` e aliases próprios; `commercialLine`,
`presentationDosage` e `targetSpeciesWarnings` de produtos; `atcVetSystem` e
denominações de princípios ativos; `name` e `observation` de protocolos; e
`label` das doses. Termos taxonômicos usam o mesmo contrato para `label` e
aliases gerais.

O diretório `localized/` não faz parte do contrato.

## Vocabulários Controlados

Taxonomias são agregados com `domain`, `purpose` e termos ordenados. Cada termo
possui chave canônica completa, pai opcional e conteúdo localizado próprio:

```json
{
  "key": "medication.antiparasitic.endectocide",
  "parentKey": "medication.antiparasitic",
  "order": 92,
  "localizedContent": {
    "label": {
      "pt-BR": "Endectocida",
      "pt-PT": "Endectocida",
      "gn-PY": "Endectocida",
      "en-US": "Endectocide",
      "es-ES": "Endectocida",
      "fr-FR": "Endectocide"
    },
    "aliases": {
      "pt-BR": ["endectocida"],
      "pt-PT": ["endectocida"],
      "gn-PY": ["endectocida"],
      "en-US": ["endectocide"],
      "es-ES": ["endectocida"],
      "fr-FR": ["endectocide"]
    }
  }
}
```

`localizedContent.aliases` do termo é opcional como unidade. Cada conceito
compartilhado pertence ao vocabulário de seu domínio: classificações, alvos,
perfis vacinais, estágios de vida ou escopos terapêuticos. Abreviações
equivalentes, como `V3`, “tríplice felina” e `FVRCP`, pertencem ao mesmo termo de
perfil vacinal.

Aliases de uma entidade representam somente grafias, siglas e nomes que
identificam aquela entidade específica. Labels e aliases de tipos,
classificações e relações não são copiados para as entidades.

## Referências Taxonômicas

Entidades usam somente referências explícitas e resolvíveis:

- `typeTermKey` para um termo da taxonomia de tipos do domínio;
- `classificationTermKeys` para termos da taxonomia de classificações do
  domínio;
- `sizeTermKey` para um termo de `breed-sizes`.

Produtos também usam campos com proprietários fechados:

- `activeIngredientIds` referencia entidades `active_ingredient` individuais;
- `targetTermKeys` referencia `product-targets`;
- `vaccineProfileTermKeys` referencia `product-vaccine-profiles`;
- `lifeStageTermKeys` referencia `product-life-stages`;
- `therapeuticScopeTermKeys` referencia `product-therapeutic-scopes`.

Campos sem relações são omitidos como unidade, exceto `activeIngredientIds`, que
integra o contrato estrutural do produto e pode ser `[]`. Arrays presentes são
ordenados, resolvíveis e não contêm duplicatas.

As referências armazenam a chave canônica completa, nunca arrays de ancestrais,
segmentos terminais isolados, labels ou traduções. A ordem de um array é autoral
somente quando possui significado no domínio.

Produtos mantêm identificadores MAPA, NADA, ANADA e GTIN em
`regulatoryIdentifiers`. Princípios ativos mantêm nome científico, CAS, standards
de denominação e código ATC Vet como fatos estruturais. Esses valores não se
tornam termos apenas por serem strings.

Cada substância farmacologicamente distinta possui uma entidade persistente com
UUIDv4. Combinações são decompostas em relações ordenadas; não existem entidades
que representem apenas a concatenação de substâncias. Fatos desconhecidos usam
`null`, `[]` ou campos opcionais omitidos, sem classificações inventadas.

## Contratos Por Tipo

- `product`: tipo, classificações reais, espécies, regiões, fabricante,
  princípios ativos, alvos, perfis vacinais, estágios de vida, escopos
  terapêuticos, identificadores regulatórios, conteúdo localizado e seções.
- `manufacturer`: tipo, classificações, regiões, website, conteúdo localizado e
  seções.
- `active_ingredient`: tipo, classificações regulatórias, regiões, nomenclatura,
  código ATC Vet, conteúdo localizado e seções.
- `condition`: tipo, classificações, regiões, conteúdo localizado e seções.
- `breed`: espécies, localidades de origem, `sizeTermKey`, medidas, conteúdo
  localizado e seções.
- `geo_place`: tipo de lugar, países, pai, centroide e conteúdo localizado.
- `treatment_protocol`: tipo clínico, espécies, produtos ordenados, doses e
  conteúdo localizado. Cada dose possui `localizedContent.label`.
- `taxonomy`: domínio, finalidade e termos localizados.

Relações não taxonômicas apontam diretamente para IDs de domínio e não repetem
nomes ou aliases das entidades relacionadas.

`classificationTermKeys` de produto contém somente origem, categoria comercial,
ação terapêutica, forma farmacêutica, via de administração e classificações
efetivas admitidas pelo schema. Doenças, patógenos, parasitas, perfis vacinais,
estágios de vida e escopos terapêuticos não são classificações de produto.

## Seções Markdown

Markdown é reservado ao documento editorial único declarado por `contentPath`:

```text
<entidade>/
├── entity.json
└── content/
    ├── pt-BR.md
    ├── pt-PT.md
    ├── gn-PY.md
    ├── en-US.md
    ├── es-ES.md
    └── fr-FR.md
```

Uma entidade com seções declara `"contentPath": "./content"`; uma entidade sem
seções usa `sections: []`, omite `contentPath` e não possui documentos vazios.
O diretório contém exatamente os seis arquivos e permanece dentro da entidade.

O manifesto associa cada seção a um número autoral:

```json
{
  "contentPath": "./content",
  "sections": [
    { "sectionKey": "about", "sectionNumber": 1 },
    { "sectionKey": "presentations", "sectionNumber": 2 }
  ]
}
```

Cada documento usa headings de nível `#` como delimitadores:

```markdown
# 1. Texto editorial opcional

Corpo da primeira seção.

## Subtítulo interno

Continuação da primeira seção.

# 2

Corpo da segunda seção.
```

`sectionNumber` é inteiro positivo, único e contíguo a partir de `1`. Os seis
documentos contêm exatamente os números declarados, na mesma ordem. Conteúdo não
vazio antes do primeiro delimitador é inválido. Somente headings `#` iniciam uma
seção; headings de `##` a `######` pertencem ao corpo corrente.

Depois do número, ponto e texto editorial são opcionais. O compilador descarta o
heading delimitador inteiro e associa somente o corpo a `sectionKey`. Títulos de
seção continuam pertencendo ao i18n da UI. Não existem título, label ou chave de
tradução da seção no manifesto.

Seções usam um perfil fechado baseado em CommonMark. São permitidos parágrafos,
quebras, ênfase, headings internos, listas, citações, separadores, código tratado
como texto, tabelas e links externos `https`. HTML bruto, scripts, imagens
remotas e protocolos inseguros são proibidos. Imagens locais, quando existirem,
apontam para arquivos da própria entidade.

## Busca Derivada

A busca não possui taxonomia própria. A projeção localizada de um produto combina
seus nomes e aliases próprios com fabricante, princípios ativos, alvos, perfis
vacinais, estágios de vida, escopos terapêuticos, tipo e classificações reais.
Cada valor mantém sua proveniência sem ser copiado para aliases do produto.

## Auditoria

Na raiz do workspace, execute:

```bash
pnpm knowledge:audit
```

A auditoria valida cobertura e paridade com os defaults e traduções atuais,
schemas de autoria, mapas localizados, documentos editoriais numerados,
propriedade de aliases, relações farmacológicas, taxonomias semânticas, projeção
pesquisável, caminhos, mídias, IDs e contagens do
[`inventory.json`](./inventory.json). Use `--write-report` para atualizar
`audit-report.json`; a execução padrão é somente leitura.

A auditoria não gera bancos nem CAS. A validação executável e a compilação
offline pertencem ao crate `tools/knowledge-builder`:

```bash
pnpm knowledge:validate
pnpm knowledge:build
```

Uma build válida projeta os seis locales, gera os doze bancos em
`build/knowledge-artifacts`, verifica integridade e foreign keys e finaliza
checksums, relatório de cobertura e `build-result.json`. A integração desses
artefatos no runtime permanece fora deste contrato.
