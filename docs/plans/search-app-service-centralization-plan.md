# Plano De Centralização De Search Em App-Services

## Objetivo

Transformar `@vet/app-services/search` na central reutilizável de buscas do ecossistema. O package deve concentrar normalização, scoring, ranking, filtros, read models e composição entre domínios, permitindo que `vet-app` e futuros apps consumam APIs de busca sem duplicar regras em rotas.

`search` deve ser uma camada de aplicação. Ele pode compor dados de `@vet/modules`, `@vet/core-local` e `@vet/types`, respeitando o DAG atual:

```text
@vet/types
@vet/core-local
@vet/modules
@vet/app-services
apps/vet-app
```

## Resultado Esperado

Ao final da refatoração, barras de pesquisa e filtros de procura reutilizáveis devem consumir `@vet/app-services/search` quando a busca for uma experiência de aplicação ou puder servir mais de um app.

O app continua responsável por tela, rota, navegação, query params, ícones, labels traduzidas, estados visuais e componentes Svelte.

## Fronteiras Arquiteturais

### `@vet/app-services/search`

Responsável por:

- normalizar termos de busca;
- calcular relevância, score e ordenação;
- filtrar coleções por query e filtros estruturados;
- compor buscas entre domínios;
- consultar SQLite quando a busca depender de read model transversal;
- hidratar resultados quando isso fizer parte do contrato de busca;
- expor APIs públicas por alvo de busca.

### `@vet/modules`

Responsável por:

- manter repositories e services donos do domínio;
- expor APIs públicas dos módulos;
- manter buscas internas que fazem parte natural do domínio;
- não importar `@vet/app-services`.

Se um componente dentro de `packages/modules` precisar apenas de matcher local, ele deve continuar usando helpers puros de `@vet/types/domain/search`.

### `@vet/types`

Responsável por:

- tipos compartilhados de search quando forem contratos entre packages;
- helpers puros mínimos, como normalização, matchers simples e controladores de debounce/concorrência;
- nenhum acesso a banco, i18n runtime, rota, Svelte ou storage.

### `@vet/ui`

Responsável por:

- componentes visuais de busca, como `DebouncedSearchField` e `SearchableSelect`;
- nenhum conhecimento sobre domínios veterinários, SQLite, ranking ou rotas.

### `apps/vet-app`

Responsável por:

- consumir `@vet/app-services/search`;
- mapear resultados para `href`;
- controlar query params e estado visual da rota;
- escolher labels, ícones, classes CSS e componentes;
- persistir estado local de tela quando a persistência for específica do app.

## API Pública Desejada

Criar uma API central com alvo explícito:

```ts
await querySearch({
	target: 'global',
	query,
	include: ['owner', 'pet', 'breed', 'product', 'manufacturer', 'activeIngredient', 'condition'],
	limit: 80
});
```

Para catálogo:

```ts
await querySearch({
	target: 'catalog',
	query,
	filters: {
		kind: 'product',
		type: productTypeFilter,
		species: 'canine',
		manufacturer: manufacturerFilter,
		region: regionFilter
	},
	limit: 120
});
```

Para raças:

```ts
await querySearch({
	target: 'breed_reference',
	query,
	filters: {
		species: 'canine',
		size: sizeFilter,
		origin: originFilter
	}
});
```

Para seleção de owners:

```ts
await querySearch({
	target: 'owners',
	query,
	limit: 100
});
```

Para vincular pet existente a owner:

```ts
await querySearch({
	target: 'pets_for_owner_link',
	ownerId,
	query,
	limit: 20
});
```

Para produtos de tratamento:

```ts
await querySearch({
	target: 'treatment_catalog',
	query,
	filters: {
		source: 'user',
		type: productTypeFilter,
		kind: treatmentKind,
		species: 'canine'
	}
});
```

Cada alvo pode retornar um tipo específico, mantendo tipagem forte. A busca global retorna `SearchResult[]` sem `href`. As buscas de catálogo, raças, owners, pets e produtos de tratamento podem retornar itens do domínio filtrados e ordenados, acompanhados de metadados quando útil.

## Estrutura Recomendada

```text
packages/app-services/src/search/
├── index.ts
├── search-query.ts
├── search.types.ts
├── global-search.service.ts
├── registry-search.read-model.ts
├── knowledge-search.service.ts
├── treatment-catalog-search.service.ts
└── recent-search.service.ts
```

### `search-query.ts`

Motor puro de busca sobre coleções em memória.

Responsabilidades:

- receber rows/items;
- receber campos pesquisáveis por item;
- aplicar query textual;
- aplicar filtros estruturados;
- calcular score por campo;
- ordenar por relevância ou por comparador informado;
- aplicar limite;
- devolver resultado previsível e testável.

Formato esperado:

```ts
queryCollectionSearch({
	query,
	items,
	fields: (item) => ({
		primary: [item.name],
		support: [item.manufacturerName],
		metadata: item.regions,
		details: item.sections
	}),
	filters,
	sort,
	limit,
	locale
});
```

### `global-search.service.ts`

API de busca global.

Responsabilidades:

- substituir a fachada atual de busca geral;
- compor owners, pets, raças, produtos, fabricantes, princípios ativos e condições;
- aplicar limite final;
- manter `SearchResult` sem rota;
- expor compatibilidade temporária com `searchEverywhere` se isso facilitar a migração.

### `registry-search.read-model.ts`

Read models SQL de busca para dados operacionais de cadastro.

Responsabilidades:

- owners;
- pets;
- pets disponíveis para vínculo com owner;
- filtros de resultados ativos;
- hidratação necessária para resultados de busca, como avatar e contatos, quando isso fizer parte do contrato.

### `knowledge-search.service.ts`

Busca de referência e catálogo.

Responsabilidades:

- raças;
- produtos;
- fabricantes;
- princípios ativos;
- condições;
- filtros de catálogo usados em páginas de referência;
- textos pesquisáveis de catálogo e raças.

### `treatment-catalog-search.service.ts`

Busca de produtos usados em tratamentos.

Responsabilidades:

- produtos de tratamento do sistema e do usuário;
- filtros por origem, tipo, kind, espécie e visibilidade;
- uso por telas de configuração e por fluxos clínicos que precisem selecionar produtos.

### `recent-search.service.ts`

Helpers para resultados recentes.

Responsabilidades:

- normalizar resultado persistível;
- remover dados binários antes de persistir;
- filtrar resultados que continuam ativos;
- hidratar resultados recentes para renderização.

Storage concreto fica no app. Se necessário, este service recebe um adapter simples em vez de acessar `localStorage` diretamente.

## Sequência De Implementação

### 1. Inventário E Baseline

- Mapear todos os usos atuais de `searchEverywhere`, `filterActiveSearchResults`, `searchOwners`, `searchExistingPetsForOwner`, `createSearchMatcher`, `DebouncedSearchField` e `SearchableSelect`.
- Rodar `npm run check` e `npm run test:run`.
- Registrar quais rotas possuem lógica própria de filtragem textual ou ranking.

### 2. Tipos E Contratos Públicos

- Definir `SearchTarget`.
- Definir inputs tipados para cada alvo.
- Definir retornos tipados para cada alvo.
- Manter `SearchResult` sem `href`.
- Expor tudo via `@vet/app-services/search`.

### 3. Motor Genérico De Busca

- Criar `search-query.ts`.
- Centralizar normalização, termos, score, ordenação e limite.
- Cobrir com testes unitários:
  - query vazia;
  - acento e caixa;
  - score por campo primário, suporte, metadata e detalhes;
  - múltiplos termos;
  - filtros estruturados;
  - limite e ordenação.

### 4. Busca Global

- Reorganizar a busca global para usar `querySearch({ target: 'global' })`.
- Manter a página `/search` consumindo resultado sem rota.
- Manter o mapeamento de `href` em `apps/vet-app`.
- Mover normalização, filtro de ativos e hidratação de recentes para helpers de `@vet/app-services/search`, com storage controlado pelo app.

### 5. Busca De Catálogo E Raças

- Migrar a regra de filtragem de catálogo para `querySearch({ target: 'catalog' })`.
- Migrar a regra de filtragem de raças para `querySearch({ target: 'breed_reference' })`.
- Manter em `apps/vet-app`:
  - route state;
  - seleção visual;
  - cards;
  - summary sidebar;
  - mapa de origem;
  - labels e ícones.

### 6. Busca De Produtos De Tratamento

- Migrar a regra de busca/filtro da tela de produtos para `querySearch({ target: 'treatment_catalog' })`.
- Preservar no app a edição, criação, imagens, confirmação, status e layout.
- Reaproveitar a mesma API em fluxos clínicos quando houver seleção de produtos por busca.

### 7. Busca De Owners E Pets Para Fluxos De Cadastro

- Migrar a seleção de owner em criação de pet para `querySearch({ target: 'owners' })`.
- Migrar a busca de pet existente para vínculo com owner para `querySearch({ target: 'pets_for_owner_link' })`.
- Preservar no app:
  - controle de loading;
  - seleção;
  - navegação;
  - mensagens;
  - componentes de avatar.

### 8. Compatibilidade E Limpeza

- Remover duplicações de scoring e texto pesquisável das rotas.
- Manter helpers puros em `@vet/types/domain/search` quando forem usados por `@vet/ui` ou `@vet/modules`.
- Evitar imports de `@vet/app-services` em `@vet/modules`, `@vet/ui`, `@vet/types` e `@vet/core-local`.
- Revisar barrels e exports.

### 9. Testes E Verificação

- Adicionar testes unitários para o motor de busca.
- Adicionar testes para targets principais:
  - global;
  - catalog;
  - breed_reference;
  - treatment_catalog.
- Rodar:
  - `npm run check`;
  - `npm run test:run`;
  - `git diff --check`.

## Critérios De Aceite

- `@vet/app-services/search` expõe uma API pública central para buscas reutilizáveis.
- Rotas não mantêm scoring, ranking ou composição transversal de busca.
- `SearchResult` não possui `href`.
- `apps/vet-app` decide navegação e apresentação.
- `packages/modules` não importa `@vet/app-services`.
- Catálogo, raças, busca global, produtos de tratamento e fluxos de cadastro usam APIs de search quando a busca for reutilizável.
- Componentes de UI continuam sem conhecimento de domínio.
- O comportamento visível das buscas permanece equivalente ou mais consistente.
- Checks e testes passam.

## Pontos Para Decisão Antes Da Implementação

- Definir se a API pública principal será apenas `querySearch` com overloads ou também facades nomeadas como `searchGlobal`, `searchCatalog` e `searchBreedReferences`.
- Definir se `recent-search.service.ts` entra nesta fase ou se fica para uma fase curta separada.
- Definir se a seleção de produtos dentro de componentes clínicos entra junto com `treatment_catalog` ou fica para quando o fluxo clínico for refatorado.
