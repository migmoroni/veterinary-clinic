# Arquitetura Modular Do Workspace

Este documento define a organização modular do Veterinary Clinic. Ele serve
como referência para manutenção, novas features e extrações de código dentro do
workspace.

## Mapa Do Workspace

```text
apps/
  vet-app/

packages/
  types/
  core-local/
  ui/
  modules/
  app-services/
  engine/
```

`apps/vet-app` é o aplicativo SvelteKit/Tauri. `packages/` contém as partes
reutilizáveis do produto: contratos, infraestrutura local, UI, módulos de
negócio, serviços de aplicação e motor nativo.

## DAG De Dependências

O fluxo de dependências TypeScript segue esta ordem:

```text
@vet/types <- @vet/core-local <- @vet/ui <- @vet/modules <- @vet/app-services <- apps/vet-app
```

Cada item pode importar apenas pacotes à esquerda dele. Isso mantém o grafo
acíclico e permite que cada camada seja compreendida sem depender das camadas de
composição.

Regras do DAG:

- `@vet/types` não importa nenhum pacote do workspace.
- `@vet/core-local` importa `@vet/types`.
- `@vet/ui` importa `@vet/types` e `@vet/core-local` quando precisa de
  utilitários locais genéricos.
- `@vet/modules` importa `@vet/types`, `@vet/core-local` e `@vet/ui`.
- `@vet/app-services` importa `@vet/types`, `@vet/core-local` e APIs públicas
  de `@vet/modules`.
- `apps/vet-app` importa os packages e compõe rotas, navegação, estados de tela
  e fluxos específicos do app.

`@vet/app-services` é headless. Mesmo estando acima de `@vet/ui` no DAG, ele
não importa Svelte, componentes, classes CSS, ícones, navegação, stores visuais
ou `$lib`.

## Responsabilidade De Cada Parte

| Parte | Responsabilidade |
| --- | --- |
| `apps/vet-app` | Shell SvelteKit/Tauri, rotas, layouts, navegação, estado visual, stores do app, adaptação de dados para tela e composição entre packages. |
| `packages/types` | Contratos puros, tipos de domínio, limites de campos, constantes determinísticas e helpers sem efeito colateral. |
| `packages/core-local` | Runtime local TypeScript: cliente SQLite, migrações, repositórios de infraestrutura, i18n, preferências, mídia, wrappers de comandos nativos e integrações Tauri genéricas. |
| `packages/ui` | Componentes Svelte e primitivas visuais reutilizáveis, incluindo campos, botões, seletores, organizadores de imagem e charts genéricos. |
| `packages/modules` | Módulos de negócio por feature, com componentes de domínio, services, repositories e contratos públicos por subpath. |
| `packages/app-services` | Serviços de aplicação reutilizáveis entre apps, read models transversais, analytics, search, selectors e view models headless. |
| `packages/engine` | Motor nativo do produto para `storage`, `distribution`, `replication` e `platform`. |

## Como Decidir Onde Colocar Código

| Tipo de código | Local |
| --- | --- |
| Tipo, enum, limite de campo, contrato JSON ou helper puro de domínio | `packages/types` |
| Acesso SQLite, migração, mídia local, i18n, preferências ou wrapper Tauri genérico | `packages/core-local` |
| Componente visual genérico sem regra veterinária própria | `packages/ui` |
| Componente ou service de uma feature de negócio | `packages/modules/<módulo>` |
| Consulta, agregação ou serviço reutilizável que cruza módulos | `packages/app-services` |
| Rota, layout, URL, toast, navegação, loading visual ou composição específica do app | `apps/vet-app` |
| Persistência nativa, CAS, import/export, backup, replicação e integrações nativas reutilizáveis | `packages/engine` |

Quando uma regra parece caber em mais de um lugar, use a fronteira mais baixa
que preserva o DAG e não cria dependência com UI, rota ou app.

## `@vet/types`

`@vet/types` é a base compartilhada do domínio. Ele contém contratos e helpers
puros para áreas como:

- catálogo;
- owners;
- pets;
- medical records;
- treatments;
- search;
- analytics;
- preferências;
- i18n.

