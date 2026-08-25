# Parte 1B.8: Manutenibilidade Do `knowledge-builder`

## Objetivo

Refatorar o `knowledge-builder` para reduzir a amplificação de mudança sem
alterar o contrato vigente de autoria, projeção ou publicação. Cada fato de
domínio ou persistência possui um proprietário reconhecível, atravessa o menor
número necessário de representações e continua protegido por tipos fechados,
validação independente e testes executáveis.

Esta parte não torna o builder permissivo, genérico ou orientado por schemas
dinâmicos. Ela preserva o papel de compilador offline verificável e diminui o
custo de compreender, alterar e diagnosticar sua implementação.

```text
fonte canônica
-> inventário esperado independente
-> ProjectionContract tipado
-> writers transacionais + recibos confirmados
-> artefatos em staging
-> releitura independente
-> publicação atômica
```

## Pré-Requisito

A [Parte 1B.7](./01b7-central-builder-contracts.md) está concluída. O crate
possui contratos transversais centralizados, matriz taxonômica fechada,
`ProjectionContract` por locale, ownership operacional explícito, writers
SQLite tipados, ledger de evidências e verificação integral dos artefatos.

## Problema De Manutenção

O rigor atual depende de representações complementares em JSON Schema, tipos
Rust, DDL, contratos de projeção, obrigações, SQLs de escrita, queries de
releitura e relatórios. Essa independência é necessária quando evita que
produção e verificação compartilhem o mesmo erro, mas se torna duplicação quando
o mesmo fato é redescrito sem acrescentar uma prova diferente.

Uma mudança física ou semântica pode exigir alterações coordenadas em:

```text
schema de autoria
-> modelo da fonte
-> modelo validado
-> projector
-> SystemRow
-> tabela, identidade e colunas materializadas
-> owner e obrigações
-> writer SQL
-> reader SQL
-> verificador
-> relatório
-> testes estruturais e integrais
```

O compilador Rust torna omissões visíveis, mas não reduz por si só a quantidade
de lugares que repetem a informação. Esta parte reduz essa superfície mantendo
a exaustividade que torna o builder seguro.

## Invariantes Inegociáveis

A refatoração preserva:

- `data/knowledge` como única fonte de autoria;
- validação por JSON Schema antes da desserialização tipada;
- validações estrutural, referencial, localizada e semântica;
- conjunto fechado dos seis locales;
- matriz fechada das taxonomias canônicas;
- normalização determinística de identidades, busca e documentos;
- resolução segura de caminhos e limites de mídia;
- DDLs canônicos e SQLs de escrita fechados;
- `ProjectionContract` completo antes da abertura dos bancos;
- inventário esperado derivado independentemente das operações projetadas;
- propriedade explícita e única de cada obrigação;
- publicação de evidência somente depois do `commit` correspondente;
- transações por banco e ausência de evidência em rollback;
- equivalência semântica por releitura dos artefatos;
- independência entre writer e reader suficiente para detectar erros de escrita;
- fingerprints, checksums, digests e cobertura integral;
- CAS imutável, deduplicado e endereçado por SHA-256;
- staging, reutilização verificada e finalização atômica;
- geração integral dos seis pares `system` e `system_media`;
- recusa de artefatos adulterados mesmo quando declarações físicas são
  recalculadas.

Nenhuma redução de código justifica enfraquecer essas garantias.

## Resultado Esperado

- cada contrato transversal possui uma definição canônica;
- uma forma de linha SQLite pode ser compreendida sem percorrer mapeamentos
  paralelos desconectados;
- tabela, identidade e colunas de uma linha derivam do mesmo contrato tipado;
- writer e reader compartilham tipos e identidades, mas mantêm implementações
  independentes de persistência e releitura;
- o ledger concentra somente ownership, atomicidade da evidência e comparação
  de cobertura;
- regras de domínio deixam de ser reconstruídas dentro do ledger;
- o verificador integral funciona como fachada de verificadores coesos;
- erros atravessam o pipeline como tipos estruturados e ganham texto apenas na
  fronteira da CLI;
