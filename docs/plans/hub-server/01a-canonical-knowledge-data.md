# Parte 1A: Dados Canônicos De Conhecimento

## Objetivo

Materializar em `data/knowledge/` a fonte canônica completa dos dados públicos
que compõem `system`, `system_media` e `CAS/system`, com estrutura independente
de TypeScript, Svelte, Rails e do runtime dos apps.

Esta parte organiza somente os dados e seus contratos de autoria. O app continua
usando o fluxo de dados vigente durante toda a execução desta parte. A geração
dos novos artefatos pertence à [Parte 1B](./01b-knowledge-builder.md), e a troca
do consumidor pertence à [Parte 1C](./01c-app-system-consumption.md).

## Pré-requisito

A [Pré-fase 0](./00-pnpm-workspace-migration.md) está integralmente concluída.

## Resultado Alvo

```text
data/knowledge/
├── README.md
├── _media/
│   └── objects/
│       └── <sha256>
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

As subpastas servem exclusivamente para autoria e navegação humana. O caminho
não define identidade, tipo, espécie, classificação, locale ou relacionamento.
Uma entidade pode ser movida entre diretórios organizacionais sem mudar seu
significado nem o conteúdo lógico compilado.

## Fontes Incluídas

O levantamento cobre todo conteúdo público usado para preencher os bancos de
sistema, incluindo:

- produtos e suas relações com fabricantes e princípios ativos;
- fabricantes;
- princípios ativos;
- condições clínicas;
- raças caninas e felinas;
- localizações geográficas reutilizáveis, incluindo as origens referenciadas por
  raças;
- portes e demais vocabulários controlados de raças;
- árvores de tipos e classificações dos catálogos;
- aliases localizados usados por busca e descoberta;
- protocolos públicos de vacinação e antiparasitários;
- doses, vigências, observações e relações dos protocolos;
- nomes, descrições, seções e referências localizadas;
- referências de mídias e seus metadados localizados.

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
```

O inventário é orientado pelo conteúdo que alimenta `system` e `system_media`,
não apenas por esses caminhos. Qualquer constante, agregado TypeScript, JSON,
texto localizado ou referência de mídia que participe desse preenchimento entra
no levantamento.

## Fronteira Com I18n

Todo texto que descreve conhecimento fica nos JSONs canônicos:

- nome de entidade;
- aliases;
- descrição;
- seções descritivas;
- nome e aliases de localização geográfica;
- rótulo de taxonomia ou classificação;
- nome e observação de protocolo;
- legenda, texto alternativo e descrição de mídia.

Textos de interface permanecem em `@vet/core-local/i18n`, incluindo comandos,
mensagens de erro, títulos de tela, rótulos de controles, estados vazios e
instruções operacionais.

Por exemplo, o nome localizado de uma raça e a descrição de sua morfologia são
dados de conhecimento. Já “Pesquisar raça”, “Limpar filtros” e “Nenhuma raça
encontrada” são textos da interface.

Nenhum JSON canônico usa `labelKey`, `translationKey` ou outra chave que exija
que o consumidor procure conteúdo de conhecimento no i18n do app.

## Envelope De Entidade

Cada entidade ocupa um diretório próprio:

```text
<diretório-organizacional>/<entidade>/
├── entity.json
└── localizations/
    ├── pt-BR.json
    ├── pt-PT.json
    ├── gn-PY.json
    ├── en-US.json
    ├── es-ES.json
    └── fr-FR.json
```

