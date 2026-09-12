# Parte 1B.8.6: Atributos Diretos E Aliases De Produto

## Objetivo

Representar estágio de vida aplicável e espectro terapêutico como atributos
tipados do próprio produto. Descritores vacinais como `V10`, `polivalente` e
`tríplice felina` pertencem aos aliases localizados do produto, em texto puro.
Nenhum desses conceitos integra o sistema universal de taxonomias.

```text
product._entity.json
├── applicableLifeStages[]
├── therapeuticSpectrum
└── localizedContent.aliases[]
        |
        v
product_catalog_items
├── applicable_life_stages_json
└── therapeutic_spectrum

localizedContent.aliases[]
        |
        v
aliases_json + entity_search_terms
```

Ao final, `data/knowledge`, schemas, contratos Rust, projeção, verificação,
busca, auditoria, fixtures, testes e documentação reconhecem somente os campos
vigentes. Não existem taxonomias, term keys, relações ou caminhos alternativos
para esses conceitos. Descritores vacinais existem somente nos aliases.

## Pré-Requisitos

- A [Parte 1B.8.5](./05-test-topology-maintenance-guide.md) está concluída.
- `data/knowledge` passa em `knowledge-builder validate`.
- O build integral atual passa antes da primeira edição desta parte.

## Escopo

Esta parte altera:

- os produtos e as taxonomias em `data/knowledge/catalog`;
- o JSON Schema e os tipos Rust de `ProductEntity`;
- a matriz canônica de taxonomias;
- validação estrutural, semântica, referencial e digest da fonte;
- o DDL de `system` e a row de `product_catalog_items`;
- inventário, contrato de projeção, writers, readers e verificação integral;
- termos estruturados usados por filtros e a política de indexação textual;
- fixtures, testes unitários, componentizados e integrais;
- `scripts/audit-knowledge.mjs`, inventário e relatório da fonte;
- documentação vigente e planos consumidores desse contrato.

Esta parte não altera:

- `product-targets`, `targetTermKeys` ou seus relacionamentos taxonômicos;
- tipos e classificações de produtos;
- `applicableTaxonIds` ou a taxonomia de vida;
- produtos, mídia ou bancos do ramo `user`;
- consumo do banco nos apps;
- contratos de distribuição do Hub.

## Invariantes

- Cada fato possui uma única representação canônica.
- Ausência de um campo opcional significa dado não informado; não significa
  todos, nenhum ou um valor padrão inferido.
- Diretório, nome comercial, aliases, alvos clínicos e quantidade de alvos não
  são usados para inferir atributos diretos.
- Espécie ou outro táxon aplicável pertence exclusivamente a
  `applicableTaxonIds`.
- Doenças, patógenos e parasitas alvo pertencem exclusivamente a
  `targetTermKeys`.
- Valores fechados dos atributos estruturados não carregam labels localizados
  no conhecimento. A UI resolve sua apresentação por i18n.
- Descritores vacinais são strings explícitas em `localizedContent.aliases`.
  Eles não possuem códigos semânticos, chaves, enum, objeto próprio ou projeção
  estrutural.
- Termos textuais úteis para busca pertencem ao nome e aos aliases localizados
  do produto. Os atributos diretos continuam disponíveis como filtros
  estruturados.
- Não existem leitura dupla, aliases para os campos removidos, conversor
  persistente, migration ou fallback.
- A ordem dos arrays e a serialização JSON produzida pelo builder são
  determinísticas.

## 1. Contrato Canônico Do Produto

### 1.1 Forma Completa

Um produto pode declarar:

```json
{
  "applicableLifeStages": ["young"],
  "therapeuticSpectrum": "broad",
  "localizedContent": {
    "aliases": {
      "pt-BR": ["V10", "V 10", "polivalente"]
    }
  }
}
```

O recorte de `localizedContent` ilustra a propriedade dos termos; o manifesto
completo mantém os seis locales exigidos pelo contrato vigente. Os dois
atributos estruturados são opcionais. Quando presentes, obedecem aos contratos
abaixo.

### 1.2 `applicableLifeStages`

`applicableLifeStages` é um array com um, dois ou três itens, sem duplicatas,
formado somente por:

```text
newborn
young
adult
```

O array usa sempre essa ordem canônica. Esses valores são os mesmos estágios
estruturais usados em `LifeEntity.bodyMetrics.stageMetrics`, sem criar uma
referência taxonômica entre os dois objetos.

Um produto aplicável aos três estágios declara explicitamente:

```json
{
  "applicableLifeStages": ["newborn", "young", "adult"]
}
```

