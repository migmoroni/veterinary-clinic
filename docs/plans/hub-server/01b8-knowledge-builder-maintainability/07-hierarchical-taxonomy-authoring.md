# Parte 1B.8.7: Autoria Taxonômica Hierárquica

## Objetivo

Representar cada taxonomia canônica como uma floresta ordenada no arquivo de
autoria. `terms` contém as raízes e cada termo pode conter `children`. A posição
nos arrays define a ordem somente entre termos que possuem o mesmo pai.

```text
_entity.json
└── terms[]                         raízes ordenadas
    ├── key
    ├── localizedContent
    └── children[]                  filhos ordenados
        ├── key
        ├── localizedContent
        └── children[]
              |
              v
travessia canônica em profundidade
              |
              v
taxonomy_terms
├── term_key
├── parent_term_key                 derivado da árvore
└── sort_order                      posição entre irmãos
```

O formato editorial não declara `parentKey` nem `order`. O builder deriva os
dois fatos da estrutura, valida a árvore uma única vez e fornece uma visão
normalizada para referências, aliases, auditoria, projeção, busca e
verificação.

O banco `system` continua usando uma representação relacional achatada. Não são
criadas colunas de profundidade, caminho materializado, nested sets ou closure
table.

## Pré-Requisitos

- A
  [Parte 1B.8.6: atributos diretos e aliases de produto](./06-direct-product-attributes.md)
  está concluída.
- `data/knowledge` passa por auditoria, validação e build integral.
- As dez taxonomias canônicas e suas referências estão consistentes antes da
  primeira edição desta parte.

## Escopo

Esta parte altera:

- os dez manifestos taxonômicos de `data/knowledge`;
- as dez taxonomias da fixture mínima do `knowledge-builder`;
- o JSON Schema e o modelo Rust de autoria taxonômica;
- a travessia, indexação e validação das árvores;
- resolução de referências, aliases, contagens e digest semântico;
- inventário, declarações, operações, rows e evidência de projeção;
- o DDL e a semântica de `taxonomy_terms.sort_order`;
- releitura e verificação integral dos bancos;
- `scripts/audit-knowledge.mjs`, inventário e relatório da fonte;
- testes unitários, componentizados, integrais e de adulteração;
- documentação da fonte, do builder e dos planos consumidores.

Esta parte não altera:

- a identidade, o domínio ou o propósito das dez taxonomias;
- as chaves completas e o conteúdo localizado dos termos;
- os campos `typeTermKey`, `classificationTermKeys`, `targetTermKeys` ou
  `bodyMetrics.size` das entidades consumidoras;
- a semântica de `entity_taxonomy_terms.sort_order`;
- qualquer outro `sort_order` do schema;
- entidades e hierarquia de `LifeEntity`;
- bancos, mídia, CAS ou migrations do ramo `user`;
- repositories, rotas ou componentes dos apps;
- distribuição de artefatos pelo Hub.

## Invariantes

- `terms` é o array ordenado das raízes de uma taxonomia.
- `children` é o array ordenado dos filhos diretos de um termo.
- A posição no array é a única fonte da ordem entre irmãos.
- Folhas omitem `children`; um array `children` presente nunca é vazio.
- Cada `key` é uma identidade canônica opaca, completa e única dentro da
  taxonomia.
- Uma chave raiz pode ser simples ou composta por segmentos separados por
  ponto.
- Os segmentos de `key` não determinam ancestralidade, profundidade ou posição
  na árvore.
- A chave de um filho não precisa possuir a chave do pai como prefixo.
- O aninhamento é a única fonte de `parent_term_key`.
- A ordem de irmãos é a única fonte de `taxonomy_terms.sort_order`.
- Reordenar irmãos altera o digest da fonte e a ordem projetada.
- Inserir ou reordenar termos em um ramo não altera o `sort_order` de ramos
  pertencentes a outro pai.
- Chaves, diretórios, labels, aliases e ordenação alfabética não definem
  hierarquia nem ordem.
- Todas as referências externas continuam usando somente a `key` completa.
- O formato achatado não é aceito em paralelo ao formato hierárquico.
- Não existem conversor persistente, fallback, migration ou leitura dupla.

