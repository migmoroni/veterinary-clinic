# Parte 1B.3: Evidência Explícita E Equivalência Semântica

## Objetivo

Consolidar o `knowledge-builder` sobre um contrato de projeção tipado que liga,
sem inferência intermediária:

- cada folha da fonte canônica;
- o valor compilado esperado;
- a operação concreta de persistência;
- as obrigações concluídas pela operação;
- o conteúdo efetivamente relido dos artefatos.

O builder aceita uma versão somente quando os bancos, o relatório e o CAS são
semanticamente equivalentes ao modelo validado. Contagens, checksums e
fingerprints continuam obrigatórios, mas não substituem a comparação dos dados.

```text
ValidatedSource
-> ProjectionContract por locale
-> operações tipadas + obrigações esperadas
-> persistência SQLite e CAS
-> obrigações explicitamente concluídas
-> leitura semântica dos artefatos
-> igualdade com ProjectionContract
-> relatório e finalização
```

## Pré-Requisito

A [Parte 1B.2](./01b2-projection-evidence-and-artifact-verification.md) está
aplicada. O builder possui ledger, journal, relatório de projeção, verificador
único para staging e reutilização, bancos por locale, `system_media` e CAS
fragmentado.

## Resultado Esperado

- o journal registra `ProjectionObligation` concretas, sem expandir um destino
  para todas as obrigações associadas a ele;
- uma operação declara exatamente quais campos, relações ou produtos compilados
  materializa;
- os valores SQLite esperados existem em uma representação tipada e imutável
  antes da abertura dos bancos;
- writers persistem essa representação e não remontam regras de domínio;
- o verificador relê todas as tabelas projetáveis e compara linhas, colunas,
  relações, ordenação e conteúdo com o contrato esperado;
- adulterações semanticamente coerentes com seus próprios checksums são
  recusadas;
- campos de structs aninhados e chaves localizadas exigem disposição explícita;
- fragmentos localizados possuem uma definição única e contagens iguais entre
  fonte, ledger e relatório;
- staging e reutilização executam a mesma verificação semântica;
- DDL, versões técnicas dos bancos e o ramo `user` permanecem inalterados.

## Escopo

- introduzir um contrato intermediário puro por locale;
- separar modelo esperado, escrita dos artefatos e leitura de verificação;
- registrar obrigações individualmente no journal;
- eliminar conclusão automática por igualdade de `ProjectionTarget`;
- representar destinos de coluna, relação, busca, conteúdo compilado, mídia e
  CAS com tipos fechados;
- tornar exaustiva a disposição dos objetos aninhados;
- classificar todas as chaves de `localizedContent` aceitas pelo estado atual;
- corrigir a semântica e a validação das contagens localizadas;
- comparar semanticamente todas as tabelas projetáveis de `system` e
  `system_media`;
- fortalecer o digest das evidências com serialização canônica versionada;
- adicionar testes de omissão por obrigação e adulteração semântica;
- atualizar schemas executáveis e READMEs diretamente afetados.

## Fora Do Escopo

- alterar o DDL dos bancos `system` ou `system_media`;
- alterar `application_id`, `user_version` ou versões técnicas dos bancos;
- criar migrations, conversões, backfills ou adoção de artefatos;
- manter contratos paralelos ou caminhos alternativos de projeção;
- alterar `apps/`, packages de runtime ou qualquer banco e CAS do ramo `user`;
- implementar o consumo dos artefatos pelo app;
- implementar Hub, manifests remotos, releases, bootstrap ou deltas;
- instalar dependências.

## 1. Contrato Intermediário De Projeção

### Fronteira Pura

Criar uma etapa pura que recebe `ValidatedSource`, `KnowledgeLocale` e
`BuildContext` e produz um `ProjectionContract` imutável. Essa etapa termina
antes de criar ou abrir qualquer banco.

Uma forma possível do contrato é:

```rust
struct ProjectionContract {
    locale: KnowledgeLocale,
    compilation: Vec<CompilationOperation>,
    system: Vec<SystemProjectionOperation>,
    system_media: Vec<SystemMediaProjectionOperation>,
    cas: Vec<CasProjectionOperation>,
    expected_obligations: BTreeSet<ProjectionObligation>,
    source_facts: ProjectionSourceFacts,
}
```

