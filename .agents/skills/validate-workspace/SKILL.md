---
name: validate-workspace
description: Executa e relata as validações gerais do workspace veterinary-clinic, incluindo ambiente Node e pnpm, Svelte, testes unitários Vitest, build Vite, formatação, compilação, Clippy e testes Rust, além da integridade do diff. Use como gate final de toda implementação proveniente de plano e quando o usuário pedir validação geral, suíte completa de testes, verificação após refatoração ou confirmação de que o workspace está saudável. Não use para iniciar servidores ou empacotar Tauri; dependências e correções exigem orientação livre do usuário.
---

# Validar O Workspace

Executar primeiro uma auditoria somente de leitura do estado atual do
repositório. Seguir o `AGENTS.md` da raiz durante todo o processo. Instalações e
correções só podem começar nos checkpoints de decisão definidos abaixo.

## Preparar A Execução

1. Trabalhar a partir da raiz do repositório.
2. Registrar `git status --short` antes das validações sem limpar, restaurar ou
   alterar mudanças existentes.
3. Conferir as versões disponíveis com:

   ```text
   node --version
   pnpm --version
   cargo --version
   rustc --version
   ```

4. Exigir Node.js `>=22.0.0` e pnpm `>=11.22.0`, conforme o contrato do
   workspace.
5. Quando Node ou pnpm não estiver no `PATH`, usar uma instalação 22.x já
   disponível pelo gerenciador local indicado por `.nvmrc`.

### Dependência Ou Ferramenta Ausente

Não instalar nem baixar runtimes, packages, crates, ferramentas ou outras
dependências por iniciativa própria. Quando uma ausência impedir uma validação:

1. identificar exatamente o item ausente, a versão ou faixa exigida, a origem e
   o comando necessário;
2. explicar quais validações estão bloqueadas e quais arquivos podem ser
   alterados pela instalação;
3. perguntar em mensagem comum e aberta como o usuário deseja prosseguir;
4. aguardar uma resposta em texto livre antes de instalar.

Não reduzir essa pergunta a botão, enquete ou escolha binária de “sim” e “não”. A
resposta pode autorizar, negar, limitar a instalação, alterar o comando ou
informar que o usuário fará ou já fez a ação manualmente. Se a plataforma exigir
uma aprovação técnica adicional para executar o comando já autorizado, solicitar
essa aprovação somente depois da resposta livre.

Quando o usuário negar ou optar por agir manualmente, continuar todas as
validações independentes. Marcar como `BLOCKED` apenas as que permanecerem
impossíveis. Se ele informar que resolveu a ausência, verificar novamente o
ambiente e retomar as validações afetadas.

## Executar A Suíte

Executar os comandos separadamente e em sequência. Não paralelizar comandos que
usem `.svelte-kit`, saídas Vite ou o diretório Cargo `target`.

```text
git diff --check
pnpm check
pnpm test:run
pnpm build
cargo fmt --all -- --check
cargo check --workspace --all-targets
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace --all-targets
```

Tratar cada comando como uma validação independente:

- continuar coletando resultados depois de uma falha quando o próximo comando
  ainda puder produzir um diagnóstico útil;
- marcar como `BLOCKED` somente quando faltar uma ferramenta ou pré-condição;
- marcar como `SKIPPED` somente quando o usuário limitar explicitamente o escopo
  ou quando uma falha tornar aquela validação tecnicamente inexequível;
- nunca representar `BLOCKED` ou `SKIPPED` como aprovação;
- não executar `pnpm install`, atualizações ou acesso à rede sem passar pelo
  checkpoint de dependência ausente;
- não iniciar servidores de desenvolvimento nem comandos de empacotamento Tauri;
- não adicionar linters ou outras ferramentas que o workspace não configure.

Se o usuário solicitar apenas uma categoria, executar o subconjunto
correspondente e declarar claramente as validações omitidas. Sem limitação
explícita, executar a suíte completa.

## Preservar O Repositório Durante A Auditoria

Não corrigir código, formatar arquivos, atualizar snapshots ou aceitar mudanças
automaticamente. Usar modos de verificação, como `cargo fmt --check`.

Ao final, comparar `git status --short` com o estado inicial. Relatar qualquer
arquivo rastreado criado ou alterado pelas ferramentas e não o remover sem
solicitação explícita.

## Decidir Sobre Correções

Concluir primeiro todas as validações independentes. Se houver `FAIL`, apresentar
os erros agrupados por causa provável, indicar quais parecem relacionados à
implementação avaliada e perguntar em uma única mensagem aberta como o usuário
deseja tratá-los.

Não usar botão, enquete ou pergunta limitada a “posso corrigir?”. A pergunta deve
aceitar uma orientação livre, permitindo ao usuário autorizar tudo, negar,
selecionar erros, restringir arquivos, definir outra abordagem ou informar que
fará parte do trabalho manualmente.

Não modificar código antes dessa resposta. Depois dela:

- aplicar somente as correções e limites autorizados;
- não tocar em falhas preexistentes ou fora do escopo sem autorização expressa;
- se a correção exigir uma dependência, passar também pelo checkpoint de
  instalação;
- executar novamente as validações diretamente afetadas;
- ao final das correções, executar outra vez a suíte geral completa;
- se a correção for negada, concluir o relatório com as falhas pendentes sem
  insistir nem tratar a execução como aprovada.

## Relatar O Resultado

Apresentar primeiro as falhas e bloqueios. Para cada comando, informar um dos
estados:

```text
PASS
FAIL
BLOCKED
SKIPPED
```

Incluir:

- comando executado;
- estado;
- resumo objetivo do erro quando houver;
- arquivo e linha relevantes quando identificáveis;
- diferença entre o `git status` inicial e final;
- conclusão geral.

Declarar sucesso geral somente quando todas as validações exigidas terminarem em
`PASS`. Não despejar logs completos na resposta, salvo solicitação do usuário;
preservar as linhas necessárias para que ele entenda e reproduza a falha.
