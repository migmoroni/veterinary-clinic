# Parte 1B.8.8: Taxonomia Hierárquica Da Vida

## Objetivo

Representar a hierarquia de vida em uma única taxonomia canônica, ordenada e
apoiada pelas entidades `life`:

```text
domain -> kingdom -> phylum -> class -> order -> family -> genus -> species -> breed -> variety
```

O manifesto `life:hierarchy` contém a floresta e é a única fonte de
ancestralidade, rank e ordem entre irmãos. Cada `LifeEntity` contém somente sua
identidade, conteúdo localizado, classificações, seções e mídia. Ela não repete
a cadeia taxonômica.

```text
data/knowledge/life/taxonomies/hierarchy/_entity.json
└── terms[] / children[]             identidade, pai, rank e ordem
                +
data/knowledge/life/**/_entity.json
└── LifeEntity                       conteúdo e atributos do mesmo ID
                |
                v
life:hierarchy + índice de LifeEntity validado
                |
                v
taxonomy_registry + taxonomy_terms + life_reference_items
```

A fonte pode representar somente o subconjunto de vida necessário ao produto.
Ela não precisa enumerar todos os domínios ou táxons existentes. Todo ramo
presente, porém, é internamente completo, tipado e verificável.

## Pré-Requisitos

- A
  [Parte 1B.8.7: autoria taxonômica hierárquica](./07-hierarchical-taxonomy-authoring.md)
  está concluída.
- As taxonomias usam `terms` e `children`, com identidade independente da
  posição estrutural.
- Auditoria, validação, build integral e gate geral do workspace estão verdes
  antes da primeira edição desta parte.
- A crate `artifact-builder` não integra este escopo.

## Escopo

Esta parte altera:

- a autoria de todas as entidades `life` em `data/knowledge`;
- a taxonomia canônica `life:hierarchy`;
- a fixture mínima do `knowledge-builder`;
- os JSON Schemas de taxonomia e de `LifeEntity`;
- os modelos Rust de fonte e o índice validado de vida;
- a matriz central de taxonomias e seus modos de uso;
- validação, aplicabilidade, aliases, busca, contagens e digest da fonte;
- inventário, declarações, rows, operações, ownership e evidência de projeção;
- o DDL de `life_reference_items` e seus índices;
- writers, readers, verificação integral e testes de adulteração;
- `scripts/audit-knowledge.mjs`, inventário e relatório canônicos;
- documentação do conhecimento, do builder e dos planos consumidores.

Esta parte não altera:

- os dez ranks aceitos nem sua ordem;
- IDs, conteúdo, classificações, seções ou mídias das entidades de vida;
- `bodyMetrics`, `originPlaceIds` ou a taxonomia `life:size`;
- o significado de `applicableTaxonIds` em produtos e protocolos;
- taxonomias de catálogo ou relações N:N em `entity_taxonomy_terms`;
- bancos, mídia ou CAS do ramo `user`;
- repositories, rotas ou componentes dos apps;
- distribuição de artefatos pelo Hub.

## Invariantes

- Existe exatamente uma taxonomia `life:hierarchy`.
- Seu ID canônico é `life-hierarchy`.
- Ela declara `termEntityType: "life"`.
- `terms` contém os domínios presentes na fonte.
- `children` contém exclusivamente os filhos taxonômicos diretos.
- A posição em cada array define a ordem somente entre irmãos.
- A profundidade determina o rank por uma lista central de dez posições.
- Raízes possuem rank `domain`; a profundidade máxima é `9`, correspondente a
  `variety`.
- Um ramo pode terminar em qualquer rank.
- A ausência de outros domínios, reinos ou ramos biológicos é válida.
- Cada chave da árvore resolve exatamente uma `LifeEntity` com o mesmo `id`.
- Cada `LifeEntity` aparece exatamente uma vez na árvore.
- `LifeEntity` não declara `taxonomy`, `rank`, `parentId` nem ordem.
- O manifesto hierárquico não repete `localizedContent`, classificações,
  seções, caminhos ou mídia das entidades.
