<script lang="ts">
	import { onMount } from 'svelte';
	import OwnerContactDialog from '$lib/components/owner/OwnerContactDialog.svelte';
	import type { DashboardAnalysisView } from '$lib/domain/dashboard/analytics.js';
	import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import Phone from '@lucide/svelte/icons/phone';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import Database from '@lucide/svelte/icons/database';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Upload from '@lucide/svelte/icons/upload';
	import Syringe from '@lucide/svelte/icons/syringe';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import UserPlus from '@lucide/svelte/icons/user-plus';

	const analysisCards: { view: Exclude<DashboardAnalysisView, 'general'>; titleKey: TranslationKey; descriptionKey: TranslationKey; metricKey: TranslationKey; icon: typeof Syringe }[] = [
		{ view: 'vaccines', titleKey: 'analysis.card.vaccines.title', descriptionKey: 'analysis.card.vaccines.description', metricKey: 'analysis.trackedVaccineItems', icon: Syringe },
		{ view: 'pets', titleKey: 'analysis.card.pets.title', descriptionKey: 'analysis.card.pets.description', metricKey: 'stats.pets', icon: PawPrint },
		{ view: 'owners', titleKey: 'analysis.card.owners.title', descriptionKey: 'analysis.card.owners.description', metricKey: 'stats.owners', icon: UserPlus }
	];

	let setupStatusKey = $state<TranslationKey | null>(null);
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerAssociatedContact[]>([]);

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

	function analysisCount(view: Exclude<DashboardAnalysisView, 'general'>): number {
		if (view === 'vaccines') return clinic.dashboard?.vaccines.totalTracked ?? 0;
		if (view === 'pets') return clinic.dashboard?.counts.pets ?? 0;
		return clinic.dashboard?.counts.owners ?? 0;
	}

	function openCurrentRecordContact() {
		const record = clinic.dashboard?.record;
		if (!record) return;

		contactDialogOwnerName = record.ownerName || t('owner.unassigned');
		contactDialogContacts = record.ownerContacts;
		contactDialogOpen = true;
	}

	function currentRecordContextLabel(): string {
		const record = clinic.dashboard?.record;
		if (!record) return '';
		return record.ownerName ? `${record.petName} · ${record.ownerName}` : record.petName;
	}
</script>

<svelte:head>
	<title>{t('app.name')}</title>
</svelte:head>

{#if clinic.needsSetup}
<section class="mx-auto flex min-h-full w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
	<div class="w-full">
		<header class="border-b border-border pb-5">
			<p class="text-sm font-medium text-muted-foreground">{t('app.brandKicker')}</p>
			<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('setup.title')}</h2>
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
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<ClipboardPenLine class="size-4" />
				{t('home.currentRecord')}
			</div>

			{#if clinic.loading}
				<div class="mt-6 h-64 animate-pulse rounded-md bg-muted"></div>
			{:else if clinic.dashboard?.record}
				<div class="mt-4 flex flex-col gap-4">
					<div class="flex flex-col gap-1">
						<h3 class="text-xl font-semibold">{clinic.dashboard.record.title}</h3>
						<p class="text-sm text-muted-foreground">
							{currentRecordContextLabel()}
						</p>
					</div>

					<textarea
						class="min-h-80 w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-6 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
						aria-label={t('record.descriptionLabel')}
						readonly
						value={clinic.dashboard.record.description ?? ''}
					></textarea>

					<div class="flex flex-wrap gap-2">
						<a
							href={`/records/${clinic.dashboard.record.id}`}
							class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95"
						>
							{t('actions.openRecord')}
						</a>
						{#if clinic.dashboard.record.ownerContacts.length > 0}
							<button
								type="button"
								class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-accent"
								onclick={openCurrentRecordContact}
							>
								<Phone class="size-4" />
								{t('owner.contact')}
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="mt-6 rounded-md border border-dashed border-border p-8 text-center">
					<p class="font-medium">{t('home.emptyTitle')}</p>
					<p class="mt-2 text-sm text-muted-foreground">{t('home.emptyDescription')}</p>
				</div>
			{/if}
	</section>

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
			<div class="mt-4 grid gap-3 lg:grid-cols-3">
				{#each analysisCards as _card}
					<div class="h-36 animate-pulse rounded-md bg-muted"></div>
				{/each}
			</div>
		{:else}
			<div class="mt-4 grid gap-3 lg:grid-cols-3">
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
</section>
{/if}

<OwnerContactDialog bind:open={contactDialogOpen} ownerName={contactDialogOwnerName} contacts={contactDialogContacts} />
