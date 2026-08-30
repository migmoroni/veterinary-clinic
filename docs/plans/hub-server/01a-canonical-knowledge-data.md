# Parte 1A: Dados Canônicos De Conhecimento

## Objetivo

Materializar em `data/knowledge/` a fonte canônica completa dos dados públicos
que compõem `system`, `system_media` e `CAS/system`, com autoria baseada em
manifestos JSON, valores localizados simples no próprio manifesto, conteúdo
editorial localizado em Markdown e mídias organizadas junto às entidades.

Esta parte organiza somente os dados e seus contratos de autoria. O app continua
usando seu fluxo de dados vigente durante a execução desta parte. A
[Parte 1A.1](./01a1-localized-json-consolidation.md) consolida os valores JSON, a
[Parte 1A.2](./01a2-semantic-product-relations.md) normaliza as relações de
produto e consolida os documentos editoriais, a
[Parte 1B](./01b-knowledge-builder.md) compila os artefatos e a
[Parte 1C](./01c-app-system-consumption.md) troca o consumidor.

## Pré-requisito

A [Pré-fase 0](./00-pnpm-workspace-migration.md) está integralmente concluída.

## Princípio De Autoria

`data/knowledge` é otimizado para edição, revisão e visualização humana. Bancos
SQLite, hashes e caminhos CAS são representações compiladas e não aparecem nos
arquivos de autoria.

Cada entidade combina três elementos:

- `_entity.json`: identidade, campos estruturais, relações, conteúdo localizado
  simples e composição das seções;
- arquivos `.md`: somente seções editoriais localizadas declaradas por caminho;
- `_media/`: bytes originais referenciados por caminhos relativos.

O builder interpreta essa fonte como um compilador. O app não lê
`data/knowledge`, não resolve caminhos editoriais e não cria CAS a partir dos
arquivos de autoria.

## Resultado Alvo

```text
data/knowledge/
├── README.md
├── catalog/
│   ├── products/
│   │   └── medications/
│   │       ├── vaccines/
│   │       └── antiparasitics/
│   ├── manufacturers/
│   ├── active-ingredients/
│   ├── conditions/
│   └── taxonomies/
├── animals/
│   ├── breeds/
│   │   ├── canine/
│   │   └── feline/
│   └── taxonomies/
├── geo/
│   └── places/
└── clinical/
    └── treatment-protocols/
```

Cada item ocupa um diretório próprio. Uma entidade com conteúdo localizado e
mídias segue este formato:

```text
<diretório-organizacional>/<entidade>/
├── _entity.json
├── _content/
│   ├── pt-BR.md
│   ├── pt-PT.md
│   ├── gn-PY.md
│   ├── en-US.md
│   ├── es-ES.md
│   └── fr-FR.md
└── _media/
    ├── cover.webp
    └── detail.webp
```

O nome `_content` pertence ao namespace técnico reservado. O `_entity.json`
declara `contentPath: "./_content"` e associa cada marcador numérico do Markdown
à sua `sectionKey`; o diretório não é configurável.
Conteúdo localizado simples não possui diretórios próprios no contrato da
[Parte 1A.1](./01a1-localized-json-consolidation.md).

## Fontes Incluídas

O levantamento cobre todo conteúdo público usado para preencher os bancos de
sistema, incluindo:

- produtos e suas relações com fabricantes e princípios ativos;
- fabricantes;
- princípios ativos;
- condições clínicas;
- raças caninas e felinas;
- localizações geográficas reutilizáveis;
- portes, taxonomias e classificações;
- aliases localizados usados por busca e descoberta;
- protocolos públicos de vacinação e antiparasitários;
- doses, vigências, observações e relações dos protocolos;
- nomes, descrições, seções e demais textos localizados;
- mídias apresentadas em capas ou dentro do conteúdo.

A análise parte, entre outras fontes efetivas, de:

