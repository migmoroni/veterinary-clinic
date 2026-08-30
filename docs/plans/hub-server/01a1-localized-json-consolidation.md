# Parte 1A.1: Consolidação JSON E Referências Taxonômicas

## Objetivo

Consolidar em cada `_entity.json` todo conteúdo localizado simples e normalizar as
relações com vocabulários controlados. `localizedContent` armazena diretamente as
variações dos seis locales; entidades referenciam taxonomias somente por chaves
canônicas completas; Markdown permanece reservado às seções editoriais ricas.

Esta parte atua somente em `data/knowledge`, no contrato de autoria e na
auditoria dessa fonte. Ela não implementa o `knowledge-builder`, não gera bancos
ou CAS e não altera apps, packages ou runtime.

## Pré-requisito

A [Parte 1A](./01a-canonical-knowledge-data.md) está concluída, com entidades,
relações, conteúdo localizado, taxonomias e inventário materializados em
`data/knowledge`.

## Princípio Do Modelo

A fonte distingue três classes de dados:

1. **Conteúdo próprio localizado:** nome, aliases realmente próprios da
   entidade, denominações, observações, labels de doses e outros valores simples.
   Esses dados ficam em `localizedContent` no mesmo JSON do objeto ao qual
   pertencem.
2. **Vocabulário compartilhado:** tipos, classificações, portes, formas, vias,
   ações e demais conceitos controlados. A taxonomia contém labels e aliases por
   locale; as entidades armazenam somente as chaves dos termos relacionados.
3. **Conteúdo editorial rico:** seções com parágrafos, listas, tabelas, links e
   mídias. Esses corpos permanecem nos documentos Markdown declarados pelo
   `contentPath` da entidade.

Uma tradução compartilhada possui uma única fonte. Ela não é copiada para os
aliases ou para outro campo localizado de cada entidade que referencia o termo.

## Contrato De `localizedContent`

