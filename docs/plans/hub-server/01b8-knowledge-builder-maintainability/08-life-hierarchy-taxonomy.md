# Parte 1B.8.8: Taxonomia Hierárquica Da Vida

## Objetivo

Representar a classificação biológica em uma taxonomia canônica `life:type`,
seguindo o mesmo contrato usado pelos demais domínios:

```text
LifeEntity
├── id                         identidade própria da entidade
├── typeTermKey                referência ao termo de life:type
├── localizedContent.aliases   aliases próprios da entidade
├── classifications
├── sections
└── media
          |
          | typeTermKey
          v
life:type
└── terms[] / children[]
    ├── key                    identidade do termo taxonômico
    ├── localizedContent.label nome localizado do táxon
    └── children               hierarquia e ordem
```

A árvore segue os dez ranks:

```text
domain -> kingdom -> phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

O termo taxonômico e a entidade são identidades distintas. `LifeEntity.id` não
é derivado da `key`, não precisa ser igual a ela e não participa da montagem da
árvore. `typeTermKey` é a única associação autoral entre uma entidade e seu
tipo taxonômico.

O nome público de um táxon pertence ao termo de `life:type`. Como todas as
taxonomias usam o campo comum `localizedContent.label`, esse `label` representa
o nome localizado no domínio de vida. Os aliases permanecem em
`LifeEntity.localizedContent.aliases`.

## Pré-Requisitos

- A
  [Parte 1B.8.7: autoria taxonômica hierárquica](./07-hierarchical-taxonomy-authoring.md)
  está concluída.
- Taxonomias usam `terms` e `children`, com `parent_term_key` e `sort_order`
  derivados pelo builder.
- Auditoria, validação, testes e build integral do `knowledge-builder` estão
  verdes antes da implementação.
- A crate `artifact-builder` não integra este escopo.

## Escopo

Esta parte altera:

- a taxonomia canônica de tipos de vida em `data/knowledge`;
- as entidades `life` e suas referências taxonômicas;
- produtos e protocolos que referenciam táxons aplicáveis;
- a fixture mínima do `knowledge-builder`;
- JSON Schemas e modelos Rust envolvidos;
- matriz, travessia, indexação e validação taxonômica;
- aplicabilidade, busca, aliases, contagens e digest lógico;
- inventário, ownership, operações e evidência de projeção;
- DDL, rows, writers, readers e verificação integral de `system`;
- auditoria canônica e documentação consumidora.

Esta parte preserva:

- os dez ranks e sua ordem;
- `bodyMetrics`, `originPlaceIds` e a taxonomia `life:size`;
- classificações, seções, documentos e mídias das entidades de vida;
- os contratos dos bancos e do CAS do ramo `user`;
- repositories, rotas e componentes dos apps;
- distribuição de artefatos pelo Hub.

## Invariantes

- Existe exatamente uma taxonomia `life:type`.
- Seu ID canônico é `life-types`.
- `terms` contém os domínios presentes na fonte.
- `children` contém exclusivamente filhos taxonômicos diretos.
- A posição em cada array define a ordem somente entre irmãos.
- A profundidade determina o rank pela ordem fechada de dez posições.
- Raízes possuem rank `domain`; a profundidade máxima é `9`, correspondente a
  `variety`.
- Um ramo pode terminar em qualquer rank.
- A fonte pode conter somente os ramos necessários ao produto.
- Cada termo possui `key` e `localizedContent.label`.
- Termos de `life:type` não possuem aliases.
- Cada `LifeEntity` possui exatamente um `typeTermKey` válido.
- `LifeEntity.id` e `typeTermKey` são identidades independentes.
- Uma entidade não declara cadeia taxonômica, pai, ancestrais ou ordem.
- Uma entidade não declara `localizedContent.name`.
- Aliases pertencem somente à entidade.
- Um termo pode existir sem uma `LifeEntity` associada.
- Cada termo pode possuir no máximo uma `LifeEntity` associada.
- A árvore não é inferida de IDs, chaves compostas, nomes ou diretórios.
- `taxonomy_terms.parent_term_key` é a única adjacency list persistida.
- A associação da entidade ao tipo usa `entity_taxonomy_terms`, como nos
  demais domínios com `typeTermKey`.

## 1. Contrato Canônico Da Fonte

### 1.1 Taxonomia `life:type`

Criar a taxonomia em:

```text
data/knowledge/life/taxonomies/types/_entity.json
```

O manifesto segue o formato comum das taxonomias:

```json
{
  "schemaVersion": 1,
  "entityType": "taxonomy",
  "id": "life-types",
  "domain": "life",
  "purpose": "type",
  "terms": [
    {
      "key": "eukaryota",
      "localizedContent": {
        "label": {
          "pt-BR": "Eucariotos",
          "pt-PT": "Eucariotas",
          "gn-PY": "Eucariota",
          "en-US": "Eukaryotes",
          "es-ES": "Eucariotas",
          "fr-FR": "Eucaryotes"
        }
      },
      "children": [
        {
          "key": "eukaryota.animalia",
          "localizedContent": {
            "label": {
              "pt-BR": "Animais",
              "pt-PT": "Animais",
              "gn-PY": "Mymba",
              "en-US": "Animals",
              "es-ES": "Animales",
              "fr-FR": "Animaux"
            }
          }
        }
      ]
    }
  ]
}
```

`localizedContent.label` é o nome canônico localizado do táxon. O contrato de
`life:type` aceita somente `label`; `aliases` e outros campos localizados são
recusados nos termos desse vocabulário.

As chaves podem expressar o namespace taxonômico completo, por exemplo:

```text
eukaryota
eukaryota.animalia
eukaryota.animalia.chordata
eukaryota.animalia.chordata.mammalia
```

Essa forma melhora a leitura autoral, mas não define a árvore. O builder trata a
`key` integral como identidade opaca e deriva pai, profundidade e ordem somente
de `terms` e `children`, conforme o contrato da Parte 1B.8.7.

O termo contém somente `key`, `localizedContent` e `children` quando possuir
descendentes.

### 1.2 `LifeEntity`

Uma entidade de vida segue este contrato:

```json
{
  "schemaVersion": 1,
  "entityType": "life",
  "id": "4a178a4e-bd91-46ce-aef6-2c4998f73f65",
  "typeTermKey": "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris.germanShepherd",
  "classifications": {
    "originPlaceIds": ["de"],
    "bodyMetrics": {
      "size": "large"
    }
  },
  "localizedContent": {
    "aliases": {
      "pt-BR": ["Pastor-alemão"],
      "pt-PT": [],
      "gn-PY": [],
      "en-US": ["Alsatian"],
      "es-ES": [],
      "fr-FR": ["Berger d'Alsace"]
    }
  },
  "sections": []
}
```

O schema exige:

- `id` próprio e estável, sem derivação da taxonomia;
- `typeTermKey` resolvendo exatamente um termo de `life:type`;
- `localizedContent` contendo somente `aliases`;
- `aliases` com os seis locales e listas possivelmente vazias;
- classificações, seções, conteúdo e mídia conforme seus contratos atuais.

O schema é fechado aos campos apresentados. O rank é propriedade da posição do
termo na árvore e é resolvido pela referência `typeTermKey`.

`LifeEntity.id` usa UUIDv4, seguindo as entidades de conteúdo do catálogo.
Nenhuma relação taxonômica é inferida do valor do UUID.

### 1.3 Cardinalidade Da Associação

A relação possui estas cardinalidades:

```text
LifeEntity     -- exatamente 1 --> life:type term
life:type term -- zero ou 1 ----> LifeEntity
```

Isso permite que a árvore contenha nós estruturais sem exigir manifestos vazios.
Uma entidade é criada somente quando o táxon possui aliases, classificações,
seções, conteúdo ou mídia próprios.

A unicidade do `typeTermKey` entre entidades `life` é validada antes da
projeção. A mesma regra é verificada no artefato final. Não permitir duas páginas
de conhecimento concorrentes para o mesmo táxon.

### 1.4 Ranks

Definir uma única enumeração Rust `LifeRank`:

```text
0  domain
1  kingdom
2  phylum
3  class
4  order
5  family
6  genus
7  species
8  breed
9  variety
```

`LifeRank` converte profundidade, nome canônico e valor de runtime. Nenhum rank
é extraído de `typeTermKey`, do ID da entidade ou do diretório.

## 2. Matriz Taxonômica

O conjunto possui onze pares canônicos:

```text
life:type
life:size
manufacturer:type
manufacturer:classification
active_ingredient:type
active_ingredient:classification
condition:type
condition:classification
product:type
product:classification
product:target
```

Aplicar os modos já existentes:

| Taxonomia | Uso |
| --- | --- |
| `life:type` | `EntityRelation(ExactlyOne)` |
| `life:size` | `DirectField(ZeroOrOne)` |
| demais tipos | `EntityRelation(ExactlyOne)` |
| classificações e alvos | `EntityRelation(ZeroOrMore)` |

A hierarquia é uma capacidade comum de toda taxonomia. O modo de uso define
somente como as entidades referenciam seus termos.

## 3. Organização De `data/knowledge`

### 3.1 Árvore De Tipos

Montar `life:type` com todos os táxons necessários para classificar as entidades
e atender às referências de produtos e protocolos. Um termo pode permanecer sem
entidade associada.

Cada nó:

1. possui uma chave integral única;
2. possui os seis nomes em `localizedContent.label`;
3. está aninhado sob seu pai taxonômico direto;
4. respeita a ordem autoral entre irmãos;
5. ocupa a profundidade correspondente ao seu rank;
6. não depende da pasta física para adquirir significado.

Não criar táxons, traduções ou relações por inferência científica. O conjunto
canônico presente é reorganizado sem completar automaticamente a árvore da
vida.

### 3.2 Entidades

Cada `_entity.json` de `life` contém:

```text
id
typeTermKey
classifications?
localizedContent.aliases
sections
contentPath?
media?
```

Os nomes localizados ficam exclusivamente nos termos de `life:type`. Os aliases
ficam exclusivamente nas entidades. Classificações e conteúdo editorial não são
movidos para a taxonomia.

Diretórios podem acompanhar a árvore para organização humana, mas não definem
`id`, `typeTermKey`, rank, pai ou ordem e não participam do digest lógico.

### 3.3 Referências De Aplicabilidade

Produtos e protocolos referenciam termos de `life:type`, não IDs de
`LifeEntity`. Usar o nome explícito:

```json
{
  "applicableTaxonTermKeys": [
    "eukaryota.animalia.chordata.mammalia.carnivora.canidae.canis.canisLupusFamiliaris"
  ]
}
```

Schemas, modelos, fonte, validação, projeção, DDL, testes e documentação usam
`applicableTaxonTermKeys`. O array aceita termos de qualquer rank.

Não expandir descendentes no JSON de autoria. A expansão é uma consulta sobre a
árvore compilada.

### 3.4 Fixture Mínima

A fixture contém:

- `life:type` com uma cadeia completa até `variety`;
- uma raiz ou ramo sem `LifeEntity` associada;
- entidades cujos UUIDs diferem de suas `typeTermKey`;
- uma entidade com aliases não vazios;
- `life:size` independente;
- produto e protocolo aplicáveis por termo taxonômico.

A fixture demonstra que a estrutura funciona sem igualdade entre ID e chave.

## 4. Validação

### 4.1 Ordem Do Pipeline

Executar:

1. descobrir e desserializar manifestos;
2. validar schemas individuais;
3. construir o índice global de entidades;
4. coletar as onze taxonomias;
5. percorrer e indexar suas árvores;
6. atribuir `LifeRank` aos termos de `life:type` por profundidade;
7. resolver `LifeEntity.typeTermKey`;
8. validar unicidade de entidade por termo;
9. validar classificações e aplicabilidades;
10. validar aliases, seções, arquivos e mídia;
11. calcular contagens e digest sobre o grafo validado.

A projeção não participa da validação da fonte.

### 4.2 Índices Validados

O índice de `life:type`, por `termKey`, fornece:

```text
termKey
parentTermKey
children
siblingOrder
depth
rank
localizedContent.label
sourcePath
associatedLifeEntityId?
```

O índice de entidades, por `LifeEntity.id`, fornece:

```text
LifeEntity
typeTermKey
resolvedTerm
resolvedRank
```

Oferecer operações para:

- obter um termo e seu rank;
- obter o tipo de uma entidade;
- obter a entidade opcional associada a um termo;
- percorrer pai, filhos, ancestrais e descendentes;
- testar ancestralidade;
- resolver o nome taxonômico por locale;
- resolver aliases próprios da entidade por locale.

### 4.3 Regras De Integridade

Recusar:

- ausência ou duplicação de `life:type`;
- ID diferente de `life-types` para esse par;
- termo sem `localizedContent.label` completo;
- aliases ou outros campos localizados em termo de `life:type`;
- `LifeEntity` sem `typeTermKey`;
- `typeTermKey` ausente em `life:type`;
- duas entidades apontando para o mesmo termo;
- nome localizado dentro de `LifeEntity`;
- cadeia taxonômica, pai, rank ou ancestrais dentro de `LifeEntity`;
- chave repetida em qualquer ramo;
- nó além de `variety`;
- `children: []`;
- aplicabilidade apontando para entidade em vez de termo;
- ancestral e descendente redundantes no mesmo
  `applicableTaxonTermKeys`.

Aceitar:

- múltiplos domínios em `terms`;
- ramos parciais válidos;
- termos sem entidade associada;
- entidades em qualquer um dos dez ranks;
- chaves simples ou compostas;
- reorganização de diretórios sem mudança lógica.

## 5. Busca E Aplicabilidade

### 5.1 Busca De Entidades

Uma `LifeEntity` produz termos de pesquisa a partir de:

- `localizedContent.label` do termo referenciado, com proveniência
  `type.label`;
- `localizedContent.aliases` da própria entidade, com proveniência
  `entity.alias`;
- demais relações pesquisáveis explicitamente previstas pelo domínio.

Não copiar o nome para a fonte da entidade e não injetar nomes de ancestrais em
seus descendentes. A busca combina fatos de owners distintos por meio da
projeção normal de relações taxonômicas.

Termos sem entidade continuam disponíveis para filtros e navegação pela
taxonomia. Eles não criam uma página de conhecimento nem uma identidade de
entidade artificial.

### 5.2 Aplicabilidade

`applicableTaxonTermKeys` resolve exclusivamente no índice de `life:type`.
Quando um produto ou protocolo aponta para um termo, sua aplicabilidade alcança:

- o próprio termo;
- todos os descendentes daquele termo.

A relação não depende da existência de `LifeEntity` nos termos envolvidos.

## 6. Projeção Relacional

### 6.1 Taxonomias

Projetar `life:type` pelo fluxo comum:

```text
taxonomy_registry
└── id      = life-types
    domain  = life
    purpose = type

