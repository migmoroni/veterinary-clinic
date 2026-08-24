# Parte 1B.4: Propriedade Explícita E Disposição Fechada

## Objetivo

Fechar o contrato de projeção do `knowledge-builder` para que toda obrigação
possua um proprietário operacional explícito e todo destino persistido seja
selecionado por tipos fechados.

`ProjectionTarget` descreve onde a evidência se materializa. Ele não seleciona,
agrupa nem descobre a operação proprietária. A construção do contrato associa
cada obrigação diretamente a uma identidade de operação e valida que o payload
tipado dessa operação realmente materializa o destino declarado.

```text
folha canônica validada
-> disposição explícita
-> ProjectionOperationId proprietário
-> ProjectionObligation com destino fechado
-> payload tipado da operação
-> validação obrigação x payload
-> persistência
-> leitura semântica e comparação
```

## Pré-Requisito

A [Parte 1B.3](./01b3-explicit-evidence-and-semantic-equivalence.md) está
concluída. O builder possui `ProjectionContract` por locale, operações tipadas,
journal de obrigações concretas, readers semânticos, relatório schema 3 e um
verificador comum ao staging e à reutilização.

## Resultado Esperado

- cada obrigação informa explicitamente qual operação a possui;
- nenhuma API de produção encontra obrigações por igualdade de
  `ProjectionTarget`;
- operações de linha não absorvem automaticamente obrigações de outras colunas
  da mesma linha;
- cada payload `SystemRow` declara o conjunto fechado de colunas que materializa;
- o contrato recusa uma obrigação de coluna incompatível com o payload da
  operação proprietária;
- caminhos canônicos não possuem coluna ou produto compilado padrão;
- toda disposição desconhecida produz erro antes da abertura dos bancos;
- a comparação semântica continua integral para `system`, `system_media` e CAS;
- a matriz de adulteração comprova isoladamente os campos sensíveis restantes;
- os formatos públicos, o DDL e as versões técnicas dos artefatos permanecem
  inalterados.

## Escopo

- introduzir identidade fechada para todas as operações do contrato;
- associar obrigações a operações pela identidade da operação;
- retirar agrupamento de obrigações por banco, tabela e linha;
- retirar inferência de coluna baseada em fallback textual;
- modelar colunas projetáveis com um enum fechado;
- validar compatibilidade entre operação, evento, destino e payload;
- completar testes unitários de propriedade e disposição;
- completar a matriz de adulteração semântica com checksums recalculados;
- ajustar os READMEs diretamente relacionados ao contrato do builder.

## Fora Do Escopo

- alterar os schemas de criação de `system` ou `system_media`;
- alterar `application_id`, `user_version` ou versões técnicas dos bancos;
- alterar o formato canônico de `data/knowledge`;
- alterar a estrutura pública do `build-result.json` ou do
  `projection-report.json`;
- alterar o conteúdo semântico atual dos bancos;
- alterar apps, packages de runtime ou artefatos do ramo `user`;
- implementar consumo dos artefatos, Hub, publicação remota ou deltas;
- instalar dependências.

## 1. Identidade Fechada Das Operações

### `ProjectionOperationId`

Definir uma identidade estável e fechada para cada operação existente no
`ProjectionContract`. Uma forma possível é:

```rust
enum ProjectionOperationId {
    Compilation(CompilationIdentity),
    Metadata {
        database: DatabaseKind,
        release: bool,
    },
    SystemRow {
        table: SystemTable,
        row: String,
    },
    SystemMediaAsset {
        media_key: String,
    },
    CasObject {
        content_hash: String,
    },
}
```

O locale pertence ao próprio `ProjectionContract`. Caso a implementação o
inclua também na identidade, a representação continua tipada e estável.

Cada `CompilationOperation`, `MetadataOperation`, `SystemProjectionOperation`,
`SystemMediaProjectionOperation` e `CasProjectionOperation` expõe seu
`ProjectionOperationId`. Não usar `RowEvent` ou `ProjectionTarget` como
identidade implícita da operação.

