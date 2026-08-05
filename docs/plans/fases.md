1. refatorar modelo monolitico atual para monolitico modular

2. refatorar medical_records para novo modelo que segue os padroes de mercado:
   [medical-records-timeline-refactor.md](medical-records-timeline-refactor.md)

3. planejar intercambio FHIR como formato geral de distribution:
   [fhir-interchange-distribution-plan.md](fhir-interchange-distribution-plan.md)

4. em persistence/sqlite, separar operação que cria bancos, do que migra bancos, e bem como, separar cada conjunto codigo que cria/migra tabelas em arquivos separados, onde cada pasta seria de qual banco faz parte, para manutenção melhorada, assim sabendo melhor o que cada um se refere.

5. desenvolvimento do server-open, com Rails, como servidor aberto de dados publicos, pacotes de banco, CAS/system, system_media, updates e builds dos apps. Os apps passam a consumir dados prontos/versionados vindos dele, sem manter JSONs fonte nem gerar esses bancos dentro dos apps:
   [server-open-plan.md](server-open-plan.md)

6. desenvolver sistema de conta de admin, e contas de usuários, com suas permições

7. adicionar criptografia aos bancos, usando com base na cifra gerada, o pin do user admin
