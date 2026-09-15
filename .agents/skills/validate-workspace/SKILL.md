---
name: validate-workspace
description: Executa e relata o gate geral declarativo do workspace veterinary-clinic por meio do workspace-validator, incluindo pré-requisitos, checks e integridade Git. Use como gate final de toda implementação proveniente de plano e quando o usuário pedir validação geral, suíte completa de testes, verificação após refatoração ou confirmação de que o workspace está saudável. Não use para iniciar servidores ou empacotar Tauri; dependências e correções exigem orientação livre do usuário.
---

# Validar O Workspace

Executar uma auditoria somente de leitura a partir da raiz e seguir o
`AGENTS.md`. A composição do gate pertence exclusivamente a
`.validation/config.json`.

## Executar O Gate

1. Registrar `git status --short`, sem limpar nem restaurar mudanças.
2. Executar `pnpm validate:json` uma única vez.
3. Interpretar o documento JSON, incluindo `tools`, `checks`, `repository` e
   `summary`.
4. Apresentar `FAIL`, `BLOCKED` e `SKIPPED` antes dos resultados `PASS`.
5. Declarar sucesso somente quando `summary.result` for `pass`.

Não duplicar nem executar manualmente a lista de checks do perfil. O validator
preserva a ordem, continua checks independentes, limita saídas e compara o
estado Git anterior e posterior. Não executar em paralelo comandos que
compartilhem saídas do workspace.

Se o próprio pnpm, Cargo ou workspace-validator não iniciar, classificar o
bootstrap como `BLOCKED`, identificar o item ausente e seguir o checkpoint de
dependências. Quando o usuário solicitar uma categoria, usar o script da suíte
correspondente ou `workspace-validator check`; declarar o escopo executado.

## Dependência Ou Ferramenta Ausente

Não instalar nem baixar runtimes, packages, crates ou ferramentas por iniciativa
própria. Para cada ausência:

1. informar item, versão/faixa, origem, comando necessário, validações
   bloqueadas e arquivos que a instalação pode alterar;
2. perguntar em mensagem comum e aberta como o usuário deseja prosseguir;
3. aguardar resposta em texto livre antes de instalar.

Não reduzir a pergunta a botão ou escolha binária. Se a plataforma exigir uma
aprovação técnica, solicitá-la somente após a autorização livre. Se o usuário
negar ou agir manualmente, continuar o que for independente e manter apenas o
que ainda for impossível como `BLOCKED`.

## Preservar O Repositório

Durante a auditoria, não corrigir código, formatar arquivos, atualizar
snapshots, instalar dependências ou aceitar mudanças. Não iniciar servidores,
empacotar Tauri nem remover arquivos criados pelos subprocessos. Relatar as
diferenças registradas em `repository`.

## Decidir Sobre Correções

Depois de coletar todos os diagnósticos, agrupar falhas por causa provável,
indicar sua relação com a implementação e perguntar, em uma única mensagem
aberta, como o usuário deseja tratá-las. A resposta pode autorizar tudo, limitar
arquivos, selecionar erros, negar mudanças ou reservar ações manuais.

Após autorização:

- aplicar somente as correções permitidas;
- passar novamente pelo checkpoint caso surja uma dependência;
- repetir com `workspace-validator check <id>` ou com a suíte especializada os
  checks afetados;
- executar `pnpm validate:json` novamente como gate final.

## Relatar O Resultado

Para cada resultado relevante, informar estado, ID, comando, causa objetiva e
arquivo/linha quando disponíveis. Incluir versões das ferramentas, totais,
mutações Git e conclusão geral. Não despejar logs completos, salvo pedido do
usuário.
