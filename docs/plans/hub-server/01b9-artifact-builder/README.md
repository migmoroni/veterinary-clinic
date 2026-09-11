# Parte 1B.9: `artifact-builder` E Adaptador De Conhecimento

## Objetivo

Separar a construção determinística de artefatos da compilação do domínio
veterinário. O workspace passa a possuir uma crate reutilizável para SQLite,
CAS, integridade e publicação, enquanto `tools/knowledge-builder` permanece como
o executável que interpreta `data/knowledge`.

```text
data/knowledge
-> tools/knowledge-builder
   -> validação e compilação veterinária
   -> ArtifactBuildRequest
-> packages/artifact-builder
   -> SQLite + CAS + manifest + verificação + publicação
-> build/knowledge-artifacts
```

O motor genérico não conhece produtos, taxonomias, entidades de vida, locales
ou nomes de bancos do projeto. A tool não implementa transações, materialização
CAS, verificação estrutural ou publicação.

## Pré-Requisito

A
[Parte 1B.8.9: padrões editoriais de seções](../01b8-knowledge-builder-maintainability/09-editorial-section-standards.md)
está concluída. Entidades editoriais referenciam os mapas canônicos de
`data/knowledge/_standards/sections.json` por `sectionStandardKey`. O contrato
veterinário usa os atributos diretos
`applicableLifeStages` e `therapeuticSpectrum`, mantém descritores vacinais nos
aliases localizados do produto e representa taxonomias como florestas ordenadas
de termos. `life:type` é a única fonte de nomes e ancestralidade da vida;
`LifeEntity` possui identidade independente, guarda aliases e fatos próprios e
se associa a exatamente um termo por `typeTermKey`. Termos estruturais não
precisam possuir entidade correspondente.

## Disposição Final

```text
packages/
└── artifact-builder/
    ├── Cargo.toml
    ├── README.md
    ├── src/
    └── tests/

tools/
└── knowledge-builder/
    ├── Cargo.toml
    ├── README.md
    ├── schemas/
    ├── src/
    └── tests/
```

`artifact-builder` é uma library crate. `knowledge-builder` depende dela e
oferece a CLI `validate` e `build`. Uma CLI genérica e publicação no crates.io
não pertencem a esta parte.

## Princípios

- O contrato neutro contém variantes, bancos, tabelas, rows, objetos CAS e
  identidade do build.
- O DDL e os dados tabulares pertencem ao adaptador consumidor.
- A crate executa SQL e persiste rows, mas não interpreta regras de domínio.
- Transformações específicas continuam em código Rust do adaptador; não existe
  DSL própria de ETL.
- A fonte veterinária mantém `_entity.json`, `_content` e `_media`.
- Uma taxonomia só representa vocabulário compartilhado, hierárquico e com
  identidade semântica própria.
- A implementação final possui um único fluxo de geração.
- Não há migrations, formatos paralelos ou camadas de compatibilidade.

## Orçamento De Complexidade

A soma do código de produção em `packages/artifact-builder/src` e
`tools/knowledge-builder/src` tem alvo de até 10.000 linhas Rust, sem contar
testes, DDLs, schemas e fixtures. Ultrapassar esse limite exige interromper a
parte em execução e apresentar ao usuário quais responsabilidades concretas
exigem o aumento.

Esse orçamento não autoriza compactação artificial, macros opacas, arquivos
minificados ou perda de validações essenciais. Arquivos de produção acima de 600
linhas são decompostos por responsabilidade ou justificados explicitamente no
README proprietário.

## Subpartes

1. [Parte 1B.9.1: contrato neutro e fronteiras](./01-neutral-contract.md)
2. [Parte 1B.9.2: motor genérico de artefatos](./02-generic-engine.md)
3. [Parte 1B.9.3: adaptador veterinário](./03-veterinary-adapter.md)
4. [Parte 1B.9.4: fechamento e documentação](./04-closure.md)

As quatro subpartes são executadas em ordem. Nenhuma delas inicia a Parte 1C.

## Resultado Esperado

```text
outro projeto ---------------------------┐
                                        v
dados tabulares -> ArtifactBuildRequest -> artifact-builder -> artefatos
                                        ^
data/knowledge -> knowledge-builder -----┘
```

Um segundo consumidor comprova que a API é neutra por meio de uma fixture
genérica da própria crate. Não é criado outro produto ou executável apenas para
demonstrar reutilização.

## Próxima Parte

Após concluir as quatro subpartes, seguir para a
[Parte 1C: consumo local dos artefatos `system`](../01c-app-system-consumption.md).
