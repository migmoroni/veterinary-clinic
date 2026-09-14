# Taxonomias De Produtos

Este diretório mantém os três vocabulários de produtos. Este README documenta
decisões editoriais; somente os `_entity.json` definem termos, labels,
hierarquia, ordem e identidade.

## `type`: natureza do produto

[`types/_entity.json`](./types/_entity.json) organiza produtos veterinários por
categoria, subcategoria e especialidade. Cada produto referencia exatamente um
termo por `typeTermKey`.

- `medication`: medicamentos, biológicos e imunológicos, antimicrobianos,
  antiparasitários, anestésicos, analgésicos, terapias de medicina interna,
  oncologia e fluidoterapia.
- `nutrition`: dietas completas ou terapêuticas, suplementos, nutracêuticos,
  petiscos e sucedâneos do leite.
- `hygieneAndAesthetics`: cuidados de pele, pelagem, ouvido, olhos, patas e
  higiene oral.
- `clinicalConsumable`: materiais de injeção, infusão, cirurgia, diagnóstico e
  proteção individual consumidos na rotina clínica.
- `accessoryAndEnrichment`: recuperação, locomoção, contenção, transporte,
  habitat, alimentação, brinquedos e vestuário.
- `environmentAndSanitation`: manejo de resíduos, saneamento de instalações e
  controle ambiental de pragas.
- `equipmentAndInstrument`: instrumentais cirúrgicos e aparelhos diagnósticos
  duráveis.

O tipo descreve o que o item é. A finalidade terapêutica, a apresentação e os
alvos pertencem aos vocabulários e campos correspondentes abaixo.

## `classification`: atributos comerciais e de uso

[`classifications/_entity.json`](./classifications/_entity.json) oferece eixos
independentes, referenciados por `classificationTermKeys`.

Origem do produto:

- `origin.allopathic`: formulação química convencional;
- `origin.phytotherapeutic`: origem exclusivamente vegetal;
- `origin.homeopathic`: substâncias diluídas ou dinamizadas;
- `origin.biological`: derivado de organismos vivos, como vacinas, soros e
  anticorpos.

Categoria comercial:

- `commercial.reference`: produto inovador do responsável pela molécula;
- `commercial.generic`: equivalente sem marca comercial própria;
- `commercial.similar`: equivalente com marca e características próprias;
- `commercial.compounded`: preparado sob medida por manipulação;
- `commercial.nonApplicable`: item que não é medicamento.

Ação terapêutica:

- `therapeuticAction.prophylactic`: previne doença ou infestação;
- `therapeuticAction.curative`: elimina a causa ativa;
- `therapeuticAction.palliative`: alivia sintomas ou dor sem objetivo curativo;
- `therapeuticAction.control`: mantém doença crônica sob controle.

`pharmaceuticalForm.*` descreve a apresentação física: comprimidos, cápsulas,
pós, suspensões, soluções injetáveis, `spot-on`, `pour-on`, pomadas, soluções
gerais, shampoos, sabonetes, coleiras, alimentos e consumíveis. Use
`pharmaceuticalForm.nonApplicable` somente quando não houver forma farmacêutica
clássica.

`administrationRoute.*` descreve a via de uso: oral, intravenosa,
intramuscular, subcutânea, tópica, otológica, oftálmica, intranasal, epidural,
intra-articular, inalatória ou retal. `administrationRoute.nonApplicable` atende
itens sem administração clínica.

As chaves de cabeçalho como `baseGroup`, `formAndAdministration`,
`regulatoryIdentifiers` e `targetSpecies` padronizam a apresentação dos grupos.
Identificadores como MAPA, NADA, ANADA e GTIN/EAN permanecem valores estruturados
do produto; a taxonomia padroniza seus rótulos.

## `target`: alvo terapêutico declarado

[`targets/_entity.json`](./targets/_entity.json) descreve o que o produto busca
prevenir, controlar ou combater. Um produto pode referenciar zero ou mais
termos por `targetTermKeys`.

- `disease`: condição ou desfecho clínico alvo;
- `pathogen`: agente infeccioso específico;
- `parasite`: parasita ou grupo parasitário alvo.

Alvo terapêutico não define a espécie em que o produto pode ser usado. Essa
aplicabilidade usa `applicableTaxonTermKeys` e resolve termos de `life:type`.
Também não substitui `activeIngredientIds`, que declara a composição.

Ao incluir um alvo, prefira o termo mais específico comprovado pelo conteúdo do
produto; não derive alvos implicitamente do nome comercial ou do diretório.
