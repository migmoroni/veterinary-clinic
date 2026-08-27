# Parte 1B.8.2: Ledger E Recibos Confirmados

## Objetivo

Concentrar o ledger em ownership, confirmação de efeitos e cobertura. Regras de
entidade, busca, taxonomia e mídia produzem um inventário esperado independente;
operações declaram ownership; writers e materializadores retornam recibos somente
depois da confirmação do efeito.

```text
fonte validada -> expected
ProjectionContract -> owned
efeitos confirmados -> observed

expected == owned
expected == observed
```

## Pré-Requisito

A [Parte 1B.8.1](./01-row-persistence-contracts.md) está concluída. O contrato de
rows é coeso e writer e reader preservam equivalência exata.

## Invariantes

- `expected` não consulta operações construídas.
- `owned` é a união das obrigações declaradas pelas operações.
- `observed` contém somente recibos confirmados.
- Uma obrigação possui exatamente um owner.
- Commit falho e rollback não publicam evidência.
- Destino compartilhado não conclui outra obrigação por inferência.
- Regras de domínio não são decididas pelo ledger.
- A refatoração não altera rows, DDLs, relatórios ou digests públicos.

## 1. Inventário Esperado

Mover a derivação específica da fonte para uma fronteira de projeção, por
exemplo:

```text
projection/inventory/
├── mod.rs
├── entities.rs
├── search.rs
├── taxonomy.rs
└── media.rs
```

Esse inventário percorre `ValidatedSource` e produz
`BTreeSet<ProjectionObligation>` sem consultar `ProjectionContract`, operações,
writers, journals ou recibos.

Helpers podem compartilhar tipos fechados de identidade, source token e target.
Não podem compartilhar a decisão de que uma operação concreta existe.

## 2. Ownership

A construção do `ProjectionContract` associa explicitamente cada obrigação a um
`ProjectionOperationId`. A validação do contrato calcula `owned` diretamente
das operações e exige `expected == owned` antes de abrir qualquer banco.

O código genérico que detecta owners ausentes, inesperados ou duplicados pode
permanecer no ledger. A descoberta de campos de produto, protocolo, taxonomia,
busca ou Markdown pertence ao inventário e aos projectors correspondentes.

## 3. Recibos Tipados

Definir uma API fechada com estes papéis:

```rust
pub(crate) struct PendingReceipt { /* privado ao executor do efeito */ }

pub(crate) struct ConfirmedReceipt {
    pub operation: ProjectionOperationId,
    pub obligations: BTreeSet<ProjectionObligation>,
    pub event: ProjectionEvent,
    pub observed_count: usize,
}

pub(crate) struct ConfirmedReceiptBatch { /* coleção não vazia */ }
```

`ProjectionEvent` representa de forma tipada rows SQLite, documentos compilados,
objetos CAS e demais efeitos concretos. Não usar tabela ou string genérica para
simular eventos de naturezas diferentes.

Construtores de `ConfirmedReceipt` ficam privados ao módulo que confirma o
efeito. O ledger recebe somente recibos confirmados; não oferece API que converta
um plano diretamente em observação.

Um executor com zero operações planejadas não cria batch nem observação. Isso é
um resultado válido para conjuntos CAS vazios e não equivale a confirmar uma
obrigação inexistente.

## 4. Transações SQLite

Cada banco de locale é escrito em uma transação que inclui metadata e suas rows
de domínio:

```text
system transaction
  -> metadata de system
  -> SystemRow
  -> commit
  -> ConfirmedReceiptBatch

system_media transaction
  -> metadata de system_media
  -> SystemMediaRow
  -> commit
  -> ConfirmedReceiptBatch
```

Writers não recebem `ProjectionLedger`. Eles executam operações tipadas e
retornam o batch somente após `Transaction::commit()` bem-sucedido. Depois disso,
o orquestrador entrega o batch ao ledger.

Em erro de statement, cardinalidade ou commit, o writer retorna erro e nenhum
`ConfirmedReceiptBatch` escapa.

## 5. Efeitos Não SQLite

- Compilação confirma recibos depois de localizar e validar o documento
  compilado correspondente à operação.
- CAS confirma recibos depois de escrever ou verificar o objeto no staging e
  comprovar seu SHA-256.
- Manifest, relatório e checksums continuam fora do ledger de projeção quando
  não possuem obrigação declarada no contrato.

Não criar caminhos especiais que marquem obrigações como concluídas apenas
porque a operação foi planejada.

## 6. Ledger Final

O ledger mantém somente:

- conjunto esperado;
- conjunto observado;
- unicidade e locale dos recibos;
- eventos observados;
- diff de cobertura;
- digest determinístico de evidência;
- finalização em `CompletedLedger`.

Remover de `ledger/` a reconstrução de relações e regras concretas de entidades.
Arquivos sem responsabilidade própria são absorvidos pelo inventário, contrato
ou journal e removidos, sem wrappers.

## 7. Testes Específicos

Cobrir:

- `expected`, `owned` e `observed` construídos por percursos independentes;
- owner ausente, inesperado e duplicado;
- receipt com operação, target, locale ou cardinalidade divergente;
- impossibilidade de confirmar antes do commit;
- falha de statement, commit e rollback sem observação publicada;
- transação única por banco incluindo metadata;
- CAS adulterado sem receipt confirmado;
- destino compartilhado sem conclusão implícita;
- digest de evidência estável.

Executar os testes específicos do ledger e writers, a suíte integral do crate e
o gate geral `$validate-workspace`.

## Fora Do Escopo

- alterar o descritor de rows concluído na Parte 1B.8.1;
- decompor o verificador integral;
- alterar a API pública de erros;
- mudar schemas de relatório ou evidência;
- elevar a versão do crate.

## Critérios De Aceite

- `expected`, `owned` e `observed` são conjuntos distintos e iguais ao final.
- Writers não dependem de `ProjectionLedger`.
- Metadata e rows do mesmo banco usam a mesma transação.
- Apenas efeitos confirmados produzem `ConfirmedReceipt`.
- Rollback e falhas não alteram o ledger.
- Ledger não conhece regras concretas de entidades, busca, taxonomia ou mídia.
- Digests, relatórios, bancos e CAS permanecem semanticamente inalterados.
- Os testes específicos e o gate geral da skill `$validate-workspace` passam.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.8.3: verificação integral decomposta](./03-artifact-verification.md).
