# Referência Futura: Expansão De `bodyMetrics`

## Natureza Deste Documento

Este arquivo preserva possibilidades de evolução para `LifeEntity.bodyMetrics`.
Ele não integra a ordem de implementação do Hub Server, não constitui autorização
para alterar o contrato vigente e não deve ser executado como uma fase.

Uma expansão só entra em implementação quando uma tarefa futura definir
explicitamente seu escopo, suas fontes canônicas e as métricas que possuem dados
reais disponíveis.

## Contrato Vigente Preservado

O contrato vigente mantém:

```text
bodyMetrics
├── size
└── stageMetrics
    ├── periodUnit
    ├── male
    │   ├── newborn
    │   ├── young
    │   └── adult
    └── female
        ├── newborn
        ├── young
        └── adult

stage
├── period
├── weight
│   └── live
└── measure
    ├── height
    └── length
```

`size` é o porte categórico geral da entidade. `weight.live` representa peso
vivo total em quilogramas. As chaves de `measure` representam medidas lineares
em centímetros. `size` e `stageMetrics` são independentes; campos não aplicáveis
são omitidos.

## Princípios Para Expansão

- Cada chave identifica uma medida anatômica ou morfométrica inequívoca.
- Métricas dependentes de pontos anatômicos usam nomes específicos; não se
  presume que `height` ou `length` tenham o mesmo método em todos os táxons.
- A presença de uma métrica é opcional e depende de aplicabilidade e fonte.
- O schema permanece fechado. Não são aceitas chaves arbitrárias fornecidas pela
  autoria.
- Cada métrica declara unidade, definição, pontos anatômicos e método de
  mensuração antes de entrar no contrato público.
- Valores derivados não são persistidos quando podem ser calculados de métricas
  primárias e de uma fórmula versionada.
- Faixas de referência não substituem observações reais de um paciente.
- Nenhum valor é inferido da taxonomia, do caminho editorial ou de outra
  entidade.
- A expansão considera a amplitude de `Life`, incluindo organismos cujo tamanho
  exige milímetros, micrômetros ou outras unidades adequadas.

## Métricas Terrestres E De Quadrúpedes

| Chave candidata | Definição a fechar | Aplicação principal |
| --- | --- | --- |
| `bodyLength` | Comprimento corporal entre pontos anatômicos definidos | Mamíferos e outros vertebrados terrestres |
| `withersHeight` | Altura do solo à cernelha | Quadrúpedes |
| `chestGirth` | Circunferência torácica em ponto anatômico definido | Quadrúpedes |
| `bodyDepth` | Profundidade vertical do tronco | Vertebrados |
| `bodyWidth` | Largura corporal em ponto definido | Vertebrados |
| `headLength` | Comprimento da cabeça entre marcos definidos | Vertebrados |
| `headWidth` | Maior largura ou largura em marco definido | Vertebrados |
| `tailLength` | Comprimento da cauda a partir do marco de origem | Vertebrados caudados |
| `neckCircumference` | Circunferência cervical em posição definida | Mamíferos |
| `hipWidth` | Largura entre marcos pélvicos definidos | Grandes animais |
| `cannonBoneCircumference` | Circunferência do metápodo em posição definida | Grandes animais |

