# Taxonomias De Fabricantes

Este diretório documenta os vocabulários de fabricantes e organizações
responsáveis por itens de catálogo. O README orienta a autoria; os manifestos
`_entity.json` continuam sendo o contrato executável.

## `type`: natureza do estabelecimento

[`types/_entity.json`](./types/_entity.json) separa o segmento principal e o
tipo de produção. Cada fabricante referencia exatamente um termo por
`typeTermKey`.

- `humanIndustrial`: indústria de medicamentos humanos; distingue laboratório
  industrial de farmácia de manipulação humana.
- `veterinaryIndustrial`: indústria dedicada a medicamentos veterinários;
  distingue laboratório industrial de manipulação veterinária.
- `simplifiedRegister`: fabricantes de itens sob registro simplificado ou
  isenção, separados em nutrição, higiene e dispositivos médicos.

Laboratório industrial representa produção em escala. Farmácia de manipulação
representa produção personalizada sob fórmula magistral.

## `classification`: regulação, compra e qualidade

[`classifications/_entity.json`](./classifications/_entity.json) oferece três
eixos independentes. Um fabricante pode referenciar zero ou mais termos por
`classificationTermKeys`.

`regulatoryStatus` descreve o enquadramento:

- `veterinaryIndustrial`: regulação por autoridade agrícola para uso animal;
- `humanIndustrial`: regulação sanitária humana e eventual uso veterinário
  off-label;
- `licensedCompounding`: manipulação licenciada de fórmulas magistrais;
- `simplifiedRegister`: registro simplificado ou isento para categorias
  aplicáveis.

`commercialFlow` descreve como ocorre o fornecimento:

- `directSales`: faturamento e envio direto do fabricante;
- `distributorNetwork`: aquisição por distribuidor autorizado;
- `magistralPrescription`: produção sob prescrição em farmácia parceira;
- `specialImport`: importação autorizada com trâmites especiais.

`qualityStandard` descreve a base de qualidade:

- `gmpCertified`: certificação ativa de BPF/GMP;
- `standardIndustrial`: padrão industrial regulatório do país de origem;
- `magistralQuality`: controle magistral por conselhos e autoridades aplicáveis;
- `nonApplicable`: eixo inaplicável ao tipo de item produzido.

Tipo e classificação não são equivalentes: o primeiro identifica a natureza do
fabricante; os eixos descrevem seu contexto regulatório e operacional.
