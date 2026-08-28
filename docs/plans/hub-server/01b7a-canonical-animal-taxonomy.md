# Parte 1B.7A: Taxonomia Animal Canônica

## Objetivo

Organizar `data/knowledge/animals` e o `knowledge-builder` em torno de uma
entidade animal única, cuja identidade taxonômica e cujas classificações
opcionais vivem no próprio `entity.json`:

```text
phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

`type` não integra essa sequência. Ele é uma classificação animal composta por
três eixos opcionais e independentes:

```text
functional
morphological
phylogenetic
```

Cada item de conhecimento animal representa um filo, classe, ordem, família,
gênero, espécie, raça ou variedade e declara explicitamente sua posição taxonômica.
Qualquer entidade pode declarar somente as classificações conhecidas e
aplicáveis ao seu caso. Os diretórios servem somente à organização editorial e
nunca criam entidades, relações ou dados implícitos.

```text
data/knowledge/animals
-> AnimalEntity
-> validação da taxonomia e das classificações
-> ProjectionContract
-> animal_reference_items
-> artefatos system verificáveis
```

## Pré-Requisitos

- A [Parte 1B.7](./01b7-central-builder-contracts.md) está concluída.
- O gate geral do workspace está verde antes da primeira edição desta parte.
- `data/knowledge` é a única fonte de autoria dos dados públicos de sistema.
- `knowledge-builder` é o único compilador de `system`, `system_media` e
  `CAS/system`.

## Escopo

Esta parte altera somente:

- `data/knowledge` e sua documentação;
- `tools/knowledge-builder`;
- contratos e fixtures pertencentes ao builder;
- documentos de plano afetados pela nova topologia.

Apps e packages de runtime passam a consumir essa estrutura na Parte 1C. Esta
parte não altera repositories, componentes, rotas, tipos de pet ou bancos do
ramo `user`.

## Invariantes

- Existe exatamente um `entity.json` para cada filo, classe, ordem, família,
  gênero, espécie, raça ou variedade referenciada no conjunto canônico.
- Um diretório contém `entity.json` somente quando representa um item real de
  conhecimento; sua profundidade na árvore não cria nem proíbe a entidade.
- `taxonomy` declara `phylum`, `class`, `order`, `family`, `genus`, `species`,
  `breed` e `variety` no próprio animal. As posições formam um prefixo contínuo:
  a posição da própria entidade usa seu `id`, as ancestrais referenciam
  entidades existentes e todas as inferiores usam `null`.
- `classifications` reúne `originPlaceIds`, `size`, os tipos `functional`,
  `morphological` e `phylogenetic`, `averageWeightKg` e `averageHeightCm`.
- `classifications` e todos os seus campos são opcionais nos oito níveis.
- A ausência de uma classificação significa somente que o dado não está
  disponível ou não se aplica; não produz erro e não autoriza inferência.
- Todo valor presente precisa resolver e satisfazer seu contrato canônico.
- Toda posição taxonômica não nula resolve um `AnimalEntity` do nível correto.
- Cada entidade usa seu próprio `id` exatamente na posição correspondente ao seu
  nível.
- Cada entidade abaixo de filo referencia uma única cadeia ancestral completa.
- Cada nível inferior pertence exatamente a uma entidade do nível imediatamente
  superior.
- O caminho editorial não define identidade, taxonomia, classificação ou ordem
  semântica.
- IDs, chaves e referências presentes em `entity.json` são a única fonte de
  verdade.
- Não existem aliases de campos, formatos paralelos, leitura dupla, adapters de
  transição ou schemas substituídos no estado final.
- Não são criadas migrations, rotinas de adoção ou conversores persistentes.
- Nenhuma classificação animal é inferida do nome ou do caminho de uma pasta.
- Não são criados termos `unknown`, `other`, `pending` ou equivalentes para
  satisfazer cardinalidade artificialmente.
- `system_media` e o layout de `CAS/system` permanecem inalterados; somente a
  identidade proprietária das mídias animais usa `animal`.

## 1. Modelo Conceitual

### 1.1 Taxonomia Do Animal

O objeto taxonômico possui oito posições nomeadas. Uma entidade de espécie usa:

```json
{
  "taxonomy": {
    "phylum": "chordata",
    "class": "mammalia",
    "order": "carnivora",
    "family": "canidae",
    "genus": "canis",
    "species": "canis-lupus-familiaris",
    "breed": null,
    "variety": null
  }
}
```

As posições são fechadas e ordenadas:

| Campo | Conteúdo | Cardinalidade |
| --- | --- | --- |
| `phylum` | ID da entidade de filo biológico | exatamente 1 |
| `class` | ID da entidade de classe biológica | 0 ou 1 |
| `order` | ID da entidade de ordem biológica | 0 ou 1 |
| `family` | ID da entidade de família biológica | 0 ou 1 |
| `genus` | ID da entidade de gênero biológico | 0 ou 1 |
| `species` | ID da entidade de espécie | 0 ou 1 |
| `breed` | ID da entidade de raça base | 0 ou 1 |
| `variety` | ID da entidade de variedade | 0 ou 1 |

`phylum` é a raiz e nunca é nulo. As demais posições aceitam `null` somente
depois da posição da própria entidade. Não existem lacunas entre posições não
nulas.

| Entidade | Última posição não nula | Posições inferiores |
| --- | --- | --- |
| filo | `phylum = id` | `class` até `variety = null` |
| classe | `class = id` | `order` até `variety = null` |
| ordem | `order = id` | `family` até `variety = null` |
| família | `family = id` | `genus` até `variety = null` |
| gênero | `genus = id` | `species` até `variety = null` |
| espécie | `species = id` | `breed` e `variety = null` |
| raça | `breed = id` | `variety = null` |
| variedade | `variety = id` | nenhuma |

Uma entidade de filo usa seu próprio `id` em `taxonomy.phylum` e deixa as sete
posições inferiores nulas. Uma entidade de classe referencia o filo, usa seu
próprio `id` em `taxonomy.class` e deixa as seis posições inferiores nulas. O
mesmo padrão se aplica sucessivamente a ordem, família, gênero e espécie.

Uma raça base referencia a cadeia completa até espécie, usa seu próprio `id` em
`taxonomy.breed` e declara `taxonomy.variety = null`. Uma variedade referencia a
cadeia completa até raça e usa seu próprio `id` em `taxonomy.variety`.

### 1.2 Classificações Do Animal

O objeto classificatório reúne origem, porte, até três tipos nomeados e medidas:

```json
{
  "classifications": {
    "originPlaceIds": ["fr"],
    "size": "medium",
    "types": {
      "functional": "companion",
      "morphological": "mesocephalic",
      "phylogenetic": "molosso"
    },
    "averageWeightKg": {
      "male": [3, 32],
      "female": [3, 28]
    },
    "averageHeightCm": {
      "male": [24, 60],
      "female": [24, 56]
    }
  }
}
```

`classifications` não aceita propriedades adicionais. O objeto pode ser omitido
e, quando presente, contém ao menos um campo conhecido. Cada classificação é
independente. `types` também pode ser omitido e, quando presente, contém ao menos
um entre `functional`, `morphological` e `phylogenetic`. Os tipos são posições
nomeadas, não um array e não uma hierarquia.

Cada nível mantém classificações próprias e opcionais. Isso permite representar
dados pertinentes ao táxon sem transformar porte ou tipo em nível taxonômico.
Classificações não são herdadas automaticamente entre entidades; todo valor
disponível é explícito.

### 1.3 Vocabulários Canônicos

Manter quatro taxonomias classificatórias do domínio `animal`:

| Domínio | Propósito | Entidade animal |
| --- | --- | --- |
| `animal` | `size` | `ZeroOrOne` |
| `animal` | `functional_type` | `ZeroOrOne` |
| `animal` | `morphological_type` | `ZeroOrOne` |
| `animal` | `phylogenetic_type` | `ZeroOrOne` |

Os oito níveis taxonômicos pertencem à identidade das entidades animais e não
duplicam seus nomes localizados em agregados de termos. Somente porte e tipos
resolvem termos dos vocabulários classificatórios.

O conjunto canônico possui 16 taxonomias: as 12 taxonomias de catálogo e as 4
taxonomias classificatórias animais. Porte e os três tipos possuem cardinalidade
independente `ZeroOrOne` nos oito níveis taxonômicos.

## 2. Organização De `data/knowledge/animals`

`data/knowledge/animals/taxonomies` contém somente os vocabulários compartilhados
referenciados pelos animais. Os itens animais ficam em diretórios nomeados na
ordem taxonômica para facilitar a navegação editorial.

Não criar diretórios genéricos `phyla/`, `classes/`, `orders/`, `families/`,
`genera/`, `species/`, `breeds/` ou `varieties/` na árvore de itens.

```text
data/knowledge/animals/
├── taxonomies/
│   ├── sizes/
│   │   └── entity.json
│   └── types/
│       ├── functional/
│       │   └── entity.json
│       ├── morphological/
│       │   └── entity.json
│       └── phylogenetic/
│           └── entity.json
└── chordata/
    ├── entity.json
    └── mammalia/
        ├── entity.json
        └── carnivora/
            ├── entity.json
            ├── canidae/
            │   ├── entity.json
            │   └── canis/
            │       ├── entity.json
            │       └── canis-lupus-familiaris/
            │           ├── entity.json
            │           ├── content/
            │           │   └── <locale>.md
            │           ├── affenpinscher/
            │           │   └── entity.json
            │           └── poodle/
            │               ├── entity.json
            │               ├── content/
            │               │   └── <locale>.md
            │               └── toy/
            │                   ├── entity.json
            │                   └── content/
            │                       └── <locale>.md
            └── felidae/
                ├── entity.json
                └── felis/
                    ├── entity.json
                    └── felis-catus/
                        ├── entity.json
                        └── persian/
                            └── entity.json
