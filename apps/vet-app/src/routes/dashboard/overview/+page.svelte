<script lang="ts">
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { buildClinicDashboardOverviewViewModel, type ClinicDashboardAgeRangeKey, type ClinicDashboardOverviewLabels } from '@vet/app-services/analytics';
	import type { AnalyticsChartDatum, AnalyticsChartTone } from '@vet/types/domain/analytics/charts.js';
	import type { ClinicAnalyticsPetCountBandKey } from '@vet/types/clinic-analytics.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '@vet/types/domain/pet/taxonomy.js';
	import { HorizontalBarChart, TrendLineChart } from '@vet/ui/charts';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Pill from '@lucide/svelte/icons/pill';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UsersRound from '@lucide/svelte/icons/users-round';
	import type { Component } from 'svelte';

	const overviewLabels = $derived({
		pets: t('stats.pets'),
		owners: t('stats.owners'),
		records: t('stats.records'),
		vaccines: t('analysis.view.vaccines'),
		antiparasitics: t('analysis.view.antiparasitics'),
		tracked: t('analysis.overview.tracked'),
		notInformed: t('common.notInformed'),
		ageRanges: {
			underOne: t('analysis.age.underOne'),
			oneToThree: t('analysis.age.oneToThree'),
			fourToSeven: t('analysis.age.fourToSeven'),
			eightPlus: t('analysis.age.eightPlus'),
			unknown: t('analysis.age.unknown')
		} satisfies Record<ClinicDashboardAgeRangeKey, string>,
		species: speciesLabel,
		breed: breedLabel,
		ownerLocation: ownerLocationLabel,
		ownerPetCount: ownerPetCountLabel
	} satisfies ClinicDashboardOverviewLabels);
	const overviewView = $derived(
		buildClinicDashboardOverviewViewModel({
			overview: clinic.dashboard,
			labels: overviewLabels,
			chartLimit: 8
		})
	);

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function percentFormatter(value: number | undefined): string {
		return new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value ?? 0);
	}

	function speciesLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : key;
	}

	function breedLabel(key: string): string {
		if (key === 'unknown') return t('common.notInformed');
		const option = isPetBreed(key) ? getPetBreedOption(key) : null;
		return option ? t(option.labelKey) : key;
	}

	function ownerLocationLabel(_key: string, label: string | null): string {
		return label?.trim() || t('common.notInformed');
	}

	function ownerPetCountLabel(key: ClinicAnalyticsPetCountBandKey): string {
		return t(`analysis.petCount.${key}` as TranslationKey);
	}

	function kpiIcon(key: string): Component {
		if (key === 'pets') return PawPrint;
		if (key === 'owners') return UsersRound;
		if (key === 'records') return ClipboardList;
		if (key === 'vaccines') return Syringe;
		if (key === 'antiparasitics') return Pill;
		return ChartColumn;
	}

	function toneClass(tone: AnalyticsChartTone | undefined): string {
		if (tone === 'success') return 'bg-emerald-50 text-emerald-700';
		if (tone === 'info') return 'bg-sky-50 text-sky-700';
		if (tone === 'warning') return 'bg-amber-50 text-amber-700';
		if (tone === 'danger') return 'bg-rose-50 text-rose-700';
		return 'bg-muted text-muted-foreground';
	}

	function attentionDetail(item: AnalyticsChartDatum): string {
		return `${percentFormatter(item.percent)}% ${t('analysis.overview.attentionDetail')}`;
	}
</script>

<section class="space-y-5">
	<div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
		{#each overviewView.kpis as kpi}
			{@const Icon = kpiIcon(kpi.key)}
			<article class="rounded-md border border-border bg-card p-4 shadow-sm">
				<div class="flex items-start justify-between gap-3">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-md {toneClass(kpi.tone)}">
						<Icon class="size-5" />
					</span>
					<span class="text-right">
						<span class="block text-2xl font-semibold tabular-nums">{metricFormatter(kpi.value)}</span>
						<span class="mt-1 block text-xs text-muted-foreground">{kpi.detail ?? t('analysis.overview.total')}</span>
					</span>
				</div>
				<h3 class="mt-4 truncate text-sm font-semibold">{kpi.label}</h3>
			</article>
		{/each}
	</div>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<header class="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
			<div class="min-w-0">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<AlertTriangle class="size-4" />
					{t('analysis.overview.attentionTitle')}
				</div>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.overview.attentionDescription')}</p>
			</div>
			<div class="grid gap-2 sm:grid-cols-2">
				{#each overviewView.attention as item}
					<div class="min-w-44 rounded-md border border-border bg-background px-3 py-2">
						<p class="text-xs font-medium text-muted-foreground">{item.label}</p>
						<p class="mt-1 text-2xl font-semibold tabular-nums">{metricFormatter(item.value)}</p>
						<p class="mt-1 text-xs text-muted-foreground">{attentionDetail(item)}</p>
					</div>
				{/each}
			</div>
		</header>

		<div class="mt-4 flex flex-wrap gap-2">
			<a class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" href="/dashboard/vaccines">{t('analysis.view.vaccines')}</a>
			<a class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" href="/dashboard/antiparasitics">{t('analysis.view.antiparasitics')}</a>
		</div>
	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
			<ChartColumn class="size-4" />
			{t('analysis.overview.populationTitle')}
		</div>

		<div class="mt-4 grid gap-4 xl:grid-cols-3">
			<section class="min-w-0">
				<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.species')}</h3>
				<HorizontalBarChart model={overviewView.species} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t('analysis.overview.chart.species')} />
			</section>
			<section class="min-w-0">
				<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.breeds')}</h3>
				<HorizontalBarChart model={overviewView.breeds} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t('analysis.overview.chart.breeds')} />
			</section>
			<section class="min-w-0">
				<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.ageRanges')}</h3>
				<HorizontalBarChart model={overviewView.ageRanges} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t('analysis.overview.chart.ageRanges')} />
			</section>
		</div>
	</section>

	<div class="grid gap-4 xl:grid-cols-2">
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<UsersRound class="size-4" />
				{t('analysis.overview.ownerTitle')}
			</div>
			<div class="mt-4 grid gap-4 lg:grid-cols-2">
				<section class="min-w-0">
					<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.ownerLocations')}</h3>
					<HorizontalBarChart model={overviewView.ownerLocations} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t('analysis.overview.chart.ownerLocations')} />
				</section>
				<section class="min-w-0">
					<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.ownerPetCounts')}</h3>
					<HorizontalBarChart model={overviewView.ownerPetCounts} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t('analysis.overview.chart.ownerPetCounts')} />
				</section>
			</div>
		</section>

		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<ChartColumn class="size-4" />
				{t('analysis.overview.historyTitle')}
			</div>
			<div class="mt-4 grid gap-4">
				<section class="min-w-0">
					<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.vaccineHistory')}</h3>
					<TrendLineChart model={overviewView.vaccineHistory} emptyLabel={t('overview.vaccines.emptyHistory')} ariaLabel={t('analysis.overview.chart.vaccineHistory')} />
				</section>
				<section class="min-w-0">
					<h3 class="truncate text-sm font-semibold">{t('analysis.overview.chart.antiparasiticHistory')}</h3>
					<TrendLineChart model={overviewView.antiparasiticHistory} emptyLabel={t('treatment.analytics.emptyHistory')} ariaLabel={t('analysis.overview.chart.antiparasiticHistory')} tone="warning" />
				</section>
			</div>
		</section>
	</div>
</section>