- módulos declaram dependências explícitas e evitam imports globais do pai;
- testes comuns fornecem feedback rápido e os cenários integrais continuam no
  gate completo;
- cenários representativos de evolução exigem menos declarações repetidas;
- formatos públicos e schemas técnicos permanecem inalterados.

## Escopo

- levantar a superfície atual de quatro cenários representativos de mudança;
- definir proprietários canônicos para contratos de linha e operação;
- consolidar tabela, identidade e colunas materializadas de `SystemRow`;
- preservar SQLs fixos enquanto reduz mapeamentos estruturais paralelos;
- simplificar o ledger e seus helpers sem unir expectativa e observação;
- decompor o `ArtifactVerifier` por responsabilidade verificável;
- introduzir erros estruturados nas fronteiras principais do pipeline;
- tornar dependências entre módulos explícitas;
- reorganizar testes por custo e responsabilidade;
- documentar como evoluir fonte, projeção, persistência e artefatos;
- atualizar a versão do crate e os testes de equivalência aplicáveis.

## Fora Do Escopo

- reescrever o builder em Python, TypeScript, Ruby ou outra linguagem;
- adotar `sqlite-utils`, ORM ou geração dinâmica de schema;
- alterar conteúdo em `data/knowledge`;
- adicionar, remover ou renomear entidades, relações, taxonomias ou locales;
- alterar tabelas, colunas, constraints, índices ou application IDs;
- alterar os schemas públicos dos relatórios ou do contexto;
- alterar normalização, Markdown compilado, thumbnails ou disposição CAS;
- alterar o significado das evidências de projeção;
- fazer writer e verifier dependerem da mesma implementação SQL;
- substituir enums fechados por mapas, registros dinâmicos ou strings livres;
- criar macros ou geração de código que ocultem os contratos do mantenedor;
- criar migrations, conversões, backfills ou compatibilidade com estados
  substituídos;
- alterar apps, packages de runtime, Hub ou bancos do ramo `user`;
- criar abstrações para backends de persistência que não existem;
- adicionar dependência sem autorização explícita do usuário.

## 1. Baseline De Amplificação De Mudança

Antes de mover código, registrar em uma seção de manutenção do README do builder
os pontos atualmente afetados pelos seguintes cenários hipotéticos:

1. adicionar um campo localizado a uma entidade já projetada;
2. adicionar uma relação ordenada entre duas entidades existentes;
3. adicionar uma nova forma de linha a uma tabela existente;
4. adicionar uma nova tabela pública e sua releitura semântica.

Para cada cenário, registrar:

- proprietário conceitual da mudança;
- arquivos e representações que precisam ser alterados;
- declarações que existem para independência de prova;
- declarações que apenas repetem o mesmo contrato;
- testes rápidos capazes de detectar omissões;
- testes integrais necessários antes da conclusão.

Repetir o levantamento depois da refatoração. Não estabelecer meta por número
total de linhas. O critério é reduzir declarações paralelas sem perder provas
independentes.

### Regra De Classificação

Uma repetição permanece quando representa uma observação independente, como:

- DDL materializado comparado com o contrato Rust;
- SQL de escrita comparado com colunas declaradas;
- query de releitura independente do comando de inserção;
- inventário esperado comparado com owners e recibos observados;
- manifest serializado comparado com arquivos físicos.

Uma repetição deve ser removida quando dois módulos mantêm a mesma allowlist,
identidade, nome, versão, cardinalidade ou disposição sem que a segunda cópia
produza uma prova independente.

## 2. Fronteiras Do Pipeline

Preservar os módulos de domínio atuais, mas tornar explícitas estas fronteiras:

```text
source
-> validation
-> ValidatedSource
-> projection::contract
-> ProjectionContract
-> projection::writers + projection::cas
-> staging
-> verification
-> versão verificada
-> finalização
```

### Estágios Puros

Validação semântica e construção do contrato não abrem bancos nem publicam
arquivos. Seus resultados dependem somente da fonte validada e do contexto de
build.

### Estágios Com Efeito

Leitura de arquivos, processamento de mídia, escrita SQLite, materialização CAS
e publicação atômica recebem contratos prontos e não decidem regras editoriais
ou de domínio durante a persistência.