### Declaração De Propriedade

Ao dispor uma folha da fonte, informar simultaneamente:

- `SourceToken`;
- `ProjectionTarget`;
- `ObligationClass`;
- `ProjectionOperationId` proprietário.

Uma estrutura intermediária pode representar essa associação:

```rust
struct OwnedProjectionObligation {
    owner: ProjectionOperationId,
    obligation: ProjectionObligation,
}
```

O nome e a organização final podem acompanhar o crate. A propriedade
arquitetural obrigatória é que o proprietário seja informado no ponto da
disposição, sem ser derivado do destino.

Um registro de construção pode agrupar obrigações por
`ProjectionOperationId`. Ao finalizar uma operação, ele entrega somente o lote
declarado para aquela identidade. Esse lookup por identidade operacional é
permitido; lookup por `ProjectionTarget`, tabela, linha ou coluna não é.

### Contrato De Construção

Substituir qualquer mecanismo equivalente a:

```text
destino da linha
-> procurar TableRow e TableColumn com mesma tabela e row
-> anexar todas à operação
```

por:

```text
disposição da folha
-> declarar owner_id
-> registrar obrigação naquele owner_id
-> finalizar exatamente aquele owner_id com seu payload
```

Remover `claim_row` e qualquer função de produção que:

- receba apenas um destino e devolva obrigações;
- procure candidatos por banco, tabela ou linha;
- reúna obrigações de colunas por compartilharem uma linha;
- atribua propriedade depois que as obrigações já foram declaradas sem owner.

### Invariantes De Finalização

Antes de abrir SQLite, `ProjectionContract::validate` exige:

- cada `ProjectionOperationId` é único;
- cada obrigação possui exatamente um owner;
- cada owner declarado corresponde a exatamente uma operação;
- cada operação recebe somente as obrigações declaradas para seu ID;
- não existem owners sem operação;
- não existem operações sem identidade registrada;
- não existem obrigações remanescentes, repetidas ou inesperadas;
- a união dos lotes das operações é igual a `expected_obligations`.

`expected_obligations` deriva da união canônica das obrigações com owner. Não
manter um segundo gerador independente que possa divergir dessa disposição.

### Cobertura Da Fonte

A travessia que declara owners continua exaustiva sobre `CanonicalEntity` e
seus objetos aninhados. Desestruturar sem `..` e sem descartar campos autorais
com `_`. Cada binding da fonte passa por uma função de disposição que declara
seu owner e seu target.

Discriminantes técnicos, versão de schema, documentos, seções e mídias também
possuem operações explícitas. Quando um valor é compilado em vez de persistido
diretamente, sua função de disposição aponta para a operação de compilação
correspondente.

A adição de um campo Rust exige atualizar a desestruturação; um binding sem uso
é recusado pelo Clippy executado com `-D warnings`. Não satisfazer exaustividade
apenas com `campo: _`.

## 2. Compatibilidade Entre Obrigação E Payload

### Introspecção Tipada De `SystemRow`

Cada variante de `SystemRow` fornece, por `match` exaustivo:

```rust
impl SystemRow {
    fn table(&self) -> SystemTable;
    fn logical_row_id(&self) -> String;
    fn materialized_columns(&self) -> BTreeSet<SystemColumn>;
}
```

Os nomes podem variar, mas as três informações são obrigatórias. A lista de
colunas representa exatamente o `INSERT` executado pelo writer para aquela
variante.

Não usar `..` nos patterns que descrevem o payload. A adição de campo a uma
variante exige atualização por erro de compilação.

### Validação Da Operação SQLite

Para cada `SystemProjectionOperation`, validar:

- o `ProjectionOperationId::SystemRow` possui a mesma tabela e identidade lógica
  do payload;
- o `RowEvent` possui o mesmo banco, tabela e linha da operação;
- todo `TableRow` do lote aponta para a linha da operação;
- todo `TableColumn` do lote aponta para a linha da operação;
- toda coluna citada pelo lote pertence a `materialized_columns()`;
- destinos de outra natureza são aceitos somente quando previstos para aquela
  identidade operacional.

