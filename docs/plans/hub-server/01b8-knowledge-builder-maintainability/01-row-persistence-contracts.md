# Parte 1B.8.1: Contratos De Rows E Persistência

## Objetivo

Consolidar o contrato estrutural de cada `SystemRow` para que payload, caso,
tabela, identidade lógica e sequência de colunas materializadas possuam um único
proprietário Rust. Writers e readers continuam independentes em seus SQLs, mas
convergem para a mesma row tipada e para uma comparação semântica exata.

```text
SystemRow
-> SystemRowDescriptor
   -> caso fechado
   -> tabela
   -> identidade lógica
   -> colunas ordenadas

writer SQL fixo -> banco SQLite -> reader SQL independente -> SystemRow
```

## Pré-Requisitos

- A [Parte 1B.7A](../01b7a-canonical-life-taxonomy.md) está concluída.
- O builder usa `life_reference_items`, 13 taxonomias canônicas, schema 4 de
  `system`, relatório 5 e versão `0.4.0` do crate.
- O gate geral do workspace está verde antes da primeira edição desta parte.
- Falhas fora de `tools/knowledge-builder` são apresentadas ao usuário e
  resolvidas em tarefa própria ou mediante autorização explícita. Esta parte não
  altera `packages/engine`, apps ou outros packages.

## Invariantes

- DDLs, schemas técnicos, tabelas, colunas, índices e application IDs não mudam.
- `SystemRow` continua sendo enum fechado e tipado.
- SQLs de inserção e releitura permanecem literais estáticas revisáveis.
- O reader não deriva `SELECT` do writer nem reutiliza sua literal de `INSERT`.
- Toda coluna persistida participa da row reconstruída e da igualdade.
- A comparação semântica não ignora campos e não aplica normalização posterior
  capaz de ocultar divergências.
- `MetadataRow` e `SystemMediaRow` permanecem tipadas; esta parte não cria uma
  abstração genérica de persistência para as três famílias.
- Não há migrations, formatos paralelos ou mudanças em `data/knowledge`.

## 1. Referência Temporária Da Execução

Antes das alterações, gerar uma build integral a partir de `data/knowledge` e
guardar a saída em:

```text
target/knowledge-builder-maintainability/reference/
├── artifacts/
├── change-surface.md
└── measurements.json
```

`measurements.json` registra:

- versão do crate;
- comandos executados;
- tempo de `cargo test -p knowledge-builder --lib`;
- tempo da suíte integral do crate;
- quantidade de chamadas que constroem os seis locales;
- lista dos cenários de adulteração ativos.

`change-surface.md` registra, somente para a comparação desta execução, os
proprietários e as declarações afetadas por quatro mudanças hipotéticas:

1. adicionar um campo localizado a uma entidade projetada;
2. adicionar uma relação ordenada entre entidades existentes;
3. adicionar uma forma de row a uma tabela existente;
4. adicionar uma tabela pública e sua releitura semântica.

Classificar cada declaração como contrato proprietário, prova independente ou
repetição sem prova própria. A Parte 1B.8.5 repete a análise sobre o estado final.

Essa referência é ignorada pelo Git, não integra testes permanentes e não é uma
fonte de execução do builder. Ela existe somente até a comparação final da Parte
1B.8.5. Não copiar binário, código, bancos ou manifests de referência para
diretórios rastreados.

## 2. Contrato Alvo

Definir tipos fechados equivalentes a:

```rust
pub(crate) enum SystemRowCase {
    TaxonomyRegistry,
    TaxonomyTerm,
    GeoPlace,
    Life,
    LifeOrigin,
    Manufacturer,
    ActiveIngredient,
    Condition,
    Product,
    EntityTaxonomy,
    ProductActiveIngredient,
    TreatmentProtocol,
    TreatmentProtocolItem,
    TreatmentProtocolDose,
    SearchTerm,
    MediaReference,
}

pub(crate) struct RowIdentity(String);

pub(crate) struct SystemRowDescriptor {
    pub case: SystemRowCase,
    pub table: SystemTable,
    pub identity: RowIdentity,
    pub columns: &'static [SystemColumn],
}

impl SystemRow {
    pub(crate) fn descriptor(&self) -> SystemRowDescriptor;
}
```

