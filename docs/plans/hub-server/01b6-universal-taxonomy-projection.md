# Parte 1B.6: Projeção Taxonômica Universal

## Objetivo

Consolidar todas as taxonomias canônicas em um único modelo relacional de
termos e associações. Raças, fabricantes, princípios ativos, condições e
produtos usam a mesma infraestrutura para navegação, filtros, composição de
facetas e derivação da busca textual.

```text
taxonomy_registry
-> taxonomy_terms
-> entity_taxonomy_terms
-> filtros e facetas por domínio e propósito
-> entity_search_terms derivado dos labels e aliases relacionados
```

A projeção não cria tabelas específicas para um propósito taxonômico. O
significado de uma associação vem de `taxonomy_registry.domain` e
`taxonomy_registry.purpose`, enquanto `entity_taxonomy_terms` materializa a
relação ordenada entre a entidade e o termo.

## Pré-Requisito

A [Parte 1B.5](./01b5-projection-contract-test-coverage.md) está concluída. O
`knowledge-builder` possui contrato de projeção tipado, ownership operacional
explícito, writers SQLite fechados, matriz exaustiva entre `SystemRow` e
`INSERT`, verificação semântica integral e documentação do mapa físico dos
artefatos.

## Resultado Esperado

- todas as taxonomias são registradas em `taxonomy_registry`;
- todos os termos são persistidos em `taxonomy_terms` com `taxonomy_id`;
- toda associação taxonômica de entidade é persistida em
  `entity_taxonomy_terms`;
- a relação identifica a taxonomia por `taxonomy_id`, sem repetir seu propósito
  em `relation_kind`;
- campos taxonômicos escalares não são duplicados nas tabelas das entidades;
- filtros por termo e leitura das taxonomias de uma entidade possuem índices
  dedicados;
- labels e aliases taxonômicos continuam alimentando `entity_search_terms`;
- o builder valida cardinalidade, domínio, propósito, ordem e pertencimento dos
  termos antes de abrir os bancos;
- o verificador relê o modelo universal e exige equivalência integral com o
  contrato;
- o DDL de `system` contém 18 tabelas no total: 16 projetáveis e 2 de
  metadados;
- `system_media`, conteúdo compilado, mídia, CAS e fonte canônica permanecem com
  seus contratos atuais.

## Escopo

- consolidar o DDL taxonômico de `system`;
- projetar todos os propósitos por `taxonomy_registry` e `taxonomy_terms`;
- projetar todas as associações por `entity_taxonomy_terms`;
- retirar representações taxonômicas duplicadas das tabelas de entidades;
- atualizar `SystemTable`, `SystemColumn`, `SystemRow` e identidades de operação;
- atualizar ownership, obrigações, writers, métricas e relatório;
- atualizar a releitura tipada e a equivalência semântica;
- atualizar versões técnicas e schemas públicos afetados;
- adicionar testes estruturais, relacionais, de filtro, busca e adulteração;
- atualizar o mapa físico e as regras de manutenção do `knowledge-builder`.

## Fora Do Escopo

- alterar `data/knowledge`, seus schemas de autoria ou nomes de campos;
- transformar espécies, regiões, localizações ou relações farmacológicas em
  taxonomias;
- alterar `system_media`, thumbnails, referências de mídia ou `CAS/system`;
- implementar repositories, DTOs, filtros ou telas dos apps;
- alterar bancos, schemas, migrations, mídia ou CAS do ramo `user`;
- criar migrations, conversões, backfills, views de compatibilidade ou caminhos
  paralelos de leitura;
- adicionar FTS, closure table de hierarquia ou dependências;
- implementar aquisição remota, Hub, releases, bootstraps ou deltas.

## 1. Contrato Taxonômico Universal

### Registro De Taxonomias

`taxonomy_registry` continua definindo a identidade de cada vocabulário:

```text
id
domain
purpose
```

`UNIQUE(domain, purpose)` garante uma única taxonomia para cada dimensão de um
domínio. O conjunto atual é:

| Entidade | Domínio | Propósitos |
| --- | --- | --- |
| raça | `breed` | `size` |
| fabricante | `manufacturer` | `type`, `classification` |
| princípio ativo | `active_ingredient` | `type`, `classification` |
| condição | `condition` | `type`, `classification` |
| produto | `product` | `type`, `classification`, `target`, `vaccine_profile`, `life_stage`, `therapeutic_scope` |

