# Pré-Fase Transversal: Workspace Validator

## Posição Na Sequência

Este plano é executado depois da
[Parte 1B.8.10](./hub-server/01b8-knowledge-builder-maintainability/10-knowledge-domain-layout.md)
e antes da
[Parte 1B.8.11](./hub-server/01b8-knowledge-builder-maintainability/11-r2-canonical-media.md).

Sua conclusão não inicia armazenamento, sincronização ou testes com Cloudflare
R2. A Parte 1B.8.11 começa somente mediante solicitação posterior explícita.

## Objetivo

Criar `tools/workspace-validator/`, uma ferramenta CLI genérica que executa
pipelines declarativos de validação, verifica pré-requisitos, preserva a ordem e
as dependências dos checks, continua após falhas independentes e produz um
relatório uniforme para pessoas, agentes de código e CI.

O comportamento específico deste repositório fica em
`.validation/config.json`. O crate não conhece `vet-app`, Svelte,
`knowledge-builder`, Hub Server, nomes `@vet/*` ou qualquer contrato de domínio
do produto.

```text
pnpm validate
      |
      v
workspace-validator validate
      |
      +-- carrega .validation/config.json
      +-- verifica ferramentas e versões
      +-- registra o estado inicial do repositório
      +-- executa checks sequenciais
      +-- classifica PASS / FAIL / BLOCKED / SKIPPED
      +-- compara o estado final do repositório
      +-- emite relatório humano ou JSON
```

## Resultado Esperado

Ao concluir esta pré-fase:

- `tools/workspace-validator/` contém um crate Rust autocontido e reutilizável;
- `.validation/config.json` é a única fonte da composição das validações deste
  workspace;
- a suíte padrão representa, na mesma ordem, o gate geral definido para o
  repositório;
- validações especializadas podem ser chamadas por suíte sem serem adicionadas
  implicitamente ao gate geral;
- `pnpm validate` oferece a execução manual oficial;
- relatórios humanos são concisos e relatórios JSON possuem schema versionado;
- a skill `$validate-workspace` consome o mesmo executor e deixa de duplicar a
  lista de comandos;
- a ferramenta nunca instala dependências, corrige código, aceita snapshots,
  inicia servidores ou empacota aplicativos;
- falhas independentes não impedem a coleta dos demais diagnósticos;
- alterações não esperadas no estado visível pelo Git são detectadas;
- nenhum código da ferramenta entra em bundles ou no runtime dos apps;
- nenhuma dependência de `just` é introduzida.

## Decisões De Arquitetura

### Motor Genérico E Perfil Consumidor

A separação física é:

```text
tools/workspace-validator/       motor, schemas, fixtures e testes genéricos
.validation/config.json          perfil declarativo deste workspace
package.json                     atalhos pnpm deste workspace
.agents/skills/validate-workspace/SKILL.md
                                 política de interação do agente
```

O crate pode ser compilado ou extraído sem `.validation/config.json`. A
configuração pode ser usada somente por uma versão do binário que suporte seu
`schemaVersion`.

O crate não importa código ou configuração do workspace consumidor. Ele recebe
o caminho da configuração pela CLI ou a descobre a partir do diretório de
execução.

### Rust Como Runtime Da Ferramenta

Implementar a CLI como binário Rust síncrono. Ela usa subprocessos nativos e
não exige Node.js para funcionar diretamente depois de compilada. Node e pnpm
são apenas pré-requisitos declarados pelo perfil deste projeto.

Adicionar o crate ao workspace Cargo da raiz para que formatação, compilação,
Clippy e testes gerais também validem a própria ferramenta. Marcar o pacote com
`publish = false`; publicação em crates.io não integra esta pré-fase. O
manifesto declara `name = "workspace-validator"`, versão inicial `0.1.0`,
edição Rust `2021`, `rust-version = "1.87"` e licença `MIT`, sem herdar metadata
do produto.

Dependências previstas do crate:

- `clap`, para o contrato da CLI;
- `serde` e `serde_json`, para configuração e relatório;
- `semver`, para requisitos de versão;
- `thiserror`, para erros estruturados;
- `schemars`, para os schemas JSON derivados dos contratos Rust;
- `wait-timeout`, para limites de execução dos subprocessos;
- `ctrlc`, para interrupção coordenada do executor e do subprocesso ativo;
- `tempfile` como dependência de desenvolvimento para testes isolados.

