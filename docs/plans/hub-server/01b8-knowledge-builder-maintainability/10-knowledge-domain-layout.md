# Parte 1B.8.10: Organização Canônica Por Domínios

## Objetivo

Organizar `data/knowledge` por fronteiras editoriais coerentes com a natureza de
cada conteúdo. Conhecimento sobre seres vivos, condições clínicas e princípios
ativos pertence a `biomedical`; produtos e fabricantes pertencem a `catalog`.

```text
data/knowledge
        |
        +-- biomedical   ciência, saúde e farmacologia
        +-- catalog      itens comercializados e seus fabricantes
        +-- clinical     aplicação clínica do conhecimento
        +-- geo          referências geográficas compartilhadas
        +-- _standards   contratos editoriais transversais
```

Os diretórios organizam a autoria. `_entity.json` continua sendo a fonte de
identidade e semântica: `entityType`, `id`, `domain`, `purpose` e as referências
explícitas determinam como cada item é validado e projetado.

## Resultado Esperado

Ao concluir esta parte:

- `biomedical/` reúne `life`, `conditions`, `active-ingredients` e suas
  taxonomias proprietárias;
- `catalog/` reúne somente `products`, `manufacturers` e suas taxonomias
  proprietárias;
- cada coleção separa `taxonomies/` de `editorial/`, e todas as entidades
  autorais vivem sob `editorial/`;
- `clinical/`, `geo/` e `_standards/` conservam suas responsabilidades;
- cada diretório de entidade é transportado integralmente, incluindo
  `_entity.json`, `_content` e `_media` quando presentes;
- todas as identidades, chaves, relações, conteúdos e mídias permanecem
  semanticamente idênticos;
- o scanner do `knowledge-builder` e a auditoria continuam recursivos e não
  inferem tipo ou projeção a partir do caminho;
- o digest lógico da fonte e os artefatos compilados permanecem idênticos para
  a mesma entrada semântica e o mesmo contexto de build;
- a documentação de autoria e os planos seguintes usam a disposição final;
- a pré-fase transversal do `workspace-validator` inicia sobre essa organização
  consolidada e antecede a Parte 1B.8.11.

## Pré-Requisitos

- A
  [Parte 1B.8.9: padrões editoriais de seções](./09-editorial-section-standards.md)
  está concluída.
- `pnpm knowledge:audit`, `pnpm knowledge:validate` e
  `pnpm knowledge:build` estão saudáveis antes da movimentação.
- A fonte canônica possui um único `_standards/sections.json` na raiz.
- O builder ordena entidades por identidade lógica antes de calcular digest,
  projetar rows e produzir evidências.

## Escopo

Esta parte altera:

- a disposição editorial de `data/knowledge`;
- a localização física das onze taxonomias canônicas;
- os exemplos de caminho na documentação vigente;
- fixtures e testes que usam caminhos editoriais concretos;
- mensagens ou utilitários que contenham um caminho canônico fixo fora do
  namespace reservado;
- o plano de mídias canônicas no R2, que passa a usar os caminhos finais.

Esta parte preserva:

- todos os documentos `_entity.json` e seus valores;
- todos os documentos Markdown e bytes de mídia;
- `entityType`, IDs, `typeTermKey`, `sectionStandardKey`, chaves taxonômicas e
  referências entre entidades;
- os onze pares de `domain` e `purpose` das taxonomias;
- os JSON Schemas, modelos Rust e contratos de projeção;
- DDL, tabelas, colunas, índices e versões de `system` e `system_media`;
- `content_json`, rows, termos de busca, relações e objetos CAS compilados;
- o número de arquivos, entidades, relações e fragmentos localizados;
- os bancos e o CAS do ramo `user`.

Não entram nesta parte:

- armazenamento ou sincronização no Cloudflare R2;
- mudança do contrato de mídia;
- alteração de conteúdo, correção editorial ou enriquecimento dos dados;
- criação de entidade, taxonomia, termo, locale ou relação;
- renomeação de identidade lógica ou chave editorial;
- alteração de schema ou migration de banco;
- integração com apps, Hub, GitHub ou providers de distribuição.

## Vocabulário De Domínios

### `biomedical`

Contém conhecimento científico e de saúde independente de um item comercial:

- `life`: organismos, hierarquia taxonômica, perfis e métricas;
- `conditions`: doenças, síndromes, alterações e demais condições clínicas;
- `active-ingredients`: substâncias farmacologicamente ativas e sua
  nomenclatura.

Uma substância continua em `biomedical` mesmo quando é referenciada por um
produto de catálogo. A relação produto-princípio ativo ocorre pelos IDs
canônicos, não pela proximidade de diretórios.

