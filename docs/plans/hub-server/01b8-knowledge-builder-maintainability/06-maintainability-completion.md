# Parte 1B.8.6: Fechamento Das Fronteiras E Do Custo De Manutenção

## Objetivo

Concluir as fronteiras de manutenção do `knowledge-builder` com três provas de
cobertura realmente independentes, erros tipados durante todo o pipeline,
inventário distribuído entre proprietários semânticos, ledger com custo
logarítmico para unicidade e testes separados também pelo custo de execução.

```text
ValidatedSource -> inventory independente ----------------> expected
ValidatedSource -> ProjectionContract -> operações -------> owned
operações -> efeitos comprovados -> ConfirmedReceiptBatch -> observed

expected == owned == observed
```

Esta parte atua somente na implementação interna e na organização dos testes.
Os artefatos produzidos permanecem semanticamente idênticos.

## Pré-Requisito

As Partes 1B.8.1 a 1B.8.5 estão aplicadas. O crate usa versão `0.5.0`, possui a
fachada única `ArtifactVerifier`, rows tipadas, recibos confirmados e as camadas
de teste `lib`, `component` e `integral`.

## Invariantes

- DDLs, tabelas, colunas, índices, constraints e application IDs não mudam.
- Schemas técnicos e versões de `system`, `system_media`, manifest, relatório,
  contexto, conteúdo e evidência não mudam.
- O crate permanece na versão `0.5.0`.
- Rows, JSON compilado, bancos, thumbnails, CAS, manifests, checksums, relatório
  e evidence digest permanecem semanticamente idênticos.
- Os seis locales continuam obrigatórios em todo build público.
- Writers continuam usando SQL fixo e readers mantêm queries independentes.
- Recibos SQLite continuam surgindo somente depois do commit bem-sucedido.
- A verificação continua somente leitura e é igual para staging e reutilização.
- Nenhum contrato interno é tornado público apenas para facilitar testes.
- Não há mudanças em `data/knowledge`, apps, packages de runtime ou Hub.
- Não há migrations, conversões, formatos paralelos ou camadas de
  compatibilidade.
- Nenhuma dependência nova é adicionada.

## 1. Referência Da Execução

Antes da primeira alteração, registrar em diretório ignorado pelo Git:

```text
target/knowledge-builder-maintainability/completion-reference/
├── measurements.json
└── scenarios.md
```

`measurements.json` contém:

- quantidade de testes nas camadas `lib`, `component` e `integral`;
- quantidade de construções novas dos seis locales executadas por cada camada;
- tempo observado de cada camada, apenas para comparação informativa;
- contagem de operações e eventos por locale em um build de
  `data/knowledge`.

`scenarios.md` registra os casos ativos de determinismo, reutilização,
adulteração, transação, mídia, CAS e CLI. Tempo absoluto não aprova nem reprova
a implementação.

Remover essa referência depois da comparação final. Ela não entra no
repositório nem se torna fonte de teste ou execução.

## 2. Independência Entre `expected` E `owned`

### 2.1 Preparação Do Locale

Introduzir um agregado interno com nome equivalente a
`LocaleProjectionPlan`, contendo separadamente:

```rust
pub(crate) struct LocaleProjectionPlan {
    pub(crate) expected: BTreeSet<ProjectionObligation>,
    pub(crate) contract: ProjectionContract,
}
```

O proprietário pode ficar em `projection/model.rs` ou em outro arquivo com o
mesmo significado. Ele coordena resultados já construídos; não contém regras de
entidade, busca, taxonomia, mídia ou persistência.

Para cada locale, a preparação executa duas construções independentes:

```text
inventory::expected_obligations(source, locale, release)
ProjectionContract::build(source, locale, context)
```

`ProjectionContract::build` não recebe `expected`, `ExpectedInventory`,
`ObligationOwnership` nem qualquer coleção derivada pelo inventário. O contrato
também não recebe candidatos de busca produzidos por `inventory`.

Depois das duas construções:

1. `ProjectionContract::ownership()` calcula `owned` exclusivamente pela união
   das obrigações declaradas nas operações;
2. o coordenador exige igualdade exata entre `expected` e `owned` antes de abrir
   bancos ou criar staging do locale;
3. o ledger recebe os dois conjuntos já independentes e os owners calculados
   das operações;
4. `ArtifactVerifier` recebe o plano do locale e usa `expected` para cobertura e
   `contract` para equivalência semântica.

Remover `ObligationOwnership::from_expected`, `claim` sobre obrigações esperadas
e qualquer fluxo em que uma operação copie sua cobertura do inventário.

### 2.2 Obrigações Declaradas Pelas Operações

