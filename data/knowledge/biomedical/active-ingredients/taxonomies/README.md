# Taxonomias De Princípios Ativos

Este diretório mantém os vocabulários controlados de princípios ativos. Os
READMEs orientam a autoria, mas não são entrada semântica do builder; IDs,
chaves, hierarquia, ordem e labels continuam definidos exclusivamente nos
respectivos `_entity.json`.

## `type`: mecanismo e natureza farmacológica

[`types/_entity.json`](./types/_entity.json) classifica a substância ou agente
farmacológico puro, independentemente dos produtos comerciais que o utilizam.
Cada princípio ativo referencia exatamente um termo por `typeTermKey`.

A árvore organiza classe farmacológica, subclasse e mecanismo ou tipo de ação.
As quinze raízes têm os seguintes sentidos editoriais:

- `antiInfective`: atua contra organismos invasores; separa antibacterianos,
  antifúngicos, antivirais e antiparasitários por mecanismo.
- `receptorModulator`: liga-se a receptores do hospedeiro como agonista,
  antagonista ou modulador alostérico.
- `enzymeModulator`: altera proteínas catalíticas por inibição, ativação ou
  reativação enzimática.
- `ionChannelModulator`: bloqueia ou abre canais transmembrana, como os de
  sódio, cálcio ou potássio.
- `transporterModulator`: interfere em bombas, cotransportadores ou carreadores
  de recaptação.
- `hormone`: representa hormônios e análogos estruturais, separados por natureza
  peptídica, esteroidal ou derivada de aminas.
- `cytotoxic`: destrói estruturas vitais da célula; inibidores de quinase
  pertencem a `enzymeModulator`, e não a esta raiz.
- `biological`: macromoléculas terapêuticas produzidas biologicamente, como
  anticorpos monoclonais e enzimas terapêuticas.
- `immunobiological`: antígenos ou anticorpos usados para gerar memória,
  fornecer imunidade passiva ou induzir tolerância.
- `physicochemicalAgent`: age por propriedades físico-químicas, como
  osmolaridade, tensão superficial, adsorção ou modificação de pH.
- `chelatingAgent`: liga diretamente íons ou metais pesados livres.
- `metabolicSubstrate`: fornece cofatores, minerais, eletrólitos, nutrientes ou
  precursores estruturais consumidos pelas células.
- `nucleicAcidTherapy`: expressa ou silencia informação genética por vetores,
  mRNA ou oligonucleotídeos.
- `cellularTherapy`: usa células vivas, tecidos ou hemoderivados como tratamento.
- `diagnosticAgent`: emprega propriedades físicas de contraste, emissão ou
  coloração para diagnóstico in vivo.

O termo mais específico aplicável deve ser usado. Exemplos citados nas labels e
na documentação servem para esclarecer o mecanismo, não para criar sinônimos ou
relações implícitas.

## `classification`: nomenclatura e regulação

[`classifications/_entity.json`](./classifications/_entity.json) fornece o
vocabulário de classificação e apresentação dos dados estruturados. Uma entidade
pode referenciar zero ou mais termos por `classificationTermKeys`.

- `nomenclature`, `scientificName`, `inn`, `dcb`, `casNumber` e suas descrições
  identificam os padrões de denominação. INN é a denominação comum
  internacional; DCB é a Denominação Comum Brasileira; CAS identifica a
  substância no registro químico correspondente.
- `atcVetCode` e `atcVetSystem` apresentam a classificação ATCvet.
- `regulatory.brazil.*`, `regulatory.unitedStates.*` e
  `regulatory.europe.*` descrevem o regime regulatório em cada jurisdição.
- `veterinaryRestriction.*` descreve restrições de uso ou venda, incluindo
  prescrição, uso clínico ou hospitalar e restrições para animais de produção.
- `regulatory.notInformed` representa somente ausência declarada de informação;
  não equivale a ausência de controle.

Classificação farmacológica pertence a `type`; identificação, nomenclatura e
restrições pertencem a `classification`.
