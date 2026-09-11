# Parte 1B.8.9: Padrões Editoriais De Seções

## Objetivo

Centralizar os mapas de seções editoriais em padrões canônicos reutilizáveis.
Cada entidade com conteúdo Markdown referencia um padrão por chave, enquanto a
ordem e as `sectionKey` pertencem exclusivamente ao registro de padrões.

```text
data/knowledge/_standards/sections.json
               |
               | sectionStandardKey
               v
<entidade>/_entity.json
<entidade>/_content/<locale>.md
               |
               v
content_json.sections[]
```

O contrato elimina a repetição dos mesmos mapas em cada `_entity.json`, mantém
os títulos na camada de i18n da interface e preserva a representação compilada
usada pelos bancos `system`.

## Pré-Requisitos

- A
  [Parte 1B.8.8: taxonomia hierárquica da vida](./08-life-hierarchy-taxonomy.md)
  está concluída.
- `data/knowledge`, a fixture mínima e a suíte do `knowledge-builder` estão
  saudáveis.
- O contrato compilado usa uma lista plana de objetos com `sectionKey` e
  `compiledMarkdown`.
- A crate `artifact-builder` não integra este escopo.

## Escopo

Esta parte altera:

- o namespace reservado de `data/knowledge`;
- os manifestos das entidades que podem possuir conteúdo editorial;
- os JSON Schemas de autoria;
- os modelos, a descoberta e a validação do `knowledge-builder`;
- a compilação Markdown e a resolução das seções;
- o digest lógico da fonte;
- inventário, contrato, operações e evidências da projeção vigente;
- a auditoria canônica, as fixtures, os testes e a documentação consumidora.

Esta parte preserva:

- os seis documentos Markdown por entidade editorial;
- a sintaxe `# <n>` dos delimitadores de seção;
- o descarte integral do título escrito no heading delimitador;
- os títulos de interface resolvidos pelo i18n a partir de `sectionKey`;
- o formato de `content_json` persistido nos bancos;
- os DDLs e as versões técnicas de `system` e `system_media`;
- a organização livre dos diretórios não reservados;
- os bancos e o CAS do ramo `user`.

## Invariantes

- Existe exatamente um registro de padrões de seção em
  `data/knowledge/_standards/sections.json`.
- O registro não é uma entidade de conhecimento e não produz row própria no
  banco `system`.
- Cada padrão possui chave globalmente única, um `entityType` e uma lista
  ordenada e não vazia de `sectionKeys`.
- A posição de uma `sectionKey` no padrão determina seu número, começando em
  `1`.
- Uma `sectionKey` não se repete dentro do mesmo padrão.
- Um mesmo `entityType` pode possuir padrões diferentes.
- Uma entidade pode referenciar somente um padrão autorizado para seu
  `entityType`.
- Entidade com `sectionStandardKey` possui `_content` com exatamente os seis
  locales.
- Entidade sem `sectionStandardKey` não possui `_content`.
- `_content` é um caminho fixo, irmão de `_entity.json`; ele não é declarado na
  entidade.
- A entidade não declara `sections`, `sectionNumber` ou `contentPath`.
- Não existem overrides, herança, composição ou seções adicionais por entidade.
- Os padrões não armazenam labels, títulos ou traduções de interface.
- O conteúdo compilado contém somente `sectionKey` e `compiledMarkdown` na ordem
  resolvida.
- O builder não infere padrão pelo diretório, pelo `entityType` nem pelas seções
  encontradas no Markdown.

## 1. Registro Canônico

Criar:

```text
data/knowledge/
└── _standards/
    └── sections.json
```

`_standards` é um namespace técnico reservado na raiz da fonte. Nenhum outro
arquivo ou subdiretório é aceito nele nesta parte.

O documento possui o contrato:

```json
{
  "schemaVersion": 1,
  "standards": [
    {
      "key": "catalog.condition.monograph",
      "entityType": "condition",
      "sectionKeys": [
        "about",
        "clinicalSigns",
        "diagnosis",
        "management",
        "prevention",
        "references"
      ]
    }
  ]
}
```

