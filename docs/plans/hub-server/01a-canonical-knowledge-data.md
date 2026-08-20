# Parte 1A: Dados Canônicos De Conhecimento

## Objetivo

Materializar em `data/knowledge/` a fonte canônica completa dos dados públicos
que compõem `system`, `system_media` e `CAS/system`, com autoria baseada em
manifestos JSON, conteúdo localizado em Markdown e mídias organizadas junto às
entidades.

Esta parte organiza somente os dados e seus contratos de autoria. O app continua
usando seu fluxo de dados vigente durante a execução desta parte. A compilação
dos artefatos pertence à [Parte 1B](./01b-knowledge-builder.md), e a troca do
consumidor pertence à [Parte 1C](./01c-app-system-consumption.md).

## Pré-requisito

A [Pré-fase 0](./00-pnpm-workspace-migration.md) está integralmente concluída.

## Princípio De Autoria

`data/knowledge` é otimizado para edição, revisão e visualização humana. Bancos
SQLite, hashes e caminhos CAS são representações compiladas e não aparecem nos
arquivos de autoria.

Cada entidade combina três elementos:

- `entity.json`: identidade, campos estruturais, relações e composição do
  conteúdo;
- arquivos `.md`: somente textos localizados;
- `media/`: bytes originais referenciados por caminhos relativos.

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
├── entity.json
├── localized/
│   ├── display/
│   │   ├── pt-BR.md
│   │   ├── pt-PT.md
│   │   ├── gn-PY.md
│   │   ├── en-US.md
│   │   ├── es-ES.md
│   │   └── fr-FR.md
│   └── search-names/
│       └── <locale>.md
├── sections/
│   ├── content-a/
│   │   └── <locale>.md
│   └── content-b/
│       └── <locale>.md
└── media/
    ├── cover.webp
    └── detail.webp
```

Os nomes `display`, `search-names`, `content-a` e `content-b` não possuem
semântica de domínio. O `entity.json` declara qual campo ou seção padronizada
cada diretório fornece. As pastas servem para organização editorial e podem ser
renomeadas junto com a atualização de seus caminhos no manifesto.

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

Todo texto que descreve conhecimento fica nos arquivos Markdown canônicos:

- nome e aliases de entidade;
- descrição e conteúdo de referência;
- nomes e aliases geográficos;
- rótulos e descrições de taxonomias;
- nomes e observações de protocolos;
- conteúdo das seções de produtos e raças;
- texto alternativo e legenda declarados pela sintaxe Markdown.

Textos de interface permanecem em `@vet/core-local/i18n`, incluindo comandos,
mensagens de erro, estados vazios, rótulos de controles e títulos padronizados
das seções identificadas por `sectionKey`.

Por exemplo, o conteúdo da seção `indications` pertence ao Markdown do produto.
O título apresentado como “Indicações” é o rótulo de interface da seção
padronizada. Um subtítulo específico do conteúdo permanece no próprio Markdown.

Nenhum dado canônico usa `labelKey`, `translationKey` ou outra chave para buscar
conteúdo de conhecimento no i18n do app.

## Manifesto `entity.json`

`entity.json` contém somente estrutura não localizável e referências aos
diretórios de conteúdo. O envelope mínimo é:

```json
{
  "schemaVersion": 1,
  "entityType": "breed",
  "id": "beagle",
  "species": ["canine"],
  "relations": {},
  "localizedContent": {
    "name": "./localized/display",
    "aliases": "./localized/search-names"
  },
  "sections": [
    {
      "sectionKey": "overview",
      "contentPath": "./sections/content-a"
    },
    {
      "sectionKey": "physical_characteristics",
      "contentPath": "./sections/content-b"
    }
  ],
  "cover": "./media/cover.webp"
}
```

O schema selecionado por `entityType` define:

- campos estruturais permitidos;
- relações aceitas;
- chaves de `localizedContent` e o formato esperado de cada fragmento;
- `sectionKey` permitidas;
- cardinalidade e obrigatoriedade de conteúdo por locale;
- referências de mídia estruturais, como `cover`.

O caminho não define o significado do conteúdo. Por exemplo, mesmo que o
diretório se chame `content-a`, o fragmento pertence à seção `overview` porque
essa associação está declarada no manifesto.

`entity.json` não contém nomes de tabelas, colunas, SQL, hashes, caminhos CAS ou
IDs técnicos de linhas derivadas. Toda entidade com identidade própria possui
um `id` estável na fonte. O builder não cria identidades de domínio aleatórias.

## Conteúdo Localizado Em Markdown

Cada caminho declarado em `localizedContent` ou `sections[].contentPath` aponta
para um diretório com um arquivo `<locale>.md`. Os Markdown não possuem front
matter. Eles contêm somente o valor ou o corpo localizado daquele campo.

Exemplo de nome em `localized/display/pt-BR.md`:

```markdown
Beagle
```

Exemplo de aliases em `localized/search-names/pt-BR.md`:

```markdown
- English Beagle
- Beagle inglês
```

Exemplo de seção em `sections/content-a/pt-BR.md`:

```markdown
O Beagle é uma raça canina de porte médio, ativa e sociável.

