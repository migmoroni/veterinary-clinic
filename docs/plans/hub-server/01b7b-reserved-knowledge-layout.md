# Parte 1B.7B: Layout Reservado Da Fonte Canônica

## Objetivo

Estabelecer um namespace reservado e fechado para os elementos técnicos de
autoria em `data/knowledge`. Manifestos, documentos localizados e mídias passam
a ser visualmente distintos das pastas usadas somente para organização
editorial:

```text
<diretórios editoriais livres>/
└── <entidade>/
    ├── _entity.json
    ├── _content/
    │   ├── pt-BR.md
    │   ├── pt-PT.md
    │   ├── gn-PY.md
    │   ├── en-US.md
    │   ├── es-ES.md
    │   └── fr-FR.md
    └── _media/
        └── <subdiretórios e arquivos editoriais>
```

O sublinhado identifica exclusivamente elementos interpretados pelo
`knowledge-builder`. Diretórios sem esse prefixo permanecem livres para
organizar `catalog`, `clinical`, `geo` e `life` e não produzem significado de
domínio.

```text
_entity.json + _content/ + _media/
-> descoberta e validação do layout reservado
-> modelo semântico canônico
-> projeção e mídia compiladas
-> system + system_media + CAS/system
```

## Pré-Requisitos

- A [Parte 1B.7A](./01b7a-canonical-life-taxonomy.md) está concluída.
- `data/knowledge` valida e produz os artefatos locais antes da primeira edição
  desta parte.
- `knowledge-builder` é o único compilador de `system`, `system_media` e
  `CAS/system`.
- O gate geral do workspace está verde antes da primeira edição desta parte.

## Escopo

Esta parte altera:

- o layout canônico de `data/knowledge/catalog`, `clinical`, `geo` e `life`;
- a descoberta e a validação de arquivos em `tools/knowledge-builder`;
- os JSON Schemas de autoria relacionados a conteúdo e mídia;
- a resolução de mídias estruturais e de imagens Markdown;
- fixtures, helpers e testes do builder;
- a documentação vigente do layout canônico e os planos consumidores desse
  contrato.

Esta parte não altera o conteúdo de domínio dos manifestos, o DDL dos bancos,
as regras taxonômicas, as relações entre entidades ou os consumidores de
runtime.

## Invariantes

- `_entity.json` é o único nome reconhecido como manifesto canônico.
- `_content` é o único diretório técnico de documentos Markdown localizados.
- `_media` é o único diretório técnico de mídias editoriais de uma entidade.
- `_content` e `_media`, quando presentes, são filhos diretos do diretório que
  contém `_entity.json`.
- Qualquer outro arquivo ou diretório cujo nome comece com `_` é recusado pelo
  scanner.
- Diretórios sem `_` servem somente à organização editorial e não determinam
  identidade, tipo, taxonomia, relação ou classificação.
- O caminho completo da entidade na árvore editorial não participa de sua
  identidade lógica.
- `contentPath`, quando presente, possui exatamente o valor `./_content`.
- Toda referência estrutural de mídia começa com `./_media/`.
- Toda imagem Markdown resolve a partir de `_content/<locale>.md` por um caminho
  iniciado em `../_media/`.
- Toda mídia resolve dentro do `_media` da própria entidade, sem symlinks, URI,
  caminho absoluto ou escape por `..`.
- Todo arquivo sob `_media` é referenciado ao menos uma vez pelo manifesto ou
  por um documento Markdown.
- Não existem reconhecimento duplo, aliases de nomes de arquivos, fallback de
  diretórios ou contratos concorrentes.
- Não são criadas migrations, rotinas de adoção ou conversores persistentes.
- Bancos e CAS do ramo `user` não entram neste escopo.

## 1. Contrato De Layout

### 1.1 Namespace Reservado

O layout técnico possui exatamente estes nomes:

| Elemento | Nome canônico | Responsabilidade |
| --- | --- | --- |
| manifesto | `_entity.json` | identidade, estrutura, relações e conteúdo localizado simples |
| conteúdo | `_content/` | um documento Markdown completo por locale |
| mídia | `_media/` | bytes editoriais referenciados pela entidade |

Os nomes reservados são sensíveis a maiúsculas e minúsculas. Não aceitar
variações, pluralizações, aliases ou nomes configuráveis.

`_entity.json` pode existir em qualquer profundidade abaixo de um dos domínios
canônicos. Sua presença transforma somente o diretório imediatamente pai em
diretório de entidade. Os diretórios ancestrais continuam sem semântica, salvo
quando também contêm seu próprio `_entity.json`.

### 1.2 Diretórios Editoriais

Os seguintes nomes ilustram organização editorial e não compõem contratos do
builder:

```text
catalog/products/medications/vaccines/
clinical/treatment-protocols/
geo/places/
life/eukaryota/animalia/chordata/
```

Esses diretórios podem ser reorganizados sem alterar identidade ou relações,
desde que cada entidade mantenha o conteúdo de seu `_entity.json` e seus
recursos reservados.

### 1.3 Propriedade Dos Recursos

Um diretório que contém `_entity.json` é proprietário de seu `_content` e de
seu `_media`. O builder recusa:

- `_content` ou `_media` sem `_entity.json` no diretório pai;
- `_entity.json` dentro de `_content` ou `_media`;
- `_content` ou `_media` aninhado em outro diretório reservado;
- mais de um manifesto para o mesmo diretório;
- recurso reservado compartilhado entre entidades;
- arquivo especial ou symlink em qualquer parte da fonte.

## 2. Contratos Centrais Do Builder

Adicionar ao proprietário de contratos transversais do builder um módulo de
layout de fonte, por exemplo `src/contracts/source_layout.rs`, com constantes
únicas para:

```rust
ENTITY_MANIFEST_FILENAME = "_entity.json"
CONTENT_DIRECTORY_NAME = "_content"
MEDIA_DIRECTORY_NAME = "_media"
CONTENT_PATH = "./_content"
COMPILED_MEDIA_NAMESPACE = "media"
```

Scanner, validação, mídia e testes consomem essas constantes. Não repetir nomes
reservados como literais em múltiplos subsistemas.

O módulo representa somente o layout técnico da fonte. Locales permanecem sob
`contracts/locale`, versões sob `contracts/version` e regras semânticas sob seus
proprietários atuais.

## 3. Descoberta E Cobertura De Arquivos

### 3.1 Descoberta De Manifestos

Alterar a descoberta recursiva para selecionar somente arquivos cujo nome seja
exatamente `_entity.json`. O diagnóstico de fonte vazia e todos os caminhos de
erro usam esse nome.

O scanner continua ordenando entradas antes de processá-las. A ordem física de
leitura não pode depender do filesystem.

### 3.2 Validação Do Namespace

Durante a enumeração, validar cada componente iniciado em `_`:

- arquivo reservado aceito: `_entity.json`;
- diretórios reservados aceitos: `_content` e `_media`;
- qualquer outro nome iniciado em `_`: erro de fonte;
- `_content` e `_media`: somente na posição definida pelo contrato de
  propriedade.

Essa validação acontece antes da desserialização dos manifestos, de forma que
erros de topologia tenham diagnóstico direto e estável.

### 3.3 Cobertura Fechada

Expandir a cobertura de arquivos para provar que:

- todo Markdown fora do `README.md` raiz pertence a um `_content` declarado;
- todo arquivo sob `_media` pertence a uma entidade e aparece nas referências
  compiladas;
- nenhum documento adicional existe dentro de `_content`;
- nenhum diretório vazio `_content` ou `_media` permanece na fonte;
- arquivos técnicos com nomes não reconhecidos são recusados em vez de
  ignorados.

`inventory.json`, `audit-report.json` e `README.md` continuam sendo arquivos de
raiz conhecidos e não são tratados como entidades.

