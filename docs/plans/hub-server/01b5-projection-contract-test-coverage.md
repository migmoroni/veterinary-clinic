# Parte 1B.5: Cobertura Exaustiva Dos Contratos De Persistência

## Objetivo

Fechar a cobertura executável do contrato de projeção do `knowledge-builder`.
Os testes comprovam que cada forma concreta de `SystemRow` declara exatamente
as colunas do `INSERT` executado pelo writer e que toda propriedade persistida
do thumbnail participa da verificação dos artefatos.

```text
SystemRow
-> forma concreta de INSERT
-> tabela e colunas extraídas do SQL executado
-> materialized_columns()
-> igualdade exata

system_media esperado
-> alteração isolada de thumbnail_mime_type
-> comparação tipada + verificação integral
-> reutilização recusada
```

## Pré-Requisito

A [Parte 1B.4](./01b4-explicit-operation-ownership.md) está concluída. O builder
possui owners operacionais explícitos, `SystemColumn` fechado,
`SystemRow::materialized_columns()`, writers mecânicos e equivalência semântica
entre o contrato e os artefatos relidos.

## Resultado Esperado

- toda forma concreta de `INSERT` de `SystemRow` possui um caso executável;
- variantes que selecionam mais de uma tabela cobrem cada destino permitido;
- os testes leem o mesmo SQL fixo que o writer executa;
- tabela e colunas extraídas do SQL coincidem exatamente com `table()` e
  `materialized_columns()`;
- toda variante de `SystemColumn` aparece em ao menos um contrato de inserção;
- colunas desconhecidas, repetidas ou fora da declaração são recusadas pelo
  teste estrutural;
- `thumbnail_mime_type` participa de um teste semântico isolado;
- um artefato com `thumbnail_mime_type` adulterado não pode ser reutilizado;
- DDL, formatos públicos, comportamento de build e bytes válidos permanecem
  inalterados.

## Escopo

- tornar os SQLs fixos de `SystemRow` inspecionáveis pelos testes sem gerar SQL
  a partir de entrada dinâmica;
- criar uma matriz de todas as formas atuais de inserção;
- comparar a declaração de colunas com o comando efetivamente usado pelo
  writer;
- provar a cobertura de todas as variantes atuais de `SystemColumn`;
- adicionar comparação unitária isolada para o MIME do thumbnail;
- adicionar adulteração integral do MIME do thumbnail com declarações físicas
  recalculadas;
- atualizar os READMEs diretamente relacionados aos testes do builder.

## Fora Do Escopo

- alterar qualquer tabela, coluna, constraint, índice ou versão SQLite;
- alterar o contrato que fixa thumbnails em `image/jpeg`;
- alterar `ProjectionOperationId`, `ProjectionTarget`, `SystemRow` ou
  `SystemColumn` em seu significado de domínio;
- alterar schemas ou versões de `build-result.json` e
  `projection-report.json`;
- alterar a projeção, a normalização ou o conteúdo dos artefatos válidos;
- criar migrations, conversões, backfills ou caminhos paralelos;
- alterar apps, packages de runtime ou o ramo `user`;
- instalar dependências.

## 1. Fonte Única Dos SQLs Fixos Do Writer

### Descritor Privado De Inserção

Em `tools/knowledge-builder/src/projection/writers.rs`, nomear os comandos
`INSERT` atuais e fazer o writer obter o comando por uma função privada e
exaustiva sobre `SystemRow`.

Uma forma adequada é:

```rust
struct SystemInsertStatement {
    case: SystemInsertCase,
    table: SystemTable,
    sql: &'static str,
}

fn system_insert_statement(row: &SystemRow) -> Result<SystemInsertStatement, String>;
```

`SystemInsertCase` identifica cada forma concreta de SQL. Ele diferencia os
destinos polimórficos mesmo quando compartilham o mesmo conjunto de colunas.
Sua lista fechada cobre:

- `TaxonomyRegistry`;
- `TaxonomyTerm` em `taxonomy_terms`;
- `TaxonomyTerm` em cada uma das quatro tabelas semânticas de produto;
- `GeoPlace`;
- `Breed`;
- `BreedOrigin`;
- `Manufacturer`;
- `ActiveIngredient`;
- `Condition`;
- `Product`;
- `EntityTaxonomy`;
- `ProductActiveIngredient`;
- `ProductTerm` em cada uma das quatro tabelas de relação de produto;
- `TreatmentProtocol`;
- `TreatmentProtocolItem`;
- `TreatmentProtocolDose`;
- `SearchTerm`;
- `MediaReference`.

