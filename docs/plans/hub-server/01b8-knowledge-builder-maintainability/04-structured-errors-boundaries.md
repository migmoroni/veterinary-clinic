# Parte 1B.8.4: Erros Estruturados E Fronteiras

## Objetivo

Fazer falhas atravessarem o pipeline como tipos estruturados, preservar causas e
contexto e tornar as dependências entre módulos explícitas. Texto completo para
o usuário é produzido por `Display` e apresentado na fronteira da CLI.

## Pré-Requisito

A [Parte 1B.8.3](./03-artifact-verification.md) está concluída. A verificação
integral possui componentes coesos e uma fachada única.

## 1. API Pública Final

Preservar:

```rust
pub fn validate(
    source: impl AsRef<Path>,
) -> Result<ValidatedSource, ValidationError>;
```

Alterar deliberadamente o build para:

```rust
pub fn build(
    options: &BuildOptions,
) -> Result<BuildResult, KnowledgeBuilderError>;
```

Definir:

```rust
pub enum KnowledgeBuilderError {
    Validation(ValidationError),
    Context(BuildContextError),
    Contract(ContractError),
    Database(DatabaseError),
    Media(MediaError),
    Cas(CasError),
    Verification(VerificationError),
    Publication(PublicationError),
}
```

Os tipos internos podem usar variantes mais específicas, mas a API pública não
retorna `String`, `Box<dyn Error>` nem uma estrutura genérica formada por vários
campos opcionais. Cada erro pertence ao módulo que define sua invariante e é
composto pelo enum raiz.

Os tipos diretamente carregados pelas variantes públicas também são públicos e
reexportados pela raiz do crate. Eles expõem contexto estável por variantes ou
getters, mantendo detalhes internos encapsulados.

`BuildOptions`, `BuildResult`, `ValidatedSource`, `ValidationError` e os schemas
serializados permanecem com seus contratos atuais.

## 2. CLI

Definir um `CliError` público porque `cli::run` é público:

```rust
pub enum CliError {
    Arguments(CliArgumentError),
    Builder(KnowledgeBuilderError),
}

pub fn cli::run<I>(arguments: I) -> Result<(), CliError>;
```

O comando `validate` converte `ValidationError` em
`KnowledgeBuilderError::Validation`. Parsing de argumentos e texto de usage
pertencem a `CliArgumentError`, não a variantes de banco ou validação.

`main` imprime o `Display` de `CliError` e define o código de saída. Não remonta
cadeias internas manualmente.

## 3. Ownership Dos Erros

- `validation` mantém `Diagnostic` e `ValidationError` ordenados e detalhados.
- leitura do contexto possui `BuildContextError`.
- construção e validação do contrato possuem `ContractError`.
- criação, transação, PRAGMAs e queries SQLite possuem `DatabaseError`.
- decode, perfil e thumbnail possuem `MediaError`.
- caminhos, hash e materialização CAS possuem `CasError`.
- cada componente de verificação produz `VerificationError` contextualizado.
- staging, rename e finalização possuem `PublicationError`.

Cada tipo implementa `Display` e `std::error::Error`. Quando houver causa Rust
concreta, `source()` a preserva. Implementar com a biblioteca padrão; qualquer
crate adicional exige interrupção e autorização explícita do usuário.

## 4. Contexto Estruturado

Erros carregam apenas contexto aplicável à variante:

- caminho;
- entidade;
- locale;
- operação;
- banco, tabela ou row;
- artefato;
- valor esperado e observado quando seguro;
- causa original.

Não duplicar a mensagem completa a cada `map_err`. Módulos acrescentam contexto
tipado em sua fronteira e deixam a apresentação para `Display`.

## 5. Dependências Explícitas

Remover `use super::*` de todos os arquivos de produção e teste do crate. Cada
arquivo importa diretamente os tipos e funções consumidos.

Preservar o fluxo:

```text
contracts
-> source
-> validation
-> projection::inventory + projection::contract
-> writers + CAS
-> verification
-> publication
-> CLI
```

Regras obrigatórias:

- `contracts` não depende das camadas seguintes;
- `source` não depende de SQLite;
- `validation` não depende de writers;
- contrato e inventário não abrem bancos;
- writers não leem JSON ou Markdown de autoria;
- readers não dependem de writers;
- ledger depende de obrigações e recibos, não de entidades concretas;
- verification não altera artefatos;
- CLI usa apenas `validate`, `build` e seus erros públicos.

Não resolver ciclos com `common`, `utils`, `helpers`, `manager` ou tipos sem
proprietário. Reexports internos só existem quando expressam uma fronteira
deliberada, não para conservar caminhos substituídos.

## 6. Versão

Elevar `knowledge-builder` de `0.3.1` para `0.4.0` nesta parte, junto da mudança
da API pública de `build` e `cli::run`. Atualizar `Cargo.lock`.

Não elevar versões de fonte, bancos, conteúdo, contexto, manifest, relatório ou
evidência. `builderVersion` passa a `0.4.0` nos artefatos gerados.

## 7. Testes Específicos

Cobrir variantes e contexto sem depender de texto completo, exceto nos testes
dedicados a `Display` e usage da CLI:

- wrapping de `ValidationError` sem perder diagnósticos;
- preservação de path, locale, banco, tabela, operação e causa;
- erro de contexto, contrato, SQLite, mídia, CAS, verificação e publicação;
- `source()` disponível para causas concretas;
- CLI convertendo erros públicos e mantendo código de saída;
- ausência de `Result<_, String>` nas fronteiras principais;
- ausência de `use super::*` em `tools/knowledge-builder/src`.

Executar testes específicos, suíte integral e `$validate-workspace`.

## Fora Do Escopo

- alterar diagnósticos editoriais ou sua ordenação;
- mudar formatos serializados;
- adicionar dependências sem autorização;
- criar aliases ou wrappers para assinaturas substituídas;
- reorganizar a topologia integral dos testes.

## Critérios De Aceite

- `build` retorna `KnowledgeBuilderError` e `validate` mantém `ValidationError`.
- `cli::run` retorna `CliError`.
- Erros de domínio preservam contexto e causa de forma tipada.
- A apresentação textual fica concentrada em `Display` e na CLI.
- Não há enums genéricos com contexto opcional indiscriminado.
- Não existe `use super::*` no crate.
- Dependências respeitam as fronteiras declaradas.
- O crate usa versão `0.4.0`; schemas técnicos não mudam.
- Os testes específicos e o gate geral da skill `$validate-workspace` passam.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.8.5: topologia de testes e guia de manutenção](./05-test-topology-maintenance-guide.md).
