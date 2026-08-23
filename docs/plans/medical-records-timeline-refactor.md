# Plano De Refatoracao De Prontuarios Para Timeline Clinica

Atualizado em 2026-08-04.

Este plano descreve a etapa que deve acontecer depois da refatoracao do monolito
atual para o workspace modular. O objetivo e reorganizar o dominio de
`medical_records` ja dentro da fronteira modular correta, com tratamentos,
prescricoes, exames e demais eventos clinicos vivendo como partes do historico
longitudinal do pet.

## Objetivo

Trocar o modelo atual de varios prontuarios soltos por pet por uma pasta clinica
unica por animal, exibida como linha do tempo.

Hoje:

```text
pet
  medical_records[]
    title
    description livre
    admitted_at
    discharged_at
```

Alvo:

```text
pet
  medical_record              1 pasta mestre por animal
    encounters[]              varios atendimentos/sessoes clinicas
      blocks[]                blocos praticos do app com tabelas de dominio
```

Na UI, o veterinario deixa de abrir uma lista de documentos isolados e passa a
ver o historico clinico longitudinal do pet em cards ordenados por data/periodo.
Cada card representa um atendimento, rotina, urgencia, vacinacao, cirurgia,
internacao ou retorno. O `ui_template` do atendimento define secoes como SOAP,
DAP ou texto livre, e os blocos vivem dentro dessas secoes.

## Por Que Fazer Depois Do Workspace Modular

A fronteira de modulo ja esta definida: `medical_records` e o modulo clinico
maior. Tratamentos, vacinas, antiparasitarios, prescricoes, exames, procedimentos
e anexos vivem dentro dele como blocos e tabelas de dominio.

No alvo modular, `medical_records` sera o modulo clinico maior:

```text
medical_records/
  record/
  encounters/
  blocks/
  timeline/
  clinical_notes/
  measurements/
  medications/
  prescriptions/
  treatments/
    plans/
    protocols/
    events/
  procedures/
  exams/
    requests/
    reports/
    imaging/
    files/
  attachments/
```

A extracao modular deve criar primeiro essa casa, ainda de forma conservadora.
Depois disso, esta refatoracao redesenha o interior do modulo: schema, services,
repositorios, UI de timeline, tratamentos e conversao de dados.

## Termos Internos

`medical_records` continua sendo o nome do modulo de negocio, porque ele
representa a pasta clinica longitudinal do pet no produto. Dentro dele, os nomes
dos subdominios devem favorecer a pratica do app.

| Subdominio | Papel interno |
| --- | --- |
| `record/` | aggregate local da pasta clinica unica do pet; materializa `medical_records`. |
| `encounters/` | atendimentos/sessoes clinicas; materializa `medical_record_encounters`. |
| `blocks/` | envelope generico dos blocos na timeline; materializa `medical_record_blocks`. |
| `timeline/` | read model visual do app; compoe encounters e blocos em ordem cronologica. |
| `clinical_notes/` | notas clinicas, texto livre, avaliacao narrativa e evolucao. |
| `measurements/` | peso, temperatura, escore, sinais vitais, dor, glicemia e achados objetivos. |
| `medications/` | medicacao pontual aplicada, administrada, dispensada ou registrada no atendimento. |
| `prescriptions/` | receita/prescricao como documento clinico entregue ao tutor, com itens e orientacoes. |
| `treatments/` | planos, protocolos e eventos longitudinais, como vacina, antiparasitario e tratamento continuo. |
| `procedures/` | procedimentos, condutas, internacao, atos clinicos e cirurgicos pontuais. |
| `exams/` | solicitacao, laudo, resultado, imagem diagnostica, DICOM e arquivos diagnosticos do prontuario. |
| `attachments/` | midias adicionais livres anexadas pelo veterinario ao atendimento. |

## Escopo De Produto

A linha do tempo deve suportar:

- notas clinicas, texto livre e evolucao em `clinical_notes`;
- atendimentos em `encounters`;
- blocos clinicos ordenados em `blocks`;
- medicoes continuas em `measurements`, como peso, temperatura, frequencia
  cardiaca e escore;
- medicamentos pontuais em `medications`;
- prescricoes e receitas em `prescriptions`;
- vacinas, antiparasitarios e tratamentos continuos em `treatments`;
- procedimentos, internacao e condutas em `procedures`;
- exames, laudos, resultados, DICOM e referencias diagnosticas em `exams`;
- anexos livres em `attachments`;
- agrupamento por data ou periodo em `timeline`.