Combinações parciais preservam a mesma ordem relativa. Por exemplo,
`["newborn", "adult"]` é válido, enquanto `["adult", "newborn"]` é recusado.
O campo ausente significa que a aplicabilidade por estágio não está informada;
o builder não o interpreta como aplicabilidade aos três estágios.

O estágio não embute espécie. O par semântico é formado pelo estágio e pelos
IDs já presentes em `applicableTaxonIds`. O valor `puppy` da autoria existente
é expresso como `young` em produtos aplicáveis a `canis-lupus-familiaris`.

### 1.3 Descritores Vacinais Em Aliases

Cada descrição usada para apresentar ou localizar uma vacina é armazenada como
string no array `localizedContent.aliases` do próprio produto e do respectivo
locale. Exemplos:

```json
{
  "localizedContent": {
    "aliases": {
      "pt-BR": ["V10", "V 10", "polivalente"],
      "pt-PT": ["V10", "V 10", "polivalente"],
      "gn-PY": ["V10", "V 10", "polivalente"],
      "en-US": ["V10", "V 10", "polyvalent"],
      "es-ES": ["V10", "V 10", "polivalente"],
      "fr-FR": ["V10", "V 10", "polyvalent"]
    }
  }
}
```

- não criar um campo estrutural próprio para esses descritores;
- não armazenar chaves como `canine.v10` ou `feline.trivalent` no produto;
- não inferir aliases pela quantidade de alvos ou pelo nome do produto;
- não repetir termos gerais de espécie, pois `applicableTaxonIds` possui essa
  responsabilidade;
- preservar somente aliases verdadeiros daquele produto, sem preencher uma
  lista padronizada automaticamente.

Os aliases usam a validação comum de texto localizado, são persistidos em
`aliases_json` e entram em `entity_search_terms` pelo fluxo comum. O builder não
possui regra vacinal específica para interpretá-los.

### 1.4 `therapeuticSpectrum`

`therapeuticSpectrum` aceita:

```text
broad
narrow
```

O campo só é aceito em produtos pertencentes ao ramo `medication`. Ele descreve
o espectro declarado do produto e não substitui seus alvos clínicos. Um produto
de amplo espectro pode continuar declarando `targetTermKeys` específicos quando
esses dados estiverem disponíveis.

## 2. Refatoração De `data/knowledge`

### 2.1 Remoção Das Taxonomias

Remover integralmente:

```text
data/knowledge/catalog/taxonomies/product-vaccine-profiles/
data/knowledge/catalog/taxonomies/product-life-stages/
data/knowledge/catalog/taxonomies/product-therapeutic-scopes/
```

Nenhum termo desses diretórios é movido para outra taxonomia. Também não criar
taxonomias substitutas em `product-classifications`.

### 2.2 Produtos

Remover de todos os `_entity.json` de produto:

```text
vaccineProfileTermKeys
lifeStageTermKeys
therapeuticScopeTermKeys
```

Aplicar aos fatos atualmente declarados a seguinte normalização explícita:

| Termo da fonte | Representação no produto |
| --- | --- |
| `puppy` | `applicableLifeStages: ["young"]` |
| `broadSpectrum` | `therapeuticSpectrum: "broad"` |
| termo vacinal referenciado | label e aliases do termo fundidos em `localizedContent.aliases.<locale>` |

Para cada produto, copiar somente os textos localizados dos termos vacinais que
ele referencia e deduplicá-los com os aliases já declarados. Não copiar chaves
taxonômicas nem termos ancestrais não referenciados; os táxons canônicos do
produto já expressam a aplicabilidade por espécie.

Não completar produtos sem esses fatos e não deduzir valores ausentes. Dados
novos são adicionados diretamente aos produtos em edições próprias da fonte.

### 2.3 Conteúdo Localizado E Busca

Distribuir os labels e aliases vacinais pertinentes nos aliases localizados dos
produtos que os utilizam. Em seguida, remover as traduções pertencentes às três
taxonomias eliminadas. Não criar `localizedContent` dentro dos atributos
diretos.

Preservar nomes e aliases que pertencem de fato ao produto. Siglas como `V8` e
`V 8`, assim como descrições como `polivalente`, são texto puro e seguem a
validação, persistência e indexação já aplicadas a qualquer alias de produto.

## 3. Schema E Modelo Da Fonte

Alterar `tools/knowledge-builder/schemas/source/product.schema.json` para:

- remover os três campos terminados em `TermKeys`;
- declarar `applicableLifeStages` como array opcional, com `minItems: 1`,
  `maxItems: 3`, itens únicos e enum fechado de estágios;
- declarar `therapeuticSpectrum` como enum opcional;
- manter `additionalProperties: false`.

Alterar `ProductEntity` e os tipos auxiliares para refletirem exatamente esse
schema. Preferir enums Rust tipados com serialização `camelCase` aos valores de
domínio representados como `String`.

