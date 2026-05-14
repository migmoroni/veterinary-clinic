<script lang="ts">
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import OwnerContactDialog from '$lib/components/owner/OwnerContactDialog.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PetAvatar from '$lib/components/pet/PetAvatar.svelte';
	import {
		dashboardAnalysisViews,
		type DashboardAnalysisView,
		type DashboardBucket,
		type DashboardNamedBucket,
		type DashboardOwnerStudyItem,
		type DashboardOwnerStudyPet,
		type DashboardPetStudyItem,
		type DashboardPetStudyVaccine,
		type DashboardVaccineStatusKey
	} from '$lib/domain/dashboard/analytics.js';
	import type { OwnerContact } from '$lib/domain/owner/owner.js';
	import { getPetBreedOption, getPetSpeciesOption, isPetBreed, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import type { VaccineDueFilterMode, VaccineHistoryPeriod, VaccineHistoryPoint, VaccineStatusItem, VaccineStatusKey, VaccineStatusSummary } from '$lib/domain/vaccine/analytics.js';
	import { emptyVaccineStatusSummary, shiftIsoDate, todayIsoDate, vaccineHistoryPeriods, vaccineStatusKeys } from '$lib/domain/vaccine/analytics.js';
	import type { VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
	import { formatDateForDisplay, formatDateForInput } from '$lib/domain/shared/date-input.js';
	import { loadAnalyticsVaccinePresets, loadVaccineAnalyticsOverview, loadVaccineHistory, loadVaccineStatusItems } from '$lib/services/vaccine-analytics.service.js';
	import { clinic } from '$lib/stores/clinic.svelte.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import ChartColumn from '@lucide/svelte/icons/chart-column';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import PawPrint from '@lucide/svelte/icons/paw-print';
	import Phone from '@lucide/svelte/icons/phone';
	import RotateCw from '@lucide/svelte/icons/rotate-cw';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import UserPlus from '@lucide/svelte/icons/user-plus';
	import X from '@lucide/svelte/icons/x';

	type VaccineAnalysisTab = 'status' | 'history';
	type SortOrder = 'recent' | 'old';
	type StudyTarget = 'vaccines' | 'pets' | 'owners';
	type StudyOwnerSummary = DashboardOwnerStudyItem;
	type StudyPetSnapshot = DashboardPetStudyItem | DashboardOwnerStudyPet;
	type StudyVaccineSummary = DashboardPetStudyVaccine & { id: string; pet: DashboardPetStudyItem };
	type StudyFactorSummary = { label: string; value: string; count: number };
	type StudyFactorKind = 'vaccinePreset' | 'vaccineStatus' | 'species' | 'breed' | 'sex' | 'age' | 'city' | 'location';
	type StudyDimension = 'vaccinePreset' | 'vaccineStatus' | 'petSpecies' | 'petBreed' | 'petSex' | 'petAge' | 'petVaccineStatus' | 'ownerLocation' | 'ownerPetCount' | 'ownerPetVaccineStatus' | 'ownerPetSpecies';
	type StudyVisualizationMode = 'bars' | 'table';
	type StudyCrossBucket = { primaryLabel: string; secondaryLabel: string; count: number };
	type StudyDimensionOption = { dimension: StudyDimension; labelKey: TranslationKey };

	const viewOptions = [
		{ view: 'general', labelKey: 'analysis.view.general', icon: ChartColumn },
		{ view: 'vaccines', labelKey: 'analysis.view.vaccines', icon: Syringe },
		{ view: 'pets', labelKey: 'analysis.view.pets', icon: PawPrint },
		{ view: 'owners', labelKey: 'analysis.view.owners', icon: UserPlus }
	] as const;

	const vaccineCards: { status: VaccineStatusKey; labelKey: TranslationKey; detailKey: TranslationKey; barClass: string; textClass: string }[] = [
		{ status: 'current', labelKey: 'vaccine.status.current', detailKey: 'vaccine.status.currentDetail', barClass: 'bg-emerald-600', textClass: 'text-emerald-700' },
		{ status: 'dueSoon', labelKey: 'vaccine.status.dueSoon', detailKey: 'vaccine.status.dueSoonDetail', barClass: 'bg-sky-600', textClass: 'text-sky-700' },
		{ status: 'dueVerySoon', labelKey: 'vaccine.status.dueVerySoon', detailKey: 'vaccine.status.dueVerySoonDetail', barClass: 'bg-amber-600', textClass: 'text-amber-700' },
		{ status: 'expired', labelKey: 'vaccine.status.expired', detailKey: 'vaccine.status.expiredDetail', barClass: 'bg-orange-600', textClass: 'text-orange-700' },
		{ status: 'overdue', labelKey: 'vaccine.status.overdue', detailKey: 'vaccine.status.overdueDetail', barClass: 'bg-destructive', textClass: 'text-destructive' }
	];

	const studyTargetOptions = [
		{ target: 'vaccines', labelKey: 'analysis.study.axis.vaccines', descriptionKey: 'analysis.study.axis.vaccinesDescription', icon: Syringe },
		{ target: 'pets', labelKey: 'analysis.study.axis.pets', descriptionKey: 'analysis.study.axis.petsDescription', icon: PawPrint },
		{ target: 'owners', labelKey: 'analysis.study.axis.owners', descriptionKey: 'analysis.study.axis.ownersDescription', icon: UserPlus }
	] as const;

	const studyVaccineStatusWeight: Record<DashboardVaccineStatusKey, number> = {
		untracked: 0,
		current: 1,
		dueSoon: 2,
		dueVerySoon: 3,
		expired: 4,
		overdue: 5
	};

	const todayDate = todayIsoDate();
	const defaultPeriodStartDate = shiftIsoDate(todayDate, -30);
	const defaultPeriodEndDate = shiftIsoDate(todayDate, 30);

	const activeView = $derived(normalizeView(page.url.searchParams.get('view')));
	let vaccineTab = $state<VaccineAnalysisTab>('status');
	let dueFilterMode = $state<VaccineDueFilterMode>('preset');
	let status = $state<VaccineStatusKey>('expired');
	let periodStartDate = $state(defaultPeriodStartDate);
	let periodEndDate = $state(defaultPeriodEndDate);
	let period = $state<VaccineHistoryPeriod>('month');
	let vaccinePresetId = $state<number | null>(null);
	let statusOrder = $state<SortOrder>('recent');
	let historyOrder = $state<SortOrder>('recent');
	let vaccineStatusItems = $state<VaccineStatusItem[]>([]);
	let visibleVaccineStatusItems = $state<VaccineStatusItem[]>([]);
	let vaccineStatusSummary = $state<VaccineStatusSummary>(emptyVaccineStatusSummary());
	let vaccineStatusTotalTracked = $state(0);
	let vaccineHistory = $state<VaccineHistoryPoint[]>([]);
	let vaccinePresets = $state<VaccinePreset[]>([]);
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
	let studyTarget = $state<StudyTarget>('pets');
	let studyPrimaryDimension = $state<StudyDimension>('petBreed');
	let studySecondaryDimension = $state<StudyDimension>('petVaccineStatus');
	let studyVisualizationMode = $state<StudyVisualizationMode>('bars');
	let studySpecies = $state('');
	let studyBreed = $state('');
	let studySex = $state('');
	let studyAge = $state('');
	let studyVaccineStatus = $state('');
	let studyVaccinePresetId = $state('');
	let studyCity = $state('');
	let studyLocation = $state('');
	let statusRequestId = 0;
	let statusRenderRequestId = 0;
	let historyRequestId = 0;
	let presetsRequestId = 0;
	let vaccineParamsInitialized = $state(false);

	const sortedVaccineHistory = $derived(sortHistoryPoints(vaccineHistory, historyOrder));
	const maxVaccineHistoryCount = $derived(vaccineHistory.reduce((max, point) => Math.max(max, point.count), 0));
	const allStudyVaccines = $derived(studyVaccineItems(allStudyPets()));
	const filteredStudyPets = $derived(filterStudyPets(clinic.dashboard?.analytics.study.pets ?? []));
	const filteredStudyVaccineItems = $derived(filterStudyVaccineItems(allStudyVaccines));
	const filteredStudyOwners = $derived(filterStudyOwners(allStudyOwners()));
	const studyTargetPets = $derived(resolveStudyTargetPets());
	const studyTargetOwners = $derived(resolveStudyTargetOwners());
	const studyTargetVaccines = $derived(resolveStudyTargetVaccines());
	const selectedStudyBuckets = $derived(buildStudyVisualizationBuckets());
	const selectedStudyFactors = $derived(studyFactorSummaries());

	function normalizeView(value: string | null): DashboardAnalysisView {
		return dashboardAnalysisViews.includes(value as DashboardAnalysisView) ? (value as DashboardAnalysisView) : 'general';
	}

	function viewHref(view: DashboardAnalysisView): string {
		return `/dashboard?view=${view}`;
	}

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

	function vaccineStatusLabelKey(value: VaccineStatusKey): TranslationKey {
		return `vaccine.status.${value}` as TranslationKey;
	}

	function statusSectionTitleKey(): TranslationKey {
		return dueFilterMode === 'preset' ? vaccineStatusLabelKey(status) : 'vaccine.analytics.periodFilterTitle';
	}

	function vaccineStatusCount(value: VaccineStatusKey): number {
		return vaccineStatusSummary[value] ?? 0;
	}

	function vaccineStatusPercent(value: VaccineStatusKey): number {
		if (vaccineStatusTotalTracked <= 0) return 0;

		const count = vaccineStatusCount(value);
		if (count <= 0) return 0;

		const percent = (count / vaccineStatusTotalTracked) * 100;
		const rounded = Math.round(percent * 10) / 10;
		return rounded >= 0.1 ? rounded : 0.1;
	}

	function vaccineStatusPercentLabel(value: VaccineStatusKey): string {
		const count = vaccineStatusCount(value);
		if (vaccineStatusTotalTracked <= 0 || count <= 0) return '0';

		const rawPercent = (count / vaccineStatusTotalTracked) * 100;
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

			return ownerDisplayName(first).localeCompare(ownerDisplayName(second)) || first.petName.localeCompare(second.petName) || first.vaccineName.localeCompare(second.vaccineName);
		});
	}

	function ownerDisplayName(item: VaccineStatusItem): string {
		return item.ownerName || t('owner.unassigned');
	}

	function petProfileHref(item: VaccineStatusItem): string {
		return `/pets/${item.petId}`;
	}

	function sortHistoryPoints(source: VaccineHistoryPoint[], order: SortOrder): VaccineHistoryPoint[] {
		return [...source].sort((first, second) => (order === 'recent' ? second.key.localeCompare(first.key) : first.key.localeCompare(second.key)));
	}

	function updateVaccineUrl() {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		params.set('view', 'vaccines');
		params.set('tab', vaccineTab);
		params.set('filterMode', dueFilterMode);
		if (dueFilterMode === 'preset') {
			params.set('status', status);
			params.delete('startDate');
			params.delete('endDate');
		}
		if (dueFilterMode === 'period') {
			params.delete('status');
			params.set('startDate', periodStartDate);
			params.set('endDate', periodEndDate);
		}
		params.set('statusOrder', statusOrder);
		params.set('period', period);
		params.set('historyOrder', historyOrder);
		if (vaccinePresetId) params.set('presetId', String(vaccinePresetId));
		else params.delete('presetId');
		window.history.replaceState(null, '', `/dashboard?${params.toString()}`);
	}

	function isVaccineRefreshing(): boolean {
		return vaccineTab === 'status' ? statusLoading : historyLoading || presetsLoading;
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
		visibleVaccineStatusItems = [];
		await waitForNextPaint();

		const chunkSize = 80;
		for (let index = 0; index < sortedSource.length; index += chunkSize) {
			if (requestId !== statusRenderRequestId || vaccineTab !== 'status') return;
			visibleVaccineStatusItems = sortedSource.slice(0, Math.min(sortedSource.length, index + chunkSize));
			await waitForNextPaint();
		}

		if (requestId === statusRenderRequestId) statusListLoading = false;
	}

	function cancelStatusListRender() {
		statusRenderRequestId += 1;
		statusListLoading = false;
		visibleVaccineStatusItems = [];
	}

	async function loadStatusData() {
		const requestId = ++statusRequestId;
		const requestedFilterMode = dueFilterMode;
		const requestedStatus = status;
		const requestedStartDate = periodStartDate;
		const requestedEndDate = periodEndDate;
		statusLoading = true;
		statusListLoading = true;
		visibleVaccineStatusItems = [];
		statusError = '';
		try {
			const [loadedItems, loadedOverview] = await Promise.all([
				loadVaccineStatusItems({ mode: requestedFilterMode, status: requestedStatus, startDate: requestedStartDate, endDate: requestedEndDate }),
				loadVaccineAnalyticsOverview()
			]);
			if (requestId !== statusRequestId || requestedFilterMode !== dueFilterMode || requestedStatus !== status || requestedStartDate !== periodStartDate || requestedEndDate !== periodEndDate) return;
			vaccineStatusItems = loadedItems;
			vaccineStatusSummary = loadedOverview.summary;
			vaccineStatusTotalTracked = loadedOverview.totalTracked;
			statusLoaded = true;
			if (vaccineTab === 'status') void renderStatusItemsInChunks(loadedItems);
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
			vaccineHistory = loadedHistory;
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
			vaccinePresets = loadedPresets;
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
		vaccineStatusItems = [];
		visibleVaccineStatusItems = [];
		void waitForNextPaint().then(() => loadStatusData());
	}

	function queueHistoryLoad(forcePresets = false) {
		historyLoading = true;
		historyLoaded = false;
		if (forcePresets || !presetsLoaded) presetsLoading = true;
		void waitForNextPaint().then(() => Promise.all([loadHistoryData(), loadPresetData(forcePresets)]));
	}

	function loadInitialVaccineTab() {
		if (vaccineTab === 'status') {
			queueStatusLoad();
			return;
		}

		queueHistoryLoad();
	}

	function refreshActiveVaccineTab() {
		if (vaccineTab === 'status') {
			queueStatusLoad();
			return;
		}

		queueHistoryLoad(true);
	}

	function refreshDashboardView() {
		void clinic.refresh();
		if (activeView === 'vaccines') refreshActiveVaccineTab();
	}

	function selectVaccineTab(tab: VaccineAnalysisTab) {
		vaccineTab = tab;
		if (tab === 'history') cancelStatusListRender();
		updateVaccineUrl();

		if (tab === 'status' && statusLoaded && !statusLoading) void renderStatusItemsInChunks(vaccineStatusItems);
		if (tab === 'status' && !statusLoaded && !statusLoading) queueStatusLoad();
		if (tab === 'history' && ((!historyLoaded && !historyLoading) || (!presetsLoaded && !presetsLoading))) queueHistoryLoad();
	}

	function selectStatus(value: string) {
		vaccineTab = 'status';
		dueFilterMode = 'preset';
		status = normalizeStatus(value);
		updateVaccineUrl();
		queueStatusLoad();
	}

	function selectDueFilterMode(value: string) {
		vaccineTab = 'status';
		dueFilterMode = normalizeDueFilterMode(value);
		updateVaccineUrl();
		queueStatusLoad();
	}

	function selectPeriodStartDate(value: string) {
		vaccineTab = 'status';
		dueFilterMode = 'period';
		periodStartDate = normalizePeriodStartDate(value);
		updateVaccineUrl();
		queueStatusLoad();
	}

	function selectPeriodEndDate(value: string) {
		vaccineTab = 'status';
		dueFilterMode = 'period';
		periodEndDate = normalizePeriodEndDate(value);
		updateVaccineUrl();
		queueStatusLoad();
	}

	function selectStatusOrder(value: string) {
		vaccineTab = 'status';
		statusOrder = normalizeOrder(value);
		updateVaccineUrl();

		if (statusLoaded && !statusLoading) void renderStatusItemsInChunks(vaccineStatusItems, statusOrder);
	}

	function selectPeriod(nextPeriod: VaccineHistoryPeriod) {
		vaccineTab = 'history';
		period = nextPeriod;
		updateVaccineUrl();
		queueHistoryLoad();
	}

	function selectHistoryOrder(value: string) {
		vaccineTab = 'history';
		historyOrder = normalizeOrder(value);
		updateVaccineUrl();
	}

	function selectPreset(value: string) {
		vaccineTab = 'history';
		vaccinePresetId = Number(value) > 0 ? Number(value) : null;
		updateVaccineUrl();
		queueHistoryLoad();
	}

	function vaccineHistoryWidth(point: VaccineHistoryPoint): number {
		return maxVaccineHistoryCount > 0 ? Math.max(4, Math.round((point.count / maxVaccineHistoryCount) * 100)) : 0;
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
		contactDialogOwnerName = ownerDisplayName(item);
		contactDialogContacts = item.ownerContacts;
		contactDialogOpen = true;
	}

	function initialVaccineTab(params: URLSearchParams): VaccineAnalysisTab {
		const tab = params.get('tab');
		if (tab === 'history' || tab === 'status') return tab;
		if (params.has('status') || params.has('filterMode') || params.has('startDate') || params.has('endDate')) return 'status';
		return params.has('period') || params.has('presetId') ? 'history' : 'status';
	}

	function initializeVaccineParams(params: URLSearchParams) {
		dueFilterMode = params.has('startDate') || params.has('endDate') ? 'period' : normalizeDueFilterMode(params.get('filterMode'));
		status = normalizeStatus(params.get('status'));
		periodStartDate = normalizePeriodStartDate(params.get('startDate'));
		periodEndDate = normalizePeriodEndDate(params.get('endDate'));
		statusOrder = normalizeOrder(params.get('statusOrder'));
		period = normalizePeriod(params.get('period'));
		historyOrder = normalizeOrder(params.get('historyOrder'));
		const presetParam = Number(params.get('presetId'));
		vaccinePresetId = presetParam > 0 ? presetParam : null;
		vaccineTab = initialVaccineTab(params);
		if (clinic.dashboard) {
			vaccineStatusSummary = clinic.dashboard.vaccines.summary;
			vaccineStatusTotalTracked = clinic.dashboard.vaccines.totalTracked;
		}
	}

	function metricFormatter(value: number): string {
		return new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(value);
	}

	function studyOptionLabel(label: string, count: number): string {
		return `${label} (${metricFormatter(count)})`;
	}

	function studyAllOptionLabel(): string {
		return t('analysis.study.all');
	}

	function allStudyPets(): DashboardPetStudyItem[] {
		return clinic.dashboard?.analytics.study.pets ?? [];
	}

	function allStudyOwners(): DashboardOwnerStudyItem[] {
		return clinic.dashboard?.analytics.study.owners ?? [];
	}

	function studyVaccineItems(pets: DashboardPetStudyItem[]): StudyVaccineSummary[] {
		return pets.flatMap((pet) => pet.vaccines.map((vaccine) => ({ ...vaccine, id: `${pet.id}:${vaccine.presetId}`, pet })));
	}

	function selectStudyTarget(target: StudyTarget): void {
		studyTarget = target;
		studyPrimaryDimension = defaultStudyPrimaryDimension(target);
		studySecondaryDimension = defaultStudySecondaryDimension(target);
	}

	function selectStudyVisualizationMode(mode: StudyVisualizationMode): void {
		studyVisualizationMode = mode;
	}

	function defaultStudyPrimaryDimension(target: StudyTarget): StudyDimension {
		if (target === 'vaccines') return 'vaccineStatus';
		if (target === 'owners') return 'ownerLocation';
		return 'petBreed';
	}

	function defaultStudySecondaryDimension(target: StudyTarget): StudyDimension {
		if (target === 'vaccines') return 'petSpecies';
		if (target === 'owners') return 'ownerPetVaccineStatus';
		return 'petVaccineStatus';
	}

	function availableStudyDimensions(): StudyDimensionOption[] {
		if (studyTarget === 'vaccines') {
			return [
				{ dimension: 'vaccineStatus', labelKey: 'analysis.study.vaccinesByStatus' },
				{ dimension: 'vaccinePreset', labelKey: 'analysis.study.vaccinesByPreset' },
				{ dimension: 'petSpecies', labelKey: 'analysis.pet.species' },
				{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' }
			];
		}

		if (studyTarget === 'owners') {
			return [
				{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' },
				{ dimension: 'ownerPetCount', labelKey: 'analysis.owner.petCount' },
				{ dimension: 'ownerPetVaccineStatus', labelKey: 'analysis.owner.vaccineStatus' },
				{ dimension: 'ownerPetSpecies', labelKey: 'analysis.study.ownersByPetSpecies' }
			];
		}

		return [
			{ dimension: 'petBreed', labelKey: 'analysis.pet.breed' },
			{ dimension: 'petSpecies', labelKey: 'analysis.pet.species' },
			{ dimension: 'petVaccineStatus', labelKey: 'analysis.pet.vaccineStatus' },
			{ dimension: 'petSex', labelKey: 'analysis.pet.sex' },
			{ dimension: 'petAge', labelKey: 'analysis.pet.age' },
			{ dimension: 'ownerLocation', labelKey: 'analysis.owner.location' }
		];
	}

	function studyDimensionOptions() {
		return availableStudyDimensions().map((option) => ({ value: option.dimension, label: t(option.labelKey) }));
	}

	function studyDimensionLabel(dimension: StudyDimension): string {
		return t(availableStudyDimensions().find((option) => option.dimension === dimension)?.labelKey ?? 'common.notInformed');
	}

	function studySpeciesOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets(), (pet) => pet.species).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(speciesLabel(bucket.key), bucket.count) }))];
	}

	function studyBreedOptions() {
		const source = studySpecies ? allStudyPets().filter((pet) => pet.species === studySpecies) : allStudyPets();
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(source, (pet) => pet.breed).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(breedLabel(bucket.key), bucket.count) }))];
	}

	function studySexOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets(), (pet) => pet.sex).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(sexLabel(bucket.key), bucket.count) }))];
	}

	function studyAgeOptions() {
		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets(), (pet) => pet.age).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(t(ageLabelKey(bucket.key)), bucket.count) }))];
	}

	function studyVaccinePresetOptions() {
		return [
			{ value: '', label: studyAllOptionLabel() },
			...(clinic.dashboard?.analytics.study.vaccinePresets ?? []).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(renderBucketLabel(bucket), bucket.count) }))
		];
	}

	function studyVaccineStatusOptions() {
		if (studyVaccinePresetId) {
			const presetId = Number(studyVaccinePresetId);
			const buckets = new Map<DashboardVaccineStatusKey, number>();
			for (const vaccine of allStudyVaccines) {
				if (vaccine.presetId !== presetId) continue;
				buckets.set(vaccine.status, (buckets.get(vaccine.status) ?? 0) + 1);
			}

			return [{ value: '', label: studyAllOptionLabel() }, ...toDashboardBuckets(buckets).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
		}

		if (studyTarget === 'vaccines') {
			return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyVaccines, (vaccine) => vaccine.status).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
		}

		return [{ value: '', label: studyAllOptionLabel() }, ...studyBuckets(allStudyPets(), (pet) => pet.vaccineStatus).map((bucket) => ({ value: bucket.key, label: studyOptionLabel(vaccineStatusLabel(bucket.key), bucket.count) }))];
	}

	function studyCityOptions() {
		const counts = new Map<string, number>();
		const labels = new Map<string, string>();
		for (const owner of allStudyOwners()) {
			counts.set(owner.cityKey, (counts.get(owner.cityKey) ?? 0) + 1);
			labels.set(owner.cityKey, owner.cityLabel ?? t('common.notInformed'));
		}

		const options = [...counts.entries()]
			.map(([key, count]) => ({ value: key, label: studyOptionLabel(labels.get(key) ?? t('common.notInformed'), count), count }))
			.sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
			.map(({ value, label }) => ({ value, label }));

		return [{ value: '', label: studyAllOptionLabel() }, ...options];
	}

	function studyLocationOptions() {
		const counts = new Map<string, number>();
		const labels = new Map<string, string>();
		for (const owner of allStudyOwners()) {
			if (studyCity && owner.cityKey !== studyCity) continue;
			counts.set(owner.locationKey, (counts.get(owner.locationKey) ?? 0) + 1);
			labels.set(owner.locationKey, owner.locationLabel ?? t('common.notInformed'));
		}

		const options = [...counts.entries()]
			.map(([key, count]) => ({ value: key, label: studyOptionLabel(labels.get(key) ?? t('common.notInformed'), count), count }))
			.sort((first, second) => second.count - first.count || first.label.localeCompare(second.label))
			.map(({ value, label }) => ({ value, label }));

		return [{ value: '', label: studyAllOptionLabel() }, ...options];
	}

	function studyPetMatchesVaccine(pet: StudyPetSnapshot): boolean {
		const presetId = Number(studyVaccinePresetId);
		if (presetId > 0 && studyVaccineStatus) return pet.vaccines.some((vaccine) => vaccine.presetId === presetId && vaccine.status === studyVaccineStatus);
		if (presetId > 0) return pet.vaccinePresetIds.includes(presetId);
		if (studyVaccineStatus) return pet.vaccineStatus === studyVaccineStatus;
		return true;
	}

	function studyPetMatchesDimensions(pet: StudyPetSnapshot): boolean {
		if (studySpecies && pet.species !== studySpecies) return false;
		if (studyBreed && pet.breed !== studyBreed) return false;
		if (studySex && pet.sex !== studySex) return false;
		if (studyAge && pet.age !== studyAge) return false;
		return true;
	}

	function ownerMatchesOwnerFilters(owner: StudyOwnerSummary): boolean {
		if (studyCity && owner.cityKey !== studyCity) return false;
		if (studyLocation && owner.locationKey !== studyLocation) return false;
		return true;
	}

	function petMatchesOwnerFilters(pet: DashboardPetStudyItem): boolean {
		if (!studyCity && !studyLocation) return true;
		return pet.owners.some((owner) => {
			if (studyCity && owner.cityKey !== studyCity) return false;
			if (studyLocation && owner.locationKey !== studyLocation) return false;
			return true;
		});
	}

	function studyVaccineMatchesFilters(vaccine: StudyVaccineSummary): boolean {
		const presetId = Number(studyVaccinePresetId);
		if (presetId > 0 && vaccine.presetId !== presetId) return false;
		if (studyVaccineStatus && vaccine.status !== studyVaccineStatus) return false;
		return true;
	}

	function filterStudyPets(items: DashboardPetStudyItem[]): DashboardPetStudyItem[] {
		return items.filter((pet) => studyPetMatchesDimensions(pet) && studyPetMatchesVaccine(pet) && petMatchesOwnerFilters(pet));
	}

	function filterStudyVaccineItems(items: StudyVaccineSummary[]): StudyVaccineSummary[] {
		return items.filter((vaccine) => studyPetMatchesDimensions(vaccine.pet) && petMatchesOwnerFilters(vaccine.pet) && studyVaccineMatchesFilters(vaccine));
	}

	function filterStudyOwners(items: DashboardOwnerStudyItem[]): DashboardOwnerStudyItem[] {
		const hasPetOrVaccineFilters = !!(studySpecies || studyBreed || studySex || studyAge || studyVaccinePresetId || studyVaccineStatus);
		return items.filter((owner) => {
			if (!ownerMatchesOwnerFilters(owner)) return false;
			if (!hasPetOrVaccineFilters) return true;
			return owner.pets.some((pet) => studyPetMatchesDimensions(pet) && studyPetMatchesVaccine(pet));
		});
	}

	function toDashboardBuckets<Key extends string>(buckets: Map<Key, number>): DashboardBucket<Key>[] {
		return [...buckets.entries()]
			.map(([key, count]) => ({ key, count }))
			.sort((first, second) => second.count - first.count || first.key.localeCompare(second.key));
	}

	function studyBuckets<Item, Key extends string>(items: Item[], getKey: (item: Item) => Key): DashboardBucket<Key>[] {
		const buckets = new Map<Key, number>();
		for (const item of items) {
			const key = getKey(item);
			buckets.set(key, (buckets.get(key) ?? 0) + 1);
		}

		return toDashboardBuckets(buckets);
	}

	function studyNamedBuckets<Item>(items: Item[], getKeys: (item: Item) => string[], getLabels: (item: Item) => string[]): DashboardNamedBucket[] {
		const buckets = new Map<string, { label: string | null; count: number }>();
		for (const item of items) {
			const keys = getKeys(item);
			const labels = getLabels(item);
			const countedKeys = new Set<string>();
			keys.forEach((key, index) => {
				if (countedKeys.has(key)) return;
				countedKeys.add(key);
				const label = labels[index] ?? null;
				const current = buckets.get(key) ?? { label, count: 0 };
				current.count += 1;
				buckets.set(key, current);
			});
		}

		return [...buckets.entries()]
			.map(([key, value]) => ({ key, label: value.label, count: value.count }))
			.sort((first, second) => second.count - first.count || renderBucketLabel(first).localeCompare(renderBucketLabel(second)));
	}

	function uniquePetsFromVaccines(vaccines: StudyVaccineSummary[]): DashboardPetStudyItem[] {
		const pets = new Map<number, DashboardPetStudyItem>();
		for (const vaccine of vaccines) pets.set(vaccine.pet.id, vaccine.pet);
		return [...pets.values()].sort((first, second) => first.name.localeCompare(second.name));
	}

	function petsRelatedToOwners(owners: StudyOwnerSummary[]): DashboardPetStudyItem[] {
		const petIds = new Set<number>();
		for (const owner of owners) {
			for (const pet of owner.pets) petIds.add(pet.id);
		}
		return allStudyPets().filter((pet) => petIds.has(pet.id)).sort((first, second) => first.name.localeCompare(second.name));
	}

	function ownersRelatedToPets(pets: DashboardPetStudyItem[]): StudyOwnerSummary[] {
		const ownerIds = new Set<number>();
		for (const pet of pets) {
			for (const owner of pet.owners) ownerIds.add(owner.id);
		}
		return allStudyOwners()
			.filter((owner) => ownerIds.has(owner.id) && ownerMatchesOwnerFilters(owner))
			.sort((first, second) => second.petCount - first.petCount || first.name.localeCompare(second.name));
	}

	function resolveStudyTargetPets(): DashboardPetStudyItem[] {
		if (studyTarget === 'vaccines') return uniquePetsFromVaccines(filteredStudyVaccineItems);
		if (studyTarget === 'owners') return petsRelatedToOwners(filteredStudyOwners);
		return filteredStudyPets;
	}

	function resolveStudyTargetOwners(): StudyOwnerSummary[] {
		if (studyTarget === 'owners') return filteredStudyOwners;
		return ownersRelatedToPets(studyTargetPets);
	}

	function resolveStudyTargetVaccines(): StudyVaccineSummary[] {
		if (studyTarget === 'vaccines') return filteredStudyVaccineItems;
		const petIds = new Set(studyTargetPets.map((pet) => pet.id));
		return allStudyVaccines.filter((vaccine) => petIds.has(vaccine.pet.id) && studyVaccineMatchesFilters(vaccine));
	}

	function studyTargetCount(): number {
		if (studyTarget === 'vaccines') return studyTargetVaccines.length;
		if (studyTarget === 'owners') return studyTargetOwners.length;
		return studyTargetPets.length;
	}

	function studyTargetBaseTotal(): number {
		if (studyTarget === 'vaccines') return allStudyVaccines.length;
		if (studyTarget === 'owners') return allStudyOwners().length;
		return allStudyPets().length;
	}

	function studyTargetPercent(): string {
		const total = studyTargetBaseTotal();
		const count = studyTargetCount();
		if (total <= 0 || count <= 0) return '0%';
		const percent = (count / total) * 100;
		return `${new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.round(percent * 10) / 10)}%`;
	}

	function studyTargetResultLabelKey(): TranslationKey {
		if (studyTarget === 'vaccines') return 'analysis.study.resultVaccines';
		if (studyTarget === 'owners') return 'analysis.study.resultOwners';
		return 'analysis.study.resultPets';
	}

	function studyTargetBaseLabelKey(): TranslationKey {
		if (studyTarget === 'vaccines') return 'analysis.study.ofVaccines';
		if (studyTarget === 'owners') return 'analysis.study.ofOwners';
		return 'analysis.study.ofPets';
	}

	function studySecondaryLabelKey(): TranslationKey {
		return studyTarget === 'owners' ? 'analysis.study.relatedPets' : 'analysis.study.relatedOwners';
	}

	function studySecondaryDescriptionKey(): TranslationKey {
		if (studyTarget === 'owners') return 'analysis.study.relatedPetsForOwnersDescription';
		if (studyTarget === 'vaccines') return 'analysis.study.relatedOwnersForVaccinesDescription';
		return 'analysis.study.relatedOwnersDescription';
	}

	function studySecondaryCount(): number {
		return studyTarget === 'owners' ? studyTargetPets.length : studyTargetOwners.length;
	}

	function hasStudyFilters(): boolean {
		return !!(studySpecies || studyBreed || studySex || studyAge || studyVaccineStatus || studyVaccinePresetId || studyCity || studyLocation);
	}

	function clearStudyFilters(): void {
		studySpecies = '';
		studyBreed = '';
		studySex = '';
		studyAge = '';
		studyVaccineStatus = '';
		studyVaccinePresetId = '';
		studyCity = '';
		studyLocation = '';
	}

	function selectedVaccinePresetLabel(): string {
		const bucket = clinic.dashboard?.analytics.study.vaccinePresets.find((item) => item.key === studyVaccinePresetId);
		return bucket ? renderBucketLabel(bucket) : t('common.notInformed');
	}

	function selectedCityLabel(): string {
		return studyCityOptions().find((option) => option.value === studyCity)?.label.replace(/ \([0-9.,]+\)$/, '') ?? t('common.notInformed');
	}

	function selectedLocationLabel(): string {
		return studyLocationOptions().find((option) => option.value === studyLocation)?.label.replace(/ \([0-9.,]+\)$/, '') ?? t('common.notInformed');
	}

	function studyFactorSummaries(): StudyFactorSummary[] {
		const factors: StudyFactorSummary[] = [];
		if (studyVaccinePresetId) factors.push({ label: t('analysis.study.vaccinePreset'), value: selectedVaccinePresetLabel(), count: countStudyTargetForFactor('vaccinePreset') });
		if (studyVaccineStatus) factors.push({ label: t('analysis.study.vaccineStatus'), value: vaccineStatusLabel(studyVaccineStatus as DashboardVaccineStatusKey), count: countStudyTargetForFactor('vaccineStatus') });
		if (studySpecies) factors.push({ label: t('analysis.study.species'), value: speciesLabel(studySpecies), count: countStudyTargetForFactor('species') });
		if (studyBreed) factors.push({ label: t('analysis.study.breed'), value: breedLabel(studyBreed), count: countStudyTargetForFactor('breed') });
		if (studySex) factors.push({ label: t('analysis.study.sex'), value: sexLabel(studySex), count: countStudyTargetForFactor('sex') });
		if (studyAge) factors.push({ label: t('analysis.study.age'), value: t(ageLabelKey(studyAge)), count: countStudyTargetForFactor('age') });
		if (studyCity) factors.push({ label: t('analysis.study.city'), value: selectedCityLabel(), count: countStudyTargetForFactor('city') });
		if (studyLocation) factors.push({ label: t('analysis.study.location'), value: selectedLocationLabel(), count: countStudyTargetForFactor('location') });
		return factors;
	}

	function matchesStudyStatusOnly(pet: StudyPetSnapshot): boolean {
		if (!studyVaccineStatus) return true;
		return pet.vaccineStatus === studyVaccineStatus;
	}

	function petMatchesFactor(pet: DashboardPetStudyItem, factor: StudyFactorKind): boolean {
		if (factor === 'vaccinePreset') return pet.vaccinePresetIds.includes(Number(studyVaccinePresetId));
		if (factor === 'vaccineStatus') return matchesStudyStatusOnly(pet);
		if (factor === 'species') return pet.species === studySpecies;
		if (factor === 'breed') return pet.breed === studyBreed;
		if (factor === 'sex') return pet.sex === studySex;
		if (factor === 'age') return pet.age === studyAge;
		if (factor === 'city') return pet.ownerCityKeys.includes(studyCity);
		return pet.ownerLocationKeys.includes(studyLocation);
	}

	function vaccineMatchesFactor(vaccine: StudyVaccineSummary, factor: StudyFactorKind): boolean {
		if (factor === 'vaccinePreset') return vaccine.presetId === Number(studyVaccinePresetId);
		if (factor === 'vaccineStatus') return vaccine.status === studyVaccineStatus;
		return petMatchesFactor(vaccine.pet, factor);
	}

	function ownerMatchesFactor(owner: StudyOwnerSummary, factor: StudyFactorKind): boolean {
		if (factor === 'city') return owner.cityKey === studyCity;
		if (factor === 'location') return owner.locationKey === studyLocation;
		return owner.pets.some((pet) => {
			if (factor === 'vaccinePreset') return pet.vaccinePresetIds.includes(Number(studyVaccinePresetId));
			if (factor === 'vaccineStatus') return matchesStudyStatusOnly(pet);
			if (factor === 'species') return pet.species === studySpecies;
			if (factor === 'breed') return pet.breed === studyBreed;
			if (factor === 'sex') return pet.sex === studySex;
			return pet.age === studyAge;
		});
	}

	function countStudyTargetForFactor(factor: StudyFactorKind): number {
		if (studyTarget === 'vaccines') return allStudyVaccines.filter((vaccine) => vaccineMatchesFactor(vaccine, factor)).length;
		if (studyTarget === 'owners') return allStudyOwners().filter((owner) => ownerMatchesFactor(owner, factor)).length;
		return allStudyPets().filter((pet) => petMatchesFactor(pet, factor)).length;
	}

	function studyOwnerText(pet: DashboardPetStudyItem): string {
		return pet.owners.map((owner) => owner.name).join(' · ') || t('owner.unassigned');
	}

	function studyPetLocationText(pet: DashboardPetStudyItem): string {
		return pet.ownerLocationLabels.join(' · ') || t('common.notInformed');
	}

	function studyPetVaccineText(pet: DashboardPetStudyItem): string {
		return pet.vaccinePresetNames.join(' · ') || t('analysis.vaccineStatus.untracked');
	}

	function studyPetProfileHref(pet: DashboardPetStudyItem): string {
		return `/pets/${pet.id}`;
	}

	function ownerProfileHref(owner: StudyOwnerSummary): string {
		return `/owners/${owner.id}`;
	}

	function studyOwnerPetNamesText(owner: StudyOwnerSummary): string {
		return owner.petNames.slice(0, 4).join(' · ') || t('common.notInformed');
	}

	function ownerPetCountBand(value: number): string {
		if (value <= 0) return 'none';
		if (value === 1) return 'one';
		if (value === 2) return 'two';
		return 'threePlus';
	}

	function ownerVaccineStatus(owner: StudyOwnerSummary): DashboardVaccineStatusKey {
		let statusValue: DashboardVaccineStatusKey = 'untracked';
		for (const pet of owner.pets) {
			if (studyVaccineStatusWeight[pet.vaccineStatus] > studyVaccineStatusWeight[statusValue]) statusValue = pet.vaccineStatus;
		}
		return statusValue;
	}

	function uniqueStudyLabels(values: string[]): string[] {
		const labels = values.map((value) => value.trim()).filter((value) => value.length > 0);
		return labels.length > 0 ? [...new Set(labels)] : [t('common.notInformed')];
	}

	function activePetDimensionLabels(pet: DashboardPetStudyItem, dimension: StudyDimension): string[] {
		if (dimension === 'vaccinePreset') return uniqueStudyLabels(pet.vaccinePresetNames.length > 0 ? pet.vaccinePresetNames : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'vaccineStatus') return uniqueStudyLabels(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccineStatusLabel(vaccine.status)) : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'petSpecies') return [speciesLabel(pet.species)];
		if (dimension === 'petBreed') return [breedLabel(pet.breed)];
		if (dimension === 'petSex') return [sexLabel(pet.sex)];
		if (dimension === 'petAge') return [t(ageLabelKey(pet.age))];
		if (dimension === 'petVaccineStatus') return [vaccineStatusLabel(pet.vaccineStatus)];
		if (dimension === 'ownerLocation') return uniqueStudyLabels(pet.ownerLocationLabels);
		return [t('common.notInformed')];
	}

	function ownerPetDimensionLabels(pet: DashboardOwnerStudyPet, dimension: StudyDimension): string[] {
		if (dimension === 'vaccinePreset') return uniqueStudyLabels(pet.vaccinePresetNames.length > 0 ? pet.vaccinePresetNames : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'vaccineStatus') return uniqueStudyLabels(pet.vaccines.length > 0 ? pet.vaccines.map((vaccine) => vaccineStatusLabel(vaccine.status)) : [t('analysis.vaccineStatus.untracked')]);
		if (dimension === 'petSpecies') return [speciesLabel(pet.species)];
		if (dimension === 'petBreed') return [breedLabel(pet.breed)];
		if (dimension === 'petSex') return [sexLabel(pet.sex)];
		if (dimension === 'petAge') return [t(ageLabelKey(pet.age))];
		if (dimension === 'petVaccineStatus') return [vaccineStatusLabel(pet.vaccineStatus)];
		return [t('common.notInformed')];
	}

	function vaccineDimensionLabels(vaccine: StudyVaccineSummary, dimension: StudyDimension): string[] {
		if (dimension === 'vaccinePreset') return [vaccine.presetName];
		if (dimension === 'vaccineStatus') return [vaccineStatusLabel(vaccine.status)];
		return activePetDimensionLabels(vaccine.pet, dimension);
	}

	function ownerDimensionLabels(owner: StudyOwnerSummary, dimension: StudyDimension): string[] {
		if (dimension === 'ownerLocation') return [owner.locationLabel ?? t('common.notInformed')];
		if (dimension === 'ownerPetCount') return [t(petCountLabelKey(ownerPetCountBand(owner.petCount)))];
		if (dimension === 'ownerPetVaccineStatus') return [vaccineStatusLabel(ownerVaccineStatus(owner))];
		if (dimension === 'ownerPetSpecies') return uniqueStudyLabels(owner.pets.map((pet) => speciesLabel(pet.species)));
		return uniqueStudyLabels(owner.pets.flatMap((pet) => ownerPetDimensionLabels(pet, dimension)));
	}

	function addStudyCrossBucket(buckets: Map<string, StudyCrossBucket>, primaryLabels: string[], secondaryLabels: string[]): void {
		if (studyPrimaryDimension === studySecondaryDimension) {
			for (const label of primaryLabels) {
				const key = `${label}\u0000${label}`;
				const current = buckets.get(key) ?? { primaryLabel: label, secondaryLabel: label, count: 0 };
				current.count += 1;
				buckets.set(key, current);
			}
			return;
		}

		for (const primaryLabel of primaryLabels) {
			for (const secondaryLabel of secondaryLabels) {
				const key = `${primaryLabel}\u0000${secondaryLabel}`;
				const current = buckets.get(key) ?? { primaryLabel, secondaryLabel, count: 0 };
				current.count += 1;
				buckets.set(key, current);
			}
		}
	}

	function buildStudyVisualizationBuckets(): StudyCrossBucket[] {
		const buckets = new Map<string, StudyCrossBucket>();

		if (studyTarget === 'vaccines') {
			for (const vaccine of studyTargetVaccines) addStudyCrossBucket(buckets, vaccineDimensionLabels(vaccine, studyPrimaryDimension), vaccineDimensionLabels(vaccine, studySecondaryDimension));
		} else if (studyTarget === 'owners') {
			for (const owner of studyTargetOwners) addStudyCrossBucket(buckets, ownerDimensionLabels(owner, studyPrimaryDimension), ownerDimensionLabels(owner, studySecondaryDimension));
		} else {
			for (const pet of studyTargetPets) addStudyCrossBucket(buckets, activePetDimensionLabels(pet, studyPrimaryDimension), activePetDimensionLabels(pet, studySecondaryDimension));
		}

		return [...buckets.values()].sort((first, second) => second.count - first.count || first.primaryLabel.localeCompare(second.primaryLabel) || first.secondaryLabel.localeCompare(second.secondaryLabel));
	}

	function studyVisualizationTitle(): string {
		return `${studyDimensionLabel(studyPrimaryDimension)} ${t('common.and')} ${studyDimensionLabel(studySecondaryDimension)}`;
	}

	function chartGroupTotal(buckets: { count: number }[]): number {
		return buckets.reduce((total, bucket) => total + bucket.count, 0);
	}

	function chartBucketPercentLabel(count: number, buckets: { count: number }[]): string {
		const total = chartGroupTotal(buckets);
		if (total <= 0 || count <= 0) return '0%';
		const percent = (count / total) * 100;
		return `${new Intl.NumberFormat(i18n.locale, { maximumFractionDigits: 1 }).format(Math.round(percent * 10) / 10)}%`;
	}

	function maxChartBucketCount(buckets: { count: number }[]): number {
		return buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
	}

	function topChartBuckets<T>(buckets: T[], limit: number): T[] {
		return buckets.slice(0, limit);
	}

	function maxBucketCount(buckets: DashboardBucket[]): number {
		return buckets.reduce((max, bucket) => Math.max(max, bucket.count), 0);
	}

	function bucketWidth(count: number, max: number): number {
		return max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
	}

	function topBuckets<T extends DashboardBucket>(buckets: T[], limit = 10): T[] {
		return buckets.slice(0, limit);
	}

	function speciesLabel(key: string): string {
		const option = isPetSpecies(key) ? getPetSpeciesOption(key) : null;
		return option ? t(option.labelKey) : t('common.notInformed');
	}

	function breedLabel(key: string): string {
		const option = isPetBreed(key) ? getPetBreedOption(key) : null;
		return option ? t(option.labelKey) : t('common.notInformed');
	}

	function sexLabel(key: string): string {
		if (key === 'M') return t('pet.sexMale');
		if (key === 'F') return t('pet.sexFemale');
		return t('pet.sexUnknown');
	}

	function ageLabelKey(key: string): TranslationKey {
		return `analysis.age.${key}` as TranslationKey;
	}

	function petCountLabelKey(key: string): TranslationKey {
		return `analysis.petCount.${key}` as TranslationKey;
	}

	function vaccineStatusLabel(key: DashboardVaccineStatusKey): string {
		if (key === 'untracked') return t('analysis.vaccineStatus.untracked');
		return t(`vaccine.status.${key}` as TranslationKey);
	}

	function vaccineCount(status: VaccineStatusKey): number {
		return clinic.dashboard?.vaccines.summary[status] ?? 0;
	}

	function vaccinePercent(status: VaccineStatusKey): number {
		const total = clinic.dashboard?.vaccines.totalTracked ?? 0;
		if (total <= 0) return 0;
		const count = vaccineCount(status);
		return count > 0 ? Math.max(0.1, Math.round((count / total) * 1000) / 10) : 0;
	}

	function renderBucketLabel(bucket: DashboardNamedBucket): string {
		return bucket.label?.trim() || t('common.notInformed');
	}

	$effect(() => {
		const dimensionOptions = availableStudyDimensions();
		if (!dimensionOptions.some((option) => option.dimension === studyPrimaryDimension)) studyPrimaryDimension = defaultStudyPrimaryDimension(studyTarget);
		if (!dimensionOptions.some((option) => option.dimension === studySecondaryDimension)) studySecondaryDimension = defaultStudySecondaryDimension(studyTarget);
		if (studyBreed && !studyBreedOptions().some((option) => option.value === studyBreed)) studyBreed = '';
		if (studyLocation && !studyLocationOptions().some((option) => option.value === studyLocation)) studyLocation = '';
		if (studyVaccineStatus && !studyVaccineStatusOptions().some((option) => option.value === studyVaccineStatus)) studyVaccineStatus = '';
	});

	$effect(() => {
		if (activeView !== 'vaccines' || vaccineParamsInitialized || clinic.loading || !clinic.dashboard) return;
		initializeVaccineParams(page.url.searchParams);
		vaccineParamsInitialized = true;
		loadInitialVaccineTab();
	});

	onMount(() => {
		void clinic.init();
	});