A FAO registra, entre outras medidas, altura na cernelha, comprimento corporal,
profundidade e largura torácicas, largura pélvica e circunferências corporal e do
metápodo em avaliações por sexo e idade. A fonte respalda a necessidade de
nomes anatômicos específicos: [FAO, Growth](https://www.fao.org/4/ad347e/ad347e0c.htm).

## Métricas De Aves

| Chave candidata | Definição a fechar |
| --- | --- |
| `wingChord` | Comprimento da corda da asa |
| `tarsusLength` | Comprimento do tarso |
| `billLength` | Comprimento do bico segundo marcos definidos |
| `tailLength` | Comprimento da cauda |

O programa de anilhamento do USGS registra medidas como corda da asa,
comprimento do tarso e comprimento da cauda, além de sexo e peso:
[USGS, Bandit User Manual](https://www.pwrc.usgs.gov/bbl/resources/bandit/Documentation/Bandit_4.0_User_Manual.pdf).

## Métricas De Peixes

| Chave candidata | Definição a fechar |
| --- | --- |
| `totalLength` | Focinho até a extremidade da nadadeira caudal |
| `forkLength` | Focinho até a forquilha da nadadeira caudal |
| `standardLength` | Focinho até o término do pedúnculo caudal |
| `precaudalLength` | Comprimento anterior à região caudal definida |
| `bodyDepth` | Maior profundidade corporal ou ponto padronizado |

`totalLength`, `forkLength` e `standardLength` são métodos distintos e não devem
ser condensados em uma chave genérica `length`. A NOAA utiliza essas distinções
em coleta e análise de dados:
[NOAA Fisheries, Groundfish Survey](https://www.fisheries.noaa.gov/science-blog/sea-database-process-data-collection-fall-groundfish-survey) e
[NOAA, Measurement Guidelines](https://repository.library.noaa.gov/view/noaa/10396/noaa_10396_DS1.pdf).

## Métricas De Répteis E Anfíbios

| Chave candidata | Definição a fechar |
| --- | --- |
| `snoutVentLength` | Focinho até a cloaca |
| `carapaceLengthStraight` | Comprimento retilíneo da carapaça |
| `carapaceLengthCurved` | Comprimento acompanhando a curvatura da carapaça |
| `carapaceWidthStraight` | Maior largura retilínea da carapaça |
| `plastronLength` | Comprimento do plastrão segundo linha definida |

O USGS usa o comprimento focinho-cloaca para salamandras porque a cauda pode ser
perdida e regenerada:
[USGS, Measuring red eft](https://www.usgs.gov/media/images/measuring-red-eft).
A NOAA distingue medidas retas e curvas de carapaça e registra largura e
comprimento do plastrão:
[NOAA Fisheries, Turtle Measurements](https://www.fisheries.noaa.gov/inport/item/11766).

## Métricas De Crustáceos E Moluscos

| Chave candidata | Definição a fechar |
| --- | --- |
| `carapaceLength` | Comprimento da carapaça entre marcos definidos |
| `carapaceWidth` | Maior largura da carapaça |
| `shellLength` | Comprimento da concha |
| `shellWidth` | Largura da concha |
| `shellHeight` | Altura da concha |
| `lipThickness` | Espessura do lábio da concha quando aplicável |

Guias da NOAA especificam pontos de medição distintos para carapaça de lagosta
e conchas:
[NOAA, Caribbean Measurement Guidelines](https://media.fisheries.noaa.gov/dam-migration/carib_booklet_2017_web_view_english.pdf).

## Organismos De Pequena Escala

Uma expansão voltada a fungos, parasitas microscópicos e outros organismos pode
avaliar métricas como:

- `cellLength` e `cellWidth`;
- `cellDiameter`;
- `sporeLength` e `sporeWidth`;
- `hyphaDiameter`;
- `colonyDiameter`.

Essas métricas não entram no contrato sem fontes próprias por domínio. Sua
inclusão exige suporte explícito a milímetros e micrômetros e uma definição clara
de quando a medida descreve indivíduo, célula, estrutura reprodutiva ou colônia.

## Peso E Composição Corporal

`weight.live` permanece suficiente para o peso vivo total. Possíveis expansões,
como massa magra, massa adiposa, peso de nascimento ou peso de carcaça, exigem
uma finalidade concreta e não são adicionadas apenas para antecipar casos.

Índices derivados, fórmulas de área de superfície corporal e estimativas de peso
a partir de medidas lineares pertencem a uma camada de cálculo versionada. A
fonte, a fórmula e o táxon de validade precisam ser explícitos.

## Estatística E Proveniência

Uma faixa `[min, max]` é simples, mas não informa distribuição ou qualidade da
amostra. Uma evolução pode avaliar, sem tornar todos os campos obrigatórios:

- tamanho da amostra;
- média e mediana;
- desvio-padrão;
- percentis de referência;
- população, localidade e sexo observados;
- método e instrumento de mensuração;
- referência bibliográfica ou dataset de origem;
- data ou versão da fonte.

Esses metadados pertencem ao valor respaldado, não ao nome da pasta. Dados
estatísticos só são publicados quando a fonte permite reproduzir seu significado.

## Unidades E Normalização

O contrato atual usa quilogramas para `stageMetrics.weight` e centímetros para
`stageMetrics.measure`. Uma expansão para outros grupos avalia uma destas
estratégias antes de adicionar campos:

1. unidade canônica por chave;
2. valor normalizado em unidade canônica e unidade editorial preservada como
   proveniência;
3. unidade explícita por valor, limitada por enum tipado.

Não misturar números de unidades diferentes dentro do mesmo intervalo. Conversão
e arredondamento precisam ser determinísticos e testados.

## Sexo E Estágios De Vida

`stageMetrics` usa `male`, `female`, `newborn`, `young` e `adult`. Uma expansão
para organismos hermafroditas, assexuados ou com metamorfose avalia um
vocabulário próprio antes de modificar esse shape. Possíveis necessidades
incluem estágio larval, pupa, ninfa, esporo ou ausência de diferenciação sexual.

Não criar uma chave genérica apenas para acomodar dados desconhecidos. Cada novo
perfil precisa possuir semântica, aplicabilidade e validação explícitas.

## Limite Com Dados Clínicos

Não pertencem a `LifeEntity.bodyMetrics`:

- peso, altura ou comprimento observados em um paciente concreto;
- escore de condição corporal;
- escore de condição muscular;
- temperatura, frequência cardíaca ou frequência respiratória;
- peso ideal ou meta terapêutica individual;
- curva clínica de crescimento de um paciente.

Esses dados pertencem ao prontuário e são registrados como observações clínicas.
A WSAVA trata escore corporal como avaliação de reservas de gordura e escore
muscular como avaliação da massa muscular do paciente:
[WSAVA, Global Nutrition Toolkit](https://wsava.org/wp-content/uploads/2021/04/WSAVA-Global-Nutrition-Toolkit-English.pdf).

## Forma De Evolução Do Contrato

Quando o número de métricas justificar a expansão, avaliar um registro tipado
central com, no mínimo:

```text
metricKey
category
canonicalUnit
anatomicalDefinition
measurementMethod
applicableTaxa
sourceReferences
```

Esse registro não transforma `bodyMetrics` em objeto aberto. Schema de autoria,
tipos Rust, validação semântica, projeção, verificador, busca, documentação e
testes continuam usando o mesmo conjunto fechado de chaves.

## Checklist Para Uma Decisão Futura

- Existe conteúdo real e revisado para a métrica.
- A medida possui definição anatômica inequívoca.
- A unidade e a precisão estão definidas.
- O método de mensuração está documentado.
- Os táxons aos quais a métrica se aplica estão delimitados.
- A fonte primária ou técnica está registrada.
- A métrica não duplica outra chave com nome diferente.
- O valor não pertence ao prontuário individual.
- O schema, os tipos, a persistência e o verificador podem permanecer fechados.
- Fixtures e testes cobrem presença, ausência, unidade, intervalos e adulteração.

## Fontes De Respaldo

- [FAO: Growth](https://www.fao.org/4/ad347e/ad347e0c.htm) — medidas corporais de grandes animais por sexo e idade.
- [USGS: Bandit User Manual](https://www.pwrc.usgs.gov/bbl/resources/bandit/Documentation/Bandit_4.0_User_Manual.pdf) — medidas padronizadas de aves.
- [NOAA Fisheries: Groundfish Survey](https://www.fisheries.noaa.gov/science-blog/sea-database-process-data-collection-fall-groundfish-survey) — distinção entre comprimentos de peixes.
- [NOAA: Measurement Guidelines](https://repository.library.noaa.gov/view/noaa/10396/noaa_10396_DS1.pdf) — definições anatômicas para peixes e carapaças.
- [USGS: Measuring red eft](https://www.usgs.gov/media/images/measuring-red-eft) — comprimento focinho-cloaca em anfíbios.
- [NOAA Fisheries: Turtle Measurements](https://www.fisheries.noaa.gov/inport/item/11766) — medidas retas e curvas de carapaça, plastrão e cabeça.
- [NOAA: Caribbean Measurement Guidelines](https://media.fisheries.noaa.gov/dam-migration/carib_booklet_2017_web_view_english.pdf) — carapaça de crustáceos e conchas.
- [WSAVA: Global Nutrition Toolkit](https://wsava.org/wp-content/uploads/2021/04/WSAVA-Global-Nutrition-Toolkit-English.pdf) — separação entre morfometria de referência e avaliação clínica de condição corporal e muscular.