```text
packages/types/src/catalog/defaults/
packages/types/src/domain/pet/defaults/
packages/types/src/domain/treatment/defaults/
packages/types/src/domain/treatment/default-protocol.ts
packages/core-local/src/i18n/breeds/
packages/core-local/src/i18n/catalog-aliases/
packages/core-local/src/i18n/type-tree/
packages/core-local/src/i18n/classification/
packages/core-local/src/i18n/<locale>.ts
packages/core-local/src/sqlite/create/system/main/
packages/engine/src/storage/sqlite.rs
packages/engine/src/storage/media.rs
packages/engine/src/storage/cas.rs
```

O inventário é orientado pelo conteúdo que alimenta `system` e `system_media`,
não apenas por esses caminhos. Qualquer constante, agregado TypeScript, JSON,
texto localizado ou mídia que participe desse preenchimento entra no
levantamento.

No Rust, o inventário considera exclusivamente os ramos que criam ou escrevem
`system_media` e `vault/system`. Criação, escrita, sincronização, replicação e
CAS de `user/main`, `user/media`, `user/logs` e `vault/user` permanecem fora
desta conversão.

## Fronteira Com I18n

Todo texto que descreve conhecimento fica na fonte canônica, incluindo nomes,
aliases, descrições, labels taxonômicos, protocolos, conteúdo editorial, texto
alternativo e legendas. A Parte 1A.1 fecha a representação JSON de todo conteúdo
localizado simples e das referências taxonômicas; Markdown permanece como
representação das seções editoriais declaradas por caminho.

Textos de interface permanecem em `@vet/core-local/i18n`, incluindo comandos,
mensagens de erro, estados vazios, rótulos de controles e títulos padronizados
das seções identificadas por `sectionKey`.

Por exemplo, o conteúdo da seção `indications` pertence ao Markdown do produto.
O título apresentado como “Indicações” é resolvido pela UI por meio do i18n da
`sectionKey`. Um eventual texto após o número do heading serve somente para
legibilidade editorial e não é consumido.

Nenhum dado canônico usa `labelKey`, `translationKey` ou outra chave para buscar
conteúdo de conhecimento no i18n do app.

## Manifesto `_entity.json`

`_entity.json` contém estrutura, valores localizados simples e referências às
seções Markdown. O envelope mínimo é:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "beagle",
  "species": ["canine"],
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
  "sizeTermKey": "medium",
  "contentPath": "./_content",
  "sections": [
    {
      "sectionKey": "overview",
      "sectionNumber": 1
    },
    {
      "sectionKey": "physical_characteristics",
      "sectionNumber": 2
    }
  ],
  "cover": "./_media/cover.webp"
}
```

O schema selecionado por `entityType` define:

- campos estruturais permitidos;
- relações aceitas;
- chaves de `localizedContent` e o tipo de seus mapas por locale;
- mapas localizados simples permitidos e seus tipos por locale;
- campos de referência taxonômica e taxonomias proprietárias;
- `sectionKey` permitidas;
- `sectionNumber` positivos, contíguos e únicos;
- cardinalidade e obrigatoriedade de conteúdo por locale;
- referências de mídia estruturais, como `cover`.

O caminho e o rótulo editorial do heading não definem o significado do conteúdo.
A seção `overview` existe porque o manifesto associa essa `sectionKey` ao
`sectionNumber` correspondente.

`_entity.json` não contém nomes de tabelas, colunas, SQL, hashes, caminhos CAS ou
IDs técnicos de linhas derivadas. Toda entidade com identidade própria possui
um `id` estável na fonte. O builder não cria identidades de domínio aleatórias.

## Conteúdo Localizado

Cada campo de `localizedContent` contém diretamente um mapa dos seis locales. O
schema do objeto proprietário define se seus valores são strings ou arrays de
strings. Nomes, aliases, denominações, observações, labels taxonômicos e labels de
doses usam esse contrato e não passam pelo parser Markdown.

`contentPath` aponta para um diretório com exatamente um arquivo `<locale>.md`
para cada locale obrigatório. Esses arquivos não possuem front matter e contêm
todas as seções editoriais localizadas da entidade.

Exemplo em `_content/pt-BR.md`:

```markdown
# 1. Visão geral

