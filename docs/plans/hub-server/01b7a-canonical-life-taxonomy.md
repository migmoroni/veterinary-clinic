# Parte 1B.7A: Taxonomia Canônica Da Vida

## Objetivo

Organizar `data/knowledge/life` e o `knowledge-builder` em torno de uma entidade
de vida única, cuja identidade taxonômica e cujas classificações opcionais vivem
no próprio `entity.json`. O contrato representa tanto organismos que podem ser
pacientes quanto organismos associados à origem de condições clínicas:

```text
domain -> kingdom -> phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

Cada item de conhecimento representa um domínio, reino, filo, classe, ordem,
família, gênero, espécie, raça ou variedade e declara explicitamente sua posição
taxonômica. Qualquer entidade pode declarar somente as classificações conhecidas
e aplicáveis ao seu caso. Os diretórios servem somente à organização editorial
e nunca criam entidades, relações ou dados implícitos.

```text
data/knowledge/life
-> LifeEntity
-> validação da taxonomia e das classificações
-> ProjectionContract
-> life_reference_items
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

- Existe exatamente um `entity.json` para cada domínio, reino, filo, classe,
  ordem, família, gênero, espécie, raça ou variedade referenciada no conjunto
  canônico.
- Um diretório contém `entity.json` somente quando representa um item real de
  conhecimento; sua profundidade na árvore não cria nem proíbe a entidade.
- `taxonomy` declara `domain`, `kingdom`, `phylum`, `class`, `order`, `family`,
  `genus`, `species`, `breed` e `variety` na própria entidade. As posições formam
  um prefixo contínuo: a posição da própria entidade usa seu `id`, as ancestrais
  referenciam entidades existentes e todas as inferiores usam `null`.
- `classifications` reúne `originPlaceIds` e `bodyMetrics`.
- `bodyMetrics` reúne o porte geral opcional em `size` e o perfil corporal
  opcional por estágio em `stageMetrics`.
- `classifications` e todos os seus campos são opcionais nos dez níveis.
- A ausência de uma classificação significa somente que o dado não está
  disponível ou não se aplica; não produz erro e não autoriza inferência.
- Todo valor presente precisa resolver e satisfazer seu contrato canônico.
- Toda posição taxonômica não nula resolve um `LifeEntity` do nível correto.
- Cada entidade usa seu próprio `id` exatamente na posição correspondente ao seu
  nível.
- Cada entidade abaixo de domínio referencia uma única cadeia ancestral completa.
- Cada nível inferior pertence exatamente a uma entidade do nível imediatamente
  superior.
- O caminho editorial não define identidade, taxonomia, classificação ou ordem
  semântica.
- IDs, chaves e referências presentes em `entity.json` são a única fonte de
  verdade.
- Não existem aliases de campos, formatos paralelos, leitura dupla, adapters de
  transição ou schemas substituídos no estado final.
- Não são criadas migrations, rotinas de adoção ou conversores persistentes.
- Nenhuma classificação de vida é inferida do nome ou do caminho de uma pasta.
- Não são criados termos `unknown`, `other`, `pending` ou equivalentes para
  satisfazer cardinalidade artificialmente.
- `system_media` e o layout de `CAS/system` permanecem inalterados; a identidade
  proprietária dessas mídias usa `life`.

## 1. Modelo Conceitual

### 1.1 Taxonomia Da Vida

O objeto taxonômico possui dez posições nomeadas. Uma entidade de espécie usa:

```json
{
  "taxonomy": {
    "domain": "eukaryota",
    "kingdom": "animalia",
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
| `domain` | ID da entidade de domínio biológico | exatamente 1 |
| `kingdom` | ID da entidade de reino biológico | 0 ou 1 |
| `phylum` | ID da entidade de filo biológico | 0 ou 1 |
| `class` | ID da entidade de classe biológica | 0 ou 1 |
| `order` | ID da entidade de ordem biológica | 0 ou 1 |
| `family` | ID da entidade de família biológica | 0 ou 1 |
| `genus` | ID da entidade de gênero biológico | 0 ou 1 |
| `species` | ID da entidade de espécie | 0 ou 1 |
| `breed` | ID da entidade de raça base | 0 ou 1 |
| `variety` | ID da entidade de variedade | 0 ou 1 |

`domain` é a raiz e nunca é nulo. As demais posições aceitam `null` somente
depois da posição da própria entidade. Não existem lacunas entre posições não
nulas.

`LifeEntity` descreve identidade e conhecimento biológico, sem fixar o papel do
organismo. A condição de paciente, hospedeiro, vetor, organismo etiológico ou
outro papel clínico pertence ao contrato do domínio que referencia seu `id`, não
à taxonomia.

| Entidade | Última posição não nula | Posições inferiores |
| --- | --- | --- |
| domínio | `domain = id` | `kingdom` até `variety = null` |
| reino | `kingdom = id` | `phylum` até `variety = null` |
| filo | `phylum = id` | `class` até `variety = null` |
| classe | `class = id` | `order` até `variety = null` |
| ordem | `order = id` | `family` até `variety = null` |
| família | `family = id` | `genus` até `variety = null` |
| gênero | `genus = id` | `species` até `variety = null` |
| espécie | `species = id` | `breed` e `variety = null` |
| raça | `breed = id` | `variety = null` |
| variedade | `variety = id` | nenhuma |

Uma entidade de domínio usa seu próprio `id` em `taxonomy.domain` e deixa as nove
posições inferiores nulas. Uma entidade de reino referencia o domínio, usa seu
próprio `id` em `taxonomy.kingdom` e deixa as oito posições inferiores nulas. O
mesmo padrão se aplica sucessivamente a filo, classe, ordem, família, gênero e
espécie.

Uma raça base referencia a cadeia completa até espécie, usa seu próprio `id` em
`taxonomy.breed` e declara `taxonomy.variety = null`. Uma variedade referencia a
cadeia completa até raça e usa seu próprio `id` em `taxonomy.variety`. Ramos para
os quais raça ou variedade não se aplicam encerram sua cadeia no último nível
biológico pertinente.

### 1.2 Classificações Da Vida

O objeto classificatório reúne origem, porte e métricas corporais:

```json
{
  "classifications": {
    "originPlaceIds": ["fr"],
    "bodyMetrics": {
      "size": "medium",
      "stageMetrics": {
        "periodUnit": "months",
        "male": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 8]
            },
            "measure": {
              "height": [15, 30],
              "length": [20, 45]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [3, 20]
            },
            "measure": {
              "height": [24, 55],
              "length": [35, 75]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 32]
            },
            "measure": {
              "height": [24, 60],
              "length": [35, 85]
            }
          }
        },
        "female": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 7]
            },
            "measure": {
              "height": [15, 28],
              "length": [20, 42]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [3, 18]
            },
            "measure": {
              "height": [24, 52],
              "length": [35, 70]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 28]
            },
            "measure": {
              "height": [24, 56],
              "length": [35, 80]
            }
          }
        }
      }
    }
  }
}
```

`classifications` não aceita propriedades adicionais. O objeto pode ser omitido
e, quando presente, contém ao menos um campo conhecido. Cada classificação é
independente.

`bodyMetrics`, quando presente, aceita somente `size` e `stageMetrics` e contém
ao menos um deles. `size` é geral para a entidade, não varia por sexo ou estágio
e resolve zero ou um termo de `life:size`.

`stageMetrics`, quando presente, usa `periodUnit` com um dos valores `minutes`, `hours`,
`days`, `weeks`, `months` ou `years` e exige os perfis `male` e `female`. Cada
perfil possui exatamente `newborn` (neonato), `young` (jovem) e `adult`
(adulto). Cada estágio exige `period` e ao menos um entre `weight` e `measure`:

- `period`: intervalo etário na unidade declarada;
- `weight.live`: intervalo do peso vivo total em quilogramas;
- `measure.height`: intervalo de altura corporal em centímetros;
- `measure.length`: intervalo de comprimento corporal em centímetros.

`weight`, quando presente, aceita somente `live`. `measure`, quando presente,
aceita somente `height` e `length` e contém ao menos uma dessas chaves.

Os períodos de cada sexo formam uma sequência contínua:

```text
newborn     [null, x]
young  [x, y]
adult     [y, null]
```

O limite inferior é inclusivo e o superior é exclusivo. `null` no início
representa o nascimento; `null` no fim representa ausência de limite etário
superior. Os limites `x` e `y` podem variar entre macho e fêmea, são finitos e
obedecem `0 < x < y`. Cada intervalo de `weight` ou `measure` contém
`[min, max]`, com valores finitos, positivos e `min <= max`. Os intervalos de
peso e medida não precisam ser contíguos entre estágios.

Quando somente o porte geral está disponível, `bodyMetrics` contém apenas
`size`. Quando o recorte por macho e fêmea não se aplica ao organismo, ou quando
as métricas por estágio não estão disponíveis, omitir `stageMetrics`. Quando
nenhuma das duas partes está disponível, omitir `bodyMetrics`. Não criar perfil
neutro, sexo genérico ou valores artificiais para preencher o contrato.

Cada nível mantém classificações próprias e opcionais. Isso permite representar
dados pertinentes ao táxon sem transformar porte em nível taxonômico.
Classificações não são herdadas automaticamente entre entidades; todo valor
disponível é explícito.

### 1.3 Vocabulários Canônicos

Manter uma taxonomia classificatória do domínio `life`:

| Domínio | Propósito | `LifeEntity` |
| --- | --- | --- |
| `life` | `size` | `ZeroOrOne` |

Os dez níveis taxonômicos pertencem à identidade das entidades de vida e não
duplicam seus nomes localizados em agregados de termos. Somente porte resolve um
termo do vocabulário classificatório, sempre de forma opcional e somente quando
for semanticamente aplicável ao organismo.

O conjunto canônico possui 13 taxonomias: as 12 taxonomias de catálogo e a
taxonomia classificatória de porte. Ela possui cardinalidade `ZeroOrOne` nos dez
níveis taxonômicos.

## 2. Organização De `data/knowledge/life`

`data/knowledge/life/taxonomies` contém somente os vocabulários compartilhados
referenciados pelas entidades. Os itens ficam em diretórios nomeados na
ordem taxonômica para facilitar a navegação editorial.

Não criar diretórios genéricos `domains/`, `kingdoms/`, `phyla/`, `classes/`,
`orders/`, `families/`, `genera/`, `species/`, `breeds/` ou `varieties/` na
árvore de itens.

```text
data/knowledge/life/
├── taxonomies/
│   └── sizes/
│       └── entity.json
└── eukaryota/
    ├── entity.json
    └── animalia/
        ├── entity.json
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

`eukaryota/entity.json` descreve o domínio, `animalia/entity.json` o reino,
`chordata/entity.json` o filo, `mammalia/entity.json` a classe e
`carnivora/entity.json` a ordem, `canidae/entity.json` a família e
`canis/entity.json` o gênero.
`canis-lupus-familiaris/entity.json` descreve a espécie,
`poodle/entity.json` a raça e `toy/entity.json` a variedade. Cada manifesto
declara sua identidade e sua cadeia ancestral completa; o caminho apenas reúne
editorialmente a mesma hierarquia.

Qualquer um dos dez níveis pode manter `content/`, `media/`, `sections` e os
demais campos comuns de `LifeEntity`. A árvore omite parte desses diretórios
somente para permanecer legível.