Este package não acessa SQLite, Tauri, navegador, filesystem, stores Svelte ou
componentes. Funções exportadas por `@vet/types` devem ser previsíveis,
determinísticas e fáceis de testar.

## `@vet/core-local`

`@vet/core-local` concentra a infraestrutura local TypeScript. Ele faz a ponte
entre código TypeScript e os recursos locais do app:

- cliente SQLite e execução de queries;
- migrações e versionamento de schema;
- repositórios genéricos de infraestrutura;
- mídia local e índices de mídia;
- i18n e aliases de catálogo;
- preferências;
- wrappers de comandos nativos;
- abertura de arquivos, links externos, plataforma e fontes do sistema.

Este package não contém regra visual de tela nem orquestração específica de uma
rota. Quando uma feature precisa persistir dados, ela usa `@vet/core-local` a
partir de seu módulo ou de um app-service.

## `@vet/ui`

`@vet/ui` fornece componentes e primitivas visuais reutilizáveis. Ele contém
campos, botões, selects, textareas, componentes de imagem e wrappers de charts.

Regras para `@vet/ui`:

- componentes são genéricos e independentes de rotas;
- props definem comportamento, texto e dados;
- regras clínicas ou cadastrais ficam em `@vet/modules` ou
  `@vet/app-services`;
- navegação, URL, toast e loading de página ficam em `apps/vet-app`.

## `@vet/modules`

`@vet/modules` usa package by feature. Cada módulo representa uma fronteira de
negócio e expõe apenas APIs públicas por `index.ts` e subpath exports.

Módulos de negócio:

| Módulo | Papel |
| --- | --- |
| `knowledge` | Catálogo de referência: raças, produtos, princípios ativos, condições e fabricantes. |
| `registry` | Cadastros operacionais: owners, pets e vínculos usados pelo app. |
| `medical_records` | Área clínica do pet: records, treatments e treatment protocols. |

Subpastas principais:

```text
packages/modules/src/knowledge/
  active_ingredients/
  breeds/
  conditions/
  manufacturers/
  products/

packages/modules/src/registry/
  owners/
  pets/

packages/modules/src/medical_records/
  records/
  treatments/
  treatment_protocols/
```

`treatments` e `treatment_protocols` pertencem a `medical_records`. Eles não
formam um módulo irmão de `medical_records`, pois a lógica clínica contínua vive
na fronteira do prontuário.

Regras para `@vet/modules`:

- um módulo não importa arquivos internos de outro módulo;
- integração entre módulos usa APIs públicas ou composição em
  `@vet/app-services` e `apps/vet-app`;
- repositories e services internos não são importados por caminho profundo fora
  da fronteira pública do módulo;
- componentes de domínio podem usar `@vet/ui`, mas não conhecem rotas do app.

## `@vet/app-services`

`@vet/app-services` contém serviços de aplicação headless. Ele reúne lógica
reutilizável que opera acima dos módulos de negócio e pode ser consumida por
mais de um app.

Áreas públicas:

| Subpath | Papel |
| --- | --- |
| `@vet/app-services/analytics` | API de analytics, read models, selectors e view models para análises clínicas e operacionais. |
| `@vet/app-services/search` | API central de busca, normalização, scoring, filtros e read models reutilizáveis. |

Regras para `@vet/app-services`:

- não importa `@vet/ui`;
- não importa `$lib`, `$app`, rotas ou stores visuais;
- não define `href`, classe CSS, ícone, toast ou texto de tela;
- recebe parâmetros explícitos e devolve dados estruturados;
- usa APIs públicas de `@vet/modules`;
- não importa componentes Svelte de `@vet/modules`;
- usa `@vet/core-local` para leitura local quando precisa consultar SQLite;
- mantém read models somente leitura.

`analytics` centraliza análises de dados. Rotas de dashboard consomem essa API e
decidem layout, labels, tabs, gráficos e navegação.

`search` centraliza buscas reutilizáveis. Rotas e componentes consomem essa API
e decidem apresentação, foco, seleção visual e destino de navegação.

Buscas estritamente internas de um domínio podem permanecer no módulo dono
quando fazem parte natural da API pública dele. Buscas que cruzam mais de um
domínio ou possuem regra reaproveitável entre apps pertencem a
`@vet/app-services/search`.

