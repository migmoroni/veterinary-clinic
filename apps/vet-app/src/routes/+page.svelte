<script lang="ts">
	import { onMount } from 'svelte';
	import type { ClinicAnalyticsStudyTarget } from '@vet/types/clinic-analytics.js';
	import { defaultProductCatalogItems } from '@vet/types/domain/product/default-catalog.js';
	import { breedReferenceProfiles } from '@vet/types/domain/pet/breed-reference.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Database from '@lucide/svelte/icons/database';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Upload from '@lucide/svelte/icons/upload';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Pill from '@lucide/svelte/icons/pill';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	const analysisCards: { view: ClinicAnalyticsStudyTarget; titleKey: TranslationKey; descriptionKey: TranslationKey; metricKey: TranslationKey; icon: typeof Syringe }[] = [
		{ view: 'vaccines', titleKey: 'analysis.card.vaccines.title', descriptionKey: 'analysis.card.vaccines.description', metricKey: 'analysis.trackedVaccineItems', icon: Syringe },
		{ view: 'antiparasitics', titleKey: 'analysis.card.antiparasitics.title', descriptionKey: 'analysis.card.antiparasitics.description', metricKey: 'analysis.trackedAntiparasiticItems', icon: Pill },
		{ view: 'pets', titleKey: 'analysis.card.pets.title', descriptionKey: 'analysis.card.pets.description', metricKey: 'stats.pets', icon: PawPrint },
		{ view: 'owners', titleKey: 'analysis.card.owners.title', descriptionKey: 'analysis.card.owners.description', metricKey: 'stats.owners', icon: UserPlus }
	];

	let setupStatusKey = $state<TranslationKey | null>(null);

	async function startNewDatabase() {
		setupStatusKey = null;
		const created = await clinic.startNewDatabase();
		if (created) setupStatusKey = 'status.databaseCreated';
	}

	async function importInitialDatabase() {
		setupStatusKey = null;
		const imported = await clinic.importInitialDatabase(t('dialog.importTitle'));
		if (!imported && !clinic.error) setupStatusKey = 'status.operationCanceled';
	}

	onMount(() => {
		void clinic.init();
	});

	function metricFormatter(value: number): string {
		const formatter = new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
		return Number.isInteger(value) ? new Intl.NumberFormat(i18n.locale).format(value) : formatter.format(value);
	}

	function analysisCount(view: ClinicAnalyticsStudyTarget): number {
		if (view === 'vaccines') return clinic.dashboard?.vaccines.totalTracked ?? 0;
		if (view === 'antiparasitics') return clinic.dashboard?.antiparasitics.totalTracked ?? 0;
		if (view === 'pets') return clinic.dashboard?.counts.pets ?? 0;
		return clinic.dashboard?.counts.owners ?? 0;
	}

	function breedReferenceCount(): number {
		return breedReferenceProfiles.length;
	}

	function productReferenceCount(): number {
		return defaultProductCatalogItems.length;
	}
</script>

<svelte:head>
	<title>{t('app.name')}</title>
</svelte:head>

{#if clinic.needsSetup}
<section class="mx-auto flex min-h-full w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
	<div class="w-full">
		<header class="border-b border-border pb-5">
			<h2 class="text-2xl font-semibold sm:text-3xl">{t('setup.title')}</h2>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('setup.description')}</p>
		</header>

		{#if clinic.error}
			<div class="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
				<p class="font-medium">{t('status.databaseUnavailable')}</p>
				<p class="mt-1 text-muted-foreground">{clinic.error}</p>
			</div>
		{/if}

		{#if setupStatusKey}
			<p class="mt-5 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(setupStatusKey)}</p>
		{/if}

		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			<section class="rounded-md border border-border bg-card p-5 shadow-sm">
				<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Upload class="size-5" />
				</div>
				<h3 class="mt-4 text-base font-semibold">{t('setup.importTitle')}</h3>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('setup.importDescription')}</p>
				<button type="button" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={clinic.loading} onclick={() => void importInitialDatabase()}>
					<Upload class="size-4" />
					{t('setup.importButton')}
				</button>
			</section>

			<section class="rounded-md border border-border bg-card p-5 shadow-sm">
				<div class="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Database class="size-5" />
				</div>
				<h3 class="mt-4 text-base font-semibold">{t('setup.newTitle')}</h3>
				<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('setup.newDescription')}</p>
				<button type="button" class="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={clinic.loading} onclick={() => void startNewDatabase()}>
					<Database class="size-4" />
					{t('setup.newButton')}
				</button>
			</section>
		</div>
	</div>