Os nomes podem acompanhar a organização final dos módulos, mas as propriedades
arquiteturais são obrigatórias:

- não possui conexão SQLite;
- não consulta artefatos existentes;
- não depende do relatório gerado;
- contém valores prontos para persistência;
- possui ordem determinística;
- contém a identidade lógica de cada operação;
- associa cada operação ao conjunto exato de obrigações que ela conclui.

A construção do contrato exige que a união das obrigações de todas as operações
seja exatamente igual a `expected_obligations`. Cada obrigação pertence a uma
única operação; obrigação órfã, repetida entre operações ou não esperada invalida
o contrato antes da persistência.

### Operações Tipadas

Modelar operações com enums fechados e payloads tipados. Os casos cobrem todas
as tabelas projetáveis atuais:

- metadados de build e release;
- registro e termos taxonômicos;
- termos semânticos de produto;
- localizações geográficas;
- entidades de raças, fabricantes, princípios ativos, condições e produtos;
- relações N:N e relações ordenadas;
- protocolos, itens e doses;
- termos de busca;
- referências estruturais de mídia;
- ativos de `system_media`;
- objetos CAS;
- documentos e seções compiladas.

`CompilationOperation` representa consumos que não correspondem diretamente a
uma linha SQLite, como validação de `schemaVersion` e `entityType`, delimitação
das seções, normalização do Markdown e resolução das referências editoriais.

Cada variante possui uma identidade de linha estável e todos os valores das
colunas que o `INSERT` materializa. Não usar um `serde_json::Value` genérico para
representar linhas SQLite. Campos JSON do DDL recebem strings canônicas prontas,
mas a operação proprietária continua sendo tipada.

Exemplo orientativo:

```rust
struct ProductCatalogOperation {
    row: ProductCatalogRow,
    obligations: BTreeSet<ProjectionObligation>,
}

struct ProductCatalogRow {
    id: String,
    type_term_key: String,
    name: String,
    normalized_name: String,
    species_json: String,
    aliases_json: String,
    manufacturer_id: String,
    regions_json: String,
    regulatory_identifiers_json: String,
    commercial_line: Option<String>,
    presentation_dosage: Option<String>,
    target_species_warnings_json: String,
    content_json: String,
}
```

O writer desestrutura o payload sem `..`, executa o SQL fixo e publica somente
as obrigações presentes naquela operação depois de confirmar a cardinalidade e
o commit.

### Uma Fonte De Regras

As funções que normalizam nomes, serializam JSON, montam conteúdo, derivam busca
e resolvem relações alimentam o `ProjectionContract`. Writers SQLite recebem os
valores já resolvidos e não repetem essas decisões.

O verificador recebe o mesmo contrato como expectativa, mas produz a observação
real por consultas somente leitura. Ele não usa os writers para reconstruir o
resultado observado.

## 2. Evidência Individual No Ledger

### Journal

O `ProjectionJournal` acumula obrigações concretas:

```rust
struct ProjectionJournal {
    completed: Vec<ProjectionObligation>,
    rows: Vec<RowEvent>,
}
```

O contrato público do journal oferece operações equivalentes a:

```rust
journal.complete(obligation)?;
journal.complete_operation(&operation, affected_rows)?;
```

`complete_operation` copia as obrigações já declaradas pela operação tipada. A
função não consulta o conjunto esperado por `ProjectionTarget` e não procura
outras obrigações com destino igual.

Remover do contrato final:

- `record_target` como mecanismo de conclusão;
- busca de obrigações esperadas por destino;
- expansão `target -> todas as obligations`;
- qualquer método que conclua um grupo não declarado pela operação.

### Commit Do Ledger

`ProjectionLedger::commit` verifica cada obrigação recebida:

- pertence ao conjunto esperado;
- ainda não foi concluída;
- corresponde ao locale do ledger;
- aparece depois da operação e do commit aplicáveis.

O commit não cria obrigações. Ele apenas valida e incorpora as obrigações
informadas pelo journal.

Uma obrigação ausente permanece ausente mesmo quando outra obrigação possui o
mesmo `ProjectionTarget`. Duplicidade e obrigação inesperada invalidam o
journal inteiro sem publicação parcial.