## `apps/vet-app`

`apps/vet-app` é o app do médico veterinário. Ele contém:

- rotas SvelteKit;
- layouts;
- stores de app;
- composição entre módulos e app-services;
- mapeamento de dados para UI;
- navegação e parâmetros de URL;
- chamadas ao shell Tauri;
- assets estáticos do app em `apps/vet-app/static`;
- `src-tauri`, com a casca Tauri e os comandos que integram o app ao núcleo
  Rust.

O app pode importar todos os packages públicos do workspace. Código de rota deve
permanecer fino: ele coordena tela, estado e navegação, enquanto regras
reutilizáveis ficam nos packages.

## `vet-engine`

`packages/engine` contém o motor nativo do produto. Ele organiza:

- `storage`: bancos ativos, conexões SQLite e CAS;
- `distribution`: importação e exportação completa;
- `replication`: backup/sincronização contínua por patches;
- `platform`: comandos nativos reutilizáveis do sistema operacional, como
  abertura no gerenciador de arquivos e listagem de fontes do sistema.

`apps/vet-app/src-tauri` registra comandos Tauri e usa o crate `vet-engine` pela
fronteira nativa. No TypeScript, o acesso a essas capacidades passa por wrappers
e services de `@vet/core-local`.

## Imports E APIs Públicas

Use imports públicos entre packages:

```ts
import { queryAnalytics } from '@vet/app-services/analytics';
import { querySearch } from '@vet/app-services/search';
import { listOwners } from '@vet/modules/registry/owners';
import { FIELD_LIMITS } from '@vet/types';
```

Evite imports profundos para arquivos internos de outro package. Um arquivo que
precisa ser consumido fora da própria pasta deve ser exposto por `index.ts` e
por `exports` no `package.json` do package.

`$lib` pertence ao app SvelteKit. Packages usam imports relativos dentro do
próprio package ou imports públicos `@vet/...` para outros packages.

## Subpath Exports

Cada package expõe uma API pública pelo campo `exports` do `package.json`.

Regras:

- exporte subpaths apenas quando eles fazem parte da API de manutenção;
- prefira subpaths por feature, como `@vet/modules/registry/owners`;
- mantenha arquivos internos acessíveis apenas dentro do package;
- ao mover uma API pública, atualize `package.json`, `index.ts` e consumidores;
- não exponha repositories internos por conveniência.

Subpaths centrais:

```text
@vet/modules/knowledge
@vet/modules/knowledge/breeds
@vet/modules/knowledge/products
@vet/modules/knowledge/active_ingredients
@vet/modules/knowledge/conditions
@vet/modules/knowledge/manufacturers
@vet/modules/registry
@vet/modules/registry/owners
@vet/modules/registry/pets
@vet/modules/medical_records
@vet/modules/medical_records/records
@vet/modules/medical_records/treatments
@vet/modules/medical_records/treatment_protocols
@vet/app-services/analytics
@vet/app-services/search
```

## Convenções De Manutenção

- Preserve o DAG ao escolher o local de uma nova lógica.
- Mantenha `apps/vet-app` como camada de composição, não como depósito de
  regras reutilizáveis.
- Mantenha `@vet/app-services` sem UI e sem navegação.
- Mantenha `@vet/modules` orientado a features de negócio.
- Mantenha `@vet/types` puro e sem dependências.
- Mantenha `@vet/core-local` focado em infraestrutura local TypeScript.
- Mantenha `vet-engine` focado em persistência nativa, distribuição,
  replicação e integrações nativas reutilizáveis.
- Ao criar novo package ou subpath, atualize a documentação de arquitetura.

## Verificações Úteis

```sh
rg -n "\$lib" packages
rg -n "@vet/app-services" packages/types/src packages/core-local/src packages/ui/src packages/modules/src
rg -n "from ['\"]@vet/modules/.*/repositories|from ['\"]@vet/modules/.*/services" apps packages/app-services/src
npm run check
npm run test:run
cargo check --workspace
```

Essas verificações ajudam a identificar imports fora da fronteira, ciclos
arquiteturais e regressões de contrato.