Selecionar releases compatíveis com o MSRV declarado e fixá-las no
`Cargo.lock` da raiz durante a implementação.

Não adicionar runtime assíncrono, cliente HTTP, executor de shell, engine de
plugins ou framework de workflow. A inclusão e resolução dessas dependências
passam pelo checkpoint de autorização de dependências definido em `AGENTS.md`.

### pnpm Como Entrada Conveniente

O pnpm não implementa o pipeline. Seus scripts apenas iniciam o binário com a
suíte correspondente:

```text
pnpm validate
pnpm validate:fast
pnpm validate:web
pnpm validate:rust
pnpm validate:knowledge
pnpm validate:json
```

O binário permanece utilizável diretamente em outro projeto, sem pnpm. Não
adicionar `justfile`, dependência de `just` ou código que invoque `just`.

### Auditoria Sem Correção

O validator é somente leitura por responsabilidade própria. Os subprocessos
configurados também devem ser comandos de verificação. A ferramenta:

- não oferece `fix`, `install`, `update`, `accept`, `approve` ou equivalente;
- não executa comandos alternativos depois de uma falha;
- não transforma warning, ausência de ferramenta ou check omitido em sucesso;
- não limpa arquivos criados por subprocessos;
- não altera configuração, relatório, lockfile ou código durante a execução;
- não solicita confirmação interativa.

O diálogo sobre instalação ou correção continua pertencendo ao agente que usa a
skill. Na execução manual, o relatório informa a situação e encerra com o exit
code correspondente.

### Execução Sequencial E DAG Explícito

Todos os checks são executados sequencialmente nesta versão. O formato aceita
`dependsOn`, valida o grafo antes de iniciar e recusa ciclos, dependências
ausentes e IDs duplicados.

Uma falha afeta somente os checks que declaram dependência dela. Checks
independentes continuam na ordem da suíte. Não implementar paralelismo nesta
pré-fase, pois as validações atuais compartilham `.svelte-kit`, saídas Vite e o
diretório Cargo `target`.

## Estrutura Alvo

```text
tools/workspace-validator/
├── Cargo.toml
├── README.md
├── schemas/
│   ├── config.schema.json
│   └── report.schema.json
├── src/
│   ├── main.rs
│   ├── cli.rs
│   ├── config.rs
│   ├── error.rs
│   ├── graph.rs
│   ├── model.rs
│   ├── prerequisites.rs
│   ├── process.rs
│   ├── repository.rs
│   ├── runner.rs
│   └── report/
│       ├── mod.rs
│       ├── human.rs
│       └── json.rs
└── tests/
    ├── cli.rs
    ├── config.rs
    ├── execution.rs
    ├── repository.rs
    └── fixtures/
        ├── passing/
        ├── failing/
        ├── blocked/
        └── dependency-graph/

.validation/
└── config.json
```

A implementação pode reunir módulos muito pequenos quando isso melhorar a
leitura. Ela não deve concentrar parsing, execução de processos, agregação e
renderização em um único arquivo.

## Contrato Da Configuração

### Descoberta E Resolução De Caminhos

O comando procura `.validation/config.json` no diretório atual e, depois, em
cada ancestral até a raiz do filesystem. `--config <path>` substitui a
descoberta.

Regras:

- o arquivo encontrado deve ser regular;
- `workspaceRoot` é resolvido relativamente ao diretório da configuração;
- `workingDirectory` de cada check é resolvido relativamente ao workspace;
- diretórios de execução não podem escapar de `workspaceRoot`;
- programas e argumentos não passam por shell, expansão de variável, glob ou
  interpolação textual;
- propriedades desconhecidas e versões de schema não suportadas são recusadas;
- caminhos absolutos específicos da máquina não entram no perfil versionado.

### Forma Canônica

O contrato inicial segue esta forma:

```json
{
  "$schema": "../tools/workspace-validator/schemas/config.schema.json",
  "schemaVersion": 1,
  "workspaceRoot": "..",
  "defaultSuite": "general",
  "outputLimitBytes": 1048576,
  "repository": {
    "provider": "git",
    "toolId": "git",
    "detectMutations": true
  },
  "tools": [
    {
      "id": "node",
      "program": "node",
      "requiresTools": [],
      "versionArgs": ["--version"],
      "versionParser": "firstSemver",
      "versionRequirement": ">=22.0.0"
    },
    {
      "id": "pnpm",
      "program": "pnpm",
      "requiresTools": ["node"],
      "versionArgs": ["--version"],
      "versionParser": "firstSemver",
      "versionRequirement": ">=11.22.0"
    }
  ],
  "checks": [
    {
      "id": "web.check",
      "label": "Análise estática Svelte",
      "toolId": "pnpm",
      "args": ["check"],
      "workingDirectory": ".",
      "requiresTools": [],
      "dependsOn": [],
      "timeoutSeconds": 900
    }
  ],
  "suites": [
    {
      "id": "general",
      "label": "Validação geral",
      "checks": ["web.check"]
    }
  ]
}
```

O documento real inclui todos os pré-requisitos, checks e suítes definidos
abaixo. O exemplo demonstra o formato e não limita o conjunto.

### Ferramentas

O perfil deste workspace declara:

| ID | Comando de versão | Requisito | Dependências |
|---|---|---|---|
| `git` | `git --version` | presença e versão legível | nenhuma |
| `node` | `node --version` | `>=22.0.0` | nenhuma |
| `pnpm` | `pnpm --version` | `>=11.22.0` | `node` |
| `cargo` | `cargo --version` | presença e versão legível | nenhuma |
| `rustc` | `rustc --version` | presença e versão legível | nenhuma |
| `rustfmt` | `rustfmt --version` | presença e versão legível | `cargo`, `rustc` |
| `clippy` | `cargo clippy --version` | presença e versão legível | `cargo`, `rustc` |

`firstSemver` extrai a primeira versão semântica completa encontrada na saída
combinada do comando. Saída ausente, versão ilegível ou requisito não atendido
torna `BLOCKED` todo check que exige a ferramenta. Os demais checks continuam.

Uma ferramenta sem `versionRequirement` ainda deve responder ao comando de
versão e ter sua versão registrada no relatório.

Cada ferramenta pode declarar `requiresTools`. O preflight valida esse grafo,
recusa ciclos e processa primeiro as dependências. No perfil atual, `pnpm`
depende de `node`; `clippy` e `rustfmt` dependem de `cargo` e `rustc`.

Cada check referencia seu executável primário por `toolId` e declara em
`requiresTools` somente pré-requisitos adicionais. O comando efetivo é formado
por `program` da ferramenta primária seguido de `args` do check. Assim, o
executável verificado no preflight é exatamente o executável usado na validação.

### Checks Do Perfil Atual

| ID | Comando | Ferramentas efetivas | Timeout |
|---|---|---|---:|
| `repository.diff` | `git diff --check` | `git` | 120 s |
| `web.check` | `pnpm check` | `node`, `pnpm` | 900 s |
| `web.test` | `pnpm test:run` | `node`, `pnpm` | 900 s |
| `web.build` | `pnpm build` | `node`, `pnpm` | 900 s |
| `rust.format` | `cargo fmt --all -- --check` | `cargo`, `rustc`, `rustfmt` | 300 s |
| `rust.check` | `cargo check --workspace --all-targets` | `cargo`, `rustc` | 1800 s |
| `rust.clippy` | `cargo clippy --workspace --all-targets -- -D warnings` | `cargo`, `rustc`, `clippy` | 1800 s |
| `rust.test` | `cargo test --workspace --all-targets` | `cargo`, `rustc` | 3600 s |
| `knowledge.audit` | `pnpm knowledge:audit` | `node`, `pnpm` | 900 s |
| `knowledge.validate` | `pnpm knowledge:validate` | `node`, `pnpm`, `cargo`, `rustc` | 1800 s |
| `knowledge.clippy` | `cargo clippy -p knowledge-builder --all-targets -- -D warnings` | `cargo`, `rustc`, `clippy` | 1800 s |
| `knowledge.test` | `cargo test -p knowledge-builder --all-targets` | `cargo`, `rustc` | 3600 s |

Cada comando é armazenado como `toolId` e `args`, nunca como uma linha de shell.
Os checks atuais não dependem entre si e continuam depois de uma falha.
`dependsOn` permanece vazio para eles.

