# Parte 1B.8.3: Verificação Integral Decomposta

## Objetivo

Decompor a verificação integral em componentes coesos sob uma única fachada. O
build novo e a reutilização executam a mesma sequência de provas, sem alterar o
staging e sem compartilhar SQL de leitura com os writers.

## Pré-Requisito

A [Parte 1B.8.2](./02-ledger-confirmed-receipts.md) está concluída. O ledger
recebe recibos confirmados e os artefatos preservam o contrato vigente.

## Estrutura Alvo

```text
verification/
├── mod.rs
├── readers/
│   ├── mod.rs
│   ├── metadata.rs
│   ├── system.rs
│   └── system_media.rs
└── artifact/
    ├── mod.rs
    ├── identity.rs
    ├── tree.rs
    ├── manifest.rs
    ├── database.rs
    ├── media.rs
    ├── cas.rs
    └── evidence.rs
```

Os nomes podem ser ajustados quando duas responsabilidades forem naturalmente
inseparáveis, mas o arquivo raiz `src/artifact_verifier.rs` é removido. Não
manter outra fachada ou reexport paralelo para o mesmo verificador.

## 1. Fachada Única

`verification::artifact::ArtifactVerifier` permanece o único ponto chamado por:

- build em staging;
- reutilização de versão finalizada.

A fachada determina a ordem das provas e passa resultados tipados adiante. Ela
não implementa queries, hashing de mídia ou travessia recursiva diretamente.

## 2. Fatos Verificados

Cada estágio recebe entradas explícitas e retorna fatos imutáveis, por exemplo:

```text
VerifiedIdentity
VerifiedTree
VerifiedManifest
VerifiedDatabases
VerifiedMedia
VerifiedCas
VerifiedEvidence
```

Esses tipos carregam apenas dados já comprovados e necessários ao próximo
estágio. Não usar estado global, singleton, cache persistente ou interior
mutability para compartilhar resultados.

Quando dois verificadores precisam dos mesmos dados de um banco, a leitura
ocorre uma vez e produz uma representação tipada compartilhada. Isso não permite
que o reader use SQL do writer.

## 3. Ordem Das Provas

A fachada executa:

1. identidade do contexto, versões e descritores públicos;
2. árvore exata de arquivos e diretórios;
3. schema do manifest, caminhos declarados e checksums físicos;
4. integridade, identidade técnica e fingerprint dos bancos;
5. releitura semântica integral das rows;
6. propriedades das mídias e thumbnails;
7. referências e conjuntos CAS por locale e global;
8. relatório, ownership, cobertura e evidence digest.

Uma etapa não confia em declaração ainda não verificada. Checksums não
substituem a releitura semântica; releitura semântica não substitui integridade,
fingerprint ou cobertura física.

## 4. Readers Independentes

Readers usam queries `SELECT` literais e fechadas. Eles retornam `MetadataRow`,
`SystemRow` e `SystemMediaRow` completas e usam os descritores da Parte 1B.8.1
somente para identidade e vocabulário tipado.

É proibido:

- gerar `SELECT` a partir de `INSERT`;
- importar funções do módulo de writers;
- ignorar colunas para obter equivalência;
- corrigir ou normalizar rows depois da leitura;
- aceitar tabela adicional desconhecida.

## 5. Verificadores Coesos

- `identity`: contexto, versões, filenames e descritores CAS.
- `tree`: conjunto exato e caminhos relativos normalizados.
- `manifest`: JSON Schema, declarações, tamanhos, checksums e cobertura.
- `database`: PRAGMAs, integridade, foreign keys, fingerprints e rows.
- `media`: metadata, bytes de thumbnail, dimensões, MIME e referências.
- `cas`: SHA-256 dos objetos, disposição e conjuntos por locale/global.
- `evidence`: relatório, expected/owned/observed, contagens e digests.

Nenhum verificador escreve, remove, renomeia ou corrige arquivos.

## 6. Testes Específicos

Criar testes focados para cada verificador e preservar a matriz integral de
adulterações. Cobrir ao menos:

- identidade e versão divergentes;
- arquivo ausente, adicional e caminho não canônico;
- manifest e checksum recalculados sobre conteúdo incorreto;
- schema, application ID, user version e fingerprint divergentes;
- row semanticamente alterada com checksums atualizados;
- thumbnail, MIME, tamanho e dimensões divergentes;
- referência sem mídia e objeto CAS ausente ou adulterado;
- conjunto CAS de locale ou global divergente;
- relatório e evidence digest divergentes;
- igualdade de comportamento entre build novo e reutilização.

Executar os testes de cada componente, a suíte integral do crate e o gate geral
`$validate-workspace`.

## Fora Do Escopo

- alterar formatos públicos ou schemas;
- mudar writers, ownership ou inventário esperado;
- alterar política de mídia ou CAS;
- introduzir erros públicos estruturados;
- elevar a versão do crate.

## Critérios De Aceite

- `src/artifact_verifier.rs` não existe.
- Existe uma única fachada `verification::artifact::ArtifactVerifier`.
- Build novo e reutilização chamam a mesma fachada.
- Cada verificador possui entradas, saída e responsabilidade explícitas.
- Bancos não são relidos desnecessariamente por componentes diferentes.
- Readers permanecem independentes dos writers e comparam rows integralmente.
- Nenhum componente altera o staging examinado.
- Todos os cenários de adulteração continuam recusados.
- Os testes específicos e o gate geral da skill `$validate-workspace` passam.
- O estado Git contém somente mudanças pertencentes a esta parte.

## Próxima Parte

Após cumprir os critérios, seguir para a
[Parte 1B.8.4: erros estruturados e fronteiras](./04-structured-errors-boundaries.md).