### `catalog`

Contém entidades que representam oferta e identificação comercial:

- `products`: medicamentos, vacinas, antiparasitários e demais produtos;
- `manufacturers`: fabricantes e organizações responsáveis por esses itens.

`catalog` não representa faturamento, estoque ou operações comerciais do app.
Ele organiza conhecimento público sobre itens e fabricantes.

### Domínios Transversais

- `clinical` contém protocolos e aplicação clínica reutilizável;
- `geo` contém localidades compartilhadas por qualquer domínio;
- `_standards` contém contratos editoriais globais e não é uma entidade.

Esses diretórios permanecem irmãos de `biomedical` e `catalog`.

## Disposição Final

```text
data/knowledge/
├── _standards/
│   └── sections.json
├── biomedical/
│   ├── active-ingredients/
│   │   ├── taxonomies/
│   │   │   ├── classifications/
│   │   │   │   └── _entity.json
│   │   │   └── types/
│   │   │       └── _entity.json
│   │   └── editorial/
│   │       └── <active-ingredient>/
│   │           ├── _entity.json
│   │           ├── _content/
│   │           └── _media/
│   ├── conditions/
│   │   ├── taxonomies/
│   │   │   ├── classifications/
│   │   │   │   └── _entity.json
│   │   │   └── types/
│   │   │       └── _entity.json
│   │   └── editorial/
│   │       └── <condition>/
│   │           ├── _entity.json
│   │           ├── _content/
│   │           └── _media/
│   └── life/
│       ├── taxonomies/
│       │   ├── sizes/
│       │   │   └── _entity.json
│       │   └── types/
│       │       └── _entity.json
│       └── editorial/
│           └── <organização-editorial>/<life-entity>/
│               ├── _entity.json
│               ├── _content/
│               └── _media/
├── catalog/
│   ├── manufacturers/
│   │   ├── taxonomies/
│   │   │   ├── classifications/
│   │   │   │   └── _entity.json
│   │   │   └── types/
│   │   │       └── _entity.json
│   │   └── editorial/
│   │       └── <manufacturer>/
│   │           ├── _entity.json
│   │           ├── _content/
│   │           └── _media/
│   └── products/
│       ├── taxonomies/
│       │   ├── classifications/
│       │   │   └── _entity.json
│       │   ├── targets/
│       │   │   └── _entity.json
│       │   └── types/
│       │       └── _entity.json
│       └── editorial/
│           └── <organização-editorial>/<product>/
│               ├── _entity.json
│               ├── _content/
│               └── _media/
├── clinical/
│   └── treatment-protocols/
├── geo/
│   └── places/
├── audit-report.json
├── inventory.json
└── README.md
```

Os exemplos de `_content` e `_media` indicam recursos opcionais permitidos pelo
contrato da entidade. A implementação não cria diretórios vazios para completar
o desenho.

`biomedical`, `catalog`, os diretórios de coleção, `taxonomies` e `editorial`
são apenas organizacionais. Eles não recebem `_entity.json` próprio.

Em cada coleção:

- `taxonomies/` contém os manifestos dos vocabulários controlados daquele tipo
  de entidade;
- `editorial/` contém a árvore livre de entidades, seus documentos localizados
  e suas mídias;
- subpastas abaixo de `editorial/` podem ser reorganizadas sem alterar a
  identidade ou a projeção dos itens.

## Mapa De Movimentação

| Origem | Destino |
|---|---|
| `life/taxonomies/sizes/` | `biomedical/life/taxonomies/sizes/` |
| `life/taxonomies/types/` | `biomedical/life/taxonomies/types/` |
| Árvore de entidades sob `life/`, sem `taxonomies/` | `biomedical/life/editorial/`, preservando a subárvore |
| Entidades sob `catalog/active-ingredients/` | `biomedical/active-ingredients/editorial/`, preservando a subárvore |
| Entidades sob `catalog/conditions/` | `biomedical/conditions/editorial/`, preservando a subárvore |
| `catalog/taxonomies/active-ingredient-classifications/` | `biomedical/active-ingredients/taxonomies/classifications/` |
| `catalog/taxonomies/active-ingredient-types/` | `biomedical/active-ingredients/taxonomies/types/` |
| `catalog/taxonomies/condition-classifications/` | `biomedical/conditions/taxonomies/classifications/` |
| `catalog/taxonomies/condition-types/` | `biomedical/conditions/taxonomies/types/` |
| `catalog/taxonomies/manufacturer-classifications/` | `catalog/manufacturers/taxonomies/classifications/` |
| `catalog/taxonomies/manufacturer-types/` | `catalog/manufacturers/taxonomies/types/` |
| Entidades sob `catalog/manufacturers/` | `catalog/manufacturers/editorial/`, preservando a subárvore |
| `catalog/taxonomies/product-classifications/` | `catalog/products/taxonomies/classifications/` |
| `catalog/taxonomies/product-targets/` | `catalog/products/taxonomies/targets/` |
| `catalog/taxonomies/product-types/` | `catalog/products/taxonomies/types/` |
| Árvore de entidades sob `catalog/products/` | `catalog/products/editorial/`, preservando a subárvore |