### Orquestração

`projection::build` permanece a fachada do build, mas delega cada estágio por
uma interface interna pequena. O módulo coordena estado e ordem; não acumula
regras de tabela, parsing, mídia ou verificação.

Evitar criar novos módulos genéricos chamados `common`, `utils`, `helpers` ou
`manager`. Uma função compartilhada permanece com o domínio que define sua
invariante.

## 3. Contrato Canônico Das Linhas Projetadas

### Coesão De `SystemRow`

Cada forma fechada de linha declara por um único contrato Rust:

- payload tipado;
- `SystemTable` de destino;
- `RowIdentity` lógica;
- conjunto exato de `SystemColumn` materializadas;
- forma válida de comparação semântica.

Não manter matches independentes e divergentes para tabela, identidade e
colunas quando eles puderem ser métodos exaustivos do mesmo contrato. Variantes
que aceitam mais de um destino fechado continuam validando explicitamente cada
combinação permitida.

### Writer

O writer continua selecionando uma literal SQL fechada para cada caso concreto
de inserção. Ele não monta identificadores a partir da fonte e não infere schema
em runtime.

O descritor de inserção referencia o contrato canônico da linha para tabela e
colunas. Testes estruturais continuam interpretando a literal realmente
executada e exigindo igualdade com a declaração tipada.

### Reader

O reader relê todas as tabelas projetáveis em tipos fechados e produz as mesmas
identidades e formas canônicas usadas pelo contrato esperado. Suas queries
permanecem escritas e revisadas independentemente dos `INSERT`.

Não gerar `SELECT` a partir do SQL do writer. A independência física entre
escrita e releitura é uma prova necessária; o compartilhamento permitido se
limita ao vocabulário tipado de tabelas, colunas, identidades e rows.

### Organização

Agrupar por responsabilidade os módulos hoje distribuídos entre `model`,
`row_table`, `row_identity`, `row_columns`, writers e readers. A organização
final deve permitir localizar, a partir de uma variante de `SystemRow`, todos os
contratos estruturais relacionados sem procurar allowlists paralelas.

Não exigir que toda implementação fique no mesmo arquivo. Exigir que exista um
único proprietário e navegação direta entre contrato, writer, reader e teste.

## 4. Ledger Orientado A Plano E Recibos

### Provas Independentes

Manter três conjuntos conceitualmente distintos:

```text
expected
  inventário derivado da fonte validada sem consultar as operações projetadas

owned
  união das obrigações declaradas diretamente pelas operações do contrato

observed
  recibos produzidos pelos efeitos confirmados depois do commit
```

As igualdades obrigatórias são:

```text
expected == owned
expected == observed
```

Unir `expected` e `owned` em uma única derivação criaria uma autoverificação e
permitiria omitir simultaneamente projeção e expectativa. Essa independência
permanece obrigatória.

### Responsabilidade Do Ledger

O ledger final deve se limitar a:

- validar owner único para cada obrigação esperada;
- recusar obrigação ausente, inesperada ou duplicada;
- abrir um journal associado a uma operação concreta;
- acumular recibos ainda não publicados;
- publicar recibos somente depois do commit SQLite ou da confirmação do efeito;
- descartar recibos em rollback ou erro;
- comparar cobertura e produzir digest determinístico de evidência.

O ledger não deve:

- conhecer regras específicas de produto, protocolo, taxonomia ou Markdown;
- redescobrir relações a partir de entidades;
- decidir em qual tabela um payload pertence;
- completar obrigações a partir de destino compartilhado;
- inferir ownership por nome de tabela, coluna ou campo.

### Inventário Esperado

O inventário esperado continua derivado da árvore validada por um percurso
explícito e independente. Helpers podem compartilhar identidades de folhas e
tipos de obrigação, mas não podem consultar as operações construídas para
decidir o que deveria existir.

Regras de busca, relações e taxonomias permanecem em seus domínios de validação
ou projeção. O ledger recebe obrigações já concretas.

### Recibo De Execução

