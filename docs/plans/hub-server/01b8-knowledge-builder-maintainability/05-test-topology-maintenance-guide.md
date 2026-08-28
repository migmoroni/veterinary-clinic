# Parte 1B.8.5: Topologia De Testes E Guia De Manutenção

## Objetivo

Organizar a suíte por custo e responsabilidade, concluir a comparação semântica
da refatoração e documentar o estado vigente do builder. O ciclo rápido não
executa builds de seis locales; componentes exercitam SQLite e filesystem
isoladamente; cenários integrais preservam todas as provas de segurança.

## Pré-Requisito

A [Parte 1B.8.4](./04-structured-errors-boundaries.md) está concluída. O crate
usa `0.5.0`, possui erros estruturados e dependências explícitas. A referência
temporária criada na Parte 1B.8.1 continua disponível em `target/`.

## 1. Topologia Final

Organizar:

```text
tools/knowledge-builder/
├── src/
│   └── <testes unitários junto aos proprietários>
└── tests/
    ├── support/
    │   └── mod.rs
    ├── component.rs
    └── integral.rs
```

`support` contém somente infraestrutura de teste: diretório temporário, cópia de
fixture, geração de contexto, abertura de banco e helpers de adulteração. Ele não
reimplementa validação, projeção, hashing ou verificação de produção.

Remover `tests/builder.rs` depois de distribuir todos os cenários. Não manter o
arquivo como agregador ou wrapper.

## 2. Camada Rápida

Comando canônico:

```text
cargo test -p knowledge-builder --lib
```

Inclui:

- contratos centrais e equivalência declarativa;
- normalização;
- Markdown;
- validação de identidades, referências e taxonomias;
- rows, descritores e operações;
- expected, ownership e diff de obrigações;
- journals e recibos por unidades pequenas;
- classificação e apresentação dos erros;
- parsing estrutural dos SQLs.

Essa camada não chama `build()` para os seis locales e não usa o catálogo
completo em `data/knowledge`.

## 3. Camada De Componente

Comando canônico:

```text
cargo test -p knowledge-builder --test component
```

Inclui:

- criação, transação e finalização de cada banco;
- round-trip das famílias de rows;
- readers e verificadores individuais;
- filesystem e staging isolados;
- mídia, thumbnail e CAS isolados;
- falhas de commit, rollback, integridade e foreign keys.

Cada teste usa diretório exclusivo e não depende de execução anterior.

## 4. Camada Integral

Comando canônico:

```text
cargo test -p knowledge-builder --test integral
```

Preservar:

- build determinístico dos seis locales;
- reutilização válida e contexto divergente;
- digest independente da organização editorial;
- mídia estrutural e Markdown compartilhando CAS;
- adulteração de rows e metadata com checksums recalculados;
- adulteração de manifest, relatório, árvore, bancos, mídia e CAS;
- execução da CLI fora da raiz do workspace.

Casos que usam o mesmo artefato canônico podem compartilhar setup dentro de um
único teste matricial, restaurando bytes canônicos antes de cada mutação. Testes
diferentes não compartilham diretório mutável.

## 5. Meta De Custo

Comparar com `target/knowledge-builder-maintainability/reference/measurements.json`.
A suíte final deve:

- manter todos os cenários registrados na referência;
- executar quantidade estritamente menor de builds integrais dos seis locales;
- manter a camada rápida sem build integral;
- registrar separadamente os tempos das três camadas;
- não usar tempo absoluto como aprovação ou reprovação.

Registrar no README somente os comandos e a topologia atuais. As medidas da
referência e do resultado final aparecem no relatório da execução ao usuário,
não na documentação permanente.

Repetir também os quatro cenários de `change-surface.md`. A superfície final não
pode aumentar repetições sem prova própria e deve reduzir a quantidade total
dessas repetições. Contratos proprietários e observações independentes não são
contabilizados como duplicação a remover.

## 6. Equivalência Semântica Da Refatoração

Gerar uma saída final limpa com o mesmo source e contexto usados pela referência.
Comparar independentemente:

- `sourceDigestSha256` exato;
- árvore relativa de artefatos exata;
- DDL e schema fingerprint exatos;
- todas as rows projetáveis exatas;
- metadata exata depois de substituir somente `builder_version` por um sentinel
  nos dois lados;
- `build-result.json` exato depois de substituir por sentinels somente
  `builderVersion` e os checksums dos bancos derivados dessa metadata;
- `checksums.sha256` exato depois de substituir somente as entradas dos bancos;
  checksums do relatório e dos objetos CAS continuam exatos;
- conteúdo compilado e thumbnails exatos;
- objetos e conjuntos CAS exatos;
- relatório de projeção, contagens, ownership e evidência exatos;
- comportamento de reutilização e recusa de adulterações equivalente.

Não comparar checksums brutos dos bancos como igualdade entre versões, pois os
bytes de metadata incluem `builderVersion`. A normalização dos checksums só é
permitida depois que a equivalência integral das rows e da estrutura de cada
banco estiver comprovada. Cada saída deve, separadamente, passar por seu próprio
verificador integral e comprovar checksums internos.

Não normalizar rows de domínio, conteúdo, mídia, CAS, relatório ou evidência. A
ausência da referência temporária bloqueia a conclusão desta parte e deve ser
informada; ela não autoriza incorporar outra implementação ao código vigente.

Depois da comparação, remover
`target/knowledge-builder-maintainability/reference/`.

## 7. Endurecimento Dos Contratos Centrais

Completar os testes da Parte 1B.7 para exigir:

- os 13 pares taxonômicos associados individualmente à cardinalidade esperada;
- igualdade exata entre chaves `required` e `properties` dos seis locales nos
  JSON Schemas aplicáveis;
- produtores e verificadores consumindo as versões centrais, sem testes que
  apenas comparem uma constante com seu próprio numeral;
- identidades dos bancos, filenames, caminhos e descritores CAS usados por build
  e verificador.

## 8. Guia Vigente

Atualizar `tools/knowledge-builder/README.md` para explicar, no presente:

- fronteiras do pipeline;
- proprietários de rows, inventário, ownership, recibos e verificação;
- como adicionar ou alterar campo de autoria;
- como adicionar relação, row ou tabela;
- como atualizar writer e reader independentes;
- como declarar expected e owner;
- como adicionar recibo e verificação;
- como classificar erros;
- quais testes executar por tipo de mudança.

Não registrar comparação histórica, arquitetura substituída, métricas anteriores
ou caminhos removidos.

## Fora Do Escopo

- alterar comportamento de validação, projeção, persistência ou verificação;
- alterar schemas, DDLs, conteúdo compilado, thumbnails ou CAS;
- modificar `data/knowledge`, apps, Hub ou packages de runtime;
- adicionar dependências;
- manter snapshots, binários ou artefatos de referência no repositório;
- criar migrations, conversões ou caminhos paralelos.

## 9. Validação Final

Executar:

```text
cargo test -p knowledge-builder --lib
cargo test -p knowledge-builder --test component
cargo test -p knowledge-builder --test integral
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets
cargo clippy -p knowledge-builder --all-targets -- -D warnings
cargo test -p knowledge-builder --all-targets --locked
```

Depois, executar o gate geral da skill `$validate-workspace`.

## Critérios De Aceite

- As três camadas possuem comandos e responsabilidades explícitas.
- A camada rápida não constrói os seis locales.
- A quantidade de builds integrais é menor que a referência, sem perda de
  cenários.
- Os quatro cenários de evolução possuem menos repetições sem prova própria e
  não perdem contratos proprietários ou observações independentes.
- Todos os casos de adulteração permanecem ativos.
- A comparação semântica permite somente a diferença de `builderVersion`.
- Os testes centrais comprovam equivalência exata de taxonomias, locales,
  versões, bancos e artefatos.
- O README descreve somente a arquitetura vigente.
- Não permanecem artefatos temporários rastreados ou não rastreados da referência.
- O crate `0.5.0` passa em formatação, compilação, Clippy e testes.
- O workspace passa integralmente pela skill `$validate-workspace`.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](../01c-app-system-consumption.md).
