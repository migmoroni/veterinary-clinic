# Parte 1B.7: Contratos Centrais Do `knowledge-builder`

## Objetivo

Estabelecer um registro central, tipado e coeso para os valores contratuais que
atravessam mais de um subsistema do `knowledge-builder`. Versões públicas,
locales, identidades técnicas dos bancos, identidade dos artefatos e a matriz
taxonômica possuem uma única definição Rust consumida por validação, projeção,
verificação e testes.

```text
contracts/
├── artifact.rs
├── database.rs
├── locale.rs
├── taxonomy.rs
└── version.rs
```

Esta parte também torna completo o contrato taxonômico: uma fonte canônica
válida contém exatamente os 13 pares de domínio e propósito declarados na matriz
central.

## Pré-Requisito

A [Parte 1B.6](./01b6-universal-taxonomy-projection.md) está concluída. O
`knowledge-builder` projeta todas as taxonomias em `taxonomy_registry` e
`taxonomy_terms`, usa `entity_taxonomy_terms` como relação universal e gera
artefatos `system` com schema técnico 3.

## Resultado Esperado

- valores contratuais transversais possuem uma única definição Rust;
- módulos consumidores deixam de repetir versões, nomes de artefatos,
  descritores CAS, locales, application IDs ou a matriz taxonômica;
- as 13 taxonomias canônicas são descritas por uma única coleção tipada;
- validação da fonte exige igualdade exata entre taxonomias observadas e
  esperadas;
- validação da projeção deriva domínio, propósito e cardinalidade da mesma
  matriz;
- JSON Schemas e DDLs permanecem arquivos declarativos e têm sua equivalência
  com os contratos Rust comprovada por testes;
- constantes pertencentes somente a um subsistema continuam próximas de seu
  proprietário;
- o formato físico dos bancos e os formatos públicos dos documentos permanecem
  inalterados;
- o crate usa versão `0.3.1`.

## Escopo

- criar `tools/knowledge-builder/src/contracts/`;
- centralizar contratos transversais de artefatos, bancos, locales, taxonomias e
  versões;
- adaptar todos os consumidores Rust aos novos contratos;
- remover listas e literais contratuais duplicados dentro do crate;
- exigir o conjunto taxonômico canônico completo;
- atualizar fixtures e testes para a validação fechada;
- comprovar alinhamento com JSON Schemas e DDLs;
- atualizar a documentação interna do builder;
- elevar a versão do crate e do lockfile para `0.3.1`.

## Fora Do Escopo

- concentrar todos os literais do código em um arquivo genérico;
- mover limites exclusivos de mídia, regras de Markdown ou mensagens de erro;
- mover nomes de tabelas e colunas para fora de `SystemTable`, `SystemColumn` e
  do DDL canônico;
- gerar DDL ou JSON Schema dinamicamente;
- alterar `data/knowledge` ou seus schemas de autoria;
- adicionar, remover ou renomear locales e taxonomias;
- alterar a estrutura de `system`, `system_media`, relatórios ou CAS;
- alterar apps, packages de runtime, Hub ou ramo `user`;
- criar migrations, conversões, backfills ou caminhos alternativos de leitura;
- adicionar dependências.

## 1. Fronteira Dos Contratos

Criar o módulo privado `contracts` na raiz do crate:

```text
tools/knowledge-builder/src/contracts/
├── mod.rs
├── artifact.rs
├── database.rs
├── locale.rs
├── taxonomy.rs
└── version.rs
```

`lib.rs` declara `mod contracts`. Somente tipos que já fazem parte da API
pública, como `KnowledgeLocale` e `LOCALES`, são reexportados pelo crate. Os
demais contratos permanecem `pub(crate)`.

O módulo não atua como configuração mutável. Todos os valores são compilados,
versionados junto ao builder e representam o contrato aceito ou emitido pelo
binário.

### Critério De Inclusão

Um valor entra em `contracts/` quando atende pelo menos uma destas condições:

- identifica um formato serializado público ou um banco;
- é consumido por dois ou mais subsistemas independentes;
- participa da validação e também da produção ou verificação;
- sua alteração exige revisão coordenada de artefatos, schemas ou consumers.

Um valor permanece no módulo proprietário quando define apenas sua implementação
interna. Não criar `constants.rs`, `misc.rs` ou outro agrupamento sem domínio.

## 2. Matriz Taxonômica Única

### Contrato Tipado

Definir em `contracts/taxonomy.rs`:

```rust
pub(crate) enum TaxonomyCardinality {
    ExactlyOne,
    ZeroOrMore,
}

pub(crate) struct TaxonomySpec {
    pub domain: &'static str,
    pub purpose: &'static str,
    pub cardinality: TaxonomyCardinality,
}

pub(crate) const CANONICAL_TAXONOMIES: [TaxonomySpec; 13] = [/* ... */];
```