</section>
{:else}
<section class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t('home.kicker')}</p>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t('home.title')}</h2>
			<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('home.description')}</p>
		</div>

		<button
			type="button"
			class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm hover:bg-accent"
			onclick={() => clinic.refresh()}
		>
			<RotateCw class="size-4" />
			{t('actions.refresh')}
		</button>
	</header>

	{#if clinic.error}
		<div class="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-foreground">
			<p class="font-medium">{t('status.databaseUnavailable')}</p>
			<p class="mt-1 text-muted-foreground">{clinic.error}</p>
		</div>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Syringe class="size-4" />
					{t('home.analysisTitle')}
				</div>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('home.analysisDescription')}</p>
			</div>
			<a href="/dashboard/general" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('actions.openDashboard')}>
				{t('analysis.view.general')}
				<ArrowRight class="size-4" />
			</a>
		</div>

		{#if clinic.loading}
			<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each analysisCards as _card}
					<div class="h-36 animate-pulse rounded-md bg-muted"></div>
				{/each}
			</div>
		{:else}
			<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
				{#each analysisCards as card}
					<a href={`/dashboard/${card.view}`} class="flex min-h-40 flex-col rounded-md border border-border bg-background p-4 hover:bg-accent" aria-label={`${t(card.titleKey)}: ${metricFormatter(analysisCount(card.view))}`}>
						<span class="flex items-start justify-between gap-3">
							<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
								<card.icon class="size-5" />
							</span>
							<span class="text-right">
								<span class="block text-2xl font-semibold">{metricFormatter(analysisCount(card.view))}</span>
								<span class="mt-1 block text-xs text-muted-foreground">{t(card.metricKey)}</span>
							</span>
						</span>
						<span class="mt-4 block text-base font-semibold">{t(card.titleKey)}</span>
						<span class="mt-2 block text-sm leading-6 text-muted-foreground">{t(card.descriptionKey)}</span>
						<span class="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-medium text-primary">
							{t('analysis.openView')}
							<ArrowRight class="size-4" />
						</span>
					</a>
				{/each}
			</div>
		{/if}
	</section>

	<div class="grid gap-4 lg:grid-cols-2">
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex min-w-0 gap-3">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<BookOpen class="size-5" />
					</span>
					<div class="min-w-0">
						<p class="text-sm font-medium text-muted-foreground">{t('home.breedReferenceKicker')}</p>
						<h3 class="mt-1 text-base font-semibold">{t('home.breedReferenceTitle')}</h3>
						<p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t('home.breedReferenceDescription')}</p>
					</div>
				</div>

				<a href="/breeds" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent" aria-label={t('actions.openBreedReference')}>
					<span class="tabular-nums">{metricFormatter(breedReferenceCount())}</span>
					<span>{t('stats.breeds')}</span>
					<ArrowRight class="size-4" />
				</a>
			</div>
		</section>

		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex min-w-0 gap-3">
					<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
						<Pill class="size-5" />
					</span>
					<div class="min-w-0">
						<p class="text-sm font-medium text-muted-foreground">{t('home.formularyKicker')}</p>
						<h3 class="mt-1 text-base font-semibold">{t('home.formularyTitle')}</h3>
						<p class="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t('home.formularyDescription')}</p>
					</div>
				</div>

				<a href="/formulary" class="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent" aria-label={t('actions.openFormulary')}>
					<span class="tabular-nums">{metricFormatter(productReferenceCount())}</span>
					<span>{t('stats.products')}</span>
					<ArrowRight class="size-4" />
				</a>
			</div>
		</section>
	</div>
</section>
{/if}
