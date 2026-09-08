# Parte 1B.9.3: Adaptador Veterinário

## Objetivo

Fazer `tools/knowledge-builder` interpretar e validar `data/knowledge`, compilar
o domínio veterinário para `ArtifactBuildRequest` e delegar integralmente a
materialização dos artefatos a `artifact-builder`.

## Pré-Requisito

A [Parte 1B.9.2](./02-generic-engine.md) está concluída.

## 1. Responsabilidade Da Tool

`knowledge-builder` mantém somente:

- parsing da CLI `validate` e `build`;
- descoberta de `_entity.json`, `_content` e `_media`;
- schemas e tipos das entidades canônicas;
- validação estrutural e semântica do domínio;
- localização nos seis locales;
- normalização de identidade e busca;
- Markdown por AST e resolução de links editoriais;
- processamento de imagens e thumbnails;
- projeção das entidades para rows dos DDLs veterinários;
- criação do `ArtifactBuildRequest`;
- metadados públicos específicos do conjunto de conhecimento;
- testes do adaptador e do build veterinário ponta a ponta.

Ela não implementa writers SQLite, readers estruturais, CAS, staging,
publicação, verificação de integridade ou cálculo paralelo de cobertura.

## 2. Organização

Adotar uma árvore direta, com nomes ajustáveis apenas quando preservarem as
mesmas responsabilidades:

```text
tools/knowledge-builder/src/
├── lib.rs
├── main.rs
├── cli.rs
├── error.rs
├── source/
├── validation/
├── markdown/
├── media/
├── compilation/
│   ├── mod.rs
│   ├── catalog.rs
│   ├── life.rs
│   ├── clinical.rs
│   ├── taxonomy.rs
│   ├── search.rs
│   └── system_media.rs
└── build.rs
```

`compilation` produz diretamente `TableData` e `CasObject`. Não criar
`projection`, `inventory`, `ownership`, `ledger`, operações, recibos,
descritores duplicados de rows ou um verificador veterinário completo dos
artefatos.

## 3. Contrato Da Fonte

Preservar:

```text
<entidade>/
├── _entity.json
├── _content/<locale>.md
└── _media/<arquivos>
```

- diretórios comuns servem somente à organização;
- `entityType` e `id` definem identidade;
- JSON contém estrutura e conteúdo localizado curto;
- Markdown contém conteúdo editorial longo;
- mídia é referenciada por links relativos autorizados;
- os seis locales continuam obrigatórios conforme o schema de cada entidade;
- caminhos e referências são validados antes da compilação.

Não introduzir CSV para entidades hierárquicas nem arquivos intermediários
rastreáveis contendo rows compiladas.

## 4. Taxonomias E Atributos Diretos

Aplicar a regra:

```text
vocabulário compartilhado + hierarquia + identidade própria -> taxonomia
atributo fechado e exclusivo da entidade                    -> campo tipado
relação com entidade de domínio                              -> ID da entidade
```

Preservar o contrato de produto estabelecido na Parte 1B.8.6:

```json
{
  "applicableLifeStages": ["young"],
  "therapeuticSpectrum": "broad"
}
```

Esses atributos já estão validados e projetados em
`applicable_life_stages_json` e `therapeutic_spectrum`. Descritores vacinais
como `V10` e `polivalente` permanecem como texto puro em
`localizedContent.aliases` e seguem a projeção comum de aliases. O adaptador
converte esses dados para `TableData` sem recriar taxonomias, estruturas
intermediárias, objetos opacos concorrentes ou valores inferidos. O schema
técnico de `system` permanece em `5`; `system_media` permanece em `2`.

As dez taxonomias canônicas permanecem quando possuem vocabulário compartilhado
ou hierarquia. A extração da infraestrutura genérica não altera o contrato
semântico fechado nesta etapa.

## 5. Compilação Do Domínio

Para cada locale:

1. selecionar valores localizados da fonte validada;
2. compilar e normalizar os documentos Markdown;
3. processar as mídias e thumbnails;
4. calcular seus hashes com os tipos de `artifact-builder`;
5. construir rows tipadas localmente somente enquanto necessário à clareza do
   domínio;
6. converter essas rows em `TableData` com identidade lógica estável;
7. declarar objetos finais em `CasPlan`;
8. montar os planos de `system` e `system_media` com seus DDLs;
9. entregar as seis variantes ao motor genérico.

A tool percorre a fonte uma vez para formar o modelo validado e uma vez para
compilar as saídas. Não mantém travessias independentes destinadas apenas a
comparar a própria implementação.