A matriz contém:

| Domínio | Propósito | Cardinalidade por entidade |
| --- | --- | --- |
| `breed` | `size` | `ExactlyOne` |
| `manufacturer` | `type` | `ExactlyOne` |
| `manufacturer` | `classification` | `ZeroOrMore` |
| `active_ingredient` | `type` | `ExactlyOne` |
| `active_ingredient` | `classification` | `ZeroOrMore` |
| `condition` | `type` | `ExactlyOne` |
| `condition` | `classification` | `ZeroOrMore` |
| `product` | `type` | `ExactlyOne` |
| `product` | `classification` | `ZeroOrMore` |
| `product` | `target` | `ZeroOrMore` |
| `product` | `vaccine_profile` | `ZeroOrMore` |
| `product` | `life_stage` | `ZeroOrMore` |
| `product` | `therapeutic_scope` | `ZeroOrMore` |

Fornecer funções de consulta sem alocação desnecessária:

```rust
pub(crate) fn taxonomy_spec(
    domain: &str,
    purpose: &str,
) -> Option<&'static TaxonomySpec>;

pub(crate) fn taxonomy_domains() -> impl Iterator<Item = &'static str>;
```

Não manter outra allowlist de domínio e propósito em validação, projeção ou
testes de unidade.

### Completude Da Fonte

Depois de coletar as taxonomias, `validate_source` compara os pares observados
com `CANONICAL_TAXONOMIES`:

```text
expected = {(domain, purpose) da matriz}
observed = {(domain, purpose) da fonte}

missing    = expected - observed
unexpected = observed - expected
```

A validação emite diagnósticos determinísticos e ordenados para cada par ausente
ou não permitido. Uma fonte parcial não chega à projeção, mesmo quando nenhuma
entidade referencia a taxonomia ausente.

Continuar recusando:

- proprietário duplicado para o mesmo par;
- ID de taxonomia duplicado;
- termos repetidos ou pertencentes a outro vocabulário;
- ciclos e pais inexistentes;
- relações com domínio ou propósito incompatível.

### Cardinalidade Da Projeção

`validate_universal_taxonomies` consulta a matriz para:

- reconhecer domínios e propósitos permitidos;
- validar que `entity_type` coincide com o domínio;
- exigir uma relação para cada especificação `ExactlyOne` da entidade;
- permitir zero ou mais relações nas especificações `ZeroOrMore`;
- rejeitar relações para pares que não existem no contrato.

Remover a lista local de 13 pares e a condição específica que distingue
`breed:size` de `*:type`. A matriz central fornece ambas as decisões.

## 3. Versões De Contrato

Definir em `contracts/version.rs` constantes com nomes sem ambiguidade:

```rust
pub(crate) const SOURCE_ENTITY_SCHEMA_VERSION: u32 = 1;
pub(crate) const SOURCE_DIGEST_SCHEMA_VERSION: u32 = 1;
pub(crate) const CONTENT_DOCUMENT_SCHEMA_VERSION: u32 = 1;
pub(crate) const BUILD_CONTEXT_SCHEMA_VERSION: u32 = 1;
pub(crate) const BUILD_RESULT_SCHEMA_VERSION: u32 = 1;
pub(crate) const PROJECTION_REPORT_SCHEMA_VERSION: u32 = 4;
pub(crate) const PROJECTION_EVIDENCE_SCHEMA_VERSION: u32 = 1;
pub(crate) const SYSTEM_SCHEMA_VERSION: u32 = 3;
pub(crate) const SYSTEM_MEDIA_SCHEMA_VERSION: u32 = 2;
```

Usar as constantes na validação, DTOs emitidos, metadados SQLite, cálculo de
evidência, reutilização e verificador. Remover números equivalentes desses
fluxos quando representam o mesmo contrato.

O crate continua obtendo sua própria versão por `env!("CARGO_PKG_VERSION")`.
Não duplicar `0.3.1` em uma constante Rust.

### Arquivos Declarativos

JSON Schemas continuam declarando seus `const` numericamente. Adicionar testes
que carreguem os schemas incorporados e comparem cada versão declarada com a
constante Rust correspondente.

O mesmo princípio vale para `PRAGMA user_version`: o DDL continua em SQL e o
valor aplicado e verificado vem do contrato Rust.

Não elevar versões de schema nesta parte. A reorganização não modifica seus
formatos.

## 4. Identidade Dos Bancos

Definir em `contracts/database.rs` as identidades técnicas dos dois bancos:

```rust
pub(crate) struct DatabaseIdentity {
    pub schema_version: u32,
    pub application_id: u32,
    pub artifact_filename: &'static str,
}
```