### Suítes Do Perfil Atual

`general`, a suíte padrão, mantém exatamente esta ordem:

```text
repository.diff
web.check
web.test
web.build
rust.format
rust.check
rust.clippy
rust.test
```

As suítes adicionais são:

```text
fast
  repository.diff
  web.check
  rust.format
  rust.check

web
  repository.diff
  web.check
  web.test
  web.build

rust
  repository.diff
  rust.format
  rust.check
  rust.clippy
  rust.test

knowledge
  repository.diff
  knowledge.audit
  knowledge.validate
  rust.format
  knowledge.clippy
  knowledge.test
```

Selecionar uma suíte não marca como `SKIPPED` checks que não pertencem a ela.
O relatório identifica a suíte selecionada e seu conjunto fechado. `SKIPPED`
fica reservado a checks pertencentes à suíte que não podem iniciar porque uma
dependência declarada não concluiu em `PASS`.

### Validação Estrutural

Antes de executar qualquer subprocesso, recusar:

- `schemaVersion` desconhecida;
- `defaultSuite` inexistente;
- IDs vazios, repetidos ou fora do padrão lexical documentado;
- check configurado com o ID reservado `repository.integrity`;
- ferramenta, check ou dependência referenciada e não declarada;
- ciclos nos grafos de ferramentas ou checks;
- suíte vazia ou com check repetido;
- timeout nulo ou fora dos limites aceitos;
- limite de saída nulo ou excessivo;
- programa de ferramenta vazio, argumento com byte NUL ou diretório inválido;
- diretório de execução fora do workspace;
- propriedades adicionais não reconhecidas.

IDs possuem entre 1 e 96 caracteres e seguem
`^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$`. `timeoutSeconds` fica entre `1` e
`86400`. `outputLimitBytes` é aplicado separadamente a stdout e stderr e fica
entre `4096` e `16777216`.

Configuração inválida impede integralmente a execução. Não realizar execução
parcial com um contrato malformado.

## Contrato Da CLI

Expor:

```text
workspace-validator validate [suite] [--config <path>] [--format human|json]
workspace-validator check <check-id> [--config <path>] [--format human|json]
workspace-validator list [--config <path>]
workspace-validator schema config|report
```

Sem argumento de suíte, `validate` usa `defaultSuite`. `check` executa um único
check e o fechamento transitivo de suas dependências; ele serve para repetição
dirigida depois de uma correção.

Toda suíte deve declarar o fechamento transitivo dos checks que contém. Cada
dependência aparece antes do dependente na ordem da suíte. `check` calcula essa
mesma ordem topológica e executa cada dependência compartilhada uma única vez.

Não expor opção de ignorar check obrigatório, converter falha em warning,
aprovar estado bloqueado, executar em paralelo ou corrigir arquivos.

### Exit Codes

Fixar e testar:

| Código | Significado |
|---:|---|
| `0` | todos os checks selecionados e a integridade do repositório estão em `PASS` |
| `1` | existe ao menos um `FAIL` |
| `2` | não existe `FAIL`, mas existe `BLOCKED` ou `SKIPPED` |
| `3` | uso da CLI ou configuração inválida |
| `4` | falha interna do executor ou do relatório |
| `130` | execução interrompida pelo usuário |

Quando `FAIL` e `BLOCKED` coexistem, o processo retorna `1`; o relatório
preserva ambos.

## Semântica De Execução

Para `validate`:

1. localizar e desserializar a configuração;
2. validar schemas, IDs, referências, paths e DAG;
3. resolver o workspace por caminho canônico;
4. executar os comandos de versão das ferramentas relevantes à suíte;
5. registrar o estado inicial do repositório;
6. percorrer os checks na ordem declarada;
7. classificar checks bloqueados por ferramentas;
8. classificar como `SKIPPED` somente dependentes que não podem iniciar;
9. executar cada check restante sem shell;
10. capturar stdout e stderr dentro do limite configurado;
11. aplicar timeout, encerrar o processo e classificá-lo como `FAIL` quando o
    prazo expirar;
12. continuar com todo check independente;
13. registrar o estado final do repositório;
14. comparar os snapshots sem exigir árvore inicialmente limpa;
15. adicionar o resultado sintético `repository.integrity`;
16. renderizar exatamente um relatório e retornar o exit code agregado.