O diretório `catalog/taxonomies/` deixa de existir quando todas as taxonomias
estão junto de seus proprietários editoriais. Os manifestos movidos conservam
integralmente `id`, `domain`, `purpose`, `terms` e `localizedContent`.

## Invariantes

- A posição no filesystem nunca define `entityType`, ID, taxonomia, relação,
  rank, pai, ordem, locale ou tabela de destino.
- Cada coleção de `biomedical` e `catalog` separa vocabulários em
  `taxonomies/` e dados autorais em `editorial/`.
- O builder descobre `_entity.json` recursivamente em qualquer diretório
  editorial permitido.
- Entidades são ordenadas por `(entityType, id)` antes do digest e da projeção.
- Taxonomias são resolvidas por `(domain, purpose)` e termos por suas chaves,
  sem consulta ao nome da pasta.
- Relações entre produtos, princípios ativos, condições, vida, fabricantes,
  localidades e protocolos usam somente referências explícitas.
- `_content` e `_media` permanecem filhos diretos da entidade proprietária.
- `_standards` permanece único e diretamente na raiz de `data/knowledge`.
- Os nomes reservados mantêm as mesmas regras de segurança e cobertura.
- O digest lógico não contém caminhos editoriais.
- `mediaKey` continua derivada de `entityType`, ID e caminho interno da mídia,
  sem incorporar o caminho organizacional anterior à entidade.
- O inventário e o relatório de auditoria não registram a disposição física dos
  domínios.
- Nenhuma regra de domínio é duplicada no scanner, no auditor ou nos
  projectors para reconhecer a nova árvore.

## 1. Estabelecer A Evidência De Referência

Antes de mover arquivos:

1. executar `pnpm knowledge:audit`;
2. executar `pnpm knowledge:validate` e registrar o digest lógico informado;
3. executar um build limpo com o contexto local em diretório temporário;
4. conservar, fora da fonte canônica, o `build-result.json`, o
   `projection-report.json`, os checksums dos doze bancos e o digest do conjunto
   CAS;
5. registrar as contagens de arquivos, entidades, relações, fragmentos,
   taxonomias, termos, documentos e mídias.

A evidência compara a mesma revisão de dados e o mesmo contexto de build. Ela
não é adicionada ao Git nem se torna outro contrato do produto.

## 2. Transportar A Fonte Canônica

Executar as movimentações do mapa como operações de filesystem que preservam os
bytes dos arquivos. Cada entidade move junto com todos os seus recursos
reservados.

Durante o transporte:

- não reserializar JSON;
- não reformatar Markdown;
- não alterar nomes internos de entidades ou mídias;
- não corrigir conteúdo encontrado;
- não gerar arquivos intermediários dentro de `data/knowledge`;
- não deixar cópias na origem;
- não manter diretórios vazios sem função editorial.

Ao final, conferir que a contagem e o SHA-256 de cada arquivo relativo à sua
entidade proprietária permanecem iguais. A mudança de prefixo organizacional é
a única diferença aceita.

## 3. Confirmar A Neutralidade Do Builder

Revisar `tools/knowledge-builder` para localizar qualquer dependência de
caminhos como `catalog`, `life`, `conditions`, `active-ingredients`,
`manufacturers` ou `products`.

O resultado correto é:

- descoberta recursiva por `_entity.json`;
- seleção de schema por `entityType`;
- resolução de taxonomia por `domain` e `purpose`;
- resolução de referências por IDs e chaves;
- resolução de `_content` e `_media` somente a partir do diretório proprietário;
- ordenação lógica independente da ordem do filesystem.

Quando existir uma dependência de caminho, substituí-la pelo contrato lógico
correspondente. Não criar um mapa que associe prefixos de diretório a tipos de
entidade.

Manter ou ampliar o teste que transporta uma árvore válida para outra disposição
editorial e exige:

- validação bem-sucedida;
- digest lógico idêntico;
- inventário esperado idêntico;
- contratos de projeção idênticos;
- bancos e CAS com checksums idênticos para o mesmo contexto.

## 4. Adaptar Auditoria E Fixtures

Revisar `scripts/audit-knowledge.mjs` com a mesma regra: ele percorre a fonte
recursivamente e valida contratos pelos manifestos, sem derivar semântica do
caminho.

Atualizar somente referências físicas necessárias em:

- fixtures positivas que espelham domínios editoriais;
- helpers que abrem uma entidade concreta pelo caminho;
- testes de layout e mensagens esperadas;
- snapshots ou registros de fixtures que contenham caminhos.

Fixtures negativas de namespace reservado continuam autocontidas. A fixture
mínima pode refletir `biomedical` e `catalog`, mas sua validade não depende
desses nomes.

`inventory.json` e `audit-report.json` devem manter os mesmos valores derivados.
Se uma ferramenta os reescrever, o diff semântico precisa ser vazio.

## 5. Atualizar A Documentação Ativa

Atualizar:

- `data/knowledge/README.md` com a disposição final e a definição de cada
  domínio;
- `tools/knowledge-builder/README.md` com exemplos neutros ou caminhos finais;
- `tools/knowledge-builder/MAINTENANCE.md` quando houver mapas de fonte ou
  receitas com caminhos concretos;
- o índice de planos do Hub;
- planos posteriores que instruem comandos com caminhos de entidades.

A documentação afirma no presente que caminhos organizam a autoria e que os
manifestos determinam identidade, relações e projeção. Não introduzir explicação
histórica da disposição substituída.

## 6. Verificar Equivalência

Após a movimentação:

1. executar `pnpm knowledge:audit`;
2. executar `pnpm knowledge:validate`;
3. executar o mesmo build limpo usado na evidência de referência;
4. comparar o digest lógico com o valor de referência;
5. comparar `build-result.json` e `projection-report.json` semanticamente;
6. comparar checksums dos doze bancos por locale;
7. comparar o digest e os objetos do `CAS/system`;
8. confirmar que nenhuma row, relação, termo de busca ou mídia foi adicionada,
   removida ou alterada;
9. executar os testes específicos do `knowledge-builder` e da auditoria;
10. concluir com a skill `$validate-workspace`.

Qualquer divergência semântica bloqueia a conclusão. O executor corrige a
dependência indevida de caminho ou a movimentação incompleta, sem aceitar a
divergência como consequência natural da reorganização.

## Arquivos Prováveis

```text
data/knowledge/**
data/knowledge/README.md
scripts/audit-knowledge.mjs
tools/knowledge-builder/README.md
tools/knowledge-builder/MAINTENANCE.md
tools/knowledge-builder/fixtures/**
tools/knowledge-builder/src/validation/**
tools/knowledge-builder/tests/**
docs/plans/hub-server/README.md
docs/plans/hub-server/01b8-knowledge-builder-maintainability/11-r2-canonical-media.md
```

Arquivos de implementação só são alterados quando a inspeção demonstra uma
dependência física concreta. A simples mudança dos dados não autoriza refatorar
projectors, schemas ou persistência que já operam por contratos lógicos.

## Critérios De Aceite

- [ ] A árvore final contém `biomedical`, `catalog`, `clinical`, `geo` e
      `_standards` nas responsabilidades definidas.
- [ ] `biomedical` contém `active-ingredients`, `conditions`, `life` e suas
      taxonomias.
- [ ] `catalog` contém `manufacturers`, `products` e suas taxonomias.
- [ ] Cada uma das cinco coleções possui `taxonomies/` e `editorial/`, sem
      entidades diretamente na raiz da coleção.
- [ ] `catalog/taxonomies` não existe.
- [ ] Nenhum diretório meramente organizacional possui `_entity.json`.
- [ ] Todos os arquivos de cada entidade permanecem juntos.
- [ ] IDs, tipos, chaves, relações, locales, padrões editoriais e conteúdo não
      mudam.
- [ ] A matriz das onze taxonomias permanece idêntica.
- [ ] Auditoria e builder não inferem domínio por caminho.
- [ ] O digest lógico é idêntico ao valor de referência.
- [ ] As contagens de inventário e auditoria são idênticas.
- [ ] Os doze bancos e o conjunto CAS são idênticos para o mesmo contexto.
- [ ] DDLs e versões técnicas não mudam.
- [ ] Nenhuma migration, camada paralela, fallback ou cópia da fonte é criada.
- [ ] A documentação ativa usa somente a disposição final.
- [ ] Testes específicos e `$validate-workspace` passam integralmente.
