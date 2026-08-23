# knowledge-builder

Compilador offline de `data/knowledge`. O crate valida a fonte canônica,
projeta os seis locales, cria os bancos `system` e `system_media`, materializa o
`CAS/system` compartilhado e finaliza uma versão somente após verificar
integridade, foreign keys, fingerprints e checksums.

```text
cargo run -p knowledge-builder -- validate --source data/knowledge

cargo run -p knowledge-builder -- build \
  --source data/knowledge \
  --output build/knowledge-artifacts \
  --context tools/knowledge-builder/fixtures/local-context.json
```

Os três caminhos da CLI são explícitos. O binário não consulta rede, fontes do
app, i18n, seeds ou serviços externos. `fixtures/local-context.json` representa
uma compilação integral local sem identidade pública de release.