O Beagle é uma raça canina de porte médio, ativa e sociável.

# 2. Características físicas

## Pelagem

![Beagle adulto](../_media/detail.webp "Exemplar adulto")
```

O schema de `localizedContent` valida os mapas JSON tipados. O schema da seção
determina como seu AST Markdown é validado e projetado.

### Perfil Markdown Canônico

O conteúdo usa um perfil fechado baseado em CommonMark. Seções podem conter
texto, parágrafos, quebras, ênfase, negrito, headings internos, listas ordenadas
e não ordenadas, citações, separadores, código tratado como texto, tabelas e
links externos `https`. Imagens usam somente caminhos relativos para arquivos
declarados dentro da própria entidade.

O perfil recusa:

- HTML bruto, comentários HTML e atributos injetados;
- scripts, estilos, formulários, iframes, objetos, embeds, áudio e vídeo;
- links ou imagens com `javascript:`, `data:`, `file:` ou protocolo
  desconhecido;
- imagens remotas;
- nós ou extensões Markdown fora da allowlist;
- AST acima dos limites definidos para tamanho, profundidade e quantidade de
  nós.

O perfil faz parte dos schemas de autoria e da representação compilada; uma
alteração que exija comportamento novo do runtime também eleva a versão do schema
de `system`.

Cada heading `# <sectionNumber>` ou
`# <sectionNumber>. <editorialLabel>` inicia uma seção. O builder consome somente
o número e descarta o heading delimitador inteiro. O rótulo editorial é opcional,
serve apenas para leitura do arquivo e não integra bancos, DTOs, digest ou UI.
Headings de `##` a `######` permanecem internos à seção corrente.

A ordem do array `sections` e os números contíguos definem a ordem editorial.
Nomes de diretórios, ordem de descoberta no filesystem e os rótulos editoriais
opcionais dos headings não definem a identidade da seção.

Uma seção pode declarar `parentSectionKey` para compor a hierarquia sem depender
do nome da pasta nem do nível dos headings internos:

```json
{
  "sections": [
    {
      "sectionKey": "composition",
      "sectionNumber": 1
    },
    {
      "sectionKey": "active_ingredients",
      "parentSectionKey": "composition",
      "sectionNumber": 2
    }
  ]
}
```

Cada `sectionKey` e cada `sectionNumber` são únicos na entidade. O schema do
`entityType` valida pais permitidos, profundidade máxima e se uma seção exige
conteúdo próprio. O builder recusa pais inexistentes, ciclos, números ausentes,
repetidos, descontínuos ou fora de ordem.

O array de autoria descreve a composição da página. Na Parte 1B, ele é compilado
para um único documento de conteúdo localizado por item: a hierarquia declarada
por `parentSectionKey` vira uma árvore ordenada, e cada trecho delimitado vira um
nó com `sectionKey` e corpo normalizado. Os arquivos canônicos não incluem nomes
de colunas, formato de persistência ou estrutura física desse documento.

## Identidade E Descoberta

- `id` é estável e único no espaço definido pelo contrato da entidade;
- o formato de `id` é definido pelo schema do `entityType`; UUIDs são permitidos
  quando representam a identidade de domínio da entidade;
- toda relação aponta para `entityType` e `id`, ou para um ID global quando o
  schema do domínio assim determinar;
- `entityType` seleciona o schema e o projector da Parte 1B;
- `species`, classificações, regiões e relações são declaradas no JSON;
- o builder descobre recursivamente diretórios que contenham `_entity.json`;
- duas entidades que reivindiquem a mesma identidade invalidam o conjunto;
- conteúdo simples localizado é identificado pelo campo de `localizedContent` e
  pela chave de locale do mapa correspondente;
