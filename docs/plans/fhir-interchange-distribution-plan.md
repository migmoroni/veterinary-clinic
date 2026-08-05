# Plano De Intercambio FHIR Via Distribution

Atualizado em 2026-08-04.

Este plano descreve uma etapa posterior a
[Plano De Refatoracao De Prontuarios Para Timeline Clinica](medical-records-timeline-refactor.md).

O objetivo e adicionar FHIR como formato geral de importacao/exportacao do
software, dentro do sistema Rust de `distribution`, assim como o formato CSV.
FHIR entra como camada de traducao de interoperabilidade, lendo e gravando o
schema canonico do app.

## Fronteira

`distribution` e o dono do fluxo de entrada e saida:

```text
src-tauri/src/distribution/
  fhir/
    exporter.rs
    importer.rs
    mapper.rs
    bundle.rs
```

No workspace modular futuro:

```text
packages/core-rust/src/distribution/fhir/
```

Os modulos de negocio continuam donos das regras e tabelas canonicas. A camada
FHIR apenas traduz entre essas estruturas internas e recursos FHIR.

## Escopo

O formato FHIR deve ser geral para o software:

- cadastro do pet e contexto do tutor/profissional quando necessario;
- prontuarios, atendimentos, blocos clinicos e historico longitudinal;
- medicoes, notas clinicas, medicamentos, prescricoes, tratamentos,
  procedimentos, exames, imagens diagnosticas, anexos e documentos;
- dados auxiliares exigidos para que o pacote FHIR seja compreensivel fora do
  app.

O escopo inicial pode exportar/importar apenas o recorte clinico necessario, mas
a arquitetura do formato deve ser geral, no mesmo nivel de responsabilidade do
CSV dentro de `distribution`.

## Exportacao

Fluxo esperado:

1. Receber filtros da UI, como pet, periodo, tipo de dado ou escopo completo.
2. Abrir snapshot consistente dos bancos pelo fluxo de `distribution`.
3. Ler dados canonicos do app.
4. Traduzir para recursos FHIR.
5. Montar `Bundle` e arquivos associados.
6. Gerar pacote exportavel.

## Importacao

Fluxo esperado:

1. Receber pacote ou arquivo FHIR.
2. Validar estrutura, versao, recursos e referencias internas.
3. Resolver vinculos com entidades locais ou exigir decisao da UI.
4. Traduzir recursos FHIR para o schema canonico do app.
5. Inserir ou atualizar dados conforme politica definida pelo fluxo.
6. Retornar relatorio de importacao, conflitos e itens ignorados.

## Camada De Traducao

A traducao deve ficar isolada em `distribution/fhir/mapper.rs`.

Ela deve conhecer:

- schema canonico local;
- recursos FHIR suportados;
- mapeamento de IDs internos para referencias FHIR;
- datas clinicas efetivas;
- arquivos no CAS;
- extensoes locais quando o FHIR nao representar diretamente um dado do app.

## Recursos Iniciais Esperados

O conjunto inicial deve priorizar:

```text
Patient
RelatedPerson
Practitioner
Encounter
Observation
ClinicalImpression
MedicationRequest
MedicationAdministration
MedicationStatement
Immunization
Procedure
DiagnosticReport
ImagingStudy
DocumentReference
CarePlan
PlanDefinition
Bundle
```

## Ordem De Implementacao

1. Concluir a refatoracao de `medical_records`.
2. Definir contrato de UI para exportar/importar FHIR.
3. Criar submodulo `distribution/fhir`.
4. Implementar exportador com um recorte pequeno e validavel.
5. Implementar importador com relatorio de conflitos.
6. Ampliar recursos suportados conforme necessidade real.
7. Adicionar testes de ida e volta entre schema canonico e FHIR.

## Criterios De Aceite

- FHIR e uma opcao de import/export geral em `distribution`.
- O app continua usando apenas o schema canonico internamente.
- Exportar FHIR nao exige exportar o pacote nativo completo.
- Importar FHIR nao substitui a base inteira.
- O fluxo reporta conflitos, vinculos pendentes e recursos nao suportados.
- O pacote exportado e validavel e reimportavel no proprio app.
