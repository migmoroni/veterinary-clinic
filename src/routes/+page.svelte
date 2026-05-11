<script lang="ts">
	import { onMount } from 'svelte';
	import OwnerContactDialog from '$lib/components/owner/OwnerContactDialog.svelte';
	import type { OwnerContact } from '$lib/domain/owner/owner.js';
	import type { VaccineStatusKey } from '$lib/domain/vaccine/analytics.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import Phone from '@lucide/svelte/icons/phone';
	import ClipboardPenLine from '@lucide/svelte/icons/clipboard-pen-line';
	import Database from '@lucide/svelte/icons/database';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Upload from '@lucide/svelte/icons/upload';
	import Syringe from '@lucide/svelte/icons/syringe';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	const vaccineCards: { status: VaccineStatusKey; labelKey: TranslationKey; detailKey: TranslationKey; barClass: string; textClass: string }[] = [
		{ status: 'current', labelKey: 'vaccine.status.current', detailKey: 'vaccine.status.currentDetail', barClass: 'bg-emerald-600', textClass: 'text-emerald-700' },
		{ status: 'dueSoon', labelKey: 'vaccine.status.dueSoon', detailKey: 'vaccine.status.dueSoonDetail', barClass: 'bg-sky-600', textClass: 'text-sky-700' },
		{ status: 'dueVerySoon', labelKey: 'vaccine.status.dueVerySoon', detailKey: 'vaccine.status.dueVerySoonDetail', barClass: 'bg-amber-600', textClass: 'text-amber-700' },
		{ status: 'expired', labelKey: 'vaccine.status.expired', detailKey: 'vaccine.status.expiredDetail', barClass: 'bg-orange-600', textClass: 'text-orange-700' },
		{ status: 'overdue', labelKey: 'vaccine.status.overdue', detailKey: 'vaccine.status.overdueDetail', barClass: 'bg-destructive', textClass: 'text-destructive' }
	];

	let setupStatusKey = $state<TranslationKey | null>(null);
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerContact[]>([]);

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

	function vaccineCount(status: VaccineStatusKey): number {
		return clinic.dashboard?.vaccines.summary[status] ?? 0;
	}

	function vaccinePercent(status: VaccineStatusKey): number {
		const total = clinic.dashboard?.vaccines.totalTracked ?? 0;
		if (total <= 0) return 0;

		const count = vaccineCount(status);
		if (count <= 0) return 0;

		const percent = (count / total) * 100;
		const rounded = Math.round(percent * 10) / 10;
		return rounded >= 0.1 ? rounded : 0.1;
	}

	function vaccinePercentLabel(status: VaccineStatusKey): string {
		const total = clinic.dashboard?.vaccines.totalTracked ?? 0;
		const count = vaccineCount(status);
		if (total <= 0 || count <= 0) return '0';

		const rawPercent = (count / total) * 100;
		const formatter = new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
		if (rawPercent < 0.1) return `< ${formatter.format(0.1)}`;
		return formatter.format(Math.round(rawPercent * 10) / 10);
	}

	function vaccineHistoryWidth(count: number): number {
		const max = (clinic.dashboard?.vaccines.history ?? []).reduce((current, point) => Math.max(current, point.count), 0);
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
	}

	function openCurrentRecordContact() {
		const record = clinic.dashboard?.record;
		if (!record) return;

		contactDialogOwnerName = record.ownerName;
		contactDialogContacts = record.ownerContacts;
		contactDialogOpen = true;
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
							{clinic.dashboard.record.petName} · {clinic.dashboard.record.ownerName}
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
					{t('overview.vaccines.title')}
				</div>
				<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('overview.vaccines.description')}</p>
			</div>
			<a href="/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('overview.vaccines.open')}>
				{t('overview.vaccines.open')}
				<ArrowRight class="size-4" />
			</a>
		</div>

		{#if clinic.loading}
			<div class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
				{#each vaccineCards as _card}
					<div class="h-28 animate-pulse rounded-md bg-muted"></div>
				{/each}
			</div>
		{:else}
			<div class="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-5">
				{#each vaccineCards as card}
					<a href={`/vaccines?status=${card.status}`} class="flex h-full min-h-28 flex-col rounded-md border border-border bg-background p-3 hover:bg-accent" aria-label={`${t(card.labelKey)}: ${vaccineCount(card.status)}`}>
						<span class="flex min-h-16 items-start justify-between gap-3">
							<span class="min-w-0">
								<span class="block text-sm font-medium">{t(card.labelKey)}</span>
								<span class="mt-1 block min-h-10 text-xs leading-5 text-muted-foreground">{t(card.detailKey)}</span>
							</span>
							<span class="text-2xl font-semibold {card.textClass}">{vaccineCount(card.status)}</span>
						</span>
						<span class="mt-auto block h-2 rounded-full bg-muted">
							<span class="block h-2 rounded-full {card.barClass}" style={`width: ${vaccinePercent(card.status)}%`}></span>
						</span>
						<span class="mt-2 block text-xs text-muted-foreground">{vaccinePercentLabel(card.status)}%</span>
					</a>
				{/each}
			</div>

			<div class="mt-5 border-t border-border pt-4">
				<div class="flex items-center justify-between gap-3">
					<h3 class="text-sm font-semibold">{t('overview.vaccines.historyTitle')}</h3>
					<a href="/vaccines?period=month" class="text-sm font-medium text-primary hover:underline">{t('overview.vaccines.open')}</a>
				</div>
				{#if (clinic.dashboard?.vaccines.history.length ?? 0) === 0}
					<p class="mt-3 rounded-md border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">{t('overview.vaccines.emptyHistory')}</p>
				{:else}
					<div class="mt-3 grid gap-2 lg:grid-cols-2">
						{#each (clinic.dashboard?.vaccines.history ?? []).slice(-8) as point}
							<div class="grid grid-cols-[5.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
								<span class="truncate text-muted-foreground">{point.label}</span>
								<span class="h-2 rounded-full bg-muted">
									<span class="block h-2 rounded-full bg-primary" style={`width: ${vaccineHistoryWidth(point.count)}%`}></span>
								</span>
								<span class="text-right font-medium">{point.count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>
</section>
{/if}

<OwnerContactDialog bind:open={contactDialogOpen} ownerName={contactDialogOwnerName} contacts={contactDialogContacts} />
