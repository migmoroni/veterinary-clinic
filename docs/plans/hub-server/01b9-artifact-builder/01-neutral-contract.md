# Parte 1B.9.1: Contrato Neutro E Fronteiras

## Objetivo

Criar `packages/artifact-builder` como library crate e estabelecer a API neutra
que separa compilação de domínio da materialização de artefatos. Esta etapa
define contratos e testes de arquitetura sem transferir ainda a geração usada
por `knowledge-builder`.

## Pré-Requisito

A [Parte 1B.8.6](../01b8-knowledge-builder-maintainability/06-direct-product-attributes.md)
está concluída e o workspace está saudável.

## 1. Workspace E Package

Adicionar ao Cargo Workspace:

```text
packages/artifact-builder
```

O package contém:

```text
packages/artifact-builder/
├── Cargo.toml
├── README.md
└── src/
    ├── lib.rs
    ├── contract.rs
    ├── digest.rs
    └── error.rs
```

Usar apenas dependências já presentes no workspace nesta etapa. A crate não
possui binário, CLI, tipos veterinários ou acesso a `data/knowledge`.

## 2. Contrato Público

Definir tipos com significado equivalente a:

```rust
pub struct ArtifactBuildRequest {
    pub identity: BuildIdentity,
    pub variants: Vec<ArtifactVariant>,
    pub cas: CasPlan,
}

pub struct BuildIdentity {
    pub version: u64,
    pub profile: ProfileIdentity,
}

pub struct ProfileIdentity {
    pub name: ProfileName,
    pub version: SemVer,
    pub schema_version: u32,
    pub metadata: CanonicalJsonObject,
}

pub struct ArtifactVariant {
    pub key: VariantKey,
    pub databases: Vec<DatabasePlan>,
    pub cas_objects: Vec<Sha256Digest>,
}

pub struct DatabasePlan {
    pub name: ArtifactName,
    pub relative_path: ArtifactPath,
    pub ddl: String,
    pub tables: Vec<TableData>,
}

pub struct TableData {
    pub table: SqlIdentifier,
    pub load_order: u32,
    pub columns: Vec<SqlIdentifier>,
    pub rows: Vec<TableRow>,
}

pub struct TableRow {
    pub identity: RowIdentity,
    pub values: Vec<SqlValue>,
}

pub enum SqlValue {
    Null,
    Integer(i64),
    Real(f64),
    Text(String),
    Blob(Vec<u8>),
}

pub struct CasPlan {
    pub relative_root: ArtifactPath,
    pub objects: Vec<CasObject>,
}

pub struct CasObject {
    pub digest: Sha256Digest,
    pub source: CasObjectSource,
}

pub struct ArtifactBuildResult {
    pub schema_version: u32,
    pub identity: BuildIdentity,
    pub variants: Vec<BuiltVariant>,
    pub cas: BuiltCas,
}

pub struct BuiltVariant {
    pub key: VariantKey,
    pub artifacts: Vec<BuiltArtifact>,
    pub cas_set_digest: Sha256Digest,
}

pub struct BuiltArtifact {
    pub name: ArtifactName,
    pub kind: ArtifactKind,
    pub relative_path: ArtifactPath,
    pub size: u64,
    pub digest: Sha256Digest,
    pub schema_fingerprint: Option<Sha256Digest>,
}
```

`CasObjectSource` aceita um arquivo regular autorizado ou bytes já produzidos em
memória. Isso permite que o adaptador entregue mídias originais por caminho e
thumbnails gerados sem criar arquivos intermediários rastreáveis.

Os nomes podem acompanhar o estilo final da crate, mas a semântica permanece:

- `variant` é uma dimensão opaca; o adaptador veterinário usa o locale como
  chave, e `cas_objects` declara o conjunto exigido por essa variante;
- `profile` identifica o contrato consumidor, e seu `metadata` carrega somente
  os valores canônicos que devem integrar o manifest final;
- `database` contém DDL confiável fornecido pelo adaptador;
- `TableData.load_order` define a sequência de carga necessária às foreign keys
  e é único e contínuo dentro do banco;
- `TableRow.identity` determina ordenação e unicidade, sem significado de
  domínio;
- `SqlValue` cobre somente valores nativos aceitos pelo SQLite, e `Real` aceita
  apenas valores finitos;
- o hash do objeto CAS é calculável e verificável pela crate;
- todos os caminhos são relativos, normalizados e incapazes de escapar da raiz
  de saída.

Coleções públicas são validadas como não vazias quando aplicável e sem
duplicações. Variantes, bancos, rows e objetos CAS são ordenados pela crate;
tabelas seguem `load_order`, e colunas mantêm a ordem declarada para binding.
Construtores retornam erro para identificadores, caminhos, hashes ou
cardinalidades inválidos.

Cada digest de variante referencia exatamente um objeto de `CasPlan`. A união
dos conjuntos das variantes é igual ao conjunto global de objetos, e um mesmo
digest pode pertencer a várias variantes sem duplicar seus bytes.