O builder usa o par `domain + purpose` para resolver o `taxonomy_id`. O ID da
taxonomia entra no contrato e nas linhas SQLite; consumers não inferem uma
tabela pelo propósito. A fonte canônica vigente produz exatamente 13 registros
de taxonomia a partir dessa matriz.

### Termos

`taxonomy_terms` recebe os termos de todas as taxonomias:

```sql
CREATE TABLE taxonomy_terms (
    taxonomy_id TEXT NOT NULL,
    term_key TEXT NOT NULL,
    parent_term_key TEXT,
    label TEXT NOT NULL,
    normalized_label TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    sort_order INTEGER NOT NULL,
    PRIMARY KEY(taxonomy_id, term_key),
    UNIQUE(taxonomy_id, sort_order),
    FOREIGN KEY(taxonomy_id)
        REFERENCES taxonomy_registry(id) ON DELETE CASCADE,
    FOREIGN KEY(taxonomy_id, parent_term_key)
        REFERENCES taxonomy_terms(taxonomy_id, term_key)
);
```

Preservar as `CHECK` atuais de texto, JSON e ordem. A chave composta permite
que taxonomias distintas usem a mesma `term_key` sem colisão. A hierarquia
permanece restrita à própria taxonomia pelo `taxonomy_id` compartilhado na FK.

Remover do DDL e de todo o contrato de projeção:

- `product_target_terms`;
- `product_vaccine_profile_terms`;
- `product_life_stage_terms`;
- `product_therapeutic_scope_terms`.

Não manter seleção de tabela por propósito. Toda `CanonicalEntity::Taxonomy`
produz uma linha em `taxonomy_registry` e suas linhas em `taxonomy_terms`.

### Relações Das Entidades

Usar um único contrato para toda associação taxonômica:

```sql
CREATE TABLE entity_taxonomy_terms (
    entity_type TEXT NOT NULL CHECK(entity_type IN (
        'breed',
        'manufacturer',
        'active_ingredient',
        'condition',
        'product'
    )),
    entity_id TEXT NOT NULL CHECK(length(trim(entity_id)) > 0),
    taxonomy_id TEXT NOT NULL,
    term_key TEXT NOT NULL,
    sort_order INTEGER NOT NULL CHECK(sort_order >= 0),
    PRIMARY KEY(entity_type, entity_id, taxonomy_id, term_key),
    UNIQUE(entity_type, entity_id, taxonomy_id, sort_order),
    FOREIGN KEY(taxonomy_id, term_key)
        REFERENCES taxonomy_terms(taxonomy_id, term_key) ON DELETE RESTRICT
);
```

`relation_kind` não pertence à relação. Seu valor é semanticamente idêntico ao
`purpose` da taxonomia e não deve formar uma segunda fonte de verdade.

Remover do DDL e dos contratos:

- `product_targets`;
- `product_vaccine_profiles`;
- `product_life_stages`;
- `product_therapeutic_scopes`.

Produtos usam `entity_type = 'product'` nessa mesma relação. Princípios ativos,
raças e os demais domínios seguem exatamente o mesmo caminho.

## 2. Uma Representação Por Associação

### Mapeamento Da Fonte

Os campos canônicos permanecem explícitos no `_entity.json`, mas todos são
materializados como relações:

| Campo canônico | Taxonomia resolvida | Cardinalidade |
| --- | --- | --- |
| `breed.sizeTermKey` | `breed:size` | exatamente 1 |
| `manufacturer.typeTermKey` | `manufacturer:type` | exatamente 1 |
| `manufacturer.classificationTermKeys` | `manufacturer:classification` | 0..N |
| `active_ingredient.typeTermKey` | `active_ingredient:type` | exatamente 1 |
| `active_ingredient.classificationTermKeys` | `active_ingredient:classification` | 0..N |
| `condition.typeTermKey` | `condition:type` | exatamente 1 |
| `condition.classificationTermKeys` | `condition:classification` | 0..N |
| `product.typeTermKey` | `product:type` | exatamente 1 |
| `product.classificationTermKeys` | `product:classification` | 0..N |
| `product.targetTermKeys` | `product:target` | 0..N |
| `product.vaccineProfileTermKeys` | `product:vaccine_profile` | 0..N |
| `product.lifeStageTermKeys` | `product:life_stage` | 0..N |
| `product.therapeuticScopeTermKeys` | `product:therapeutic_scope` | 0..N |

Campos ausentes entre os quatro arrays opcionais de produto equivalem a uma
coleção vazia. A ordem canônica de cada coleção determina `sort_order` dentro
de sua própria `taxonomy_id`.