`entity.json` contém somente estrutura não localizável. O envelope mínimo é:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "beagle",
  "species": ["canine"],
  "relations": {},
  "media": []
}
```

Cada localização contém somente conteúdo daquele locale:

```json
{
  "schemaVersion": 1,
  "locale": "pt-BR",
  "name": "Beagle",
  "aliases": [],
  "description": null,
  "sections": {},
  "media": []
}
```

Os campos concretos variam por `entityType`, mas os envelopes, a separação entre
estrutura e localização e a semântica dos IDs permanecem uniformes.

## Identidade E Descoberta

- `id` é estável e único no espaço definido pelo contrato da entidade;
- toda referência aponta para `entityType` e `id`, ou para um ID global quando o
  schema do domínio assim determinar;
- nomes de arquivos e diretórios não são usados como chaves de relacionamento;
- `entityType` seleciona o schema da entidade;
- o conteúdo de `species`, `classification`, `regions` e `relations` é declarado
  no JSON, nunca deduzido do caminho;
- `entity.json` não declara nomes de tabelas, colunas, SQL ou detalhes físicos de
  persistência;
- o futuro builder descobre recursivamente diretórios que contenham
  `entity.json`;
- dois arquivos que reivindiquem a mesma identidade invalidam o conjunto;
- a ordenação canônica usa `entityType`, `id` e `locale`, não o caminho físico.

Um nome científico ou código regulatório pode permanecer estrutural quando for
um identificador de domínio. Todo valor apresentado como nome, descrição ou
alias ao usuário pertence às localizações, mesmo quando seu texto é igual nos
seis locales.

`entityType` e os campos do domínio determinam qual projector da Parte 1B recebe
a entidade. O projector aplica o DDL e decide em quais tabelas e relações o
conteúdo é persistido. A fonte canônica permanece independente dessa disposição
relacional.

## Taxonomias E Classificações

Vocabulários controlados são entidades agregadoras. Os itens usam seus termos
por chave-valor, enquanto a taxonomia declara os valores permitidos, ordem,
hierarquia e demais metadados compartilhados.

Exemplos:

```text
catalog/taxonomies/product-types/
catalog/taxonomies/product-classifications/
animals/taxonomies/breed-sizes/
```

`entity.json` contém os IDs estruturais dos termos. O arquivo de cada locale
contém um mapa desses IDs para rótulos, descrições e aliases localizados. Não é
necessário criar um diretório de entidade para cada termo.

Assim, um item pode declarar `compositionOrigin: "biological"`; a taxonomia
correspondente valida `biological` e fornece sua apresentação localizada para o
banco. Filtros, detalhes e buscas recebem esses rótulos sem depender de mapas
TypeScript.

## Domínio Geográfico

Localizações reutilizáveis ficam em:

```text
data/knowledge/geo/places/<place>/
├── entity.json
└── localizations/
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
  }
}
```

Nome, aliases e descrição pertencem às localizações da entidade. Uma raça não
incorpora a estrutura geográfica nem possui uma entidade especial de origem; ela
declara o papel da relação:

```json
{
  "originPlaceIds": ["england"]
}
```

O campo é uma lista porque uma raça pode se relacionar a mais de uma localização.
Outros domínios podem referenciar os mesmos `geo_place` para finalidades próprias
sem depender de `animals`.

## Relações

As relações estruturais incluem, quando aplicável:

- produto para fabricante;
- produto para princípios ativos;
- protocolo para produtos;
- protocolo para doses;
- raça para uma ou mais localizações geográficas de origem;
- entidade para termos de taxonomia;
- entidade para mídias compartilhadas.

Relações não usam nomes, aliases, posições em arrays globais ou caminhos. A
ordem com significado clínico ou editorial é representada explicitamente por um
campo como `sortOrder`.

## Mídias

Referências compartilhadas ficam em `entity.json`. Legendas, textos alternativos
e mídias específicas de um locale ficam no arquivo de localização.

Os bytes de autoria ficam em `data/knowledge/_media/objects/<sha256>`. O nome do
objeto é o SHA-256 de seus bytes e toda referência informa esse hash e seu papel.
O contrato da Parte 1B valida os objetos e os projeta para `system_media` e
`CAS/system`.

Nenhum arquivo JSON contém bytes embutidos em base64. Caminhos de autoria não se
tornam identidade pública nem são persistidos como relação de domínio.

## Estratégia De Materialização

### Atividade 1: Inventário

1. Enumerar as tabelas e relações públicas preenchidas na criação atual de
   `system` e `system_media`.
2. Mapear cada campo até sua fonte em JSON, TypeScript, i18n ou mídia.
3. Classificar cada campo como estrutural, localizado, mídia ou texto de UI.
4. Registrar IDs duplicados, referências implícitas e traduções ausentes antes
   da conversão.

### Atividade 2: Contratos De Autoria

1. Definir o envelope comum e os campos de cada `entityType`.
2. Definir quais tipos possuem relações entre si.
3. Definir os campos localizados obrigatórios e opcionais.
4. Definir a representação de taxonomias, localizações geográficas, protocolos
   e mídias.
5. Documentar o contrato em `data/knowledge/README.md`.

### Atividade 3: Conversão Estrutural

1. Criar uma entidade por produto, fabricante, princípio ativo, condição, raça,
   localização geográfica, taxonomia e protocolo.
2. Preservar IDs e relações existentes.
3. Transformar relações implícitas em referências explícitas.
4. Retirar do conteúdo estrutural nomes, aliases e descrições destinados à
   apresentação.
5. Materializar os bytes de mídia pelo SHA-256 em `_media/objects/`.

### Atividade 4: Conversão Das Localizações

1. Criar os seis arquivos de locale por entidade.
2. Transportar nomes de raças e catálogos para a entidade correspondente.
3. Transportar nomes e aliases geográficos para cada `geo_place`.
4. Transportar descrições e seções de referência.
5. Distribuir aliases por locale, sem manter um conjunto multilíngue único.
6. Materializar rótulos de taxonomias e classificações como dados localizados.
7. Manter no i18n atual somente a cópia ainda usada pelo runtime e os textos de
   interface.

### Atividade 5: Auditoria De Paridade

1. Comparar quantidades por tipo de entidade.
2. Comparar conjuntos de IDs e relações.
3. Comparar campos estruturais normalizados.
4. Confirmar a cobertura dos seis locales.
5. Confirmar que todo conteúdo de conhecimento atual possui destino canônico.
6. Confirmar que nenhum texto de UI foi transferido como dado de domínio.

## Regras Durante A Parte 1A

- O app não importa nem lê `data/knowledge`.
- A criação atual dos bancos não é alterada.
- Repositories, rotas e componentes não são modificados para usar os novos
  arquivos.
- As fontes usadas pelo runtime permanecem disponíveis até a Parte 1C.
- `data/knowledge` não oferece fallback ao runtime.
- Alterações editoriais de conhecimento são congeladas durante a conversão ou
  aplicadas de forma idêntica nas duas representações até a auditoria final.
- A coexistência termina na Parte 1C; ela não faz parte da arquitetura final.

## Testes E Verificações

Cobrir por auditoria automatizada ou determinística:

- descoberta de todas as entidades esperadas;
- identidade única;
- correspondência exata dos seis locales;
- ausência de locale desconhecido;
- ausência de `labelKey` e `translationKey` nos dados canônicos;
- ausência de nomes de tabelas, colunas ou instruções SQL nos dados canônicos;
- integridade de referências entre entidades;
- separação entre campos estruturais e localizados;
- equivalência dos campos estruturais com as fontes usadas pelo runtime;
- equivalência de nomes, aliases, descrições e seções por locale;
- cobertura de produtos, fabricantes, princípios ativos, condições, raças,
  localizações geográficas, taxonomias e protocolos;
- cobertura das referências de mídia;
- correspondência entre cada referência de mídia e seu objeto SHA-256;
- independência entre identidade e caminho organizacional.

## Entregáveis

- árvore completa `data/knowledge/`;
- `data/knowledge/README.md` com o contrato de autoria;
- uma entidade canônica por item público;
- seis localizações por entidade;
- taxonomias e classificações localizadas;
- localizações geográficas reutilizáveis em `geo/places`;
- relações explícitas por ID;
- objetos de mídia canônicos em `_media/objects/`;
- inventário e auditoria de paridade reproduzíveis.

## Critérios De Aceite

- Todo dado que compõe os bancos públicos possui representação em
  `data/knowledge`.
- Nomes, aliases, descrições e demais textos de conhecimento ficam nos arquivos
  de localização das entidades.
- Nenhuma entidade canônica depende do i18n do app.
- Os seis locales possuem cobertura completa.
- IDs e relações são explícitos e independentes da árvore de pastas.
- Raças referenciam `geo_place` por `originPlaceIds`, sem possuir cópias da
  estrutura geográfica.
- Os JSONs descrevem domínio e não incorporam detalhes do modelo relacional.
- Toda mídia referenciada possui objeto canônico com SHA-256 válido.
- Mover um diretório de entidade sem alterar seus JSONs não altera sua identidade
  nem suas relações.
- O runtime do app e a geração vigente dos bancos permanecem inalterados.
- A auditoria confirma paridade entre o conteúdo em uso e a nova fonte canônica.
- Não existe código de build, geração de banco ou integração com o app nesta
  parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B: `knowledge-builder` e artefatos locais](./01b-knowledge-builder.md).