Uma obrigação que aponta para uma coluna inexistente no payload invalida o
contrato. Compartilhar banco, tabela e linha não basta para comprovar
materialização.

### Demais Operações

Aplicar equivalência fechada também fora de `SystemRow`:

- `CompilationIdentity::CanonicalValidation` aceita somente o target de
  validação correspondente;
- documento e seção aceitam somente o target compilado da mesma entidade,
  locale e `section_key`;
- operação de metadados aceita somente o banco e tipo de metadado declarados;
- ativo de `system_media` aceita somente o mesmo `media_key` e locale;
- operação CAS aceita somente o mesmo hash e locale.

Referências Markdown que pertencem a uma seção compilada continuam individuais,
mas o owner explícito é a operação da seção exata.

## 3. Disposição De Colunas Fechada

### `SystemColumn`

Representar as colunas projetáveis com um enum fechado, cobrindo as colunas dos
payloads atuais. Exemplo parcial:

```rust
enum SystemColumn {
    Id,
    Name,
    NormalizedName,
    AliasesJson,
    SpeciesJson,
    RegionsJson,
    ContentJson,
    SortOrder,
    // todas as demais colunas projetáveis atuais
}
```

`ProjectionTarget::TableColumn` usa `SystemColumn` internamente. A serialização
canônica do digest continua emitindo o nome SQLite estável por `as_str()`.

Não aceitar nome arbitrário de coluna em `String` dentro do contrato interno.
SQL observado pelos readers continua fixo e não é montado a partir desse enum.

### Disposição No Ponto De Consumo

As funções de disposição recebem a coluna explicitamente:

```rust
field(
    owner,
    source_token,
    table_column(row, SystemColumn::SpeciesJson),
    ObligationClass::Authoring,
)?;
```

Eliminar `projected_column(table, path)` e equivalentes. O caminho do
`SourceToken` permanece útil para auditoria, mas não decide automaticamente o
destino.

Não existe `_ => ContentJson`, destino genérico ou tratamento automático por
prefixo. `ContentJson` é informado somente para folhas que compõem o documento
editorial compilado.

### Colunas JSON Agrupadas

Campos canônicos que compõem uma coluna JSON mantêm obrigações individuais e
apontam explicitamente para a coluna agregadora:

- espécies para `species_json`;
- regiões para `regions_json`;
- identificadores regulatórios para `regulatory_identifiers_json`;
- nomenclatura para `nomenclature_json`;
- denominações para `denominations_json`;
- medidas para suas colunas JSON correspondentes;
- listas localizadas para a coluna localizada correspondente;
- seções editoriais para `content_json` por meio de sua operação compilada.

Várias folhas podem compartilhar a mesma coluna. Elas continuam obrigações
independentes e possuem o mesmo owner explícito somente quando o mesmo payload
materializa a coluna agregada.

### Conteúdo Localizado

A política fechada de `LocalizedContent` fornece diretamente:

- tipo esperado;
- coluna ou produto compilado de destino;
- operação proprietária;
- participação em busca;
- regra de normalização;
- classe da obrigação.

Chaves de denominação continuam derivadas de
`nomenclature.denominationStandards`. Uma lista vazia mantém a obrigação da
coluna explicitamente indicada e produz zero `LocalizedValue`.

## 4. Ledger, Writers E Verificador

### Ledger

O ledger continua recebendo somente as obrigações concretas presentes na
operação. Ele não conhece o registro de owners e não oferece lookup por destino.

Manter as garantias atuais:

- commit atômico do journal;
- rejeição de obrigação inesperada ou duplicada;
- locale correto;
- cardinalidade SQLite igual a uma linha;
- ausência de publicação após rollback ou journal recusado.

### Writers

Writers continuam desestruturando `SystemRow` e executando SQL fixo. Eles não
decidem owners, destinos, normalização ou conteúdo.

Cada writer publica o lote já validado da operação somente após o sucesso e o
commit aplicáveis.

### Verificação Semântica