O enum pode permanecer privado ao módulo e expor `ALL` somente em testes. O
`match` que resolve o descritor não usa `..` e recusa combinações de tabela que
não pertencem à variante.

### Uso Pelo Writer

`write_system_row` usa o `sql` devolvido por
`system_insert_statement(row)` no mesmo `execute` que recebe os parâmetros da
variante. Não manter outra literal SQL equivalente no braço do writer.

A extração preserva integralmente:

- texto e ordem das colunas atuais;
- parâmetros atuais;
- transação e cardinalidade;
- tratamento de erro;
- tabelas permitidas para termos e relações polimórficas.

Não montar nomes de tabela ou coluna a partir de dados canônicos. Os comandos
continuam fechados e definidos no código do writer.

## 2. Matriz Exaustiva De Linhas E Colunas

### Casos Representativos

Adicionar em `projection/writers.rs` uma suíte unitária orientada por tabela.
Cada caso contém um `SystemRow` representativo e a identidade esperada de
`SystemInsertCase`.

A matriz inclui todos os casos listados na seção anterior. Para
`TaxonomyTerm`, criar um caso por destino permitido. Para `ProductTerm`, criar
um caso por tabela de relação permitida. Valores de teste devem ser explícitos,
válidos e distintos o suficiente para tornar diagnósticos legíveis.

O conjunto dos IDs observados na matriz deve ser exatamente igual a
`SystemInsertCase::ALL`. Casos repetidos e casos ausentes falham com a identidade
concreta correspondente.

### Leitura Do Comando Real

Um helper disponível somente em testes interpreta o formato fechado dos
comandos do writer:

```text
INSERT INTO <table> (<column>, ...) VALUES (...)
```

O helper não é um parser SQL de produção. Ele recebe apenas as literais internas
já selecionadas pelo `SystemInsertStatement` e devolve:

- nome da tabela;
- lista ordenada dos nomes de coluna.

O teste converte os nomes pelo conjunto fechado `SystemColumn::ALL` e falha
quando encontra:

- coluna sem variante correspondente;
- coluna repetida;
- lista vazia;
- tabela diferente de `SystemInsertStatement.table`;
- estrutura diferente do formato de `INSERT` aceito pelo writer.

### Igualdade Obrigatória

Para cada caso, comprovar simultaneamente:

```text
tabela extraída do SQL
== SystemInsertStatement.table.as_str()
== SystemRow::table().as_str()

conjunto de colunas extraído do SQL
== SystemRow::materialized_columns()
```

Ao final da matriz, a união de todas as colunas extraídas deve ser exatamente
igual a `SystemColumn::ALL`. Assim, o teste cobre tanto todas as formas de linha
quanto todas as colunas fechadas atuais.

Remover o teste restrito a apenas uma variante quando sua asserção estiver
integralmente representada pela matriz exaustiva. Não manter duas listas
paralelas com a mesma finalidade.

### Execução Real

Os testes integrais existentes continuam executando os writers contra os DDLs
canônicos. A matriz estrutural não substitui build, leitura semântica ou
reutilização; ela fecha especificamente a relação entre payload, comando e
colunas declaradas.

## 3. Cobertura De `thumbnail_mime_type`

### Comparação Semântica Isolada

Em `tools/knowledge-builder/src/verification/readers.rs`, manter a comparação de
`SystemMediaRow` em uma função pura e privada que possa ser exercitada por teste
unitário. A função recebe os mapas esperado e observado e compara todos os
campos, incluindo:

- bytes do thumbnail;
- `thumbnail_mime_type`;
- largura e altura do thumbnail;
- hash e propriedades da mídia original.

Criar um caso em que os mapas são inicialmente iguais e somente
`thumbnail_mime_type` muda de `image/jpeg` para `image/png`. O teste exige o
diagnóstico específico de divergência do thumbnail.

O DDL canônico aceita exclusivamente `image/jpeg`. Por isso, o teste unitário da
comparação tipada comprova a semântica do campo sem enfraquecer a constraint do
banco.