### Destinos Precisos

Usar `TableColumn` para folhas persistidas em colunas de uma linha proprietária.
Usar `TableRow` para a existência da entidade ou de uma relação cuja identidade
está integralmente na chave lógica da linha.

Manter destinos próprios para:

- termos de busca, incluindo valor, valor normalizado, proveniência e ordem;
- documento e seção compilados;
- referência Markdown por seção e ocorrência;
- referência estrutural por papel e ordem;
- ativo localizado de mídia;
- objeto CAS;
- metadados de build e release;
- validação do discriminante e da versão da entidade canônica.

`schemaVersion` e `entityType` são consumidos pela validação e seleção do
contrato da entidade. Eles não apontam para metadados SQLite que representam
outro conceito.

## 3. Disposição Exaustiva

### Entidades E Objetos Aninhados

Cada variante de `CanonicalEntity` continua sendo desestruturada sem `..`.
Aplicar a mesma regra aos objetos aninhados, incluindo:

- `RegulatoryIdentifiers`;
- `Nomenclature`;
- `MeasurementRange`;
- `Centroid`;
- `StructuralMedia`;
- `ProtocolDose`;
- `TaxonomyTerm`;
- `SectionDeclaration`.

Criar funções de disposição específicas para esses tipos. A adição de um campo
Rust exige atualizar sua função por erro de compilação.

Não usar reflexão por `serde_json::Value`, nomes de campos descobertos em
runtime ou destino padrão para contornar essa exigência.

### Conteúdo Localizado

`LocalizedContent` mantém o formato JSON atual, mas suas chaves passam por uma
política fechada por tipo de entidade. Inventariar todas as chaves aceitas pelos
schemas e dados canônicos atuais e atribuir a cada uma:

- tipo esperado: texto ou lista;
- obrigatoriedade;
- coluna proprietária ou produto compilado;
- participação em busca;
- regra de normalização;
- classe usada pelo relatório.

Chaves dinâmicas de denominação de princípio ativo são derivadas explicitamente
de `nomenclature.denominationStandards`. Uma denominação sem padrão declarado ou
um padrão sem campo localizado correspondente invalida a fonte.

Uma chave localizada sem política é erro de validação. Adicionar uma chave ao
schema exige acrescentar sua disposição.

### Valores Vazios

Definir fragmento localizado como:

- um texto localizado presente;
- cada item de uma lista localizada;
- cada seção editorial compilada para o locale.

Uma lista vazia possui zero fragmentos. A obrigação de persistir sua forma
vazia continua existindo como obrigação estrutural ou de coluna, sem criar um
`LocalizedValue` fictício na posição `0`.

`localizedFragmentsByLocale`, `consumedLocalizedFragments` e a contagem
regenerada pelo verificador usam essa mesma função compartilhada. Para cada
locale, os três valores são iguais.

## 4. Equivalência Semântica Dos Bancos

### Leitura Observada

O `ArtifactVerifier` abre cada banco como somente leitura e carrega todas as
tabelas projetáveis em tipos de observação equivalentes aos payloads do
`ProjectionContract`.

Para cada tabela, comparar o conjunto ou sequência completa de linhas:

- nenhuma linha ausente;
- nenhuma linha adicional;
- identidade lógica exata;
- todas as colunas escalares;
- `NULL` contra valor presente;
- JSON canônico;
- blobs e hashes;
- valores normalizados;
- proveniência;
- `sort_order` e demais ordenações.

Relações ordenadas são comparadas como sequência. Relações sem semântica de
ordem podem ser comparadas como conjunto, conforme o DDL atual.

### Cobertura De `system`

Comparar semanticamente:

- `taxonomy_registry` e todas as tabelas de termos;
- `geo_places`;
- todas as tabelas proprietárias de entidades;
- todas as tabelas N:N;
- protocolos, itens e doses;
- `entity_search_terms`;
- `entity_media_references`;
- `content_json` desserializado pelo contrato fechado e serializado novamente
  de forma canônica.

Para `content_json`, exigir igualdade de `schemaVersion`, ordem e quantidade de
seções, `sectionKey` e `compiledMarkdown` normalizado.

