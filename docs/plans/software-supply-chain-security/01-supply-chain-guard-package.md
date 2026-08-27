# Fase 1 — pacote autocontido Supply Chain Guard

## Estado e dependência

Proposto. Esta fase deve ser concluída antes de
`02-project-build-integration.md`.

O protocolo canônico de segurança continua definido em
`../software-supply-chain-security-plan.md`. Este arquivo define somente como
implementar o motor reutilizável, sem conectá-lo aos comandos ou ao código do
veterinary-clinic.

## Objetivo

Criar em `tools/supply-chain-guard/` uma ferramenta CLI autocontida, versionável
e copiável como uma pasta para outros repositórios. Ela deve analisar workspaces
Rust/Cargo e JavaScript/pnpm por configuração explícita, sem importar módulos da
aplicação e sem ser incluída no artefato produzido.

Ao fim desta fase, a ferramenta funciona contra fixtures próprias e contra um
workspace informado por argumentos, mas ainda não é obrigatória nos scripts,
CI, build ou runtime do produto.

## Decisões arquiteturais

- O pacote vive dentro deste repositório, mas sua fronteira é equivalente à de
  uma cópia baixada e adicionada em outro projeto.
- O pacote não será publicado em npm/crates.io nesta fase e terá
  `private: true` para impedir publicação acidental.
- O runtime do pacote é Node fixado, usando somente módulos nativos. Adicionar
  dependência de terceiros ao próprio guard exige decisão posterior explícita.
- O pacote não lê configuração global implícita nem importa código fora de sua
  pasta. Workspace, policy, cache, relatórios e outputs são recebidos por paths
  explícitos.
- Policies, exceções, IOCs, baseline e destinos de rede pertencem ao projeto
  consumidor; não ficam embutidos no núcleo reutilizável.
- O pacote é ferramenta de desenvolvimento/build. Nenhum módulo seu pode ser
  importado por Svelte, Tauri/Rust ou Rails nem entrar em bundles do produto.
- O registro próprio é somente cache interno. Evidências intercambiáveis usam os
  formatos in-toto, SLSA e CycloneDX definidos no protocolo canônico.
- O pacote não contém comando de update de dependências e nunca altera manifest
  ou lockfile em resposta a advisory.

## Estrutura alvo

```text
tools/supply-chain-guard/
  package.json
  README.md
  bin/
    supply-chain-guard.mjs
  src/
    cli/
      arguments.mjs
      commands.mjs
      exit-codes.mjs
    core/
      input-manifest.mjs
      fingerprint.mjs
      invalidation.mjs
      cache-record.mjs
      result.mjs
      clock.mjs
    policy/
      load-policy.mjs
      exceptions.mjs
      publication-age.mjs
      iocs.mjs
    adapters/
      cargo.mjs
      cargo-lock.mjs
      pnpm.mjs
      pnpm-lock.mjs
      registry-metadata.mjs
    evidence/
      in-toto.mjs
      vulnerabilities.mjs
      verification-result.mjs
      cyclone-dx.mjs
      provenance.mjs
    io/
      atomic-write.mjs
      subprocess.mjs
      report.mjs
  schemas/
    policy.schema.json
    exceptions.schema.json
    cache-record.schema.json
    report.schema.json
  tests/
    unit/
    integration/
    fixtures/
      cargo-workspace/
      pnpm-workspace/
      registry/
      iocs/
```

Nomes podem ser ajustados durante a implementação somente quando preservarem a
mesma separação de responsabilidades. Não criar cópias desses módulos em
outros diretórios de scripts ou dentro da aplicação.

## Contrato público da CLI

O entrypoint recebe sempre o workspace e a policy explicitamente. O contrato
inicial deve oferecer:

- `gate`: executar/reutilizar a cobertura completa e emitir decisão;
- `dependencies`: gerar inventário e delta sem modificar dependências;
- `incident`: avaliar um IOC fornecido sem apagar cache ou atualizar lockfiles;
- `verify-evidence`: validar schemas, subjects, digests e envelopes disponíveis;
- `approve-baseline`: materializar uma baseline somente a partir de relatório
  aprovado e confirmação humana explícita.