## 4. Manifesto E Conteúdo Localizado

### 4.1 Nome Do Manifesto

Renomear todos os manifestos canônicos de `data/knowledge` e das fixtures para
`_entity.json`. Atualizar helpers, testes, mensagens de diagnóstico e exemplos
que localizam manifestos pelo nome.

O conteúdo JSON dos manifestos permanece estrito e conserva seus campos de
domínio. O nome do arquivo não é armazenado nos bancos nem participa da
identidade da entidade.

### 4.2 Diretório De Conteúdo

Entidades com `sections` não vazio declaram:

```json
{
  "contentPath": "./_content"
}
```

Entidades sem seções omitem `contentPath` e não possuem `_content`.

`_content` contém exatamente os seis arquivos definidos por `LOCALES`, sem
subdiretórios ou arquivos auxiliares:

```text
pt-BR.md
pt-PT.md
gn-PY.md
en-US.md
es-ES.md
fr-FR.md
```

O scanner não infere locale por nome de diretório. O locale continua sendo
identificado pelo nome de cada documento Markdown.

### 4.3 JSON Schemas

Separar no schema comum os conceitos de caminho de conteúdo e caminho de mídia:

- `contentPath`: valor fechado `./_content`;
- caminho estrutural de mídia: caminho normalizado iniciado em `./_media/`;
- `media.cover` e cada item de `media.gallery`: caminho estrutural de mídia.

Não reutilizar uma definição genérica que permita ao `contentPath` apontar para
qualquer pasta ou permita à mídia estrutural sair de `_media`.

Os schemas de cada tipo de entidade continuam declarando se `contentPath`,
`sections` e `media` são opcionais ou obrigatórios. Esta parte não modifica os
demais campos nem a versão do payload de `_entity.json`.

## 5. Mídias Editoriais

### 5.1 Organização Da Fonte

Mídias pertencem ao `_media` da entidade e podem usar subdiretórios internos
para organização:

```text
_media/
├── cover.jpg
├── anatomy/
│   └── lateral.png
└── presentations/
    └── package.webp
```

Os subdiretórios internos não possuem semântica de domínio, mas fazem parte do
caminho relativo da mídia dentro do namespace da entidade.

### 5.2 Referências Estruturais

Referências em `_entity.json` usam caminhos relativos ao diretório da entidade:

```json
{
  "media": {
    "cover": "./_media/cover.jpg",
    "gallery": ["./_media/anatomy/lateral.png"]
  }
}
```

O resolvedor exige que o arquivo canônico esteja sob o `_media` proprietário.
Não basta que o caminho permaneça em qualquer posição dentro do diretório da
entidade.

### 5.3 Referências Markdown

Imagens em `_content/<locale>.md` usam caminhos relativos ao documento:

```markdown
![Descrição](../_media/anatomy/lateral.png "Legenda")
```

Aceitar exatamente a subida necessária de `_content` para o diretório da
entidade, seguida por `_media/`. Recusar outras travessias, caminhos externos,
URIs e imagens pertencentes a outra entidade.

### 5.4 Identidade Compilada

O nome `_media` pertence somente à fonte editorial. A identidade compilada usa
um namespace semântico estável:

```text
<entity_type>/<entity_id>/media/<caminho dentro de _media>
```

Exemplo:

```text
product/<product_id>/media/anatomy/lateral.png
```

Ao construir `MediaAsset`, separar explicitamente:

- caminho físico da fonte sob `_media`;
- caminho relativo interno `anatomy/lateral.png`;
- caminho compilado `media/anatomy/lateral.png`;
- `media_key` com tipo, ID e caminho compilado.

Assim, o marcador técnico `_` não vaza para `system_media`, para as referências
de `system` ou para APIs futuras. Hash, MIME, dimensões, thumbnail e layout
fragmentado de `CAS/system` permanecem sob os contratos atuais.

## 6. Conversão Da Fonte Canônica

