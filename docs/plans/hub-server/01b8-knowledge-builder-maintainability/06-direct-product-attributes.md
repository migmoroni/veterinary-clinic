# Parte 1B.8.6: Atributos Diretos De Produto

## Objetivo

Representar estágio de vida aplicável, perfil vacinal e espectro terapêutico
como atributos tipados do próprio produto. Esses conceitos não possuem
identidade independente, hierarquia reutilizável ou relações próprias e,
portanto, não integram o sistema universal de taxonomias.

```text
product._entity.json
├── applicableLifeStages[]
├── vaccineProfile
└── therapeuticSpectrum
        |
        v
product_catalog_items
├── applicable_life_stages_json
├── vaccine_multiplicity
├── vaccine_valence
└── therapeutic_spectrum
```

Ao final, `data/knowledge`, schemas, contratos Rust, projeção, verificação,
busca, auditoria, fixtures, testes e documentação reconhecem somente os campos
diretos. Não existem taxonomias, term keys, relações ou caminhos alternativos
para esses três conceitos.

## Pré-Requisitos

- A [Parte 1B.8.5](./05-test-topology-maintenance-guide.md) está concluída.
- `data/knowledge` passa em `knowledge-builder validate`.
- O build integral atual passa antes da primeira edição desta parte.
- A crate `artifact-builder` ainda não entra no escopo; esta parte fecha o
  contrato veterinário que ela recebe nas etapas seguintes.

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
- a arquitetura da futura crate `artifact-builder`;
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
- Valores fechados não carregam labels localizados no conhecimento. A UI
  resolve sua apresentação por i18n.
- Termos textuais úteis para busca pertencem ao nome e aos aliases localizados
  do produto; os atributos diretos continuam disponíveis como filtros
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
  "vaccineProfile": {
    "multiplicity": "multivalent",
    "valence": 8
  },
  "therapeuticSpectrum": "broad"
}
```

Os três campos são opcionais. Quando presentes, obedecem aos contratos abaixo
e são rejeitados se contiverem propriedades ou valores adicionais.

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

### 1.3 `vaccineProfile`

`vaccineProfile` possui:

| Campo | Obrigatório | Contrato |
| --- | --- | --- |
| `multiplicity` | sim | `monovalent` ou `multivalent` |
| `valence` | não | inteiro positivo que registra a valência declarada do perfil |

Regras de coerência:

- `monovalent` aceita `valence` ausente ou igual a `1`;
- `multivalent` aceita `valence` ausente ou maior ou igual a `2`;
- a valência não é calculada pela quantidade de `targetTermKeys`;
- o objeto só é aceito em produtos cujo `typeTermKey` pertence ao ramo
  `medication.biologicalAndImmunological.vaccine`;
- o objeto não repete espécie, nome localizado, sigla comercial ou alvos.

Uma vacina cujo perfil é conhecido apenas como multivalente declara somente
`multiplicity`. Códigos como `V8` e `V10`, quando relevantes à busca, permanecem
no nome ou nos aliases localizados do produto.

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

| Termo da fonte | Atributo direto |
| --- | --- |
| `puppy` | `applicableLifeStages: ["young"]` |
| `broadSpectrum` | `therapeuticSpectrum: "broad"` |
| `canine.multivalent` sem valência conhecida | `vaccineProfile.multiplicity: "multivalent"` |
| `canine.v8` | `multiplicity: "multivalent"`, `valence: 8` |
| `canine.v10` | `multiplicity: "multivalent"`, `valence: 10` |
| `feline.trivalent` | `multiplicity: "multivalent"`, `valence: 3` |
| `feline.tetravalent` | `multiplicity: "multivalent"`, `valence: 4` |
| `feline.pentavalent` | `multiplicity: "multivalent"`, `valence: 5` |

Quando um produto contém o termo geral e uma valência específica, produzir um
único `vaccineProfile`. Não copiar os prefixos `canine` ou `feline`; os táxons
canônicos do produto já expressam essa informação.

Não completar produtos sem esses fatos e não deduzir valores ausentes. Dados
novos são adicionados diretamente aos produtos em edições próprias da fonte.

### 2.3 Conteúdo Localizado E Busca

Remover as traduções pertencentes exclusivamente às três taxonomias eliminadas.
Não criar `localizedContent` dentro dos atributos diretos.

Preservar nomes e aliases que pertencem de fato ao produto. Quando uma sigla
como `V8`, `V 8` ou um termo localizado precisa localizar um produto, ela deve
estar em `localizedContent.aliases` do próprio produto, sem duplicação e sem ser
gerada a partir da taxonomia removida.

## 3. Schema E Modelo Da Fonte

Alterar `tools/knowledge-builder/schemas/source/product.schema.json` para:

- remover os três campos terminados em `TermKeys`;
- declarar `applicableLifeStages` como array opcional, com `minItems: 1`,
  `maxItems: 3`, itens únicos e enum fechado de estágios;
- declarar `vaccineProfile` como objeto fechado;
- declarar `therapeuticSpectrum` como enum opcional;
- manter `additionalProperties: false`.

Alterar `ProductEntity` e os tipos auxiliares para refletirem exatamente esse
schema. Preferir enums Rust tipados com serialização `camelCase` aos valores de
domínio representados como `String`.

Manter `SOURCE_ENTITY_SCHEMA_VERSION = 1`. O repositório possui uma única fonte
canônica ainda não publicada, todos os produtos são atualizados em conjunto e
nenhum formato alternativo é aceito.

Atualizar o digest semântico para incluir os três atributos diretos em sua forma
canônica. A remoção dos manifestos de taxonomia e a alteração de qualquer valor
direto devem mudar `sourceDigestSha256`.

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
vaccine_multiplicity TEXT,
vaccine_valence INTEGER,
therapeutic_spectrum TEXT
```