```

`chordata/entity.json` descreve o filo, `mammalia/entity.json` a classe,
`carnivora/entity.json` a ordem,
`canidae/entity.json` a família e `canis/entity.json` o gênero.
`canis-lupus-familiaris/entity.json` descreve a espécie,
`poodle/entity.json` a raça e `toy/entity.json` a variedade. Cada manifesto
declara sua identidade e sua cadeia ancestral completa; o caminho apenas reúne
editorialmente a mesma hierarquia.

Qualquer um dos oito níveis pode manter `content/`, `media/`, `sections` e os
demais campos comuns de `AnimalEntity`. A árvore omite parte desses diretórios
somente para permanecer legível.

O scanner descobre recursivamente todos os `entity.json`. O conteúdo do
manifesto determina se o arquivo é uma taxonomia compartilhada ou um item
animal. O caminho não participa dessa decisão.

Mover um item para outro diretório sem alterar seu manifesto não muda seu digest
lógico nem os artefatos compilados.

## 3. Contrato De Autoria

### 3.1 Entidade Animal Única

Substituir `BreedEntity` por um `AnimalEntity` fechado:

```rust
pub struct AnimalTaxonomy {
    pub phylum: String,
    pub class: Option<String>,
    pub order: Option<String>,
    pub family: Option<String>,
    pub genus: Option<String>,
    pub species: Option<String>,
    pub breed: Option<String>,
    pub variety: Option<String>,
}

