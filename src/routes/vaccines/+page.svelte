<script lang="ts">
	import { onMount, tick } from 'svelte';
	import OwnerContactDialog from '$lib/components/owner/OwnerContactDialog.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import type { OwnerContact } from '$lib/domain/owner/owner.js';
	import type { TranslationKey } from '$lib/i18n/index.js';
	import { i18n, t } from '$lib/i18n/index.js';
	import type { VaccineDueFilterMode, VaccineHistoryPeriod, VaccineStatusItem, VaccineStatusKey, VaccineStatusSummary } from '$lib/domain/vaccine/analytics.js';
	import { emptyVaccineStatusSummary, shiftIsoDate, todayIsoDate, vaccineHistoryPeriods, vaccineStatusKeys } from '$lib/domain/vaccine/analytics.js';
	import type { VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
	import { formatDateForDisplay, formatDateForInput } from '$lib/domain/shared/date-input.js';
	import {
		loadVaccineAnalyticsOverview,
		loadAnalyticsVaccinePresets,
		loadVaccineHistory,
		loadVaccineStatusItems
	} from '$lib/services/vaccine-analytics.service.js';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Phone from '@lucide/svelte/icons/phone';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import Syringe from '@lucide/svelte/icons/syringe';

	type ActiveTab = 'status' | 'history';
	type SortOrder = 'recent' | 'old';
	type HistoryPoint = { key: string; label: string; count: number };

	const statusOptions: { status: VaccineStatusKey; labelKey: TranslationKey; detailKey: TranslationKey; barClass: string; textClass: string }[] = [
		{ status: 'current', labelKey: 'vaccine.status.current', detailKey: 'vaccine.status.currentDetail', barClass: 'bg-emerald-600', textClass: 'text-emerald-700' },
		{ status: 'dueSoon', labelKey: 'vaccine.status.dueSoon', detailKey: 'vaccine.status.dueSoonDetail', barClass: 'bg-sky-600', textClass: 'text-sky-700' },
		{ status: 'dueVerySoon', labelKey: 'vaccine.status.dueVerySoon', detailKey: 'vaccine.status.dueVerySoonDetail', barClass: 'bg-amber-600', textClass: 'text-amber-700' },
		{ status: 'expired', labelKey: 'vaccine.status.expired', detailKey: 'vaccine.status.expiredDetail', barClass: 'bg-orange-600', textClass: 'text-orange-700' },
		{ status: 'overdue', labelKey: 'vaccine.status.overdue', detailKey: 'vaccine.status.overdueDetail', barClass: 'bg-destructive', textClass: 'text-destructive' }
	];

	const todayDate = todayIsoDate();
	const defaultPeriodStartDate = shiftIsoDate(todayDate, -30);
	const defaultPeriodEndDate = shiftIsoDate(todayDate, 30);

	let dueFilterMode = $state<VaccineDueFilterMode>('preset');
	let status = $state<VaccineStatusKey>('expired');
	let periodStartDate = $state(defaultPeriodStartDate);
	let periodEndDate = $state(defaultPeriodEndDate);
	let period = $state<VaccineHistoryPeriod>('month');
	let vaccinePresetId = $state<number | null>(null);
	let activeTab = $state<ActiveTab>('status');
	let statusOrder = $state<SortOrder>('recent');
	let historyOrder = $state<SortOrder>('recent');
	let items = $state<VaccineStatusItem[]>([]);
	let visibleItems = $state<VaccineStatusItem[]>([]);
	let statusSummary = $state<VaccineStatusSummary>(emptyVaccineStatusSummary());
	let statusTotalTracked = $state(0);
	let history = $state<HistoryPoint[]>([]);
	let presets = $state<VaccinePreset[]>([]);
	let statusLoading = $state(false);
	let statusListLoading = $state(false);
	let historyLoading = $state(false);
	let presetsLoading = $state(false);
	let statusLoaded = $state(false);
	let historyLoaded = $state(false);
	let presetsLoaded = $state(false);
	let statusError = $state('');
	let historyError = $state('');
	let contactDialogOpen = $state(false);
	let contactDialogOwnerName = $state('');
	let contactDialogContacts = $state<OwnerContact[]>([]);
	let statusRequestId = 0;
	let statusRenderRequestId = 0;
	let historyRequestId = 0;
	let presetsRequestId = 0;

	const sortedHistory = $derived(sortHistoryPoints(history, historyOrder));
	const maxHistoryCount = $derived(history.reduce((max, point) => Math.max(max, point.count), 0));

	function normalizeStatus(value: string | null): VaccineStatusKey {
		return vaccineStatusKeys.includes(value as VaccineStatusKey) ? (value as VaccineStatusKey) : 'expired';
	}

	function normalizeDueFilterMode(value: string | null): VaccineDueFilterMode {
		return value === 'period' || value === 'preset' ? value : 'preset';
	}

	function normalizePeriodStartDate(value: string | null): string {
		const normalized = formatDateForInput(value);
		return normalized && normalized <= todayDate ? normalized : defaultPeriodStartDate;
	}

	function normalizePeriodEndDate(value: string | null): string {
		const normalized = formatDateForInput(value);
		return normalized && normalized >= todayDate ? normalized : defaultPeriodEndDate;
	}

	function normalizePeriod(value: string | null): VaccineHistoryPeriod {
		return vaccineHistoryPeriods.includes(value as VaccineHistoryPeriod) ? (value as VaccineHistoryPeriod) : 'month';
	}

	function normalizeOrder(value: string | null): SortOrder {
		return value === 'recent' || value === 'old' ? value : 'recent';
	}

	function periodLabelKey(value: VaccineHistoryPeriod): TranslationKey {
		return `vaccine.history.period.${value}` as TranslationKey;
	}

	function statusLabelKey(value: VaccineStatusKey): TranslationKey {
		return `vaccine.status.${value}` as TranslationKey;
	}

	function statusSectionTitleKey(): TranslationKey {
		return dueFilterMode === 'preset' ? statusLabelKey(status) : 'vaccine.analytics.periodFilterTitle';
	}

	function statusCount(value: VaccineStatusKey): number {
		return statusSummary[value] ?? 0;
	}

	function statusPercent(value: VaccineStatusKey): number {
		if (statusTotalTracked <= 0) return 0;

		const count = statusCount(value);
		if (count <= 0) return 0;

		const percent = (count / statusTotalTracked) * 100;
		const rounded = Math.round(percent * 10) / 10;
		return rounded >= 0.1 ? rounded : 0.1;
	}

	function statusPercentLabel(value: VaccineStatusKey): string {
		const count = statusCount(value);
		if (statusTotalTracked <= 0 || count <= 0) return '0';

		const rawPercent = (count / statusTotalTracked) * 100;
		const formatter = new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
		if (rawPercent < 0.1) return `< ${formatter.format(0.1)}`;
		return formatter.format(Math.round(rawPercent * 10) / 10);
	}

	function sortStatusItems(source: VaccineStatusItem[], order: SortOrder): VaccineStatusItem[] {
		const direction = order === 'recent' ? -1 : 1;
		return [...source].sort((first, second) => {
			const dueCompare = first.dueAt.localeCompare(second.dueAt);
			if (dueCompare !== 0) return dueCompare * direction;

			const appliedCompare = first.appliedAt.localeCompare(second.appliedAt);
			if (appliedCompare !== 0) return appliedCompare * direction;

			return first.ownerName.localeCompare(second.ownerName) || first.petName.localeCompare(second.petName) || first.vaccineName.localeCompare(second.vaccineName);
		});
	}

	function sortHistoryPoints(source: HistoryPoint[], order: SortOrder): HistoryPoint[] {
		return [...source].sort((first, second) => (order === 'recent' ? second.key.localeCompare(first.key) : first.key.localeCompare(second.key)));
	}

	function updateUrl() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams();
		params.set('tab', activeTab);
		params.set('filterMode', dueFilterMode);
		if (dueFilterMode === 'preset') params.set('status', status);
		if (dueFilterMode === 'period') {
			params.set('startDate', periodStartDate);
			params.set('endDate', periodEndDate);
		}
		params.set('statusOrder', statusOrder);
		params.set('period', period);
		params.set('historyOrder', historyOrder);
		if (vaccinePresetId) params.set('presetId', String(vaccinePresetId));
		window.history.replaceState(null, '', `/vaccines?${params.toString()}`);
	}

	function isRefreshing(): boolean {
		return activeTab === 'status' ? statusLoading : historyLoading || presetsLoading;
	}

	async function waitForNextPaint() {
		await tick();
		if (typeof requestAnimationFrame === 'undefined') return;
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}

	async function renderStatusItemsInChunks(source: VaccineStatusItem[], order = statusOrder) {
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

	function cancelStatusListRender() {
		statusRenderRequestId += 1;
		statusListLoading = false;
		visibleItems = [];
	}

	async function loadStatusData() {
		const requestId = ++statusRequestId;
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
				loadVaccineStatusItems({ mode: requestedFilterMode, status: requestedStatus, startDate: requestedStartDate, endDate: requestedEndDate }),
				loadVaccineAnalyticsOverview()
			]);
			if (requestId !== statusRequestId || requestedFilterMode !== dueFilterMode || requestedStatus !== status || requestedStartDate !== periodStartDate || requestedEndDate !== periodEndDate) return;
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
		const requestedPeriod = period;
		const requestedPresetId = vaccinePresetId;
		historyLoading = true;
		historyError = '';
		try {
			const loadedHistory = await loadVaccineHistory({ period: requestedPeriod, vaccinePresetId: requestedPresetId });
			if (requestId !== historyRequestId || requestedPeriod !== period || requestedPresetId !== vaccinePresetId) return;
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

	async function loadPresetData(force = false) {
		if (!force && presetsLoaded) {
			presetsLoading = false;
			return;
		}

		const requestId = ++presetsRequestId;
		presetsLoading = true;
		historyError = '';
		try {
			const loadedPresets = await loadAnalyticsVaccinePresets();
			if (requestId !== presetsRequestId) return;
			presets = loadedPresets;
			presetsLoaded = true;
		} catch (err) {
			if (requestId !== presetsRequestId) return;
			console.error(err);
			historyError = err instanceof Error ? err.message : t('common.error');
		} finally {
			if (requestId === presetsRequestId) presetsLoading = false;
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

	function queueHistoryLoad(forcePresets = false) {
		historyLoading = true;
		historyLoaded = false;
		if (forcePresets || !presetsLoaded) presetsLoading = true;
		void waitForNextPaint().then(() => Promise.all([loadHistoryData(), loadPresetData(forcePresets)]));
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
		if (tab === 'history' && ((!historyLoaded && !historyLoading) || (!presetsLoaded && !presetsLoading))) queueHistoryLoad();
	}

	function selectStatus(value: string) {
		activeTab = 'status';
		dueFilterMode = 'preset';
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

	function selectPeriod(nextPeriod: VaccineHistoryPeriod) {
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

	function selectPreset(value: string) {
		activeTab = 'history';
		vaccinePresetId = Number(value) > 0 ? Number(value) : null;
		updateUrl();
		queueHistoryLoad();
	}

	function historyWidth(point: HistoryPoint): number {
		return maxHistoryCount > 0 ? Math.max(4, Math.round((point.count / maxHistoryCount) * 100)) : 0;
	}

	function daysText(item: VaccineStatusItem): string {
		const absoluteDays = Math.abs(item.daysUntilDue);
		const unit = absoluteDays === 1 ? t('vaccine.daySingular') : t('vaccine.dayPlural');
		if (item.daysUntilDue < 0) return `${absoluteDays} ${unit} ${t('vaccine.status.daysOverdue')}`;
		if (item.daysUntilDue === 0) return t('vaccine.status.expiresToday');
		return `${item.daysUntilDue} ${unit} ${t('vaccine.status.daysUntilDue')}`;
	}

	function hasContacts(contacts: OwnerContact[]): boolean {
		return contacts.some((contact) => contact.value.trim().length > 0);
	}

	function openContactDialog(item: VaccineStatusItem) {
		contactDialogOwnerName = item.ownerName;
		contactDialogContacts = item.ownerContacts;
		contactDialogOpen = true;
	}

	function initialActiveTab(params: URLSearchParams): ActiveTab {
		const tab = params.get('tab');
		if (tab === 'history' || tab === 'status') return tab;
		if (params.has('status') || params.has('filterMode') || params.has('startDate') || params.has('endDate')) return 'status';
		return params.has('period') || params.has('presetId') ? 'history' : 'status';
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
			const presetParam = Number(params.get('presetId'));
			vaccinePresetId = presetParam > 0 ? presetParam : null;
			activeTab = initialActiveTab(params);
		}
		loadInitialTab();
	});
</script>

<svelte:head>
	<title>{t('vaccine.analytics.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t('vaccine.analytics.kicker')}</p>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t('vaccine.analytics.title')}</h2>
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('vaccine.analytics.description')}</p>
		</div>
		<button class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-60" type="button" disabled={isRefreshing()} onclick={() => void refreshActiveTab()}>
			<RotateCw class="size-4" />
			{t('actions.refresh')}
		</button>
	</header>

	<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('vaccine.analytics.title')}>
		<button
			class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === 'status' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
			type="button"
			role="tab"
			aria-selected={activeTab === 'status'}
			onclick={() => selectTab('status')}
		>
			<Syringe class="size-4" />
			<span class="truncate">{t('vaccine.analytics.statusTitle')}</span>
		</button>
		<button
			class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
			type="button"
			role="tab"
			aria-selected={activeTab === 'history'}
			onclick={() => selectTab('history')}
		>
			<CalendarDays class="size-4" />
			<span class="truncate">{t('vaccine.analytics.historyTitle')}</span>
		</button>
	</div>

	{#if activeTab === 'status'}
		<section class="min-w-0 rounded-md border border-border bg-card p-4 shadow-sm sm:p-5" role="tabpanel">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<Syringe class="size-4" />
				{t('vaccine.analytics.statusTitle')}
			</div>

			<div class="mt-4 grid gap-3 rounded-md border border-border bg-background p-3 lg:grid-cols-[14rem_minmax(0,1fr)]">
				<div class="space-y-1">
					<label class="text-sm font-medium" for="due-filter-mode">{t('vaccine.analytics.filterMode')}</label>
					<select id="due-filter-mode" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={dueFilterMode} onchange={(event) => selectDueFilterMode(event.currentTarget.value)}>
						<option value="preset">{t('vaccine.analytics.filterMode.preset')}</option>
						<option value="period">{t('vaccine.analytics.filterMode.period')}</option>
					</select>
				</div>

				{#if dueFilterMode === 'preset'}
					<div class="space-y-2">
						<span class="text-sm font-medium">{t('vaccine.analytics.statusFilter')}</span>
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
							<span class="text-sm font-medium">{t('vaccine.analytics.periodStartDate')}</span>
							<DateField bind:value={periodStartDate} max={todayDate} ariaLabel={t('vaccine.analytics.periodStartDate')} onChange={selectPeriodStartDate} />
						</div>
						<div class="space-y-1">
							<span class="text-sm font-medium">{t('vaccine.analytics.periodToday')}</span>
							<span class="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">{formatDateForDisplay(todayDate)}</span>
						</div>
						<div class="space-y-1">
							<span class="text-sm font-medium">{t('vaccine.analytics.periodEndDate')}</span>
							<DateField bind:value={periodEndDate} min={todayDate} ariaLabel={t('vaccine.analytics.periodEndDate')} onChange={selectPeriodEndDate} />
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
						<p class="mt-1 text-sm text-muted-foreground">{t('vaccine.analytics.listDescription')}</p>
					</div>
					<div class="flex flex-col gap-2 sm:items-end">
						<label class="text-sm font-medium" for="status-order">{t('vaccine.analytics.order')}</label>
						<div class="flex items-center gap-2">
							<select id="status-order" class="h-9 rounded-md border border-input bg-background px-3 text-sm" value={statusOrder} onchange={(event) => selectStatusOrder(event.currentTarget.value)}>
								<option value="recent">{t('vaccine.analytics.order.recent')}</option>
								<option value="old">{t('vaccine.analytics.order.old')}</option>
							</select>
							<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{items.length}</span>
						</div>
					</div>
				</div>

				{#if statusLoading || (statusListLoading && visibleItems.length === 0)}
					<div class="mt-4 space-y-3">
						{#each Array(5) as _}
							<div class="h-24 animate-pulse rounded-md bg-muted"></div>
						{/each}
					</div>
				{:else if items.length === 0}
					<p class="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('vaccine.analytics.emptyStatus')}</p>
				{:else}
					<div class="mt-4 divide-y divide-border rounded-md border border-border">
						{#each visibleItems as item}
							<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
								<div class="flex min-w-0 items-start gap-3">
									<PetAvatar avatarBytes={item.petAvatarBytes} petName={item.petName} className="size-11" iconClass="size-5 text-primary" />
									<div class="min-w-0">
										<p class="wrap-break-word text-sm font-semibold">{item.petName} · {item.vaccineName}</p>
										<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{item.ownerName}</p>
										<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
											<span>{t('vaccine.appliedAt')}: {formatDateForDisplay(item.appliedAt)}</span>
											<span>{t('vaccine.analytics.dueAt')}: {formatDateForDisplay(item.dueAt)}</span>
											<span>{daysText(item)}</span>
										</div>
									</div>
								</div>
								<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
									<a href={`/owners/${item.ownerId}/pets/${item.petId}`} class="inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent sm:w-auto">
										{t('actions.openPet')}
									</a>
									<button
										class="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 sm:w-auto"
										type="button"
										disabled={!hasContacts(item.ownerContacts)}
										onclick={() => openContactDialog(item)}
										aria-label={`${t('owner.contact')}: ${item.ownerName}`}
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
				{t('vaccine.analytics.historyTitle')}
			</div>

			{#if historyError}
				<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{historyError}</p>
			{/if}

			<div class="mt-4 grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
				<div class="space-y-3">
					<label class="block text-sm font-medium" for="history-period">{t('vaccine.analytics.period')}</label>
					<div id="history-period" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
						{#each vaccineHistoryPeriods as option}
							<button class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60 {period === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}" type="button" disabled={historyLoading && period === option} onclick={() => selectPeriod(option)}>
								{t(periodLabelKey(option))}
							</button>
						{/each}
					</div>

					<label class="block text-sm font-medium" for="history-vaccine">{t('vaccine.analytics.vaccineFilter')}</label>
					<select id="history-vaccine" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60" value={vaccinePresetId ?? ''} disabled={presetsLoading || historyLoading} onchange={(event) => selectPreset(event.currentTarget.value)}>
						<option value="">{t('vaccine.analytics.allVaccines')}</option>
						{#each presets as preset}
							<option value={preset.id}>{preset.name}</option>
						{/each}
					</select>

					<label class="block text-sm font-medium" for="history-order">{t('vaccine.analytics.order')}</label>
					<select id="history-order" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={historyOrder} onchange={(event) => selectHistoryOrder(event.currentTarget.value)}>
						<option value="recent">{t('vaccine.analytics.order.recent')}</option>
						<option value="old">{t('vaccine.analytics.order.old')}</option>
					</select>
				</div>

				<div class="min-w-0">
					{#if historyLoading || presetsLoading}
						<div class="space-y-3">
							{#each Array(8) as _}
								<div class="h-9 animate-pulse rounded-md bg-muted"></div>
							{/each}
						</div>
					{:else if history.length === 0}
						<p class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('vaccine.analytics.emptyHistory')}</p>
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
