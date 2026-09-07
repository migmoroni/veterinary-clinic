# Parte 1B.9.2: Motor Genérico De Artefatos

## Objetivo

Implementar em `artifact-builder` o pipeline determinístico que transforma um
`ArtifactBuildRequest` em bancos SQLite, objetos CAS, manifest verificável e
publicação atômica.

## Pré-Requisito

A [Parte 1B.9.1](./01-neutral-contract.md) está concluída.

## 1. Pipeline

Implementar o fluxo:

```text
ArtifactBuildRequest + output_root
-> validação integral do plano
-> staging exclusivo
-> DDL e rows SQLite
-> objetos CAS
-> build-result.json genérico
-> verificação do staging
-> promoção CAS idempotente
-> publicação atômica da versão
-> ArtifactBuildResult
```

O diretório da versão é o ponto de visibilidade do build e só aparece depois de
todas as etapas serem aprovadas.

Organizar por responsabilidade concreta:

```text
src/
├── lib.rs
├── contract.rs
├── digest.rs
├── error.rs
├── sqlite.rs
├── cas.rs
├── manifest.rs
├── verification.rs
└── publication.rs
```

Não criar `common`, `utils`, `manager`, ledger, ownership, recibos ou inventário
paralelo do plano.

## 2. Escrita SQLite

Para cada `DatabasePlan`:

1. criar o arquivo somente no staging;
2. habilitar foreign keys;
3. executar o DDL em transação;
4. inspecionar `sqlite_schema` e `PRAGMA table_info`;
5. validar tabela, `load_order`, colunas e quantidade de valores de cada
   `TableData`;
6. carregar tabelas por `load_order`, ordenar suas rows por `RowIdentity` e
   recusar identidades repetidas;
7. executar prepared statement dentro de uma única transação por banco;
8. finalizar o layout determinístico do arquivo;
9. executar `foreign_key_check`, `integrity_check` e expectativas técnicas
   declaradas no plano;
10. calcular tamanho e SHA-256 do banco.

O SQL dinâmico limita-se ao `INSERT` montado com identificadores validados e
corretamente delimitados. Valores usam parâmetros. DDL é contrato confiável do
consumidor, nunca conteúdo de uma row.

`DatabasePlan` pode declarar expectativas opcionais de `application_id` e
`user_version`; quando presentes, a crate as verifica depois do DDL e antes da
publicação.

## 3. CAS

Materializar cada hash uma única vez em:

```text
<cas-root>/<hash[0..2]>/<hash[2..4]>/<hash>.bin
```

Antes de incorporar um objeto:

- recusar symlink e arquivo especial;
- verificar que a fonte autorizada é arquivo regular;
- calcular o SHA-256 dos bytes;
- exigir igualdade com `CasObject.digest`;
- copiar para arquivo temporário no diretório de destino;
- sincronizar e renomear sem expor conteúdo parcial.

Objetos com o mesmo digest e bytes são deduplicados. Declarações conflitantes
para o mesmo digest são recusadas.

## 4. Manifest Genérico

Gerar um documento versionado contendo somente conceitos neutros:

```json
{
  "schemaVersion": 1,
  "buildVersion": 42,
  "engine": {
    "name": "artifact-builder",
    "version": "0.1.0"
  },
  "profile": {
    "name": "example-library",
    "version": "0.1.0",
    "schemaVersion": 1,
    "metadata": {}
  },
  "variants": [
    {
      "key": "alpha",
      "casSetDigestSha256": "<sha256>",
      "artifacts": [
        {
          "name": "library",
          "kind": "sqlite",
          "path": "variants/alpha/library.db",
          "size": 1024,
          "checksumSha256": "<sha256>"
        }
      ]
    }
  ],
  "cas": {
    "root": "CAS/shared",
    "objects": [
      {
        "digestSha256": "<sha256>",
        "size": 2048
      }
    ]
  }
}
```

O contrato final pode acrescentar contagens e hashes necessários à verificação,
mas seus campos estruturais não contêm `locale`, `product`, `knowledge`,
`system` ou dados de release do Hub. `profile.metadata` preserva o objeto
canônico e previamente validado pelo consumidor sem interpretar suas chaves.
Esse metadata e todos os artefatos descritos entram na mesma verificação e na
mesma publicação atômica.

Serialização JSON usa chaves e arrays em ordem canônica. Timestamps, caminhos
absolutos, aleatoriedade e estado da máquina não entram no manifest.

