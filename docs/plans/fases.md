1. refatorar o modelo monolítico atual para monólito modular;

2. em `packages/core-local/src/sqlite`, versionar cada banco SQLite de forma independente e depois separar operação que cria bancos, operação que migra bancos e conjuntos de tabelas por banco/perfil de app, mantendo o schema de domínio atual:
   [sqlite-modular-refactor-plan.md](sqlite-modular-refactor-plan.md)

3. migrar o workspace JavaScript para pnpm, com um único lockfile, dependências locais por `workspace:*` e comandos unificados para desenvolvimento, testes e builds:
   [Pré-fase 0 do Hub Server](hub-server/00-pnpm-workspace-migration.md)

4. desenvolver o `knowledge-builder` definitivo em Rust e o hub-server com Rails, como hub aberto de dados públicos, pares `system` e `system_media` por locale, `CAS/system` compartilhado, updates e builds dos apps. O Rails orquestra o builder pela CLI versionada. Os apps passam a consumir somente os locale packs necessários, prontos e versionados, sem manter JSONs fonte nem gerar esses bancos dentro dos apps:
   [hub-server/README.md](hub-server/README.md)

5. refatorar `medical_records` para o novo modelo que segue os padrões de mercado:
   [medical-records-timeline-refactor.md](medical-records-timeline-refactor.md)

6. planejar intercâmbio FHIR como formato geral de `distribution`:
   [fhir-interchange-distribution-plan.md](fhir-interchange-distribution-plan.md)

7. desenvolver sistema de conta de administrador e contas de usuários com suas permissões;

8. adicionar criptografia aos bancos usando, como base para a cifra gerada, o PIN do usuário administrador.
