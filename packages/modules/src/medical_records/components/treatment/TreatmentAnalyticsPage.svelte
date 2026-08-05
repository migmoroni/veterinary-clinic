<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Select from '@vet/ui/components/ui/Select.svelte';
	import OwnerContactDialog from '@vet/modules/registry/components/owner/OwnerContactDialog.svelte';
	import DateField from '@vet/ui/components/forms/DateField.svelte';
	import PetAvatar from '@vet/modules/registry/components/pet/PetAvatar.svelte';
	import type { OwnerAssociatedContact } from '@vet/types/domain/owner/owner.js';
	import { formatDateForDisplay, formatDateForInput } from '@vet/types/domain/shared/date-input.js';
	import type { TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
	import type { TreatmentAnalyticsCatalogItem, TreatmentDueFilterMode, TreatmentHistoryPeriod, TreatmentStatusItem, TreatmentStatusKey, TreatmentStatusSummary } from '@vet/types/domain/treatment/analytics.js';
	import { emptyTreatmentStatusSummary, shiftIsoDate, todayIsoDate, treatmentHistoryPeriods, treatmentStatusKeys } from '@vet/types/domain/treatment/analytics.js';
	import type { TranslationKey } from '@vet/core-local/i18n/index.js';
	import { i18n, t } from '@vet/core-local/i18n/index.js';
	import { loadAnalyticsTreatments, loadTreatmentAnalyticsOverview, loadTreatmentHistory, loadTreatmentStatusItems } from '@vet/modules/medical_records/services/treatment-analytics.service.js';
	import { loadPetAvatarsByPetIds } from '@vet/modules/registry/services/avatar.service.js';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Phone from '@lucide/svelte/icons/phone';
	import Pill from '@lucide/svelte/icons/pill';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Syringe from '@lucide/svelte/icons/syringe';

	type ActiveTab = 'status' | 'history';
	type SortOrder = 'recent' | 'old';
	type HistoryPoint = { key: string; label: string; count: number };

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

	const statusOptionStyles: { status: TreatmentStatusKey; barClass: string; textClass: string }[] = [
		{ status: 'current', barClass: 'bg-emerald-600', textClass: 'text-emerald-700' },
		{ status: 'dueSoon', barClass: 'bg-sky-600', textClass: 'text-sky-700' },
		{ status: 'dueVerySoon', barClass: 'bg-amber-600', textClass: 'text-amber-700' },
		{ status: 'expired', barClass: 'bg-orange-600', textClass: 'text-orange-700' },
		{ status: 'overdue', barClass: 'bg-destructive', textClass: 'text-destructive' }
	];

	const { kind = 'vaccine', basePath }: TreatmentAnalyticsPageProps = $props();
	const config = $derived(treatmentAnalyticsConfigs[kind]);
	const pageBasePath = $derived(basePath ?? config.defaultBasePath);
	const statusOptions = $derived(
		statusOptionStyles.map((option) => ({
			...option,
			labelKey: treatmentKey(`status.${option.status}`),
			detailKey: treatmentKey(`status.${option.status}Detail`)
		}))
	);

	const todayDate = todayIsoDate();
	const defaultPeriodStartDate = shiftIsoDate(todayDate, -30);
	const defaultPeriodEndDate = shiftIsoDate(todayDate, 30);

	let dueFilterMode = $state<TreatmentDueFilterMode>('status');
	let status = $state<TreatmentStatusKey>('expired');
	let periodStartDate = $state(defaultPeriodStartDate);
	let periodEndDate = $state(defaultPeriodEndDate);
	let period = $state<TreatmentHistoryPeriod>('month');
	let selectedNormalizedName = $state('');
	let activeTab = $state<ActiveTab>('status');
	let statusOrder = $state<SortOrder>('recent');
	let historyOrder = $state<SortOrder>('recent');
	let items = $state<TreatmentStatusItem[]>([]);
	let visibleItems = $state<TreatmentStatusItem[]>([]);
	let avatarBytesByPetId = $state(new Map<string, Uint8Array | null>());
	let statusSummary = $state<TreatmentStatusSummary>(emptyTreatmentStatusSummary());
	let statusTotalTracked = $state(0);
	let history = $state<HistoryPoint[]>([]);
	let analyticsTreatments = $state<TreatmentAnalyticsCatalogItem[]>([]);
	let statusLoading = $state(false);
	let statusListLoading = $state(false);
	let historyLoading = $state(false);
	let catalogLoading = $state(false);
	let statusLoaded = $state(false);
	let historyLoaded = $state(false);
	let catalogLoaded = $state(false);
	let statusError = $state('');
	let historyError = $state('');
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerAssociatedContact[]>([]);
	let statusRequestId = 0;
	let statusRenderRequestId = 0;
	let historyRequestId = 0;
	let catalogRequestId = 0;

	const sortedHistory = $derived(sortHistoryPoints(history, historyOrder));
	const maxHistoryCount = $derived(history.reduce((max, point) => Math.max(max, point.count), 0));

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

	function normalizeStatus(value: string | null): TreatmentStatusKey {
		return treatmentStatusKeys.includes(value as TreatmentStatusKey) ? (value as TreatmentStatusKey) : 'expired';
	}

	function normalizeDueFilterMode(value: string | null): TreatmentDueFilterMode {
		return value === 'period' || value === 'status' ? value : 'status';
	}

	function normalizePeriodStartDate(value: string | null): string {
		const normalized = formatDateForInput(value);
		return normalized && normalized <= todayDate ? normalized : defaultPeriodStartDate;
	}

	function normalizePeriodEndDate(value: string | null): string {
		const normalized = formatDateForInput(value);
		return normalized && normalized >= todayDate ? normalized : defaultPeriodEndDate;
	}

	function normalizePeriod(value: string | null): TreatmentHistoryPeriod {
		return treatmentHistoryPeriods.includes(value as TreatmentHistoryPeriod) ? (value as TreatmentHistoryPeriod) : 'month';
	}

	function normalizeOrder(value: string | null): SortOrder {
		return value === 'recent' || value === 'old' ? value : 'recent';
	}

	function periodLabelKey(value: TreatmentHistoryPeriod): TranslationKey {
		return analyticsKey(`period.${value}`);
	}

	function statusLabelKey(value: TreatmentStatusKey): TranslationKey {
		return treatmentKey(`status.${value}`);
	}

	function statusSectionTitleKey(): TranslationKey {
		return dueFilterMode === 'status' ? statusLabelKey(status) : analyticsKey('periodFilterTitle');
	}

	function statusCount(value: TreatmentStatusKey): number {
		return statusSummary[value] ?? 0;
	}

	function statusPercent(value: TreatmentStatusKey): number {
		if (statusTotalTracked <= 0) return 0;

		const count = statusCount(value);
		if (count <= 0) return 0;

		const percent = (count / statusTotalTracked) * 100;
		const rounded = Math.round(percent * 10) / 10;
		return rounded >= 0.1 ? rounded : 0.1;
	}

	function statusPercentLabel(value: TreatmentStatusKey): string {
		const count = statusCount(value);
		if (statusTotalTracked <= 0 || count <= 0) return '0';

		const rawPercent = (count / statusTotalTracked) * 100;
		const formatter = new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
		if (rawPercent < 0.1) return `< ${formatter.format(0.1)}`;
		return formatter.format(Math.round(rawPercent * 10) / 10);
	}

	function sortStatusItems(source: TreatmentStatusItem[], order: SortOrder): TreatmentStatusItem[] {
		const direction = order === 'recent' ? -1 : 1;
		return [...source].sort((first, second) => {
			const dueCompare = first.dueAt.localeCompare(second.dueAt);
			if (dueCompare !== 0) return dueCompare * direction;

			const appliedCompare = first.appliedAt.localeCompare(second.appliedAt);
			if (appliedCompare !== 0) return appliedCompare * direction;

			return ownerDisplayName(first).localeCompare(ownerDisplayName(second)) || first.petName.localeCompare(second.petName) || first.name.localeCompare(second.name);
		});
	}

	function ownerDisplayName(item: TreatmentStatusItem): string {
		return item.ownerName || t('owner.unassigned');
	}

	function petProfileHref(item: TreatmentStatusItem): string {
		return `/pets/${item.petId}`;
	}

	function petAvatarBytes(item: TreatmentStatusItem): Uint8Array | null {
		return avatarBytesByPetId.get(item.petId) ?? item.petAvatarBytes;
	}

	function sortHistoryPoints(source: HistoryPoint[], order: SortOrder): HistoryPoint[] {
		return [...source].sort((first, second) => (order === 'recent' ? second.key.localeCompare(first.key) : first.key.localeCompare(second.key)));
	}

	function updateUrl() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams();
		params.set('tab', activeTab);
		params.set('filterMode', dueFilterMode);
		if (dueFilterMode === 'status') params.set('status', status);
		if (dueFilterMode === 'period') {
			params.set('startDate', periodStartDate);
			params.set('endDate', periodEndDate);
		}
		params.set('statusOrder', statusOrder);
		params.set('period', period);
		params.set('historyOrder', historyOrder);
		if (selectedNormalizedName) params.set(config.historyParam, selectedNormalizedName);
		window.history.replaceState(null, '', `${pageBasePath}?${params.toString()}`);
	}

	function isRefreshing(): boolean {
		return activeTab === 'status' ? statusLoading : historyLoading || catalogLoading;
	}

	async function waitForNextPaint() {
		await tick();
		if (typeof requestAnimationFrame === 'undefined') return;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}

	async function renderStatusItemsInChunks(source: TreatmentStatusItem[], order = statusOrder) {
		const requestId = ++statusRenderRequestId;
		const sortedSource = sortStatusItems(source, order);
		statusListLoading = true;
		visibleItems = [];
		await waitForNextPaint();

		const chunkSize = 80;
		for (let index = 0; index < sortedSource.length; index += chunkSize) {
			if (requestId !== statusRenderRequestId || activeTab !== 'status') return;
			visibleItems = sortedSource.slice(0, Math.min(sortedSource.length, index + chunkSize));
			await waitForNextPaint();
		}

		if (requestId === statusRenderRequestId) statusListLoading = false;
	}

	async function loadVisiblePetAvatars(source: TreatmentStatusItem[]): Promise<void> {
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

	function cancelStatusListRender() {
		statusRenderRequestId += 1;
		statusListLoading = false;
		visibleItems = [];
	}

	async function loadStatusData() {
		const requestId = ++statusRequestId;
		const requestedKind = kind;
		const requestedFilterMode = dueFilterMode;
		const requestedStatus = status;
		const requestedStartDate = periodStartDate;
		const requestedEndDate = periodEndDate;
		statusLoading = true;
		statusListLoading = true;
		visibleItems = [];
		statusError = '';
		try {
			const [loadedItems, loadedOverview] = await Promise.all([
				loadTreatmentStatusItems(requestedKind, { mode: requestedFilterMode, status: requestedStatus, startDate: requestedStartDate, endDate: requestedEndDate }),
				loadTreatmentAnalyticsOverview(requestedKind)
			]);
			if (requestId !== statusRequestId || requestedKind !== kind || requestedFilterMode !== dueFilterMode || requestedStatus !== status || requestedStartDate !== periodStartDate || requestedEndDate !== periodEndDate) return;
			items = loadedItems;
			statusSummary = loadedOverview.summary;
			statusTotalTracked = loadedOverview.totalTracked;
			statusLoaded = true;
			if (activeTab === 'status') void renderStatusItemsInChunks(loadedItems);
			else statusListLoading = false;
		} catch (err) {
			if (requestId !== statusRequestId) return;
			console.error(err);
			statusError = err instanceof Error ? err.message : t('common.error');
			statusListLoading = false;
		} finally {
			if (requestId === statusRequestId) statusLoading = false;
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

	function queueStatusLoad() {
		cancelStatusListRender();
		statusLoading = true;
		statusListLoading = true;
		statusLoaded = false;
		items = [];
		visibleItems = [];
		void waitForNextPaint().then(() => loadStatusData());
	}

	function queueHistoryLoad(forceCatalog = false) {
		historyLoading = true;
		historyLoaded = false;
		if (forceCatalog || !catalogLoaded) catalogLoading = true;
		void waitForNextPaint().then(() => Promise.all([loadHistoryData(), loadCatalogData(forceCatalog)]));
	}

	function loadInitialTab() {
		if (activeTab === 'status') {
			queueStatusLoad();
			return;
		}

		queueHistoryLoad();
	}

	function refreshActiveTab() {
		if (activeTab === 'status') {
			queueStatusLoad();
			return;
		}

		queueHistoryLoad(true);
	}

	function selectTab(tab: ActiveTab) {
		activeTab = tab;
		if (tab === 'history') cancelStatusListRender();
		updateUrl();

		if (tab === 'status' && statusLoaded && !statusLoading) void renderStatusItemsInChunks(items);
		if (tab === 'status' && !statusLoaded && !statusLoading) queueStatusLoad();
		if (tab === 'history' && ((!historyLoaded && !historyLoading) || (!catalogLoaded && !catalogLoading))) queueHistoryLoad();
	}

	function selectStatus(value: string) {
		activeTab = 'status';
		dueFilterMode = 'status';
		status = normalizeStatus(value);
		updateUrl();
		queueStatusLoad();
	}

	function selectDueFilterMode(value: string) {
		activeTab = 'status';
		dueFilterMode = normalizeDueFilterMode(value);
		updateUrl();
		queueStatusLoad();
	}

	function selectPeriodStartDate(value: string) {
		activeTab = 'status';
		dueFilterMode = 'period';
		periodStartDate = normalizePeriodStartDate(value);
		updateUrl();
		queueStatusLoad();
	}

	function selectPeriodEndDate(value: string) {
		activeTab = 'status';
		dueFilterMode = 'period';
		periodEndDate = normalizePeriodEndDate(value);
		updateUrl();
		queueStatusLoad();
	}

	function selectStatusOrder(value: string) {
		activeTab = 'status';
		statusOrder = normalizeOrder(value);
		updateUrl();

		if (statusLoaded && !statusLoading) void renderStatusItemsInChunks(items, statusOrder);
	}

	function selectPeriod(nextPeriod: TreatmentHistoryPeriod) {
		activeTab = 'history';
		period = nextPeriod;
		updateUrl();
		queueHistoryLoad();
	}

	function selectHistoryOrder(value: string) {
		activeTab = 'history';
		historyOrder = normalizeOrder(value);
		updateUrl();
	}

	function selectTreatment(value: string) {
		activeTab = 'history';
		selectedNormalizedName = value;
		updateUrl();
		queueHistoryLoad();
	}

	function historyWidth(point: HistoryPoint): number {
		return maxHistoryCount > 0 ? Math.max(4, Math.round((point.count / maxHistoryCount) * 100)) : 0;
	}

	function daysText(item: TreatmentStatusItem): string {
		const absoluteDays = Math.abs(item.daysUntilDue);
		const unit = absoluteDays === 1 ? t(treatmentKey('daySingular')) : t(treatmentKey('dayPlural'));
		if (item.daysUntilDue < 0) return `${absoluteDays} ${unit} ${t(treatmentKey('status.daysOverdue'))}`;
		if (item.daysUntilDue === 0) return t(treatmentKey('status.expiresToday'));
		return `${item.daysUntilDue} ${unit} ${t(treatmentKey('status.daysUntilDue'))}`;
	}

	function hasContacts(contacts: OwnerAssociatedContact[]): boolean {
		return contacts.some((contact) => contact.value.trim().length > 0);
	}

	function openContactDialog(item: TreatmentStatusItem) {
		contactDialogOwnerName = ownerDisplayName(item);
		contactDialogContacts = item.ownerContacts;
		contactDialogOpen = true;
	}

	function initialActiveTab(params: URLSearchParams): ActiveTab {
		const tab = params.get('tab');
		if (tab === 'history' || tab === 'status') return tab;
		if (params.has('status') || params.has('filterMode') || params.has('startDate') || params.has('endDate')) return 'status';
		return params.has('period') || params.has(config.historyParam) ? 'history' : 'status';
	}

	onMount(() => {
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			dueFilterMode = params.has('startDate') || params.has('endDate') ? 'period' : normalizeDueFilterMode(params.get('filterMode'));
			status = normalizeStatus(params.get('status'));
			periodStartDate = normalizePeriodStartDate(params.get('startDate'));
			periodEndDate = normalizePeriodEndDate(params.get('endDate'));
			statusOrder = normalizeOrder(params.get('statusOrder'));
			period = normalizePeriod(params.get('period'));
			historyOrder = normalizeOrder(params.get('historyOrder'));
			selectedNormalizedName = params.get(config.historyParam) ?? '';
			activeTab = initialActiveTab(params);
		}
		loadInitialTab();
	});

	$effect(() => {
		void loadVisiblePetAvatars(visibleItems);
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
			class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === 'status' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
			type="button"
			role="tab"
			aria-selected={activeTab === 'status'}
			onclick={() => selectTab('status')}
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

	{#if activeTab === 'status'}
		<section class="min-w-0 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				{#if kind === 'vaccine'}
					<Syringe class="size-4" />
				{:else}
					<Pill class="size-4" />
				{/if}
				{t(analyticsKey('statusTitle'))}
			</div>

			<div class="mt-4 grid gap-3 rounded-md border border-border bg-background p-3 lg:grid-cols-[14rem_minmax(0,1fr)]">
				<div class="space-y-1">
					<label class="text-sm font-medium" for="due-filter-mode">{t(analyticsKey('filterMode'))}</label>
					<Select
						id="due-filter-mode"
						value={dueFilterMode}
						options={[
							{ value: 'status', label: t(analyticsKey('filterMode.status')) },
							{ value: 'period', label: t(analyticsKey('filterMode.period')) }
						]}
						onchange={(value) => selectDueFilterMode(value as string)}
					/>
				</div>

				{#if dueFilterMode === 'status'}
					<div class="space-y-2">
						<span class="text-sm font-medium">{t(analyticsKey('statusFilter'))}</span>
						<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
							{#each statusOptions as option}
								<button
									type="button"
									class="flex h-full min-h-28 flex-col rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-accent {status === option.status ? 'border-primary ring-2 ring-ring/30' : 'border-border'}"
									aria-pressed={status === option.status}
									onclick={() => selectStatus(option.status)}
								>
									<span class="flex min-h-16 items-start justify-between gap-3">
										<span class="min-w-0">
											<span class="block font-medium">{t(option.labelKey)}</span>
											<span class="mt-1 block min-h-10 text-xs leading-5 text-muted-foreground">{t(option.detailKey)}</span>
										</span>
										<span class="text-right">
											<span class="block text-2xl font-semibold {option.textClass}">{statusCount(option.status)}</span>
											<span class="mt-1 block text-xs text-muted-foreground">{statusPercentLabel(option.status)}%</span>
										</span>
									</span>
									<span class="mt-auto block h-2 rounded-full bg-muted">
										<span class="block h-2 rounded-full {option.barClass}" style={`width: ${statusPercent(option.status)}%`}></span>
									</span>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="grid gap-3 md:grid-cols-3">
						<div class="space-y-1">
							<span class="text-sm font-medium">{t(analyticsKey('periodStartDate'))}</span>
							<DateField bind:value={periodStartDate} max={todayDate} ariaLabel={t(analyticsKey('periodStartDate'))} onChange={selectPeriodStartDate} />
						</div>
						<div class="space-y-1">
							<span class="text-sm font-medium">{t(analyticsKey('periodToday'))}</span>
							<span class="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">{formatDateForDisplay(todayDate)}</span>
						</div>
						<div class="space-y-1">
							<span class="text-sm font-medium">{t(analyticsKey('periodEndDate'))}</span>
							<DateField bind:value={periodEndDate} min={todayDate} ariaLabel={t(analyticsKey('periodEndDate'))} onChange={selectPeriodEndDate} />
						</div>
					</div>
				{/if}
			</div>

			{#if statusError}
				<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{statusError}</p>
			{/if}

			<div class="mt-5 border-t border-border pt-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<h3 class="text-base font-semibold">{t(statusSectionTitleKey())}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{t(analyticsKey('listDescription'))}</p>
					</div>
					<div class="flex flex-col gap-2 sm:items-end">
						<label class="text-sm font-medium" for="status-order">{t(analyticsKey('order'))}</label>
						<div class="flex items-center gap-2">
							<Select
								id="status-order"
								class="h-9 w-40"
								value={statusOrder}
								options={[
									{ value: 'recent', label: t(analyticsKey('order.recent')) },
									{ value: 'old', label: t(analyticsKey('order.old')) }
								]}
								onchange={(value) => selectStatusOrder(value as string)}
							/>
							<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{items.length}</span>
						</div>
					</div>
				</div>

				{#if statusLoading || (statusListLoading && visibleItems.length === 0)}
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
										disabled={!hasContacts(item.ownerContacts)}
										onclick={() => openContactDialog(item)}
										aria-label={`${t('owner.contact')}: ${ownerDisplayName(item)}`}
									>
										<Phone class="size-4" />
										{t('owner.contact')}
									</button>
								</div>
							</article>
						{/each}
						{#if statusListLoading}
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

					<div class="space-y-1">
						<label class="block text-sm font-medium" for="history-order">{t(analyticsKey('order'))}</label>
						<Select
							id="history-order"
							value={historyOrder}
							options={[
								{ value: 'recent', label: t(analyticsKey('order.recent')) },
								{ value: 'old', label: t(analyticsKey('order.old')) }
							]}
							onchange={(value) => selectHistoryOrder(value as string)}
						/>
					</div>
				</div>

				<div class="min-w-0">
					{#if historyLoading || catalogLoading}
						<div class="space-y-3">
							{#each Array(8) as _}
								<div class="h-9 animate-pulse rounded-md bg-muted"></div>
							{/each}
						</div>
					{:else if sortedHistory.length === 0}
						<p class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t(analyticsKey('emptyHistory'))}</p>
					{:else}
						<div class="max-h-128 space-y-3 overflow-auto pr-1">
							{#each sortedHistory as point}
								<div class="grid grid-cols-[4.75rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem]">
									<span class="truncate text-muted-foreground">{point.label}</span>
									<span class="h-3 rounded-full bg-muted">
										<span class="block h-3 rounded-full bg-primary" style={`width: ${historyWidth(point)}%`}></span>
									</span>
									<span class="text-right font-medium">{point.count}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</section>
	{/if}
</section>