- conteúdo Markdown localizado é identificado pelo locale do arquivo e pela
  associação `sectionNumber -> sectionKey` declarada no manifesto;
- nomes de pastas nunca são inferidos como tipos, seções ou relacionamentos;
- a ordenação canônica usa identidade, campo, `sectionKey` e locale, não a ordem
  retornada pelo filesystem.

Um nome científico ou código regulatório pode permanecer estrutural quando for
um identificador de domínio. Valores simples apresentados ao usuário pertencem
a `localizedContent`, mesmo quando o texto coincide nos seis locales. Corpos
editoriais pertencem às seções Markdown.

## Taxonomias E Classificações

Vocabulários controlados são entidades agregadoras. Os itens usam seus termos
por chave-valor, enquanto a taxonomia declara valores permitidos, ordem,
hierarquia e metadados compartilhados.

```text
catalog/taxonomies/product-types/
catalog/taxonomies/product-classifications/
animals/taxonomies/breed-sizes/
```

`_entity.json` contém os IDs estruturais dos termos e seu conteúdo localizado:

```json
{
  "key": "small",
  "parentKey": null,
  "order": 0,
  "localizedContent": {
    "label": {
      "pt-BR": "Pequeno",
      "pt-PT": "Pequeno",
      "gn-PY": "Michĩ",
      "en-US": "Small",
      "es-ES": "Pequeño",
      "fr-FR": "Petit"
    }
  }
}
```

Aliases gerais do conceito também pertencem ao `localizedContent` do termo
quando existirem. Entidades referenciam somente as chaves canônicas completas e
não repetem labels, aliases nem caminhos de ancestrais. Não é necessário criar
um diretório de entidade para cada termo quando o schema define um agregado.

## Domínio Geográfico

Localizações reutilizáveis ficam em:

```text
data/knowledge/geo/places/<place>/
├── _entity.json
├── _content/
└── _media/
```

Uma localização usa `entityType: "geo_place"`. Sua estrutura pode conter tipo
de lugar, códigos de país, relação hierárquica e centroide:

```json
{
  "schemaVersion": 1,
  "entityType": "geo_place",
  "id": "england",
  "placeType": "historical_region",
  "countryCodes": ["GB"],
  "parentPlaceId": "united-kingdom",
  "centroid": {
    "latitude": 52.4,
    "longitude": -1.5
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Inglaterra",
      "pt-PT": "Inglaterra",
      "gn-PY": "Inglaterra",
      "en-US": "England",
      "es-ES": "Inglaterra",
      "fr-FR": "Angleterre"
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

Uma raça declara a relação geográfica por ID:

```json
{
  "originPlaceIds": ["england"]
}
```

O campo é uma lista porque uma raça pode se relacionar a mais de uma
localização. Outros domínios podem referenciar os mesmos `geo_place` sem
depender de `animals`.

## Relações

As relações estruturais incluem, quando aplicável:

- produto para fabricante;
- produto para princípios ativos;
- protocolo para produtos e doses;
- raça para localizações geográficas de origem;
- entidade para termos de taxonomia.

Relações não usam nomes, aliases, posição em coleções globais ou caminhos. A
ordem com significado clínico é representada explicitamente. Dados filhos com
identidade própria possuem uma chave estável no manifesto; IDs técnicos de
projeção permanecem determinísticos e internos ao builder.

## Mídias De Autoria

Os bytes originais ficam no diretório `_media/` da entidade. O nome do arquivo é
editorial e legível; ele não precisa conter UUID nem hash.

Referências estruturais usam caminhos relativos no `_entity.json`:

```json
{
  "cover": "./_media/cover.webp"
}
```

Referências inseridas no conteúdo usam a sintaxe Markdown comum:

```markdown
![Beagle adulto](../_media/detail.webp "Exemplar adulto")
```

O texto entre colchetes fornece o texto alternativo. O título opcional da
imagem fornece a legenda quando o projector do domínio a utiliza. Capas podem
usar o nome localizado da entidade como texto alternativo padrão.

O caminho relativo normalizado dentro da entidade funciona como referência
editorial estável. A chave técnica compilada é derivada de `entityType`, `id` e
desse caminho relativo. Renomear um arquivo exige atualizar suas referências;
alterar somente os bytes preserva a referência editorial e produz outro hash de
conteúdo.

O builder:

1. resolve o caminho sem permitir saída do diretório da entidade;
2. valida extensão, MIME e bytes;
3. calcula SHA-256;
4. cria o objeto em
   `CAS/system/<hash[0..2]>/<hash[2..4]>/<hash-sha256-hex>.bin`;
5. registra em `system_media` a chave técnica, o hash e os metadados físicos;
6. substitui o caminho editorial no Markdown por uma referência interna
   `knowledge-media://asset/<media-key>`.