Declarar uma identidade para:

- `system`: schema 3, application ID `0x564b5359` e
  `veterinary_clinic_system.db`;
- `system_media`: schema 2, application ID `0x564b534d` e
  `veterinary_clinic_system_media.db`.

As identidades referenciam `SYSTEM_SCHEMA_VERSION` e
`SYSTEM_MEDIA_SCHEMA_VERSION`, sem repetir seus numerais. `DatabaseKind` resolve
sua `DatabaseIdentity` e a usa em criação, validação, fingerprint, projeção,
reutilização e verificação de caminhos. Não repetir nomes de arquivos ou
application IDs nesses consumidores.

Os DDLs continuam pertencendo a `databases` e aos arquivos em
`schemas/system*/`. O registro central não contém SQL.

## 5. Locales Suportados

Mover `KnowledgeLocale` e `LOCALES` para `contracts/locale.rs`, preservando sua
API pública por reexport em `lib.rs`.

O contrato mantém exatamente:

```text
pt-BR
pt-PT
gn-PY
en-US
es-ES
fr-FR
```

Fonte, conteúdo localizado, filesystem, validação, digest, projeção, relatório e
verificador usam esse mesmo tipo e a mesma coleção. `Localized<T>` permanece em
`source`, pois representa o modelo de autoria e não a identidade global do
locale.

Adicionar testes que comprovem:

- seis valores únicos e em ordem determinística;
- conversão textual exata;
- cobertura equivalente nos schemas de fonte;
- aceitação dos mesmos valores pelas constraints de locale dos dois DDLs.

Não gerar schemas ou SQL a partir de `LOCALES`; comprovar a equivalência entre
as representações versionadas.

## 6. Identidade Dos Artefatos

Definir em `contracts/artifact.rs` os valores públicos usados por produção,
reutilização e verificação:

```rust
pub(crate) const BUILD_RESULT_FILENAME: &str = "build-result.json";
pub(crate) const PROJECTION_REPORT_FILENAME: &str = "projection-report.json";
pub(crate) const CHECKSUMS_FILENAME: &str = "checksums.sha256";
pub(crate) const VERSIONS_DIRECTORY: &str = "versions";
pub(crate) const LOCALES_DIRECTORY: &str = "locales";
pub(crate) const CAS_ROOT: &str = "CAS/system";
pub(crate) const CAS_ALGORITHM: &str = "sha256";
pub(crate) const CAS_HASH_ENCODING: &str = "lowercase_hex";
pub(crate) const CAS_LAYOUT: &str = "sha256_hex_2_2_bin";
pub(crate) const CAS_PATH_PATTERN: &str =
    "{hash[0..2]}/{hash[2..4]}/{hash}.bin";
```

Build, verificador e reutilização usam essas constantes para os campos e nomes
de arquivos do contrato. `artifact.rs` também fornece construtores tipados de
caminhos relativos para a raiz de uma versão e para os artefatos de um locale;
consumers não recompõem `versions/<build_version>/locales/<locale>/...` com
literais próprios. A função que resolve fisicamente um objeto CAS continua em
`media`, pois valida hashes e implementa a disposição fragmentada.

Não centralizar caminhos temporários, nomes de diretórios de teste ou mensagens
de diagnóstico.

## 7. Adaptação Dos Consumers

Atualizar os imports e remover definições equivalentes em:

- `source` e validação;
- `databases`;
- `projection`, contratos e writers;
- ledger e evidência;
- relatórios e schemas;
- reutilização e `ArtifactVerifier`;
- testes unitários e integrais.

O fluxo final permanece:

```text
contracts
-> validação da fonte
-> ProjectionContract
-> writers
-> artefatos
-> ArtifactVerifier
```

Módulos de negócio não alteram valores contratuais localmente. Toda mudança
futura em um contrato começa em seu arquivo proprietário dentro de
`contracts/`, seguida pela atualização deliberada dos schemas declarativos e
testes de equivalência aplicáveis.

## 8. Fixtures E Testes

### Fonte Mínima Válida

Atualizar `fixtures/valid-minimal` para conter as 13 taxonomias canônicas com
termos mínimos válidos e o conjunto completo de locales. Não criar modo de
validação permissivo para fixtures.

Adicionar teste que copie a fixture, remova uma taxonomia e exija diagnóstico
de par ausente antes da projeção.

### Matriz Taxonômica

Cobrir:

- exatamente 13 especificações;
- unicidade de `domain + purpose`;
- domínio e propósito não vazios;
- cardinalidades esperadas;
- igualdade exata entre matriz e fonte válida;
- rejeição de taxonomia ausente, adicional ou duplicada;
- validação de relações unitárias e plurais derivada da matriz;
- ausência de allowlists taxonômicas paralelas nos fluxos de produção.