taxonomy_terms
├── taxonomy_id      = life-types
├── term_key         = term.key
├── parent_term_key  = derivado de children
├── label            = term.localizedContent.label[locale]
├── normalized_label = label normalizado
├── aliases_json     = []
└── sort_order       = posição entre irmãos
```

Não preencher `taxonomy_terms.aliases_json` com aliases da entidade.

### 6.2 Associação De Tipo

Cada entidade produz uma relação em `entity_taxonomy_terms`:

```text
entity_type = life
entity_id   = LifeEntity.id
taxonomy_id = life-types
term_key    = LifeEntity.typeTermKey
sort_order  = 0
```

O contrato de `ExactlyOne` garante uma relação de tipo por entidade. Adicionar
verificação de unicidade de `(taxonomy_id, term_key)` somente para entidades
`life`, assegurando no máximo um perfil por táxon.

### 6.3 `life_reference_items`

`life_reference_items` armazena somente fatos próprios da entidade:

```sql
CREATE TABLE life_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    size_term_key TEXT
        CHECK(size_term_key IS NULL OR length(trim(size_term_key)) > 0),
    aliases_json TEXT NOT NULL
        CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    stage_metrics_json TEXT
        CHECK(stage_metrics_json IS NULL OR (
            json_valid(stage_metrics_json)
            AND json_type(stage_metrics_json) = 'object'
        )),
    content_json TEXT NOT NULL CHECK(json_valid(content_json))
);
```

Não armazenar nessa tabela:

```text
name
normalized_name
type_term_key
rank
parent_id
domain_id
kingdom_id
phylum_id
class_id
order_id
family_id
genus_id
species_id
breed_id
variety_id
```

O nome e o termo vêm do join com `entity_taxonomy_terms` e `taxonomy_terms`. O
rank vem da profundidade calculada na árvore. Isso mantém uma única fonte
persistida para cada fato.

`life:size` continua usando `size_term_key` como campo direto e
`life_origin_places` continua referenciando `LifeEntity.id`.

### 6.4 Consultas Canônicas

Definir queries compartilhadas para:

1. obter a entidade com seu termo, nome e rank;
2. obter ancestrais do termo de uma entidade;
3. obter descendentes de uma ou mais `applicableTaxonTermKeys`;
4. encontrar a entidade opcional associada a cada termo;
5. listar termos de um rank mesmo quando não possuem entidade.

Toda query filtra `taxonomy_id = 'life-types'`. A profundidade máxima de dez
níveis e os índices de adjacency list tornam a CTE recursiva suficiente. Validar
os planos com `EXPLAIN QUERY PLAN`.

### 6.5 Índices

Manter os índices de raízes e filhos definidos para `taxonomy_terms` e garantir:

```sql
CREATE INDEX idx_entity_taxonomy_life_type
ON entity_taxonomy_terms(entity_type, entity_id, taxonomy_id, term_key);