pub struct AnimalTypes {
    pub functional: Option<String>,
    pub morphological: Option<String>,
    pub phylogenetic: Option<String>,
}

pub struct AnimalClassifications {
    pub origin_place_ids: Option<Vec<String>>,
    pub size: Option<String>,
    pub types: Option<AnimalTypes>,
    pub average_weight_kg: Option<MeasurementRange>,
    pub average_height_cm: Option<MeasurementRange>,
}

pub struct AnimalEntity {
    pub schema_version: u32,
    pub id: String,
    pub taxonomy: AnimalTaxonomy,
    pub classifications: Option<AnimalClassifications>,
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    pub content_path: Option<String>,
    pub media: Option<StructuralMedia>,
}
```

No Rust, o campo JSON `class` pode usar um identificador interno como
`class_id` com `#[serde(rename = "class")]`. O contrato JSON continua usando
somente `phylum`, `class`, `order`, `family`, `genus`, `species`, `breed` e
`variety`.

`CanonicalEntity` possui `Animal(AnimalEntity)` e retorna `animal` em
`entity_type()`.

### 3.2 Schema Da Entidade

Criar `schemas/source/animal.schema.json` como schema fechado. Remover
`schemas/source/breed.schema.json` e sua inclusão no fingerprint.

O JSON Schema usa `oneOf` para fechar os shapes dos oito níveis. Igualdades entre
`id` e campos de `taxonomy`, bem como a resolução das referências entre
entidades, pertencem à validação semântica Rust.

Regras exatas:

- `entityType` é `animal`;
- `taxonomy` exige `phylum`, `class`, `order`, `family`, `genus`, `species`,
  `breed` e `variety`;
- `phylum` é uma chave não vazia;
- `class`, `order`, `family`, `genus`, `species`, `breed` e `variety` aceitam
  chave não vazia ou `null`;
- as posições não nulas formam um prefixo contínuo iniciado por `phylum`;
- o `id` da entidade é igual à última posição não nula;
- cada posição ancestral resolve um `AnimalEntity` cujo `id` ocupa essa mesma
  posição e cujas posições inferiores são nulas;
- `classifications` é opcional e aceita somente `originPlaceIds`, `size`,
  `types`, `averageWeightKg` e `averageHeightCm`;
- quando presente, `classifications` possui ao menos um campo;
- cada campo de `classifications` é opcional e independente nos oito níveis;
- `types`, quando presente, aceita somente `functional`, `morphological` e
  `phylogenetic` e possui ao menos um deles;
- `classifications.originPlaceIds`, quando presente, é um array não vazio,
  ordenado e sem duplicatas;
- classificações textuais presentes são chaves não vazias;
- os demais campos conservam os contratos estruturais de conteúdo, medidas,
  origem e mídia já usados pelo builder.

Manter `schemaVersion: 1` como versão vigente do schema de autoria. Não aceitar
`entityType: breed`, `species` como array nem os campos classificatórios fora dos
objetos fechados. `originPlaceIds`, `averageWeightKg` e `averageHeightCm` não
existem no nível raiz de `AnimalEntity`.

### 3.3 Exemplo De Espécie

```json
{
  "schemaVersion": 1,
  "entityType": "animal",
  "id": "canis-lupus-familiaris",
  "taxonomy": {
    "phylum": "chordata",
    "class": "mammalia",
    "order": "carnivora",
    "family": "canidae",
    "genus": "canis",
    "species": "canis-lupus-familiaris",
    "breed": null,
    "variety": null
  },
  "classifications": {
    "size": "species-size-example",
    "types": {
      "functional": "species-functional-example",
      "morphological": "species-morphological-example",
      "phylogenetic": "species-phylogenetic-example"
    },
    "averageWeightKg": {
      "male": [1, 100],
      "female": [1, 100]
    },
    "averageHeightCm": {
      "male": [15, 100],
      "female": [15, 100]
    }
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Cão doméstico",
      "pt-PT": "Cão doméstico",
      "gn-PY": "Jaguarã",
      "en-US": "Domestic dog",
      "es-ES": "Perro doméstico",
      "fr-FR": "Chien domestique"
    }
  },
  "sections": []
}
```

A entidade de espécie concentra o conteúdo geral aplicável independentemente de
raça. Classificações e medidas presentes nesse nível descrevem a espécie em
amplitude geral. Quando um animal não possui raça definida, esta é a referência
de conhecimento utilizada pelo runtime.

As classificações e medidas do exemplo demonstram somente o shape. A autoria
define os termos e valores canônicos usados na implementação.

### 3.4 Exemplo De Raça Base