## 1. Contrato Canônico Da Fonte

### 1.1 Forma Do Manifesto

Uma taxonomia segue esta estrutura:

```json
{
  "schemaVersion": 1,
  "entityType": "taxonomy",
  "id": "condition-types",
  "domain": "condition",
  "purpose": "type",
  "terms": [
    {
      "key": "disease",
      "localizedContent": {
        "label": {
          "pt-BR": "Doença",
          "pt-PT": "Doença",
          "gn-PY": "Mba’asy",
          "en-US": "Disease",
          "es-ES": "Enfermedad",
          "fr-FR": "Maladie"
        }
      },
      "children": [
        {
          "key": "disease.geneticAndDevelopmental",
          "localizedContent": {
            "label": {
              "pt-BR": "Genética e do desenvolvimento",
              "pt-PT": "Genética e do desenvolvimento",
              "gn-PY": "Genética e do desenvolvimento",
              "en-US": "Genetic and developmental",
              "es-ES": "Genética y del desarrollo",
              "fr-FR": "Génétique et développementale"
            }
          }
        }
      ]
    }
  ]
}
```

O exemplo demonstra apenas a forma estrutural. A implementação preserva os
valores canônicos presentes em `data/knowledge` e não completa ou corrige
conteúdo clínico por inferência.

### 1.2 Termo Recursivo

O JSON Schema define um `$defs.taxonomyTerm` recursivo com:

- `key` obrigatório;
- `localizedContent` obrigatório;
- `children` opcional;
- `children` com `minItems: 1` quando presente;
- `additionalProperties: false` em todos os níveis.

`parentKey` e `order` não pertencem ao schema. Como a fonte canônica inteira é
atualizada em conjunto e não existe release pública, manter
`SOURCE_ENTITY_SCHEMA_VERSION = 1` e aceitar somente o contrato desta parte.

### 1.3 Identidade E Hierarquia

Preservar cada `key` como identidade canônica integral. O contrato sintático
vigente permite chaves simples e compostas, por exemplo:

```text
disease
disease.geneticAndDevelopmental
disease.geneticAndDevelopmental.congenitalMalformation
administrationRoute.epidural
regulatory.brazil.prescriptionOnly
```

O ponto pertence à identidade textual e pode atuar como namespace. Ele não
declara uma relação taxonômica. Portanto, uma chave composta em `terms` continua
sendo raiz e não exige que seus prefixos existam como termos. Por exemplo,
`administrationRoute.epidural` não exige a criação de
`administrationRoute`, e `regulatory.brazil.prescriptionOnly` não exige a
criação de `regulatory` ou `regulatory.brazil`.

Validar a `key` integral pelo contrato vigente e sua unicidade dentro da
taxonomia, sem decompor segmentos para inferir nós ou relações. Um termo é raiz
porque está em `terms`; um termo é filho porque está no `children` do pai. Essa
regra também permite reorganizar uma árvore sem alterar a identidade dos termos.

O builder não cria ancestrais implícitos, não move termos com base em prefixos e
não exige correspondência lexical entre as chaves de pai e filho.

### 1.4 Limites Estruturais

Aplicar antes da projeção:

- pelo menos uma raiz por taxonomia;
- no máximo 10.000 termos somados em toda a taxonomia;
- profundidade máxima de 32 níveis;
- chaves únicas considerando todos os níveis;
- conteúdo localizado válido em cada nó;
- `children` omitido em folhas;
- ausência integral de `parentKey` e `order`.

Os diagnósticos usam o caminho JSON completo do nó, por exemplo:

```text
terms.0.children.1.children.2.key
```

## 2. Refatoração De `data/knowledge`

Reestruturar todas as taxonomias canônicas:

```text
data/knowledge/catalog/taxonomies/active-ingredient-classifications/_entity.json
data/knowledge/catalog/taxonomies/active-ingredient-types/_entity.json
data/knowledge/catalog/taxonomies/condition-classifications/_entity.json
data/knowledge/catalog/taxonomies/condition-types/_entity.json
data/knowledge/catalog/taxonomies/manufacturer-classifications/_entity.json
data/knowledge/catalog/taxonomies/manufacturer-types/_entity.json
data/knowledge/catalog/taxonomies/product-classifications/_entity.json
data/knowledge/catalog/taxonomies/product-targets/_entity.json
data/knowledge/catalog/taxonomies/product-types/_entity.json
data/knowledge/life/taxonomies/sizes/_entity.json
```