### Estados

- `PASS`: o subprocesso iniciou e terminou com código `0` dentro do prazo;
- `FAIL`: o subprocesso iniciou e terminou com código diferente de `0`, expirou
  ou a auditoria detectou mutação visível nova no repositório;
- `BLOCKED`: ferramenta obrigatória está ausente, ilegível ou fora da faixa;
- `SKIPPED`: uma dependência declarada do check não terminou em `PASS`.

Falha para iniciar um programa já aprovado no preflight é `FAIL` de execução,
com causa estruturada. Uma ferramenta ausente identificada no preflight é
`BLOCKED`.

### Estado Do Git

O provider `git` executa `git status --porcelain=v1 -z` antes e depois da suíte.
A árvore pode começar com alterações. Somente a diferença introduzida durante a
validação reprova `repository.integrity`.

`repository` é opcional no contrato genérico. Quando presente, `toolId`
referencia uma ferramenta declarada e o provider usa seu programa resolvido. O
perfil deste workspace exige o provider `git`; ausência ou falha dessa
ferramenta deixa `repository.integrity` em `BLOCKED` sem impedir checks que não
dependem dela.

O relatório distingue:

- entradas presentes antes e depois;
- entradas novas;
- entradas removidas;
- entradas cujo estado mudou durante a execução.

O validator não restaura nem remove nenhum desses arquivos. Outputs ignorados
pelo Git não integram o snapshot.

`repository.integrity` é um resultado sintético reservado, incluído em
`checks[]` e nos totais do relatório quando `repository` está configurado. Ele
não pode ser declarado como check pelo consumidor.

### Subprocessos E Saída

- executar com `std::process::Command`, resolvendo `program` pelo `toolId` e
  mantendo `args` separados;
- usar `workspaceRoot/workingDirectory` como diretório explícito;
- herdar o ambiente do processo sem imprimir seu conteúdo;
- não interpretar pipes, redirecionamentos, curingas ou operadores de shell;
- consumir stdout e stderr concorrentemente para evitar bloqueio de pipes;
- limitar a captura por stream e registrar quando houver truncamento;
- preservar o trecho final da saída, onde compiladores normalmente apresentam
  a causa e o resumo;
- nunca imprimir variáveis de ambiente ou configuração alheia ao relatório;
- interromper o subprocesso ativo quando receber cancelamento.

## Relatórios

### Relatório Humano

O formato padrão apresenta:

1. suíte, workspace e versões das ferramentas;
2. progresso por check com comando e duração;
3. falhas e bloqueios antes dos sucessos;
4. excerto limitado de stdout/stderr somente quando relevante;
5. diferenças entre os snapshots do repositório;
6. totais por estado e conclusão geral.

Não despejar logs completos por padrão. Um modo verboso pode mostrar a captura
disponível, ainda respeitando `outputLimitBytes`.

### Relatório JSON

`--format json` reserva stdout exclusivamente para um documento JSON válido. O
documento contém, no mínimo:

```json
{
  "schemaVersion": 1,
  "suite": "general",
  "workspaceRoot": "/absolute/path",
  "startedAtUnixMs": 1789383600000,
  "durationMs": 1000,
  "tools": [],
  "checks": [],
  "repository": {
    "before": [],
    "after": [],
    "introduced": [],
    "removed": [],
    "changed": []
  },
  "summary": {
    "pass": 0,
    "fail": 0,
    "blocked": 0,
    "skipped": 0,
    "result": "pass"
  }
}
```

Cada check registra ID, label, argv, diretório, estado, exit code opcional,
duração, timeout, truncamento e excertos capturados. Campos opcionais ausentes
não são serializados como valores ambíguos.

O relatório humano apresenta os estados como `PASS`, `FAIL`, `BLOCKED` e
`SKIPPED`. O JSON usa os enums estáveis `pass`, `fail`, `blocked` e `skipped`.
Os totais incluem `repository.integrity` quando o provider de repositório está
habilitado.

`REPORT_SCHEMA_VERSION` começa em `1`. `schema report` imprime o schema
correspondente. O schema versionado é validado por testes de snapshot estrutural
e permanece sincronizado com os tipos Rust derivados por `schemars`.

## Integração Com O Workspace

### Cargo