### Colunas Das Entidades

Remover das tabelas principais:

- `breed_reference_items.size_term_key`;
- `manufacturer_catalog_items.type_term_key`;
- `active_ingredient_catalog_items.type_term_key`;
- `condition_catalog_items.type_term_key`;
- `product_catalog_items.type_term_key`.

Esses valores permanecem disponíveis exclusivamente por
`entity_taxonomy_terms`. A tabela principal conserva somente os atributos
próprios da entidade. A API ergonômica de leitura e a composição em DTOs
pertencem à Parte 1C.

### Validação Semântica

Antes da persistência, o contrato recusa:

- taxonomia ausente para o par `domain + purpose`;
- termo inexistente na taxonomia resolvida;
- termo pertencente a outra taxonomia;
- domínio incompatível com `entity_type`;
- propósito incompatível com o campo canônico;
- associação repetida;
- ordem repetida dentro da mesma taxonomia da entidade;
- ausência de uma relação obrigatória de tipo ou porte;
- mais de uma relação para um campo de cardinalidade unitária.

O DDL garante a identidade e a FK do termo. O `ProjectionContract` e o
`ArtifactVerifier` garantem domínio, propósito, cardinalidade e correspondência
com a entidade polimórfica.

## 3. Índices E Consultas De Referência

Manter o índice de labels por taxonomia:

```sql
CREATE INDEX idx_taxonomy_terms_label
ON taxonomy_terms(taxonomy_id, normalized_label);
```

Adicionar os dois sentidos de navegação:

```sql
CREATE INDEX idx_entity_taxonomy_filter
ON entity_taxonomy_terms(
    taxonomy_id,
    term_key,
    entity_type,
    entity_id
);

CREATE INDEX idx_entity_taxonomy_entity
ON entity_taxonomy_terms(
    entity_type,
    entity_id,
    taxonomy_id,
    sort_order
);
```

O primeiro atende filtros e facetas que partem de um termo. O segundo atende a
montagem de uma entidade com todas as suas taxonomias em ordem.

Os testes do builder devem executar consultas representativas, sem introduzir
uma API de runtime. Exemplos de comportamento:

```sql
-- entidades de um domínio associadas a um termo
SELECT relation.entity_id
FROM entity_taxonomy_terms relation
JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id
WHERE relation.entity_type = ?
  AND taxonomy.domain = ?
  AND taxonomy.purpose = ?
  AND relation.term_key = ?
ORDER BY relation.entity_id;

-- taxonomias completas de uma entidade
SELECT taxonomy.domain, taxonomy.purpose, term.term_key, term.label
FROM entity_taxonomy_terms relation
JOIN taxonomy_registry taxonomy ON taxonomy.id = relation.taxonomy_id
JOIN taxonomy_terms term
  ON term.taxonomy_id = relation.taxonomy_id
 AND term.term_key = relation.term_key
WHERE relation.entity_type = ? AND relation.entity_id = ?
ORDER BY taxonomy.domain, taxonomy.purpose, relation.sort_order;
```

Não adicionar tabelas de fechamento transitivo. A hierarquia permanece em
`parent_term_key`, e uma consulta recursiva pode navegar descendentes quando um
consumer exigir esse comportamento.

## 4. Contrato De Projeção, Ledger E Writers

### Vocabulário Fechado

Atualizar `SystemTable` para remover as oito tabelas específicas. O conjunto
projetável de `system` passa a conter:

```text
taxonomy_registry
taxonomy_terms
geo_places
breed_reference_items
breed_origin_places
manufacturer_catalog_items
active_ingredient_catalog_items
condition_catalog_items
product_catalog_items
entity_taxonomy_terms
product_active_ingredients
treatment_protocols
treatment_protocol_items
treatment_protocol_doses
entity_search_terms
entity_media_references
```

As duas tabelas de metadados completam as 18 tabelas de `system`.

Atualizar `SystemColumn` para retirar variantes que não correspondem a nenhuma
coluna materializada, incluindo:

- `TypeTermKey`;
- `SizeTermKey`;
- `RelationKind`.

Remover `ProductTerm` e os destinos polimórficos de `TaxonomyTerm`. O contrato
usa formas únicas equivalentes a:

```rust
SystemRow::TaxonomyTerm {
    taxonomy_id,
    term_key,
    parent_term_key,
    label,
    normalized_label,
    aliases_json,
    sort_order,
}

SystemRow::EntityTaxonomy {
    entity_type,
    entity_id,
    taxonomy_id,
    term_key,
    sort_order,
}
```

As variantes de raça, fabricante, princípio ativo, condição e produto deixam de
transportar colunas taxonômicas próprias.

### Identidade Operacional

Usar identidades estáveis e sem colisão:

```text
taxonomy term:
  taxonomy_id/term_key

entity taxonomy relation:
  entity_type/entity_id/taxonomy_id/term_key
```

`ProjectionOperationId`, `RowEvent`, `ProjectionTarget`, ownership e obrigações
devem usar essa identidade completa. Uma taxonomia ou termo com chave textual
igual a outro vocabulário não compartilha owner nem linha.

Cada campo canônico da matriz da seção 2 declara sua obrigação para a relação
concreta correspondente. A existência da entidade permanece na tabela principal;
a semântica taxonômica pertence somente à operação de
`entity_taxonomy_terms`.

### Writers E Matriz Estrutural

Manter SQLs fixos:

```text
INSERT INTO taxonomy_terms (...)
INSERT INTO entity_taxonomy_terms (...)
```

Remover descritores, casos representativos e braços de persistência das oito
tabelas retiradas. Atualizar `SystemInsertCase::ALL`, a matriz de
`SystemRow::materialized_columns()` e a prova de cobertura de `SystemColumn`.

Os testes continuam comparando exatamente a tabela e as colunas do SQL executado
com o payload tipado. Não construir nomes de tabela ou coluna a partir de
`domain`, `purpose` ou qualquer entrada canônica.

## 5. Busca E Facetas

`entity_search_terms` continua sendo o read model textual. Para cada associação
taxonômica, o builder adiciona os valores localizados aplicáveis:

- label do termo;
- aliases do termo;
- proveniência determinística que diferencia propósito, termo e tipo de valor.

A busca preserva nomes e aliases relacionados de fabricantes e princípios
ativos. A consolidação relacional não reduz nem duplica o conjunto semântico de
termos de busca de uma entidade.

Filtros e facetas usam `entity_taxonomy_terms`; busca textual usa
`entity_search_terms`. Não consultar `aliases_json` ou percorrer hierarquias em
tempo de execução para executar a busca global.

Adicionar testes que comprovem:

- busca de cada entidade por label de uma taxonomia associada;
- busca pelos aliases taxonômicos declarados;
- ausência de termos de uma taxonomia não associada;
- deduplicação determinística quando labels iguais chegam por proveniências
  distintas;
- igualdade entre os candidatos esperados e as linhas relidas do banco.

## 6. Verificação Integral

Atualizar a releitura tipada para observar:

- todos os registros de `taxonomy_registry`;
- todos os termos pela chave composta `taxonomy_id + term_key`;
- todas as associações pela identidade completa da entidade e da taxonomia;
- ordem de termos dentro de cada taxonomia da entidade;
- ausência das tabelas retiradas;
- ausência das colunas taxonômicas retiradas das tabelas principais;
- presença e definição exata dos índices novos.

O `ArtifactVerifier` compara o conjunto completo de linhas observado com o
`ProjectionContract`. Adicionar adulterações isoladas em cópias temporárias:

1. trocar uma associação por outro termo válido da mesma taxonomia;
2. trocar `taxonomy_id` e `term_key` por um par válido de outro propósito;
3. alterar `entity_type` para outro tipo permitido;
4. alterar `sort_order` sem violar as constraints físicas;
5. remover uma associação obrigatória;
6. inserir uma tabela específica que não pertence ao schema vigente.

Em cada caso, atualizar tamanho e checksums externos quando necessário. A
reutilização continua sendo recusada pela equivalência semântica ou pelo
conjunto físico exato do schema.

## 7. Versões E Formatos Públicos

Esta parte altera o contrato físico de `system` e a lista fechada de tabelas do
relatório:

- elevar `SYSTEM_SCHEMA_VERSION` de `2` para `3`;
- manter `SYSTEM_MEDIA_SCHEMA_VERSION` em `2`;
- elevar a versão do crate `knowledge-builder` de `0.2.0` para `0.3.0`;
- elevar `projection-report.json.schemaVersion` de `3` para `4`;
- manter `build-result.json.schemaVersion` em `1`;
- atualizar o JSON Schema do relatório para exigir somente as 16 tabelas
  projetáveis de `system` e `media_assets` em `systemMedia`;
