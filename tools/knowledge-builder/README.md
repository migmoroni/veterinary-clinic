# knowledge-builder

Compilador offline e verificável de `data/knowledge`. O crate valida cada JSON
por JSON Schema Draft 2020-12 antes do Serde, normaliza autoria em Unicode NFC,
interpreta documentos por AST CommonMark e projeta os seis locales em bancos
`system` e `system_media` com um `CAS/system` compartilhado.

O MSRV do crate é Rust 1.87, determinado pela árvore de dependências fixada no
`Cargo.lock`.

```text
cargo run -p knowledge-builder -- validate --source data/knowledge

cargo run -p knowledge-builder -- build \
  --source data/knowledge \
  --output build/knowledge-artifacts \
  --context tools/knowledge-builder/fixtures/contexts/local-context.json
```

## Contratos

- `normalize_identity_key` remove diacríticos e caracteres fora de ASCII
  alfanumérico; alimenta `normalized_name`.
- `normalize_search_text` substitui separadores por espaço e alimenta labels e
  termos de busca.
- Markdown aceita somente a allowlist documentada na fonte. Links são `https` e
  imagens são caminhos locais resolvidos sem symlinks dentro da entidade.
- Mídias PNG, JPEG, GIF e WebP preservam os bytes originais no CAS. A orientação
  é aplicada antes de produzir thumbnail JPEG, qualidade 72, lado máximo 200,
  filtro Lanczos3 e transparência sobre branco.
- Cada locale possui um `ProjectionContract` puro, tipado e determinístico,
  construído antes da abertura dos bancos. O contrato contém os valores finais
  das colunas, relações ordenadas, busca, documentos compilados, mídia e CAS;
  os writers apenas persistem essas operações.
- Cada folha validada declara diretamente seu proprietário fechado por
  `ProjectionOperationId`. Os lotes são finalizados somente por essa identidade:
  não existe agrupamento ou descoberta de propriedade por target, banco, tabela,
  linha ou coluna.
- Colunas projetáveis usam o enum fechado `SystemColumn`. Cada variante de
  `SystemRow` declara tabela, identidade lógica e o conjunto exato de colunas do
  seu `INSERT`; o contrato recusa evento, target ou coluna incompatível com o
  payload antes de abrir SQLite.
- Os SQLs fixos dos writers possuem descritores fechados. Uma matriz estrutural
  executável cobre todas as formas concretas de `INSERT`, incluindo cada destino
  polimórfico, e exige igualdade exata entre tabela, colunas do comando,
  `SystemRow::materialized_columns()` e todas as variantes de `SystemColumn`.
- O `ProjectionJournal` recebe as obrigações concretas declaradas pela operação.
  Não existe conclusão por destino nem expansão de um destino para outras
  obrigações; evidências SQLite só são publicadas depois do `commit`.
- O `projection-report.json` v3 deriva exclusivamente do contrato e do
  `CompletedLedger`. Ele
  contém as contagens esperada e concluída, operações, eventos por banco e tabela,
  relações resolvidas, fragmentos localizados consumidos e o digest canônico
  versionado das evidências de cada locale.
- Um único `ArtifactVerifier` recalcula schemas, metadados, tamanhos, hashes,
  fingerprints, integridade, foreign keys e contagens e também relê todas as
  linhas projetáveis em tipos fechados. Bancos, relações, ordenações, busca,
  conteúdo compilado, referências estruturais, `system_media`, CAS, metadados e
  relatório precisam ser integralmente iguais ao `ProjectionContract`. O mesmo
  núcleo verifica o staging e uma versão existente antes da reutilização.
- Todas as fixtures estão declaradas em `fixtures/registry.json`; o teste de
  cobertura recusa diretórios sem caso ou casos sem uma asserção executada.
  O rename de `versions/<build_version>` continua sendo a publicação final.

O binário não consulta rede, apps, packages, i18n, seeds nem o ramo `user`. Uma
versão existente só é reutilizada após a mesma verificação integral.