Regras do registro:

- `schemaVersion` aceita somente a versão canônica suportada;
- `standards` é não vazio e ordenado lexicograficamente por `key`;
- `key` usa identificador semântico estável, aparado e sem controle;
- `entityType` pertence ao vocabulário fechado de entidades com conteúdo
  editorial;
- `sectionKeys` contém entre 1 e 64 chaves semânticas únicas;
- as chaves são aparadas, não vazias e usam o mesmo padrão lexical das chaves
  atuais;
- objetos e documento recusam propriedades adicionais;
- todo padrão possui ao menos uma entidade consumidora no conjunto canônico.

O registro inicial contém exatamente os cinco padrões correspondentes aos mapas
editoriais atuais:

| `key` | `entityType` | `sectionKeys`, em ordem |
|---|---|---|
| `catalog.activeIngredient.monograph` | `active_ingredient` | `about`, `uses`, `safety`, `references` |
| `catalog.condition.monograph` | `condition` | `about`, `clinicalSigns`, `diagnosis`, `management`, `prevention`, `references` |
| `catalog.manufacturer.profile` | `manufacturer` | `about`, `portfolio`, `support`, `references` |
| `catalog.product.monograph` | `product` | `about`, `presentations`, `indications`, `administration`, `interactions`, `pharmacology`, `studies`, `videos`, `distributors`, `references` |
| `life.profile` | `life` | `characteristics`, `morphology`, `behavior`, `diseases`, `references` |

Uma necessidade editorial com outro mapa cria outro padrão explícito. Ela não
altera um padrão compartilhado apenas para atender uma entidade.

## 2. Contrato Das Entidades

Entidades com conteúdo editorial declaram somente:

```json
{
  "sectionStandardKey": "catalog.condition.monograph"
}
```

Aplicar `sectionStandardKey` como propriedade opcional a `product`,
`manufacturer`, `active_ingredient`, `condition` e `life`. Os demais tipos não
aceitam essa propriedade nesta parte.

Para cada entidade:

- referência presente exige padrão existente;
- o `entityType` da entidade deve ser igual ao `entityType` do padrão;
- referência presente exige `_content` diretamente ao lado de `_entity.json`;
- referência ausente exige ausência de `_content`;
- `sections` e `contentPath` não fazem parte de nenhum schema de entidade;
- a referência não admite lista, fallback ou padrão implícito.

Não persistir `sectionStandardKey` em coluna ou tabela própria. A chave organiza
a autoria e orienta a compilação; o resultado resolvido já carrega a estrutura
necessária ao runtime.

## 3. JSON Schema E Modelos Rust

Adicionar um schema fechado para o registro, por exemplo:

```text
tools/knowledge-builder/schemas/source/section-standards.schema.json
```

O schema comum passa a fornecer somente a definição de
`sectionStandardKey`. Remover dele as definições autorais de `sections`,
`sectionNumber` e `contentPath`.

Nos schemas de entidade:

- remover `sections` da lista de propriedades obrigatórias;
- remover `sections` e `contentPath` das propriedades aceitas;
- aceitar `sectionStandardKey` somente nos cinco tipos autorizados;
- manter `additionalProperties: false` como recusa integral do formato que não
  pertence ao contrato atual.

No modelo Rust, introduzir tipos equivalentes a:

```rust
pub struct SectionStandardsDocument {
    pub schema_version: u32,
    pub standards: Vec<SectionStandard>,
}

pub struct SectionStandard {
    pub key: String,
    pub entity_type: String,
    pub section_keys: Vec<String>,
}

pub struct ResolvedSection {
    pub section_key: String,
    pub section_number: u32,
}
```

`ResolvedSection` é interno e derivado da posição em `sectionKeys`. Ele não é
desserializado dos manifestos. `CanonicalEntity` expõe a referência opcional por
um método comum, e `ValidatedSource` mantém um índice imutável por chave para
resolução eficiente.