O scanner descobre recursivamente todos os `entity.json`. O conteúdo do
manifesto determina se o arquivo é uma taxonomia compartilhada ou uma entidade
de vida. O caminho não participa dessa decisão.

Mover um item para outro diretório sem alterar seu manifesto não muda seu digest
lógico nem os artefatos compilados.

## 3. Contrato De Autoria

### 3.1 Entidade De Vida Única

Usar um `LifeEntity` fechado:

```rust
pub struct LifeTaxonomy {
    pub domain: String,
    pub kingdom: Option<String>,
    pub phylum: Option<String>,
    pub class: Option<String>,
    pub order: Option<String>,
    pub family: Option<String>,
    pub genus: Option<String>,
    pub species: Option<String>,
    pub breed: Option<String>,
    pub variety: Option<String>,
}

pub struct LifeClassifications {
    pub origin_place_ids: Option<Vec<String>>,
    pub body_metrics: Option<LifeBodyMetrics>,
}

pub enum LifePeriodUnit {
    Minutes,
    Hours,
    Days,
    Weeks,
    Months,
    Years,
}

pub struct LifeWeightMetrics {
    pub live: [f64; 2],
}

pub struct LifeMeasures {
    pub height: Option<[f64; 2]>,
    pub length: Option<[f64; 2]>,
}

pub struct LifeBodyMetricStage {
    pub period: [Option<f64>; 2],
    pub weight: Option<LifeWeightMetrics>,
    pub measure: Option<LifeMeasures>,
}

pub struct LifeSexBodyMetrics {
    pub newborn: LifeBodyMetricStage,
    pub young: LifeBodyMetricStage,
    pub adult: LifeBodyMetricStage,
}

pub struct LifeStageMetrics {
    pub period_unit: LifePeriodUnit,
    pub male: LifeSexBodyMetrics,
    pub female: LifeSexBodyMetrics,
}

pub struct LifeBodyMetrics {
    pub size: Option<String>,
    pub stage_metrics: Option<LifeStageMetrics>,
}

pub struct LifeEntity {
    pub schema_version: u32,
    pub id: String,
    pub taxonomy: LifeTaxonomy,
    pub classifications: Option<LifeClassifications>,
    pub localized_content: LocalizedContent,
    pub sections: Vec<SectionDeclaration>,
    pub content_path: Option<String>,
    pub media: Option<StructuralMedia>,
}
```

`LifePeriodUnit` serializa exclusivamente como `minutes`, `hours`, `days`, `weeks`, `months`
ou `years`. Os campos Rust usam `snake_case`, enquanto o contrato JSON usa
`camelCase`, incluindo `stageMetrics` e `periodUnit`.

No Rust, o campo JSON `class` pode usar um identificador interno como
`class_id` com `#[serde(rename = "class")]`. O contrato JSON continua usando
somente `domain`, `kingdom`, `phylum`, `class`, `order`, `family`, `genus`,
`species`, `breed` e `variety`.

`CanonicalEntity` possui `Life(LifeEntity)` e retorna `life` em
`entity_type()`.

### 3.2 Schema Da Entidade

Criar `schemas/source/life.schema.json` como schema fechado. Remover
`schemas/source/breed.schema.json` e sua inclusão no fingerprint.

O JSON Schema usa `oneOf` para fechar os shapes dos dez níveis. Igualdades entre
`id` e campos de `taxonomy`, bem como a resolução das referências entre
entidades, pertencem à validação semântica Rust.

Regras exatas:

- `entityType` é `life`;
- `taxonomy` exige `domain`, `kingdom`, `phylum`, `class`, `order`, `family`,
  `genus`, `species`, `breed` e `variety`;
- `domain` é uma chave não vazia;
- `kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`, `breed` e
  `variety` aceitam chave não vazia ou `null`;
- as posições não nulas formam um prefixo contínuo iniciado por `domain`;
- o `id` da entidade é igual à última posição não nula;
- cada posição ancestral resolve um `LifeEntity` cujo `id` ocupa essa mesma
  posição e cujas posições inferiores são nulas;
- `classifications` é opcional e aceita somente `originPlaceIds` e
  `bodyMetrics`;
- quando presente, `classifications` possui ao menos um campo;
- cada campo de `classifications` é opcional e independente nos dez níveis;
- `classifications.originPlaceIds`, quando presente, é um array não vazio,
  ordenado e sem duplicatas;
- `classifications.bodyMetrics`, quando presente, aceita somente `size` e
  `stageMetrics` e contém ao menos um deles;
- `classifications.bodyMetrics.size`, quando presente, é uma chave não vazia que
  resolve um termo de `life:size`;
- `classifications.bodyMetrics.stageMetrics`, quando presente, exige
  `periodUnit`, `male` e `female`, sem propriedades adicionais;
- `periodUnit` aceita somente `minutes`, `hours`, `days`, `weeks`, `months` ou `years`;
- cada perfil sexual exige exatamente `newborn`, `young` e `adult`;
- cada estágio exige `period`, aceita somente `weight` e `measure` como campos
  adicionais e contém ao menos um desses dois objetos;
- `weight`, quando presente, exige somente `live`;
- `measure`, quando presente, aceita somente `height` e `length` e
  contém ao menos uma dessas chaves;
- os períodos seguem `[null, x]`, `[x, y]` e `[y, null]`, sem lacunas ou
  sobreposições, com `0 < x < y` em cada perfil sexual;
- cada intervalo de `weight` ou `measure` possui dois números finitos e
  positivos em ordem não decrescente;
- classificações textuais presentes são chaves não vazias;
- os demais campos conservam os contratos estruturais de conteúdo, medidas,
  origem e mídia já usados pelo builder.