Dois arquivos com bytes idênticos compartilham o mesmo objeto CAS, mesmo quando
possuem chaves editoriais diferentes. Nenhum JSON ou Markdown contém hash,
caminho CAS, base64 ou referência interna já compilada.

## Estratégia De Materialização

### Atividade 1: Inventário

1. Enumerar tabelas e relações públicas preenchidas em `system` e
   `system_media`.
2. Mapear cada campo até sua fonte em JSON, TypeScript, i18n ou mídia.
3. Classificar cada campo como estrutural, localizado, mídia ou texto de UI.
4. Registrar IDs duplicados, referências implícitas e traduções ausentes.
5. Separar as operações de sistema das operações equivalentes do ramo `user`.

### Atividade 2: Contratos De Autoria

1. Definir o manifesto comum e os campos de cada `entityType`.
2. Definir relações entre entidades.
3. Definir chaves de `localizedContent` e seus mapas JSON tipados.
4. Definir referências taxonômicas por chaves canônicas completas.
5. Definir `sectionKey` e o perfil Markdown padronizados por domínio.
6. Definir regras de caminhos relativos e mídias.
7. Documentar o contrato em `data/knowledge/README.md`.

### Atividade 3: Conversão Estrutural

1. Criar uma entidade por produto, fabricante, princípio ativo, condição, raça,
   localização geográfica, taxonomia e protocolo.
2. Preservar IDs e declarar relações explicitamente.
3. Transportar campos estruturais para `_entity.json`.
4. Declarar valores taxonômicos somente por suas chaves completas.
5. Declarar no manifesto o `contentPath` e a numeração das seções localizadas.
6. Copiar mídias com nomes editoriais para o diretório `_media/` da entidade.

### Atividade 4: Conversão Do Conteúdo Localizado

1. Transportar todo conteúdo simples para `localizedContent` no JSON do objeto
   proprietário.
2. Manter nos aliases de entidade somente formas alternativas próprias.
3. Centralizar labels e aliases gerais nos termos taxonômicos.
4. Criar um Markdown por locale com todas as seções editoriais declaradas.
5. Converter referências de mídia em links relativos comuns.
6. Manter no i18n somente textos de interface e rótulos padronizados.

### Atividade 5: Auditoria De Paridade

1. Comparar quantidades por tipo de entidade.
2. Comparar conjuntos de IDs e relações.
3. Comparar campos estruturais normalizados.
4. Confirmar cobertura dos seis locales por campo, mapa e seção obrigatórios.
5. Confirmar que todo conteúdo de conhecimento possui destino canônico.
6. Confirmar que nenhuma regra de domínio depende do nome das pastas.

## Regras Durante A Parte 1A

- O app não importa nem lê `data/knowledge`.
- A criação vigente dos bancos não é alterada.
- Repositories, rotas e componentes não usam os novos arquivos.
- `data/knowledge` não oferece fallback ao runtime.
- Os arquivos Markdown não possuem front matter.
- O significado de cada seção vem da associação entre `sectionNumber` e
  `sectionKey` declarada no `_entity.json`.