`localizedContent` é um objeto cujas propriedades são definidas pelo schema do
objeto. Cada propriedade contém um mapa field-first dos seis locales:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "beagle",
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
  "sizeTermKey": "medium",
  "sections": []
}
```

Os tipos básicos são:

```text
LocalizedText      = Record<KnowledgeLocale, string>
LocalizedTextList  = Record<KnowledgeLocale, string[]>
```

O schema de cada `entityType` ou objeto filho define quais propriedades existem
e qual dos dois tipos cada uma usa. O contrato cobre, conforme o domínio:

- `name` e `aliases` de entidades;
- `commercialLine`, `presentationDosage` e `targetSpeciesWarnings` de produtos;
- `atcVetSystem` e denominações de princípios ativos;
- `name` e `observation` de protocolos;
- `label` de doses;
- `label` e aliases de termos taxonômicos;
- outros valores simples localizados explicitamente admitidos pelo schema.

Um campo opcional sem conteúdo em nenhum locale é omitido como unidade. Quando o
campo está presente, seu mapa contém exatamente os seis locales. Campos textuais
obrigatórios usam strings não vazias; listas podem usar `[]` para um locale sem
itens. Não existe fallback entre locales.

Os valores são textos simples de uma linha, em UTF-8, sem espaços externos,
caracteres de controle ou estrutura Markdown. Listas preservam a ordem autoral e
não contêm entradas duplicadas dentro do mesmo locale.

Os arquivos escrevem as chaves na ordem canônica abaixo para facilitar revisão e
diffs. A semântica e o digest do builder não dependem da ordem das propriedades
de um objeto JSON.

```text
pt-BR
pt-PT
gn-PY
en-US
es-ES
fr-FR
```

## Contrato Das Taxonomias

Cada termo possui uma chave canônica completa, estrutura hierárquica e conteúdo
localizado próprio:

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

`localizedContent.aliases` do termo é opcional como unidade. Ele existe quando o
conceito controlado possui sinônimos gerais úteis para apresentação ou busca. Um
sinônimo geral pertence ao termo uma única vez e não é replicado nas entidades
que o utilizam.

A chave completa é a identidade do termo dentro da taxonomia. `parentKey`
descreve a hierarquia. Uma entidade não armazena o caminho de ancestrais, labels,
aliases ou traduções do termo.

## Referências Taxonômicas Nas Entidades

Os schemas usam campos com semântica explícita de referência:

```json
{
  "typeTermKey": "medication.antiparasitic.endectocide",
  "classificationTermKeys": [
    "origin.allopathic",
    "therapeuticAction.control"
  ]
}
```

As regras são:

- `typeTermKey` referencia exatamente uma chave existente na taxonomia de tipos
  do domínio;
- `classificationTermKeys` contém chaves completas existentes na taxonomia de
  classificações do domínio;
- `sizeTermKey` referencia uma chave de `breed-sizes`;
- arrays preservam somente uma ordem com significado de domínio;
- não são armazenados arrays de caminho até o termo;
- uma referência nunca usa apenas o último segmento quando a chave canônica
  possui namespace ou ancestral;
- a entidade não repete labels nem aliases fornecidos pela taxonomia;
- códigos regulatórios, identificadores, medições e outros valores factuais não
  viram termos apenas por serem strings.

Campos taxonômicos aninhados são convertidos em referências explícitas. Por
exemplo, origem farmacológica, categoria comercial, ação terapêutica, forma
farmacêutica e vias de administração tornam-se entradas de
`classificationTermKeys`. Identificadores como MAPA, NADA, ANADA e GTIN continuam
em campos estruturais próprios.

O mesmo princípio se aplica a fabricantes, princípios ativos e condições. Uma
classificação como `moderate` não fica isolada quando sua chave canônica é
`zoonoticRisk.moderate`.

## Propriedade Dos Aliases

Aliases da entidade representam formas alternativas de identificar aquela
entidade específica. Exemplos incluem grafias alternativas, siglas comerciais e
nomes pelos quais o item individual é conhecido.

Não pertencem aos aliases da entidade:

- label ou sinônimo do seu tipo taxonômico;
- label ou sinônimo de uma classificação relacionada;
- nome ou alias de fabricante, princípio ativo ou outra entidade já relacionada
  por ID;
- termo geral copiado para várias entidades da mesma categoria.

Quando um conceito geral necessário não possui termo adequado, a fonte acrescenta
ou refina o termo na taxonomia correspondente, registra ali suas traduções e
aliases e faz as entidades apontarem para sua chave. A ausência de um termo não é
compensada pela duplicação do texto em aliases de itens.

O builder da Parte 1B pode compor o documento pesquisável de uma entidade com:

```text
nome e aliases próprios
+ labels e aliases dos termos taxonômicos referenciados
+ nomes e aliases de relações permitidas pelo schema do domínio
```

Essa composição é uma projeção derivada para o banco localizado. Ela não cria
duplicação na fonte de autoria.

## Fronteira Do Markdown

Markdown fica restrito aos corpos declarados no `contentPath` e às referências
editoriais de mídia contidas nessas seções. A Parte 1A.2 fecha a associação entre
headings numerados e `sectionKey`. Um diretório de entidade segue, conforme seu
conteúdo:

```text
<entidade>/
├── _entity.json
├── _content/
│   ├── pt-BR.md
│   ├── pt-PT.md
│   ├── gn-PY.md
│   ├── en-US.md
│   ├── es-ES.md
│   └── fr-FR.md
└── _media/
```

O diretório `localized/` não integra o contrato final. Diretórios opcionais
inexistem quando a entidade não possui o conteúdo correspondente.

## Escopo Da Consolidação

A execução cobre integralmente:

- todos os `localizedContent` de entidades e objetos filhos;
- aliases próprios de entidades;
- labels e aliases de termos taxonômicos;
- labels de doses de protocolos;
- todas as referências a taxonomias de tipos, classificações e portes;
- a separação entre aliases próprios, vocabulário compartilhado e relações por
  ID;
- `data/knowledge/README.md`;
- `data/knowledge/inventory.json`;
- `scripts/audit-knowledge.mjs` e o comando `pnpm knowledge:audit`.

Seções Markdown, mídias, IDs de domínio, relações não taxonômicas e valores
fatuais permanecem sob seus contratos próprios.

## Sequência De Implementação

1. Inventariar recursivamente todo `localizedContent` em entidades, termos,
   doses e demais objetos filhos.
2. Ler os seis valores de cada campo localizado e construir seu mapa JSON tipado.
3. Incorporar cada mapa ao `localizedContent` do objeto proprietário.
4. Incorporar aliases de entidades e labels de taxonomias ao mesmo contrato
   `localizedContent`.
5. Comparar em memória os valores estruturados com todas as fontes antes de
   finalizar a substituição.
6. Remover os arquivos e diretórios `localized/`, incluindo diretórios pais que
   ficarem vazios.
7. Inventariar todos os campos de tipo, classificação e porte usados pelas
   entidades.
8. Substituir caminhos, segmentos soltos e objetos categóricos por
   `typeTermKey`, `classificationTermKeys` ou `sizeTermKey`, conforme o schema.
9. Resolver cada referência contra a taxonomia dona e recusar chave inexistente
   ou pertencente a outro domínio.
10. Classificar os aliases atuais entre alias próprio, conceito taxonômico e
    relação de entidade.
11. Centralizar conceitos gerais em termos taxonômicos e manter nas entidades
    somente aliases próprios.
12. Atualizar o contrato em `data/knowledge/README.md`, o inventário e as
    contagens pertinentes.
13. Adaptar `scripts/audit-knowledge.mjs` para validar mapas inline, referências
    canônicas e propriedade dos aliases.
14. Executar a auditoria completa e revisar o diff para confirmar a conservação
    semântica dos dados.

A transformação termina com uma única representação. Não permanecem leitores,
fallbacks, caminhos alternativos ou conversores permanentes para os arquivos e
campos substituídos.

## Auditoria Específica

`pnpm knowledge:audit` passa a verificar:

- presença exata dos seis locales em cada campo de `localizedContent`;
- tipo, obrigatoriedade, preenchimento, ordem e unicidade de cada valor;
- ausência de caminhos de arquivo dentro de `localizedContent`;
- ausência do diretório `localized/` em toda a árvore;
- cobertura dos labels taxonômicos e dos labels de doses;
- existência e domínio correto de toda chave taxonômica referenciada;
- uso de chaves canônicas completas;
- ausência de caminhos de ancestrais e segmentos taxonômicos soltos nas
  entidades;
- ausência de labels ou traduções taxonômicas duplicadas nas entidades;
- ausência de aliases gerais repetidos entre entidades quando pertencem a um
  termo ou relação compartilhada;
- paridade dos valores próprios com as fontes inventariadas;
- conservação dos IDs, relações não taxonômicas, valores factuais, seções e
  mídias.

O relatório separa contagens de valores JSON localizados, referências
taxonômicas, documentos Markdown e seções editoriais.

## Testes E Verificações

- executar `pnpm knowledge:audit`;
- executar `git diff --check`;
- validar por amostragem todos os `entityType`;
- validar campos localizados escalares e de lista;
- validar termos taxonômicos rasos e hierárquicos;
- validar entidades com uma e várias classificações;
- validar aliases próprios, aliases de termo e composição pesquisável esperada;
- comparar as contagens e identidades do inventário;
- confirmar que nenhum arquivo fora de `data/knowledge` e
  `scripts/audit-knowledge.mjs` foi alterado pela implementação.

## Entregáveis

- `_entity.json` com todo conteúdo localizado simples inline;
- termos taxonômicos com labels e aliases por locale;
- entidades contendo somente chaves taxonômicas completas;
- aliases gerais centralizados em seus termos ou relações proprietárias;
- árvore `data/knowledge` sem diretórios `localized/`;
- contrato de autoria atualizado;
- inventário e auditoria ajustados ao modelo;
- relatório de auditoria com paridade integral.

## Critérios De Aceite

- Todo `localizedContent` contém valores tipados, nunca caminhos.
- Cada campo localizado presente possui exatamente os seis locales.
- Markdown existe somente em seções editoriais.
- Não existe diretório `localized/` em `data/knowledge`.
- Toda referência taxonômica usa uma chave canônica completa e resolvível.
- Entidades não armazenam caminhos taxonômicos, labels ou traduções de termos.
- Aliases próprios, aliases de taxonomia e nomes de relações possuem propriedade
  inequívoca e não são duplicados entre essas fontes.
- A auditoria confirma paridade semântica nos seis locales.
- IDs, relações não taxonômicas, valores factuais, seções e mídias permanecem
  íntegros.
- O app, os packages, os bancos e o CAS não são modificados nesta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1A.2: relações semânticas e documentos editoriais](./01a2-semantic-product-relations.md).