Cada writer produz um recibo tipado com:

- identidade da operação;
- target concreto;
- obrigações concluídas;
- evento e cardinalidade efetivamente observados.

O journal conserva o recibo até o commit. A API deve tornar difícil publicar
evidência sem passar pela confirmação correspondente. Não introduzir bypass de
teste ou caminho especial para CAS, metadata ou compilação.

### Redução Segura

Reavaliar as responsabilidades atuais de:

```text
ledger/entity_obligations.rs
ledger/obligation_helpers.rs
ledger/evidence.rs
ledger/journal.rs
ledger/model.rs
ledger/ownership.rs
ledger/search.rs
```

Remover um módulo somente quando sua invariante estiver absorvida por um
proprietário mais coeso e coberta pelos mesmos testes. Redução de linhas não é
critério isolado de aceite.

## 5. Verificação Integral Decomposta

`ArtifactVerifier` permanece a única fachada chamada pelo build e pela
reutilização, mas delega verificações coesas:

```text
verification/artifact/
├── mod.rs          fachada e ordem das provas
├── identity.rs     contexto, versões e descritores públicos
├── tree.rs         conjunto exato de arquivos e diretórios
├── manifest.rs     schemas, checksums e cobertura declarada
├── database.rs     integridade, fingerprints e equivalência de rows
├── media.rs        propriedades, thumbnails e referências
├── cas.rs          objetos, hashes e conjuntos por locale/global
└── evidence.rs     relatório, cobertura e digests
```

Os nomes podem ser ajustados durante a implementação para respeitar
responsabilidades já existentes. A fronteira normativa é:

- cada verificador recebe entradas explícitas;
- cada um retorna fatos verificados ou erro estruturado;
- nenhum deles publica arquivos ou corrige o staging;
- a fachada controla a ordem quando uma prova depende de fatos anteriores;
- reutilização e build novo executam a mesma fachada;
- comparação semântica usa os readers tipados compartilhados;
- manifest e checksums continuam sendo comparados com os bytes físicos.

Não duplicar a leitura de um mesmo banco em vários verificadores quando um
resultado tipado e imutável puder ser passado adiante. Não armazenar estado
global ou cache persistente entre builds.

## 6. Erros Estruturados

Definir uma taxonomia interna de erros nas fronteiras principais:

```text
KnowledgeBuilderError
├── Source
├── Validation
├── Contract
├── Database
├── Media
├── Cas
├── Verification
└── Publication
```

As variantes preservam, quando aplicável:

- caminho;
- identidade da entidade;
- locale;
- operação;
- banco e tabela;
- artefato;
- causa original.

Erros detalhados de validação editorial continuam usando `Diagnostic` e sua
ordenação determinística. A taxonomia superior não substitui diagnósticos de
campo por uma mensagem genérica.

Módulos internos não formatam repetidamente a cadeia completa da CLI. A
fronteira binária converte o erro estruturado em texto e código de saída. Testes
assertam variantes e contexto estável sempre que não estiverem validando
deliberadamente a apresentação ao usuário.

A implementação pode usar apenas a biblioteca padrão. Caso proponha uma crate
de derivação de erros, interromper antes de adicioná-la e solicitar autorização
explícita do usuário.

## 7. Dependências Explícitas Entre Módulos

Reduzir `use super::*` nos módulos de produção. Cada arquivo importa os tipos e
funções que realmente consome, tornando visíveis as fronteiras entre contratos,
domínio e efeitos.

Aplicar estas regras:

- `contracts` não depende de source, projection, writers ou verification;
- `source` não depende de SQLite ou publicação;
- `validation` não depende de writers;
- `projection::contract` não depende de conexões SQLite;
- writers não leem JSON ou Markdown de autoria;
- readers não chamam writers;
- ledger não depende de tipos editoriais concretos quando uma obrigação
  fechada é suficiente;
- verificação não altera os artefatos examinados;
- CLI conhece apenas as fachadas públicas de validate e build.

Ciclos conceituais não devem ser resolvidos movendo tipos sem domínio para um
módulo genérico. O tipo pertence à camada que define sua invariante e pode ser
reexportado internamente quando necessário.

