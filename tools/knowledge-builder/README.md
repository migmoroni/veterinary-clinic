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
- O `ProjectionLedger` exige consumo único de entidades, folhas estruturais,
  relações, fragmentos localizados, documentos, seções e mídias. O relatório é
  criado a partir dos eventos concluídos e as contagens de tabelas são
  comparadas com o SQLite.
- Schemas, metadados, fingerprints, integridade, foreign keys, referências de
  mídia, CAS, checksums e conjunto exato de arquivos são verificados em staging.
  O rename de `versions/<build_version>` é a publicação final.

O binário não consulta rede, apps, packages, i18n, seeds nem o ramo `user`. Uma
versão existente só é reutilizada após a mesma verificação integral.