```json
{
  "schemaVersion": 1,
  "entityType": "animal",
  "id": "poodle",
  "taxonomy": {
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
    "size": "medium",
    "types": {
      "functional": "companion",
      "morphological": "mesocephalic",
      "phylogenetic": "phylogenetic-example"
    },
    "averageWeightKg": {
      "male": [3, 32],
      "female": [3, 28]
    },
    "averageHeightCm": {
      "male": [24, 60],
      "female": [24, 56]
    }
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Poodle",
      "pt-PT": "Poodle",
      "gn-PY": "Caniche",
      "en-US": "Poodle",
      "es-ES": "Caniche",
      "fr-FR": "Caniche"
    }
  },
  "sections": []
}
```

O exemplo demonstra apenas o shape. Toda classificação precisa estar
explicitamente revisada no próprio `entity.json`. Não inferir termos por nome,
pasta, espécie, tamanho ou localidade.

### 3.5 Exemplo De Variedade

```json
{
  "schemaVersion": 1,
  "entityType": "animal",
  "id": "poodle-toy",
  "taxonomy": {
    "phylum": "chordata",
    "class": "mammalia",
    "order": "carnivora",
    "family": "canidae",
    "genus": "canis",
    "species": "canis-lupus-familiaris",
    "breed": "poodle",
    "variety": "poodle-toy"
  },
  "classifications": {
    "originPlaceIds": ["fr"],
    "size": "small",
    "types": {
      "functional": "companion",
      "morphological": "mesocephalic",
      "phylogenetic": "phylogenetic-example"
    },
    "averageWeightKg": {
      "male": [3, 4],
      "female": [3, 4]
    },
    "averageHeightCm": {
      "male": [24, 28],
      "female": [24, 28]
    }
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Poodle Toy",
      "pt-PT": "Poodle Toy",
      "gn-PY": "Caniche Toy",
      "en-US": "Toy Poodle",
      "es-ES": "Caniche Toy",
      "fr-FR": "Caniche Toy"
    }
  },
  "sections": []
}
```

Não fabricar variedades a partir de porte, cor, pelagem ou texto narrativo. Uma
variedade existe somente quando há um `AnimalEntity` explícito para ela.

### 3.6 Política De Ausência

Não criar checkpoint, erro de completude ou termo substituto para classificações
ausentes. A conversão preserva somente valores sustentados pela autoria atual e
omite os demais.

Ausência não entra em relatórios de erro. Inventário e auditoria podem registrar
contagens de cobertura por campo para acompanhamento editorial, sem bloquear
`validate`, `build` ou o gate da parte.

## 4. Taxonomias Compartilhadas

Criar os agregados:

```text
animal:size
animal:functional_type
animal:morphological_type
animal:phylogenetic_type
```

Cada agregado segue o contrato universal de `TaxonomyEntity`: termos ordenados,
labels localizados e aliases próprios. Os termos são planos dentro de seu
vocabulário. Os oito níveis taxonômicos obtêm nome, aliases e conteúdo de seus
próprios `AnimalEntity`. Suas relações são validadas a partir dos objetos
`taxonomy`, não por `parentKey`.

Atualizar `CANONICAL_TAXONOMIES` de 13 para 16 entradas. O domínio `breed` deixa
de existir no registro taxonômico; os quatro propósitos classificatórios
pertencem ao domínio `animal`.

Adicionar `TaxonomyCardinality::ZeroOrOne` ao contrato central. Sua validação
genérica aceita ausência ou um único termo e recusa multiplicidade. A validação
animal aplica essa cardinalidade independentemente a porte e a cada um dos três
tipos, sem exigir combinações entre eles.

O contrato de projeção exige uma cadeia válida de `AnimalEntity` até o nível de
cada item e projeta somente as classificações presentes. Identidade taxonômica e
classificações ocupam colunas próprias de `animal_reference_items`; não criar
relações duplicadas em `entity_taxonomy_terms`.

## 5. Referências De Produtos E Protocolos

Nos schemas e tipos de `ProductEntity` e `TreatmentProtocolEntity`:

- remover `species`;
- adicionar `applicableSpeciesIds` como array não vazio, ordenado e sem
  duplicatas;
- exigir que cada ID resolva um `AnimalEntity` de espécie;
- conservar `targetSpeciesWarnings` como conteúdo clínico localizado; ele não é
  identidade taxonômica nem fonte de aplicabilidade.

Converter `canine` e `feline` para os IDs das respectivas entidades de espécie.
Não manter os dois campos no mesmo manifesto.

Esta parte preserva a aplicabilidade no nível de espécie. Aplicabilidade por
filo, classe, ordem, família, gênero, raça, variedade ou tipo exige contrato
próprio e não é inferida da estrutura editorial.

O digest lógico e a contagem de relações incluem cada referência de
`applicableSpeciesIds`.

## 6. Validação Semântica

Criar uma fronteira própria de validação animal, por exemplo:

```text
validation/animals/
├── mod.rs
├── taxonomy.rs
├── classifications.rs
└── applicability.rs
```

Validar antes da construção do `ProjectionContract`:

- ID global duplicado;
- shape inválido de `taxonomy`, `classifications` ou `types` presente;
- objeto `classifications` ou `types` presente sem nenhum campo;
- posição taxonômica vazia entre duas posições não nulas;
- posição inferior à própria entidade preenchida;
- `id` diferente da última posição taxonômica não nula;
- entidade taxonômica referenciada inexistente ou pertencente a outro nível;
- cadeia ancestral divergente da cadeia declarada pela entidade imediatamente
  superior;