CREATE UNIQUE INDEX idx_life_type_profile
ON entity_taxonomy_terms(taxonomy_id, term_key)
WHERE entity_type = 'life' AND taxonomy_id = 'life-types';

CREATE INDEX idx_life_size
ON life_reference_items(size_term_key, id);
```

Adequar nomes e composição ao DDL final sem criar índices equivalentes
duplicados.

### 6.6 Ordem De Carga

Materializar:

1. `taxonomy_registry`;
2. `taxonomy_terms` em pré-ordem;
3. `life_reference_items`;
4. `entity_taxonomy_terms` da entidade;
5. `life_origin_places` e demais relações;
6. produtos e protocolos com aplicabilidade taxonômica.

## 7. Ownership E Evidência

O termo de `life:type` é dono de:

- `key`;
- nome localizado em `localizedContent.label`;
- relação com o pai;
- posição entre irmãos;
- profundidade e rank derivados.

`LifeEntity` é dona de:

- `id`;
- `typeTermKey` como referência;
- aliases;
- classificações;
- seções, conteúdo e mídia.

Declarar destinos independentes:

- o label do termo produz `taxonomy_terms.label`;
- `typeTermKey` produz a row de `entity_taxonomy_terms`;
- aliases produzem `life_reference_items.aliases_json` e termos de busca;
- a combinação do label referenciado com a entidade produz o termo de busca de
  nome, sem mudar o owner do label.

Nenhuma obrigação usa igualdade entre `LifeEntity.id` e `term_key`.

## 8. Digest, Contagens E Auditoria

O digest lógico inclui:

- a árvore `life:type`, suas chaves, labels, ordem e relações;
- cada `LifeEntity`, seu ID, `typeTermKey`, aliases e conteúdo próprio;
- `applicableTaxonTermKeys` de produtos e protocolos;
- schemas e contratos técnicos vigentes.

Comprovar:

- alterar um label muda o digest;
- alterar um alias muda o digest;
- alterar `typeTermKey` muda o digest;
- reordenar irmãos muda o digest;
- mover um termo muda o digest;
- mover diretórios sem alterar manifestos não muda o digest;
- dois builds da mesma fonte são idênticos.

Contar separadamente:

- termos de `life:type` por rank;
- termos com e sem entidade associada;
- relações entidade-tipo;
- relações hierárquicas;
- origens, portes e aplicabilidades.

Atualizar `scripts/audit-knowledge.mjs` para aplicar o mesmo contrato e
regenerar:

```text
data/knowledge/inventory.json
data/knowledge/audit-report.json
```

## 9. Versões Técnicas

Incrementar:

```text
SOURCE_DIGEST_SCHEMA_VERSION  3 -> 4
SYSTEM_SCHEMA_VERSION         6 -> 7
```

Manter:

```text
SOURCE_ENTITY_SCHEMA_VERSION       1
CONTENT_DOCUMENT_SCHEMA_VERSION    1
BUILD_CONTEXT_SCHEMA_VERSION       1
BUILD_RESULT_SCHEMA_VERSION        1
PROJECTION_REPORT_SCHEMA_VERSION   5
PROJECTION_EVIDENCE_SCHEMA_VERSION 1
SYSTEM_MEDIA_SCHEMA_VERSION        2
```

Atualizar metadata, fingerprints e expectativas correspondentes. Não criar
migration, conversor persistente, fallback ou leitura paralela.

## 10. Verificação Integral

Em cada banco localizado, comprovar:

- registro único `life-types`, com domínio `life` e propósito `type`;
- floresta íntegra, acíclica, alcançável e ordenada;
- labels completos e aliases vazios nos termos de `life:type`;
- exatamente uma relação de tipo para cada `LifeEntity`;
- no máximo uma entidade associada a cada termo;
- toda relação apontando para entidade e termo existentes;
- termos válidos mesmo sem entidade associada;
- aliases presentes somente em `life_reference_items`;
- ausência de nome, rank e cadeia taxonômica em `life_reference_items`;
- referências de aplicabilidade resolvendo termos de `life:type`;
- `life_origin_places` e `life:size` íntegros;
- estrutura da árvore igual nos seis locales;
- variação por locale somente em valores localizados;
- `foreign_key_check` e `integrity_check` aprovados.

Os testes de adulteração cobrem alteração de:

- pai, ordem ou label de termo;
- relação `typeTermKey`;
- associação duplicada ao mesmo termo;
- entidade, termo ou relação ausente;
- alias inserido indevidamente na taxonomia;
- nome inserido indevidamente na entidade;
- profundidade além de `variety`;
- referência de aplicabilidade inexistente;
- checksum, relatório e evidência após cada adulteração física.

## 11. Testes

### 11.1 Fonte E Schema

Cobrir:

- `life:type` completo e válido;
- termo com somente label aceito;
- termo com aliases recusado;
- `LifeEntity` com `typeTermKey` e aliases aceita;
- `LifeEntity` com nome ou cadeia taxonômica recusada;
- ID da entidade diferente da chave aceito;
- termo sem entidade aceito;
- entidade sem termo recusada;
- duas entidades para o mesmo termo recusadas;
- múltiplas raízes e ramos parciais aceitos;
- décimo rank aceito e décimo primeiro recusado;
- chave simples ou composta aceita;
- `children: []` recusado.

### 11.2 Semântica

Comprovar:

- rank derivado em cada profundidade;
- pai, filhos, ancestrais e descendentes;
- ordem reiniciada por grupo de irmãos;
- nome resolvido do termo correto;
- aliases resolvidos da entidade correta;
- busca composta por label e aliases com proveniências distintas;
- aplicabilidade em qualquer rank;
- recusa de ancestral e descendente redundantes;
- ausência de inferência por ID, chave ou pasta;
- digest sensível ao contrato e independente da organização editorial.

### 11.3 Banco

Comprovar nos seis bancos `system`:

- onze taxonomias em `taxonomy_registry`;
- termos de vida em `taxonomy_terms`;
- associações de vida em `entity_taxonomy_terms`;
- entidades em `life_reference_items` sem nome ou cadeia repetida;
- joins devolvendo nome, aliases e rank corretos;
- consultas de ancestrais e descendentes usando índices;
- produtos e protocolos alcançando o próprio termo e descendentes;
- schema técnico `7` em `system` e `2` em `system_media`;
- determinismo entre duas construções independentes.

## 12. Documentação Consumidora

Atualizar `data/knowledge/README.md` e `tools/knowledge-builder/README.md` com:

- `life:type` como taxonomia hierárquica comum;
- nomes nos labels dos termos;
- aliases nas entidades;
- associação por `typeTermKey`;
- independência entre ID da entidade e chave taxonômica;
- termos opcionais sem página de conhecimento;
- navegação e aplicabilidade por termos;
- projeção em `taxonomy_terms` e `entity_taxonomy_terms`;
- onze pares taxonômicos;
- schema técnico `7` de `system`.

Alinhar os planos posteriores:

- Parte 1B.9 recebe este contrato no adaptador;
- Parte 1C consulta nomes e hierarquia pelas tabelas taxonômicas;
- o índice do Hub descreve a associação de entidades de vida por tipo.

Toda documentação usa somente o contrato final desta parte.

## 13. Sequência De Execução

1. Executar o baseline de auditoria, validação, testes e build.
2. Registrar `life:type` na matriz canônica.
3. Adaptar schemas e modelos para `LifeEntity.typeTermKey` e aliases próprios.
4. Criar a árvore da fixture e validar IDs independentes.
5. Montar a taxonomia canônica com labels localizados.
6. Associar as entidades aos termos e atualizar aplicabilidades.
7. Adaptar índices validados, busca, contagens e digest.
8. Adaptar inventário, ownership, operações e evidência.
9. Atualizar DDL, rows, writers, readers, queries e índices.
10. Atualizar o verificador e os testes de adulteração.
11. Atualizar auditoria, inventários e documentação consumidora.
12. Executar dois builds reais e o gate geral do workspace.

O resultado aceita somente `life:type` com referências por `typeTermKey`. Não
manter uma segunda representação da hierarquia.

## 14. Validação

Executar, no mínimo:

```text
pnpm knowledge:audit
pnpm knowledge:validate
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets
cargo clippy -p knowledge-builder --all-targets -- -D warnings
cargo test -p knowledge-builder --all-targets --locked
pnpm knowledge:build
git diff --check
```

Executar uma segunda construção em diretório temporário e comparar bancos,
manifests, relatórios, checksums e o conjunto CAS com a primeira.

Depois dos testes específicos, executar a skill `$validate-workspace` como gate
geral da implementação.

## Fora De Escopo

- preencher a árvore biológica além dos dados presentes;
- acrescentar ranks, subespécies ou níveis informais;
- alterar classificações corporais ou geográficas;
- inferir conteúdo científico, traduções ou relações;
- derivar hierarquia de diretórios ou segmentos de chave;
- criar closure table, nested sets ou materialized path;
- alterar bancos ou CAS do ramo `user`;
- implementar `artifact-builder`;
- alterar apps ou publicar artefatos;
- criar migrations ou rotinas de adoção.

## Critérios De Aceite

- `life:type` usa o mesmo contrato hierárquico das demais taxonomias.
- Cada termo possui nome localizado em `localizedContent.label`.
- Termos de `life:type` não possuem aliases.
- Cada `LifeEntity` referencia exatamente um termo por `typeTermKey`.
- IDs de entidades não são usados como chaves taxonômicas.
- Aliases permanecem exclusivamente nas entidades.
- Termos sem entidade associada são válidos.
- Nenhum termo possui mais de uma entidade associada.
- A árvore vive exclusivamente em `taxonomy_terms`.
- A associação entidade-tipo vive em `entity_taxonomy_terms`.
- `life_reference_items` contém somente fatos próprios das entidades.
- Aplicabilidade referencia termos e funciona em qualquer rank.
- Busca combina label do termo e aliases da entidade sem mudar ownership.
- Auditoria, inventário, projeção e verificação cobrem todo o contrato.
- `system` usa schema técnico `7`; `system_media` permanece em `2`.
- Dois builds completos são determinísticos.
- O workspace passa pela skill `$validate-workspace`.
- O diff contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.9: `artifact-builder` e adaptador de conhecimento](../01b9-artifact-builder/README.md).