Eliminar a enumeração de seções permitidas por `entityType` atualmente mantida
em Rust. O registro validado é a única fonte dos mapas e das ordens.

## 4. Descoberta E Segurança Do Filesystem

A descoberta segue esta ordem:

1. localizar o registro no caminho canônico fixo;
2. exigir arquivo regular, sem symlink;
3. validar JSON e schema antes de resolver entidades;
4. construir o índice de padrões;
5. descobrir e validar `_entity.json`;
6. resolver cada `sectionStandardKey`;
7. validar os diretórios `_content` das entidades consumidoras.

Atualizar o namespace fechado da fonte para reconhecer `_standards` somente na
raiz e `sections.json` somente dentro dele. Recusar:

- registro ausente, duplicado ou fora do caminho canônico;
- arquivo adicional ou subdiretório dentro de `_standards`;
- symlink ou arquivo especial;
- `_standards` dentro de uma entidade;
- `_content` sem referência a padrão;
- referência a padrão sem `_content`;
- qualquer tentativa de resolver caminhos a partir do conteúdo do JSON.

O caminho editorial deixa de ser um campo de entrada. A resolução usa somente o
diretório proprietário de `_entity.json` unido ao nome reservado `_content`.

## 5. Compilação Markdown

Para cada entidade com padrão:

1. obter o padrão pelo `sectionStandardKey`;
2. derivar `ResolvedSection` para cada posição do array;
3. abrir exatamente um documento por locale em `_content`;
4. analisar o Markdown por AST CommonMark;
5. reconhecer headings de nível 1 iniciados por inteiro positivo;
6. exigir a sequência exata `1..=sectionKeys.len()`;
7. associar cada número à chave da posição correspondente;
8. descartar integralmente o heading delimitador;
9. normalizar e serializar o corpo permitido;
10. produzir a lista ordenada de seções compiladas.

O texto opcional escrito depois do número não define título, chave ou semântica
e não chega ao banco. O i18n da interface continua responsável pelo título
associado à `sectionKey`.

O documento compilado permanece:

```json
{
  "schemaVersion": 1,
  "sections": [
    {
      "sectionKey": "about",
      "compiledMarkdown": "..."
    }
  ]
}
```

`CONTENT_DOCUMENT_SCHEMA_VERSION`, o DDL e as rows de conteúdo permanecem sem
alteração.

## 6. Digest Lógico E Versões

Adicionar o schema do registro à impressão digital dos schemas da fonte. O
modelo lógico usado no digest contém:

- o registro de padrões em ordem canônica;
- cada entidade com seu `sectionStandardKey`, quando presente;
- os documentos já compilados por entidade e locale;
- mídias e demais dados canônicos vigentes.

Incrementar `SOURCE_DIGEST_SCHEMA_VERSION` de `4` para `5`, pois a composição
lógica das declarações editoriais passa a incluir o registro compartilhado.

Manter:

```text
SECTION_STANDARDS_SCHEMA_VERSION = 1
SOURCE_ENTITY_SCHEMA_VERSION    = 1
CONTENT_DOCUMENT_SCHEMA_VERSION = 1
SYSTEM_SCHEMA_VERSION           = 7
SYSTEM_MEDIA_SCHEMA_VERSION     = 2
BUILD_RESULT_SCHEMA_VERSION     = 1
```

Não introduzir migration, conversor de versões, leitura dupla ou fallback de
formato.

## 7. Projeção E Evidência

Adaptar o pipeline vigente para operar sobre as seções resolvidas:

- o inventário esperado reconhece `sectionStandardKey` como a declaração
  editorial da entidade;
- cada seção resolvida continua produzindo alvo distinto por entidade, locale e
  `sectionKey`;
- a proveniência distingue a referência feita pela entidade da definição
  pertencente ao registro;