`exams/` representa a presenca, solicitacao e visualizacao do exame, laudo,
imagem ou arquivo diagnostico no historico clinico. Geracao, emissao,
processamento e estruturacao diagnostica pertencem ao modulo futuro
`diagnostics`, que tambem servira o futuro `lab-app`.

## Modelo De Dados Alvo

### 1. Pasta Mestre Do Pet

Uma linha por pet. Esta tabela deixa de representar um prontuario individual e
passa a representar a pasta clinica longitudinal do animal.

```sql
CREATE TABLE IF NOT EXISTS medical_records (
    id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
    pet_id TEXT NOT NULL UNIQUE CHECK(${uuidTextCheck('pet_id')}),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by TEXT,
    removed_at TEXT,
    FOREIGN KEY (pet_id) REFERENCES pets(id)
);
```

### 2. Atendimento Clinico

Cada atendimento/sessao aparece como um card da timeline.

```sql
CREATE TABLE IF NOT EXISTS medical_record_encounters (
    id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
    record_id TEXT NOT NULL CHECK(${uuidTextCheck('record_id')}),
    veterinarian_id TEXT NOT NULL CHECK(${uuidTextCheck('veterinarian_id')}),
    title TEXT CHECK(${optionalTextCheck('title', FIELD_LIMITS.medicalRecordTitle)}),
    visit_type TEXT NOT NULL CHECK(visit_type IN ('routine', 'general', 'emergency', 'recheck', 'vaccination', 'surgery', 'internment')),
    ui_template TEXT NOT NULL CHECK(ui_template IN ('soap', 'dap', 'template_free')),
    admitted_at TEXT CHECK(${optionalTextCheck('admitted_at', FIELD_LIMITS.isoDate)}),
    discharged_at TEXT CHECK(${optionalTextCheck('discharged_at', FIELD_LIMITS.isoDate)}),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by TEXT,
    removed_at TEXT,
    FOREIGN KEY (record_id) REFERENCES medical_records(id) ON DELETE CASCADE,
    CHECK(discharged_at IS NULL OR admitted_at IS NULL OR discharged_at >= admitted_at)
);
```

Templates suportados inicialmente:

| `ui_template` | Secoes |
| --- | --- |
| `soap` | 0 Subjetivo, 1 Objetivo, 2 Avaliacao, 3 Plano |
| `dap` | 0 Dados, 1 Avaliacao, 2 Plano |
| `template_free` | 0 Secao livre, ou `section_key` nulo quando nao houver secao visual |

`visit_type` controla o contexto do atendimento e a forma de destacar o card na
timeline. Exemplo: `emergency` pode usar estado visual de urgencia; `routine`
pode usar estado discreto; `vaccination` pode abrir uma composicao mais direta
com blocos de imunizacao.

`ui_template` define o metodo visual do atendimento. `block_type` define o tipo
de conteudo inserido dentro de uma secao desse metodo.

### 3. Blocos Clinicos Do App

Cada bloco representa uma unidade de interacao clinica que o veterinario insere
no atendimento. `medical_record_blocks` e o envelope generico da timeline: ele
define onde o bloco aparece, qual e seu tipo e em que ordem deve ser renderizado.

O conteudo clinico nao fica em JSON generico. Cada `block_type` tem tabelas
proprias, ligadas por `block_id` para `medical_record_blocks.id`.

```sql
CREATE TABLE IF NOT EXISTS medical_record_blocks (
    id TEXT PRIMARY KEY CHECK(${uuidTextCheck('id')}),
    encounter_id TEXT NOT NULL CHECK(${uuidTextCheck('encounter_id')}),
    section_key INTEGER CHECK(section_key IS NULL OR section_key >= 0),
    block_type TEXT NOT NULL CHECK(block_type IN (
        'clinical_note',
        'measurements',
        'medication',
        'prescription',
        'treatment',
        'procedure',
        'exam',
        'attachment'
    )),
    block_version INTEGER NOT NULL DEFAULT 1 CHECK(block_version >= 1),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_by TEXT,
    removed_at TEXT,
    FOREIGN KEY (encounter_id) REFERENCES medical_record_encounters(id) ON DELETE CASCADE
);
```

`section_key` define a caixa/aba visual onde o bloco aparece.

`sort_order` define a ordem dos blocos dentro da mesma caixa/aba.