- ciclo ou autorreferência fora da posição da própria entidade;
- termo de porte ou tipo declarado e inexistente;
- termo classificatório pertencente ao propósito incorreto;
- mais ou menos de um valor para qualquer posição aplicável;
- origem geográfica declarada e inexistente;
- produto ou protocolo com espécie inexistente ou referência para outro nível;
- array de aplicabilidade vazio ou duplicado;
- Markdown, mídia ou conteúdo localizado fora dos contratos existentes.

Remover `validate_species` e todas as allowlists `canine | feline`. A validação
usa somente termos resolvidos e relações explícitas dos manifestos.

A validação resolve cada posição não nula como `AnimalEntity` e compara o prefixo
taxonômico completo dessa entidade. Assim, cada nível possui exatamente uma
ascendência e toda a cadeia converge para o mesmo filo. As relações são
derivadas de `taxonomy`; não existe `parentKey` paralelo.

O caminho do arquivo não participa dessas decisões. Adicionar teste que mova um
item válido para outro caminho editorial e exija o mesmo digest lógico.

## 7. DDL De `system`

Substituir `breed_reference_items` por:

```sql
CREATE TABLE animal_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    phylum_id TEXT NOT NULL CHECK(length(trim(phylum_id)) > 0),
    class_id TEXT CHECK(class_id IS NULL OR length(trim(class_id)) > 0),
    order_id TEXT CHECK(order_id IS NULL OR length(trim(order_id)) > 0),
    family_id TEXT CHECK(family_id IS NULL OR length(trim(family_id)) > 0),
    genus_id TEXT CHECK(genus_id IS NULL OR length(trim(genus_id)) > 0),
    species_id TEXT CHECK(species_id IS NULL OR length(trim(species_id)) > 0),
    breed_id TEXT CHECK(breed_id IS NULL OR length(trim(breed_id)) > 0),
    variety_id TEXT CHECK(variety_id IS NULL OR length(trim(variety_id)) > 0),
    size_term_key TEXT
        CHECK(size_term_key IS NULL OR length(trim(size_term_key)) > 0),
    functional_type_term_key TEXT
        CHECK(functional_type_term_key IS NULL
            OR length(trim(functional_type_term_key)) > 0),
    morphological_type_term_key TEXT
        CHECK(morphological_type_term_key IS NULL
            OR length(trim(morphological_type_term_key)) > 0),
    phylogenetic_type_term_key TEXT
        CHECK(phylogenetic_type_term_key IS NULL
            OR length(trim(phylogenetic_type_term_key)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL
        CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    average_weight_kg_json TEXT
        CHECK(average_weight_kg_json IS NULL OR json_valid(average_weight_kg_json)),
    average_height_cm_json TEXT
        CHECK(average_height_cm_json IS NULL OR json_valid(average_height_cm_json)),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    FOREIGN KEY(phylum_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(class_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(order_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(family_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(genus_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(species_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(breed_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(variety_id)
        REFERENCES animal_reference_items(id) ON DELETE RESTRICT,
    CHECK(class_id IS NOT NULL OR order_id IS NULL),
    CHECK(order_id IS NOT NULL OR family_id IS NULL),
    CHECK(family_id IS NOT NULL OR genus_id IS NULL),
    CHECK(genus_id IS NOT NULL OR species_id IS NULL),
    CHECK(species_id IS NOT NULL OR breed_id IS NULL),
    CHECK(breed_id IS NOT NULL OR variety_id IS NULL),
    CHECK(
        CASE
            WHEN class_id IS NULL THEN id = phylum_id
            WHEN order_id IS NULL THEN id = class_id
            WHEN family_id IS NULL THEN id = order_id
            WHEN genus_id IS NULL THEN id = family_id
            WHEN species_id IS NULL THEN id = genus_id
            WHEN breed_id IS NULL THEN id = species_id
            WHEN variety_id IS NULL THEN id = breed_id
            ELSE id = variety_id
        END
    )
);

CREATE INDEX idx_animal_taxonomy
ON animal_reference_items(
    phylum_id,
    class_id,
    order_id,
    family_id,
    genus_id,
    species_id,
    breed_id,
    variety_id,
    normalized_name,
    id
);

CREATE INDEX idx_animal_class_items
ON animal_reference_items(class_id, order_id, family_id, normalized_name, id);

CREATE INDEX idx_animal_order_items
ON animal_reference_items(order_id, family_id, genus_id, normalized_name, id);

CREATE INDEX idx_animal_family_items
ON animal_reference_items(family_id, genus_id, species_id, normalized_name, id);

CREATE INDEX idx_animal_genus_items
ON animal_reference_items(genus_id, species_id, breed_id, normalized_name, id);

CREATE INDEX idx_animal_species_items
ON animal_reference_items(species_id, breed_id, variety_id, normalized_name, id);

CREATE INDEX idx_animal_breed_items
ON animal_reference_items(breed_id, variety_id, normalized_name, id);

CREATE INDEX idx_animal_functional_type
ON animal_reference_items(functional_type_term_key, id);

CREATE INDEX idx_animal_morphological_type
ON animal_reference_items(morphological_type_term_key, id);

CREATE INDEX idx_animal_phylogenetic_type
ON animal_reference_items(phylogenetic_type_term_key, id);

CREATE INDEX idx_animal_size
ON animal_reference_items(size_term_key, id);
```