- atualizar os testes de `PRAGMA user_version`, fingerprints, versão do builder
  e schemas públicos.

`build-result.json` já declara `systemSchemaVersion`,
`systemMediaSchemaVersion`, fingerprints e versão do builder. Sua estrutura não
muda.

Não implementar leitura de versões de schema diferentes da versão vigente. O
builder cria artefatos completos diretamente no contrato desta parte.

## 8. Documentação

Atualizar `tools/knowledge-builder/README.md` para:

- apresentar o mapa de 18 tabelas de `system` e 3 de `system_media`;
- ligar toda taxonomia somente a `taxonomy_terms`;
- ligar toda entidade taxonomizada somente a `entity_taxonomy_terms`;
- documentar os índices de filtro e leitura por entidade;
- explicar a separação entre relação taxonômica e busca materializada;
- remover nomes de tabelas e variantes que não pertencem ao contrato;
- atualizar versões técnicas e do relatório.

Atualizar o README das fixtures e comentários diretamente afetados. Escrever no
presente e documentar apenas o modelo final.

## Sequência De Implementação

1. Atualizar o DDL de `system` para o modelo taxonômico universal.
2. Remover as cinco colunas taxonômicas duplicadas das tabelas principais.
3. Adicionar os índices de filtro e leitura por entidade.
4. Atualizar versões técnicas, crate e schema do relatório.
5. Reduzir `SystemTable`, `SystemColumn`, `SystemRow` e identidades operacionais.
6. Projetar toda taxonomia em `taxonomy_terms`.
7. Projetar a matriz completa de campos canônicos em
   `entity_taxonomy_terms`.
8. Atualizar ownership, obrigações, ledger, métricas e relatório.
9. Atualizar writers e sua matriz estrutural exaustiva.
10. Atualizar a releitura tipada e a equivalência semântica.
11. Preservar e testar a derivação taxonômica de `entity_search_terms`.
12. Adicionar consultas representativas de filtro e leitura por entidade.
13. Adicionar testes de cardinalidade, pertencimento, ordem e adulteração.
14. Executar builds determinísticos dos seis locales e verificar reutilização.
15. Atualizar o mapa e os READMEs afetados.
16. Executar os testes específicos do `knowledge-builder`.
17. Executar o gate geral do workspace definido para implementações de plano.

## Entregáveis

- DDL `system` com taxonomias universais;
- versão técnica `system` 3;
- `knowledge-builder` 0.3.0;
- `projection-report.json` schema 4;
- contrato tipado reduzido;
- owners e obrigações para todas as relações taxonômicas;
- writers e readers do modelo universal;
- índices bidirecionais de associação;
- matriz de testes de todos os domínios e propósitos;
- adulterações semânticas da relação universal;
- mapa físico e documentação atualizados.

## Critérios De Aceite

- `taxonomy_registry` contém exatamente 13 entradas, uma para cada par canônico
  de domínio e propósito.
- `taxonomy_terms` contém todos os termos de todas as taxonomias.
- Todo termo possui `taxonomy_id` e respeita a hierarquia de seu vocabulário.
- `entity_taxonomy_terms` é a única tabela de associação taxonômica.
- Raças, fabricantes, princípios ativos, condições e produtos usam a mesma
  relação.
- Os seis propósitos taxonômicos de produto usam o mesmo contrato dos demais
  domínios.
- Não existem tabelas de termos ou relações específicas por propósito.
- Não existem `type_term_key` ou `size_term_key` nas tabelas principais.
- Não existe `relation_kind` no DDL ou no contrato de projeção.
- Campos unitários produzem exatamente uma relação e coleções preservam sua
  ordem canônica.
- Termos de outra taxonomia, domínio ou propósito são recusados.
- Os índices atendem filtros por termo e leitura ordenada por entidade.
- Labels e aliases taxonômicos continuam presentes na busca materializada.
- A matriz de writers cobre exatamente as formas e colunas vigentes.
- O verificador relê todas as linhas e recusa adulterações semanticamente
  divergentes.
- O relatório exige exatamente as tabelas do contrato vigente.
- `system` usa schema técnico 3, `system_media` usa schema técnico 2 e o relatório
  usa schema 4.
- Conteúdo, mídia, thumbnails e CAS preservam seus contratos.
- Não há alteração em apps, packages de runtime ou ramo `user`.
- O crate passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral de validação.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.7: contratos centrais do `knowledge-builder`](./01b7-central-builder-contracts.md).
