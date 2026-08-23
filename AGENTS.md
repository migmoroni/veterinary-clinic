# Instruções Para Agentes De Código

Este arquivo se aplica a todo o repositório. O código e os contratos atuais são
a fonte de verdade para implementação. Planos e prompts só entram no contexto
quando a tarefa os indicar explicitamente ou quando forem indispensáveis para o
trabalho solicitado.

## Estado Único Do Produto

- O produto está em desenvolvimento e ainda não possui uma versão pública de
  lançamento.
- Implemente somente o estado atual solicitado. Não preserve propostas,
  arquiteturas, schemas, APIs, nomes ou comportamentos substituídos.
- Escreva código e documentação no presente. Não acrescente histórico de como o
  sistema funcionava nem explicações sobre modelos anteriores, salvo pedido
  explícito.
- Ao concluir uma substituição, adapte todos os consumidores atuais e remova o
  código substituído dentro do escopo da tarefa.

## Migrações Somente Por Solicitação Explícita

- Não crie migrations de banco, scripts de conversão, backfills, importadores de
  versões anteriores ou etapas de adoção sem uma solicitação explícita do
  usuário para essa tarefa.
- Uma alteração de schema não autoriza inferir que uma migration é necessária.
  Sem pedido explícito, atualize apenas o estado canônico atual: DDL de criação,
  constraints, tipos, queries, repositories, versões técnicas aplicáveis e
  testes.
- A presença de diretórios ou ferramentas de migration no repositório não os
  torna parte automática de uma implementação. Em especial,
  `legacy-to-sqlite/` só entra no escopo quando for citado explicitamente.
- Se o objetivo solicitado for impossível de cumprir corretamente sem migrar
  dados existentes, pare e informe essa dependência. Não implemente a migration
  por iniciativa própria.

## Sem Camadas De Legado Ou Compatibilidade Implícita

Na ausência de pedido explícito, não crie:

- leitura ou escrita dupla entre formatos, schemas ou caminhos antigos e atuais;
- fallbacks para fontes, bancos, campos, aliases ou diretórios substituídos;
- adapters, bridges, shims, facades ou wrappers destinados somente a preservar
  contratos anteriores;
- aliases depreciados, reexports de APIs substituídas ou campos marcados como
  legacy;
- feature flags para alternar entre a implementação anterior e a atual;
- rotinas de detecção, conversão ou recuperação de estados que não pertencem ao
  contrato atual;
- comentários, tipos, testes ou documentação dedicados a comportamentos que não
  existem no estado atual do produto.

Não mantenha duas fontes de verdade para facilitar uma transição. A
implementação final do escopo deve usar somente o contrato atual definido pela
tarefa.

## Segurança E Integridade Continuam Obrigatórias

Estas regras não removem proteções necessárias ao funcionamento atual. Continue
implementando, conforme o risco da tarefa:

- validação de entradas e contratos;
- constraints e integridade referencial;
- transações, atomicidade e recuperação de falhas do fluxo atual;
- validação de caminhos, checksums, permissões e limites;
- tratamento explícito de erros;
- testes de comportamento, integridade e segurança.

Essas proteções devem defender o contrato atual. Não devem servir para manter
compatibilidade com estados substituídos que o usuário não solicitou.

## Implementações Provenientes De Planos

- Ao concluir uma implementação proveniente de um arquivo de plano, executar a
  skill `$validate-workspace` como gate geral final, depois dos testes específicos
  da própria implementação.
- Não considerar o plano concluído antes de apresentar o resultado dessa skill.
- Seguir os checkpoints de autorização definidos pela skill para instalar
  dependências ou corrigir falhas encontradas. Essas decisões pertencem ao
  usuário e devem aceitar resposta livre, inclusive restrições parciais ou ação
  manual realizada por ele.
- Omitir esse gate somente quando o usuário determinar isso explicitamente para
  a execução atual.