- um padrão compartilhado pode originar seções de várias entidades sem duplicar
  sua identidade canônica;
- operações e recibos continuam comprovando a compilação dos seis documentos;
- `content_json` continua sendo a única persistência do resultado editorial.

Inventário e contrato derivam do mesmo `ValidatedSource`, mas continuam
independentes entre si. Não criar um segundo mapa de seções permitidas dentro de
`projection`, writers ou verificadores.

Writers SQLite, readers dos artefatos e verificação integral permanecem
responsáveis pelo mesmo formato compilado. Nenhuma tabela ou coluna é criada
para os padrões de autoria.

## 8. Conversão Da Fonte Canônica

Aplicar uma transformação JSON estruturada a todos os `_entity.json`:

- entidade com lista de seções não vazia recebe a chave do padrão equivalente;
- entidade com lista vazia não recebe `sectionStandardKey`;
- remover `sections` de todas as entidades;
- remover `contentPath` de todas as entidades;
- preservar os demais campos e sua ordem canônica;
- preservar integralmente todos os Markdown e arquivos de mídia.

O conjunto canônico resulta em cinco padrões e dezessete entidades editoriais.
Essas quantidades são verificadas contra os dados concretos durante a
implementação, sem criar conteúdo ausente por inferência.

Atualizar também `fixtures/valid-minimal` e todas as fixtures negativas. Não
manter fixture dedicada ao formato que não pertence ao contrato atual.

## 9. Auditoria E Inventário

Atualizar `scripts/audit-knowledge.mjs` para:

- carregar e validar o registro fixo;
- validar unicidade, ordem, tipos autorizados e `sectionKeys`;
- resolver as referências das entidades;
- conferir a correspondência entre referência e `_content`;
- calcular documentos e seções a partir dos padrões resolvidos;
- recusar `sections` e `contentPath` em qualquer entidade;
- manter a geração explícita de `inventory.json` e `audit-report.json`.

O inventário passa a registrar, dentro de `editorial`:

```json
{
  "sectionStandards": 5,
  "standardReferences": 17,
  "entities": 17,
  "documents": 102,
  "documentsPerLocale": 17,
  "sections": 77
}
```

Incrementar para `2` o `schemaVersion` de `inventory.json` e
`audit-report.json`, pois o relatório passa a cobrir explicitamente padrões e
referências. As contagens continuam geradas pelo script, nunca editadas à mão.

## 10. Testes

### Schemas E Fonte

Cobrir:

- registro válido com os cinco padrões;
- registro ausente, duplicado, malformado ou em caminho incorreto;
- propriedades adicionais;
- chaves duplicadas ou fora de ordem;
- `entityType` não autorizado;
- `sectionKeys` vazias, duplicadas, inválidas ou acima do limite;
- padrão sem consumidor;
- referência inexistente ou de outro `entityType`;
- entidade com referência e sem `_content`;
- entidade sem referência e com `_content`;
- presença recusada de `sections`, `sectionNumber` ou `contentPath`.

### Markdown E Compilação

Cobrir:

- duas entidades consumindo o mesmo padrão;
- padrões diferentes para o mesmo `entityType` em fixture focada;
- associação posicional de `1..=N` às chaves do padrão;
- heading com somente número;
- heading com texto adicional integralmente descartado;
- número ausente, repetido, descontínuo, fora de ordem ou adicional;
- conteúdo antes da primeira seção;
- igualdade do formato final de `content_json`.

### Digest, Projeção E Artefatos

Cobrir:

- alteração de chave, ordem ou composição de um padrão muda o digest;
- alteração da referência de uma entidade muda o digest;
- organização de diretórios comuns não muda o digest;
- todas as declarações editoriais possuem cobertura e owner;
- os seis locales compilam o mesmo mapa estrutural;
- os doze bancos passam por `foreign_key_check` e `integrity_check`;
- duas construções independentes são byte a byte determinísticas;
- schemas `7` e `2` permanecem nos bancos correspondentes.

