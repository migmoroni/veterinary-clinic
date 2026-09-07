# Parte 1B.9.4: Fechamento E Documentação

## Objetivo

Confirmar as fronteiras entre crate e tool, estabilizar a manutenção do novo
pipeline e alinhar os contratos que a Parte 1C consome.

## Pré-Requisito

A [Parte 1B.9.3](./03-veterinary-adapter.md) está concluída.

## 1. Auditoria De Fronteiras

Comprovar recursivamente:

```text
artifact-builder
  não depende de knowledge-builder, engine, apps ou packages de domínio

knowledge-builder
  depende de artifact-builder
  não implementa infraestrutura transferida

apps e packages de runtime
  não dependem de artifact-builder nem knowledge-builder
```

O Cargo Workspace contém os dois packages explicitamente. Dependências formam:

```text
artifact-builder -> dependências Rust externas
knowledge-builder -> artifact-builder + dependências de compilação editorial
```

Não existem ciclos, importações por path para arquivos internos ou APIs públicas
criadas somente para testes.

## 2. Contratos De Saída

Construir `data/knowledge` e registrar o mapa final dos artefatos no README da
tool:

- disposição das versões;
- seis variantes de locale;
- `system` e `system_media` por locale;
- CAS compartilhado;
- manifest genérico da crate;
- resultado público da tool;
- application IDs e user versions;
- checksums, tamanhos e contagens relevantes.

Registrar também a contagem final de linhas Rust de produção da crate e da tool,
separadamente. Aplicar o orçamento de complexidade definido no plano geral sem
contar testes, schemas, DDLs ou fixtures.

Atualizar a Parte 1C para consumir exatamente esses nomes, caminhos e campos.
Não deixar exemplos divergentes entre README, schemas e planos.

## 3. Guias De Manutenção

O README de `packages/artifact-builder` explica:

- propósito e limites da crate;
- contrato de entrada e resultado;
- regras de SQLite, CAS, determinismo e publicação;
- como um consumidor fornece DDL e `TableData`;
- como testar a crate;
- o que não pertence ao motor.

O README de `tools/knowledge-builder` explica:

- formato de `data/knowledge`;
- schemas e regras do domínio;
- compilação para o contrato neutro;
- DDLs veterinários;
- comandos `validate` e `build`;
- separação dos testes;
- como adicionar entidade, campo, taxonomia, tabela e mídia sem alterar o motor
  quando a necessidade for específica do projeto.

Toda documentação usa o presente e descreve somente a arquitetura vigente.

## 4. Limpeza

- remover arquivos, módulos e fixtures sem consumidor;
- remover dependências Cargo não utilizadas;
- remover diretórios vazios;
- garantir que outputs e referências temporárias estejam ignorados;
- executar formatação mecânica dos JSONs alterados;
- confirmar que nenhuma fonte de conhecimento foi copiada para a crate genérica;
- confirmar que nenhum artefato gerado está rastreado.

## 5. Validação Final

Executar:

```text
cargo fmt --package artifact-builder --package knowledge-builder -- --check
cargo check -p artifact-builder -p knowledge-builder --all-targets
cargo clippy -p artifact-builder -p knowledge-builder --all-targets -- -D warnings
cargo test -p artifact-builder --all-targets --locked
cargo test -p knowledge-builder --all-targets --locked
```

Executar duas construções independentes da fonte completa e comprovar:

- igualdade byte a byte dos bancos correspondentes;
- igualdade byte a byte dos manifests e resultados;
- igualdade do conjunto de hashes CAS;
- ausência de caminhos absolutos e timestamps ambientais;
- aprovação de todos os bancos em `foreign_key_check` e `integrity_check`;
- verificação integral das duas saídas pela API pública da crate.

Depois, executar a skill `$validate-workspace` e apresentar o resultado antes de
considerar a Parte 1B.9 concluída.

## Fora Do Escopo

- implementar consumo dos artefatos pelo app;
- implementar Hub, providers ou atualização remota;
- publicar `artifact-builder` externamente;
- criar CLI genérica;
- adicionar backend diferente de SQLite e filesystem;
- criar migrations ou formatos de transição.

## Critérios De Aceite

- As fronteiras de dependência estão comprovadas por testes recursivos.
- O contrato público da crate é pequeno, neutro e documentado.
- A tool contém apenas regras editoriais e veterinárias.
- Os artefatos finais são íntegros e determinísticos.
- README, schemas, testes e Parte 1C descrevem o mesmo contrato.
- O workspace não contém módulos, dependências ou artefatos sem proprietário.
- A skill `$validate-workspace` passa integralmente.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1C: consumo local dos artefatos `system`](../01c-app-system-consumption.md).