Preservar a leitura independente de todas as tabelas projetáveis. A expectativa
continua vindo dos payloads do `ProjectionContract`, e a observação continua
vindo de consultas somente leitura.

Não alterar a semântica de:

- igualdade integral das linhas;
- ordem das relações;
- busca;
- conteúdo compilado;
- `system_media`;
- CAS;
- metadados;
- relatório schema 3;
- staging e reutilização.

## 5. Testes De Propriedade E Disposição

### Propriedade Operacional

Adicionar testes unitários que comprovem:

- duas obrigações com o mesmo `ProjectionTarget` e owners diferentes não são
  agrupadas;
- finalizar um owner entrega somente seu lote declarado;
- obrigação de outro owner permanece pendente;
- owner inexistente é recusado;
- owner repetido é recusado;
- owner sem operação é recusado;
- operação sem owner declarado é recusada;
- uma obrigação não pode aparecer em dois owners;
- a união dos lotes coincide exatamente com `expected_obligations`;
- não existe API de produção para obter obrigações por target.

### Compatibilidade Com O Payload

Cobrir:

- `TableColumn` presente em `materialized_columns()`;
- coluna de outra variante de linha;
- tabela correta com linha incorreta;
- linha correta com tabela incorreta;
- `RowEvent` divergente do payload;
- target de busca divergente da operação de busca;
- seção, metadado, mídia ou CAS com identidade divergente;
- campo JSON agregado com múltiplas obrigações válidas;
- lista localizada vazia com obrigação de coluna e zero fragmentos.

### Disposição Fechada

Cobrir todas as variantes atuais de `SystemRow` e todas as variantes de
`SystemColumn`. Cada variante de linha deve declarar exatamente as colunas do
seu `INSERT`.

Chave localizada sem política continua recusada pela validação. Como a coluna é
um enum fechado e informada no ponto de disposição, não deve existir teste ou
API que espere fallback para `content_json`.

## 6. Matriz De Adulteração Semântica

### Preparação Comum

Cada caso parte de artefatos válidos, altera um único aspecto, mantém o banco
estruturalmente válido e recalcula:

- `sizeBytes` do banco alterado;
- checksum no `build-result.json`;
- entrada correspondente em `checksums.sha256`;
- declarações adicionais exigidas pelo verificador físico.

A reutilização precisa chegar à comparação semântica e recusar o artefato por
divergência com o contrato. Restaurar os bytes canônicos antes do caso seguinte.

### Busca

Criar casos isolados para `entity_search_terms`:

- `value`;
- `normalized_value`;
- `provenance`;
- `sort_order`.

As alterações devem respeitar as constraints para provar a comparação além da
integridade SQLite.

### Taxonomias

Adicionar adulteração de `aliases_json` com JSON válido e manter o caso de
`label`. Quando aplicável, usar outro termo válido para testar identidade e
ordem sem quebrar foreign keys.

### Referências Estruturais

Usar uma fixture com ao menos dois ativos válidos e testar isoladamente:

- troca de `media_key` por outro ativo existente;
- alteração de `role` ou `sort_order` preservando unicidade;
- manutenção da mesma contagem de linhas.

O caso deve falhar pela equivalência semântica, não apenas por contagem ou
foreign key.

### `system_media`

Além do thumbnail, adulterar isoladamente com valores estruturalmente válidos:

- `content_hash` quando houver outro objeto CAS válido para a fixture;
- `mime_type`;
- `size_bytes`;
- `width`;
- `height`;
- MIME e dimensões do thumbnail;
- bytes do thumbnail JPEG.

O teste deve distinguir quando uma verificação específica de mídia recusa o
artefato e quando a igualdade tipada o recusa. Todos os caminhos precisam
continuar impedindo reutilização.

### CAS

Alterar os bytes de um objeto CAS e atualizar a declaração em
`checksums.sha256` para o hash dos bytes adulterados, sem alterar a identidade
exigida pelo contrato. O verificador precisa recusar a divergência entre
conteúdo, caminho endereçado por hash, `system_media` e operação CAS.

### Cobertura Já Existente