Cada tabela especifica deve ter `block_id` como FK obrigatoria. Quando o bloco
for naturalmente 1:1, `block_id` pode ser a propria chave primaria da tabela.
Quando o bloco tiver itens internos, como medicoes ou itens de receita, usar uma
tabela principal do bloco e tabelas filhas.

## Tipos De Bloco

| `block_type` | Uso no app | Tabelas principais |
| --- | --- | --- |
| `clinical_note` | nota clinica em texto livre dentro de uma secao do atendimento. | `medical_record_clinical_notes` |
| `measurements` | peso, temperatura, frequencia cardiaca, escore, achados objetivos e monitoramento. | `medical_record_measurements` |
| `medication` | medicacao pontual aplicada, administrada, dispensada ou registrada no atendimento. | `medical_record_medications` |
| `prescription` | receita/prescricao como documento clinico, com um ou varios itens. | `medical_record_prescriptions`, `medical_record_prescription_items` |
| `treatment` | tratamento planejado, protocolar, recorrente ou longitudinal, incluindo plano vacinal, antiparasitario, terapia continua e retornos. | `medical_record_treatments`, `medical_record_treatment_plans`, `medical_record_treatment_protocols`, `medical_record_treatment_events` |
| `procedure` | procedimentos, internacao, condutas e atos clinicos/cirurgicos pontuais. | `medical_record_procedures` |
| `exam` | solicitacao, visualizacao ou vinculacao de exame/laudo/imagem diagnostica ao atendimento, incluindo DICOM. | `medical_record_exams`, `medical_record_exam_requests`, `medical_record_exam_reports`, `medical_record_exam_imaging`, `medical_record_exam_files` |
| `attachment` | midias adicionais livres que o veterinario quiser anexar ao atendimento, como foto, imagem comum, PDF ou arquivo externo sem estrutura diagnostica. | `medical_record_attachments` |

## Semantica Dos Blocos

### `clinical_note`

Bloco de nota clinica em texto livre. 

O texto principal fica em `medical_record_clinical_notes`. Campos recomendados:
`block_id`, `title`, `body`, `note_format`, `clinical_status`, `noted_at` e
referencias opcionais para medidas ou achados citados.

Exemplo:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "clinical_note",
    "sectionKey": 0,
    "sortOrder": 0
  },
  "clinicalNote": {
    "blockId": "<block_id>",
    "title": "Evolucao clinica",
    "body": "Animal alerta. Tutor relata melhora parcial desde o ultimo atendimento.",
    "noteFormat": "plain_text",
    "notedAt": "2026-08-03T09:15:00Z"
  }
}
```

### `measurements`

Bloco para medicoes, sinais vitais e achados objetivos. Ele deve suportar pesos,
temperatura, frequencia cardiaca, frequencia respiratoria, escore corporal,
pressao, dor, glicemia e outros dados observaveis.

Cada medicao fica em `medical_record_measurements`, com `measurement_type`,
valor, unidade, metodo, data efetiva e observacao opcional. A UI pode renderizar
cartoes resumidos de peso/temperatura/score lendo essa tabela.

Exemplo:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "measurements",
    "sectionKey": 1,
    "sortOrder": 0
  },
  "measurements": [
    {
      "id": "<measurement_id>",
      "blockId": "<block_id>",
      "measurementType": "weight",
      "valueNumber": 32.0,
      "unit": "kg",
      "measuredAt": "2026-08-03T09:15:00Z"
    },
    {
      "id": "<measurement_id>",
      "blockId": "<block_id>",
      "measurementType": "pain_score",
      "valueNumber": 5,
      "unit": "/9",
      "measuredAt": "2026-08-03T09:15:00Z"
    }
  ]
}
```

### `medication`

Bloco para medicacao pontual do atendimento. Ele cobre aplicacoes unicas,
administracoes, dispensacao ou registro clinico de medicamento usado naquele
momento. Receitas e prescricoes como documento para o tutor ficam no bloco
`prescription`.

`medical_record_medications` deve ter um campo operacional como
`medication_mode`, por exemplo `administration`, `dispensing` ou
`historical_record`. Referencias ao catalogo de produtos, principio ativo, dose,
via, lote, fabricante, responsavel e momento clinico ficam nessa tabela.