Não criar `--skip`, `--unsafe`, variável de bypass ou modo que transforme
`indeterminate` em sucesso. Argumentos de paths, targets e formato de saída não
são bypasses e devem ser validados.

Contratos de processo:

- exit code `0`: `approved`;
- exit code estável distinto: `denied`;
- exit code estável distinto: `indeterminate`;
- erro de uso/configuração não pode ser confundido com aprovação;
- stdout humano conciso e opção de relatório JSON estável;
- mensagens informam quais domínios foram reutilizados ou recalculados e por quê;
- nenhum comando solicita interativamente segredo nem imprime payload sensível.

Os números finais dos exit codes são definidos uma vez em
`src/cli/exit-codes.mjs`, documentados no README e cobertos por teste de contrato.

## Policy genérica

O schema exige que o projeto consumidor declare, sem defaults silenciosos:

- versão da policy e das referências normativas adotadas;
- ecossistemas e registries permitidos;
- idade mínima de publicação;
- targets, features, perfis e arquiteturas suportados;
- versões/checksums esperados de toolchains e scanners externos;
- roots de input e exclusões fechadas do contexto de build;
- validade máxima de advisories, IOCs e cache local;
- regras de sources, integridade, publisher, licença e lifecycle/build scripts;
- paths dos arquivos de exceção, baseline, network policy e relatórios;
- verificações obrigatórias e severidades que bloqueiam.

A engine suporta idade configurável, mas preserva invariantes não configuráveis:

- severidade, campo `fixed`, dist-tag e recomendação externa podem apenas alertar
  ou restringir; nunca reduzem cooldown ou criam exceção;
- preflight de idade cobre todas as entradas de registry nos lockfiles antes de
  permitir aquisição de payload;
- adoção anterior ao cooldown exige registro humano `early-publication` para
  ecossistema, pacote, versão, origem e checksum exatos;
- exceção ampla, inferida de metadata, vencida ou divergente resulta em
  `indeterminate`/`denied`, nunca aprovação;
- a vulnerabilidade da versão atual e a confiança na versão corretiva são
  decisões independentes.

## Motor incremental

Implementar o fechamento completo dos inputs antes de otimizar:

1. Enumerar o contexto efetivo e construir `buildContextDigest`.
2. Declarar para cada check seu manifesto de inputs e outputs.
3. Incluir o próprio guard, schemas, policy, ferramentas, targets e ambiente nos
   fingerprints aplicáveis.
4. Usar bytes exatos para fontes/build inputs e canonicalização versionada
   somente para dados estruturados.
5. Persistir atomicamente resultados por domínio com estados `approved`,
   `denied` ou `indeterminate`.
6. Revalidar schema, hashes, ferramentas, relógio, validade e fontes temporais em
   todo cache hit.
7. Reexecutar somente domínios invalidados; uma fonte temporal nova repete o
   matching sobre inventário preservado.

O cache local não é autenticado nem promovível. O pacote deve permitir que um
integrador forneça um backend/autoridade de CI, mas assinatura, workload identity
  e armazenamento protegido serão conectados na fase 2.

## Adaptadores Cargo e pnpm

Os adaptadores são genéricos e recebem paths/configuração. Eles devem:

- analisar lockfiles por parser estruturado e falhar diante de schema não
  suportado;
- diferenciar dependência direta, transitiva, dev/build, proc macro, build script
  e lifecycle script quando o ecossistema fornecer essa informação;
- executar subprocessos sem shell, com argv explícito, ambiente allowlisted,
  timeout configurável e captura limitada/estruturada;