`CanonicalJsonObject` aceita somente objeto JSON, normaliza recursivamente a
ordem das chaves e recusa números não representáveis de maneira estável. A crate
trata seu conteúdo como opaco; o adaptador possui e valida o schema desse
metadata antes de montar o request.

`ProfileIdentity` contém nome, versão SemVer e versão inteira do schema do
metadata. A versão da crate e a identidade do perfil aparecem separadamente no
manifest, permitindo identificar motor e adaptador sem acoplá-los.

A API pública de execução possui a forma:

```rust
pub fn build(
    request: &ArtifactBuildRequest,
    output_root: &Path,
) -> Result<ArtifactBuildResult, ArtifactBuilderError>;

pub fn verify(
    request: &ArtifactBuildRequest,
    output_root: &Path,
) -> Result<ArtifactBuildResult, ArtifactBuilderError>;
```

`verify` não escreve, repara ou completa artefatos. Ela reconstrói o resultado
a partir de uma versão publicada e exige igualdade com o request.

## 3. Fronteira Do DDL E Das Rows

`artifact-builder` recebe o DDL e rows já compiladas. A crate não contém:

- seleção de schema por `entityType`;
- regras de taxonomia, localização ou conteúdo;
- JSONPath, templates ou linguagem de transformação;
- inferência de tabela a partir do diretório de entrada;
- serialização automática de structs de domínio para colunas;
- SQL específico de `system` ou `system_media`.

O adaptador escolhe banco, tabela, colunas e valores. A crate valida os
identificadores contra o schema SQLite materializado antes das inserções e usa
prepared statements com quoting próprio para identificadores validados.

## 4. Digest E CAS

Concentrar `Sha256Digest` e seu parser na crate. O tipo:

- aceita somente 64 caracteres hexadecimais minúsculos;
- calcula SHA-256 de bytes e arquivos;
- oferece comparação sem conversão textual intermediária;
- define o caminho fan-out
  `<2-hex>/<2-hex>/<hash>.bin`.

`knowledge-builder` pode usar esse tipo ao preparar referências de mídia. A
crate materializa somente objetos declarados cujo conteúdo corresponde ao hash.

Transformação de imagens e decisão sobre thumbnails não pertencem a esse
contrato; o adaptador entrega cada objeto final ao CAS.

## 5. Erros

Definir uma família pública pequena, com variantes estáveis para:

- contrato inválido;
- filesystem;
- SQLite;
- digest ou CAS;
- verificação;
- publicação.

Erros concretos preservam `Error::source()`. Não criar uma enumeração por módulo,
contextos genéricos com campos opcionais ou erros que mencionem conceitos do
domínio veterinário.

## 6. Provas De Neutralidade

Adicionar testes que não usem nomes, DDLs ou dados veterinários:

- duas variantes chamadas `alpha` e `beta`;
- bancos `library` e `assets`;
- tabelas pequenas de livros e arquivos;
- rows com todos os casos de `SqlValue`;
- objetos CAS compartilhados pelas duas variantes.

Comprovar pelo manifesto Cargo e por busca estrutural, em
`packages/artifact-builder`:

- ausência de dependências em `knowledge-builder`, `engine`, apps ou packages de
  domínio;
- ausência de tipos públicos com termos `product`, `veterinary`, `taxonomy`,
  `locale`, `system_media` ou nomes dos seis locales;
- ausência de `include_str!` apontando para fora do próprio package.

Não criar testes baseados na leitura textual de arquivos Rust. A separação de
crates e o grafo Cargo comprovam dependências; a revisão estrutural comprova o
vocabulário da API.

## 7. Testes Específicos

Executar:

```text
cargo fmt --package artifact-builder -- --check
cargo check -p artifact-builder --all-targets
cargo clippy -p artifact-builder --all-targets -- -D warnings
cargo test -p artifact-builder --all-targets --locked
```

Depois, executar a skill `$validate-workspace`.

## Fora Do Escopo

- materializar bancos ou publicar diretórios;
- alterar `tools/knowledge-builder` ou `data/knowledge`;
- criar CLI genérica;
- criar sistema de plugins, macros ou DSL;
- publicar a crate externamente;
- alterar DDLs ou artefatos veterinários;
- adicionar dependências.

## Critérios De Aceite

- `packages/artifact-builder` integra o Cargo Workspace como library crate.
- A API expressa variantes, bancos, tabelas, rows, valores SQLite e CAS sem
  conceitos veterinários.
- DDL e rows pertencem ao consumidor.
- Hashes, identificadores e caminhos são tipos validados.
- A fixture neutra compila e testa o contrato público.
- `knowledge-builder` continua saudável durante esta etapa.
- O workspace passa pela skill `$validate-workspace`.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.9.2: motor genérico de artefatos](./02-generic-engine.md).
