<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import type { Dewormer } from '$lib/domain/deworming/deworming.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import type { Vaccine, VaccineDoseType, VaccineValidityOption, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadDewormers, removeDewormerName, saveDewormerName, setDewormerNameHidden } from '$lib/services/deworming.service.js';
	import { loadVaccines, loadVaccineDoseTypes, loadVaccineValidityOptions, removeDoseType, removeValidityOption, removeVaccineName, saveDoseType, saveValidityOption, saveVaccineName, setDoseTypeHidden, setValidityOptionHidden, setVaccineNameHidden } from '$lib/services/vaccine.service.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type VaccineSettingsTab = 'vaccines' | 'dewormers' | 'doseTypes' | 'validityOptions';

	const tabs: { id: VaccineSettingsTab; labelKey: TranslationKey }[] = [
		{ id: 'vaccines', labelKey: 'vaccine.catalog.tab.vaccines' },
		{ id: 'dewormers', labelKey: 'deworming.catalog.tab.dewormers' },
		{ id: 'doseTypes', labelKey: 'vaccine.catalog.tab.doseTypes' },
		{ id: 'validityOptions', labelKey: 'vaccine.catalog.tab.validityOptions' }
	];

	let vaccines = $state<Vaccine[]>([]);
	let dewormers = $state<Dewormer[]>([]);
	let doseTypes = $state<VaccineDoseType[]>([]);
	let validityOptions = $state<VaccineValidityOption[]>([]);
	let activeTab = $state<VaccineSettingsTab>('vaccines');
	let vaccineDraftNames = $state<Record<number, string>>({});
	let dewormerDraftNames = $state<Record<number, string>>({});
	let doseTypeDraftNames = $state<Record<number, string>>({});
	let doseTypeDraftRequiresDoseNumber = $state<Record<number, boolean>>({});
	let validityDraftValues = $state<Record<number, string>>({});
	let validityDraftUnits = $state<Record<number, VaccineValidityUnit>>({});
	let newVaccineName = $state('');
	let newDewormerName = $state('');
	let newDoseTypeName = $state('');
	let newDoseTypeRequiresDoseNumber = $state(true);
	let newValidityValue = $state('');
	let newValidityUnit = $state<VaccineValidityUnit>('months');
	let loading = $state(true);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	function sortedVaccines(source: Vaccine[]): Vaccine[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function sortedDewormers(source: Dewormer[]): Dewormer[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function sortedByOrder<T extends { sortOrder: number; name: string }>(source: T[]): T[] {
		return [...source].sort((first, second) => first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
	}

	function sortedValidityOptions(source: VaccineValidityOption[]): VaccineValidityOption[] {
		return [...source].sort((first, second) => first.sortOrder - second.sortOrder || first.validityUnit.localeCompare(second.validityUnit) || first.validityValue - second.validityValue);
	}

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function checkboxValue(event: Event): boolean {
		return (event.currentTarget as HTMLInputElement).checked;
	}

	function validityUnitOptions() {
		return [
			{ value: 'days' as const, label: t('vaccine.validityUnit.days') },
			{ value: 'months' as const, label: t('vaccine.validityUnit.months') }
		];
	}

	function validityValueLimit(unit: VaccineValidityUnit): number {
		return unit === 'days' ? FIELD_LIMITS.vaccineValidityDays : FIELD_LIMITS.vaccineValidityMonths;
	}

	function validityLabel(value: number, unit: VaccineValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural';
		return `${value} ${t(unitKey)}`;
	}

	function validityDraftLabel(value: string, unit: VaccineValidityUnit): string {
		const numericValue = Number(value);
		return Number.isFinite(numericValue) && numericValue > 0 ? validityLabel(Math.trunc(numericValue), unit) : t('common.notInformed');
	}

	function itemCount(tab: VaccineSettingsTab): number {
		if (tab === 'vaccines') return vaccines.length;
		if (tab === 'dewormers') return dewormers.length;
		if (tab === 'doseTypes') return doseTypes.length;
		return validityOptions.length;
	}

	function updateVaccineDraft(id: number, value: string) {
		vaccineDraftNames = { ...vaccineDraftNames, [id]: value };
	}

	function updateDewormerDraft(id: number, value: string) {
		dewormerDraftNames = { ...dewormerDraftNames, [id]: value };
	}

	function updateDoseTypeDraftName(id: number, value: string) {
		doseTypeDraftNames = { ...doseTypeDraftNames, [id]: value };
	}

	function updateDoseTypeDraftRequiresDoseNumber(id: number, value: boolean) {
		doseTypeDraftRequiresDoseNumber = { ...doseTypeDraftRequiresDoseNumber, [id]: value };
	}

	function updateValidityDraftValue(id: number, value: string) {
		validityDraftValues = { ...validityDraftValues, [id]: value };
	}

	function updateValidityDraftUnit(id: number, value: VaccineValidityUnit) {
		validityDraftUnits = { ...validityDraftUnits, [id]: value };
	}

	function vaccineDraftName(vaccine: Vaccine): string {
		return vaccineDraftNames[vaccine.id] ?? vaccine.name;
	}

	function dewormerDraftName(dewormer: Dewormer): string {
		return dewormerDraftNames[dewormer.id] ?? dewormer.name;
	}

	function doseTypeDraftName(doseType: VaccineDoseType): string {
		return doseTypeDraftNames[doseType.id] ?? doseType.name;
	}

	function doseTypeDraftRequires(doseType: VaccineDoseType): boolean {
		return doseTypeDraftRequiresDoseNumber[doseType.id] ?? doseType.requiresDoseNumber;
	}

	function validityDraftValue(option: VaccineValidityOption): string {
		return validityDraftValues[option.id] ?? String(option.validityValue);
	}

	function validityDraftUnit(option: VaccineValidityOption): VaccineValidityUnit {
		return validityDraftUnits[option.id] ?? option.validityUnit;
	}

	function upsertVaccine(vaccine: Vaccine) {
		vaccines = sortedVaccines([...vaccines.filter((item) => item.id !== vaccine.id && item.normalizedName !== vaccine.normalizedName), vaccine]);
		vaccineDraftNames = { ...vaccineDraftNames, [vaccine.id]: vaccine.name };
	}

	function upsertDewormer(dewormer: Dewormer) {
		dewormers = sortedDewormers([...dewormers.filter((item) => item.id !== dewormer.id && item.normalizedName !== dewormer.normalizedName), dewormer]);
		dewormerDraftNames = { ...dewormerDraftNames, [dewormer.id]: dewormer.name };
	}

	function upsertDoseType(doseType: VaccineDoseType) {
		doseTypes = sortedByOrder([...doseTypes.filter((item) => item.id !== doseType.id && item.normalizedName !== doseType.normalizedName), doseType]);
		doseTypeDraftNames = { ...doseTypeDraftNames, [doseType.id]: doseType.name };
		doseTypeDraftRequiresDoseNumber = { ...doseTypeDraftRequiresDoseNumber, [doseType.id]: doseType.requiresDoseNumber };
	}

	function upsertValidityOption(option: VaccineValidityOption) {
		validityOptions = sortedValidityOptions([...validityOptions.filter((item) => item.id !== option.id && (item.validityValue !== option.validityValue || item.validityUnit !== option.validityUnit)), option]);
		validityDraftValues = { ...validityDraftValues, [option.id]: String(option.validityValue) };
		validityDraftUnits = { ...validityDraftUnits, [option.id]: option.validityUnit };
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_name_required') errorKey = 'vaccine.nameRequired';
		else if (exception instanceof Error && exception.message === 'deworming_name_required') errorKey = 'deworming.nameRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_required') errorKey = 'vaccine.doseRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_validity_required') errorKey = 'vaccine.validityRequired';
		else errorKey = 'vaccine.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const [loadedVaccines, loadedDewormers, loadedDoseTypes, loadedValidityOptions] = await Promise.all([loadVaccines(true), loadDewormers(true), loadVaccineDoseTypes(true), loadVaccineValidityOptions(true)]);
			vaccines = sortedVaccines(loadedVaccines);
			dewormers = sortedDewormers(loadedDewormers);
			doseTypes = sortedByOrder(loadedDoseTypes);
			validityOptions = sortedValidityOptions(loadedValidityOptions);
			vaccineDraftNames = Object.fromEntries(vaccines.map((vaccine) => [vaccine.id, vaccine.name]));
			dewormerDraftNames = Object.fromEntries(dewormers.map((dewormer) => [dewormer.id, dewormer.name]));
			doseTypeDraftNames = Object.fromEntries(doseTypes.map((doseType) => [doseType.id, doseType.name]));
			doseTypeDraftRequiresDoseNumber = Object.fromEntries(doseTypes.map((doseType) => [doseType.id, doseType.requiresDoseNumber]));
			validityDraftValues = Object.fromEntries(validityOptions.map((option) => [option.id, String(option.validityValue)]));
			validityDraftUnits = Object.fromEntries(validityOptions.map((option) => [option.id, option.validityUnit]));
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNewVaccine(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveVaccineName({ name: newVaccineName });
			upsertVaccine(saved);
			newVaccineName = '';
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitNewDewormer(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveDewormerName({ name: newDewormerName });
			upsertDewormer(saved);
			newDewormerName = '';
			statusKey = 'deworming.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitNewDoseType(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
				const saved = await saveDoseType({ name: newDoseTypeName, requiresDoseNumber: newDoseTypeRequiresDoseNumber });
			upsertDoseType(saved);
			newDoseTypeName = '';
				newDoseTypeRequiresDoseNumber = true;
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitNewValidityOption(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveValidityOption({ validityValue: Number(newValidityValue), validityUnit: newValidityUnit });
			upsertValidityOption(saved);
			newValidityValue = '';
			newValidityUnit = 'months';
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingVaccine(vaccine: Vaccine) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveVaccineName({ name: vaccineDraftName(vaccine) }, vaccine.id);
			upsertVaccine(saved);
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingDewormer(dewormer: Dewormer) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveDewormerName({ name: dewormerDraftName(dewormer) }, dewormer.id);
			upsertDewormer(saved);
			statusKey = 'deworming.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingDoseType(doseType: VaccineDoseType) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
				const saved = await saveDoseType({ name: doseTypeDraftName(doseType), requiresDoseNumber: doseTypeDraftRequires(doseType) }, doseType.id);
			upsertDoseType(saved);
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingValidityOption(option: VaccineValidityOption) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveValidityOption({ validityValue: Number(validityDraftValue(option)), validityUnit: validityDraftUnit(option) }, option.id);
			upsertValidityOption(saved);
			statusKey = 'vaccine.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function toggleVaccineHidden(vaccine: Vaccine) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setVaccineNameHidden(vaccine.id, !vaccine.hiddenAt);
			upsertVaccine(saved);
			statusKey = saved.hiddenAt ? 'vaccine.hiddenSaved' : 'vaccine.shownSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleDewormerHidden(dewormer: Dewormer) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setDewormerNameHidden(dewormer.id, !dewormer.hiddenAt);
			upsertDewormer(saved);
			statusKey = saved.hiddenAt ? 'deworming.hiddenSaved' : 'deworming.shownSaved';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleDoseTypeHidden(doseType: VaccineDoseType) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setDoseTypeHidden(doseType.id, !doseType.hiddenAt);
			upsertDoseType(saved);
			statusKey = saved.hiddenAt ? 'vaccine.catalogHiddenSaved' : 'vaccine.catalogShownSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleValidityOptionHidden(option: VaccineValidityOption) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setValidityOptionHidden(option.id, !option.hiddenAt);
			upsertValidityOption(saved);
			statusKey = saved.hiddenAt ? 'vaccine.catalogHiddenSaved' : 'vaccine.catalogShownSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteVaccine(vaccine: Vaccine) {
		if (!window.confirm(t('vaccine.list.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeVaccineName(vaccine.id);
			vaccines = vaccines.filter((item) => item.id !== vaccine.id);
			const { [vaccine.id]: _removed, ...remainingDrafts } = vaccineDraftNames;
			vaccineDraftNames = remainingDrafts;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteDewormer(dewormer: Dewormer) {
		if (!window.confirm(t('deworming.list.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeDewormerName(dewormer.id);
			dewormers = dewormers.filter((item) => item.id !== dewormer.id);
			const { [dewormer.id]: _removed, ...remainingDrafts } = dewormerDraftNames;
			dewormerDraftNames = remainingDrafts;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteDoseType(doseType: VaccineDoseType) {
		if (!window.confirm(t('vaccine.doseType.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeDoseType(doseType.id);
			doseTypes = doseTypes.filter((item) => item.id !== doseType.id);
			const { [doseType.id]: _removedName, ...remainingNames } = doseTypeDraftNames;
				const { [doseType.id]: _removedRequires, ...remainingRequires } = doseTypeDraftRequiresDoseNumber;
			doseTypeDraftNames = remainingNames;
				doseTypeDraftRequiresDoseNumber = remainingRequires;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteValidityOption(option: VaccineValidityOption) {
		if (!window.confirm(t('vaccine.validityOption.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeValidityOption(option.id);
			validityOptions = validityOptions.filter((item) => item.id !== option.id);
			const { [option.id]: _removedValue, ...remainingValues } = validityDraftValues;
			const { [option.id]: _removedUnit, ...remainingUnits } = validityDraftUnits;
			validityDraftValues = remainingValues;
			validityDraftUnits = remainingUnits;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.vaccines.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.vaccines.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('settings.vaccines.description')}</p>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<div class="grid grid-cols-1 gap-1 rounded-md border border-border bg-muted p-1 sm:grid-cols-4" role="tablist" aria-label={t('vaccine.catalog.tabs')}>
		{#each tabs as tab}
			{@const count = itemCount(tab.id)}
			<button class="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				<span class="truncate">{t(tab.labelKey)}</span>
				<span class="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold {count > 0 ? (activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary') : 'bg-background/70 text-muted-foreground'}">{count}</span>
			</button>
		{/each}
	</div>

	{#if activeTab === 'vaccines'}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Syringe class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('vaccine.list.title')}</h3>
				<form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start" onsubmit={submitNewVaccine}>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('vaccine.name')}</span>
							<CharacterLimitHint value={newVaccineName} max={FIELD_LIMITS.vaccineName} />
						</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newVaccineName} maxlength={FIELD_LIMITS.vaccineName} required />
					</label>
					<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
						<Plus class="size-4" />
						{t('vaccine.list.add')}
					</button>
				</form>
			</div>
		</div>

		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each vaccines as vaccine (vaccine.id)}
					<form class="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingVaccine(vaccine); }}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('vaccine.name')}</span>
								<CharacterLimitHint value={vaccineDraftName(vaccine)} max={FIELD_LIMITS.vaccineName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={vaccineDraftName(vaccine)} maxlength={FIELD_LIMITS.vaccineName} required oninput={(event) => updateVaccineDraft(vaccine.id, inputValue(event))} />
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
							<Save class="size-4" />
							{t('actions.save')}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={vaccine.hiddenAt ? t('vaccine.list.show') : t('vaccine.list.hide')} onclick={() => void toggleVaccineHidden(vaccine)}>
							{#if vaccine.hiddenAt}
								<Eye class="size-4" />
								{t('vaccine.list.show')}
							{:else}
								<EyeOff class="size-4" />
								{t('vaccine.list.hide')}
							{/if}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteVaccine(vaccine)}>
							<Trash2 class="size-4" />
							{t('actions.delete')}
						</button>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.emptyVaccines')}</p>
				{/each}
			{/if}
		</div>
	</section>

	{:else if activeTab === 'dewormers'}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Pill class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('deworming.list.title')}</h3>
				<form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start" onsubmit={submitNewDewormer}>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('deworming.name')}</span>
							<CharacterLimitHint value={newDewormerName} max={FIELD_LIMITS.dewormerName} />
						</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newDewormerName} maxlength={FIELD_LIMITS.dewormerName} required />
					</label>
					<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
						<Plus class="size-4" />
						{t('deworming.list.add')}
					</button>
				</form>
			</div>
		</div>

		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each dewormers as dewormer (dewormer.id)}
					<form class="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingDewormer(dewormer); }}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('deworming.name')}</span>
								<CharacterLimitHint value={dewormerDraftName(dewormer)} max={FIELD_LIMITS.dewormerName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dewormerDraftName(dewormer)} maxlength={FIELD_LIMITS.dewormerName} required oninput={(event) => updateDewormerDraft(dewormer.id, inputValue(event))} />
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
							<Save class="size-4" />
							{t('actions.save')}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={dewormer.hiddenAt ? t('deworming.list.show') : t('deworming.list.hide')} onclick={() => void toggleDewormerHidden(dewormer)}>
							{#if dewormer.hiddenAt}
								<Eye class="size-4" />
								{t('deworming.list.show')}
							{:else}
								<EyeOff class="size-4" />
								{t('deworming.list.hide')}
							{/if}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteDewormer(dewormer)}>
							<Trash2 class="size-4" />
							{t('actions.delete')}
						</button>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('deworming.emptyDewormers')}</p>
				{/each}
			{/if}
		</div>
	</section>

	{:else if activeTab === 'doseTypes'}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('vaccine.doseType.title')}</h3>
		<form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-start" onsubmit={submitNewDoseType}>
			<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<span class="flex min-w-0 items-baseline justify-between gap-2">
					<span>{t('vaccine.doseType.name')}</span>
					<CharacterLimitHint value={newDoseTypeName} max={FIELD_LIMITS.vaccineDoseType} />
				</span>
				<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newDoseTypeName} maxlength={FIELD_LIMITS.vaccineDoseType} required />
			</label>
			<label class="flex h-10 items-center gap-2 self-end rounded-md border border-border bg-background px-3 text-sm font-medium">
				<input type="checkbox" class="size-4 rounded border-input accent-primary" bind:checked={newDoseTypeRequiresDoseNumber} />
				<span>{t('vaccine.doseType.requiresDoseNumber')}</span>
			</label>
			<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Plus class="size-4" />
				{t('vaccine.doseType.add')}
			</button>
		</form>

		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each doseTypes as doseType (doseType.id)}
					<form class="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] md:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingDoseType(doseType); }}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('vaccine.doseType.name')}</span>
								<CharacterLimitHint value={doseTypeDraftName(doseType)} max={FIELD_LIMITS.vaccineDoseType} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={doseTypeDraftName(doseType)} maxlength={FIELD_LIMITS.vaccineDoseType} required oninput={(event) => updateDoseTypeDraftName(doseType.id, inputValue(event))} />
						</label>
						<label class="flex h-10 items-center gap-2 self-end rounded-md border border-border bg-background px-3 text-sm font-medium">
							<input type="checkbox" class="size-4 rounded border-input accent-primary" checked={doseTypeDraftRequires(doseType)} onchange={(event) => updateDoseTypeDraftRequiresDoseNumber(doseType.id, checkboxValue(event))} />
							<span>{t('vaccine.doseType.requiresDoseNumber')}</span>
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
							<Save class="size-4" />
							{t('actions.save')}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={doseType.hiddenAt ? t('vaccine.list.show') : t('vaccine.list.hide')} onclick={() => void toggleDoseTypeHidden(doseType)}>
							{#if doseType.hiddenAt}
								<Eye class="size-4" />
								{t('vaccine.list.show')}
							{:else}
								<EyeOff class="size-4" />
								{t('vaccine.list.hide')}
							{/if}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteDoseType(doseType)}>
							<Trash2 class="size-4" />
							{t('actions.delete')}
						</button>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.doseType.empty')}</p>
				{/each}
			{/if}
		</div>
	</section>

	{:else}
	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('vaccine.validityOption.title')}</h3>
		<form class="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-start" onsubmit={submitNewValidityOption}>
			<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.validityValue')}</span>
				<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" type="number" min="1" max={validityValueLimit(newValidityUnit)} value={newValidityValue} required oninput={(event) => (newValidityValue = inputValue(event))} />
			</label>
			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for="new-vaccine-validity-unit">{t('vaccine.validityUnit')}</label>
				<Select id="new-vaccine-validity-unit" bind:value={newValidityUnit} options={validityUnitOptions()} />
			</div>
			<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 md:self-end" disabled={saving}>
				<Plus class="size-4" />
				{t('vaccine.validityOption.add')}
			</button>
		</form>

		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each validityOptions as option (option.id)}
					<form class="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto_auto_auto] md:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingValidityOption(option); }}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span>{t('vaccine.validityValue')}</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" type="number" min="1" max={validityValueLimit(validityDraftUnit(option))} value={validityDraftValue(option)} required oninput={(event) => updateValidityDraftValue(option.id, inputValue(event))} />
						</label>
						<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<label for={`vaccine-validity-unit-${option.id}`}>{t('vaccine.validityUnit')}</label>
							<Select id={`vaccine-validity-unit-${option.id}`} value={validityDraftUnit(option)} options={validityUnitOptions()} onchange={(value) => updateValidityDraftUnit(option.id, value)} />
						</div>
						<p class="flex h-10 items-center self-end rounded-md bg-muted px-3 text-sm text-muted-foreground">{validityDraftLabel(validityDraftValue(option), validityDraftUnit(option))}</p>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 md:self-end" disabled={saving}>
							<Save class="size-4" />
							{t('actions.save')}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 md:self-end" disabled={saving} title={option.hiddenAt ? t('vaccine.list.show') : t('vaccine.list.hide')} onclick={() => void toggleValidityOptionHidden(option)}>
							{#if option.hiddenAt}
								<Eye class="size-4" />
								{t('vaccine.list.show')}
							{:else}
								<EyeOff class="size-4" />
								{t('vaccine.list.hide')}
							{/if}
						</button>
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50 md:self-end" disabled={saving} onclick={() => void deleteValidityOption(option)}>
							<Trash2 class="size-4" />
							{t('actions.delete')}
						</button>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.validityOption.empty')}</p>
				{/each}
			{/if}
		</div>
	</section>
	{/if}
</section>