Manter `SOURCE_ENTITY_SCHEMA_VERSION = 1`. O repositório possui uma única fonte
canônica ainda não publicada, todos os produtos são atualizados em conjunto e
nenhum formato alternativo é aceito.

Atualizar o digest semântico para incluir os dois atributos diretos em sua forma
canônica. A remoção dos manifestos de taxonomia, a alteração de qualquer valor
direto e a alteração dos aliases localizados devem mudar `sourceDigestSha256`.

## 4. Contrato De Taxonomias

Remover da matriz `CANONICAL_TAXONOMIES` os propósitos:

```text
product:vaccine_profile
product:life_stage
product:therapeutic_scope
```

O conjunto canônico passa de treze para dez taxonomias. Atualizar:

- cardinalidades e testes da matriz central;
- validação de registro e unicidade por domínio/propósito;
- resolução de referências de produto;
- inventários e declarações de associações taxonômicas;
- mensagens de erro e fixtures relacionadas.

`product:target`, `product:type` e `product:classification` permanecem
inalterados. Nenhum propósito genérico passa a aceitar os valores removidos.

## 5. Projeção Para `system`

### 5.1 DDL

Adicionar a `product_catalog_items`:

```sql
applicable_life_stages_json TEXT NOT NULL DEFAULT '[]',
therapeutic_spectrum TEXT
```

O DDL deve garantir:

- JSON válido e do tipo array para `applicable_life_stages_json`;
- `therapeutic_spectrum` nulo, `broad` ou `narrow`.

O builder valida os itens e a ordem de `applicable_life_stages_json` antes da
persistência. O banco recebe JSON compacto e canônico.

Incrementar `SYSTEM_SCHEMA_VERSION` de `4` para `5`. Manter
`SYSTEM_MEDIA_SCHEMA_VERSION = 2` e as demais versões técnicas sem alteração.
Atualizar `PRAGMA user_version`, metadata, schemas públicos e asserções
correspondentes. Não criar migration.

### 5.2 Row E Persistência

Adicionar os dois valores à row tipada de produto e atualizar, como um único
contrato:

- descritor de colunas e cobertura;
- inventário esperado e `ProjectionContract`;
- writer e parâmetros de `INSERT`;
- reader estrutural e reconstrução da row observada;
- equivalência semântica e detecção de adulteração;
- fingerprints e contagens derivados do DDL.

Os dois atributos não produzem rows em `entity_taxonomy_terms`. Descritores
vacinais já integram `aliases_json` e `entity_search_terms` como aliases comuns.
As dez taxonomias restantes continuam sendo projetadas pelo caminho universal.

## 6. Validação E Pesquisa

### 6.1 Validação Semântica

Validar antes de projetar:

- domínio fechado, unicidade e ordem dos estágios;
- compatibilidade de `therapeuticSpectrum` com o ramo de medicamentos;
- ausência dos três propósitos removidos no registro taxonômico;
- ausência das três chaves removidas em qualquer produto;
- validade, localização e deduplicação dos aliases vacinais como texto comum.

Os erros informam caminho do `_entity.json`, campo e valor recusado. Não
normalizar silenciosamente entrada inválida.

### 6.2 Busca E Filtros

Remover a expansão de labels e aliases das três taxonomias na formação de
`entity_search_terms`. Os descritores vacinais chegam ao índice exclusivamente
pelo fluxo já usado para `localizedContent.aliases`. Não transformar esses
textos em enums nem manter uma tabela interna no builder.

O banco oferece estágios de vida e espectro terapêutico para filtros
estruturados. A pesquisa textual continua usando nome, aliases e relações
canônicas. Descritores vacinais participam da pesquisa somente por estarem nos
aliases do produto.

## 7. Auditoria E Inventários

Atualizar `scripts/audit-knowledge.mjs` para:

- tratar `data/knowledge` como sua única fonte de fatos canônicos, sem derivar
  valores esperados de defaults, catálogos ou i18n dos apps e packages;
- reconhecer os dois atributos diretos no contrato de produto;
- validar seus enums, cardinalidade e ordem;
- tratar descritores vacinais somente como aliases localizados comuns;
- deixar de resolver ou contar referências aos três propósitos removidos;
- deixar de projetar seus labels como categorias de busca taxonômica;
- calcular as contagens de atributos diretos a partir de `data/knowledge`;
- recusar qualquer reaparecimento dos diretórios, propósitos ou campos
  removidos.

Regenerar `data/knowledge/inventory.json` e
`data/knowledge/audit-report.json` pela auditoria atualizada. As contagens são
derivadas da fonte; não fixar manualmente totais que possam mudar com edições de
conteúdo.