- Nomes e aliases pertencem somente à `LifeEntity`; a projeção taxonômica os
  reutiliza a partir do grafo validado.
- `key` continua sendo identidade opaca. Pontos ou outros segmentos não criam
  ancestralidade.
- Diretórios continuam servindo somente à organização editorial.
- Nenhuma relação é inferida da disposição das pastas, do nome, do alias ou da
  grafia do ID.
- `taxonomy_terms.parent_term_key` é a única representação relacional da
  hierarquia de vida.
- `entity_taxonomy_terms` não recebe relações `life:hierarchy`.
- Não existe segunda árvore em `LifeEntity` ou `life_reference_items`.

## 1. Contrato Canônico Da Fonte

### 1.1 Manifesto `life:hierarchy`

Criar:

```text
data/knowledge/life/taxonomies/hierarchy/_entity.json
```

O manifesto possui esta forma:

```json
{
  "schemaVersion": 1,
  "entityType": "taxonomy",
  "id": "life-hierarchy",
  "domain": "life",
  "purpose": "hierarchy",
  "termEntityType": "life",
  "terms": [
    {
      "key": "eukaryota",
      "children": [
        {
          "key": "animalia",
          "children": [
            {
              "key": "chordata"
            }
          ]
        }
      ]
    }
  ]
}
```

O trecho é apenas estrutural. O manifesto final contém todas as entidades de
vida presentes na fonte, nos ranks e relações declarados pelo conjunto
canônico.

`termEntityType` determina que o conteúdo localizado de cada termo vem da
`LifeEntity` cujo `id` é igual a `key`. Nesse modo:

- cada termo exige `key`;
- `children` é opcional e não vazio quando presente;
- `localizedContent` é proibido no termo;
- nenhum caminho de arquivo ou `entityId` adicional é declarado;
- `key` resolve a entidade diretamente no índice global validado.

As demais taxonomias não declaram `termEntityType` e continuam exigindo
`localizedContent` em cada termo. Não aceitar um terceiro modo, combinação dos
dois formatos ou conteúdo parcialmente embutido.

### 1.2 `LifeEntity`

O contrato final de uma entidade de vida possui esta forma:

```json
{
  "schemaVersion": 1,
  "entityType": "life",
  "id": "german-shepherd",
  "classifications": {
    "originPlaceIds": ["de"],
    "bodyMetrics": {
      "size": "large"
    }
  },
  "localizedContent": {
    "name": {
      "pt-BR": "Pastor Alemão",
      "pt-PT": "Pastor alemão",
      "gn-PY": "Pastor alemán",
      "en-US": "German Shepherd",
      "es-ES": "Pastor alemán",
      "fr-FR": "Berger allemand"
    },
    "aliases": {
      "pt-BR": [],
      "pt-PT": [],
      "gn-PY": [],
      "en-US": [],
      "es-ES": [],
      "fr-FR": []
    }
  },
  "sections": []
}
```

Remover `taxonomy` do `required` e de `properties` em
`schemas/source/life.schema.json`. Como `additionalProperties` permanece
`false`, qualquer cadeia taxonômica declarada dentro de `LifeEntity` é recusada.

Não adicionar `parentId`, `rank`, `level`, `path`, `ancestors` ou campos
equivalentes à entidade. Esses fatos pertencem à árvore e ao índice validado.

### 1.3 Ranks Derivados

Definir uma única coleção tipada e ordenada no contrato Rust do domínio:

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

Representar o valor como enum, por exemplo `LifeRank`, e fornecer conversões
fechadas entre profundidade, nome canônico e valor persistido. Não espalhar
arrays ou `match` independentes pelos validadores, projeção, verificador e
testes.

Não declarar os ranks repetidamente no JSON. O contrato `life:hierarchy` e o
schema do builder fixam essa semântica.

## 2. Modos De Taxonomia

### 2.1 Matriz Central

O conjunto passa a possuir onze taxonomias canônicas:

```text
life:hierarchy
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

Substituir a interpretação isolada de `TaxonomyCardinality` por um contrato que
também declare como cada taxonomia participa do domínio. A nomenclatura Rust
pode acompanhar o estilo final, mas deve distinguir de forma tipada:

```rust
pub(crate) enum TaxonomyUse {
    EntityRelation(TaxonomyCardinality),
    DirectField(TaxonomyCardinality),
    EntityHierarchy { entity_type: &'static str },
}
```

Aplicar os modos:

| Taxonomia | Uso |
| --- | --- |
| `life:hierarchy` | `EntityHierarchy { entity_type: "life" }` |
| `life:size` | `DirectField(ZeroOrOne)` |
| tipos de catálogo | `EntityRelation(ExactlyOne)` |
| classificações e alvos | `EntityRelation(ZeroOrMore)` |

Somente `EntityRelation` participa de `entity_taxonomy_terms` e de suas regras
de cardinalidade. `DirectField` continua sendo validado pelo campo proprietário.
`EntityHierarchy` exige bijeção entre termos e entidades e não cria uma relação
da entidade consigo mesma.

### 2.2 Conteúdo Dos Termos

O modelo de fonte distingue dois modos fechados:

- `Embedded`: o termo é dono de `localizedContent`;
- `EntityBacked("life")`: o termo é dono somente da posição estrutural e resolve
  seu conteúdo na entidade correspondente.

O tipo bruto pode refletir a desserialização do JSON, mas o grafo validado não
deve expor combinações opcionais inválidas. Depois da validação, toda visita
taxonômica fornece explicitamente:

```text
taxonomyId
domain
purpose
termKey
parentTermKey
siblingOrder
depth
sourcePath
localizedContentOwner
localizedContent
```

Projetores, aliases, busca, contagens e verificador consomem essa visão fechada.
Eles não reimplementam a resolução de termos apoiados por entidades.

## 3. Refatoração De `data/knowledge`

### 3.1 Árvore Central

Montar a floresta `life:hierarchy` com todas as entidades `life` descobertas.
Cada nó aparece uma única vez e usa o `id` da entidade como `key`.

Os ramos presentes seguem a ordem fixa de ranks. A floresta pode receber novos
domínios e novos ramos gradualmente, desde que todo nó adicionado:

1. possua uma `LifeEntity` com o mesmo ID;
2. esteja sob o pai direto do rank imediatamente superior;
3. não exista em outro ponto da floresta;
4. respeite a ordem autoral entre irmãos;
5. não dependa da pasta física para adquirir significado.

Não completar partes da árvore da vida por inferência. Não criar entidades ou
termos `unknown`, `other`, `unclassified` ou equivalentes.

### 3.2 Entidades

Remover o objeto `taxonomy` de todos os manifestos `life` em:

```text
data/knowledge/life/
```

Preservar integralmente:

- `id`;
- `classifications` quando presente;
- `localizedContent`;
- `sections` e `contentPath`;
- `media`;
- documentos Markdown e bytes de mídia.

A localização editorial das entidades pode continuar acompanhando a árvore por
conveniência humana, mas não é validada como ancestralidade e não integra o
digest lógico.

### 3.3 Fixture Mínima

Adicionar à fixture:

```text
tools/knowledge-builder/fixtures/valid-minimal/taxonomies/life-hierarchy/_entity.json
```

Representar nela os dez ranks até a variedade já coberta pela fixture. Remover
`taxonomy` de cada `LifeEntity` da fixture e manter seus dados próprios.

A fixture comprova simultaneamente:

- raiz de domínio;
- cadeia completa de dez ranks;
- ramo que termina antes de `variety`;
- conteúdo localizado resolvido pela entidade;
- classificação `life:size` independente;
- aplicabilidade em qualquer rank.

## 4. Índice E Validação De Vida

### 4.1 Ordem Do Pipeline

Organizar a validação sem dependência circular:

1. descobrir e desserializar todos os manifestos;
2. validar a forma individual de entidades e taxonomias;
3. construir o índice global de identidades;
4. coletar as onze taxonomias e suas árvores estruturais;
5. resolver os termos apoiados por `LifeEntity`;
6. construir o índice validado de `life:hierarchy`;
7. validar classificações e aplicabilidade;
8. validar aliases, conteúdo, arquivos e mídia;
9. calcular contagens e digest sobre o grafo validado.

Não resolver conteúdo taxonômico durante a desserialização e não fazer a
projeção participar da validação da fonte.

### 4.2 Índice Validado

Substituir `LifeIndex` baseado na cadeia repetida por uma visão que forneça, por
ID:

```text
LifeEntity
LifeRank
parentId
siblingOrder
depth
sourcePath do nó taxonômico
ancestrais ordenados
```

Os ancestrais podem ser calculados durante a validação ou por caminhada de pais
com memoização. Não manter uma segunda declaração autoral da cadeia.

O índice oferece operações explícitas para:

- obter entidade e rank por ID;
- obter pai e filhos diretos;
- percorrer ancestrais;
- testar se um ID é ancestral de outro;
- percorrer descendentes;
- resolver nome e aliases por locale.

### 4.3 Regras De Integridade

Recusar:

- ausência ou duplicação de `life:hierarchy`;
- `termEntityType` ausente ou diferente de `life` nessa taxonomia;
- `termEntityType` em qualquer outra taxonomia;
- `localizedContent` embutido em termo de `life:hierarchy`;
- termo sem `LifeEntity` correspondente;
- `LifeEntity` ausente da árvore;
- chave repetida em qualquer ramo;
- entidade presente em mais de um pai;
- raiz em profundidade diferente de `domain`;
- nó além de `variety`;
- `children: []`;
- referência de produto ou protocolo a ID ausente da hierarquia;
- ancestral e descendente redundantes no mesmo `applicableTaxonIds`;
- divergência entre conteúdo localizado resolvido e o proprietário esperado.

Aceitar:

- múltiplos domínios em `terms`;
- qualquer quantidade parcial de ramos válidos;
- ramo encerrado em qualquer rank;
- entidade em qualquer um dos dez ranks;
- chaves simples ou compostas em qualquer posição;
- reorganização editorial de pastas sem mudança semântica.

## 5. Aplicabilidade E Busca

### 5.1 Produtos E Protocolos

`applicableTaxonIds` continua aceitando IDs de qualquer rank. A validação usa o
índice de `life:hierarchy` para garantir existência e detectar sobreposição
entre ancestral e descendente.

Não expandir descendentes no JSON de autoria nem em
`applicable_taxon_ids_json`. A expansão continua sendo uma operação de consulta
sobre a árvore compilada.

### 5.2 Busca

Nome e aliases de cada `LifeEntity` continuam produzindo termos de pesquisa
somente para a própria entidade. A materialização de `life:hierarchy` em
`taxonomy_terms` reutiliza os mesmos valores, mas não injeta nomes de ancestrais
em descendentes e não duplica rows semanticamente equivalentes em
`entity_search_terms`.

Buscar um termo de `life:hierarchy` resolve a `LifeEntity` com a mesma chave.
Navegação para pai, filhos, ancestrais ou descendentes usa a estrutura
relacional, não texto normalizado.

## 6. Projeção Relacional

### 6.1 `taxonomy_registry` E `taxonomy_terms`

Projetar:

```text
taxonomy_registry
└── id      = life-hierarchy
    domain  = life
    purpose = hierarchy
```

Cada nó da árvore produz uma row de `taxonomy_terms`:

```text
taxonomy_id      = life-hierarchy
term_key         = LifeEntity.id
parent_term_key  = pai derivado de children, ou null para domínio
label            = LifeEntity.localizedContent.name[locale]
normalized_label = label normalizado
aliases_json     = LifeEntity.localizedContent.aliases[locale]
sort_order       = posição entre irmãos
```

A árvore continua usando os índices parciais de raízes e filhos definidos na
Parte 1B.8.7. A projeção ocorre em pré-ordem.

### 6.2 `life_reference_items`

Usar `taxonomy_terms` como única adjacency list. O contrato final de
`life_reference_items` contém:

```sql
CREATE TABLE life_reference_items (
    id TEXT PRIMARY KEY CHECK(length(trim(id)) > 0),
    hierarchy_taxonomy_id TEXT NOT NULL
        CHECK(hierarchy_taxonomy_id = 'life-hierarchy'),
    rank TEXT NOT NULL CHECK(rank IN (
        'domain', 'kingdom', 'phylum', 'class', 'order',
        'family', 'genus', 'species', 'breed', 'variety'
    )),
    size_term_key TEXT
        CHECK(size_term_key IS NULL OR length(trim(size_term_key)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    normalized_name TEXT NOT NULL CHECK(length(trim(normalized_name)) > 0),
    aliases_json TEXT NOT NULL
        CHECK(json_valid(aliases_json) AND json_type(aliases_json) = 'array'),
    stage_metrics_json TEXT
        CHECK(stage_metrics_json IS NULL OR (
            json_valid(stage_metrics_json)
            AND json_type(stage_metrics_json) = 'object'
        )),
    content_json TEXT NOT NULL CHECK(json_valid(content_json)),
    FOREIGN KEY(hierarchy_taxonomy_id, id)
        REFERENCES taxonomy_terms(taxonomy_id, term_key)
        ON DELETE RESTRICT
);
```

Preservar em `life_reference_items` nome e aliases como read model direto de
vida. Eles e os valores de `taxonomy_terms` são projeções derivadas da mesma
`LifeEntity`, e o verificador exige igualdade. Não constituem duas fontes de
autoria.

Remover de `life_reference_items`:

```text
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

Não adicionar `parent_id`, caminho materializado ou JSON de ancestrais à tabela.
O pai já está em `taxonomy_terms.parent_term_key`.

### 6.3 Índices

Remover os índices dependentes das dez colunas taxonômicas e adicionar:

```sql
CREATE INDEX idx_life_rank
ON life_reference_items(rank, normalized_name, id);

CREATE INDEX idx_life_size
ON life_reference_items(size_term_key, id);
```

As consultas de árvore usam os índices de `taxonomy_terms` por
`taxonomy_id + parent_term_key + sort_order`. Não criar closure table, nested
sets, materialized path ou cache persistido de descendentes nesta parte.

### 6.4 Ordem De Carga

Materializar na seguinte ordem lógica:

1. `taxonomy_registry`;
2. `taxonomy_terms` em pré-ordem;
3. `life_reference_items`;
4. `life_origin_places` e demais relações dependentes;
5. entidades que guardam `applicable_taxon_ids_json`.

Atualizar `SystemRow::Life`, descritores, colunas, writers, bindings, readers,
matrizes de tabela e testes literais como um único contrato.

### 6.5 Versões

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

Se a forma serializada de relatório ou evidência precisar mudar, interromper e
apresentar a necessidade antes de incrementar sua versão. A mudança de valores,
owners ou quantidade de rows não implica alteração automática desses schemas.

Atualizar metadata, fingerprints, contratos e expectativas de versão. Não criar
migration.

## 7. Consultas Canônicas

### 7.1 Ancestrais

Definir uma consulta recursiva compartilhada que parte de um táxon e caminha por
`parent_term_key` até a raiz. O resultado contém ID, rank, nome e profundidade e
é ordenado de domínio até o próprio item.

Essa consulta permite montar o DTO com posições nomeadas:

```text
domain
kingdom
phylum
class
order
family
genus
species
breed
variety
```

O DTO pode expor essas posições para ergonomia sem reintroduzi-las na fonte ou
na tabela. A montagem usa `LifeRank`, não o caminho editorial.

### 7.2 Descendentes

Definir uma consulta recursiva que parte de uma ou mais chaves e percorre filhos
em `taxonomy_terms`. Ela atende:

- navegação de subárvore;
- filtros por qualquer rank;
- aplicabilidade de produtos e protocolos;
- resolução de espécie, raça e variedade para pacientes;
- contagens agrupadas por rank.

Aplicar sempre `taxonomy_id = 'life-hierarchy'`. Não misturar termos de outras
taxonomias que reutilizem a mesma chave.

### 7.3 Desempenho

A árvore possui profundidade máxima fixa de dez níveis e adjacency list
indexada. Validar os planos de consulta com `EXPLAIN QUERY PLAN` nos testes de
integração. Uma estrutura derivada adicional só entra em outro escopo mediante
medição que demonstre necessidade.

## 8. Inventário, Ownership E Evidência

### 8.1 Fatos Autorais

O manifesto `life:hierarchy` é dono de:

- registro `life:hierarchy`;
- presença de cada `termKey`;
- relação estrutural com o pai;
- posição entre irmãos;
- profundidade da qual `rank` é derivado;
- vínculo da chave ao tipo de entidade `life`.

Cada `LifeEntity` é dona de:

- `id`;
- `localizedContent`;
- classificações;
- seções, conteúdo e mídia.

### 8.2 Destinos

Declarar explicitamente que nome e aliases da `LifeEntity` possuem dois destinos
derivados:

- `life_reference_items` para leitura direta da entidade;
- seu termo correspondente em `taxonomy_terms` para navegação taxonômica.

Inventário e declarações criam obrigações distintas para os dois destinos.
Cada operação confirma somente seu próprio destino. O compartilhamento do fato
autoral não autoriza um recibo a concluir o outro.

`rank` é uma obrigação derivada da profundidade do nó e pertence à row de
`life_reference_items`. `parent_term_key` e `sort_order` pertencem à row de
`taxonomy_terms`.

Não produzir `entity_taxonomy_terms` para `life:hierarchy` e não contar esse
vínculo como classificação N:N.

## 9. Contagens, Digest E Auditoria

### 9.1 Digest

O digest lógico inclui:

- a taxonomia `life:hierarchy`, sua ordem e seus vínculos por chave;
- cada `LifeEntity` sem cadeia taxonômica repetida;
- schemas e demais conteúdo canônico já vigente.

O conteúdo localizado da entidade aparece uma vez no modelo lógico. A resolução
desse conteúdo para `taxonomy_terms` é uma projeção e não duplica o fato no
digest.

Comprovar:

- reordenar irmãos altera o digest;
- mover um nó altera o digest sem exigir mudança de `id`;
- alterar nome ou alias altera o digest;
- mover pastas sem alterar manifestos não muda o digest;
- dois builds da mesma fonte permanecem byte a byte idênticos.

### 9.2 Relações E Fragmentos

Contar separadamente:

- um vínculo termo-entidade por nó de `life:hierarchy`;
- uma relação hierárquica por nó não raiz;
- origens, porte e aplicabilidades pelos contratos vigentes.

Não contar cada ancestral novamente para cada descendente. Fragmentos
localizados de `LifeEntity` são contados uma vez por locale.

### 9.3 Auditoria JavaScript

Atualizar `scripts/audit-knowledge.mjs` para:

- exigir os onze pares canônicos;
- reconhecer `termEntityType: "life"` somente em `life:hierarchy`;
- percorrer todos os níveis da árvore;
- construir índice por ID, pai, filhos, rank e ordem;
- comprovar a bijeção entre termos e entidades;
- recusar `taxonomy` dentro de `LifeEntity`;
- validar aplicabilidade pelo índice hierárquico;
- derivar contagens por rank da árvore;
- manter `life:size` independente;
- não inferir relações pelo caminho editorial.

Regenerar:

```text
data/knowledge/inventory.json
data/knowledge/audit-report.json
```

Não fixar a quantidade total de organismos como limite do contrato. A auditoria
deriva os totais da fonte presente.

## 10. Verificação Integral

O verificador reconstrói `life:hierarchy` a partir de `taxonomy_registry` e
`taxonomy_terms` e comprova, em cada banco localizado:

- registro único com domínio `life` e propósito `hierarchy`;
- floresta íntegra, alcançável, acíclica e ordenada;
- uma row de `life_reference_items` para cada termo;
- um termo para cada row de `life_reference_items`;
- `hierarchy_taxonomy_id = 'life-hierarchy'` em todas as rows;
- FK composta válida entre entidade e termo;
- `rank` equivalente à profundidade de cada termo;
- profundidade limitada aos dez ranks;
- igualdade de label/nome, normalização e aliases nos dois read models;
- ausência de relações `entity_taxonomy_terms` para esse propósito;
- referências de `applicable_taxon_ids_json` resolvidas;
- `life_origin_places` e `life:size` íntegros;
- ausência das dez colunas taxonômicas na disposição física;
- igualdade estrutural da árvore entre os seis locales;
- variação localizada somente nos campos de conteúdo;
- `foreign_key_check` e `integrity_check` aprovados.

Atualizar testes de adulteração para detectar:

- alteração de pai ou ordem de um termo de vida;
- remoção ou inserção de termo;
- remoção ou inserção de `LifeEntity` correspondente;
- `rank` divergente da profundidade;
- `hierarchy_taxonomy_id` divergente;
- label, nome ou aliases divergentes entre as duas projeções;
- termo apontando para entidade inexistente;
- ciclo ou ramo inalcançável;
- aplicabilidade para ID inexistente;
- relação N:N indevida para `life:hierarchy`.

## 11. Testes

### 11.1 Schema E Fonte

Cobrir:

- `LifeEntity` sem `taxonomy` aceita;
- `LifeEntity` com `taxonomy`, `rank` ou `parentId` recusada;
- taxonomia apoiada por `life` sem `localizedContent` aceita;
- `localizedContent` embutido em termo apoiado por entidade recusado;
- taxonomia comum sem `localizedContent` recusada;
- `termEntityType` em outra taxonomia recusado;
- taxonomia hierárquica ausente ou duplicada recusada;
- termo sem entidade e entidade sem termo recusados;
- chave duplicada em ramos distintos recusada;
- múltiplas raízes aceitas;
- ramo parcial internamente íntegro aceito;
- décimo rank aceito e décimo primeiro recusado;
- `children: []` recusado;
- pasta reorganizada sem mudança semântica aceita.

### 11.2 Semântica

Comprovar por expectativas literais:

- rank derivado em cada uma das dez profundidades;
- pai, filhos, ancestrais e descendentes;
- ordem reiniciada em cada grupo de irmãos;
- nomes e aliases resolvidos da `LifeEntity` correta;
- aplicabilidade em domínio, espécie, raça e variedade;
- recusa de ancestral e descendente redundantes;
- classificações opcionais sem herança implícita;
- fragmentos localizados sem dupla contagem;
- relação total sem ancestrais repetidos por descendente;
- digest sensível à árvore e independente das pastas.

### 11.3 Banco E Consultas

Comprovar nos seis bancos `system`:

- onze registros em `taxonomy_registry`;
- todos os termos de vida em `taxonomy_terms`;
- todos os registros de vida com FK para `life-hierarchy`;
- inexistência das dez colunas removidas;
- ranks persistidos corretamente;
- consulta de ancestralidade ordenada do domínio ao item;
- consulta de descendentes por qualquer rank;
- filtro por domínio, reino, filo, classe, ordem, família, gênero, espécie, raça
  e variedade;
- produto e protocolo aplicáveis ao próprio alvo e a seus descendentes;
- nenhuma expansão persistida em `applicable_taxon_ids_json`;
- planos de consulta usando os índices de árvore;
- schema técnico `7` em `system` e `2` em `system_media`;
- equivalência entre fonte, contrato, rows relidas e evidência;
- determinismo entre duas construções independentes.

## 12. Documentação E Planos Consumidores

Atualizar `data/knowledge/README.md` e `tools/knowledge-builder/README.md` para
documentar:

- `life:hierarchy` como árvore central apoiada por entidades;
- responsabilidade separada entre estrutura e conteúdo;
- os dez ranks derivados por profundidade;
- crescimento parcial e internamente completo da floresta;
- projeção em `taxonomy_terms` e vínculo com `life_reference_items`;
- consultas recursivas de ancestrais e descendentes;
- ausência de cadeia taxonômica em `LifeEntity`;
- onze taxonomias canônicas;
- schema técnico `7` de `system`.

Alinhar os planos posteriores:

- Parte 1B.9 recebe `life:hierarchy` e o schema `7` como entrada do adaptador;
- Parte 1C recompõe posições nomeadas e filtros pela árvore, sem depender das
  dez colunas taxonômicas;
- o índice geral do Hub apresenta esta parte na sequência obrigatória.

Toda documentação descreve somente o contrato vigente. Não manter exemplos com
`taxonomy` dentro de `LifeEntity` nem consultas às colunas removidas.

## 13. Sequência De Execução

1. Executar auditoria, validação, testes e build integral de referência.
2. Definir `LifeRank` e os modos tipados de taxonomia.
3. Adaptar os schemas para `life:hierarchy` apoiada por entidades.
4. Criar o índice validado e seus testes unitários.
5. Montar a árvore da fixture e remover suas cadeias repetidas.
6. Montar a árvore canônica e atualizar todas as `LifeEntity`.
7. Adaptar classificações, aplicabilidade, aliases, busca, contagens e digest.
8. Adaptar inventário, declarações, ownership, operações e evidência.
9. Atualizar DDL, versões, rows, writers, readers e índices.
10. Atualizar o verificador e os testes de adulteração.
11. Atualizar auditoria, inventários, documentação e planos consumidores.
12. Executar testes específicos, dois builds reais e o gate geral do workspace.

Concluir fonte, schema, validação e projeção no mesmo escopo. Não aceitar
simultaneamente a árvore central e cadeias declaradas nas entidades.

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

- preencher a árvore biológica além das entidades presentes;
- acrescentar ranks, subespécies ou níveis informais;
- alterar classificações corporais ou geográficas;
- inferir conteúdo científico, traduções ou relações;
- criar hierarquia a partir dos diretórios;
- criar closure table, nested sets, materialized path ou cache de descendentes;
- criar relações `entity_taxonomy_terms` para `life:hierarchy`;
- criar migrations, scripts de adoção ou formatos paralelos;
- implementar `artifact-builder`;
- alterar os apps ou publicar artefatos.

## Critérios De Aceite

- `data/knowledge/life/taxonomies/hierarchy/_entity.json` é a única fonte de
  ancestralidade, rank e ordem das entidades de vida.
- Toda `LifeEntity` aparece exatamente uma vez na árvore e todo termo resolve
  exatamente uma entidade.
- Nenhuma `LifeEntity` contém `taxonomy`, `rank`, `parentId` ou ancestrais.
- O conjunto parcial de vida é aceito sem exigir táxons externos ao produto.
- Os onze pares taxonômicos canônicos são fechados e validados.
- Termos de `life:hierarchy` obtêm nome e aliases somente da `LifeEntity` dona.
- `taxonomy_terms` contém a árvore completa e é a única adjacency list no banco.
- `life_reference_items` contém `hierarchy_taxonomy_id` e `rank`, sem as dez
  colunas de ancestralidade.
- Aplicabilidade, filtros e navegação funcionam para qualquer um dos dez ranks.
- Inventário, declarações, ownership e evidência cobrem todos os fatos e destinos
  sem dupla conclusão.
- Auditoria e verificador comprovam bijeção, rank, ordem, conteúdo e referências.
- `system` usa schema técnico `7`; `system_media` permanece em `2`.
- Dois builds completos são determinísticos e passam pela verificação integral.
- O workspace passa pela skill `$validate-workspace`.
- O diff contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.9: `artifact-builder` e adaptador de conhecimento](../01b9-artifact-builder/README.md).