Aplicar a alteração de forma integral em `catalog`, `clinical`, `geo` e `life`:

1. Renomear cada `entity.json` para `_entity.json`.
2. Renomear cada diretório técnico `content` para `_content`.
3. Atualizar cada `contentPath` para `./_content`.
4. Renomear cada diretório técnico `media` para `_media`.
5. Atualizar referências estruturais para `./_media/...`.
6. Atualizar imagens Markdown para `../_media/...`.
7. Confirmar que nenhuma alteração atingiu IDs, taxonomias, classificações,
   relações ou texto editorial.

A execução pode usar uma transformação mecânica revisável para o grande volume
de arquivos, mas não mantém scripts de conversão no repositório. O estado final
possui somente o contrato reservado.

## 7. Digest E Artefatos

O digest lógico continua ignorando `contentPath` e o caminho editorial externo
da entidade. Depois desta parte:

- mover uma entidade completa entre diretórios organizacionais não altera seu
  modelo lógico;
- `_content` e `_media` são partes fixas do contrato técnico e não podem ser
  renomeados livremente;
- o caminho compilado de mídia omite o sublinhado reservado;
- bytes idênticos continuam produzindo o mesmo hash e o mesmo objeto CAS;
- rows de domínio e referências de mídia preservam seu significado.

A impressão digital dos schemas de fonte participa do digest. Portanto, o
digest global e checksums que o incorporam podem mudar quando os schemas desta
parte forem atualizados. Isso é resultado do novo contrato canônico, não motivo
para leitura paralela de layouts.

Não alterar `SOURCE_ENTITY_SCHEMA_VERSION`, `SOURCE_DIGEST_SCHEMA_VERSION`, DDL,
application IDs ou versões de banco apenas por causa do layout de autoria.

## 8. Fixtures E Testes

### 8.1 Fixtures

Converter todas as fixtures para o layout reservado. Fixtures válidas não
misturam nomes técnicos; fixtures inválidas criam uma violação por cenário.

Adicionar cenários específicos para:

- `_entity.json` descoberto em profundidade arbitrária;
- diretório organizacional movido sem alteração da identidade lógica;
- `contentPath` diferente de `./_content`;
- `_content` sem manifesto proprietário;
- `_media` sem manifesto proprietário;
- nome reservado desconhecido, como `_contents` ou `_metadata.json`;
- manifesto dentro de `_content` ou `_media`;
- `_content` incompleto, excedente, vazio ou com subdiretório;
- `_media` vazio ou contendo arquivo não referenciado;
- mídia estrutural fora de `_media`;
- imagem Markdown fora de `_media`, pertencente a outra entidade ou escapando
  da raiz;
- symlink em qualquer componente reservado;
- chave compilada sem `_media` e com o namespace `media`;
- mídia compartilhada entre referência estrutural e Markdown sem duplicar o
  objeto CAS.

### 8.2 Helpers

Atualizar helpers de cópia, busca, adulteração e descoberta para consumir as
constantes do layout quando estiverem dentro do crate. Helpers de integração que
não acessam módulos privados mantêm uma única definição de suporte coerente com
o contrato público testado.

Substituir o teste que aceita renomear livremente o diretório de conteúdo por
dois testes:

- mover o diretório completo da entidade preserva o digest lógico;
- renomear `_content` ou alterar `contentPath` é recusado.

### 8.3 Validações Específicas

Executar:

```text
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets --locked
cargo clippy -p knowledge-builder --all-targets --locked -- -D warnings
cargo test -p knowledge-builder --all-targets --locked
cargo run --locked -p knowledge-builder -- \
  validate \
  --source data/knowledge
cargo run --locked -p knowledge-builder -- \
  build \
  --source data/knowledge \
  --output build/knowledge-artifacts \
  --context tools/knowledge-builder/fixtures/contexts/local-context.json
```

Executar duas builds limpas com o mesmo contexto. Digests, bancos, relatórios,
manifests de build, índices de mídia, thumbnails e CAS precisam ser
determinísticos entre as duas execuções.

