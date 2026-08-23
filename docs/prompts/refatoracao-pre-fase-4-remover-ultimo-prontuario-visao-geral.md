# Prompt Para Pré-Fase 4: Remover Último Prontuário Da Visão Geral

Execute uma refatoração preparatória antes da fase 4 de `@vet/app-services`.

O objetivo é remover da visão geral global do `vet-app` o quadro que exibe o
último prontuário editado e remover a lógica que consulta esse último
prontuário para alimentar essa tela.

Esta etapa deve ficar restrita ao comportamento atual da home/visão geral. Não
crie packages novos, não mova `analytics`, não mova `search`, não altere schema
SQLite e não mude o fluxo clínico de prontuários.

## Resultado Esperado

Depois desta etapa, `apps/vet-app/src/routes/+page.svelte` continua sendo a
visão geral operacional do app, mas sem o quadro de último prontuário editado.

A tela deve continuar exibindo:

```text
setup inicial do banco
cabeçalho da visão geral
mensagens de erro
seção de análises da clínica
atalho de raças
atalho de produtos
```

O detalhe de prontuário continua funcionando nas rotas próprias de prontuário.
A página do pet continua fora deste escopo.

## Arquivos Alvo

Edite estes arquivos:

```text
apps/vet-app/src/routes/+page.svelte
apps/vet-app/src/lib/services/clinic.service.ts
apps/vet-app/src/lib/read-models/current-record.read-model.ts
apps/vet-app/src/lib/index.ts
packages/types/src/domain/medical-record/medical-record.ts
packages/core-local/src/services/client-state.service.ts
packages/core-local/src/i18n/pt-BR.ts
packages/core-local/src/i18n/en-US.ts
```

## Atividade 1: Remover O Quadro Da Home

Em `apps/vet-app/src/routes/+page.svelte`, remova a seção visual que usa
`home.currentRecord` e mostra o último prontuário editado.

Remova também tudo que existe apenas para esse quadro:

```text
import de OwnerContactDialog
import de OwnerAssociatedContact
import do ícone Phone
import do ícone ClipboardPenLine
estado contactDialogOpen
estado contactDialogOwnerName
estado contactDialogContacts
função openCurrentRecordContact
função currentRecordContextLabel
uso final de OwnerContactDialog
referências a clinic.dashboard.record
```

Preserve a seção de análises, os atalhos de raças/produtos, setup inicial,
refresh e tratamento de erro.

## Atividade 2: Remover A Consulta Do Último Prontuário

Em `apps/vet-app/src/lib/services/clinic.service.ts`, remova a composição de
`record` no dashboard.

Faça estes ajustes:

```text
remover import de CurrentRecordSummary
remover import de getLastEditedRecord
remover import de shouldResetOverviewLastRecordOnce
remover propriedade record de ClinicDashboard
remover getLastEditedRecord() do Promise.all em loadDashboard
remover record do retorno de loadDashboard
```

`ClinicDashboard` deve permanecer com:

```text
counts
vaccines
antiparasitics
analytics
```

Mantenha em `clinic.service.ts` as funções de ciclo de vida local do app:

```text
initializeClinic
hasClinicDatabase
createNewClinicDatabase
importClinicDatabase
loadDashboard
searchEverywhere
filterActiveSearchResults
loadOwnerAssociatedContactsByOwnerIds
```

## Atividade 3: Limpar O Read Model Atual

Em `apps/vet-app/src/lib/read-models/current-record.read-model.ts`, mantenha
`getMedicalRecordDetails`.

Remova apenas o que alimentava o último prontuário da visão geral:

```text
CurrentRecordRow
ownerIdsSql
parseOwnerIds
mapCurrentRecord
getLastEditedRecord
import de CurrentRecordSummary
import de listOwnerAssociatedContactsByOwnerIds
```

Preserve os helpers usados por `getMedicalRecordDetails`:

```text
MedicalRecordDetailsRow
firstOwnerIdSql
firstOwnerAvatarSql
ownerNamesSql
fallbackTitle
getMedicalRecordDetails
```

## Atividade 4: Remover O Tipo Público Do Resumo Da Home

Em `packages/types/src/domain/medical-record/medical-record.ts`, remova
`CurrentRecordSummary`.

Ajuste o import do arquivo para manter apenas os tipos ainda usados.

Em `apps/vet-app/src/lib/index.ts`, remova o reexport de
`CurrentRecordSummary`.

## Atividade 5: Limpar Estado Local Do Quadro Removido

Em `packages/core-local/src/services/client-state.service.ts`, remova a lógica
exclusiva do reset do último prontuário da visão geral:

```text
LEGACY_OVERVIEW_LAST_RECORD_STORAGE_KEY
OVERVIEW_RECORD_RESET_ONCE_KEY
shouldResetOverviewLastRecordOnce
```

`clearClientStateAfterDatabaseImport` deve continuar existindo e limpar apenas
o estado local que permanece válido para o app, como
`RECENT_SEARCH_STORAGE_KEY`.

## Atividade 6: Atualizar Textos

Em `packages/core-local/src/i18n/pt-BR.ts`, atualize `home.description` para não
citar o último prontuário editado.

Remova as chaves que pertenciam somente ao quadro removido:

```text
home.currentRecord
home.emptyTitle
home.emptyDescription
```

Faça o equivalente em `packages/core-local/src/i18n/en-US.ts`.

## Atividade 7: Verificações

Rode:

```sh
rg -n "getLastEditedRecord|CurrentRecordSummary|shouldResetOverviewLastRecordOnce|OVERVIEW_RECORD_RESET_ONCE_KEY|LEGACY_OVERVIEW_LAST_RECORD_STORAGE_KEY" apps/vet-app packages
rg -n "home\\.currentRecord|home\\.emptyTitle|home\\.emptyDescription|dashboard\\.record|clinic\\.dashboard\\?\\.record" apps/vet-app packages
npm run check
npm run test:run
npm run build
cargo check --workspace
git diff --check
git status --short
```

O primeiro e o segundo `rg` não devem retornar referências ativas ao recurso
removido.

## Critério De Conclusão

A etapa está pronta quando:

- a visão geral não mostra mais o quadro de último prontuário editado;
- `loadDashboard` não consulta mais o último prontuário;
- `ClinicDashboard` não possui mais `record`;
- `getLastEditedRecord` foi removido;
- `CurrentRecordSummary` foi removido;
- os textos da home não citam mais o último prontuário editado;
- `current-record.read-model.ts` ainda fornece `getMedicalRecordDetails`;
- rotas de detalhe de prontuário continuam funcionando;
- a página do pet não foi alterada por esta etapa;
- todos os checks finais passam.
