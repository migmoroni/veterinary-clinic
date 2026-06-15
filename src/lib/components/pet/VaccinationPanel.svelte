<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import PreventiveDueBadge from '$lib/components/pet/PreventiveDueBadge.svelte';
	import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import type { PetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { preventiveItemMatchesSpecies } from '$lib/domain/preventive/catalog.js';
	import type { PreventiveProtocol } from '$lib/domain/preventive/protocol.js';
	import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
	import { getVaccineDueStatus } from '$lib/domain/vaccine/vaccine.js';
	import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadPreventiveProtocols } from '$lib/services/preventive-protocol.service.js';
	import { loadVaccines, removeVaccination, saveNewVaccinations, setVaccinationValidity } from '$lib/services/vaccine.service.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		petId,
		petSpecies = null,
		vaccinations = [],
		vaccines = [],
		onChange
	}: { petId: number; petSpecies?: PetSpecies | null; vaccinations?: PetVaccination[]; vaccines?: Vaccine[]; onChange?: (vaccinations: PetVaccination[]) => void } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentVaccinations = $state<PetVaccination[]>([]);
	let currentVaccines = $state<Vaccine[]>([]);
	let currentProtocols = $state<PreventiveProtocol[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let vaccineName = $state('');
	let protocolId = $state(0);
	let protocolDoseId = $state(0);
	let dose = $state('');
	let validityValue = $state(12);
	let validityUnit = $state<VaccineValidityUnit>('months');
	let observation = $state('');
	let pendingApplications = $state<PetVaccinationInput[]>([]);
	let vaccinationPendingRemoval = $state<PetVaccination | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedVaccinations = $derived([...currentVaccinations].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visibleVaccines = $derived(currentVaccines.filter((vaccine) => !vaccine.hiddenAt && preventiveItemMatchesSpecies(vaccine.species, petSpecies)));
	const knownVaccineNames = $derived([...new Set(visibleVaccines.map((vaccine) => vaccine.name))].sort((first, second) => first.localeCompare(second)));
	const selectedVaccine = $derived(visibleVaccines.find((vaccine) => vaccine.name === vaccineName) ?? null);
	const visibleProtocols = $derived(selectedVaccine ? currentProtocols.filter((protocol) => !protocol.hiddenAt && preventiveItemMatchesSpecies(protocol.species, petSpecies) && protocol.items.some((item) => item.id === selectedVaccine.id)) : []);
	const selectedProtocol = $derived(visibleProtocols.find((protocol) => protocol.id === protocolId) ?? null);
	const visibleProtocolDoses = $derived(selectedProtocol ? selectedProtocol.doses : []);
	const selectedProtocolDose = $derived(visibleProtocolDoses.find((protocolDose) => protocolDose.id === protocolDoseId) ?? null);
	const protocolFieldsLocked = $derived(Boolean(selectedProtocolDose));

	$effect(() => {
		if (loadedPetId === petId) return;
		currentVaccinations = [...vaccinations];
		currentVaccines = [...vaccines];
		loadedPetId = petId;
	});

	function vaccineNameOptions() {
		return visibleVaccines.map((vaccine) => ({
			value: vaccine.name,
			label: vaccine.name,
			description: [vaccine.manufacturer, ...vaccine.aliases].filter(Boolean).join(' · '),
			searchText: [vaccine.manufacturer, ...vaccine.aliases, ...vaccine.regions].filter(Boolean).join(' ')
		}));
	}

	function protocolOptions() {
		return [{ value: 0, label: t('protocol.none') }, ...visibleProtocols.map((protocol) => ({ value: protocol.id, label: protocol.name }))];
	}

	function protocolDoseOptions() {
		return [{ value: 0, label: t('protocol.dosePlaceholder') }, ...visibleProtocolDoses.map((protocolDose) => ({ value: protocolDose.id, label: protocolDoseLabel(protocolDose) }))];
	}

	function validityLabel(value: number, unit: VaccineValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : unit === 'months' ? (value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural') : value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		return `${value} ${t(unitKey)}`;
	}

	function protocolDoseLabel(protocolDose: { dose: string; validityValue: number; validityUnit: VaccineValidityUnit }): string {
		return `${protocolDose.dose} · ${validityLabel(protocolDose.validityValue, protocolDose.validityUnit)}`;
	}

	function pendingLabel(input: PetVaccinationInput): string {
		const baseLabel = `${input.vaccineName} · ${input.dose} · ${validityLabel(input.validityValue, input.validityUnit)}`;
		const observationSummary = input.observation?.replace(/\s+/g, ' ').trim();
		return observationSummary ? `${baseLabel} · ${observationSummary}` : baseLabel;
	}

	function clearProtocolSelection() {
		protocolId = 0;
		protocolDoseId = 0;
	}

	function handleVaccineChange(value: string) {
		vaccineName = value;
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

	function validateCurrentInput(): PetVaccinationInput | null {
		const normalizedAppliedAt = normalizeDateInput(appliedAt);
		if (!normalizedAppliedAt) {
			errorKey = 'date.invalid';
			return null;
		}

		const trimmedName = vaccineName.trim();
		if (!trimmedName || !knownVaccineNames.includes(trimmedName)) {
			errorKey = 'vaccine.nameRequired';
			return null;
		}

		if (trimmedName.length > FIELD_LIMITS.vaccineName) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		const trimmedDose = dose.trim();
		if (!trimmedDose) {
			errorKey = 'vaccine.doseRequired';
			return null;
		}
		if (textLength(trimmedDose) > FIELD_LIMITS.vaccineDose) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		if (validityValue <= 0) {
			errorKey = 'vaccine.validityRequired';
			return null;
		}

		const normalizedObservation = observation.trim() ? observation : null;
		if (textLength(normalizedObservation) > FIELD_LIMITS.vaccinationObservation) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		return {
			appliedAt: normalizedAppliedAt,
			vaccineName: trimmedName,
			dose: trimmedDose,
			validityValue,
			validityUnit,
			observation: normalizedObservation
		};
	}

	function resetVaccineFields() {
		vaccineName = '';
		clearProtocolSelection();
		dose = '';
		validityValue = 12;
		validityUnit = 'months';
		observation = '';
	}

	function addPendingApplication() {
		statusKey = null;
		errorKey = null;
		const input = validateCurrentInput();
		if (!input) return;

		pendingApplications = [...pendingApplications, input];
		resetVaccineFields();
	}

	function removePendingApplication(index: number) {
		pendingApplications = pendingApplications.filter((_, itemIndex) => itemIndex !== index);
	}

	function setCurrentVaccinations(vaccinations: PetVaccination[]) {
		currentVaccinations = vaccinations;
		onChange?.(vaccinations);
	}

	async function reloadCatalogs() {
		const [loadedVaccines, loadedProtocols] = await Promise.all([loadVaccines(), loadPreventiveProtocols('vaccine')]);
		currentVaccines = loadedVaccines;
		currentProtocols = loadedProtocols;
		if (protocolId && !visibleProtocols.some((protocol) => protocol.id === protocolId)) clearProtocolSelection();
	}

	async function submitVaccinations(event: SubmitEvent) {
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

			const updated = await saveNewVaccinations(petId, applications);
			setCurrentVaccinations(updated);
			pendingApplications = [];
			resetVaccineFields();
			await reloadCatalogs();
			statusKey = 'vaccine.saved';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
			else if (exception instanceof Error && exception.message === 'vaccine_name_required') errorKey = 'vaccine.nameRequired';
			else if (exception instanceof Error && exception.message === 'vaccine_dose_required') errorKey = 'vaccine.doseRequired';
			else if (exception instanceof Error && exception.message === 'vaccine_validity_required') errorKey = 'vaccine.validityRequired';
			else errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleVaccinationValidity(vaccination: PetVaccination, ignored: boolean) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const updated = await setVaccinationValidity(vaccination.id, ignored);
			setCurrentVaccinations(currentVaccinations.map((item) => (item.id === updated.id ? updated : item)));
			statusKey = ignored ? 'vaccine.validityIgnoredSaved' : 'vaccine.validityRestoredSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	function requestDeleteVaccination(vaccination: PetVaccination) {
		vaccinationPendingRemoval = vaccination;
	}

	async function confirmDeleteVaccination() {
		const vaccination = vaccinationPendingRemoval;
		if (!vaccination) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeVaccination(vaccination.id);
			setCurrentVaccinations(currentVaccinations.filter((item) => item.id !== vaccination.id));
			vaccinationPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	function vaccinationName(vaccination: PetVaccination): string {
		return `${vaccination.vaccineName} · ${vaccination.dose}`;
	}

	onMount(() => {
		void reloadCatalogs();
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<h3 class="min-w-0 text-base font-semibold">{t('vaccine.sectionTitle')}</h3>
		<a href="/settings/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('vaccine.manageVaccines')}>
			<Settings2 class="size-4" />
			{t('vaccine.manageVaccines')}
		</a>
	</div>

	{#if errorKey}
		<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<form class="mt-4 flex flex-col gap-4" onsubmit={submitVaccinations}>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.step.appliedAt')}</span>
				<DateField bind:value={appliedAt} ariaLabel={t('vaccine.step.appliedAt')} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`vaccine-name-${petId}`}>{t('vaccine.step.vaccine')}</label>
				<SearchableSelect id={`vaccine-name-${petId}`} bind:value={vaccineName} emptyValue="" options={vaccineNameOptions()} placeholder={t('vaccine.namePlaceholder')} emptyLabel={t('form.noOptions')} disabled={knownVaccineNames.length === 0} onchange={handleVaccineChange} />
			</div>

			<div class="grid gap-3 md:col-span-2 sm:grid-cols-2">
				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`vaccine-protocol-${petId}`}>{t('protocol.label')}</label>
					<Select id={`vaccine-protocol-${petId}`} bind:value={protocolId} options={protocolOptions()} disabled={!selectedVaccine || visibleProtocols.length === 0} onchange={handleProtocolChange} />
				</div>

				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`vaccine-protocol-dose-${petId}`}>{t('protocol.dose')}</label>
					<Select id={`vaccine-protocol-dose-${petId}`} bind:value={protocolDoseId} options={protocolDoseOptions()} disabled={!selectedProtocol || visibleProtocolDoses.length === 0} onchange={handleProtocolDoseChange} />
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
					<span>{t('vaccine.step.dose')}</span>
					<CharacterLimitHint value={dose} max={FIELD_LIMITS.vaccineDose} />
				</span>
				<input id={`vaccine-dose-${petId}`} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:opacity-70" bind:value={dose} maxlength={FIELD_LIMITS.vaccineDose} placeholder={t('vaccine.dosePlaceholder')} readonly={protocolFieldsLocked} />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.step.validity')}</span>
				<PeriodField bind:value={validityValue} bind:unit={validityUnit} ariaLabel={t('vaccine.step.validity')} disabled={protocolFieldsLocked} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`vaccine-observation-${petId}`}>{t('vaccine.observation')}</label>
				<Textarea id={`vaccine-observation-${petId}`} bind:value={observation} ariaLabel={t('vaccine.observation')} maxLength={FIELD_LIMITS.vaccinationObservation} readonly={protocolFieldsLocked} class="min-h-24" />
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addPendingApplication}>
				<Plus class="size-4" />
				{t('vaccine.addToDay')}
			</button>
			<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('vaccine.saveApplications')}
			</button>
		</div>

		{#if pendingApplications.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t('vaccine.selectedForDay')}>
				{#each pendingApplications as application, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{pendingLabel(application)}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t('vaccine.removeSelected')}: ${pendingLabel(application)}`} onclick={() => removePendingApplication(index)}>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}
	</form>

	<div class="mt-5 flex flex-col gap-2">
		{#each sortedVaccinations as vaccination}
			<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Syringe class="size-5" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{vaccinationName(vaccination)}</span>
					<span class="mt-0.5 block text-xs text-muted-foreground">{formatDateForDisplay(vaccination.appliedAt, i18n.locale) || t('common.notInformed')}</span>
					<span class="mt-1 block text-xs text-muted-foreground">{validityLabel(vaccination.validityValue, vaccination.validityUnit)}</span>
					{#if vaccination.observation}
						<span class="mt-1 block whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground"><span class="font-medium text-foreground">{t('vaccine.observation')}:</span> {vaccination.observation}</span>
					{/if}
					<PreventiveDueBadge kind="vaccine" status={getVaccineDueStatus(vaccination)} className="mt-2" />
				</span>
				<span class="flex shrink-0 gap-1">
					{#if vaccination.validityIgnoredAt}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('vaccine.restoreValidity')}: ${vaccinationName(vaccination)}`} title={t('vaccine.restoreValidity')} disabled={saving} onclick={() => void toggleVaccinationValidity(vaccination, false)}>
							<Bell class="size-4" />
						</button>
					{:else}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('vaccine.ignoreValidity')}: ${vaccinationName(vaccination)}`} title={t('vaccine.ignoreValidity')} disabled={saving} onclick={() => void toggleVaccinationValidity(vaccination, true)}>
							<BellOff class="size-4" />
						</button>
					{/if}
					<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" aria-label={`${t('actions.delete')}: ${vaccinationName(vaccination)}`} title={t('actions.delete')} disabled={saving} onclick={() => requestDeleteVaccination(vaccination)}>
						<Trash2 class="size-4" />
					</button>
				</span>
			</div>
		{:else}
			<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.empty')}</p>
		{/each}
	</div>
</section>

<TrashRemovalDialog open={vaccinationPendingRemoval !== null} messageKey="vaccine.deleteConfirm" confirming={saving} onConfirm={() => void confirmDeleteVaccination()} onCancel={() => (vaccinationPendingRemoval = null)} />