![Beagle adulto](../../media/detail.webp "Exemplar adulto")
```

O schema da chave localizada determina como o AST é validado e projetado:

- `name`: texto simples sem bloco estrutural adicional;
- `aliases`: lista Markdown de textos simples;
- seção: corpo Markdown dentro do perfil canônico permitido;
- outros campos localizados: contrato tipado próprio do `entityType`.

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

Os contratos de `name`, `aliases` e outros campos simples aplicam subconjuntos
mais restritos dessa allowlist. O perfil faz parte dos schemas de autoria e da
representação compilada; uma alteração que exija comportamento novo do runtime
também eleva a versão do schema de `system`.

O título principal de uma seção não precisa aparecer no fragmento. Subtítulos
internos são permitidos e permanecem localizados; o builder normaliza sua
hierarquia para inserção sob o título de `sectionKey`.

A ordem do array `sections` define a ordem editorial. Nomes de diretórios,
ordem de descoberta no filesystem e títulos escritos no Markdown não definem a
seção nem sua posição.

Títulos e subtítulos padronizados usam o mesmo contrato. Uma seção pode declarar
`parentSectionKey` para compor a hierarquia sem depender do nome da pasta nem de
um heading dentro do Markdown:

```json
{
  "sections": [
    {
      "sectionKey": "composition",
      "contentPath": "./sections/content-a"
    },
    {
      "sectionKey": "active_ingredients",
      "parentSectionKey": "composition",
      "contentPath": "./sections/content-b"
    }
  ]
}
```

Cada `sectionKey` é única na entidade. O schema do `entityType` valida pais
permitidos, profundidade máxima e se uma seção exige conteúdo próprio. O builder
recusa pais inexistentes e ciclos.

## Identidade E Descoberta

- `id` é estável e único no espaço definido pelo contrato da entidade;
- o formato de `id` é definido pelo schema do `entityType`; UUIDs são permitidos
  quando representam a identidade de domínio da entidade;
- toda relação aponta para `entityType` e `id`, ou para um ID global quando o
  schema do domínio assim determinar;
- `entityType` seleciona o schema e o projector da Parte 1B;
- `species`, classificações, regiões e relações são declaradas no JSON;
- o builder descobre recursivamente diretórios que contenham `entity.json`;
- duas entidades que reivindiquem a mesma identidade invalidam o conjunto;
- conteúdo localizado é identificado pelo campo ou `sectionKey` declarado no
  manifesto e pelo locale do nome do arquivo;
- nomes de pastas nunca são inferidos como tipos, seções ou relacionamentos;
- a ordenação canônica usa identidade, campo, `sectionKey` e locale, não a ordem
  retornada pelo filesystem.

Um nome científico ou código regulatório pode permanecer estrutural quando for
um identificador de domínio. Valores apresentados como nome, descrição ou alias
ao usuário pertencem aos fragmentos localizados, mesmo quando o texto coincide
nos seis locales.

## Taxonomias E Classificações

Vocabulários controlados são entidades agregadoras. Os itens usam seus termos
por chave-valor, enquanto a taxonomia declara valores permitidos, ordem,
hierarquia e metadados compartilhados.

```text
catalog/taxonomies/product-types/
catalog/taxonomies/product-classifications/
animals/taxonomies/breed-sizes/
```

`entity.json` contém os IDs estruturais dos termos e mapeia cada conjunto de
rótulos, descrições e aliases para diretórios de Markdown localizados. Não é
necessário criar um diretório de entidade para cada termo quando o schema da
taxonomia define um agregado.

## Domínio Geográfico

Localizações reutilizáveis ficam em:

```text
data/knowledge/geo/places/<place>/
├── entity.json
├── localized/
└── sections/
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
    "name": "./localized/display",
    "aliases": "./localized/search-names"
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

Os bytes originais ficam no diretório `media/` da entidade. O nome do arquivo é
editorial e legível; ele não precisa conter UUID nem hash.