Exemplo de aplicacao pontual:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "medication",
    "sectionKey": 3,
    "sortOrder": 0
  },
  "medication": {
    "id": "<medication_id>",
    "blockId": "<block_id>",
    "medicationMode": "administration",
    "productId": "<product_id>",
    "activeIngredientId": "<active_ingredient_id>",
    "doseText": "1 mg/kg",
    "route": "SC",
    "administeredAt": "2026-08-03T09:20:00Z"
  }
}
```

### `prescription`

Bloco para receita ou prescricao como documento clinico. Ele pode ter varios
itens, posologia, duracao, orientacoes ao tutor, validade, assinatura,
identificacao do veterinario e versao imprimivel/exportavel.

`medical_record_prescriptions` representa o cabecalho da receita.
`medical_record_prescription_items` representa os itens prescritos.

Exemplo:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "prescription",
    "sectionKey": 3,
    "sortOrder": 1
  },
  "prescription": {
    "id": "<prescription_id>",
    "blockId": "<block_id>",
    "status": "issued",
    "issuedAt": "2026-08-03T09:25:00Z",
    "validUntil": "2026-08-10",
    "generalInstructions": "Administrar conforme orientacao clinica."
  },
  "items": [
    {
      "id": "<prescription_item_id>",
      "prescriptionId": "<prescription_id>",
      "productId": "<product_id>",
      "doseText": "1 gota/kg",
      "frequencyText": "A cada 8 horas",
      "durationText": "3 dias"
    }
  ]
}
```

### `treatment`

Bloco para tratamento planejado, protocolar, recorrente ou longitudinal. Ele
coordena plano, protocolo e eventos concretos do pet, incluindo plano vacinal,
antiparasitario, terapia continua, tratamento cronico, reforcos, recorrencias e
retornos.

O bloco usa tabelas proprias para plano, protocolo e eventos:
`medical_record_treatments`, `medical_record_treatment_plans`,
`medical_record_treatment_protocols` e `medical_record_treatment_events`. O campo
`treatment_kind` diferencia `immunization`, `antiparasitic`,
`continuous_medication`, `chronic_care` e outros tipos praticos do produto.

O quadro de tratamento deve abrir o plano atual do pet quando existir, permitir
criar ou alterar o plano, aplicar uma dose/evento e calcular proxima data.

Exemplo de plano vacinal com aplicacao:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "treatment",
    "sectionKey": 3,
    "sortOrder": 2
  },
  "treatment": {
    "id": "<treatment_id>",
    "blockId": "<block_id>",
    "treatmentKind": "immunization",
    "status": "active"
  },
  "plan": {
    "id": "<treatment_plan_id>",
    "treatmentId": "<treatment_id>",
    "protocolId": "<treatment_protocol_id>",
    "label": "Plano vacinal anual",
    "nextDueAt": "2027-08-03"
  },
  "event": {
    "id": "<treatment_event_id>",
    "treatmentId": "<treatment_id>",
    "eventKind": "immunization",
    "productId": "<product_id>",
    "lotNumber": "L123",
    "performedAt": "2026-08-03T09:30:00Z"
  }
}
```

Exemplo de antiparasitario em plano recorrente:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "treatment",
    "sectionKey": 3,
    "sortOrder": 2
  },
  "treatment": {
    "id": "<treatment_id>",
    "blockId": "<block_id>",
    "treatmentKind": "antiparasitic",
    "status": "active"
  },
  "plan": {
    "id": "<treatment_plan_id>",
    "treatmentId": "<treatment_id>",
    "label": "Controle antiparasitario",
    "nextDueAt": "2026-11-03"
  },
  "event": {
    "id": "<treatment_event_id>",
    "treatmentId": "<treatment_id>",
    "eventKind": "medication_administration",
    "productId": "<product_id>",
    "doseText": "Dose unica conforme peso",
    "performedAt": "2026-08-03T09:35:00Z"
  }
}
```

### `procedure`

Bloco para procedimentos pontuais, internacao, condutas clinicas e atos
cirurgicos. O conteudo fica em `medical_record_procedures`, com status, data,
performer, motivo, local, materiais, observacoes e resultado quando aplicavel.

Procedimentos que fazem parte de um tratamento longitudinal podem ser eventos do
bloco `treatment`. O bloco `procedure` fica para atos pontuais registrados
diretamente no atendimento.