## 11. Documentação E Planos Consumidores

Atualizar:

- `data/knowledge/README.md` com `_standards`, `sectionStandardKey` e a convenção
  fixa de `_content`;
- `tools/knowledge-builder/README.md` com carregamento, validação, compilação e
  digest dos padrões;
- o índice `docs/plans/hub-server/README.md`;
- a Parte 1B.9 para receber padrões já resolvidos no adaptador veterinário;
- a Parte 1C somente onde precisar distinguir autoria de conteúdo compilado;
- a Parte 3 para descrever a mesma fonte canônica.

Documentação de autoria não apresenta `sections`, `sectionNumber` ou
`contentPath` como campos de `_entity.json`. Documentação do banco continua
apresentando `content_json.sections` como resultado compilado.

## 12. Sequência De Execução

1. Executar auditoria, validação, testes e build de baseline.
2. Criar o schema e os tipos do registro de padrões.
3. Implementar descoberta segura e índice validado.
4. Alterar os schemas e modelos das entidades para `sectionStandardKey`.
5. Resolver padrões e a convenção fixa de `_content`.
6. Adaptar o parser Markdown para receber as seções resolvidas.
7. Adaptar digest, contagens, inventário, contrato, operações e evidências.
8. Converter a fonte canônica e as fixtures por JSON estruturado.
9. Atualizar auditoria, inventários, documentação e planos consumidores.
10. Executar testes específicos, dois builds reais e o gate geral.

Cada etapa remove integralmente a representação substituída dentro de seu
escopo. A implementação final possui apenas o registro compartilhado e as
referências por chave.

## 13. Validação

Executar, no mínimo:

```text
node scripts/audit-knowledge.mjs --write-inventory --write-report
pnpm knowledge:audit
pnpm knowledge:validate
cargo fmt --package knowledge-builder -- --check
cargo check -p knowledge-builder --all-targets
cargo clippy -p knowledge-builder --all-targets -- -D warnings
cargo test -p knowledge-builder --all-targets --locked
git diff --check
```

Executar duas construções da fonte completa em diretórios temporários distintos
e comparar bancos, manifests, relatórios e conjunto CAS. Consultar
`foreign_key_check` e `integrity_check` nos doze bancos produzidos.

Depois dos testes específicos, executar a skill `$validate-workspace` como gate
geral da implementação.

## Fora De Escopo

- adicionar títulos de seção ao registro;
- mover traduções de títulos para `data/knowledge`;
- permitir override, herança, composição ou seção opcional por entidade;
- inferir padrão por tipo, pasta ou Markdown;
- alterar o formato compilado de `content_json`;
- alterar DDL ou versão dos bancos;
- modificar conteúdo editorial dos Markdown;
- criar migration, conversor persistente ou suporte ao formato substituído;
- implementar `artifact-builder` ou alterar consumidores do app.

## Critérios De Aceite

- Existe uma única fonte canônica dos mapas editoriais.
- Os cinco padrões atuais estão definidos no registro reservado.
- Entidades editoriais possuem somente `sectionStandardKey` como declaração de
  estrutura.
- Entidades sem conteúdo não carregam declaração vazia.
- `_content` é resolvido exclusivamente pela convenção fixa.
- Não existem `sections`, `sectionNumber` ou `contentPath` em `_entity.json`.
- Ordem e números são derivados deterministicamente do padrão.
- Títulos continuam pertencendo ao i18n da interface.
- `content_json` mantém o contrato vigente.
- Não existe tabela, coluna ou row de padrão editorial.
- Digest, auditoria e evidências incluem o novo contrato.
- A fonte completa e a fixture mínima passam integralmente.
- Dois builds completos são determinísticos.
- O workspace passa pela skill `$validate-workspace`.

## Próxima Parte

Após cumprir todos os critérios, seguir para a
[Parte 1B.9: `artifact-builder` e adaptador de conhecimento](../01b9-artifact-builder/README.md).