Manter os casos atuais de:

- nome e aliases localizados;
- valor normalizado da entidade;
- identidade e ordem de relações N:N;
- label taxonômico;
- protocolo e dose;
- `content_json` e Markdown compilado;
- linha ausente ou adicional;
- metadados, fingerprint, relatório e conjunto de arquivos.

## 7. Documentação

Atualizar `tools/knowledge-builder/README.md` para declarar:

- propriedade por `ProjectionOperationId`;
- ausência de agrupamento por target, tabela ou linha;
- disposição de colunas por enum fechado;
- validação entre obrigação e payload;
- equivalência semântica integral dos artefatos.

Atualizar o README das fixtures conforme a matriz executável final. Não incluir
histórico de mecanismos substituídos.

## Sequência De Implementação

1. Introduzir `ProjectionOperationId` e a associação owner-obrigação.
2. Adaptar as identidades de todas as operações do contrato.
3. Fazer a disposição declarar o owner no ponto de criação da obrigação.
4. Remover `claim_row` e qualquer lookup por `ProjectionTarget`.
5. Introduzir `SystemColumn` e sua serialização estável.
6. Fazer cada `SystemRow` declarar tabela, identidade e colunas materializadas.
7. Substituir inferência por caminho por destinos de coluna explícitos.
8. Remover todo fallback de coluna ou `content_json`.
9. Validar owner, target, evento e payload durante a finalização do contrato.
10. Adicionar os testes unitários de propriedade, payload e disposição fechada.
11. Completar as adulterações de busca e taxonomia.
12. Completar as adulterações de referências estruturais e `system_media`.
13. Completar a adulteração CAS com declarações atualizadas.
14. Executar build integral e reutilização para os seis locales.
15. Atualizar os READMEs afetados.
16. Executar testes específicos e o gate geral do workspace.

Cada etapa mantém aprovados seus testes diretamente relacionados antes do
avanço para a etapa seguinte.

## Entregáveis

- identidade fechada para operações de projeção;
- associação explícita entre owner e obrigação;
- contrato sem agrupamento por destino;
- enum fechado das colunas projetáveis;
- validação obrigação x payload;
- disposição sem fallback;
- testes unitários das novas invariantes;
- matriz completa de adulteração semântica;
- documentação atualizada.

## Critérios De Aceite

- `ProjectionTarget` nunca seleciona a operação proprietária.
- Não existe função de produção equivalente a `claim_row`.
- Toda obrigação possui um `ProjectionOperationId` explícito.
- Cada owner corresponde a uma única operação e cada operação possui um owner.
- Uma operação recebe somente o lote declarado para seu ID.
- Obrigações com o mesmo destino continuam independentes.
- `SystemRow` declara exatamente as colunas persistidas por seu writer.
- Toda obrigação de coluna pertence às colunas materializadas pelo payload.
- Não existe fallback de caminho para `content_json` ou outra coluna.
- Não existe nome arbitrário de coluna no contrato interno.
- Chaves localizadas continuam submetidas a uma política fechada.
- Lista localizada vazia produz zero fragmentos e preserva sua disposição.
- A união das obrigações das operações coincide com `expected_obligations`.
- O ledger continua sem lookup ou expansão por destino.
- Writers continuam sem regras de disposição ou domínio.
- Todas as linhas observadas permanecem iguais ao contrato.
- Cada adulteração de busca é recusada com checksums atualizados.
- Alterações semânticas de taxonomia e referência estrutural são recusadas.
- Alterações semanticamente válidas em `system_media` são recusadas.
- Objeto CAS adulterado é recusado mesmo com a declaração de checksum alterada.
- Staging e reutilização executam as mesmas verificações.
- O relatório permanece no schema 3 e seus digests continuam determinísticos.
- DDL, versões técnicas e formatos públicos permanecem inalterados.
- Apps, packages de runtime e ramo `user` permanecem inalterados.
- O crate passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral de validação.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.5: cobertura exaustiva dos contratos de persistência](./01b5-projection-contract-test-coverage.md).