Para cada manifesto:

1. colocar em `terms` somente os nós com pai nulo;
2. mover cada descendente para `children` de seu pai direto;
3. manter entre irmãos a mesma sequência canônica declarada pela fonte;
4. remover `parentKey` e `order` de todos os nós;
5. preservar `key`, `localizedContent`, labels e aliases;
6. preservar todas as referências das entidades às chaves existentes.

Taxonomias sem relações hierárquicas continuam válidas como uma lista de raízes
ordenadas. Elas também omitem `parentKey`, `order` e `children`.

Termos de raiz com chaves compostas permanecem em `terms`. Isso inclui os termos
de namespace `administrationRoute.*` em `product:classification` e
`regulatory.*` em `activeIngredient:classification`. Não criar termos
ancestrais, não renomear essas chaves e não alterar suas referências para
forçar correspondência entre identidade e estrutura.

Aplicar o mesmo contrato às dez taxonomias de:

```text
tools/knowledge-builder/fixtures/valid-minimal/taxonomies/
```

Não manter um script de conversão no repositório. A saída final contém apenas a
fonte hierárquica.

## 3. Modelo Rust E Travessia Canônica

### 3.1 Modelo De Autoria

Representar o termo recursivo aproximadamente como:

```rust
pub struct TaxonomyTerm {
    pub key: String,
    pub localized_content: LocalizedContent,
    pub children: Vec<TaxonomyTerm>,
}
```

Usar `#[serde(default, skip_serializing_if = "Vec::is_empty")]` em `children` e
manter `deny_unknown_fields`. Não manter campos Rust para `parentKey` ou
`order`.

### 3.2 Uma Única Travessia

Criar uma abstração interna única para percorrer uma taxonomia em profundidade,
em pré-ordem. Cada visita fornece:

```text
term
parentKey          null para raízes
siblingOrder       índice no array do pai
depth
sourcePath         caminho JSON completo
```

A travessia visita o pai antes dos filhos e respeita a ordem dos arrays. Todos
os subsistemas Rust que precisam enumerar termos usam essa abstração; não manter
recursões próprias em validação, aliases, referências, contagens ou projeção.

Construir durante a validação um índice fechado por chave para cada taxonomia.
Esse índice oferece consulta por identidade sem varrer recursivamente a árvore
a cada referência e conserva os metadados derivados necessários à compilação.

O índice e a travessia pertencem ao domínio de `knowledge-builder` e permanecem
internos ao compilador.

### 3.3 Consumidores Internos

Atualizar para a visão hierárquica normalizada:

- validação de árvores e conteúdo localizado;
- `collect_taxonomies` e o registro por domínio e propósito;
- resolução de `typeTermKey`, `classificationTermKeys`, `targetTermKeys` e
  `bodyMetrics.size`;
- validação de ownership de aliases;
- `localized_fragment_counts`;
- `relation_count`, contando uma relação hierárquica por termo não raiz;
- digest lógico da fonte;
- formação dos termos de pesquisa relacionados;
- inventário e contrato de projeção.

Em `validation/taxonomy.rs`, validar a sintaxe integral e a unicidade de `key`,
mas remover qualquer regra baseada em `contains('.')`, `split('.')`,
`strip_prefix(parent)` ou operação equivalente. A validação do parentesco usa o
pai fornecido pela travessia, sem comparar a grafia das duas chaves.

Incrementar `SOURCE_DIGEST_SCHEMA_VERSION` de `2` para `3`. O modelo lógico do
digest contém a árvore e sua ordem sem reintroduzir `parentKey` ou `order`.

## 4. Cobertura E Evidência De Projeção

### 4.1 Fatos Autorais

Inventário e declarações reconhecem separadamente:

- `key` como identidade do termo;
- cada valor de `localizedContent`;
- posição da raiz em `terms` ou do filho em `children`;
- relação estrutural entre filho e pai.