## 8. Estratégia De Testes

### Camada Rápida

Testes unitários cobrem sem filesystem amplo ou builds de seis locales:

- contratos centrais;
- normalização;
- parsing e validação de Markdown;
- validação de identidades e referências;
- construção de rows e operações;
- ownership e diff de obrigações;
- journals, commit e rollback por abstrações pequenas;
- comparação semântica de rows;
- classificação dos erros estruturados;
- matriz fechada de writers e colunas.

`cargo test -p knowledge-builder --lib` permanece o ciclo rápido documentado.

### Camada De Componente

Testes com SQLite ou filesystem temporário cobrem:

- criação e finalização de cada tipo de banco;
- round-trip de famílias de `SystemRow`;
- integridade e foreign keys;
- CAS isolado;
- mídia e thumbnails;
- verificadores individuais;
- erro e limpeza de staging.

Esses testes usam diretórios temporários exclusivos e não dependem de ordem ou
estado compartilhado.

### Camada Integral

Manter cenários completos para:

- build determinístico dos seis locales;
- reutilização válida;
- contexto divergente;
- digest lógico independente da organização editorial;
- mídia estrutural e Markdown compartilhando CAS;
- adulteração física e semântica de bancos;
- adulteração de manifest, relatório, checksums e CAS;
- execução da CLI fora da raiz do workspace.

Evitar reconstruir o mesmo conjunto integral em múltiplos casos quando uma
matriz de adulterações puder compartilhar o setup dentro de um único teste sem
compartilhar estado mutável entre testes. Cada caso restaura bytes canônicos
antes de aplicar sua alteração.

Nenhum cenário de segurança é marcado como ignorado para reduzir tempo. O gate
completo continua executando `cargo test -p knowledge-builder --locked`.

### Medição

Registrar no início e no fim da implementação:

- tempo da camada rápida;
- tempo dos testes de componente;
- tempo da suíte integral;
- quantidade de builds completos realizados pela suíte;
- cenários de adulteração preservados.

Tempos variam por ambiente e não são critérios absolutos. A refatoração é
aceita quando o ciclo rápido não executa builds integrais e a suíte completa
mantém todas as provas com menos reconstruções redundantes.

## 9. Guia De Evolução

Atualizar `tools/knowledge-builder/README.md` com um mapa de manutenção que
responda, no presente, como:

- adicionar ou alterar um campo de autoria;
- adicionar uma relação;
- alterar a projeção de uma entidade;
- adicionar uma forma de row;
- alterar DDL e versão técnica quando solicitado por tarefa própria;
- atualizar writer e reader independentes;
- declarar ownership e inventário esperado;
- adicionar uma verificação de artefato;
- selecionar testes rápidos e integrais aplicáveis.

O guia não registra arquitetura substituída nem histórico da refatoração. Ele
descreve somente o estado final e aponta para os proprietários canônicos.

## 10. Versão E Equivalência

Elevar o crate de `0.3.1` para `0.4.0`, pois a parte reorganiza
substancialmente sua arquitetura interna e sua taxonomia de erros. Não elevar
versões de schemas de fonte, bancos, conteúdo, relatórios, contexto ou
evidência.

A mudança de `builderVersion` altera deliberadamente metadata, manifests e
checksums derivados. Fora dessa proveniência, builds equivalentes antes e depois
da refatoração preservam:

- `sourceDigestSha256`;
- conjunto e valores das rows projetáveis de cada locale;
- schema e fingerprint dos bancos;
- bytes compilados de conteúdo e thumbnails;
- hashes e bytes dos objetos CAS;
- contagens, owners, obrigações e cobertura semântica;
- árvore relativa dos artefatos;
- comportamento de validação, build, reutilização e recusa de adulterações.

Criar no teste uma comparação semântica que normalize somente os campos
diretamente derivados de `builderVersion`. Não ampliar a normalização para
ocultar diferenças editoriais, relacionais, físicas ou de evidência.

## Sequência De Implementação

