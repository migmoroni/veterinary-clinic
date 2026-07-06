<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import TreatmentDueBadge from '$lib/components/pet/TreatmentDueBadge.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { PetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { medicationItemMatchesSpecies } from '$lib/domain/medication/catalog.js';
	import type { MedicationProtocol } from '$lib/domain/medication/protocol.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
	import type { PetTreatment, PetTreatmentInput, TreatmentCatalogItem, TreatmentKind, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';
	import { getTreatmentDueStatus } from '$lib/domain/treatment/treatment.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadMedicationProtocols } from '$lib/services/medication-protocol.service.js';
	import { loadTreatmentCatalogItems, removeTreatment, saveNewTreatments, setTreatmentValidity } from '$lib/services/treatment.service.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	interface TreatmentPanelConfig {
		prefix: string;
		sectionTitle: TranslationKey;
		manageLabel: TranslationKey;
		stepItem: TranslationKey;
		stepAppliedAt: TranslationKey;
		stepDose: TranslationKey;
		stepValidity: TranslationKey;
		namePlaceholder: TranslationKey;
		nameRequired: TranslationKey;
		doseRequired: TranslationKey;
		validityRequired: TranslationKey;
		observation: TranslationKey;
		dosePlaceholder: TranslationKey;
		addToDay: TranslationKey;
		selectedForDay: TranslationKey;
		removeSelected: TranslationKey;
		saveApplications: TranslationKey;
		saved: TranslationKey;
		saveFailed: TranslationKey;
		empty: TranslationKey;
		ignoreValidity: TranslationKey;
		restoreValidity: TranslationKey;
		validityIgnoredSaved: TranslationKey;
		validityRestoredSaved: TranslationKey;
		deleteConfirm: TranslationKey;
		nameLimit: number;
		doseLimit: number;
		observationLimit: number;
		defaultValidityValue: number;
		defaultValidityUnit: TreatmentValidityUnit;
	}

	const panelConfigs = {
		vaccine: {
			prefix: 'vaccine',
			sectionTitle: 'vaccine.sectionTitle',
			manageLabel: 'vaccine.manageVaccines',
			stepItem: 'vaccine.step.vaccine',
			stepAppliedAt: 'vaccine.step.appliedAt',
			stepDose: 'vaccine.step.dose',
			stepValidity: 'vaccine.step.validity',
			namePlaceholder: 'vaccine.namePlaceholder',
			nameRequired: 'vaccine.nameRequired',
			doseRequired: 'vaccine.doseRequired',
			validityRequired: 'vaccine.validityRequired',
			observation: 'vaccine.observation',
			dosePlaceholder: 'vaccine.dosePlaceholder',
			addToDay: 'vaccine.addToDay',
			selectedForDay: 'vaccine.selectedForDay',
			removeSelected: 'vaccine.removeSelected',
			saveApplications: 'vaccine.saveApplications',
			saved: 'vaccine.saved',
			saveFailed: 'vaccine.saveFailed',
			empty: 'vaccine.empty',
			ignoreValidity: 'vaccine.ignoreValidity',
			restoreValidity: 'vaccine.restoreValidity',
			validityIgnoredSaved: 'vaccine.validityIgnoredSaved',
			validityRestoredSaved: 'vaccine.validityRestoredSaved',
			deleteConfirm: 'vaccine.deleteConfirm',
			nameLimit: FIELD_LIMITS.vaccineName,
			doseLimit: FIELD_LIMITS.vaccineDose,
			observationLimit: FIELD_LIMITS.vaccinationObservation,
			defaultValidityValue: 12,
			defaultValidityUnit: 'months'
		},
		antiparasitic: {
			prefix: 'antiparasiticTreatment',
			sectionTitle: 'antiparasiticTreatment.sectionTitle',
			manageLabel: 'antiparasiticTreatment.manageAntiparasitics',
			stepItem: 'antiparasiticTreatment.step.antiparasitic',
			stepAppliedAt: 'antiparasiticTreatment.step.appliedAt',
			stepDose: 'antiparasiticTreatment.step.dose',
			stepValidity: 'antiparasiticTreatment.step.validity',
			namePlaceholder: 'antiparasiticTreatment.namePlaceholder',
			nameRequired: 'antiparasiticTreatment.nameRequired',
			doseRequired: 'antiparasiticTreatment.doseRequired',
			validityRequired: 'antiparasiticTreatment.validityRequired',
			observation: 'antiparasiticTreatment.observation',
			dosePlaceholder: 'antiparasiticTreatment.dosePlaceholder',
			addToDay: 'antiparasiticTreatment.addToDay',
			selectedForDay: 'antiparasiticTreatment.selectedForDay',
			removeSelected: 'antiparasiticTreatment.removeSelected',
			saveApplications: 'antiparasiticTreatment.saveApplications',
			saved: 'antiparasiticTreatment.saved',
			saveFailed: 'antiparasiticTreatment.saveFailed',
			empty: 'antiparasiticTreatment.empty',
			ignoreValidity: 'antiparasiticTreatment.ignoreValidity',
			restoreValidity: 'antiparasiticTreatment.restoreValidity',
			validityIgnoredSaved: 'antiparasiticTreatment.validityIgnoredSaved',
			validityRestoredSaved: 'antiparasiticTreatment.validityRestoredSaved',
			deleteConfirm: 'antiparasiticTreatment.deleteConfirm',
			nameLimit: FIELD_LIMITS.antiparasiticName,
			doseLimit: FIELD_LIMITS.antiparasiticTreatmentDose,
			observationLimit: FIELD_LIMITS.antiparasiticTreatmentObservation,
			defaultValidityValue: 6,
			defaultValidityUnit: 'months'
		}
	} satisfies Record<TreatmentKind, TreatmentPanelConfig>;

	let {
		kind,
		petId,
		petSpecies = null,
		treatments = [],
		catalogItems = [],
		onChange
	}: { kind: TreatmentKind; petId: number; petSpecies?: PetSpecies | null; treatments?: PetTreatment[]; catalogItems?: TreatmentCatalogItem[]; onChange?: (treatments: PetTreatment[]) => void } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	const config = $derived(panelConfigs[kind]);

	let currentTreatments = $state<PetTreatment[]>([]);
	let currentCatalogItems = $state<TreatmentCatalogItem[]>([]);
	let currentProtocols = $state<MedicationProtocol[]>([]);
	let loadedPetId = $state<number | null>(null);
	let loadedKind = $state<TreatmentKind | null>(null);
	let appliedAt = $state(todayInput);
	let treatmentName = $state('');
	let protocolId = $state(0);
	let protocolDoseId = $state(0);
	let dose = $state('');
	let validityValue = $state(0);
	let validityUnit = $state<TreatmentValidityUnit>('months');
	let observation = $state('');
	let pendingApplications = $state<PetTreatmentInput[]>([]);
	let pendingRemoval = $state<PetTreatment | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedTreatments = $derived([...currentTreatments].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visibleCatalogItems = $derived(currentCatalogItems.filter((item) => !item.hiddenAt && medicationItemMatchesSpecies(item.species, petSpecies)));
	const knownNames = $derived([...new Set(visibleCatalogItems.map((item) => item.name))].sort((first, second) => first.localeCompare(second)));
	const selectedCatalogItem = $derived(visibleCatalogItems.find((item) => item.name === treatmentName) ?? null);
	const visibleProtocols = $derived(selectedCatalogItem ? currentProtocols.filter((protocol) => !protocol.hiddenAt && medicationItemMatchesSpecies(protocol.species, petSpecies) && protocol.items.some((item) => item.id === selectedCatalogItem.id)) : []);
	const selectedProtocol = $derived(visibleProtocols.find((protocol) => protocol.id === protocolId) ?? null);
	const visibleProtocolDoses = $derived(selectedProtocol ? selectedProtocol.doses : []);
	const selectedProtocolDose = $derived(visibleProtocolDoses.find((protocolDose) => protocolDose.id === protocolDoseId) ?? null);
	const protocolFieldsLocked = $derived(Boolean(selectedProtocolDose));

	$effect(() => {
		if (loadedPetId === petId && loadedKind === kind) return;
		currentTreatments = [...treatments];
		currentCatalogItems = [...catalogItems];
		loadedPetId = petId;
		loadedKind = kind;
		validityValue = config.defaultValidityValue;
		validityUnit = config.defaultValidityUnit;
	});

	function catalogOptions() {
		return visibleCatalogItems.map((item) => ({
			value: item.name,
			label: item.name,
			description: [item.manufacturer, ...item.aliases].filter(Boolean).join(' · '),
			searchText: [item.manufacturer, ...item.aliases, ...item.regions].filter(Boolean).join(' ')
		}));
	}

	function protocolOptions() {
		return [{ value: 0, label: t('protocol.none') }, ...visibleProtocols.map((protocol) => ({ value: protocol.id, label: protocol.name }))];
	}

	function protocolDoseOptions() {
		return [{ value: 0, label: t('protocol.dosePlaceholder') }, ...visibleProtocolDoses.map((protocolDose) => ({ value: protocolDose.id, label: protocolDoseLabel(protocolDose) }))];
	}

	function validityLabel(value: number, unit: TreatmentValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : unit === 'months' ? (value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural') : value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		return `${value} ${t(unitKey)}`;
	}

	function protocolDoseLabel(protocolDose: { dose: string; validityValue: number; validityUnit: TreatmentValidityUnit }): string {
		return `${protocolDose.dose} · ${validityLabel(protocolDose.validityValue, protocolDose.validityUnit)}`;
	}

	function pendingLabel(input: PetTreatmentInput): string {
		const baseLabel = `${input.name} · ${input.dose} · ${validityLabel(input.validityValue, input.validityUnit)}`;
		const observationSummary = input.observation?.replace(/\s+/g, ' ').trim();
		return observationSummary ? `${baseLabel} · ${observationSummary}` : baseLabel;
	}

	function treatmentLabel(treatment: PetTreatment): string {
		return `${treatment.name} · ${treatment.dose}`;
	}

	function clearProtocolSelection() {
		protocolId = 0;
		protocolDoseId = 0;
	}

	function handleTreatmentChange(value: string) {
		treatmentName = value;
		clearProtocolSelection();
	}

	function handleProtocolChange(value: number) {
		protocolId = value;
		protocolDoseId = 0;
	}

	function handleProtocolDoseChange(value: number) {
		protocolDoseId = value;
		const protocolDose = visibleProtocolDoses.find((item) => item.id === value);
		if (!protocolDose) return;

		dose = protocolDose.dose;
		validityValue = protocolDose.validityValue;
		validityUnit = protocolDose.validityUnit;
		observation = selectedProtocol?.observation ?? '';
	}

	function validateCurrentInput(): PetTreatmentInput | null {
		const normalizedAppliedAt = normalizeDateInput(appliedAt);
		if (!normalizedAppliedAt) {
			errorKey = 'date.invalid';
			return null;
		}

		const trimmedName = treatmentName.trim();
		if (!trimmedName || !knownNames.includes(trimmedName)) {
			errorKey = config.nameRequired;
			return null;
		}
		if (textLength(trimmedName) > config.nameLimit) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		const trimmedDose = dose.trim();
		if (!trimmedDose) {
			errorKey = config.doseRequired;
			return null;
		}
		if (textLength(trimmedDose) > config.doseLimit) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		if (validityValue <= 0) {
			errorKey = config.validityRequired;
			return null;
		}

		const normalizedObservation = observation.trim() ? observation : null;
		if (textLength(normalizedObservation) > config.observationLimit) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		return {
			appliedAt: normalizedAppliedAt,
			name: trimmedName,
			dose: trimmedDose,
			validityValue,
			validityUnit,
			observation: normalizedObservation
		};
	}

	function resetTreatmentFields() {
		treatmentName = '';
		clearProtocolSelection();
		dose = '';
		validityValue = config.defaultValidityValue;
		validityUnit = config.defaultValidityUnit;
		observation = '';
	}

	function addPendingApplication() {
		statusKey = null;
		errorKey = null;
		const input = validateCurrentInput();
		if (!input) return;

		pendingApplications = [...pendingApplications, input];
		resetTreatmentFields();
	}

	function removePendingApplication(index: number) {
		pendingApplications = pendingApplications.filter((_, itemIndex) => itemIndex !== index);
	}

	function setCurrentTreatments(treatments: PetTreatment[]) {
		currentTreatments = treatments;
		onChange?.(treatments);
	}

	async function reloadCatalogs() {
		const [loadedCatalogItems, loadedProtocols] = await Promise.all([loadTreatmentCatalogItems(kind), loadMedicationProtocols(kind)]);
		currentCatalogItems = loadedCatalogItems;
		currentProtocols = loadedProtocols;
		if (protocolId && !visibleProtocols.some((protocol) => protocol.id === protocolId)) clearProtocolSelection();
	}

	async function submitTreatments(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			let applications = [...pendingApplications];
			if (applications.length === 0) {
				const input = validateCurrentInput();
				if (!input) return;
				applications = [input];
			}

			const updated = await saveNewTreatments(kind, petId, applications);
			setCurrentTreatments(updated);
			pendingApplications = [];
			resetTreatmentFields();
			await reloadCatalogs();
			statusKey = config.saved;
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
			else if (exception instanceof Error && exception.message === 'treatment_name_required') errorKey = config.nameRequired;
			else if (exception instanceof Error && exception.message === 'treatment_dose_required') errorKey = config.doseRequired;
			else if (exception instanceof Error && exception.message === 'treatment_validity_required') errorKey = config.validityRequired;
			else errorKey = config.saveFailed;
		} finally {
			saving = false;
		}
	}

	async function toggleTreatmentValidity(treatment: PetTreatment, ignored: boolean) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const updated = await setTreatmentValidity(kind, treatment.id, ignored);
			setCurrentTreatments(currentTreatments.map((item) => (item.id === updated.id ? updated : item)));
			statusKey = ignored ? config.validityIgnoredSaved : config.validityRestoredSaved;
		} catch {
			errorKey = config.saveFailed;
		} finally {
			saving = false;
		}
	}

	function requestDeleteTreatment(treatment: PetTreatment) {
		pendingRemoval = treatment;
	}

	async function confirmDeleteTreatment() {
		const treatment = pendingRemoval;
		if (!treatment) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeTreatment(kind, treatment.id);
			setCurrentTreatments(currentTreatments.filter((item) => item.id !== treatment.id));
			pendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = config.saveFailed;
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void reloadCatalogs();
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<h3 class="min-w-0 text-base font-semibold">{t(config.sectionTitle)}</h3>
		<a href="/settings/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t(config.manageLabel)}>
			<Settings2 class="size-4" />
			{t(config.manageLabel)}
		</a>
	</div>

	{#if errorKey}
		<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<form class="mt-4 flex flex-col gap-4" onsubmit={submitTreatments}>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t(config.stepAppliedAt)}</span>
				<DateField bind:value={appliedAt} ariaLabel={t(config.stepAppliedAt)} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`${config.prefix}-name-${petId}`}>{t(config.stepItem)}</label>
				<SearchableSelect id={`${config.prefix}-name-${petId}`} bind:value={treatmentName} emptyValue="" options={catalogOptions()} placeholder={t(config.namePlaceholder)} emptyLabel={t('form.noOptions')} disabled={knownNames.length === 0} onchange={handleTreatmentChange} />
			</div>

			<div class="grid gap-3 md:col-span-2 sm:grid-cols-2">
				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`${config.prefix}-protocol-${petId}`}>{t('protocol.label')}</label>
					<Select id={`${config.prefix}-protocol-${petId}`} bind:value={protocolId} options={protocolOptions()} disabled={!selectedCatalogItem || visibleProtocols.length === 0} onchange={handleProtocolChange} />
				</div>

				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`${config.prefix}-protocol-dose-${petId}`}>{t('protocol.dose')}</label>
					<Select id={`${config.prefix}-protocol-dose-${petId}`} bind:value={protocolDoseId} options={protocolDoseOptions()} disabled={!selectedProtocol || visibleProtocolDoses.length === 0} onchange={handleProtocolDoseChange} />
				</div>
			</div>

			{#if protocolFieldsLocked}
				<div class="md:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
					<span>{t('protocol.lockedFields')}</span>
					<button type="button" class="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-border bg-background px-2 text-xs font-medium hover:bg-accent" onclick={clearProtocolSelection}>
						<X class="size-3" />
						{t('protocol.clear')}
					</button>
				</div>
			{/if}

			<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<span class="flex min-w-0 items-baseline justify-between gap-2">
					<span>{t(config.stepDose)}</span>
					<CharacterLimitHint value={dose} max={config.doseLimit} />
				</span>
				<input id={`${config.prefix}-dose-${petId}`} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:opacity-70" bind:value={dose} maxlength={config.doseLimit} placeholder={t(config.dosePlaceholder)} readonly={protocolFieldsLocked} />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t(config.stepValidity)}</span>
				<PeriodField bind:value={validityValue} bind:unit={validityUnit} ariaLabel={t(config.stepValidity)} disabled={protocolFieldsLocked} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`${config.prefix}-observation-${petId}`}>{t(config.observation)}</label>
				<Textarea id={`${config.prefix}-observation-${petId}`} bind:value={observation} ariaLabel={t(config.observation)} maxLength={config.observationLimit} readonly={protocolFieldsLocked} class="min-h-24" />
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addPendingApplication}>
				<Plus class="size-4" />
				{t(config.addToDay)}
			</button>
			<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t(config.saveApplications)}
			</button>
		</div>

		{#if pendingApplications.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t(config.selectedForDay)}>
				{#each pendingApplications as application, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{pendingLabel(application)}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t(config.removeSelected)}: ${pendingLabel(application)}`} onclick={() => removePendingApplication(index)}>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}
	</form>

	<div class="mt-5 flex flex-col gap-2">
		{#each sortedTreatments as treatment}
			<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					{#if kind === 'vaccine'}
						<Syringe class="size-5" />
					{:else}
						<Pill class="size-5" />
					{/if}
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{treatmentLabel(treatment)}</span>
					<span class="mt-0.5 block text-xs text-muted-foreground">{formatDateForDisplay(treatment.appliedAt, i18n.locale) || t('common.notInformed')}</span>
					<span class="mt-1 block text-xs text-muted-foreground">{validityLabel(treatment.validityValue, treatment.validityUnit)}</span>
					{#if treatment.observation}
						<span class="mt-1 block whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground"><span class="font-medium text-foreground">{t(config.observation)}:</span> {treatment.observation}</span>
					{/if}
					<TreatmentDueBadge {kind} status={getTreatmentDueStatus(treatment)} className="mt-2" />
				</span>
				<span class="flex shrink-0 gap-1">
					{#if treatment.validityIgnoredAt}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t(config.restoreValidity)}: ${treatmentLabel(treatment)}`} title={t(config.restoreValidity)} disabled={saving} onclick={() => void toggleTreatmentValidity(treatment, false)}>
							<Bell class="size-4" />
						</button>
					{:else}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t(config.ignoreValidity)}: ${treatmentLabel(treatment)}`} title={t(config.ignoreValidity)} disabled={saving} onclick={() => void toggleTreatmentValidity(treatment, true)}>
							<BellOff class="size-4" />
						</button>
					{/if}
					<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" aria-label={`${t('actions.delete')}: ${treatmentLabel(treatment)}`} title={t('actions.delete')} disabled={saving} onclick={() => requestDeleteTreatment(treatment)}>
						<Trash2 class="size-4" />
					</button>
				</span>
			</div>
		{:else}
			<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(config.empty)}</p>
		{/each}
	</div>
</section>

<TrashRemovalDialog open={pendingRemoval !== null} messageKey={config.deleteConfirm} confirming={saving} onConfirm={() => void confirmDeleteTreatment()} onCancel={() => (pendingRemoval = null)} />