Os nomes podem ser ajustados ao estilo do crate, mas o contrato final possui uma
única operação exaustiva que associa cada variante aos quatro fatos. Métodos de
conveniência como `table()` ou `logical_row_id()` apenas delegam ao descritor;
eles não mantêm novos matches.

`columns` preserva a ordem física da literal `INSERT`, não apenas um conjunto.
Isso permite verificar simultaneamente presença e posição das colunas.

## 3. Organização

Organizar o contrato próximo de `SystemRow`, por exemplo:

```text
projection/contract/rows/
├── mod.rs
├── model.rs
└── descriptor.rs
```

Não concentrar writers ou readers nesse diretório. A navegação deve ser direta:

```text
row tipada -> descriptor
row tipada -> writer fixo
tabela     -> reader independente
```

Remover os matches substituídos em `row_table.rs`, `row_identity.rs` e
`row_columns.rs`. Não manter os arquivos como wrappers ou reexports de
uma segunda API para o mesmo contrato.

## 4. Writer

`system_insert_statement` seleciona a literal SQL por `SystemRowCase` e usa a
tabela declarada pelo descritor. O binding dos valores continua exaustivo sobre
`SystemRow` e não monta SQL dinamicamente.

O teste estrutural interpreta a literal realmente executada e exige:

- tabela igual a `descriptor.table`;
- colunas iguais a `descriptor.columns`, inclusive ordem;
- um caso de writer para cada `SystemRowCase`;
- um binding fechado para cada variante;
- nenhuma coluna desconhecida, repetida ou omitida.

## 5. Reader

O reader mantém uma query literal por tabela projetável e reconstrói todas as
variantes de `SystemRow`. A chave do mapa observado usa `row.descriptor().identity`.

A equivalência permanece:

```text
BTreeMap<SystemTable, BTreeMap<RowIdentity, SystemRow>>
```

Rows esperadas e observadas são comparadas por igualdade integral. JSONs já
normalizados antes da escrita permanecem strings canônicas; o reader não os
renormaliza para fazer uma divergência desaparecer.

## 6. Testes Específicos

Cobrir:

- os 16 casos fechados e únicos;
- tabela, identidade e colunas ordenadas de cada caso;
- todas as colunas de `SystemColumn` usadas ao menos por uma row aplicável;
- parsing estrutural de todos os `INSERT`;
- round-trip SQLite de cada família de row;
- detecção de coluna, ordem, identidade e payload divergentes;
- continuidade das adulterações semânticas existentes.

Executar:

```text
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets
cargo clippy -p knowledge-builder --all-targets -- -D warnings
cargo test -p knowledge-builder --lib
cargo test -p knowledge-builder --all-targets --locked
```

## Fora Do Escopo

- alterar ownership, journals ou recibos;
- decompor `ArtifactVerifier`;
- introduzir a taxonomia final de erros;
- reorganizar toda a suíte integral;
- elevar a versão do crate;
- criar traits para bancos ou backends inexistentes;
- criar macro, geração de código ou registro dinâmico que esconda os casos de
  row.

## Critérios De Aceite

- Existe uma única declaração exaustiva de caso, tabela, identidade e colunas de
  cada `SystemRow`.
- Não existem matches paralelos em `row_table`, `row_identity` e `row_columns`.
- Writers usam SQL fixo e readers usam SQL independente.
- A ordem das colunas do contrato coincide com a ordem de cada `INSERT`.
- Todas as colunas persistidas são reconstruídas e comparadas exatamente.
- DDLs, schemas, rows produzidas e artefatos públicos permanecem inalterados.
- A referência temporária e as medições estão em `target/`, fora do Git.
- Os testes específicos e o gate geral da skill `$validate-workspace` passam.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.8.2: ledger e recibos confirmados](./02-ledger-confirmed-receipts.md).
