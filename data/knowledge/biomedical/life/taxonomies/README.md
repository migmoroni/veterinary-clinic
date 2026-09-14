# Taxonomias De Seres Vivos

Este diretório mantém os vocabulários biológicos compartilhados. Este README é
orientação editorial; os manifestos `_entity.json` são a fonte de identidade,
estrutura, ordem e labels.

## `type`: hierarquia biológica

[`types/_entity.json`](./types/_entity.json) é a árvore `life:type`. Cada
`LifeEntity` referencia exatamente um de seus termos por `typeTermKey`, mas um
termo pode existir sem possuir uma entidade editorial associada.

A profundidade estrutural determina o rank fechado:

```text
domain → kingdom → phylum → class → order → family → genus → species → breed → variety
```

- `children` declara somente descendentes diretos;
- a posição no array determina a ordem entre irmãos;
- `parentKey`, `order` e inferência por prefixo não fazem parte da autoria;
- a chave é opaca, embora as chaves atuais expressem o caminho completo para
  facilitar leitura, como `eukaryota.animalia`;
- a label localizada do termo é o nome público do táxon;
- aliases, conteúdo extenso, mídia e métricas pertencem à `LifeEntity`, não ao
  termo taxonômico.

Classificações e métricas não são herdadas entre ancestral e descendente. A
aplicabilidade de produtos e protocolos, por outro lado, alcança o termo
referenciado e seus descendentes pela estrutura da árvore.

## `size`: porte corporal geral

[`sizes/_entity.json`](./sizes/_entity.json) define `small`, `medium`, `large` e
`giant`. `LifeEntity.classifications.bodyMetrics.size` pode referenciar zero ou
um desses termos.

O porte é uma categoria editorial geral, não uma faixa numérica universal.
Peso, altura e comprimento variam por táxon, sexo e fase da vida e pertencem a
`stageMetrics`. Portanto:

- não deduza `size` automaticamente de uma medida isolada;
- não trate ausência de `size` como porte desconhecido materializado;
- não herde porte de um ancestral taxonômico;
- use as labels localizadas do manifesto sem traduzir ou renomear a chave.