Manter `schemaVersion: 1` como versão vigente do schema de autoria. Não aceitar
`entityType: breed`, `species` como array nem os campos classificatórios fora dos
objetos fechados. `originPlaceIds` e `bodyMetrics` não existem no nível raiz de
`LifeEntity`, e `size` existe somente dentro de `bodyMetrics`.

### 3.3 Exemplo De Espécie

```json
{
  "schemaVersion": 1,
  "entityType": "life",
  "id": "canis-lupus-familiaris",
  "taxonomy": {
    "domain": "eukaryota",
    "kingdom": "animalia",
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
    "bodyMetrics": {
      "size": "species-size-example",
      "stageMetrics": {
        "periodUnit": "months",
        "male": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 20]
            },
            "measure": {
              "height": [10, 55],
              "length": [15, 80]
            }
          },
          "young": {
            "period": [1, 18],
            "weight": {
              "live": [5, 50]
            },
            "measure": {
              "height": [20, 90],
              "length": [30, 140]
            }
          },
          "adult": {
            "period": [18, null],
            "weight": {
              "live": [2, 100]
            },
            "measure": {
              "height": [15, 100],
              "length": [25, 160]
            }
          }
        },
        "female": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 18]
            },
            "measure": {
              "height": [10, 50],
              "length": [15, 75]
            }
          },
          "young": {
            "period": [1, 18],
            "weight": {
              "live": [5, 45]
            },
            "measure": {
              "height": [20, 85],
              "length": [30, 130]
            }
          },
          "adult": {
            "period": [18, null],
            "weight": {
              "live": [2, 90]
            },
            "measure": {
              "height": [15, 95],
              "length": [25, 150]
            }
          }
        }
      }
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
amplitude geral. Quando um ser vivo não possui raça definida, esta é a referência
de conhecimento utilizada pelo runtime.

As classificações e medidas do exemplo demonstram somente o shape. A autoria
define os termos e valores canônicos usados na implementação.

### 3.4 Exemplo De Raça Base

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
    "bodyMetrics": {
      "size": "medium",
      "stageMetrics": {
        "periodUnit": "months",
        "male": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 8]
            },
            "measure": {
              "height": [15, 30],
              "length": [20, 45]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [3, 20]
            },
            "measure": {
              "height": [24, 55],
              "length": [35, 75]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 32]
            },
            "measure": {
              "height": [24, 60],
              "length": [35, 85]
            }
          }
        },
        "female": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [1, 7]
            },
            "measure": {
              "height": [15, 28],
              "length": [20, 42]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [3, 18]
            },
            "measure": {
              "height": [24, 52],
              "length": [35, 70]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 28]
            },
            "measure": {
              "height": [24, 56],
              "length": [35, 80]
            }
          }
        }
      }
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
  "entityType": "life",
  "id": "poodle-toy",
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
    "variety": "poodle-toy"
  },
  "classifications": {
    "originPlaceIds": ["fr"],
    "bodyMetrics": {
      "size": "small",
      "stageMetrics": {
        "periodUnit": "months",
        "male": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [0.5, 2]
            },
            "measure": {
              "height": [8, 18],
              "length": [12, 28]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [1.5, 3.5]
            },
            "measure": {
              "height": [16, 26],
              "length": [24, 38]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 4]
            },
            "measure": {
              "height": [24, 28],
              "length": [35, 40]
            }
          }
        },
        "female": {
          "newborn": {
            "period": [null, 1],
            "weight": {
              "live": [0.5, 2]
            },
            "measure": {
              "height": [8, 18],
              "length": [12, 28]
            }
          },
          "young": {
            "period": [1, 12],
            "weight": {
              "live": [1.5, 3.5]
            },
            "measure": {
              "height": [16, 26],
              "length": [24, 38]
            }
          },
          "adult": {
            "period": [12, null],
            "weight": {
              "live": [3, 4]
            },
            "measure": {
              "height": [24, 28],
              "length": [35, 40]
            }
          }
        }
      }
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
variedade existe somente quando há um `LifeEntity` explícito para ela.

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
life:size
```

Cada agregado segue o contrato universal de `TaxonomyEntity`: termos ordenados,
labels localizados e aliases próprios. Os termos são planos dentro de seu
vocabulário. Os dez níveis taxonômicos obtêm nome, aliases e conteúdo de seus
próprios `LifeEntity`. Suas relações são validadas a partir dos objetos
`taxonomy`, não por `parentKey`.

Manter `CANONICAL_TAXONOMIES` com 13 entradas. Substituir `breed:size` por
`life:size`; o domínio `breed` deixa de existir no registro taxonômico.

Adicionar `TaxonomyCardinality::ZeroOrOne` ao contrato central. Sua validação
genérica aceita ausência ou um único termo e recusa multiplicidade. A validação
de vida aplica essa cardinalidade ao porte.

O contrato de projeção exige uma cadeia válida de `LifeEntity` até o nível de
cada item e projeta somente as classificações presentes. Identidade taxonômica,
porte e métricas corporais por estágio ocupam colunas próprias de
`life_reference_items`, enquanto origens usam `life_origin_places`; não criar
relações duplicadas em `entity_taxonomy_terms`.

`taxonomy_registry` e `taxonomy_terms` armazenam o vocabulário `life:size`.
`LifeEntity.classifications.bodyMetrics.size` é projetado exclusivamente em
`life_reference_items.size_term_key`. A validação de vida resolve o termo,
garante `ZeroOrOne` e não produz uma row de `entity_taxonomy_terms`.