### Contratos Técnicos

Cobrir:

- versões Rust iguais aos `const` dos JSON Schemas;
- metadados e DTOs emitindo as versões centrais;
- digest lógico da fonte e evidência de projeção usando suas versões centrais;
- `DatabaseKind` resolvendo schema, application ID e filename corretos;
- build e verificador usando os mesmos nomes de artefato;
- construtores de caminhos produzindo a árvore pública esperada sem segmentos
  absolutos ou normalização ambígua;
- descritores CAS iguais no build e no verificador;
- locales Rust alinhados aos schemas e DDLs;
- geração determinística dos seis locales;
- reutilização de uma versão integral válida;
- recusa das adulterações já cobertas pelo verificador.

### Qualidade Estrutural

Preservar os testes fechados de `SystemTable`, `SystemColumn`, `SystemRow`, SQLs
e schema fingerprint. A reorganização não reduz a cobertura estrutural das
partes anteriores.

## 9. Versões E Documentação

- elevar `tools/knowledge-builder/Cargo.toml` de `0.3.0` para `0.3.1`;
- atualizar `Cargo.lock`;
- manter `system` em schema 3;
- manter `system_media` em schema 2;
- manter `projection-report.json` em schema 4;
- manter `build-result.json`, contexto, fonte, conteúdo e evidência em seus
  schemas 1;
- atualizar `tools/knowledge-builder/README.md` com a fronteira de
  `contracts/`;
- documentar como adicionar ou alterar um contrato sem criar definições
  paralelas;
- atualizar o README das fixtures com o conjunto mínimo fechado.

Escrever no presente e documentar somente o contrato vigente.

## Sequência De Implementação

1. Criar `contracts/` e seus cinco módulos coesos.
2. Centralizar as versões dos formatos e bancos.
3. Centralizar identidades técnicas e filenames dos bancos.
4. Mover `KnowledgeLocale` e `LOCALES` preservando os reexports públicos.
5. Centralizar nomes e descritores públicos dos artefatos.
6. Implementar `TaxonomySpec`, cardinalidade e a matriz de 13 entradas.
7. Fazer a validação da fonte exigir igualdade taxonômica exata.
8. Fazer a validação da projeção derivar permissões e cardinalidade da matriz.
9. Remover constantes e allowlists equivalentes dos consumers.
10. Atualizar a fixture mínima para o contrato completo.
11. Adicionar testes taxonômicos e de alinhamento dos contratos declarativos.
12. Executar builds determinísticos dos seis locales e verificar reutilização.
13. Atualizar versão do crate, lockfile e documentação.
14. Executar formatação, compilação, Clippy e testes do `knowledge-builder`.
15. Executar o gate geral do workspace definido para implementações de plano.

## Entregáveis

- módulo `contracts/` organizado por responsabilidade;
- matriz taxonômica única e tipada;
- validação fechada das 13 taxonomias;
- versões de contrato centralizadas;
- identidades de bancos centralizadas;
- locale público com definição única;
- identidade pública dos artefatos centralizada;
- consumers sem definições contratuais paralelas;
- fixtures representando a fonte mínima completa;
- testes de alinhamento entre Rust, JSON Schema e DDL;
- `knowledge-builder` 0.3.1;
- documentação atualizada.

## Critérios De Aceite

- Existe um único `CANONICAL_TAXONOMIES` com 13 especificações.
- Não existem allowlists paralelas de domínio e propósito.
- A fonte é recusada quando qualquer taxonomia canônica está ausente.
- Taxonomias adicionais ou duplicadas são recusadas.
- Cardinalidades da relação universal são derivadas de `TaxonomySpec`.
- `KnowledgeLocale` e `LOCALES` possuem uma única definição.
- Cada versão serializada ou técnica centralizada é usada por todos os seus
  produtores e verificadores.
- `DatabaseKind` resolve schema, application ID e filename por uma única
  identidade.
- Build, reutilização e verificador usam os mesmos nomes e descritores de
  artefato.
- JSON Schemas e DDLs permanecem declarativos e têm equivalência testada.
- Não existe módulo genérico de constantes.
- Constantes internas de mídia, Markdown, tabelas e colunas permanecem com seus
  proprietários.
- O DDL continua com 18 tabelas de `system` e 3 de `system_media`.
- Os formatos públicos e a disposição CAS permanecem inalterados.
- O crate usa versão 0.3.1 e passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral de validação.
- O estado Git após as validações contém somente as mudanças desta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.7A: taxonomia animal canônica](./01b7a-canonical-animal-taxonomy.md).