Os campos taxonômicos e classificatórios são colunas explícitas para leitura,
filtro e indexação. O builder e o verificador garantem o nível de cada ID
taxonômico e o vocabulário de cada classificação; não armazenar o mesmo contrato
em um segundo JSON.
Todas as colunas classificatórias aceitam `NULL` independentemente e nenhuma
constraint exige coocorrência entre elas.

Persistir `animal_reference_items` em ordem topológica estável: filo, classe,
ordem, família, gênero, espécie, raça e variedade; dentro de cada nível, ordenar
por `id`. As foreign keys permanecem habilitadas durante toda a escrita.

Substituir `breed_origin_places` por:

```sql
CREATE TABLE animal_origin_places (
    animal_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(animal_id, place_id),
    UNIQUE(animal_id, sort_order),
    FOREIGN KEY(animal_id)
        REFERENCES animal_reference_items(id) ON DELETE CASCADE,
    FOREIGN KEY(place_id)
        REFERENCES geo_places(id) ON DELETE RESTRICT
);
```

Uma entidade sem `classifications.originPlaceIds` produz zero rows em
`animal_origin_places`. A ausência é válida nos oito níveis.

Renomear `species_json` de `product_catalog_items` e `treatment_protocols` para
`applicable_species_ids_json`. O JSON é um array ordenado de IDs válidos de
entidades de espécie.

Substituir `breed` por `animal` nos valores aceitos por `entity_search_terms` e
`entity_media_references`. `entity_taxonomy_terms` continua reservado às
entidades cujas classificações são relações N:N; a taxonomia animal usa as
colunas fechadas de `animal_reference_items`. Remover `breed` dos valores
aceitos por `entity_taxonomy_terms` sem adicionar `animal` nessa tabela.

O schema final permanece com 18 tabelas em `system`: 2 de metadata e 16
projetáveis. `system_media` permanece com 3 tabelas.

## 8. Rows E Contratos De Persistência

Atualizar o modelo fechado para conter:

```rust
SystemRow::Animal { /* todas as colunas de animal_reference_items */ }
SystemRow::AnimalOrigin { animal_id, place_id, sort_order }
```

Remover `SystemRow::Breed`, `SystemRow::BreedOrigin` e `SpeciesJson` quando
deixarem de possuir consumidor. Adicionar as identidades tipadas necessárias
para os campos de taxonomia, classificação e aplicabilidade por espécie.

Atualizar conjuntamente:

- `SystemTable` e suas listas fechadas;
- `SystemColumn` e cobertura exaustiva;
- identidade lógica das rows;
- disposição e ordem materializada das colunas;
- writers com SQL literal fixo;
- readers com `SELECT` literal independente;
- parsing estrutural de `INSERT`;
- equivalência exata entre contrato e banco.

As 16 famílias projetáveis de `system` possuem uma row fechada e releitura
integral. Não introduzir SQL dinâmico, registro de tabelas por string ou row
genérica.

## 9. ProjectionContract, Ledger E Evidência

Projetar cada `AnimalEntity` em:

- uma row de `animal_reference_items` por locale;
- zero ou mais origens em `animal_origin_places`;
- termos de busca localizados;
- referências de mídia estruturais e de Markdown, quando presentes.

A identidade lógica, os source tokens e o digest da row animal incluem
`phylum`, `class`, `order`, `family`, `genus`, `species`, `breed` e `variety` na
ordem canônica. Alterar qualquer posição modifica a evidência e o digest
projetado.

Projetar `applicableSpeciesIds` diretamente nas colunas JSON de produtos e
protocolos, preservando a ordem autoral.

Atualizar, sem reduzir as três provas independentes:

- inventário esperado derivado da fonte;
- ownership das operações;
- eventos observados;
- source tokens de campos e relações;
- row targets e identidades lógicas;
- contagens por entidade, relação, tabela e locale;
- evidência de mídia e CAS;
- adulterações semânticas do verificador.

`expected`, `owned` e `observed` continuam iguais ao final e não consultam um ao
outro para decidir quais efeitos deveriam existir.

## 10. Busca E Leitura

Todos os itens animais entram em `entity_search_terms` com
`entity_type = 'animal'`:

- nome localizado;
- aliases localizados;
- nomes e aliases localizados das entidades ancestrais;
- labels das classificações presentes.

Consultas usam diretamente as colunas indexadas de `animal_reference_items`:

- filos: `class_id IS NULL`;
- classes: `class_id IS NOT NULL AND order_id IS NULL`;
- ordens: `order_id IS NOT NULL AND family_id IS NULL`;
- famílias: `family_id IS NOT NULL AND genus_id IS NULL`;
- gêneros: `genus_id IS NOT NULL AND species_id IS NULL`;
- espécies: `species_id IS NOT NULL AND breed_id IS NULL`;
- raças base: `breed_id IS NOT NULL AND variety_id IS NULL`;
- variedades: `variety_id IS NOT NULL`;
- descendentes de qualquer nível: consultar a coluna de identidade
  correspondente;