O validador universal continua responsável pela completude do registro e dos
termos canônicos. A associação de porte de `LifeEntity` pertence à fronteira de
classificações de vida. No schema final, `entity_taxonomy_terms` aceita somente
`manufacturer`, `active_ingredient`, `condition` e `product`; não aceita `life`
nem `breed`.

## 5. Aplicabilidade Taxonômica De Produtos E Protocolos

Nos schemas e tipos de `ProductEntity` e `TreatmentProtocolEntity`:

- remover `species`;
- adicionar `applicableTaxonIds` como array não vazio, ordenado e sem
  duplicatas;
- exigir que cada ID resolva um `LifeEntity` de qualquer um dos dez níveis;
- recusar a presença simultânea de um ancestral e de qualquer descendente seu no
  mesmo array;
- conservar `targetSpeciesWarnings` como conteúdo clínico localizado; ele não é
  identidade taxonômica nem fonte de aplicabilidade.

Cada ID declarado aplica o produto ou protocolo à própria entidade referenciada
e a todos os seus descendentes. Assim, um alvo de classe alcança suas ordens,
famílias, gêneros, espécies, raças e variedades; uma espécie alcança suas raças e
variedades; uma raça alcança suas variedades; uma variedade alcança somente a si
mesma.

Converter `canine` e `feline` para os IDs das respectivas entidades de espécie.
Não manter os dois campos no mesmo manifesto. A aplicabilidade é resolvida
somente pela cadeia explícita de `LifeEntity`; o caminho editorial não participa
da expansão para descendentes.

O digest lógico e a contagem de relações incluem cada referência de
`applicableTaxonIds`.

## 6. Validação Semântica

Criar uma fronteira própria de validação de vida, por exemplo:

```text
validation/life/
├── mod.rs
├── taxonomy.rs
├── classifications.rs
└── applicability.rs
```

Validar antes da construção do `ProjectionContract`:

- ID global duplicado;
- shape inválido de `taxonomy` ou `classifications` presente;
- objeto `classifications` presente sem nenhum campo;
- posição taxonômica vazia entre duas posições não nulas;
- posição inferior à própria entidade preenchida;
- `id` diferente da última posição taxonômica não nula;
- entidade taxonômica referenciada inexistente ou pertencente a outro nível;
- cadeia ancestral divergente da cadeia declarada pela entidade imediatamente
  superior;
- ciclo ou autorreferência fora da posição da própria entidade;
- `bodyMetrics` vazio ou com campo diferente de `size` e `stageMetrics`;
- porte inexistente ou pertencente a vocabulário diferente de `life:size`;
- `stageMetrics` sem unidade, sexo ou algum dos três estágios;
- unidade de período diferente de `minutes`, `hours`, `days`, `weeks`, `months` ou `years`;
- estágio corporal sem `period`, sem `weight` e `measure`, ou com propriedades
  adicionais;
- `weight` sem `live` ou com chave adicional;
- `measure` vazio ou com chave diferente de `height` e `length`;
- período etário com limite negativo, não finito, invertido, lacuna ou
  sobreposição;
- perfil etário que não siga `[null, x]`, `[x, y]` e `[y, null]`;
- intervalo de peso ou medida com valor não finito, não positivo ou `min > max`;
- origem geográfica declarada e inexistente;
- produto ou protocolo com táxon inexistente;
- array de aplicabilidade vazio ou duplicado;
- array de aplicabilidade contendo ancestral e descendente redundantes;
- Markdown, mídia ou conteúdo localizado fora dos contratos existentes.

Remover `validate_species` e todas as allowlists `canine | feline`. A validação
usa somente termos resolvidos e relações explícitas dos manifestos.

A validação resolve cada posição não nula como `LifeEntity` e compara o prefixo
taxonômico completo dessa entidade. Assim, cada nível possui exatamente uma
ascendência e toda a cadeia converge para o mesmo domínio. As relações são
derivadas de `taxonomy`; não existe `parentKey` paralelo.

O caminho do arquivo não participa dessas decisões. Adicionar teste que mova um
item válido para outro caminho editorial e exija o mesmo digest lógico.

## 7. DDL De `system`

A tabela de referência de vida é:

```sql
CREATE TABLE life_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    domain_id TEXT NOT NULL CHECK(length(trim(domain_id)) > 0),
    kingdom_id TEXT CHECK(kingdom_id IS NULL OR length(trim(kingdom_id)) > 0),
    phylum_id TEXT CHECK(phylum_id IS NULL OR length(trim(phylum_id)) > 0),
    class_id TEXT CHECK(class_id IS NULL OR length(trim(class_id)) > 0),
    order_id TEXT CHECK(order_id IS NULL OR length(trim(order_id)) > 0),
    family_id TEXT CHECK(family_id IS NULL OR length(trim(family_id)) > 0),
    genus_id TEXT CHECK(genus_id IS NULL OR length(trim(genus_id)) > 0),
    species_id TEXT CHECK(species_id IS NULL OR length(trim(species_id)) > 0),
    breed_id TEXT CHECK(breed_id IS NULL OR length(trim(breed_id)) > 0),
    variety_id TEXT CHECK(variety_id IS NULL OR length(trim(variety_id)) > 0),
    size_term_key TEXT
        CHECK(size_term_key IS NULL OR length(trim(size_term_key)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL
        CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    stage_metrics_json TEXT
        CHECK(
            stage_metrics_json IS NULL
            OR (
                json_valid(stage_metrics_json)
                AND json_type(stage_metrics_json) = 'object'
            )
        ),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    FOREIGN KEY(domain_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(kingdom_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(phylum_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(class_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(order_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(family_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(genus_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(species_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(breed_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    FOREIGN KEY(variety_id)
        REFERENCES life_reference_items(id) ON DELETE RESTRICT,
    CHECK(kingdom_id IS NOT NULL OR phylum_id IS NULL),
    CHECK(phylum_id IS NOT NULL OR class_id IS NULL),
    CHECK(class_id IS NOT NULL OR order_id IS NULL),
    CHECK(order_id IS NOT NULL OR family_id IS NULL),
    CHECK(family_id IS NOT NULL OR genus_id IS NULL),
    CHECK(genus_id IS NOT NULL OR species_id IS NULL),
    CHECK(species_id IS NOT NULL OR breed_id IS NULL),
    CHECK(breed_id IS NOT NULL OR variety_id IS NULL),
    CHECK(
        CASE
            WHEN kingdom_id IS NULL THEN id = domain_id
            WHEN phylum_id IS NULL THEN id = kingdom_id
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

CREATE INDEX idx_life_taxonomy
ON life_reference_items(
    domain_id,
    kingdom_id,
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

CREATE INDEX idx_life_kingdom_items
ON life_reference_items(kingdom_id, phylum_id, class_id, normalized_name, id);

CREATE INDEX idx_life_phylum_items
ON life_reference_items(phylum_id, class_id, order_id, normalized_name, id);

CREATE INDEX idx_life_class_items
ON life_reference_items(class_id, order_id, family_id, normalized_name, id);

CREATE INDEX idx_life_order_items
ON life_reference_items(order_id, family_id, genus_id, normalized_name, id);

CREATE INDEX idx_life_family_items
ON life_reference_items(family_id, genus_id, species_id, normalized_name, id);

CREATE INDEX idx_life_genus_items
ON life_reference_items(genus_id, species_id, breed_id, normalized_name, id);

CREATE INDEX idx_life_species_items
ON life_reference_items(species_id, breed_id, variety_id, normalized_name, id);

CREATE INDEX idx_life_breed_items
ON life_reference_items(breed_id, variety_id, normalized_name, id);

CREATE INDEX idx_life_size
ON life_reference_items(size_term_key, id);
```

Os campos taxonômicos e classificatórios são colunas explícitas para leitura,
filtro e indexação. O builder e o verificador garantem o nível de cada ID
taxonômico e o vocabulário de cada classificação; não armazenar o mesmo contrato
em um segundo JSON.
Todas as colunas classificatórias aceitam `NULL` independentemente e nenhuma
constraint exige coocorrência entre elas.

Na projeção, `bodyMetrics.size` ocupa `size_term_key` e
`bodyMetrics.stageMetrics` ocupa `stage_metrics_json`. O JSON persistido é o
próprio valor de `stageMetrics`, com `periodUnit`, `male` e `female` na raiz, sem
repetir o porte nem o wrapper `bodyMetrics`. Quando somente `size` está presente,
`stage_metrics_json` é `NULL`; quando somente `stageMetrics` está presente,
`size_term_key` é `NULL`.

Persistir `life_reference_items` em ordem topológica estável: domínio, reino,
filo, classe, ordem, família, gênero, espécie, raça e variedade; dentro de cada
nível, ordenar por `id`. As foreign keys permanecem habilitadas durante toda a
escrita.

A relação de origens é:

```sql
CREATE TABLE life_origin_places (
    life_id TEXT NOT NULL,
    place_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(life_id, place_id),
    UNIQUE(life_id, sort_order),
    FOREIGN KEY(life_id)
        REFERENCES life_reference_items(id) ON DELETE CASCADE,
    FOREIGN KEY(place_id)
        REFERENCES geo_places(id) ON DELETE RESTRICT
);
```

Uma entidade sem `classifications.originPlaceIds` produz zero rows em
`life_origin_places`. A ausência é válida nos dez níveis.

Renomear `species_json` de `product_catalog_items` e `treatment_protocols` para
`applicable_taxon_ids_json`. As duas colunas usam o contrato:

```sql
applicable_taxon_ids_json TEXT NOT NULL
    CHECK(
        json_valid(applicable_taxon_ids_json)
        AND json_type(applicable_taxon_ids_json) = 'array'
        AND json_array_length(applicable_taxon_ids_json) > 0
    )
```

O JSON contém um array ordenado de IDs válidos de `LifeEntity`. Unicidade,
resolução dos dez níveis e ausência de redundância entre ancestral e descendente
pertencem à validação semântica e são relidas pelo verificador.

`entity_search_terms` e `entity_media_references` aceitam `life` como tipo de
entidade. `entity_taxonomy_terms` continua reservado às entidades cujas
classificações são relações N:N; a taxonomia de vida usa as colunas fechadas de
`life_reference_items` e não entra nessa tabela. Retirar `breed` do `CHECK` de
`entity_taxonomy_terms` e não adicionar `life`.

O schema final permanece com 18 tabelas em `system`: 2 de metadata e 16
projetáveis. `system_media` permanece com 3 tabelas.

## 8. Rows E Contratos De Persistência

Atualizar o modelo fechado para conter:

```rust
SystemRow::Life { /* todas as colunas de life_reference_items */ }
SystemRow::LifeOrigin { life_id, place_id, sort_order }
```

Adicionar as identidades tipadas necessárias para os campos de taxonomia,
classificação e aplicabilidade taxonômica.

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

Projetar cada `LifeEntity` em:

- uma row de `life_reference_items` por locale;
- zero ou mais origens em `life_origin_places`;
- termos de busca localizados;
- referências de mídia estruturais e de Markdown, quando presentes.

A identidade lógica, os source tokens e o digest da row de vida incluem
`domain`, `kingdom`, `phylum`, `class`, `order`, `family`, `genus`, `species`,
`breed` e `variety` na ordem canônica. Alterar qualquer posição modifica a
evidência e o digest projetado.