Usar o token de relação já existente para representar a participação do nó no
array proprietário:

```text
field      = terms                                 para uma raiz
field      = terms.<...>.children                  para um filho
position   = siblingOrder
related    = termKey
```

Essa relação cobre `sort_order`; para filhos, também cobre
`parent_term_key`. Os caminhos de campos localizados usam `sourcePath` e não um
índice global achatado.

Não criar um segundo vocabulário de tokens nem elevar
`PROJECTION_EVIDENCE_SCHEMA_VERSION` quando a forma serializada da evidência
permanecer a mesma.

### 4.2 Independência Dos Contratos

Inventário esperado e declarações operacionais continuam independentes quanto
à seleção de destinos e obrigações. Ambos consomem somente a mesma árvore já
validada e a travessia estrutural testada. Writers e readers não participam da
derivação da hierarquia autoral.

Casos de teste com expectativas literais comprovam `parent_term_key` e
`sort_order`, impedindo que um erro comum de travessia seja aceito apenas porque
duas camadas compartilham os mesmos dados validados.

## 5. Projeção Relacional

### 5.1 Semântica De `sort_order`

Em `taxonomy_terms`:

```text
parent_term_key = pai derivado do aninhamento
sort_order      = posição do termo no array de irmãos
```

Exemplo:

```text
disease                                             parent=null     order=0
disease.geneticAndDevelopmental                     parent=disease  order=0
disease.immuneAndInflammatory                       parent=disease  order=1
disease.geneticAndDevelopmental.congenitalMalformation
                                                    parent=...Developmental
                                                    order=0
```

`entity_taxonomy_terms.sort_order` continua representando a ordem dos termos
associados a uma entidade dentro da mesma taxonomia. Sua semântica e suas
constraints não mudam.

### 5.2 DDL

Em `taxonomy_terms`:

- remover `UNIQUE(taxonomy_id, sort_order)`;
- manter a chave primária `(taxonomy_id, term_key)`;
- manter a FK composta do pai dentro da mesma taxonomia;
- adicionar `CHECK(parent_term_key IS NULL OR parent_term_key <> term_key)`;
- exigir unicidade da ordem entre raízes;
- exigir unicidade da ordem entre filhos do mesmo pai.

Usar índices parciais explícitos para respeitar a semântica de `NULL` no
SQLite:

```sql
CREATE UNIQUE INDEX idx_taxonomy_terms_root_order
ON taxonomy_terms(taxonomy_id, sort_order)
WHERE parent_term_key IS NULL;

CREATE UNIQUE INDEX idx_taxonomy_terms_child_order
ON taxonomy_terms(taxonomy_id, parent_term_key, sort_order)
WHERE parent_term_key IS NOT NULL;
```

Esses índices também atendem a leitura ordenada de raízes e filhos. Não usar
sentinela textual para representar raiz.

Incrementar `SYSTEM_SCHEMA_VERSION` de `5` para `6`. Manter
`SYSTEM_MEDIA_SCHEMA_VERSION = 2` e as versões dos documentos cuja forma não
muda. Atualizar metadata, fingerprints, schemas públicos, contratos e testes
correspondentes. Não criar migration.

### 5.3 Operações E Persistência

Projetar `taxonomy_terms` em pré-ordem para que cada pai seja inserido antes dos
filhos. A row continua contendo:

```text
taxonomy_id
term_key
parent_term_key
label
normalized_label
aliases_json
sort_order
```

Atualizar como um único contrato:

- `SystemRow::TaxonomyTerm` e seu descritor;
- inventário e declarações de colunas;
- writer e bindings;
- reader estrutural;
- equivalência semântica;
- fingerprints do DDL;
- matrizes de tabela, coluna, row e parâmetros.

Não adicionar ordem global persistida. Quando um consumidor precisar da árvore
completa, ele monta a adjacency list e percorre raízes e filhos por
`sort_order`.

## 6. Verificação Integral

O verificador relê todos os termos, agrupa-os por taxonomia e reconstrói a
floresta ordenada sem depender da ordem física das rows. Para cada taxonomia,
comprovar:

- todas as FKs de pai resolvidas dentro da mesma taxonomia;
- pelo menos uma raiz;
- alcance de todos os nós a partir das raízes;
- ausência de ciclos;
- visita de cada `term_key` exatamente uma vez;
- `sort_order` contíguo de `0` a `n - 1` em cada grupo de irmãos;
- equivalência de labels, aliases, pai e ordem com o contrato compilado.

A releitura SQL usa uma ordenação total e determinística para formar seu modelo
observado. A comparação semântica não assume unicidade global de `sort_order`.

Atualizar os testes de adulteração para recusar:

- troca de pai;
- pai pertencente a outra taxonomia;
- auto-referência e ciclo entre termos;
- ordem duplicada entre raízes;
- ordem duplicada entre filhos do mesmo pai;
- lacuna na sequência de irmãos;
- inserção de ancestral ou termo ausente no contrato compilado;
- remoção de uma raiz ou de um ramo;
- alteração de label ou aliases em qualquer profundidade.

## 7. Auditoria E Inventários Da Fonte

Refatorar `scripts/audit-knowledge.mjs` para usar uma travessia recursiva que:

- conta todos os termos, não apenas raízes;
- mantém um `Map` por chave para resolução eficiente;
- valida chaves únicas dentro de cada taxonomia;
- valida profundidade e limite total;
- valida conteúdo localizado em todos os níveis;
- deriva relações somente de `terms` e `children`, sem interpretar segmentos da
  chave;
- calcula relações hierárquicas pelo número de nós não raiz;
- implementa `taxonomyHas(domain, purpose, key)` sobre o índice completo;
- recusa `parentKey`, `order` e `children: []`;
- preserva contagens derivadas exclusivamente de `data/knowledge`.

Regenerar:

```text
data/knowledge/inventory.json
data/knowledge/audit-report.json
```

As contagens de termos e relações são derivadas da fonte. Não fixar totais que
mudam quando conteúdo canônico é acrescentado.

## 8. Busca E Consumo Futuro

Labels e aliases de qualquer profundidade continuam disponíveis para relações
e busca. O builder não injeta automaticamente ancestrais na entidade associada
e não altera a cardinalidade das dez taxonomias.

O contrato de leitura adotado na Parte 1C usa:

```sql
-- raízes
WHERE taxonomy_id = ? AND parent_term_key IS NULL
ORDER BY sort_order, term_key

-- filhos diretos
WHERE taxonomy_id = ? AND parent_term_key = ?
ORDER BY sort_order, term_key
```

`term_key` atua apenas como desempate defensivo na leitura. As constraints
garantem que duas posições iguais não existam dentro do mesmo grupo.

## 9. Testes

### 9.1 Schema E Unidade

Cobrir:

- taxonomia com uma raiz e uma folha;
- taxonomia com múltiplas raízes;
- árvore com pelo menos três níveis;
- folhas sem `children`;
- recusa de `children: []`;
- recusa de `parentKey` e `order` em qualquer profundidade;
- chave duplicada em ramos distintos;
- aceitação de raízes com chaves simples e compostas;
- ausência de ancestral implícito para uma raiz com chave composta;
- aceitação de filho cuja chave não codifica a chave do pai;
- profundidade acima do limite;
- total de termos acima do limite;
- locale, label ou aliases inválidos em nó profundo;
- caminho de diagnóstico correspondente ao local real no JSON.

### 9.2 Travessia E Referências

Comprovar por expectativas literais:

- percurso em pré-ordem;
- pai derivado para cada nó;
- `siblingOrder` reiniciado em cada grupo;
- caminho JSON de cada visita;
- identidade preservada ao mover um termo entre pais sem renomear sua `key`;
- índice contendo raízes e descendentes;
- resolução de referências para termos profundos;
- recusa de referência inexistente ou pertencente a outro vocabulário;
- detecção de colisões de aliases em qualquer profundidade;
- contagens de fragmentos e relações abrangendo a árvore inteira;
- digest diferente após reordenar irmãos ou mover um ramo;
- digest estável diante de mudança apenas na disposição das pastas.

### 9.3 Projeção E Integração

Comprovar nos seis bancos `system`:

- todas as taxonomias e todos os nós materializados;
- pais e filhos com FKs válidas;
- raízes ordenadas localmente;
- filhos ordenados localmente e com índices reiniciados em `0`;
- posições iguais permitidas quando os pais são diferentes;
- inserção de um nó em um ramo sem renumerar outro ramo;
- referências de entidades resolvidas para termos profundos;
- labels e aliases corretos para cada locale;
- termos relacionados presentes em `entity_search_terms`;
- `foreign_key_check` e `integrity_check` aprovados;
- schema técnico `6` em `system` e `2` em `system_media`;
- equivalência entre contrato, rows relidas e evidência;
- determinismo byte a byte entre duas construções independentes.

## 10. Documentação

Atualizar `data/knowledge/README.md` e `tools/knowledge-builder/README.md` para
documentar:

- taxonomia como floresta ordenada de raízes e filhos;
- `children` como estrutura autoral;
- chaves opacas, simples ou compostas, e referências por identidade;
- ausência de ancestralidade implícita nos segmentos de `key`;
- ordem local entre irmãos;
- projeção achatada em `taxonomy_terms`;
- consultas de raízes e filhos;
- versão técnica `6` de `system`;
- procedimento para adicionar raiz, filho e novo nível com testes.

Toda documentação usa o contrato hierárquico como estado vigente. Não incluir
exemplos com `parentKey`, `order` ou ordem global de termos.

## 11. Sequência De Execução

1. Executar auditoria, validação, testes e build integral de referência.
2. Definir o termo recursivo no JSON Schema e no modelo Rust.
3. Implementar e testar a travessia e o índice taxonômico centrais.
4. Reestruturar a fixture mínima e os dez manifestos canônicos.
5. Adaptar validação, referências, aliases, contagens e digest.
6. Adaptar inventário, declarações, operações e evidência.
7. Atualizar DDL, versão técnica, projeção, reader e verificador.
8. Atualizar auditoria, inventários e documentação.
9. Executar testes específicos, dois builds reais e o gate geral do workspace.

Não deixar uma etapa final que aceite as duas formas de autoria. As alterações
de schema, fonte e consumidores internos são concluídas no mesmo escopo.

## 12. Validação

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

- alterar o conjunto ou a finalidade das dez taxonomias;
- completar, traduzir ou corrigir conteúdo de domínio por inferência;
- renomear chaves referenciadas pelas entidades;
- criar closure table, nested sets, materialized path ou cache de descendentes;
- alterar a hierarquia própria de `LifeEntity`;
- alterar `entity_taxonomy_terms.sort_order` ou outros campos de ordem;
- criar migrations, scripts de adoção ou suporte ao formato substituído;
- alterar consumo nos apps ou publicar artefatos.

## Critérios De Aceite

- Os dez `_entity.json` canônicos representam raízes e filhos por aninhamento.
- Nenhum manifesto taxonômico contém `parentKey` ou `order`.
- Folhas omitem `children` e nós intermediários possuem arrays não vazios.
- Raízes aceitam chaves simples ou compostas sem criação de ancestrais
  implícitos.
- Identidade e hierarquia permanecem independentes: `key` identifica o termo e
  o aninhamento determina seu pai.
- Uma única travessia Rust fornece pai, ordem entre irmãos, profundidade e
  caminho de origem aos subsistemas do builder.
- Todas as referências encontram termos em qualquer profundidade pelo índice
  validado.
- `taxonomy_terms.parent_term_key` deriva do aninhamento.
- `taxonomy_terms.sort_order` é local ao pai, incluindo o grupo de raízes.
- O DDL impede posições duplicadas entre irmãos e permite a mesma posição sob
  pais diferentes.
- O verificador reconstrói e valida integralmente cada floresta.
- Auditoria, inventário, digest, busca, cobertura e evidência percorrem todos os
  níveis.
- `system` usa schema técnico `6`; `system_media` permanece em `2`.
- Dois builds completos são determinísticos e passam pela verificação integral.
- O workspace passa pela skill `$validate-workspace`.
- O diff contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.8.8: taxonomia hierárquica da vida](./08-life-hierarchy-taxonomy.md).