Referências estruturais usam caminhos relativos no `entity.json`:

```json
{
  "cover": "./media/cover.webp"
}
```

Referências inseridas no conteúdo usam a sintaxe Markdown comum:

```markdown
![Beagle adulto](../../media/detail.webp "Exemplar adulto")
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
3. Definir chaves de `localizedContent` e seus formatos Markdown.
4. Definir `sectionKey` padronizadas por domínio.
5. Definir regras de caminhos relativos e mídias.
6. Documentar o contrato em `data/knowledge/README.md`.

### Atividade 3: Conversão Estrutural

1. Criar uma entidade por produto, fabricante, princípio ativo, condição, raça,
   localização geográfica, taxonomia e protocolo.
2. Preservar IDs e declarar relações explicitamente.
3. Transportar campos estruturais para `entity.json`.
4. Declarar no manifesto os diretórios de campos e seções localizados.
5. Copiar mídias com nomes editoriais para o diretório `media/` da entidade.

### Atividade 4: Conversão Do Conteúdo Localizado

1. Criar os seis Markdown exigidos em cada diretório localizado.
2. Transportar nomes e aliases para fragmentos tipados.
3. Transportar descrições e seções para o perfil Markdown canônico.
4. Converter referências de mídia em links relativos comuns.
5. Distribuir aliases por locale.
6. Manter no i18n somente textos de interface e rótulos padronizados.

### Atividade 5: Auditoria De Paridade

1. Comparar quantidades por tipo de entidade.
2. Comparar conjuntos de IDs e relações.
3. Comparar campos estruturais normalizados.
4. Confirmar cobertura dos seis locales por campo e seção obrigatórios.
5. Confirmar que todo conteúdo de conhecimento possui destino canônico.
6. Confirmar que nenhuma regra de domínio depende do nome das pastas.

## Regras Durante A Parte 1A

- O app não importa nem lê `data/knowledge`.
- A criação vigente dos bancos não é alterada.
- Repositories, rotas e componentes não usam os novos arquivos.
- `data/knowledge` não oferece fallback ao runtime.
- Os arquivos Markdown não possuem front matter.
- O significado de um fragmento vem exclusivamente do `entity.json`.
- O builder da Parte 1B é o único consumidor da fonte canônica.

## Auditoria De Cobertura E Paridade

Esta parte audita a conversão do conteúdo, sem implementar um parser, um schema
runner ou outro validador paralelo ao `knowledge-builder`. A auditoria produz um
inventário reproduzível que confirma:

- presença de uma entidade canônica para cada item público inventariado;
- preservação dos IDs de domínio e declaração das relações identificadas;
- destino canônico para cada campo estrutural e conteúdo localizado da fonte;
- matriz dos seis arquivos por locale para cada campo ou seção obrigatória
  documentada;
- correspondência de nomes, aliases, descrições e seções com as fontes
  inventariadas;
- correspondência entre mídias inventariadas, arquivos copiados e referências
  editoriais declaradas;
- independência entre o significado de campo ou `sectionKey` e o nome do
  diretório;
- cobertura de todos os domínios públicos de conhecimento;
- ausência de alteração no runtime, nos bancos ativos e no ramo `user`.

A validação executável de schemas, AST, allowlist, relações, locales, caminhos,
mídias e demais invariantes pertence ao primeiro gate da Parte 1B. Qualquer erro
encontrado por esse gate é corrigido em `data/knowledge` antes da geração dos
artefatos.

## Entregáveis

- árvore completa `data/knowledge/`;
- `data/knowledge/README.md` com o contrato de autoria;
- `entity.json` para cada entidade pública, conforme o contrato de autoria
  documentado;
- seis fragmentos Markdown por conteúdo localizado obrigatório;
- seções associadas explicitamente a `sectionKey`;
- taxonomias e localizações geográficas reutilizáveis;
- relações explícitas por ID;
- mídias editoriais em diretórios `media/` das entidades;
- inventário e auditoria de paridade reproduzíveis.

## Critérios De Aceite

- Todo dado público que compõe os bancos de sistema possui representação em
  `data/knowledge`.
- Campos estruturais e relações ficam em `entity.json`.
- Textos de conhecimento ficam em Markdown por locale, sem front matter e
  dentro do perfil canônico permitido.
- O manifesto define a finalidade de cada diretório de conteúdo.
- Títulos de seções padronizadas não precisam ser repetidos nos Markdown.
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
[Parte 1B: `knowledge-builder` e artefatos locais](./01b-knowledge-builder.md).