Exemplo:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "procedure",
    "sectionKey": 3,
    "sortOrder": 3
  },
  "procedure": {
    "id": "<procedure_id>",
    "blockId": "<block_id>",
    "procedureType": "wound_dressing",
    "label": "Curativo de ferida",
    "status": "completed",
    "performedAt": "2026-08-03T09:40:00Z",
    "notes": "Limpeza, antissepsia e cobertura oclusiva."
  }
}
```

### `exam`

Bloco para solicitar, vincular, visualizar ou registrar exames, laudos e imagens
diagnosticas no atendimento. Ele e singular no `block_type` porque, para a UI do
prontuario, o veterinario escolhe "exame" como bloco pratico unico. Dentro dele
podem existir solicitacao, resultado, laudo, imagem, DICOM e arquivos
diagnosticos.

Este bloco pode consumir contratos publicos do modulo `diagnostics` para abrir
arquivos, estruturar metadados ou visualizar laudos/imagens. Na timeline, ele
deve renderizar o estado do exame, o resultado quando existir e os links de
visualizacao.

Exemplo de solicitacao:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "exam",
    "sectionKey": 3,
    "sortOrder": 4
  },
  "exam": {
    "id": "<exam_id>",
    "blockId": "<block_id>",
    "examType": "radiography",
    "label": "Raio-X de quadril",
    "status": "requested"
  },
  "request": {
    "id": "<exam_request_id>",
    "examId": "<exam_id>",
    "requestedAt": "2026-08-03T09:45:00Z",
    "clinicalQuestion": "Avaliar articulacao coxofemoral."
  }
}
```

