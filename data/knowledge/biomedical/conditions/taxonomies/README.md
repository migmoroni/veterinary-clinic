# Taxonomias De Condições Clínicas

Este diretório documenta os vocabulários de condições clínicas. Os textos deste
README orientam a autoria; os `_entity.json` continuam sendo a fonte executável
de chaves, hierarquia, labels e ordem.

## `type`: natureza da condição

[`types/_entity.json`](./types/_entity.json) organiza condições em quatro
pilares. Cada condição referencia exatamente um termo por `typeTermKey`.

- `disease`: processo patológico ativo com causa e mecanismo definidos. Abrange
  doenças infecciosas e parasitárias, neoplásicas, imunes e inflamatórias,
  sistêmicas e metabólicas, genéticas e do desenvolvimento.
- `syndrome`: conjunto de sinais clínicos que pode possuir múltiplas etiologias,
  incluindo emergências agudas, falhas obstrutivas e desregulações
  neuroendócrinas.
- `disorder`: disfunção funcional geralmente crônica, sem exigir patogenia
  destrutiva ativa; inclui alterações comportamentais, sensoriais, neurológicas,
  estruturais e degenerativas.
- `injury`: dano agudo causado por força externa, ambiente, agente tóxico ou
  procedimento; inclui trauma mecânico, lesão física, envenenamento e complicação
  iatrogênica ou cirúrgica.

A escolha deve representar a natureza clínica, não apenas o sistema corporal
afetado. O termo mais específico aplicável é a referência autoral.

## `classification`: risco e vigilância

[`classifications/_entity.json`](./classifications/_entity.json) possui dois
eixos independentes. Uma condição pode referenciar zero ou mais termos por
`classificationTermKeys`.

`zoonoticRisk` descreve o potencial de transmissão ou dano humano:

- `none`: nenhum risco conhecido;
- `low`: risco raro ou excepcional;
- `moderate`: transmissível, mas em geral autolimitado;
- `high`: risco sistêmico, grave ou potencialmente fatal.

`notificationRequirement` descreve a obrigação de comunicação sanitária:

- `none`: não exige notificação;
- `periodic`: comunicação periódica para monitoramento;
- `compulsory`: notificação compulsória de vigilância;
- `immediate`: alerta imediato ou emergência sanitária.

Esses valores descrevem o conhecimento canônico. Obrigações legais concretas
dependem da jurisdição e não devem ser inferidas somente pelo diretório ou pela
label traduzida.