1. Registrar o baseline dos quatro cenários de mudança e da suíte.
2. Identificar repetições necessárias para prova e duplicações sem proprietário.
3. Fechar o contrato canônico de tabela, identidade e colunas de `SystemRow`.
4. Adaptar writers e testes estruturais ao contrato coeso.
5. Adaptar readers para reconstruir as mesmas rows por queries independentes.
6. Preservar o inventário esperado independente e simplificar ownership.
7. Reduzir o ledger ao plano, journals, recibos confirmados e diff de cobertura.
8. Executar os testes específicos de obrigação, commit, rollback e cardinalidade.
9. Decompor `ArtifactVerifier` mantendo uma fachada única.
10. Introduzir erros estruturados por estágio e adaptar a apresentação da CLI.
11. Tornar imports e dependências internas explícitos.
12. Reorganizar testes em camadas rápida, de componente e integral.
13. Comparar semanticamente artefatos da versão anterior e da nova versão.
14. Atualizar README do builder, fixtures e mapa de manutenção.
15. Elevar a versão do crate e atualizar o lockfile.
16. Executar formatação, compilação, Clippy e testes do `knowledge-builder`.
17. Executar builds determinísticos e todos os cenários de adulteração.
18. Executar o gate geral do workspace definido pela skill
    `$validate-workspace`.

Qualquer dependência nova ou correção fora do escopo encontrada durante o gate
exige autorização livre do usuário conforme a skill.

## Entregáveis

- baseline antes/depois dos cenários de mudança;
- contrato coeso de rows, tabelas, identidades e colunas;
- writers fechados sem mapeamentos estruturais redundantes;
- readers independentes que devolvem as rows canônicas;
- inventário esperado preservado e independente das operações;
- ledger concentrado em ownership, atomicidade e cobertura;
- `ArtifactVerifier` decomposto sob uma fachada única;
- taxonomia de erros estruturados;
- dependências internas explícitas;
- suíte organizada por custo e responsabilidade;
- comparação semântica entre versões do builder;
- guia vigente de evolução do builder;
- crate `knowledge-builder` 0.4.0;
- documentação alinhada ao estado final.

## Critérios De Aceite

- Os quatro cenários de mudança possuem levantamento antes/depois.
- Nenhuma redução apontada como ganho elimina uma observação independente.
- Cada valor transversal possui um proprietário canônico.
- `SystemRow` possui uma definição coesa de payload, tabela, identidade e
  colunas materializadas.
- SQLs de inserção permanecem fixos e têm igualdade estrutural testada contra o
  contrato tipado.
- Queries de releitura não são geradas nem reutilizadas a partir dos `INSERT`.
- Reader e writer convergem para as mesmas rows por implementações independentes.
- `expected` continua derivado sem consultar operações projetadas.
- `expected`, `owned` e `observed` têm igualdade exata comprovada.
- Evidências continuam indisponíveis antes do commit e são descartadas em
  rollback.
- Destinos compartilhados não concluem obrigações por inferência.
- Ledger não contém regras específicas de entidades ou decisão de persistência.
- Build novo e reutilização chamam a mesma fachada integral de verificação.
- Verificadores de identidade, árvore, manifest, bancos, mídia, CAS e evidência
  têm responsabilidades isoladas e não alteram o staging.
- Erros principais preservam estágio, identidade e causa de forma estruturada.
- Diagnósticos editoriais permanecem determinísticos e contextualizados.
- Módulos de produção não dependem indiscriminadamente de `use super::*`.
- A camada rápida não executa builds integrais dos seis locales.
- Todos os cenários integrais e de adulteração continuam ativos no gate completo.
- A comparação entre versões permite somente diferenças derivadas de
  `builderVersion`.
- DDLs, schemas técnicos, conteúdo projetado, thumbnails e CAS permanecem
  semanticamente inalterados.
- Não existem migrations, shims, aliases ou caminhos paralelos.
- O crate usa versão 0.4.0 e passa em formatação, compilação, Clippy e testes.
- O workspace passa pelo gate geral da skill `$validate-workspace`.
- O estado Git após as validações contém somente mudanças pertencentes a esta
  parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](./01c-app-system-consumption.md).