Cada projector constrói sua row ou efeito e declara diretamente as obrigações
que essa operação possui. A declaração usa apenas:

- `ValidatedSource` e o contexto do locale;
- o payload ou efeito construído pelo próprio projector;
- o vocabulário tipado de `projection::coverage`;
- identidades e descritores fechados do contrato.

O mapeamento de uma folha de autoria para `ProjectionTarget`, `SourceToken` e
`ObligationClass` não é importado do inventário. A duplicação deliberada entre
inventário e contrato constitui a prova independente e não deve ser extraída
para uma função compartilhada.

Busca segue a mesma regra:

- `inventory/search.rs` deriva os termos esperados e suas obrigações;
- `contract/search.rs` deriva as rows, valores normalizados e obrigações owned;
- ambos podem consumir fatos canônicos de `ValidatedSource`, mas não a saída um
  do outro;
- `SearchCandidate` não fica em `coverage` quando representar uma decisão de
  busca, pois `coverage` contém somente o vocabulário neutro da prova.

### 2.3 Provas Obrigatórias

Criar testes que introduzam divergências controladas entre as duas construções e
comprovem a recusa antes de qualquer efeito:

- target incorreto para uma folha com o mesmo owner;
- source token omitido ou adicional;
- classe divergente;
- owner existente com conjunto incompleto;
- operação adicional sem obrigação esperada;
- obrigação esperada sem operação;
- termo de busca esperado com provenance, occurrence ou target divergente;
- destino compartilhado sem conclusão implícita de outra folha.

Os testes não podem formar `owned` clonando `expected` como setup do caso feliz.
Devem construir os conjuntos por caminhos distintos.

## 3. Proprietários Semânticos Do Inventário E Do Contrato

### 3.1 Inventário

Organizar o inventário com responsabilidades executáveis:

```text
projection/inventory/
├── mod.rs
├── model.rs
├── metadata.rs
├── entities.rs
├── taxonomy.rs
├── search.rs
└── media.rs
```

- `mod.rs`: coordena os produtores e devolve o conjunto final.
- `model.rs`: contém `ExpectedInventory` e invariantes de inserção única.
- `metadata.rs`: declara obrigações dos dois bancos e do contexto de release.
- `entities.rs`: declara campos e relações próprios das entidades canônicas.
- `taxonomy.rs`: declara registry, termos, hierarquia e relações taxonômicas.
- `search.rs`: declara candidatos e obrigações de busca esperadas.
- `media.rs`: declara mídia estrutural, mídia Markdown, `system_media` e CAS.

`media.rs` e `taxonomy.rs` contêm implementação real. Remover arquivos vazios e
remover `inventory/helpers.rs`. Construtores triviais do vocabulário podem ser
métodos dos tipos de `coverage`; regras de autoria permanecem no produtor
semântico correspondente.

### 3.2 Contrato

Distribuir as responsabilidades de `contract/helpers.rs` entre proprietários
semânticos:

```text
projection/contract/
├── build.rs
├── model.rs
├── operations.rs
├── ownership.rs
├── compilation.rs
├── metadata.rs
├── taxonomy.rs
├── catalog.rs
├── search.rs
├── media.rs
└── rows/
```

- emissão e identidade genérica de operações ficam em `operations.rs`;
- compilação e suas obrigações ficam em `compilation.rs`;
- metadata fica em `metadata.rs`;
- relações taxonômicas ficam em `taxonomy.rs`;
- rows de busca e sua cobertura ficam em `search.rs`;
- referências e operações de mídia/CAS ficam em `media.rs`;
- extração localizada e serialização ficam junto do projector que conhece o
  contrato do valor, ou em um módulo com responsabilidade específica de
  codificação de valores, nunca em um agrupamento genérico.

Remover `contract/helpers.rs`. Não substituir por `common`, `utils`, `manager`
ou outro nome genérico. Não deixar módulos vazios, wrappers ou reexports para os
caminhos removidos.

### 3.3 DAG

Preservar:

```text
coverage -> inventory -> expected ---------------------------┐
coverage -> contract  -> operações -> owned                  ├-> ledger
coverage -> execution <- operações -> recibos confirmados ---┘
```

- `coverage` não conhece regras de domínio nem as demais camadas.
- `inventory` e `contract` não importam um ao outro.
- `execution` não importa inventário ou ledger.
- `ledger` não importa inventário, projectors, writers, CAS ou SQLite.

O teste arquitetural percorre recursivamente todos os arquivos Rust de cada
fronteira. Não manter uma lista parcial que deixe arquivos novos fora da prova.

## 4. Erros Tipados Em Todo O Pipeline

### 4.1 Regra De Transporte

As famílias públicas permanecem:

```text
ValidationError
BuildContextError
ContractError
DatabaseError
MediaError
CasError
VerificationError
PublicationError
```

Funções internas podem usar erros privados coesos, mas não transportam falhas
entre responsabilidades como `String`. Cada fronteira converte o erro privado
para sua família responsável preservando a causa concreta com `#[source]`.

Eliminar `Result<_, String>` como transporte de erro em:

- `projection/inventory`;
- `projection/contract`;
- `projection/execution`;
- `projection/ledger`;
- `projection/build.rs` e `projection/reuse.rs`;
- `verification/artifact` e `verification/readers`;
- operações de `databases` e `report` usadas pelo build.

`String` continua válido como dado, detalhe de diagnóstico editorial acumulado
em `ValidationError` e resultado de `Display`. Não usar `.to_string()` ou
`format!` para apagar uma causa `io::Error`, `serde_json::Error`,
`rusqlite::Error` ou `image::ImageError` antes da fronteira pública.

### 4.2 Contrato Dos Componentes

- Inventário, construção de operações, ownership e ledger retornam
  `ContractError` ou erros privados convertíveis sem perder contexto.
- Writers retornam `DatabaseError` e preservam caminho, banco, tabela, operação
  e `rusqlite::Error`.
- Execução CAS retorna `CasError` e preserva caminho, operação e `io::Error`.
- Cada estágio de `ArtifactVerifier` retorna `VerificationError` diretamente.
- Readers retornam erro SQLite tipado; a conversão para `VerificationError`
  preserva `DatabaseError` como causa e acrescenta locale e estágio.
- Parsing de manifests e relatórios preserva `serde_json::Error`.
- Verificação de thumbnails preserva `image::ImageError`.
- Falhas de filesystem preservam `io::Error` e o caminho correspondente.

Adicionar variantes somente quando representam uma invariante estável da
família. Não criar enum público por arquivo, contexto genérico com muitos campos
opcionais ou uma mensagem completa repetida em cada `map_err`.

### 4.3 Testes Dos Erros

Exercitar falhas reais do pipeline e verificar tipo, getters e cadeia de causas:

- contexto ausente e JSON inválido;
- contrato com cobertura divergente;
- falha SQLite em reader e writer;
- manifest ou relatório JSON inválido;
- arquivo ausente na árvore verificada;
- thumbnail inválido;
- objeto CAS ausente ou adulterado;
- falha de publicação.

Testes de contrato não devem apenas instanciar manualmente a variante esperada.
Asserções sobre texto completo ficam restritas a `Display` e usage da CLI.
Testes de comportamento usam variantes, getters, estágio e `Error::source()`.

## 5. Unicidade E Atomicidade Eficientes No Ledger

Substituir a busca linear em `Vec<ProjectionEvent>` por armazenamento ordenado:

```rust
BTreeSet<ProjectionEvent>
```

`ProjectionEvent` já possui ordem total. O relatório usa contagens e agregações,
portanto não depende da ordem de inserção.

`ProjectionLedger::observe` valida o lote inteiro antes de alterar o estado:

1. validar locale, owner, conjunto de obrigações, evento e cardinalidade;
2. detectar duplicações contra o ledger e dentro do próprio lote usando sets
   temporários;
3. somente depois de todas as validações, estender operações, obrigações e
   eventos observados;
4. em erro, manter o ledger byte a byte equivalente ao estado existente no
   início da operação.

Não clonar todas as coleções acumuladas a cada lote e não usar `Vec::contains`
para unicidade. Cobrir lote grande, duplicação interna, duplicação contra o
estado acumulado e falha no último recibo sem publicação parcial. Não usar
limite de tempo como asserção.

## 6. Separação Real Do Custo Dos Testes

### 6.1 Camada Unitária E De Componentes Internos

Testes de componentes privados ficam sob `#[cfg(test)]` junto dos proprietários:

- transações, commit, rollback e round-trip junto de writers/readers;
- verificadores individuais junto de cada estágio de `verification`;
- mídia, thumbnail e CAS junto dos respectivos módulos;
- ledger, ownership e erros junto de seus contratos.

Eles usam bancos em memória, diretórios mínimos ou fixtures pequenas e não
executam o build público dos seis locales. Nenhuma API de produção se torna
pública para permitir esses testes.

### 6.2 Camada `--test component`

`tests/component.rs` continua como raiz fina de testes black-box que atravessam
uma fronteira pública sem construir uma versão completa. Ela pode testar
`validate`, filesystem autoral e fixtures por meio da API pública.

Remover ou realocar `component_cases/databases.rs`, `media.rs` e
`verification.rs` quando seus cenários dependerem de `build()`. Não manter
arquivos vazios para preservar a árvore. A documentação passa a listar somente
os casos existentes.