## 9. Documentação

Atualizar no mesmo change set:

- `data/knowledge/README.md` com `_entity.json`, `_content` e `_media`;
- `tools/knowledge-builder/README.md` com descoberta, propriedade, cobertura,
  caminhos e identidade compilada de mídia;
- exemplos de árvore, JSON e Markdown pertencentes ao contrato vigente;
- planos ainda consumidores do layout canônico, especialmente as Partes 1B.8,
  1C e 3;
- o índice e o fluxo em `docs/plans/hub-server/README.md`.

Remover das documentações vigentes exemplos técnicos com nomes não reservados.
O texto final descreve somente o contrato canônico presente.

## 10. Sequência De Implementação

1. Executar o gate inicial e gerar uma build de referência para comparação
   semântica.
2. Definir as constantes centrais do layout reservado.
3. Adaptar descoberta, propriedade e cobertura de arquivos.
4. Fechar `contentPath` e caminhos estruturais nos JSON Schemas.
5. Adaptar a resolução de conteúdo e mídia ao layout reservado.
6. Separar caminho físico de mídia, caminho interno e identidade compilada.
7. Converter fixtures e helpers de teste.
8. Converter integralmente `data/knowledge`.
9. Atualizar testes unitários, de componente e integrais.
10. Atualizar a documentação vigente e os planos consumidores.
11. Validar a fonte, executar duas builds limpas, comparar determinismo e
    verificar a ausência de nomes técnicos fora do contrato.
12. Executar o gate geral final do workspace.

Cada etapa adapta todos os consumidores pertencentes ao escopo. Não conservar
duas formas de descoberta ou resolução para permitir execução parcial.

## Fora De Escopo

- alterar dados clínicos ou conteúdo editorial;
- reorganizar a taxonomia de vida;
- alterar relações semânticas de catálogo ou protocolos;
- alterar DDL, rows de domínio, application IDs ou versões de banco;
- alterar o layout fragmentado de `CAS/system`;
- alterar bancos ou CAS do ramo `user`;
- alterar apps, packages ou repositories de runtime;
- implementar o consumo dos artefatos da Parte 1C;
- criar migrations, importadores ou compatibilidade entre layouts.

## Critérios De Aceite

- Todos os manifestos canônicos se chamam `_entity.json`.
- O scanner reconhece somente `_entity.json` como manifesto.
- Todo conteúdo Markdown localizado vive em `_content` e corresponde exatamente
  aos seis locales canônicos.
- Toda entidade com seções declara `contentPath: "./_content"`.
- Toda entidade sem seções omite `contentPath` e não possui `_content`.
- Toda mídia editorial vive em `_media` da entidade proprietária.
- Referências estruturais usam `./_media/...` e imagens Markdown usam
  `../_media/...`.
- Nenhum arquivo sob `_media` permanece sem referência.
- `_content` e `_media` não existem sem `_entity.json` no diretório pai.
- Nomes desconhecidos iniciados por `_` são recusados com diagnóstico direto.
- Pastas organizacionais não produzem entidades nem relações implícitas.
- A identidade compilada de mídia usa o segmento `media`, sem `_media`.
- O layout compilado de CAS continua
  `system/<2-hex>/<2-hex>/<sha256>.bin`.
- Não permanecem reconhecimento duplo, aliases, fallbacks ou contratos
  paralelos de layout.
- JSON Schemas, constantes Rust, scanner, resolvedores, fixtures, testes e
  documentação concordam sobre os mesmos nomes reservados.
- `knowledge-builder validate` aceita toda a fonte canônica.
- Duas builds limpas produzem resultados determinísticos.
- O gate geral final do workspace é apresentado antes de concluir a execução.
- O diff preserva alterações preexistentes não relacionadas.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.8.1: contratos de rows e persistência](./01b8-knowledge-builder-maintainability/01-row-persistence-contracts.md).