O DDL deve garantir:

- JSON válido e do tipo array para `applicable_life_stages_json`;
- `vaccine_multiplicity` nulo, `monovalent` ou `multivalent`;
- `vaccine_valence` nulo ou inteiro positivo;
- coerência entre multiplicidade e valência;
- `therapeutic_spectrum` nulo, `broad` ou `narrow`.

O builder valida os itens e a ordem de `applicable_life_stages_json` antes da
persistência. O banco recebe JSON compacto e canônico.

Incrementar `SYSTEM_SCHEMA_VERSION` de `4` para `5`. Manter
`SYSTEM_MEDIA_SCHEMA_VERSION = 2` e as demais versões técnicas sem alteração.
Atualizar `PRAGMA user_version`, metadata, schemas públicos e asserções
correspondentes. Não criar migration.

### 5.2 Row E Persistência

Adicionar os quatro valores à row tipada de produto e atualizar, como um único
contrato:

- descritor de colunas e cobertura;
- inventário esperado e `ProjectionContract`;
- writer e parâmetros de `INSERT`;
- reader estrutural e reconstrução da row observada;
- equivalência semântica e detecção de adulteração;
- fingerprints e contagens derivados do DDL.

Os três atributos não produzem rows em `entity_taxonomy_terms`. As dez
taxonomias restantes continuam sendo projetadas pelo caminho universal.

## 6. Validação E Pesquisa

### 6.1 Validação Semântica

Validar antes de projetar:

- domínio fechado, unicidade e ordem dos estágios;
- forma fechada e coerência de `vaccineProfile`;
- compatibilidade de `vaccineProfile` com o tipo vacina;
- compatibilidade de `therapeuticSpectrum` com o ramo de medicamentos;
- ausência dos três propósitos removidos no registro taxonômico;
- ausência das três chaves removidas em qualquer produto.

Os erros informam caminho do `_entity.json`, campo e valor recusado. Não
normalizar silenciosamente entrada inválida.

### 6.2 Busca E Filtros

Remover a expansão de labels e aliases das três taxonomias na formação de
`entity_search_terms`. Não transformar enums técnicos em texto localizado por
uma tabela interna do builder.

O banco oferece os campos diretos para filtros estruturados. A pesquisa textual
continua usando nome, aliases e relações canônicas. Caso um perfil ou estágio
precise participar da pesquisa por texto, o valor localizado deve estar nos
aliases do produto e seguir o caminho comum de indexação.

## 7. Auditoria E Inventários

Atualizar `scripts/audit-knowledge.mjs` para:

- tratar `data/knowledge` como sua única fonte de fatos canônicos, sem derivar
  valores esperados de defaults, catálogos ou i18n dos apps e packages;
- reconhecer os três campos diretos no contrato de produto;
- validar enums, cardinalidade, ordem e coerência;
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
- os atributos diretos de produto;
- suas colunas em `product_catalog_items`;
- a distinção entre filtro estruturado e termo textual de busca;
- o schema técnico 5 de `system`.

Toda documentação descreve somente o estado vigente após a implementação.

## 8. Testes

### 8.1 Unidade E Componentes

Cobrir:

- cada valor válido dos três contratos;
- campos ausentes;
- arrays válidos com um, dois e três estágios;
- array vazio, com mais de três itens, duplicado, fora de ordem ou com estágio
  desconhecido;
- `vaccineProfile` com propriedade extra, multiplicidade inválida e combinações
  incoerentes de valência;
- perfil vacinal em produto não vacinal;
- espectro terapêutico inválido ou em produto não medicamentoso;
- recusa das três taxonomias removidas;
- digest diferente quando qualquer atributo direto muda;
- row de produto com disposição exata das novas colunas.

### 8.2 Integração

Atualizar a fixture mínima para conter produtos que exercitem:

- aplicabilidade direta a um, dois e três estágios de vida;
- vacina multivalente com valência conhecida;
- vacina multivalente sem valência informada;
- espectro terapêutico direto;
- ausência dos três atributos.

Comprovar nos seis bancos `system`:

- dez registros em `taxonomy_registry`;
- ausência dos três propósitos e de suas associações;
- valores diretos idênticos em todos os locales;
- schema técnico 5;
- busca textual sem termos provenientes das taxonomias removidas;
- `foreign_key_check` e `integrity_check` aprovados.

Adicionar casos de adulteração para cada nova coluna e comprovar que o
verificador integral recusa a saída. Manter determinismo byte a byte entre dois
builds independentes.

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
- introduzir a crate `artifact-builder`;
- criar migrations, scripts de adoção ou suporte ao formato removido;
- completar conteúdo ausente por inferência;
- criar novas taxonomias de produto;
- alterar o contrato de `product-targets`;
- publicar artefatos no Hub ou em providers externos.

## Critérios De Aceite

- Os três conceitos existem somente como atributos diretos opcionais de
  produto.
- As três taxonomias, seus propósitos, relações, traduções e term keys não
  existem no estado final.
- `CANONICAL_TAXONOMIES` contém exatamente dez especificações.
- `product_catalog_items` contém e verifica as quatro novas colunas.
- `system` usa schema técnico 5 e `system_media` permanece em 2.
- Fonte, auditoria, builder, bancos, busca, verificador, fixtures e READMEs
  descrevem o mesmo contrato.
- Dois builds completos são determinísticos e passam por verificação integral.
- O workspace passa integralmente pela skill `$validate-workspace`.
- O diff contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.9: `artifact-builder` e adaptador de conhecimento](../01b9-artifact-builder/README.md).
