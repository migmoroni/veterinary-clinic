<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Select from '@vet/ui/components/ui/Select.svelte';
	import type { OwnerAssociatedContact } from '@vet/types/domain/owner/owner.js';
	import { formatDateForDisplay } from '@vet/types/domain/shared/date-input.js';
	import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
	import type { TreatmentAnalyticsCatalogItem, TreatmentAnalyticsOverview, TreatmentDueItem, TreatmentDuePeriodKey, TreatmentHistoryPeriod, TreatmentHistoryPoint } from '@vet/types/domain/treatment/analytics.js';
	import { treatmentHistoryPeriods } from '@vet/types/domain/treatment/analytics.js';
	import type { TranslationKey } from '@vet/core-local/i18n/index.js';
	import { i18n, t } from '@vet/core-local/i18n/index.js';
	import {
		buildTreatmentDuePeriodChart,
		buildTreatmentHistoryBarChart,
		defaultTreatmentAnalyticsDueOrder,
		filterTreatmentAnalyticsDueItems,
		loadAnalyticsTreatments,
		loadTreatmentDueAnalytics,
		loadTreatmentHistory,
		normalizeTreatmentAnalyticsDuePeriod,
		normalizeTreatmentAnalyticsPeriod,
		normalizeTreatmentAnalyticsSortOrder,
		sortTreatmentAnalyticsDueItems,
		type TreatmentAnalyticsChartLabels,
		type TreatmentAnalyticsSortOrder
	} from '@vet/app-services/analytics';
	import { OwnerContactDialog } from '@vet/modules/registry/owners';
	import { PetAvatar, loadPetAvatarsByPetIds } from '@vet/modules/registry/pets';
	import { listOwnerAssociatedContactsByOwnerIds } from '@vet/modules/registry/owners';
	import { DonutChart, HorizontalBarChart } from '@vet/ui/charts';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Phone from '@lucide/svelte/icons/phone';
	import Pill from '@lucide/svelte/icons/pill';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Syringe from '@lucide/svelte/icons/syringe';

	type ActiveTab = 'due' | 'history';

	interface TreatmentAnalyticsConfig {
		defaultBasePath: string;
		historyParam: string;
	}

	interface TreatmentAnalyticsPageProps {
		kind?: TreatmentKind;
		basePath?: string;
	}

	const treatmentAnalyticsConfigs: Record<TreatmentKind, TreatmentAnalyticsConfig> = {
		vaccine: {
			defaultBasePath: '/vaccines',
			historyParam: 'vaccine'
		},
		antiparasitic: {
			defaultBasePath: '/antiparasitics',
			historyParam: 'antiparasitic'
		}
	};

	const { kind = 'vaccine', basePath }: TreatmentAnalyticsPageProps = $props();
	const config = $derived(treatmentAnalyticsConfigs[kind]);
	const pageBasePath = $derived(basePath ?? config.defaultBasePath);

	let duePeriod = $state<TreatmentDuePeriodKey>('dueWithin30Days');
	let period = $state<TreatmentHistoryPeriod>('month');
	let selectedNormalizedName = $state('');
	let activeTab = $state<ActiveTab>('due');
	let dueOrder = $state<TreatmentAnalyticsSortOrder>('old');
	let allDueItems = $state<TreatmentDueItem[]>([]);
	let items = $state<TreatmentDueItem[]>([]);
	let visibleItems = $state<TreatmentDueItem[]>([]);
	let avatarBytesByPetId = $state(new Map<string, Uint8Array | null>());
	let ownerContactsByOwnerId = $state(new Map<string, OwnerAssociatedContact[]>());
	let treatmentOverview = $state<TreatmentAnalyticsOverview | null>(null);
	let history = $state<TreatmentHistoryPoint[]>([]);
	let analyticsTreatments = $state<TreatmentAnalyticsCatalogItem[]>([]);
	let dueLoading = $state(false);
	let dueListLoading = $state(false);
	let historyLoading = $state(false);
	let catalogLoading = $state(false);
	let dueLoaded = $state(false);
	let historyLoaded = $state(false);
	let catalogLoaded = $state(false);
	let dueError = $state('');
	let historyError = $state('');
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerAssociatedContact[]>([]);
	let dueRequestId = 0;
	let dueRenderRequestId = 0;
	let historyRequestId = 0;
	let catalogRequestId = 0;

	const dueChartLabels = $derived({
		centerLabel: kind === 'vaccine' ? t('analysis.view.vaccines') : t('analysis.view.antiparasitics'),
		duePeriods: {
			dueAfter30Days: t('treatment.duePeriod.dueAfter30Days'),
			dueWithin30Days: t('treatment.duePeriod.dueWithin30Days'),
			expiredWithin30Days: t('treatment.duePeriod.expiredWithin30Days'),
			expiredAfter30Days: t('treatment.duePeriod.expiredAfter30Days')
		}
	} satisfies TreatmentAnalyticsChartLabels);
	const dueChart = $derived(buildTreatmentDuePeriodChart({ overview: treatmentOverview, labels: dueChartLabels, locale: i18n.locale }));
	const historyChart = $derived(buildTreatmentHistoryBarChart(history));

	function treatmentKey(path: string): TranslationKey {
		return `treatment.${path}` as TranslationKey;
	}

	function analyticsKey(path: string): TranslationKey {
		return `treatment.analytics.${path}` as TranslationKey;
	}

	function kindAnalyticsKey(path: string): TranslationKey {
		const root = kind === 'vaccine' ? 'vaccine.analytics' : 'antiparasiticTreatment.analytics';
		return `${root}.${path}` as TranslationKey;
	}

	function periodLabelKey(value: TreatmentHistoryPeriod): TranslationKey {
		return analyticsKey(`period.${value}`);
	}

	function duePeriodLabelKey(value: TreatmentDuePeriodKey): TranslationKey {
		return treatmentKey(`duePeriod.${value}`);
	}

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale).format(value);
	}

	function percentFormatter(value: number | undefined): string {
		return new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value ?? 0);
	}

	function ownerDisplayName(item: TreatmentDueItem): string {
		return item.ownerName || t('owner.unassigned');
	}

	function petProfileHref(item: TreatmentDueItem): string {
		return `/pets/${item.petId}`;
	}

	function petAvatarBytes(item: TreatmentDueItem): Uint8Array | null {
		return avatarBytesByPetId.get(item.petId) ?? item.petAvatarBytes;
	}

	function ownerContacts(item: TreatmentDueItem): OwnerAssociatedContact[] {
		return ownerContactsByOwnerId.get(item.ownerId) ?? item.ownerContacts;
	}

	function updateUrl() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams();
		params.set('tab', activeTab);
		params.set('duePeriod', duePeriod);
		params.set('dueOrder', dueOrder);
		params.set('period', period);
		if (selectedNormalizedName) params.set(config.historyParam, selectedNormalizedName);
		window.history.replaceState(null, '', `${pageBasePath}?${params.toString()}`);
	}

	function isRefreshing(): boolean {
		return activeTab === 'due' ? dueLoading : historyLoading || catalogLoading;
	}

	async function waitForNextPaint() {
		await tick();
		if (typeof requestAnimationFrame === 'undefined') return;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}

	async function renderDueItemsInChunks(source: TreatmentDueItem[], order = dueOrder) {
		const requestId = ++dueRenderRequestId;
		const sortedSource = sortTreatmentAnalyticsDueItems(source, order);
		dueListLoading = true;
		visibleItems = [];
		await waitForNextPaint();

		const chunkSize = 80;
		for (let index = 0; index < sortedSource.length; index += chunkSize) {
			if (requestId !== dueRenderRequestId || activeTab !== 'due') return;
			visibleItems = sortedSource.slice(0, Math.min(sortedSource.length, index + chunkSize));
			await waitForNextPaint();
		}

		if (requestId === dueRenderRequestId) dueListLoading = false;
	}

	async function loadVisiblePetAvatars(source: TreatmentDueItem[]): Promise<void> {
		const missingIds = [...new Set(source.map((item) => item.petId))].filter((id) => !avatarBytesByPetId.has(id));
		if (missingIds.length === 0) return;

		try {
			const loadedAvatars = await loadPetAvatarsByPetIds(missingIds);
			const nextAvatars = new Map(avatarBytesByPetId);
			for (const id of missingIds) nextAvatars.set(id, loadedAvatars.get(id) ?? null);
			avatarBytesByPetId = nextAvatars;
		} catch (error) {
			console.error(error);
		}
	}

	async function loadVisibleOwnerContacts(source: TreatmentDueItem[]): Promise<void> {
		const missingIds = [...new Set(source.map((item) => item.ownerId).filter((id) => id.trim().length > 0))].filter((id) => !ownerContactsByOwnerId.has(id));
		if (missingIds.length === 0) return;

		try {
			const loadedContacts = await listOwnerAssociatedContactsByOwnerIds(missingIds);
			const nextContacts = new Map(ownerContactsByOwnerId);
			for (const id of missingIds) nextContacts.set(id, loadedContacts.get(id) ?? []);
			ownerContactsByOwnerId = nextContacts;
		} catch (error) {
			console.error(error);
		}
	}

	function selectItemsForDuePeriod(source: readonly TreatmentDueItem[], selectedDuePeriod = duePeriod): TreatmentDueItem[] {
		return filterTreatmentAnalyticsDueItems(source, selectedDuePeriod);
	}

	function renderSelectedDuePeriod(source = allDueItems, selectedDuePeriod = duePeriod, order = dueOrder) {
		const selectedItems = selectItemsForDuePeriod(source, selectedDuePeriod);
		items = selectedItems;
		void renderDueItemsInChunks(selectedItems, order);
	}

	function cancelDueListRender() {
		dueRenderRequestId += 1;
		dueListLoading = false;
		visibleItems = [];
	}

	async function loadDueData() {
		const requestId = ++dueRequestId;
		const requestedKind = kind;
		dueLoading = true;
		dueListLoading = true;
		visibleItems = [];
		dueError = '';
		try {
			const loadedAnalytics = await loadTreatmentDueAnalytics(requestedKind);
			if (requestId !== dueRequestId || requestedKind !== kind) return;
			allDueItems = loadedAnalytics.items;
			treatmentOverview = loadedAnalytics.overview;
			items = selectItemsForDuePeriod(loadedAnalytics.items, duePeriod);
			dueLoaded = true;
			if (activeTab === 'due') void renderDueItemsInChunks(items);
			else dueListLoading = false;
		} catch (err) {
			if (requestId !== dueRequestId) return;
			console.error(err);
			dueError = err instanceof Error ? err.message : t('common.error');
			dueListLoading = false;
		} finally {
			if (requestId === dueRequestId) dueLoading = false;
		}
	}

	async function loadHistoryData() {
		const requestId = ++historyRequestId;
		const requestedKind = kind;
		const requestedPeriod = period;
		const requestedName = selectedNormalizedName;
		historyLoading = true;
		historyError = '';
		try {
			const loadedHistory = await loadTreatmentHistory(requestedKind, { period: requestedPeriod, normalizedName: requestedName || null });
			if (requestId !== historyRequestId || requestedKind !== kind || requestedPeriod !== period || requestedName !== selectedNormalizedName) return;
			history = loadedHistory;
			historyLoaded = true;
		} catch (err) {
			if (requestId !== historyRequestId) return;
			console.error(err);
			historyError = err instanceof Error ? err.message : t('common.error');
		} finally {
			if (requestId === historyRequestId) historyLoading = false;
		}
	}

	async function loadCatalogData(force = false) {
		if (!force && catalogLoaded) {
			catalogLoading = false;
			return;
		}

		const requestId = ++catalogRequestId;
		const requestedKind = kind;
		catalogLoading = true;
		historyError = '';
		try {
			const loadedTreatments = await loadAnalyticsTreatments(requestedKind);
			if (requestId !== catalogRequestId || requestedKind !== kind) return;
			analyticsTreatments = loadedTreatments;
			catalogLoaded = true;
		} catch (err) {
			if (requestId !== catalogRequestId) return;
			console.error(err);
			historyError = err instanceof Error ? err.message : t('common.error');
		} finally {
			if (requestId === catalogRequestId) catalogLoading = false;
		}
	}

	function queueDueLoad() {
		cancelDueListRender();
		dueLoading = true;
		dueListLoading = true;
		dueLoaded = false;
		allDueItems = [];
		items = [];
		visibleItems = [];
		void waitForNextPaint().then(() => loadDueData());
	}

	function queueHistoryLoad(forceCatalog = false) {
		historyLoading = true;
		historyLoaded = false;
		if (forceCatalog || !catalogLoaded) catalogLoading = true;
		void waitForNextPaint().then(() => Promise.all([loadHistoryData(), loadCatalogData(forceCatalog)]));
	}

	function loadInitialTab() {
		if (activeTab === 'due') {
			queueDueLoad();
			return;
		}

		queueHistoryLoad();
	}

	function refreshActiveTab() {
		if (activeTab === 'due') {
			queueDueLoad();
			return;
		}

		queueHistoryLoad(true);
	}

	function selectTab(tab: ActiveTab) {
		activeTab = tab;
		if (tab === 'history') cancelDueListRender();
		updateUrl();

		if (tab === 'due' && dueLoaded && !dueLoading) void renderDueItemsInChunks(items);
		if (tab === 'due' && !dueLoaded && !dueLoading) queueDueLoad();
		if (tab === 'history' && ((!historyLoaded && !historyLoading) || (!catalogLoaded && !catalogLoading))) queueHistoryLoad();
	}

	function selectDuePeriod(value: string) {
		activeTab = 'due';
		const nextDuePeriod = normalizeTreatmentAnalyticsDuePeriod(value);
		duePeriod = nextDuePeriod;
		dueOrder = defaultTreatmentAnalyticsDueOrder(nextDuePeriod);
		updateUrl();
		cancelDueListRender();
		if (dueLoaded && !dueLoading) {
			renderSelectedDuePeriod(allDueItems, nextDuePeriod, dueOrder);
			return;
		}
		if (!dueLoading) queueDueLoad();
	}

	function selectDueOrder(value: string) {
		activeTab = 'due';
		dueOrder = normalizeTreatmentAnalyticsSortOrder(value);
		updateUrl();

		if (dueLoaded && !dueLoading) void renderDueItemsInChunks(items, dueOrder);
	}

	function selectPeriod(nextPeriod: TreatmentHistoryPeriod) {
		activeTab = 'history';
		period = nextPeriod;
		updateUrl();
		queueHistoryLoad();
	}

	function selectTreatment(value: string) {
		activeTab = 'history';
		selectedNormalizedName = value;
		updateUrl();
		queueHistoryLoad();
	}

	function daysText(item: TreatmentDueItem): string {
		const absoluteDays = Math.abs(item.daysUntilDue);
		const unit = absoluteDays === 1 ? t(treatmentKey('daySingular')) : t(treatmentKey('dayPlural'));
		if (item.daysUntilDue < 0) return `${absoluteDays} ${unit} ${t(treatmentKey('status.daysOverdue'))}`;
		if (item.daysUntilDue === 0) return t(treatmentKey('status.expiresToday'));
		return `${item.daysUntilDue} ${unit} ${t(treatmentKey('status.daysUntilDue'))}`;
	}

	function hasContacts(contacts: OwnerAssociatedContact[]): boolean {
		return contacts.some((contact) => contact.value.trim().length > 0);
	}

	function openContactDialog(item: TreatmentDueItem) {
		contactDialogOwnerName = ownerDisplayName(item);
		contactDialogContacts = ownerContacts(item);
		contactDialogOpen = true;
	}

	function initialActiveTab(params: URLSearchParams): ActiveTab {
		const tab = params.get('tab');
		if (tab === 'history' || tab === 'due') return tab;
		if (params.has('period') || params.has(config.historyParam)) return 'history';
		return 'due';
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			duePeriod = normalizeTreatmentAnalyticsDuePeriod(params.get('duePeriod'));
			dueOrder = params.has('dueOrder') ? normalizeTreatmentAnalyticsSortOrder(params.get('dueOrder')) : defaultTreatmentAnalyticsDueOrder(duePeriod);
			period = normalizeTreatmentAnalyticsPeriod(params.get('period'));
			selectedNormalizedName = params.get(config.historyParam) ?? '';
			activeTab = initialActiveTab(params);
		}
		loadInitialTab();
	});

	$effect(() => {
		void Promise.all([loadVisiblePetAvatars(visibleItems), loadVisibleOwnerContacts(visibleItems)]);
	});