Projetar `applicableTaxonIds` diretamente nas colunas JSON de produtos e
protocolos, preservando a ordem autoral. A expansão para descendentes é uma
regra de consulta sobre `life_reference_items` e não materializa cópias dos IDs
descendentes no JSON.

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

Todas as entidades de vida entram em `entity_search_terms` com
`entity_type = 'life'`:

- nome localizado;
- aliases localizados próprios.

Não duplicar nomes, aliases ou classificações ancestrais nas rows de busca dos
descendentes. Uma busca por ancestral primeiro encontra a própria entidade pelo
seu termo localizado e, quando o fluxo solicitar expansão taxonômica, consulta
os descendentes pela coluna correspondente de `life_reference_items`. Porte e
demais classificações são filtros estruturados, não termos textuais herdados.

Usar as proveniências fechadas `entity.name` e `entity.alias`, já pertencentes ao
contrato de busca, e deduplicar valores normalizados de forma determinística:
nome primeiro, seguido pelos aliases na ordem autoral. A camada consumidora
decide se apresenta somente o táxon encontrado ou também sua subárvore; o banco
não mistura essas duas intenções em uma única row de busca.

Consultas usam diretamente as colunas indexadas de `life_reference_items`:

- domínios: `kingdom_id IS NULL`;
- reinos: `kingdom_id IS NOT NULL AND phylum_id IS NULL`;
- filos: `phylum_id IS NOT NULL AND class_id IS NULL`;
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
- filtros por porte: `size_term_key`.

Adicionar queries de prova para:

- abrir o conteúdo de qualquer um dos dez níveis;
- listar filhos diretos e todos os descendentes de qualquer nível;
- listar variedades de uma raça;
- reconstruir a taxonomia completa de um item sem consultar seu path;
- reconstruir as classificações declaradas de um item sem consultar seu path;
- encontrar entidades de vida por porte;
- encontrar produtos e protocolos aplicáveis a qualquer entidade de vida,
  comparando sua cadeia taxonômica com `applicable_taxon_ids_json`;
- encontrar os produtos e protocolos que declaram diretamente um táxon
  específico.

## 11. Mídia E CAS

Entidades dos dez níveis podem declarar `media` e imagens em Markdown. Projetar
todas com:

```text
entity_type = life
entity_id   = <id do LifeEntity>
```

Atualizar o verificador de ocorrências compiladas para resolver
`life_reference_items`. Thumbnails, hashes, deduplicação, paths CAS e regras
de segurança permanecem inalterados.

## 12. Verificação Integral

O `ArtifactVerifier` relê independentemente:

- todas as entidades de vida e suas taxonomias completas;
- todas as classificações declaradas nos dez níveis;
- toda relação de origem;
- todos os táxons aplicáveis de produtos e protocolos;
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
8. persistir `classifications` como objeto vazio;
9. remover um estágio ou sexo de `stageMetrics`;
10. criar lacuna, sobreposição ou inversão entre seus períodos etários;
11. persistir unidade, chave métrica ou intervalo de peso ou medida inválido;
12. apontar origem declarada para local inexistente;
13. apontar produto ou protocolo para táxon inexistente;
14. declarar ancestral e descendente redundantes no mesmo array de
    aplicabilidade;
15. alterar a ordem dos táxons aplicáveis;
16. materializar termos ancestrais como termos próprios de busca;
17. reintroduzir `species_json` ou tabela especializada de raças.

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
e rows com o contrato de vida. O digest sobe para 2 porque sua identidade lógica
passa a conter taxonomia, classificações e aplicabilidade taxonômica.

Elevar `knowledge-builder` de `0.3.1` para `0.4.0`, atualizar `Cargo.lock` e
emitir `builderVersion: 0.4.0`. A API pública de fonte expõe `LifeEntity`.

Não alterar application ID de `system` ou `system_media`.

## 14. Fixtures E Testes

Atualizar `fixtures/valid-minimal` para conter:

- as 13 taxonomias canônicas;
- um termo de porte;
- uma entidade sem `classifications`;
- uma entidade com parte das classificações válidas;
- uma entidade com todas as classificações preenchidas;
- uma entidade com `bodyMetrics.size`, mas sem `stageMetrics`;
- uma entidade com `bodyMetrics.stageMetrics`, mas sem `size`;
- um `stageMetrics` completo, com limites etários diferentes entre macho e
  fêmea e com peso vivo, altura e comprimento;
- uma cadeia completa com uma entidade em cada um dos dez níveis, distribuindo
  entre elas os casos de classificação;
- produtos e protocolos com alvos válidos em níveis taxonômicos diferentes;
- origem, conteúdo localizado, busca e mídia mínima quando aplicável.

Cobrir unitariamente:

- shape de `taxonomy` e `classifications`;
- identidade dos dez níveis;
- prefixo taxonômico contínuo e posições inferiores nulas;
- resolução e consistência integral da cadeia ancestral;
- ausência integral de `classifications` em qualquer um dos dez níveis;
- presença independente de origem e `bodyMetrics`;
- objeto `classifications` não vazio quando presente;
- `bodyMetrics` não vazio, com presença independente de `size` e `stageMetrics`;
- `stageMetrics` completo para macho e fêmea, com `newborn`, `young` e `adult`;
- unidades de período aceitas e recusa de unidades desconhecidas;
- períodos `[null, x]`, `[x, y]` e `[y, null]` contínuos em cada sexo;
- limites etários finitos e crescentes e intervalos de peso e medida positivos e
  ordenados;
- objetos `weight` e `measure` fechados, com recusa de chaves métricas
  desconhecidas;
- limites etários independentes entre macho e fêmea;
- cada classificação declarada resolvida no propósito correto;
- separação entre taxonomia e classificação;
- cada descendente repetindo toda a taxonomia superior, com classificações
  próprias e opcionais;