</script>

<svelte:head>
	<title>{t('analysis.dashboard.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0">
			<p class="text-sm font-medium text-muted-foreground">{t('analysis.dashboard.kicker')}</p>
			<h2 class="text-2xl font-semibold tracking-normal text-foreground sm:text-3xl">{t('analysis.dashboard.title')}</h2>
			<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.dashboard.description')}</p>
		</div>
		<button class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-60" type="button" disabled={clinic.loading || (activeView === 'vaccines' && isVaccineRefreshing())} onclick={refreshDashboardView}>
			<RotateCw class="size-4" />
			{t('actions.refresh')}
		</button>
	</header>

	<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1 lg:grid-cols-4" role="tablist" aria-label={t('analysis.dashboard.title')}>
		{#each viewOptions as option}
			<a
				href={viewHref(option.view)}
				class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeView === option.view ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
				role="tab"
				aria-selected={activeView === option.view}
			>
				<option.icon class="size-4" />
				<span class="truncate">{t(option.labelKey)}</span>
			</a>
		{/each}
	</div>

	{#if clinic.error}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{clinic.error}</p>
	{/if}

	{#if clinic.needsSetup}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<p class="text-sm font-medium text-muted-foreground">{t('setup.title')}</p>
			<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('setup.description')}</p>
			<a href="/" class="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">{t('nav.records')}</a>
		</section>
	{:else if clinic.loading || !clinic.dashboard}
		<div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{#each Array(4) as _}
				<div class="h-32 animate-pulse rounded-md bg-muted"></div>
			{/each}
		</div>
	{:else}
		{#if activeView === 'general'}
			<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<ChartColumn class="size-4" />
					{t('analysis.general.title')}
				</div>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.general.description')}</p>

				<div class="mt-5 rounded-md border border-border bg-background p-3">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div class="min-w-0">
							<p class="text-sm font-semibold">{t('analysis.study.axis')}</p>
							<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.axisDescription')}</p>
						</div>
						<div class="grid gap-2 sm:grid-cols-3 lg:min-w-136" role="tablist" aria-label={t('analysis.study.axis')}>
							{#each studyTargetOptions as option}
								<button
									class="flex min-h-20 items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent {studyTarget === option.target ? 'border-primary bg-primary/10 ring-2 ring-ring/20' : 'border-border bg-background'}"
									type="button"
									role="tab"
									aria-selected={studyTarget === option.target}
									onclick={() => selectStudyTarget(option.target)}
								>
									<option.icon class="mt-0.5 size-4 shrink-0" />
									<span class="min-w-0">
										<span class="block text-sm font-semibold">{t(option.labelKey)}</span>
										<span class="mt-1 block text-xs leading-5 text-muted-foreground">{t(option.descriptionKey)}</span>
									</span>
								</button>
							{/each}
						</div>
					</div>
				</div>

				<div class="mt-5 grid gap-5 xl:grid-cols-[20rem_minmax(0,1fr)]">
					<aside class="rounded-md border border-border bg-background p-4">
						<div class="flex items-center justify-between gap-3">
							<div class="flex min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground">
								<SlidersHorizontal class="size-4" />
								<span>{t('analysis.study.yAxis')}</span>
							</div>
							<button class="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" type="button" disabled={!hasStudyFilters()} onclick={clearStudyFilters} aria-label={t('analysis.study.clear')}>
								<X class="size-4" />
							</button>
						</div>

						<div class="mt-5 space-y-5">
							<div class="space-y-3">
								<p class="text-sm font-semibold">{t('analysis.study.vaccineCriteria')}</p>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-vaccine-preset">{t('analysis.study.vaccinePreset')}</label>
									<Select id="study-vaccine-preset" bind:value={studyVaccinePresetId} options={studyVaccinePresetOptions()} />
								</div>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-vaccine-status">{t('analysis.study.vaccineStatus')}</label>
									<Select id="study-vaccine-status" bind:value={studyVaccineStatus} options={studyVaccineStatusOptions()} />
								</div>
							</div>

							<div class="space-y-3 border-t border-border pt-5">
								<p class="text-sm font-semibold">{t('analysis.study.petCriteria')}</p>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-species">{t('analysis.study.species')}</label>
									<Select id="study-species" bind:value={studySpecies} options={studySpeciesOptions()} />
								</div>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-breed">{t('analysis.study.breed')}</label>
									<Select id="study-breed" bind:value={studyBreed} options={studyBreedOptions()} />
								</div>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-sex">{t('analysis.study.sex')}</label>
									<Select id="study-sex" bind:value={studySex} options={studySexOptions()} />
								</div>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-age">{t('analysis.study.age')}</label>
									<Select id="study-age" bind:value={studyAge} options={studyAgeOptions()} />
								</div>
							</div>

							<div class="space-y-3 border-t border-border pt-5">
								<p class="text-sm font-semibold">{t('analysis.study.ownerCriteria')}</p>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-city">{t('analysis.study.city')}</label>
									<Select id="study-city" bind:value={studyCity} options={studyCityOptions()} />
								</div>
								<div class="space-y-1">
									<label class="text-sm font-medium" for="study-location">{t('analysis.study.location')}</label>
									<Select id="study-location" bind:value={studyLocation} options={studyLocationOptions()} />
								</div>
							</div>
						</div>
					</aside>

					<div class="min-w-0 space-y-4">
						<section class="rounded-md border border-border bg-background p-4">
							<div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
								<div class="min-w-0">
									<h3 class="text-sm font-semibold">{t('analysis.study.visualization')}</h3>
									<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('analysis.study.visualizationDescription')}</p>
								</div>

								<div class="grid gap-3 sm:grid-cols-2 xl:min-w-160 xl:grid-cols-[minmax(12rem,1fr)_minmax(12rem,1fr)_auto]">
									<div class="space-y-1">
										<label class="text-sm font-medium" for="study-primary-dimension">{t('analysis.study.visualizeByPrimary')}</label>
										<Select id="study-primary-dimension" bind:value={studyPrimaryDimension} options={studyDimensionOptions()} />
									</div>
									<div class="space-y-1">
										<label class="text-sm font-medium" for="study-secondary-dimension">{t('analysis.study.visualizeBySecondary')}</label>
										<Select id="study-secondary-dimension" bind:value={studySecondaryDimension} options={studyDimensionOptions()} />
									</div>
									<div class="space-y-1 sm:col-span-2 xl:col-span-1">
										<span class="text-sm font-medium">{t('analysis.study.visualFormat')}</span>
										<div class="grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('analysis.study.visualFormat')}>
											<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium {studyVisualizationMode === 'bars' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyVisualizationMode === 'bars'} onclick={() => selectStudyVisualizationMode('bars')}>
												{t('analysis.study.visualFormat.bars')}
											</button>
											<button class="inline-flex h-9 items-center justify-center rounded-sm px-3 text-sm font-medium {studyVisualizationMode === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={studyVisualizationMode === 'table'} onclick={() => selectStudyVisualizationMode('table')}>
												{t('analysis.study.visualFormat.table')}
											</button>
										</div>
									</div>
								</div>
							</div>

							<div class="mt-4 rounded-md border border-border bg-muted/40 p-3">
								{#if selectedStudyFactors.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each selectedStudyFactors as factor}
											<span class="inline-flex max-w-full items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
												<span class="truncate text-muted-foreground">{factor.label}: {factor.value}</span>
												<span class="shrink-0 font-semibold tabular-nums">{metricFormatter(factor.count)}</span>
											</span>
										{/each}
									</div>
								{:else}
									<p class="text-sm leading-6 text-muted-foreground">{t('analysis.study.noSelectedFactors')}</p>
								{/if}
							</div>

							<div class="mt-4">
								<div class="flex items-center justify-between gap-3 border-b border-border pb-2">
									<h4 class="truncate text-sm font-semibold">{studyVisualizationTitle()}</h4>
									<span class="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">{metricFormatter(chartGroupTotal(selectedStudyBuckets))}</span>
								</div>

								{#if studyVisualizationMode === 'bars'}
									<div class="divide-y divide-border/70">
										{#each topChartBuckets(selectedStudyBuckets, 16) as bucket}
											<div class="grid grid-cols-[minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1.6fr)_5rem_4.5rem] items-center gap-3 py-2 text-sm">
												<span class="truncate text-muted-foreground" title={bucket.primaryLabel}>{bucket.primaryLabel}</span>
												<span class="truncate text-muted-foreground" title={bucket.secondaryLabel}>{bucket.secondaryLabel}</span>
												<span class="h-2 rounded-full bg-muted">
													<span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxChartBucketCount(selectedStudyBuckets))}%`}></span>
												</span>
												<span class="text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</span>
												<span class="text-right text-xs font-medium tabular-nums text-muted-foreground">{chartBucketPercentLabel(bucket.count, selectedStudyBuckets)}</span>
											</div>
										{:else}
											<p class="py-4 text-sm text-muted-foreground">{t('analysis.empty')}</p>
										{/each}
									</div>
								{:else}
									<div class="mt-3 overflow-hidden rounded-md border border-border">
										<table class="w-full table-fixed border-collapse text-sm">
											<thead class="bg-muted text-left text-xs font-medium text-muted-foreground">
												<tr>
													<th class="px-3 py-2 font-medium">{studyDimensionLabel(studyPrimaryDimension)}</th>
													<th class="px-3 py-2 font-medium">{studyDimensionLabel(studySecondaryDimension)}</th>
													<th class="w-28 px-3 py-2 text-right font-medium">{t('analysis.study.column.value')}</th>
													<th class="w-28 px-3 py-2 text-right font-medium">{t('analysis.study.column.percent')}</th>
												</tr>
											</thead>
											<tbody class="divide-y divide-border">
												{#each topChartBuckets(selectedStudyBuckets, 16) as bucket}
													<tr>
														<td class="truncate px-3 py-2 text-muted-foreground" title={bucket.primaryLabel}>{bucket.primaryLabel}</td>
														<td class="truncate px-3 py-2 text-muted-foreground" title={bucket.secondaryLabel}>{bucket.secondaryLabel}</td>
														<td class="px-3 py-2 text-right font-medium tabular-nums">{metricFormatter(bucket.count)}</td>
														<td class="px-3 py-2 text-right font-medium tabular-nums text-muted-foreground">{chartBucketPercentLabel(bucket.count, selectedStudyBuckets)}</td>
													</tr>
												{:else}
													<tr><td class="px-3 py-4 text-muted-foreground" colspan="4">{t('analysis.empty')}</td></tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
							</div>
						</section>

						{#if studyTarget === 'vaccines'}
							<div class="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedVaccines')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedVaccinesDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetVaccines.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetVaccines.slice(0, 40) as vaccine}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{vaccine.presetName} · {vaccineStatusLabel(vaccine.status)}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{vaccine.pet.name} · {speciesLabel(vaccine.pet.species)} · {breedLabel(vaccine.pet.breed)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(vaccine.pet)} · {studyPetLocationText(vaccine.pet)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{t('vaccine.appliedAt')}: {formatDateForDisplay(vaccine.appliedAt)} · {t('vaccine.analytics.dueAt')}: {formatDateForDisplay(vaccine.dueAt)}</p>
												</div>
												<a href={studyPetProfileHref(vaccine.pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyVaccines')}</p>
										{/each}
									</div>
								</section>

								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedOwners')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedOwnersForVaccinesDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetOwners.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetOwners.slice(0, 40) as owner}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{owner.locationLabel ?? t('common.notInformed')}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {studyOwnerPetNamesText(owner)}</p>
												</div>
												<a href={ownerProfileHref(owner)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openOwner')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
										{/each}
									</div>
								</section>
							</div>
						{:else if studyTarget === 'owners'}
							<div class="grid gap-4 xl:grid-cols-2">
								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedOwners')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedOwnersListDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetOwners.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetOwners.slice(0, 40) as owner}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{owner.locationLabel ?? t('common.notInformed')}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {studyOwnerPetNamesText(owner)}</p>
												</div>
												<a href={ownerProfileHref(owner)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openOwner')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
										{/each}
									</div>
								</section>

								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedPets')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedPetsForOwnersDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetPets.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetPets.slice(0, 40) as pet}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{pet.name}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{speciesLabel(pet.species)} · {breedLabel(pet.breed)} · {sexLabel(pet.sex)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(pet)} · {studyPetLocationText(pet)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(pet.vaccineStatus)} · {studyPetVaccineText(pet)}</p>
												</div>
												<a href={studyPetProfileHref(pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyPets')}</p>
										{/each}
									</div>
								</section>
							</div>
						{:else}
							<div class="grid gap-4 xl:grid-cols-2">
								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedPets')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedPetsDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetPets.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetPets.slice(0, 40) as pet}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{pet.name}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{speciesLabel(pet.species)} · {breedLabel(pet.breed)} · {sexLabel(pet.sex)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{studyOwnerText(pet)} · {studyPetLocationText(pet)}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{vaccineStatusLabel(pet.vaccineStatus)} · {studyPetVaccineText(pet)}</p>
												</div>
												<a href={studyPetProfileHref(pet)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openPet')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyPets')}</p>
										{/each}
									</div>
								</section>

								<section class="rounded-md border border-border bg-background p-4">
									<div class="flex items-start justify-between gap-3">
										<div>
											<h3 class="text-sm font-semibold">{t('analysis.study.relatedOwners')}</h3>
											<p class="mt-1 text-sm text-muted-foreground">{t('analysis.study.relatedOwnersListDescription')}</p>
										</div>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{metricFormatter(studyTargetOwners.length)}</span>
									</div>
									<div class="mt-4 divide-y divide-border rounded-md border border-border">
										{#each studyTargetOwners.slice(0, 40) as owner}
											<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{owner.name}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{owner.locationLabel ?? t('common.notInformed')}</p>
													<p class="mt-1 wrap-break-word text-xs text-muted-foreground">{metricFormatter(owner.petCount)} {t('analysis.study.ownerPets')}: {studyOwnerPetNamesText(owner)}</p>
												</div>
												<a href={ownerProfileHref(owner)} class="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">{t('actions.openOwner')}</a>
											</article>
										{:else}
											<p class="p-4 text-center text-sm text-muted-foreground">{t('analysis.study.emptyOwners')}</p>
										{/each}
									</div>
								</section>
							</div>
						{/if}
					</div>
				</div>

			</section>
		{:else if activeView === 'vaccines'}
			<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<Syringe class="size-4" />
					{t('analysis.vaccines.title')}
				</div>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.vaccines.description')}</p>

				<div class="mt-5 grid grid-cols-2 gap-1 rounded-md border border-border bg-muted p-1" role="tablist" aria-label={t('analysis.vaccines.title')}>
					<button
						class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {vaccineTab === 'status' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
						type="button"
						role="tab"
						aria-selected={vaccineTab === 'status'}
						onclick={() => selectVaccineTab('status')}
					>
						<Syringe class="size-4" />
						<span class="truncate">{t('vaccine.analytics.statusTitle')}</span>
					</button>
					<button
						class="inline-flex h-10 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {vaccineTab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}"
						type="button"
						role="tab"
						aria-selected={vaccineTab === 'history'}
						onclick={() => selectVaccineTab('history')}
					>
						<CalendarDays class="size-4" />
						<span class="truncate">{t('vaccine.analytics.historyTitle')}</span>
					</button>
				</div>

				{#if vaccineTab === 'status'}
					<div class="mt-5 min-w-0" role="tabpanel">
						<div class="grid gap-3 rounded-md border border-border bg-background p-3 lg:grid-cols-[14rem_minmax(0,1fr)]">
							<div class="space-y-1">
								<label class="text-sm font-medium" for="dashboard-due-filter-mode">{t('vaccine.analytics.filterMode')}</label>
								<Select
									id="dashboard-due-filter-mode"
									value={dueFilterMode}
									options={[
										{ value: 'preset', label: t('vaccine.analytics.filterMode.preset') },
										{ value: 'period', label: t('vaccine.analytics.filterMode.period') }
									]}
									onchange={(value) => selectDueFilterMode(value as string)}
								/>
							</div>

							{#if dueFilterMode === 'preset'}
								<div class="space-y-2">
									<span class="text-sm font-medium">{t('vaccine.analytics.statusFilter')}</span>
									<div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
										{#each vaccineCards as card}
											<button
												type="button"
												class="flex h-full min-h-28 flex-col rounded-md border bg-background p-3 text-left text-sm transition-colors hover:bg-accent {status === card.status ? 'border-primary ring-2 ring-ring/30' : 'border-border'}"
												aria-pressed={status === card.status}
												onclick={() => selectStatus(card.status)}
											>
												<span class="flex min-h-16 items-start justify-between gap-3">
													<span class="min-w-0">
														<span class="block font-medium">{t(card.labelKey)}</span>
														<span class="mt-1 block min-h-10 text-xs leading-5 text-muted-foreground">{t(card.detailKey)}</span>
													</span>
													<span class="text-right">
														<span class="block text-2xl font-semibold {card.textClass}">{vaccineStatusCount(card.status)}</span>
														<span class="mt-1 block text-xs text-muted-foreground">{vaccineStatusPercentLabel(card.status)}%</span>
													</span>
												</span>
												<span class="mt-auto block h-2 rounded-full bg-muted">
													<span class="block h-2 rounded-full {card.barClass}" style={`width: ${vaccineStatusPercent(card.status)}%`}></span>
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
									<label class="text-sm font-medium" for="dashboard-status-order">{t('vaccine.analytics.order')}</label>
									<div class="flex items-center gap-2">
										<Select
											id="dashboard-status-order"
											class="h-9 w-40"
											value={statusOrder}
											options={[
												{ value: 'recent', label: t('vaccine.analytics.order.recent') },
												{ value: 'old', label: t('vaccine.analytics.order.old') }
											]}
											onchange={(value) => selectStatusOrder(value as string)}
										/>
										<span class="rounded-md bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{vaccineStatusItems.length}</span>
									</div>
								</div>
							</div>

							{#if statusLoading || (statusListLoading && visibleVaccineStatusItems.length === 0)}
								<div class="mt-4 space-y-3">
									{#each Array(5) as _}
										<div class="h-24 animate-pulse rounded-md bg-muted"></div>
									{/each}
								</div>
							{:else if vaccineStatusItems.length === 0}
								<p class="mt-4 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('vaccine.analytics.emptyStatus')}</p>
							{:else}
								<div class="mt-4 divide-y divide-border rounded-md border border-border">
									{#each visibleVaccineStatusItems as item}
										<article class="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4">
											<div class="flex min-w-0 items-start gap-3">
												<PetAvatar avatarBytes={item.petAvatarBytes} petName={item.petName} className="size-11" iconClass="size-5 text-primary" />
												<div class="min-w-0">
													<p class="wrap-break-word text-sm font-semibold">{item.petName} · {item.vaccineName}</p>
													<p class="mt-1 wrap-break-word text-sm text-muted-foreground">{ownerDisplayName(item)}</p>
													<div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted-foreground">
														<span>{t('vaccine.appliedAt')}: {formatDateForDisplay(item.appliedAt)}</span>
														<span>{t('vaccine.analytics.dueAt')}: {formatDateForDisplay(item.dueAt)}</span>
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
					</div>
				{:else}
					<div class="mt-5 min-w-0" role="tabpanel">
						{#if historyError}
							<p class="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{historyError}</p>
						{/if}

						<div class="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
							<div class="space-y-3">
								<label class="block text-sm font-medium" for="dashboard-history-period">{t('vaccine.analytics.period')}</label>
								<div id="dashboard-history-period" class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
									{#each vaccineHistoryPeriods as option}
										<button class="rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60 {period === option ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background'}" type="button" disabled={historyLoading && period === option} onclick={() => selectPeriod(option)}>
											{t(periodLabelKey(option))}
										</button>
									{/each}
								</div>

								<div class="space-y-1">
									<label class="block text-sm font-medium" for="dashboard-history-vaccine">{t('vaccine.analytics.vaccineFilter')}</label>
									<Select
										id="dashboard-history-vaccine"
										value={vaccinePresetId ?? ''}
										disabled={presetsLoading || historyLoading}
										options={[
											{ value: '', label: t('vaccine.analytics.allVaccines') },
											...vaccinePresets.map((preset) => ({ value: preset.id, label: preset.name }))
										]}
										onchange={(value) => selectPreset(value as string)}
									/>
								</div>

								<div class="space-y-1">
									<label class="block text-sm font-medium" for="dashboard-history-order">{t('vaccine.analytics.order')}</label>
									<Select
										id="dashboard-history-order"
										value={historyOrder}
										options={[
											{ value: 'recent', label: t('vaccine.analytics.order.recent') },
											{ value: 'old', label: t('vaccine.analytics.order.old') }
										]}
										onchange={(value) => selectHistoryOrder(value as string)}
									/>
								</div>
							</div>

							<div class="min-w-0">
								{#if historyLoading || presetsLoading}
									<div class="space-y-3">
										{#each Array(8) as _}
											<div class="h-9 animate-pulse rounded-md bg-muted"></div>
										{/each}
									</div>
								{:else if sortedVaccineHistory.length === 0}
									<p class="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">{t('vaccine.analytics.emptyHistory')}</p>
								{:else}
									<div class="max-h-128 space-y-3 overflow-auto pr-1">
										{#each sortedVaccineHistory as point}
											<div class="grid grid-cols-[4.75rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm sm:grid-cols-[5.5rem_minmax(0,1fr)_2.5rem]">
												<span class="truncate text-muted-foreground">{point.label}</span>
												<span class="h-3 rounded-full bg-muted">
													<span class="block h-3 rounded-full bg-primary" style={`width: ${vaccineHistoryWidth(point)}%`}></span>
												</span>
												<span class="text-right font-medium">{point.count}</span>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			</section>
			<OwnerContactDialog bind:open={contactDialogOpen} ownerName={contactDialogOwnerName} contacts={contactDialogContacts} />
		{:else if activeView === 'pets'}
			<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<PawPrint class="size-4" />
					{t('analysis.pets.title')}
				</div>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.pets.description')}</p>

				<div class="mt-5 grid gap-4 lg:grid-cols-2">
					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.pet.species')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.pets.bySpecies as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{speciesLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.pets.bySpecies))}%`}></span></span></div>
							{/each}
						</div>
					</div>

					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.pet.sex')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.pets.bySex as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{sexLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.pets.bySex))}%`}></span></span></div>
							{/each}
						</div>
					</div>

					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.pet.age')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.pets.byAge as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{t(ageLabelKey(bucket.key))}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.pets.byAge))}%`}></span></span></div>
							{/each}
						</div>
					</div>

					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.pet.vaccineStatus')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.pets.byVaccineStatus as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{vaccineStatusLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.pets.byVaccineStatus))}%`}></span></span></div>
							{/each}
						</div>
					</div>
				</div>

				<div class="mt-4 rounded-md border border-border bg-background p-4">
					<h3 class="text-sm font-semibold">{t('analysis.pet.breed')}</h3>
					<div class="mt-3 grid gap-3 lg:grid-cols-2">
						{#each topBuckets(clinic.dashboard.analytics.pets.byBreed) as bucket}
							<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{breedLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.pets.byBreed))}%`}></span></span></div>
						{:else}
							<p class="text-sm text-muted-foreground">{t('analysis.empty')}</p>
						{/each}
					</div>
				</div>
			</section>
		{:else}
			<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
				<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
					<UserPlus class="size-4" />
					{t('analysis.owners.title')}
				</div>
				<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('analysis.owners.description')}</p>

				<div class="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
					<div class="rounded-md border border-border bg-background p-4">
						<div class="flex items-center gap-2">
							<MapPin class="size-4 text-muted-foreground" />
							<h3 class="text-sm font-semibold">{t('analysis.owner.location')}</h3>
						</div>
						<div class="mt-3 grid gap-3 lg:grid-cols-2">
							{#each topBuckets(clinic.dashboard.analytics.owners.byLocation, 12) as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{renderBucketLabel(bucket)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.owners.byLocation))}%`}></span></span></div>
							{:else}
								<p class="text-sm text-muted-foreground">{t('analysis.empty')}</p>
							{/each}
						</div>
					</div>
					<div class="rounded-md border border-border bg-background p-4">
						<p class="text-sm font-semibold">{t('analysis.owner.averagePets')}</p>
						<p class="mt-3 text-3xl font-semibold">{metricFormatter(clinic.dashboard.analytics.owners.averagePetsPerOwner)}</p>
						<p class="mt-2 text-sm leading-6 text-muted-foreground">{t('analysis.owner.averagePetsDescription')}</p>
					</div>
				</div>

				<div class="mt-4 grid gap-4 lg:grid-cols-2">
					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.owner.petCount')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.owners.byPetCount as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{t(petCountLabelKey(bucket.key))}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.owners.byPetCount))}%`}></span></span></div>
							{/each}
						</div>
					</div>
					<div class="rounded-md border border-border bg-background p-4">
						<h3 class="text-sm font-semibold">{t('analysis.owner.vaccineStatus')}</h3>
						<div class="mt-3 space-y-3">
							{#each clinic.dashboard.analytics.owners.byPetVaccineStatus as bucket}
								<div class="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-3 text-sm"><span class="truncate text-muted-foreground">{vaccineStatusLabel(bucket.key)}</span><span class="text-right font-medium">{bucket.count}</span><span class="col-span-2 h-2 rounded-full bg-muted"><span class="block h-2 rounded-full bg-primary" style={`width: ${bucketWidth(bucket.count, maxBucketCount(clinic.dashboard.analytics.owners.byPetVaccineStatus))}%`}></span></span></div>
							{/each}
						</div>
					</div>
				</div>
			</section>
		{/if}
	{/if}
</section>