Adicionar `tools/workspace-validator` a `members` no `Cargo.toml` da raiz. O
crate mantém dependências próprias e não usa módulos de `packages/engine`, do
Tauri ou de `tools/knowledge-builder`.

O validator não executa `pnpm validate` dentro de um check. Os comandos Cargo e
pnpm do perfil são invocados diretamente, impedindo recursão do pipeline.

### package.json

Adicionar scripts de raiz que chamam a CLI via Cargo:

```json
{
  "scripts": {
    "validate": "cargo run --quiet --locked -p workspace-validator -- validate",
    "validate:fast": "cargo run --quiet --locked -p workspace-validator -- validate fast",
    "validate:web": "cargo run --quiet --locked -p workspace-validator -- validate web",
    "validate:rust": "cargo run --quiet --locked -p workspace-validator -- validate rust",
    "validate:knowledge": "cargo run --quiet --locked -p workspace-validator -- validate knowledge",
    "validate:json": "cargo run --quiet --locked -p workspace-validator -- validate --format json"
  }
}
```

Manter os scripts `check`, `test:run`, `build`, `knowledge:audit` e
`knowledge:validate`, pois são os comandos de domínio consumidos pelo perfil.
Não fazer cada script chamar o validator.

### Skill `$validate-workspace`

Atualizar a skill para:

1. executar `pnpm validate:json` como gate padrão;
2. interpretar estados, ferramentas, checks e mutações do relatório;
3. apresentar `FAIL`, `BLOCKED` e `SKIPPED` antes dos sucessos;
4. preservar a pergunta aberta antes de instalar dependências;
5. preservar a pergunta aberta antes de corrigir falhas;
6. continuar sem modificar o workspace durante a auditoria;
7. repetir checks ou suítes afetadas depois das correções autorizadas;
8. executar novamente `pnpm validate:json` ao final das correções;
9. declarar sucesso somente quando o relatório geral concluir em `pass`.

A skill mantém uma rotina mínima para o caso de o próprio `pnpm`, Cargo ou o
validator não conseguirem iniciar. Essa rotina classifica o bootstrap como
`BLOCKED`, informa o item ausente e segue o checkpoint de decisão vigente. Ela
não duplica a lista de checks de `.validation/config.json`.

`AGENTS.md` continua exigindo a skill depois de implementações provenientes de
planos. A ferramenta executa o pipeline; a skill governa a interação e as
autorizações.

## Reutilização Em Outros Projetos

O README do crate deve documentar:

- compilação e execução direta;
- descoberta e seleção explícita da configuração;
- contrato de ferramentas, checks, suítes e dependências;
- exit codes e formatos de relatório;
- integração opcional por npm, pnpm, Cargo, CI ou chamada direta;
- criação de uma configuração mínima;
- comportamento diante de ferramentas ausentes e repositório sujo;
- limites de segurança e ausência de correção automática;
- política de versões dos schemas.

Adicionar um teste de portabilidade que execute o binário contra uma fixture em
diretório temporário sem acessar arquivos do veterinary-clinic. Nenhuma fixture
genérica pode depender dos nomes, comandos ou diretórios deste produto.

O perfil `.validation/config.json` não é copiado junto com o motor quando ele é
extraído. Cada consumidor fornece sua própria configuração.

## Estratégia De Testes

### Unidade

Cobrir:

- desserialização estrita e propriedades desconhecidas;
- resolução segura de paths;
- extração e comparação semântica de versões;
- IDs, referências, suítes e ciclos no DAG;
- agregação de estados e precedência dos exit codes;
- limites de timeout e captura;
- serialização humana e JSON;
- sincronização dos schemas derivados.

### Integração

Usar fixtures temporárias para comprovar:

- todos os checks em `PASS`;
- `FAIL` seguido pela execução de checks independentes;
- dependente marcado como `SKIPPED` e independente ainda executado;
- ferramenta ausente ou fora da faixa produzindo `BLOCKED`;
- coexistência de `FAIL` e `BLOCKED` retornando exit code `1`;
- timeout sem travar o processo de validação;
- stdout e stderr volumosos sem deadlock e com truncamento indicado;
- diretório de trabalho e argv preservados literalmente;
- rejeição de tentativa de escapar do workspace;
- árvore Git inicialmente suja permanecendo aceita quando não muda;
- alteração introduzida por check reprovando `repository.integrity`;
- relatório JSON válido mesmo quando o processo termina com falha;
- descoberta da configuração a partir de subdiretório;
- execução de um check isolado;
- interrupção encerrando o subprocesso ativo.