### Cobertura De `system_media` E CAS

Preservar as verificações integrais de mídia e acrescentar igualdade entre as
linhas observadas e as operações de mídia do contrato:

- `media_key`;
- `content_hash`;
- MIME e tamanho do original;
- dimensões do original;
- bytes, MIME e dimensões do thumbnail JPEG;
- conjunto CAS por locale e conjunto global.

Objetos CAS continuam sendo comparados por hash e bytes. O CAS compartilhado
pode conter objetos de outras versões, mas todos os objetos exigidos pelo
contrato precisam existir e ser íntegros.

### Ordem Da Verificação

Executar:

```text
validar identidade e estrutura física
-> validar checksums, tamanhos e fingerprints
-> reler bancos em tipos observados
-> comparar observação com ProjectionContract
-> validar mídias e CAS
-> validar relatório contra contrato, ledger e observação
```

O relatório não serve como fonte da expectativa dos bancos. Ele é outro
artefato que precisa coincidir com a fonte, o ledger e a observação real.

## 5. Relatório E Digest Das Evidências

Gerar `evidenceDigestSha256` a partir de um DTO canônico e versionado das
obrigações. Não usar saída de `Debug` de enums ou structs como formato do digest.

O DTO usa:

- nomes de campos estáveis;
- enums serializados por valores fechados;
- strings normalizadas;
- arrays em ordem canônica;
- JSON canônico sem dependência de detalhes de formatação Rust.

O `projection-report.json` usa `schemaVersion: 3` e mantém objetos fechados. O
schema executável exige as contagens e identidades atuais. Não existe leitura do
formato substituído.

Para cada locale, o verificador exige:

```text
source.localizedFragmentsByLocale[locale]
== ledger.completedLocalizedFragments
== report.locales[locale].consumedLocalizedFragments
== contagem regenerada do ProjectionContract
```

As contagens de entidades, relações, operações, linhas e mídias seguem a mesma
regra: a expectativa vem do contrato e a observação vem dos artefatos.

## 6. Testes Obrigatórios

### Ledger

Adicionar testes que comprovem:

- duas obrigações diferentes compartilham o mesmo destino e concluir uma não
  conclui a outra;
- uma operação com várias obrigações pode publicar somente o lote informado;
- a união das obrigações das operações coincide exatamente com o conjunto
  esperado;
- uma obrigação não pode pertencer a duas operações;
- omitir uma obrigação de campo mantém o ledger incompleto;
- obrigação inesperada invalida o journal;
- obrigação duplicada invalida o journal;
- journal rejeitado não publica evidência parcial;
- rollback descarta todas as obrigações da transação;
- cardinalidade SQLite divergente não publica obrigações;
- termos de busca, referências Markdown e referências estruturais permanecem
  individualmente auditáveis;
- não existe API de produção que conclua obrigações por destino.

### Exaustividade E Conteúdo Localizado

Cobrir:

- todas as variantes de entidade e seus objetos aninhados;
- todas as chaves localizadas aceitas por tipo;
- chave localizada sem política;
- denominação dinâmica válida e inválida;
- texto, lista com itens e lista vazia;
- lista vazia com zero fragmentos e obrigação estrutural preservada;
- igualdade das contagens localizadas nos seis locales.

### Adulteração Semântica

Partir de uma versão válida, alterar um aspecto do banco, recalcular
`sizeBytes`, checksum do banco e a entrada de `checksums.sha256`, e exigir que a
reutilização recuse a versão. Cobrir isoladamente:

- nome localizado de entidade;
- aliases ou outra coluna JSON;
- valor normalizado;
- identidade relacionada em uma tabela N:N;
- ordem de uma relação;
- label ou alias taxonômico;
- termo, valor normalizado, proveniência e ordem de busca;
- conteúdo de protocolo;
- dose de protocolo;
- `content_json` e uma seção compilada;
- referência estrutural de mídia;
- linha de `system_media`;
- thumbnail JPEG;
- objeto CAS.

Usar relações substitutas que ainda satisfaçam foreign keys quando o caso visa
provar equivalência semântica além de integridade relacional.

### Build Integral

Manter e ampliar os testes para exigir:

- seis pares de bancos;
- igualdade exata entre contrato esperado e observação de cada locale;
- duas builds idênticas com os mesmos bancos, relatório, checksums e digest de
  evidências;
- staging e reutilização passando pelo mesmo verificador;
- execução da CLI fora da raiz para `validate` e `build`;
- ausência de leitura ou alteração em `apps/`, packages de runtime e ramo
  `user`.

## 7. Organização Recomendada

Manter responsabilidades pequenas dentro de `tools/knowledge-builder/src/`:

```text
projection/
  contract/          modelo esperado e disposição exaustiva
  writers/           persistência SQLite e CAS
  mod.rs             orquestração da build
verification/
  readers/           leitura tipada dos artefatos
  semantic.rs        comparação contrato x observação
  physical.rs        estrutura, checksums e fingerprints
ledger/
  obligations.rs     tokens, destinos e DTO canônico
  journal.rs         evidências da transação
  report.rs          contagens e digest
```

A estrutura final pode acompanhar os limites já presentes no crate. Evitar
manter arquivos muito extensos quando a separação acima possuir responsabilidade
clara.

## Sequência De Implementação

1. Introduzir os tipos do `ProjectionContract` e testes unitários de
   determinismo.
2. Transferir normalização, serialização, busca e relações para a construção
   pura do contrato.
3. Implementar disposição exaustiva dos tipos aninhados e política localizada.
4. Corrigir a definição e contagem dos fragmentos localizados.
5. Adaptar os writers para persistirem somente operações do contrato.
6. Alterar o journal para receber obrigações concretas.
7. Remover conclusão e lookup por destino do ledger.
8. Implementar readers tipados para todas as tabelas projetáveis.
9. Comparar integralmente observação e contrato no `ArtifactVerifier`.
10. Canonicalizar o DTO de evidências e atualizar o relatório para versão 3.
11. Adicionar a matriz de testes do ledger e das adulterações semânticas.
12. Executar build integral dos seis locales e reutilização de versão.
13. Atualizar os READMEs do builder, fixtures e fonte canônica.
14. Executar os testes específicos e a validação geral do workspace.

Cada etapa mantém seus testes diretamente relacionados aprovados antes da etapa
seguinte.

## Entregáveis

- `ProjectionContract` puro, tipado e determinístico;
- operações tipadas para todas as tabelas e para o CAS;
- writers que consomem somente o contrato;
- journal de obrigações concretas;
- ledger sem expansão por destino;
- disposição exaustiva de structs aninhados;
- política fechada para conteúdo localizado;
- contagem localizada única e coerente;
- readers semânticos de `system` e `system_media`;
- comparação integral entre contrato e artefatos;
- digest canônico e relatório schema 3;
- testes de adulteração com checksums atualizados;
- documentação atualizada.

## Critérios De Aceite

- Registrar um destino não conclui implicitamente nenhuma obrigação.
- Cada operação publica somente suas obrigações explicitamente declaradas.
- Obrigações diferentes com o mesmo destino permanecem independentes.
- Um rollback não deixa obrigações ou eventos concluídos.
- Cada valor persistido nasce do `ProjectionContract`.
- Cada obrigação esperada pertence a exatamente uma operação do contrato.
- Todas as linhas e colunas projetáveis observadas coincidem com o contrato.
- Relações e ordenações coincidem com as identidades canônicas esperadas.
- Busca observada coincide em valor, normalização, proveniência e ordem.
- Conteúdo compilado coincide integralmente com o documento esperado.
- Uma adulteração continua recusada depois de atualizar checksums e tamanhos.
- Um campo novo em objeto aninhado exige disposição por erro de compilação.
- Uma chave localizada sem política é recusada.
- Lista localizada vazia contabiliza zero fragmentos.
- Fonte, ledger, contrato e relatório apresentam a mesma contagem localizada.
- O digest das evidências usa serialização canônica versionada.
- Staging e reutilização executam a mesma equivalência semântica.
- DDL e versões técnicas dos bancos permanecem inalterados.
- Apps, packages de runtime e ramo `user` permanecem inalterados.
- O crate passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral de validação.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](./01c-app-system-consumption.md).