- nunca instalar ferramenta ou atualizar índice/lockfile por iniciativa própria;
- consultar metadata de publicação antes de qualquer operação de aquisição;
- produzir uma decisão de aquisição por pacote, versão, origem e checksum;
- considerar alcançabilidade ausente ou ambígua como alcançável;
- não confiar que uma entrada já presente no `Cargo.lock` cumpriu idade;
- manter compatibilidade apenas com versões de lockfile/toolchain declaradas na
  policy, falhando fechado nas demais.

## Evidências

Implementar adaptadores de serialização/validação, sem inventar substitutos para
predicates existentes:

- in-toto Statement v1 e envelope DSSE;
- in-toto VULNS v0.2 para resultados dos scanners;
- in-toto SVR v0.2 para propriedades aprovadas contra policies por digest;
- CycloneDX/VEX como documentos ou predicates referenciados por digest;
- SLSA Provenance v1 como contrato que o integrador de build preencherá.

Nesta fase, fixtures podem produzir Statements locais não autoritativos. O
pacote não guarda chave e não assina como se fosse o control plane de release.

## Sequência de implementação

1. Criar a estrutura autocontida, `package.json` privado, entrypoint e README.
2. Implementar contratos de argumentos, paths, exit codes, estados e schemas.
3. Implementar manifesto de inputs, fingerprints, atomicidade e cache por domínio.
4. Implementar relógio/freshness, cooldown, exceções exatas e invariantes
   monotônicas.
5. Implementar parsers/adaptadores Cargo e pnpm usando somente fixtures.
6. Implementar IOC, relatórios e decisão de aquisição sem mutações.
7. Implementar validação/serialização das evidências padronizadas.
8. Consolidar testes, documentação de incorporação por cópia e changelog/version
   internos da ferramenta.

Cada item deve terminar com testes específicos antes de avançar. Não integrar
scripts root nem corrigir dependências reais nesta fase.

## Estratégia de testes

- unit tests para schemas, parsing, canonicalização, paths e exit codes;
- property/fuzz tests para nomes/versões, URLs, symlinks e normalização;
- fixtures mínimas Cargo/pnpm com dependências diretas, transitivas e de build;
- cache hit, miss seletivo, concorrência, arquivo parcial, adulteração e expiração;
- mudança no próprio guard invalida a evidência correspondente;
- versão jovem inserida diretamente em lockfile permanece bloqueada;
- advisory crítico falso gera alerta, mas nenhuma exceção, update ou requisição
  de payload;
- `early-publication` libera somente pacote/versão/origem/checksum declarados;
- registry de fixture distingue consultas de metadata de requisições de payload;
- outputs `denied` e `indeterminate` nunca usam exit code de aprovação;
- validação das versões de Statement/predicates suportadas;
- teste de portabilidade executa a pasta copiada em diretório temporário contra
  fixtures, sem acesso a módulos do veterinary-clinic.

## Critérios de aceite

- `tools/supply-chain-guard/` pode ser copiado isoladamente e seus testes passam.
- Nenhum arquivo do pacote importa código/configuração do produto.
- O pacote usa apenas Node nativo e não instala dependências.
- Policies específicas são obrigatoriamente externas ao pacote.
- Nenhuma versão jovem obtém aprovação por severity ou metadata.
- Nenhuma aquisição de payload é autorizada antes da decisão de idade.
- Cache é explicável, fail-closed e não tratado como autoridade.
- Schemas e CLI possuem versão/contrato documentados.
- Nada do pacote aparece em bundles ou artefatos de aplicação das fixtures.

Depois dos testes próprios, executar a skill `$validate-workspace` como gate
geral final. Instalação de ferramenta, correção de falha externa ou mudança de
dependência continua sujeita aos checkpoints dessa skill.

## Entrega para a fase 2

A fase termina entregando:

- pasta autocontida e versão identificável do guard;
- CLI e exit codes estáveis;
- schemas de policy, exceptions, cache e report;
- fixtures/testes reproduzíveis;
- documentação de incorporação por cópia;
- lista explícita de integrações ainda pendentes no veterinary-clinic.

Somente depois desses critérios a fase 2 pode conectar o pacote ao produto.