Impor por teste arquitetural que `tests/component.rs` e
`tests/component_cases/` não importem nem chamem `build` ou `BuildOptions`.

### 6.3 Camada Integral

Somente `tests/integral.rs` e `tests/integral_cases/` chamam o build público.
Consolidar setups equivalentes:

- uma saída canônica pode alimentar uma matriz de adulterações dentro do mesmo
  teste, restaurando os bytes antes de cada caso;
- determinismo mantém duas saídas independentes;
- mídia com fonte modificada mantém seu próprio build;
- testes distintos não compartilham diretório mutável;
- chamadas sobre uma versão já finalizada são classificadas como verificação de
  reutilização, não como construção nova.

Adicionar ao suporte uma distinção explícita entre `fresh_build` e
`verify_reuse`, sem reimplementar produção. A medição final deve apresentar zero
construções novas na camada de componente e menos construções novas totais que a
referência desta parte, preservando todos os cenários registrados.

Não substituir cobertura por snapshots extensos nem usar cache persistente
entre execuções de teste.

## 7. README Vigente

Atualizar `tools/knowledge-builder/README.md` no presente para refletir:

- preparação independente de `expected` e `ProjectionContract`;
- origem de `owned` exclusivamente nas operações;
- responsabilidades reais de cada arquivo de inventário e contrato;
- transporte tipado das causas até a API pública;
- ledger baseado em sets e publicação atômica dos lotes;
- testes privados junto dos proprietários;
- camada `component` sem build e builds completos somente em `integral`.

Remover descrições de módulos que não existam ou não possuam comportamento.
Não incluir medições temporárias, comparação histórica ou propostas futuras.

## 8. Testes Específicos

Executar durante a implementação:

```text
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets
cargo clippy -p knowledge-builder --all-targets -- -D warnings
cargo test -p knowledge-builder --lib
cargo test -p knowledge-builder --test component
cargo test -p knowledge-builder --test integral
cargo test -p knowledge-builder --all-targets --locked
```

Confirmar também por busca estrutural:

- ausência de `ObligationOwnership::from_expected` e claims sobre `expected`;
- ausência de import entre `inventory` e `contract`;
- ausência de `Result<_, String>` nas fronteiras listadas;
- ausência de conversão textual de causas concretas;
- ausência de `Vec::contains` para eventos do ledger;
- ausência de `build` na camada de componente;
- ausência de `helpers.rs`, módulos vazios, wrappers e reexports sem
  responsabilidade própria.

Ao final, executar a skill `$validate-workspace` como gate geral e apresentar o
resultado completo antes de considerar a parte concluída.

## Fora Do Escopo

- alterar a fonte canônica ou seus schemas;
- alterar DDLs, versões técnicas ou formatos públicos;
- alterar regras de normalização, Markdown, mídia ou thumbnails;
- alterar a política de CAS, staging, reutilização ou publicação;
- adicionar uma API pública de build por locale;
- adicionar dependências, benchmarks ou ferramentas arquiteturais;
- modificar apps, packages, Hub ou consumo dos artefatos;
- criar migrations, conversões ou caminhos de compatibilidade.

## Critérios De Aceite

- `expected` e `owned` são produzidos por travessias independentes da fonte.
- `ProjectionContract::build` não recebe nem consulta `expected` ou saídas do
  inventário.
- As operações declaram suas próprias obrigações e `owned` é calculado somente
  a partir delas.
- Divergência entre inventário e contrato é recusada antes de qualquer efeito.
- Inventário e contrato não importam um ao outro e não possuem módulos vazios ou
  agrupamentos genéricos de responsabilidades.
- Erros atravessam as fronteiras tipados e preservam causas concretas.
- Testes de erros exercitam falhas reais e não dependem de mensagens completas.
- O ledger usa unicidade ordenada sem busca ou cópia quadrática das coleções.
- Um lote recusado não publica observação parcial.
- A camada unitária não executa build completo.
- A camada de componente executa zero builds dos seis locales.
- Somente a camada integral chama `build` e a quantidade de construções novas é
  menor que a referência desta parte.
- Todos os cenários de adulteração, determinismo, reutilização, transação, mídia,
  CAS e CLI permanecem ativos.
- Artefatos e evidências permanecem semanticamente idênticos.
- O README descreve com exatidão somente a implementação vigente.
- Nenhum artefato temporário da comparação permanece no repositório ou em
  `target/knowledge-builder-maintainability/completion-reference`.
- O crate passa em formatação, compilação, Clippy e todas as camadas de teste.
- O workspace passa integralmente pela skill `$validate-workspace`.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](../01c-app-system-consumption.md).