</script>

<svelte:head>
	<title>{t(kindAnalyticsKey('title'))} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t(kindAnalyticsKey('kicker'))}</p>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t(kindAnalyticsKey('title'))}</h2>
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t(kindAnalyticsKey('description'))}</p>
		</div>
		<button class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-60" type="button" disabled={isRefreshing()} onclick={() => void refreshActiveTab()}>
			<RotateCw class="size-4" />
			{t('actions.refresh')}
		</button>
	</header>

	<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t(kindAnalyticsKey('title'))}>
		<button
			class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === 'due' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
			type="button"
			role="tab"
			aria-selected={activeTab === 'due'}
			onclick={() => selectTab('due')}
		>
			{#if kind === 'vaccine'}
				<Syringe class="size-4" />
			{:else}
				<Pill class="size-4" />
			{/if}
			<span class="truncate">{t(analyticsKey('statusTitle'))}</span>
		</button>
		<button
			class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
			type="button"
			role="tab"
			aria-selected={activeTab === 'history'}
			onclick={() => selectTab('history')}
		>
			<CalendarDays class="size-4" />
			<span class="truncate">{t(analyticsKey('historyTitle'))}</span>
		</button>
	</div>

	{#if activeTab === 'due'}
		<section class="min-w-0 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				{#if kind === 'vaccine'}
					<Syringe class="size-4" />
				{:else}
					<Pill class="size-4" />
				{/if}
				{t(analyticsKey('statusTitle'))}
			</div>

			{#if dueError}
				<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{dueError}</p>
			{/if}

			<div class="mt-4">
				{#if dueLoading && !treatmentOverview}
					<div class="h-80 animate-pulse rounded-md bg-muted"></div>
				{:else}
					<DonutChart model={dueChart} selectedKey={duePeriod} onSelect={selectDuePeriod} formatValue={metricFormatter} formatPercent={percentFormatter} emptyLabel={t('analysis.overview.emptyChart')} ariaLabel={t(analyticsKey('statusTitle'))} />
				{/if}
			</div>

			<div class="mt-5 border-t border-border pt-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<h3 class="text-base font-semibold">{t(duePeriodLabelKey(duePeriod))}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{t(analyticsKey('listDescription'))}</p>
					</div>
					<div class="flex flex-col gap-2 sm:items-end">
						<label class="text-sm font-medium" for="due-order">{t(analyticsKey('order'))}</label>
						<div class="flex items-center gap-2">
							<Select
								id="due-order"
								class="h-9 w-40"
								value={dueOrder}
								options={[
									{ value: 'recent', label: t(analyticsKey('order.recent')) },
									{ value: 'old', label: t(analyticsKey('order.old')) }
								]}
								onchange={(value) => selectDueOrder(value as string)}
							/>
							<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{items.length}</span>
						</div>
					</div>
				</div>

				{#if dueLoading || (dueListLoading && visibleItems.length === 0)}
					<div class="mt-4 space-y-3">
						{#each [0, 1, 2, 3, 4] as placeholderIndex (placeholderIndex)}
							<div class="h-24 animate-pulse rounded-md bg-muted"></div>
						{/each}
					</div>
				{:else if items.length === 0}
					<p class="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('treatment.analytics.emptyStatus')}</p>
				{:else}
					<div class="mt-4 divide-y divide-border rounded-md border border-border">
						{#each visibleItems as item (`${item.petId}:${item.normalizedName}`)}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
								<div class="flex min-w-0 items-start gap-3">
									<PetAvatar avatarBytes={petAvatarBytes(item)} petName={item.petName} className="size-11" iconClass="size-5 text-primary" />
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{item.petName} · {item.name}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{ownerDisplayName(item)}</p>
										<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
											<span>{t('treatment.appliedAt')}: {formatDateForDisplay(item.appliedAt)}</span>
											<span>{t(analyticsKey('dueAt'))}: {formatDateForDisplay(item.dueAt)}</span>
											<span>{daysText(item)}</span>
										</div>
									</div>
								</div>
								<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
									<a href={petProfileHref(item)} class="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
										{t('actions.openPet')}
									</a>
									<button
										class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 sm:w-auto"
										type="button"
										disabled={!hasContacts(ownerContacts(item))}
										onclick={() => openContactDialog(item)}
										aria-label={`${t('owner.contact')}: ${ownerDisplayName(item)}`}
									>
										<Phone class="size-4" />
										{t('owner.contact')}
									</button>
								</div>
							</article>
						{/each}
						{#if dueListLoading}
							<p class="p-4 text-center text-sm text-muted-foreground">{t('common.loading')}</p>
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<OwnerContactDialog bind:open={contactDialogOpen} ownerName={contactDialogOwnerName} contacts={contactDialogContacts} />
	{:else}
		<section class="min-w-0 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<CalendarDays class="size-4" />
				{t(analyticsKey('historyTitle'))}
			</div>

			{#if historyError}
				<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{historyError}</p>
			{/if}

			<div class="mt-4 grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
				<div class="space-y-3">
					<label class="block text-sm font-medium" for="history-period">{t(analyticsKey('period'))}</label>
					<div id="history-period" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
						{#each treatmentHistoryPeriods as option}
							<button class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60 {period === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}" type="button" disabled={historyLoading && period === option} onclick={() => selectPeriod(option)}>
								{t(periodLabelKey(option))}
							</button>
						{/each}
					</div>

					<div class="space-y-1">
						<label class="block text-sm font-medium" for="history-treatment">{t('treatment.analytics.productFilter')}</label>
						<Select
							id="history-treatment"
							value={selectedNormalizedName}
							disabled={catalogLoading || historyLoading}
							options={[
								{ value: '', label: t('treatment.analytics.allProducts') },
								...analyticsTreatments.map((treatment) => ({ value: treatment.normalizedName, label: treatment.name }))
							]}
							onchange={(value) => selectTreatment(value as string)}
						/>
					</div>
				</div>

				<div class="min-w-0">
					{#if historyLoading || catalogLoading}
						<div class="h-80 animate-pulse rounded-md bg-muted"></div>
					{:else}
						<HorizontalBarChart model={historyChart} emptyLabel={t(analyticsKey('emptyHistory'))} ariaLabel={t(analyticsKey('historyTitle'))} tone={kind === 'vaccine' ? 'success' : 'warning'} dynamicHeight minHeight={320} rowHeight={24} labelWidth={72} class="min-h-80" />
					{/if}
				</div>
			</div>
		</section>
	{/if}
</section>