- O builder da Parte 1B é o único compilador da fonte canônica; a auditoria
  apenas valida sua cobertura e paridade.

## Auditoria De Cobertura E Paridade

Esta parte audita a conversão do conteúdo, sem implementar um parser, um schema
runner ou outro validador paralelo ao `knowledge-builder`. A auditoria produz um
inventário reproduzível que confirma:

- presença de uma entidade canônica para cada item público inventariado;
- preservação dos IDs de domínio e declaração das relações identificadas;
- destino canônico para cada campo estrutural e conteúdo localizado da fonte;
- matriz de um documento Markdown por locale para cada entidade com seções;
- cobertura exata dos seis locales em cada mapa JSON localizado;
- resolução de toda chave taxonômica contra a taxonomia proprietária;
- ausência de traduções taxonômicas duplicadas nas entidades;
- correspondência de nomes, aliases, descrições e seções com as fontes
  inventariadas;
- correspondência entre mídias inventariadas, arquivos copiados e referências
  editoriais declaradas;
- correspondência exata entre headings numerados e `sectionKey` declaradas;
- independência entre o significado da `sectionKey`, o rótulo editorial opcional
  e o nome do diretório editorial;
- cobertura de todos os domínios públicos de conhecimento;
- ausência de alteração no runtime, nos bancos ativos e no ramo `user`.

A validação executável de schemas, AST, allowlist, relações, locales, caminhos,
mídias e demais invariantes pertence ao primeiro gate da Parte 1B. Qualquer erro
encontrado por esse gate é corrigido em `data/knowledge` antes da geração dos
artefatos.

## Entregáveis

- árvore completa `data/knowledge/`;
- `data/knowledge/README.md` com o contrato de autoria;
- `_entity.json` para cada entidade pública, conforme o contrato de autoria
  documentado;
- conteúdo localizado simples completo em `localizedContent`;
- seis documentos Markdown por entidade com conteúdo editorial;
- referências taxonômicas completas e resolvíveis;
- seções associadas explicitamente a `sectionKey`;
- taxonomias e localizações geográficas reutilizáveis;
- relações explícitas por ID;
- mídias editoriais em diretórios `_media/` das entidades;
- inventário e auditoria de paridade reproduzíveis.

## Critérios De Aceite

- Todo dado público que compõe os bancos de sistema possui representação em
  `data/knowledge`.
- Campos estruturais e relações ficam em `_entity.json`.
- Todo conteúdo localizado simples fica em `localizedContent`, com os seis
  locales e sem caminhos de arquivo.
- Somente seções editoriais ficam em Markdown por locale, sem front matter e
  dentro do perfil canônico permitido.
- Entidades referenciam taxonomias por chaves canônicas completas e não repetem
  seus labels ou aliases gerais.
- O manifesto associa cada `sectionNumber` à sua `sectionKey`.
- Títulos apresentados pela UI são resolvidos pelo i18n da `sectionKey`; rótulos
  editoriais opcionais dos headings não são consumidos.
- Nenhuma entidade canônica depende do i18n para obter conteúdo de conhecimento.
- O inventário de paridade registra cobertura dos seis locales conforme o
  contrato documentado do domínio.
- IDs e relações de domínio são explícitos.
- JSON e Markdown não incorporam detalhes físicos de SQLite ou CAS.
- Mídias são referenciadas por caminhos relativos e legíveis.
- O runtime e a geração vigente dos bancos permanecem inalterados nesta parte.
- A auditoria de cobertura confirma paridade com o conteúdo público em uso.
- A validação executável integral fica reservada ao primeiro gate da Parte 1B.
- Não existe geração de banco, CAS ou integração com o app nesta parte.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1A.1: consolidação JSON e referências taxonômicas](./01a1-localized-json-consolidation.md).
