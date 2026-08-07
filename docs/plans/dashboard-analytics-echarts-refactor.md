# Plano: Dashboard Analítico Com Apache ECharts

## Objetivo

Refatorar o dashboard analítico para uma estrutura mais clara, rápida e reutilizável entre apps do ecossistema, usando Apache ECharts como motor visual de gráficos.

O dashboard passa a ter:

- uma rota real para a visão geral analítica da clínica;
- rotas especializadas para vacinas e antiparasitários;
- lógica analítica em `@vet/app-services/analytics`;
- contratos de gráficos em `@vet/types`;
- componentes visuais de gráficos em `@vet/ui/charts`;
- composição final das telas em `apps/vet-app`.

## Decisões De Rota

A visão geral nova deve viver em uma rota própria e real:

```text
apps/vet-app/src/routes/dashboard/overview/+page.svelte
```

As rotas mantidas no dashboard são:

```text
/dashboard/overview
/dashboard/vaccines
/dashboard/antiparasitics
```

As páginas focadas em pets e owners saem do dashboard analítico:

```text
apps/vet-app/src/routes/dashboard/pets/+page.svelte
apps/vet-app/src/routes/dashboard/owners/+page.svelte
```

A rota de estudo geral atual também sai da navegação do dashboard:

```text
apps/vet-app/src/routes/dashboard/general/+page.svelte
```

Não criar redirecionamentos para substituir essas páginas. Os links do app devem apontar diretamente para as rotas existentes.

## Fronteiras Arquiteturais

O fluxo de dependências deve continuar unidirecional:

```text
@vet/types
  -> @vet/ui
  -> @vet/app-services
  -> apps/vet-app
```

Na prática:

- `@vet/types` define contratos puros;
- `@vet/ui/charts` renderiza gráficos e importa apenas `@vet/types` e `echarts`;
- `@vet/app-services/analytics` monta os modelos analíticos consumíveis por tela;
- `apps/vet-app` aplica tradução, rotas, ícones, estado visual e layout.

`@vet/ui/charts` não deve importar `@vet/app-services`, stores do app, `$app`, `@vet/core-local/i18n` ou módulos de negócio.

`@vet/app-services/analytics` não deve importar Svelte, componentes, `$app`, `window`, classes CSS ou ícones.

## Dependência Visual

Adicionar Apache ECharts como dependência do pacote UI:

```text
packages/ui/package.json
```

A instalação deve ser feita via npm workspace, mantendo a versão registrada no lockfile:

```bash
npm install --workspace @vet/ui echarts
```

Não baixar ECharts manualmente do GitHub para dentro do repositório.

## Contratos De Gráficos

Criar contratos genéricos em `@vet/types`, por exemplo:

```text
packages/types/src/domain/analytics/charts.ts
```

Contratos sugeridos:

```ts
export type AnalyticsChartTone =
	| 'neutral'
	| 'success'
	| 'info'
	| 'warning'
	| 'danger';

export interface AnalyticsChartDatum {
	key: string;
	label: string;
	value: number;
	percent?: number;
	tone?: AnalyticsChartTone;
	href?: string;
}

export interface AnalyticsChartModel {
	data: AnalyticsChartDatum[];
	total: number;
}

export interface AnalyticsBarChartModel extends AnalyticsChartModel {
	orientation: 'horizontal' | 'vertical';
}

export interface AnalyticsDonutChartModel extends AnalyticsChartModel {
	centerLabel?: string;
	centerValue?: string;
}

export interface AnalyticsTrendChartPoint {
	key: string;
	label: string;
	value: number;
}

export interface AnalyticsTrendChartModel {
	data: AnalyticsTrendChartPoint[];
}
```

Esses tipos são contratos de visualização analítica, não contratos de rota.

## Componentes Em `@vet/ui/charts`

Criar componentes reutilizáveis:

```text
packages/ui/src/charts/EChart.svelte
packages/ui/src/charts/DonutChart.svelte
packages/ui/src/charts/HorizontalBarChart.svelte
packages/ui/src/charts/TrendLineChart.svelte
packages/ui/src/charts/index.ts
```

Responsabilidades:

- inicializar e destruir instâncias ECharts corretamente;
- observar resize do container;
- receber modelos prontos;
- expor estado vazio;
- não conhecer domínio veterinário;
- não conhecer rotas;
- não conhecer traduções.

O uso de ECharts deve ser modular, registrando apenas gráficos e componentes necessários.

## View Model Do Dashboard Geral

Criar um view model em:

```text
packages/app-services/src/analytics/clinic-dashboard-overview.view-model.ts
```

API sugerida:

```ts
export interface ClinicDashboardOverviewLabels {
	pets: string;
	owners: string;
	records: string;
	vaccines: string;
	antiparasitics: string;
	tracked: string;
	notInformed: string;
	ageRanges: Record<ClinicDashboardAgeRangeKey, string>;
	species: (key: string) => string;
	breed: (key: string) => string;
	ownerLocation: (key: string, label: string | null) => string;
	ownerPetCount: (key: string) => string;
}

export interface ClinicDashboardOverviewViewModelInput {
	overview: ClinicAnalyticsOverview | null | undefined;
	labels: ClinicDashboardOverviewLabels;
	chartLimit?: number;
}

export interface ClinicDashboardOverviewViewModel {
	kpis: AnalyticsChartDatum[];
	attention: AnalyticsChartDatum[];
	species: AnalyticsBarChartModel;
	breeds: AnalyticsBarChartModel;
	ageRanges: AnalyticsBarChartModel;
	ownerLocations: AnalyticsBarChartModel;
	ownerPetCounts: AnalyticsBarChartModel;
	vaccineHistory: AnalyticsTrendChartModel;
	antiparasiticHistory: AnalyticsTrendChartModel;
}

export function buildClinicDashboardOverviewViewModel(
	input: ClinicDashboardOverviewViewModelInput
): ClinicDashboardOverviewViewModel;
```