- variedades de uma raça: `breed_id = ? AND variety_id IS NOT NULL`;
- filtros por porte ou por qualquer um dos três tipos: coluna correspondente.

Adicionar queries de prova para:

- abrir o conteúdo de qualquer um dos oito níveis;
- listar filhos diretos e todos os descendentes de qualquer nível;
- listar variedades de uma raça;
- reconstruir a taxonomia completa de um item sem consultar seu path;
- reconstruir as classificações declaradas de um item sem consultar seu path;
- encontrar animais por cada um dos três tipos;
- encontrar produtos e protocolos por espécie aplicável;
- impedir que tipo seja interpretado como nível taxonômico.

## 11. Mídia E CAS

Entidades dos oito níveis podem declarar `media` e imagens em Markdown. Projetar
todas com:

```text
entity_type = animal
entity_id   = <id do AnimalEntity>
```

Atualizar o verificador de ocorrências compiladas para resolver
`animal_reference_items`. Thumbnails, hashes, deduplicação, paths CAS e regras
de segurança permanecem inalterados.

## 12. Verificação Integral

O `ArtifactVerifier` relê independentemente:

- todos os animais e suas taxonomias completas;
- todas as classificações declaradas nos oito níveis;
- toda relação de origem;
- todas as espécies aplicáveis de produtos e protocolos;
- termos de busca e referências de mídia;
- contagens exatas do conjunto físico de tabelas.

Adicionar adulterações que precisam ser recusadas:

1. criar lacuna entre duas posições taxonômicas preenchidas;
2. preencher uma posição inferior à entidade;
3. tornar o `id` diferente da última posição não nula;
4. apontar uma posição ancestral para entidade inexistente;
5. apontar uma posição ancestral para entidade de outro nível;
6. divergir a cadeia de uma entidade da cadeia de seu ancestral imediato;
7. criar ciclo ou autorreferência fora da posição própria;
8. persistir `classifications` ou `types` como objeto vazio;
9. associar termo funcional no campo morfológico;
10. persistir intervalo de peso ou altura inválido;
11. apontar origem declarada para local inexistente;
12. apontar produto ou protocolo para entidade que não seja espécie;
13. alterar a ordem das espécies aplicáveis;
14. reintroduzir `species_json` ou tabela especializada de raças.

O verificador físico exige exatamente o schema vigente, sem tabelas ou colunas
adicionais.

## 13. Versões Técnicas

Atualizar em `contracts/version.rs` e nos schemas independentes:

```text
SOURCE_ENTITY_SCHEMA_VERSION       = 1
SOURCE_DIGEST_SCHEMA_VERSION       = 2
CONTENT_DOCUMENT_SCHEMA_VERSION    = 1
BUILD_CONTEXT_SCHEMA_VERSION       = 1
BUILD_RESULT_SCHEMA_VERSION        = 1
PROJECTION_REPORT_SCHEMA_VERSION   = 5
PROJECTION_EVIDENCE_SCHEMA_VERSION = 1
SYSTEM_SCHEMA_VERSION              = 4
SYSTEM_MEDIA_SCHEMA_VERSION        = 2
```

O relatório de projeção sobe para 5 porque enumera o conjunto fechado de tabelas
e rows com o contrato animal. O digest sobe para 2 porque sua identidade lógica
passa a conter taxonomia, classificações e aplicabilidade por espécie.

Elevar `knowledge-builder` de `0.3.1` para `0.4.0`, atualizar `Cargo.lock` e
emitir `builderVersion: 0.4.0`. A API pública de fonte deixa de expor
`BreedEntity` e passa a expor `AnimalEntity`.

Não alterar application ID de `system` ou `system_media`.

## 14. Fixtures E Testes

Atualizar `fixtures/valid-minimal` para conter:

- as 16 taxonomias canônicas;
- um termo em cada classificação de tipo;
- um termo de porte;
- uma entidade sem `classifications`;
- uma entidade com parte das classificações válidas;
- uma entidade com todas as classificações preenchidas;
- uma cadeia completa com uma entidade em cada um dos oito níveis, distribuindo
  entre elas os casos de classificação;
- um produto e um protocolo aplicáveis à espécie;
- origem, conteúdo localizado, busca e mídia mínima quando aplicável.

Cobrir unitariamente:

- shape de `taxonomy` e `classifications`;
- identidade dos oito níveis;
- prefixo taxonômico contínuo e posições inferiores nulas;
- resolução e consistência integral da cadeia ancestral;
- ausência integral de `classifications` em qualquer um dos oito níveis;
- presença independente de origem, porte, cada tipo, peso e altura;
- objeto `classifications` e objeto `types` não vazios quando presentes;
- cada classificação declarada resolvida no propósito correto;
- separação entre taxonomia e classificação;
- cada descendente repetindo toda a taxonomia superior, com classificações
  próprias e opcionais;
- aplicabilidade por espécie;
- independência entre caminho editorial e digest;
- SQL, bindings, readers e identidade de cada row;
- alinhamento Rust, JSON Schemas, DDL e relatório;
- ausência de `BreedEntity`, `species_json` e tabelas especializadas de raça.

Executar os testes específicos:

```text
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets --locked
cargo clippy -p knowledge-builder --all-targets --locked -- -D warnings
cargo test -p knowledge-builder --all-targets --locked
cargo run --locked -p knowledge-builder -- \
  validate \
  --source data/knowledge
cargo run --locked -p knowledge-builder -- \
  build \
  --source data/knowledge \
  --output build/knowledge-artifacts \
  --context tools/knowledge-builder/fixtures/contexts/local-context.json
```

