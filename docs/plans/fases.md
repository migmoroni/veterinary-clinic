1. refatorar modelo monolitico atual para monolitico modular

2. em `packages/core-local/src/sqlite`, versionar cada banco SQLite de forma independente e depois separar operação que cria bancos, operação que migra bancos e conjuntos de tabelas por banco/perfil de app, mantendo o schema de domínio atual:
   [sqlite-modular-refactor-plan.md](sqlite-modular-refactor-plan.md)

3. desenvolvimento do hub-server, com Rails, como hub aberto de dados públicos, pares `system` e `system_media` por locale, `CAS/system` compartilhado, updates e builds dos apps. Os apps passam a consumir somente os locale packs necessários, prontos e versionados, sem manter JSONs fonte nem gerar esses bancos dentro dos apps:
   [hub-server/README.md](hub-server/README.md)

4. refatorar medical_records para novo modelo que segue os padroes de mercado:
   [medical-records-timeline-refactor.md](medical-records-timeline-refactor.md)

5. planejar intercambio FHIR como formato geral de distribution:
   [fhir-interchange-distribution-plan.md](fhir-interchange-distribution-plan.md)

6. desenvolver sistema de conta de admin, e contas de usuários, com suas permições

7. adicionar criptografia aos bancos, usando com base na cifra gerada, o pin do user admin