Atualizar `data/knowledge/README.md` e `tools/knowledge-builder/README.md` para
documentar:

- as dez taxonomias canônicas;
- os dois atributos diretos de produto;
- descritores vacinais em aliases localizados;
- suas colunas em `product_catalog_items`;
- a distinção entre filtro estruturado e termo textual de busca;
- o schema técnico 5 de `system`.

Toda documentação descreve somente o estado vigente após a implementação.

## 8. Testes

### 8.1 Unidade E Componentes

Cobrir:

- cada valor válido dos dois atributos diretos;
- campos ausentes;
- arrays válidos com um, dois e três estágios;
- array vazio, com mais de três itens, duplicado, fora de ordem ou com estágio
  desconhecido;
- aliases vacinais localizados, deduplicados e indexados como texto comum;
- espectro terapêutico inválido ou em produto não medicamentoso;
- recusa das três taxonomias removidas;
- digest diferente quando qualquer atributo direto muda;
- row de produto com disposição exata das novas colunas.

### 8.2 Integração

Atualizar a fixture mínima para conter produtos que exercitem:

- aplicabilidade direta a um, dois e três estágios de vida;
- vacina com aliases localizados como `V10` e `polivalente`;
- vacina sem descritor vacinal adicional;
- espectro terapêutico direto;
- ausência dos dois atributos diretos.

Comprovar nos seis bancos `system`:

- dez registros em `taxonomy_registry`;
- ausência dos três propósitos e de suas associações;
- valores diretos idênticos em todos os locales;
- descritores vacinais presentes em `aliases_json` e `entity_search_terms` no
  locale correto;
- schema técnico 5;
- busca textual sem termos provenientes das taxonomias removidas;
- `foreign_key_check` e `integrity_check` aprovados.

Adicionar casos de adulteração para cada uma das duas novas colunas e comprovar
que o verificador integral recusa a saída. Manter determinismo byte a byte entre
dois builds independentes.

### 8.3 Ausência Estrutural

Uma busca recursiva no estado final não encontra, fora de `docs/plans`:

```text
product-vaccine-profiles
product-life-stages
product-therapeutic-scopes
vaccineProfileTermKeys
lifeStageTermKeys
therapeuticScopeTermKeys
product:vaccine_profile
product:life_stage
product:therapeutic_scope
```

Não usar esse teste para ler código Rust e inferir arquitetura. A ausência
complementa testes comportamentais e inspeção do grafo real.

## 9. Sequência De Execução

1. Executar a referência verde da fonte e do build integral.
2. Definir os tipos e o JSON Schema dos atributos diretos.
3. Refatorar todos os produtos e remover os três diretórios taxonômicos.
4. Atualizar a matriz taxonômica e as validações da fonte.
5. Atualizar DDL, versão técnica, rows, persistência e verificação.
6. Atualizar busca, auditoria, inventários e documentação.
7. Atualizar fixtures e testes em cada camada.
8. Construir duas saídas reais independentes e verificar determinismo.
9. Executar os testes específicos e o gate geral do workspace.

Cada etapa remove o contrato substituído dentro do próprio escopo. Não deixar
um estado final que aceite simultaneamente term keys e atributos diretos.

## 10. Validação Final

Executar:

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
manifests, relatórios, checksums e conjunto CAS com a primeira.

Depois, executar a skill `$validate-workspace` e apresentar o resultado antes
de considerar esta parte concluída.

## Fora Do Escopo

- alterar rotas, repositories ou componentes dos apps;
- criar migrations, scripts de adoção ou suporte ao formato removido;
- completar conteúdo ausente por inferência;
- criar novas taxonomias de produto;
- alterar o contrato de `product-targets`;
- publicar artefatos no Hub ou em providers externos.

## Critérios De Aceite

- Estágios de vida e espectro terapêutico existem somente como atributos
  diretos opcionais de produto.
- Descritores vacinais existem somente como texto puro nos aliases localizados
  dos produtos correspondentes.
- As três taxonomias, seus propósitos, relações, traduções e term keys não
  existem no estado final.
- `CANONICAL_TAXONOMIES` contém exatamente dez especificações.
- `product_catalog_items` contém e verifica as duas novas colunas.
- `system` usa schema técnico 5 e `system_media` permanece em 2.
- Fonte, auditoria, builder, bancos, busca, verificador, fixtures e READMEs
  descrevem o mesmo contrato.
- Dois builds completos são determinísticos e passam por verificação integral.
- O workspace passa integralmente pela skill `$validate-workspace`.
- O diff contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.8.7: autoria taxonômica hierárquica](./07-hierarchical-taxonomy-authoring.md).