Executar uma segunda build limpa com o mesmo contexto e comparar semanticamente
os artefatos. Checksums, digests, rows, relatórios e CAS precisam ser
determinísticos.

## 15. Documentação E Inventário

Atualizar no mesmo change set:

- `data/knowledge/README.md` com a árvore editorial, o critério de existência de
  manifestos e o contrato completo de `AnimalEntity`;
- `data/knowledge/inventory.json` com `animal`, contagens dos oito níveis,
  classificações e aplicabilidade por espécie;
- `data/knowledge/audit-report.json` com as novas contagens verificadas;
- `tools/knowledge-builder/README.md` com 18 tabelas de `system`, 16 taxonomias,
  classificação animal, aplicabilidade e queries;
- mapas Mermaid de tabelas, projeção e validação;
- schemas públicos e exemplos executáveis afetados.

A documentação descreve somente o contrato vigente. Não incluir equivalências
com nomes de campos, tabelas ou diretórios removidos.

## 16. Sequência De Implementação

1. Executar o gate inicial e registrar o estado verde.
2. Criar as quatro taxonomias classificatórias animais e fechar seus termos
   canônicos.
3. Reorganizar a árvore editorial mantendo manifestos somente para itens de
   conhecimento reais.
4. Criar ou adaptar as entidades dos oito níveis e suas cadeias ancestrais.
5. Preservar em cada entidade somente as classificações disponíveis.
6. Ordenar a projeção animal de filo até variedade.
7. Converter produtos e protocolos para `applicableSpeciesIds`.
8. Atualizar schemas, tipos Rust e validações semânticas.
9. Atualizar contratos centrais de taxonomia, locale e versões.
10. Atualizar DDL, rows, writers e readers.
11. Atualizar ProjectionContract, ledger, busca, mídia e CAS.
12. Atualizar relatório, verificador e adulterações.
13. Atualizar fixtures, testes, inventários e READMEs.
14. Validar a fonte, gerar os seis pares de bancos, provar determinismo e
    executar o gate geral final.

Cada etapa adapta todos os consumidores dentro de `data/knowledge` e
`tools/knowledge-builder` antes de avançar. Não conservar implementações
concorrentes para facilitar a execução.

## Fora De Escopo

- alterar o cadastro de pets;
- alterar componentes ou rotas de animais;
- implementar repositories de runtime para o novo contrato;
- criar novos eixos de tipo;
- dividir o tipo morfológico em outros campos;
- inventar ou pesquisar automaticamente classificações animais;
- transformar porte, cor ou pelagem em variedade sem entidade explícita;
- aplicar produtos ou protocolos por filo, classe, ordem, família, gênero, raça,
  variedade ou tipo;
- alterar `system_media`, thumbnails ou layout CAS;
- alterar bancos ou CAS do ramo `user`;
- criar migrations, conversores permanentes ou compatibilidade com contratos
  substituídos.

## Critérios De Aceite

- Existe um único `AnimalEntity` para cada filo, classe, ordem, família, gênero,
  espécie, raça ou variedade referenciada.
- Cada entidade contém `taxonomy` completa e pode omitir `classifications` ou
  qualquer campo interno.
- A taxonomia completa segue `phylum`, `class`, `order`, `family`, `genus`,
  `species`, `breed` e `variety`.
- Cada posição não nula resolve um `AnimalEntity` do nível correspondente.
- As posições não nulas formam um prefixo contínuo, o `id` ocupa a última
  posição e todos os níveis inferiores são nulos.
- Cada entidade abaixo de filo possui uma única cadeia ancestral completa e
  consistente.
- Origem, porte, tipos, peso e altura aparecem somente dentro de
  `classifications` no contrato de autoria.
- Diretórios recebem `entity.json` somente quando representam um item real de
  conhecimento, independentemente da profundidade na árvore editorial.
- O caminho não participa da identidade, taxonomia ou classificação.
- `type` não aparece como nível taxonômico.
- Cada entidade usa seu `id` na posição correspondente ao próprio nível.
- Entidades dos oito níveis aceitam ausência independente de origem, porte,
  tipos, peso e altura.
- Toda classificação presente resolve no propósito correto e não é inferida de
  outra entidade.
- Todo descendente repete a cadeia completa dos ancestrais, sem obrigatoriedade
  de repetir suas classificações.
- Produtos e protocolos usam somente `applicableSpeciesIds`.
- `animal_reference_items` substitui a tabela especializada de raças.
- Não existe `species_json` em `system`.
- O schema `system` possui exatamente 18 tabelas, sendo 16 projetáveis.
- As 16 taxonomias canônicas estão presentes e são projetadas universalmente.
- Taxonomia, classificações, origens, busca, mídia e conteúdo são relidos e
  comparados exatamente pelo verificador.
- `system` usa schema 4, o relatório usa schema 5 e o crate usa versão 0.4.0.
- A build dos seis locales é determinística e integralmente verificável.
- Não permanecem schemas, tipos, rows, SQLs, fixtures ou documentação do
  contrato substituído.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.8.1: contratos de rows e persistência](./01b8-knowledge-builder-maintainability/01-row-persistence-contracts.md).