O arquivo recebe o nome `build-result.json` e é a fonte integral de checksums do
build. Não criar `projection-report.json`, evidence digest ou um arquivo
paralelo `checksums.sha256`.

## 5. Verificação

Uma única implementação interna verifica tanto o staging quanto uma saída
publicada. A API pública expõe `verify` conforme o contrato da Parte 1B.9.1; a
forma interna pode receber o resultado já materializado:

```rust
pub fn verify_artifacts(
    root: &Path,
    request: &ArtifactBuildRequest,
    result: &ArtifactBuildResult,
) -> Result<ArtifactVerification, ArtifactBuilderError>;
```

Ela comprova:

- árvore permitida e ausência de arquivos adicionais;
- paths, tamanhos e checksums do manifest;
- identidade e versão do build;
- integridade e foreign keys dos bancos;
- schema, tabelas e colunas declarados;
- quantidade de rows por tabela;
- equivalência dos valores persistidos com `TableData` usando leitura genérica;
- presença e hash de todo objeto CAS declarado;
- metadata canônico do perfil.

O CAS é compartilhado entre versões. Objetos adicionais válidos sob sua raiz
não invalidam uma versão; a verificação exige todos os objetos declarados pelo
request e pelo manifest. A regra de árvore exata se aplica aos artefatos da
versão e aos arquivos de controle, não ao conteúdo acumulado do CAS.

A leitura genérica usa as mesmas colunas do contrato neutro, mas não reutiliza
prepared statements de escrita nem conhece structs do consumidor. As rows
observadas são codificadas e ordenadas canonicamente pelos valores para uma
comparação de multiconjunto com as rows declaradas.

## 6. Publicação

Publicar somente após a verificação integral. Como o CAS é compartilhado, a
publicação segue esta ordem:

1. promover cada objeto CAS ausente por rename atômico e validar qualquer objeto
   já existente com o mesmo hash;
2. sincronizar os diretórios afetados;
3. promover o diretório da versão por rename atômico como ponto único de
   visibilidade do build.

Uma falha entre os passos 1 e 3 pode deixar objetos imutáveis ainda não
referenciados por versão publicada. Esses objetos são válidos, deduplicáveis e
podem ser reutilizados; nenhum manifest ou versão parcial fica visível.

O destino de uma versão é imutável: uma versão existente é aceita somente quando
sua verificação integral contra o mesmo request e resultado é bem-sucedida;
qualquer divergência é erro.

Falhas removem apenas o staging pertencente à execução. A crate não apaga nem
altera versões publicadas diferentes.

## 7. Testes Da Crate

Com a fixture neutra, cobrir:

- dois bancos e duas variantes;
- todos os valores SQLite;
- DDL inválido, tabela e coluna ausentes;
- constraint, foreign key e transação recusadas sem saída parcial;
- ordenação e duplicação de rows;
- build byte a byte determinístico;
- CAS compartilhado e conteúdo adulterado;
- manifest canônico;
- arquivo adicional, ausente, truncado ou modificado;
- reutilização exata da mesma versão;
- recusa de versão existente divergente;
- falha antes e durante publicação;
- caminhos absolutos, `..`, symlinks e arquivos especiais.

Os testes não usam fixtures veterinárias. Preferir bancos e arquivos mínimos;
nenhum teste precisa criar seis variantes.

## 8. Testes Específicos

Executar:

```text
cargo fmt --package artifact-builder -- --check
cargo check -p artifact-builder --all-targets
cargo clippy -p artifact-builder --all-targets -- -D warnings
cargo test -p artifact-builder --all-targets --locked
```

Depois, executar a skill `$validate-workspace`.

## Fora Do Escopo

- interpretar JSON, CSV ou Markdown de autoria;
- processar imagens ou produzir thumbnails;
- conhecer locales e regras veterinárias;
- consultar rede, Hub ou providers externos;
- assinar releases;
- criar migrations;
- criar backend diferente de SQLite e filesystem;
- adicionar dependências sem autorização explícita.

## Critérios De Aceite

- A crate materializa e verifica integralmente a fixture neutra.
- Os bancos são transacionais, íntegros e determinísticos.
- O CAS valida conteúdo, deduplica hashes e usa fan-out fixo.
- Manifest e resultado não carregam conceitos do consumidor.
- Staging inválido nunca se torna versão publicada.
- O pipeline não possui sistema paralelo de obrigações ou recibos.
- Todos os testes específicos e o workspace estão verdes.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.9.3: adaptador veterinário](./03-veterinary-adapter.md).