### Adulteração Integral Do Artefato

Na matriz temporária de `tools/knowledge-builder/tests/builder.rs`, adicionar um
caso exclusivo para `thumbnail_mime_type`:

1. restaurar os bytes canônicos de `system_media` e das declarações externas;
2. abrir o banco temporário;
3. habilitar `PRAGMA ignore_check_constraints = ON` somente nessa conexão de
   teste;
4. alterar uma linha de `image/jpeg` para `image/png`;
5. confirmar que exatamente uma linha foi alterada;
6. fechar a conexão;
7. recalcular tamanho, checksum no resultado e entrada em
   `checksums.sha256` pelos helpers existentes;
8. tentar reutilizar a versão;
9. exigir rejeição relacionada à integridade ou ao MIME do thumbnail.

Esse caso comprova que declarações físicas coerentes com os bytes adulterados
não tornam o artefato reutilizável. O teste unitário anterior comprova, de forma
independente, que a comparação semântica também observa o campo.

O `PRAGMA` pertence somente ao banco temporário do teste. Não alterar o DDL, o
builder, o verificador ou conexões de produção para ignorar constraints.

## 4. Documentação

Atualizar `tools/knowledge-builder/README.md` para registrar que a matriz de
contrato cobre todas as formas concretas de `INSERT` e todas as variantes de
`SystemColumn`.

Atualizar `tools/knowledge-builder/fixtures/README.md` para incluir
`thumbnail_mime_type` entre as adulterações explícitas de `system_media`.
Escrever no presente e descrever somente o contrato vigente.

## Sequência De Implementação

1. Extrair as literais atuais para descritores privados de inserção.
2. Fazer cada braço do writer executar o SQL do descritor correspondente.
3. Definir a identidade fechada de todas as formas concretas de inserção.
4. Criar os `SystemRow` representativos, incluindo todos os destinos
   polimórficos.
5. Implementar o leitor de SQL restrito aos testes.
6. Comparar tabela, colunas materializadas e comando real para cada caso.
7. Comprovar cobertura exata de `SystemInsertCase::ALL` e
   `SystemColumn::ALL`.
8. Extrair a comparação pura das linhas de `system_media`.
9. Adicionar o teste semântico isolado de `thumbnail_mime_type`.
10. Adicionar a adulteração integral do banco temporário e atualizar suas
    declarações físicas.
11. Executar os testes unitários e integrais do `knowledge-builder`.
12. Executar build e reutilização determinísticos para os seis locales pelos
    testes existentes.
13. Atualizar os READMEs afetados.
14. Executar o gate geral do workspace definido para implementações de plano.

## Entregáveis

- descritores privados dos SQLs fixos realmente usados pelo writer;
- matriz de todas as formas concretas de `SystemRow`;
- prova executável de igualdade entre SQL e `materialized_columns()`;
- cobertura integral de `SystemColumn`;
- teste semântico isolado do MIME do thumbnail;
- adulteração integral de `thumbnail_mime_type`;
- documentação atualizada.

## Critérios De Aceite

- Todo SQL de inserção de `SystemRow` usado pelo writer possui uma identidade
  fechada e um caso na matriz.
- Cada destino polimórfico permitido possui seu próprio caso.
- Os testes inspecionam o mesmo comando que o writer executa.
- A tabela do comando coincide com `SystemRow::table()`.
- As colunas do comando coincidem exatamente com
  `SystemRow::materialized_columns()`.
- Não existe coluna desconhecida, repetida ou ausente na matriz.
- A união observada das colunas coincide com `SystemColumn::ALL`.
- O writer continua usando SQL fechado e não deriva identificadores de entrada
  canônica.
- A comparação semântica recusa divergência isolada de
  `thumbnail_mime_type`.
- A reutilização recusa `system_media` adulterado mesmo depois da atualização de
  tamanho e checksums.
- O DDL e a constraint `thumbnail_mime_type = 'image/jpeg'` permanecem
  inalterados.
- Os artefatos válidos permanecem determinísticos e semanticamente idênticos ao
  contrato.
- Não há alteração em versões técnicas, formatos públicos, apps, packages de
  runtime ou ramo `user`.
- O crate passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral de validação.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](./01c-app-system-consumption.md).