- aplicabilidade pelos dez níveis de `LifeEntity`;
- alcance de cada alvo à própria entidade e a seus descendentes;
- recusa de ancestral e descendente redundantes no mesmo array;
- busca projetando somente nome e aliases próprios e expandindo ancestralidade
  pelas colunas taxonômicas;
- independência entre caminho editorial e digest;
- SQL, bindings, readers e identidade de cada row;
- alinhamento Rust, JSON Schemas, DDL e relatório;
- `LifeEntity` como contrato único da hierarquia, sem `species_json` ou tabelas
  especializadas de raça.

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
  manifestos e o contrato completo de `LifeEntity`;
- `data/knowledge/inventory.json` com `life`, contagens dos dez níveis,
  classificações e aplicabilidade taxonômica;
- `data/knowledge/audit-report.json` com as novas contagens verificadas;
- `tools/knowledge-builder/README.md` com 18 tabelas de `system`, 13 taxonomias,
  classificação de vida, aplicabilidade e queries;
- mapas Mermaid de tabelas, projeção e validação;
- schemas públicos e exemplos executáveis afetados.

A documentação descreve somente o contrato vigente. Não incluir equivalências
com nomes de campos, tabelas ou diretórios removidos.

## 16. Sequência De Implementação

1. Executar o gate inicial e registrar o estado verde.
2. Criar a taxonomia classificatória de porte e fechar seus termos canônicos.
3. Reorganizar a árvore editorial mantendo manifestos somente para itens de
   conhecimento reais.
4. Criar ou adaptar as entidades dos dez níveis e suas cadeias ancestrais.
5. Preservar em cada entidade somente as classificações disponíveis.
6. Ordenar a projeção de vida de domínio até variedade.
7. Converter produtos e protocolos para `applicableTaxonIds`.
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
- inventar ou pesquisar automaticamente classificações de vida;
- transformar porte, cor ou pelagem em variedade sem entidade explícita;
- alterar `system_media`, thumbnails ou layout CAS;
- alterar bancos ou CAS do ramo `user`;
- criar migrations, conversores permanentes ou compatibilidade com contratos
  substituídos.

## Critérios De Aceite

- Existe um único `LifeEntity` para cada domínio, reino, filo, classe, ordem,
  família, gênero, espécie, raça ou variedade referenciada.
- Cada entidade contém `taxonomy` completa e pode omitir `classifications` ou
  qualquer campo interno.
- A taxonomia completa segue `domain`, `kingdom`, `phylum`, `class`, `order`,
  `family`, `genus`, `species`, `breed` e `variety`.
- Cada posição não nula resolve um `LifeEntity` do nível correspondente.
- As posições não nulas formam um prefixo contínuo, o `id` ocupa a última
  posição e todos os níveis inferiores são nulos.
- Cada entidade abaixo de domínio possui uma única cadeia ancestral completa e
  consistente.
- Origem aparece somente em `classifications`; porte e métricas corporais
  aparecem somente em `classifications.bodyMetrics` no contrato de autoria.
- `bodyMetrics`, quando presente, contém `size`, `stageMetrics` ou ambos.
- `size` é geral para a entidade e não varia por estágio ou sexo.
- `stageMetrics`, quando presente, declara `periodUnit`, os perfis `male` e
  `female` e os três estágios fechados `newborn`, `young` e `adult`.
- Os períodos de cada sexo seguem `[null, x]`, `[x, y]` e `[y, null]`, sem
  lacunas ou sobreposições, e cada estágio possui `weight`, `measure` ou ambos.
- `weight` contém somente `live`; `measure` aceita somente `height` e `length`.
- Diretórios recebem `entity.json` somente quando representam um item real de
  conhecimento, independentemente da profundidade na árvore editorial.
- O caminho não participa da identidade, taxonomia ou classificação.
- Cada entidade usa seu `id` na posição correspondente ao próprio nível.
- Entidades dos dez níveis aceitam ausência independente de origem, porte e
  métricas corporais.
- Toda classificação presente resolve no propósito correto e não é inferida de
  outra entidade.
- Todo descendente repete a cadeia completa dos ancestrais, sem obrigatoriedade
  de repetir suas classificações.
- Produtos e protocolos usam somente `applicableTaxonIds`, cujos IDs resolvem
  qualquer um dos dez níveis.
- Cada alvo de aplicabilidade alcança a própria entidade e seus descendentes,
  sem pares redundantes de ancestral e descendente no mesmo array.
- `entity_search_terms` contém somente nome e aliases próprios de cada
  `LifeEntity`; a expansão por ancestral usa as colunas taxonômicas.
- `life_reference_items` é a tabela de referência dos dez níveis.
- Não existe `species_json` em `system`.
- O schema `system` possui exatamente 18 tabelas, sendo 16 projetáveis.
- As 13 taxonomias canônicas estão presentes e são projetadas universalmente.
- Taxonomia, classificações, origens, busca, mídia e conteúdo são relidos e
  comparados exatamente pelo verificador.
- `system` usa schema 4, o relatório usa schema 5 e o crate usa versão 0.4.0.
- A build dos seis locales é determinística e integralmente verificável.
- Não permanecem schemas, tipos, rows, SQLs, fixtures ou documentação do
  contrato substituído.
- Todo dado canônico pertencente ao escopo usa exclusivamente o contrato vigente
  de `LifeEntity`; não permanecem estruturas substituídas, formatos paralelos ou
  dados não convertidos.
- O diff produzido pela execução contém somente mudanças pertencentes a esta
  parte e preserva alterações preexistentes não relacionadas.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.8.1: contratos de rows e persistência](./01b8-knowledge-builder-maintainability/01-row-persistence-contracts.md).