### Integração Deste Workspace

Depois dos testes do crate:

```text
cargo fmt --all -- --check
cargo check -p workspace-validator --all-targets
cargo clippy -p workspace-validator --all-targets -- -D warnings
cargo test -p workspace-validator --all-targets
pnpm validate:fast
pnpm validate:web
pnpm validate:rust
pnpm validate:knowledge
```

Por fim, executar a skill `$validate-workspace`, que usa `pnpm validate:json`
como gate geral. A Parte 1B.8.11 não é iniciada por essa execução.

## Sequência De Implementação

1. Registrar o estado inicial e executar o gate geral vigente como baseline.
2. Solicitar autorização para adicionar e resolver as dependências Rust
   declaradas neste plano.
3. Criar o crate autocontido, seu manifesto, módulos, constantes de versão e
   README inicial.
4. Implementar modelos estritos, geração dos schemas e carregamento seguro da
   configuração.
5. Implementar validação de ferramentas, requisitos SemVer, suítes e DAG.
6. Implementar o executor sequencial, timeout, cancelamento e captura limitada.
7. Implementar o provider Git e a comparação dos snapshots.
8. Implementar agregação, exit codes e renderizadores humano e JSON.
9. Implementar a CLI `validate`, `check`, `list` e `schema`.
10. Criar fixtures e concluir os testes unitários, de integração e
    portabilidade do crate.
11. Adicionar o crate ao workspace Cargo.
12. Criar `.validation/config.json` com o perfil integral definido neste plano.
13. Adicionar os scripts pnpm da raiz sem substituir os scripts de domínio.
14. Executar todas as suítes e comparar a suíte `general` com a baseline.
15. Atualizar a skill para consumir o relatório JSON sem duplicar os checks.
16. Atualizar a documentação de desenvolvimento com os comandos manuais.
17. Executar os testes específicos e a skill `$validate-workspace` como gate
    final.

Cada etapa de implementação deve terminar com seus testes diretamente
relacionados antes de avançar. Instalações e correções encontradas seguem os
checkpoints de autorização do repositório.

## Fora De Escopo

- implementação da Parte 1B.8.11 ou acesso ao Cloudflare R2;
- `just`, `make`, Taskfile ou outro command runner;
- workflows de GitHub Actions ou outro CI;
- publicação do crate ou distribuição de binários;
- paralelismo de checks;
- engine de plugins ou execução remota;
- correção automática, instalação, atualização ou limpeza;
- alteração das regras de negócio dos comandos validados;
- substituição de pnpm, Cargo, Vitest, Svelte Check, Vite, rustfmt ou Clippy;
- migration, compatibilidade, fallback ou leitura de configurações antigas;
- empacotamento Tauri e inicialização de servidores.

## Critérios De Aceite

- `pnpm validate` executa manualmente a suíte geral completa na ordem definida.
- A suíte `general` contém exatamente os oito comandos do gate geral.
- `pnpm validate:json` emite JSON válido em stdout e usa exit code coerente.
- Falha de um check não impede checks independentes posteriores.
- Ferramenta ausente bloqueia somente os checks que a exigem.
- Dependências entre checks formam um DAG validado antes da execução.
- Uma árvore inicialmente suja não falha apenas por estar suja.
- Mudança visível pelo Git introduzida durante a suíte é relatada e reprovada.
- O validator não corrige, instala, atualiza, remove ou restaura arquivos.
- O crate não importa nenhum módulo do produto e passa contra fixtures isoladas.
- `.validation/config.json` concentra todos os comandos específicos deste
  workspace.
- A skill não mantém uma segunda lista dos comandos de validação.
- A execução manual, a skill e o futuro CI compartilham o mesmo contrato de
  estados e relatório.
- Os scripts existentes continuam utilizáveis diretamente.
- Nenhuma dependência ou arquivo de `just` existe no resultado.
- A suíte específica do crate e a skill `$validate-workspace` concluem com
  sucesso.
- Nenhum código ou artefato da Parte 1B.8.11 é produzido.