Exemplo de laudo com imagem diagnostica:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "exam",
    "sectionKey": 3,
    "sortOrder": 4
  },
  "exam": {
    "id": "<exam_id>",
    "blockId": "<block_id>",
    "examType": "radiography",
    "label": "Raio-X de quadril",
    "status": "final"
  },
  "report": {
    "id": "<exam_report_id>",
    "examId": "<exam_id>",
    "status": "final",
    "reportedAt": "2026-08-03T10:30:00Z",
    "summary": "Laudo associado ao estudo de imagem."
  },
  "imaging": [
    {
      "id": "<exam_imaging_id>",
      "examId": "<exam_id>",
      "viewer": "dicom",
      "studyUid": "<dicom_study_uid>",
      "seriesUid": "<dicom_series_uid>",
      "storageUri": "cas://<blob_id>"
    }
  ]
}
```

### `attachment`

Bloco para midias adicionais livres anexadas pelo veterinario ao atendimento.
Exemplos: foto comum, PDF, documento externo, imagem de pele/ferida, video curto,
arquivo complementar ou comprovante.

O conteudo fica em `medical_record_attachments`, apontando para o arquivo no CAS
e guardando metadados como nome, tipo MIME, tamanho, hash, legenda, categoria e
data. Imagens diagnosticas e DICOM ficam no bloco `exam`; `attachment` e apenas
para midias adicionais livres.

Exemplo:

```json
{
  "block": {
    "id": "<block_id>",
    "blockType": "attachment",
    "sectionKey": 0,
    "sortOrder": 1
  },
  "attachment": {
    "id": "<attachment_id>",
    "blockId": "<block_id>",
    "caption": "Foto da lesao cutanea",
    "contentType": "image/jpeg",
    "fileName": "foto-lesao.jpg",
    "storageUri": "cas://<blob_id>",
    "hash": "<sha256>"
  }
}
```

## Persistencia Dos Blocos

Cada operacao que adiciona um bloco ao prontuario deve criar:

- uma linha em `medical_record_blocks`;
- uma ou mais linhas nas tabelas especificas daquele `block_type`;
- timestamps, autoria e soft delete coerentes entre envelope e tabelas filhas;
- dados estruturados suficientes para reabrir o quadro do bloco sem depender de
  tradutores externos.

Snapshots de UI podem existir como read model reconstruivel, mas nao devem ser a
fonte de verdade clinica. A fonte de verdade fica nas tabelas de dominio.

## Plano Seguinte

Intercambio FHIR e um plano separado de `distribution`, geral para o software,
assim como o formato CSV. Ele deve acontecer depois desta refatoracao:
[Plano De Intercambio FHIR Via Distribution](fhir-interchange-distribution-plan.md).

## Refatoracao Do Fluxo De Treatments

O fluxo de tratamentos deve ser operado pelo bloco `treatment` dentro de
`medical_records`. A criacao clinica pelo veterinario parte do atendimento e
grava um `medical_record_blocks` com `block_type = 'treatment'`, acompanhado das
tabelas de tratamento correspondentes.

Mapeamento principal:

| Dado/fluxo | Destino em `medical_records` |
| --- | --- |
| protocolos vacinais e antiparasitarios | `medical_record_treatment_protocols` |
| plano individual do pet | `medical_record_treatment_plans` |
| vacina aplicada | `medical_record_treatment_events` com `event_kind = 'immunization'` |
| antiparasitario aplicado | `medical_record_treatment_events` com `event_kind = 'medication_administration'` |
| medicacao aplicada como parte de plano | `medical_record_treatment_events` com `event_kind = 'medication_administration'` |
| prescricao vinculada ao plano | bloco `prescription` relacionado ao plano ou evento de treatment |
| retorno/reforco calculado | `medical_record_treatment_plans` e read models de timeline |

O bloco `treatment` deve abrir um quadro unico para:

- selecionar ou criar plano do pet;
- escolher protocolo reutilizavel quando existir;
- registrar dose/aplicacao feita no atendimento;
- registrar lote, fabricante, validade, via, dose e produto;
- calcular proxima aplicacao/reforco/retorno;
- atualizar o plano vigente;
- renderizar o historico resumido do plano dentro da timeline.

Na criacao do atendimento, vacinas e antiparasitarios sao especializacoes do
bloco `treatment`, com eventos internos diferentes. Medicacoes pontuais
continuam no bloco `medication`. Receitas e documentos de prescricao ficam no
bloco `prescription`.

Analytics de vacinas, antiparasitarios e tratamentos devem consultar as
projecoes/read models gerados a partir de `medical_record_treatment_plans`,
`medical_record_treatment_protocols`, `medical_record_treatment_events` e
`medical_record_blocks` do tipo `treatment`.

## Timeline

`timeline/` e uma projecao de leitura do app, montada a partir de `encounters`
e `blocks`.

A tela de historico deve ordenar atendimentos por:

1. `COALESCE(admitted_at, updated_at, created_at)` descendente;
2. `id` descendente para estabilidade.

Dentro de cada atendimento:

1. agrupar blocos por `section_key`;
2. ordenar por `section_key`, depois `sort_order`, depois `created_at`, depois
   `id`;
3. renderizar secoes conforme `ui_template`.

O menu lateral de anos/meses deve ser derivado dos encontros, nao dos blocos.

## Mudanca De Experiencia

Remover como experiencia principal:

- painel que lista varios prontuarios separados;
- criacao de documento vazio para entao navegar para `/records/[id]`;
- fluxo onde o texto livre do prontuario e a entidade inteira do atendimento.

Adicionar como experiencia principal:

- painel "Historico clinico" no perfil do pet;
- card de atendimento diretamente na timeline;
- criacao de atendimento com data, tipo de visita e template;
- editor do encontro dentro da timeline ou em rota de detalhe do encounter;
- blocos adicionaveis por secao: monitoramento, profilaxia/tratamento, exame,
  procedimento, prescricao e texto.

Rotas podem continuar simples durante a transicao:

| Antes | Depois recomendado |
| --- | --- |
| `/pets/[petId]`, painel `records` | `/pets/[petId]`, painel `timeline` |
| `/records/[id]` | rota de detalhe de encounter ou redirect para o encounter na timeline |

## Arquivos Impactados

Dominio:

```text
src/lib/domain/medical-record/medical-record.ts
src/lib/domain/treatment/**
```

Persistencia:

```text
src/lib/persistence/sqlite/migrations.ts
src/lib/persistence/repositories/medical-record.repository.ts
src/lib/persistence/repositories/treatment.repository.ts
src/lib/persistence/repositories/treatment-protocol.repository.ts
src/lib/persistence/repositories/treatment-analytics.repository.ts
```

Servicos:

```text
src/lib/services/record.service.ts
src/lib/services/pet.service.ts
src/lib/services/treatment.service.ts
src/lib/services/treatment-protocol.service.ts
src/lib/services/treatment-analytics.service.ts
```

UI:

```text
src/routes/pets/[petId]/+page.svelte
src/routes/records/[id]/+page.svelte
src/lib/components/records/**
src/lib/components/treatment/**
src/lib/components/pet/TreatmentPanel.svelte
src/lib/components/pet/TreatmentDueBadge.svelte
```

Adocao externa:

```text
legacy-to-sqlite/adopt-version-db-p2.mjs
legacy-to-sqlite/package.json
```

## Migracao De Dados

O runtime do app trabalha apenas com a estrutura atual/canonica.

A conversao de dados existentes deve acontecer fora do app, por
`legacy-to-sqlite/adopt-version-db-p2.mjs`.

Esse script deve rodar depois de `adopt-version-db.mjs`, para evitar transformar
o script principal em um arquivo ainda maior.

Fluxo esperado:

```text
adopt-version-db.mjs
  gera build/veterinary_clinic_user.db no formato atual base

adopt-version-db-p2.mjs
  abre build/veterinary_clinic_user.db
  converte a estrutura de entrada para medical_records + encounters + blocks
  cria as linhas correspondentes nas tabelas especificas dos blocos
  atualiza indices/metadados de schema
  valida integridade
  recria pacote nativo importavel se necessario
```

### Estrategia Do `adopt-version-db-p2.mjs`

1. Abrir `build/veterinary_clinic_user.db` por padrao.
2. Verificar que a tabela de entrada `medical_records` tem colunas:
   `id`, `pet_id`, `title`, `description`, `admitted_at`, `discharged_at`,
   `created_at`, `updated_at`, `updated_by`, `removed_at`.
3. Verificar tabelas de destino ou usar `--force` para reconstruir.
4. Renomear a tabela de entrada temporariamente dentro da transacao.
5. Criar a nova `medical_records`.
6. Criar `medical_record_encounters`.
7. Criar `medical_record_blocks`.
8. Criar as tabelas especificas dos blocos, com prioridade para
   `medical_record_clinical_notes`.
9. Para cada pet com prontuario na estrutura de entrada, criar uma pasta mestre
   unica em `medical_records`.
10. Para cada linha de entrada, criar um encounter:
   - `record_id`: pasta mestre do pet;
   - `veterinarian_id`: primeiro `veterinarian_profiles.id` disponivel;
   - `title`: titulo original;
   - `visit_type`: `general`, salvo quando houver regra clara para inferir;
   - `ui_template`: `template_free`;
   - `admitted_at` e `discharged_at`: valores originais;
   - timestamps e `removed_at`: preservar quando possivel.
11. Para cada `description` original nao vazia, criar um bloco:
   - `section_key`: 0;
   - `block_type`: `clinical_note`;
   - `block_version`: 1;
   - `sort_order`: 0;
   - uma linha em `medical_record_clinical_notes`, com `block_id`, `title`,
     `body`, `note_format = 'plain_text'` e `noted_at`.
12. Remover a tabela temporaria de entrada ao final.
13. Criar indices.
14. Rodar `PRAGMA integrity_check`.
15. Rodar `PRAGMA foreign_key_check`.
16. Atualizar `PRAGMA user_version`, `schema_migrations` e
   `database_manifest.schema_version` conforme a versao canonica decidida.
17. Recriar o pacote `veterinary_clinic_user_import.zip` se o fluxo de adocao
   final ainda depender dele.

Validar `veterinarian_profiles.id` antes da conversao. O script deve usar um
perfil existente ou criar um perfil tecnico minimo; `veterinarian_id` deve ser
um UUID real.

## Indices Recomendados

```sql
CREATE INDEX IF NOT EXISTS idx_medical_records_pet_id
  ON medical_records(pet_id);

CREATE INDEX IF NOT EXISTS idx_medical_records_removed_at
  ON medical_records(removed_at);

CREATE INDEX IF NOT EXISTS idx_medical_record_encounters_record_id
  ON medical_record_encounters(record_id);

CREATE INDEX IF NOT EXISTS idx_medical_record_encounters_veterinarian_id
  ON medical_record_encounters(veterinarian_id);

CREATE INDEX IF NOT EXISTS idx_medical_record_encounters_timeline
  ON medical_record_encounters(record_id, admitted_at DESC, updated_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_medical_record_encounters_removed_at
  ON medical_record_encounters(removed_at);

CREATE INDEX IF NOT EXISTS idx_medical_record_blocks_encounter_section
  ON medical_record_blocks(encounter_id, section_key, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_medical_record_blocks_type
  ON medical_record_blocks(block_type);

CREATE INDEX IF NOT EXISTS idx_medical_record_blocks_removed_at
  ON medical_record_blocks(removed_at);
```

Cada tabela especifica de bloco deve ter indice por `block_id`. Tabelas com
consultas por data clinica, como `medical_record_measurements`,
`medical_record_medications`, `medical_record_treatment_events`,
`medical_record_exam_requests` e `medical_record_exam_reports`, tambem devem ter
indices por data efetiva e status quando houver painel ou analytics.

## Ordem De Implementacao

1. Atualizar dominio TypeScript de `medical-record`.
2. Atualizar schema canonico em `migrations.ts` com `medical_records`,
   `medical_record_encounters`, `medical_record_blocks` e tabelas especificas de
   bloco.
3. Implementar repositorio de pasta mestre, encounters, blocks e tabelas filhas.
4. Adaptar `record.service.ts` para criar blocos por tabelas de dominio.
5. Adaptar `pet.service.ts` para carregar `timeline` em vez de lista solta de
   records.
6. Criar componentes de timeline em `src/lib/components/records`.
7. Adaptar `src/routes/pets/[petId]/+page.svelte` para mostrar a timeline.
8. Decidir se `/records/[id]` vira detalhe de encounter ou redireciona para a
   timeline.
9. Integrar tratamentos existentes nos blocos clinicos:
   - plano vacinal, antiparasitario e tratamentos continuos em blocos
     `treatment`;
   - vacinas aplicadas como eventos de `treatment`;
   - antiparasitarios aplicados como eventos de `treatment`;
   - medicamentos pontuais em blocos `medication`;
   - prescricoes e receitas em blocos `prescription`;
   - protocolos reutilizaveis em `medical_record_treatment_protocols`;
   - planos individuais do pet em `medical_record_treatment_plans`.
10. Criar `adopt-version-db-p2.mjs`.
11. Adicionar script em `legacy-to-sqlite/package.json`.
12. Validar adocao em banco real.

## Decisoes Que Precisam Ser Fechadas

1. `veterinarian_id` deve apontar para `veterinarian_profiles.id` com FK
   explicita ou permanecer apenas como UUID validado?
2. Quais campos minimos entram na primeira versao de cada tabela especifica de
   bloco?
3. `/records/[id]` deve sobreviver como rota de detalhe de encounter?
4. `CURRENT_SCHEMA_VERSION` deve virar uma nova versao inteira agora ou a base
   sera rebaselinada porque ainda estamos antes da versao publica que importa?
5. Quais snapshots/read models de timeline serao materializados e quais serao
   sempre calculados por consulta?

## Criterios De Aceite

- Cada pet tem no maximo uma linha ativa em `medical_records`.
- A tela do pet mostra historico clinico como timeline, nao como lista de
  prontuarios soltos.
- Um atendimento pode ter data unica ou periodo.
- Um atendimento pode usar `soap`, `dap` ou `template_free`.
- Blocos aparecem dentro da secao correta por `section_key`.
- Blocos dentro da mesma secao respeitam `sort_order`.
- Texto livre importado vira encounter `template_free` com bloco
  `clinical_note` e linha em `medical_record_clinical_notes`.
- Peso, sinais vitais e achados objetivos ficam em bloco `measurements` com
  linhas em `medical_record_measurements`.
- Medicacoes pontuais ficam em bloco `medication` com linha em
  `medical_record_medications`.
- Prescricoes e receitas ficam em bloco `prescription` com cabecalho e itens
  estruturados.
- Planos vacinais, antiparasitarios e tratamentos continuos ficam em bloco
  `treatment`, com planos, protocolos e eventos em tabelas proprias.
- Vacinas aplicadas dentro de `treatment` ficam como eventos estruturados de
  tratamento.
- Antiparasitarios e medicacoes aplicadas dentro de `treatment` ficam como
  eventos estruturados de tratamento.
- Exames e laudos ficam em bloco `exam`.
- Imagens diagnosticas e DICOM ficam em bloco `exam`, nas tabelas de imagem ou
  arquivos diagnosticos.
- Midias adicionais livres ficam em bloco `attachment`, sem misturar DICOM ou
  exames estruturados.
- Protocolos reutilizaveis ficam em tabelas de protocolo de tratamento; planos
  individuais ficam em tabelas de plano de tratamento.
- Dados existentes sao convertidos apenas por `adopt-version-db-p2.mjs`.
- O runtime do app usa somente a estrutura canonica de prontuarios.
- `npm run check`, `npm run test:run` e `npm run build` passam.
- `legacy-to-sqlite` valida o banco convertido com `integrity_check` e
  `foreign_key_check`.