O view model deve receber callbacks de label para continuar independente de i18n.

Ele pode usar:

```text
ClinicAnalyticsOverview
ClinicAnalytics
queryAnalytics(...)
analyticsPercent(...)
limitAnalyticsRows(...)
```

Ele deve entregar os dados prontos para gráficos e cards, sem classes CSS, sem ícones e sem `href` obrigatório.

## Nova Página Geral

Implementar a página real:

```text
apps/vet-app/src/routes/dashboard/overview/+page.svelte
```

A tela deve ser mais direta que o estudo atual:

- KPIs principais da clínica;
- atenção clínica para vacinas e antiparasitários;
- composição populacional por espécie, raça e idade;
- distribuição de owners por localidade e quantidade de pets;
- histórico mensal de vacinas e antiparasitários.

A página pode usar dados de pets e owners como contexto clínico agregado, mas não deve recriar páginas dedicadas de pets e owners dentro do dashboard.

## Períodos De Tratamento

As análises visíveis de vencimento de tratamentos devem permanecer simples e clínicas. Para vacinas e antiparasitários, usar quatro faixas principais:

```text
mais de 30 dias para vencer
30 ou menos dias para vencer
30 ou menos dias vencido
mais de 30 dias vencido
```

Nas páginas de vacinas e antiparasitários, o gráfico circular dessas quatro faixas deve ser o filtro de vencimento. A legenda deve ficar sempre visível ao lado do gráfico, sem paginação ou rolagem interna, exibindo a contagem de cada faixa. O histórico de aplicações dessas páginas deve usar gráfico de barras horizontais, com períodos no eixo vertical, para leitura mais precisa dos volumes por período.

A ordenação padrão da lista de tratamentos deve seguir a inversão do dia zero: nas duas faixas antes do vencimento, usar mais antigos primeiro; nas duas faixas vencidas, usar mais recentes primeiro.

Regra operacional:

| Faixa | Critério |
| --- | --- |
| mais de 30 dias para vencer | `daysUntilDue > 30` |
| 30 ou menos dias para vencer | `daysUntilDue >= 0 && daysUntilDue <= 30` |
| 30 ou menos dias vencido | `daysUntilDue < 0 && daysUntilDue >= -30` |
| mais de 30 dias vencido | `daysUntilDue < -30` |

Essas faixas são categorias de apresentação e análise. Elas não substituem os status existentes dos tratamentos quando estes forem necessários para regras internas ou compatibilidade com telas atuais.

## Ajustes De Navegação

Atualizar:

```text
apps/vet-app/src/routes/dashboard/+layout.svelte
apps/vet-app/src/routes/+page.svelte
```

O layout do dashboard deve listar apenas:

```text
overview
vaccines
antiparasitics
```

Links antigos para:

```text
/dashboard/general
/dashboard/pets
/dashboard/owners
```

devem ser removidos ou trocados para rotas reais existentes.

## Tratamentos

As rotas abaixo continuam existindo:

```text
apps/vet-app/src/routes/dashboard/vaccines/+page.svelte
apps/vet-app/src/routes/dashboard/antiparasitics/+page.svelte
```

O componente de analytics de tratamentos pode ser atualizado para consumir os componentes de `@vet/ui/charts` nos trechos de gráficos, preservando filtros, listas, contatos, avatares e navegação atual.

Essa atualização deve manter a lógica compartilhável em `@vet/app-services/analytics` e deixar em `apps/vet-app` apenas a composição da experiência.

## Sequência De Execução

1. Registrar baseline com `git status --short`.
2. Adicionar `echarts` ao pacote `@vet/ui`.
3. Criar contratos de gráfico em `@vet/types`.
4. Criar componentes `@vet/ui/charts`.
5. Criar `buildClinicDashboardOverviewViewModel(...)` em `@vet/app-services/analytics`.
6. Testar o view model com cenários de dados vazios, status de tratamentos, faixas de vencimento, buckets populacionais e histórico mensal.
7. Criar a rota real `/dashboard/overview`.
8. Atualizar links e tabs para remover rotas antigas da navegação.
9. Remover arquivos das páginas que saem do dashboard.
10. Atualizar i18n usado pela nova tela.
11. Rodar validação completa.

## Critérios De Aceite

- `/dashboard/overview` é uma rota real com a nova visão geral.
- `/dashboard/vaccines` e `/dashboard/antiparasitics` seguem funcionando.
- Não há uso de `redirect(...)` dentro de `apps/vet-app/src/routes/dashboard`.
- A navegação do dashboard não mostra pets nem owners como abas.
- `apps/vet-app` não monta buckets analíticos complexos para a visão geral.
- As análises visíveis de tratamentos usam as quatro faixas de vencimento definidas no plano.
- O dashboard geral não exibe os donuts de vencimento de vacinas e antiparasitários.
- As páginas `/dashboard/vaccines` e `/dashboard/antiparasitics` usam o donut ECharts como filtro de vencimento, com legenda lateral visível e valores à vista.
- O histórico de aplicações em `/dashboard/vaccines` e `/dashboard/antiparasitics` usa gráfico de barras horizontais ECharts, com períodos empilhados no eixo vertical.
- A lista de tratamentos usa mais antigos primeiro para faixas antes do vencimento e mais recentes primeiro para faixas vencidas.
- `@vet/ui/charts` não importa `@vet/app-services`.
- `@vet/app-services/analytics` não importa Svelte nem APIs de rota.
- ECharts fica encapsulado no pacote UI.
- `npm run check` passa.
- `npm run test:run` passa.
- `npm run build` passa.
- `git diff --check` passa.