O DDL é literal revisável em `tools/knowledge-builder/schemas/`. Inserções são
produzidas pelo motor genérico a partir de `TableData`; a tool não concatena SQL.

## 6. API E CLI

Manter a superfície operacional:

```text
knowledge-builder validate --source <path>
knowledge-builder build --source <path> --output <path> --context <path>
```

`validate` não cria artefatos. `build`:

```text
validate
-> compile_build_request
-> artifact_builder::build
-> resultado público verificado e publicado
```

O perfil `veterinary-knowledge` valida e fornece no request o source digest, as
versões dos schemas veterinários e o contexto opcional de release. A crate
incorpora esse metadata canônico ao resultado publicado sem interpretar o
domínio. O resultado informa build version, seis variantes de locale, bancos,
CAS e checksums usando o contrato consumido pelos planos seguintes. Não expor
tipos internos da crate apenas para testes.

O metadata do perfil possui schema fechado equivalente a:

```json
{
  "sourceDigestSha256": "<sha256>",
  "systemSchemaVersion": 5,
  "systemMediaSchemaVersion": 2,
  "release": null
}
```

Quando presente, `release` contém somente `releaseId`, `generation` e
`revision`, validados pelo perfil. O objeto não aceita campos adicionais.

## 7. Remoção Das Responsabilidades Transferidas

Ao final desta parte, remover de `tools/knowledge-builder`:

- `projection/coverage`, `inventory`, `ledger` e receipts;
- writers e readers SQLite próprios;
- verificação estrutural duplicada dos artefatos;
- CAS e publicação próprios;
- `projection-report.json`, evidence digest e `checksums.sha256`;
- descritores usados somente pelo pipeline removido;
- erros e testes sem responsabilidade vigente;
- dependências transferidas integralmente para `artifact-builder`.

Não manter wrappers, reexports, aliases ou dois caminhos de build.

## 8. Testes Da Tool

Testes unitários cobrem:

- parsing e schemas das entidades;
- validações de referências e taxonomias;
- regras dos seis locales;
- normalização de busca;
- Markdown permitido e recusado;
- resolução de mídia e geração determinística de thumbnail;
- projeção de cada entidade para rows;
- atributos diretos de produto válidos, ausentes e inválidos;
- aliases vacinais projetados pelo fluxo comum de aliases.

Testes integrais cobrem:

- fixture veterinária mínima com os seis locales;
- build completo por meio de `artifact-builder`;
- conteúdo localizado nos dois bancos;
- relações N:N e taxonomias preservadas;
- mídia original, thumbnail e CAS;
- determinismo do resultado;
- adulterações representativas de banco, manifest e CAS;
- CLI `validate` e `build`.

Não repetir na tool toda a matriz genérica de falhas SQLite, CAS e publicação.

## 9. Testes Específicos

Executar:

```text
cargo fmt --package artifact-builder --package knowledge-builder -- --check
cargo check -p artifact-builder -p knowledge-builder --all-targets
cargo clippy -p artifact-builder -p knowledge-builder --all-targets -- -D warnings
cargo test -p artifact-builder --all-targets --locked
cargo test -p knowledge-builder --all-targets --locked
```

Executar um build real de `data/knowledge` em diretório ignorado pelo Git e
consultar `foreign_key_check` e `integrity_check` dos doze bancos produzidos.

Depois, executar a skill `$validate-workspace`.

## Fora Do Escopo

- alterar os consumidores nos apps e packages;
- criar uma CLI genérica para `artifact-builder`;
- publicar a crate no crates.io;
- introduzir outros backends;
- reorganizar taxonomias sem contrato explícito nesta parte;
- criar migrations ou conversores de dados;
- consultar Hub, GitHub ou rede.

## Critérios De Aceite

- `knowledge-builder` é um adaptador de domínio e consumidor de
  `artifact-builder`.
- Existe uma única implementação de SQLite, CAS, verificação e publicação.
- A tool não possui ledger, ownership, recibos ou cobertura tripla.
- A fonte mantém JSON, Markdown e mídia relacionada por links.
- Estágios de vida e espectro terapêutico são atributos diretos e consultáveis
  de produto; descritores vacinais são aliases localizados comuns.
- Os seis pares de bancos e o CAS são produzidos corretamente.
- Testes de domínio ficam na tool e testes de infraestrutura ficam na crate.
- O build real e a skill `$validate-workspace` passam integralmente.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.9.4: fechamento e documentação](./04-closure.md).
