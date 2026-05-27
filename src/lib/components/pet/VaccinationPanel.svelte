<script lang="ts">
	import { onMount } from 'svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import type { PetVaccination, PetVaccinationInput, Vaccine, VaccineDoseType, VaccineValidityOption, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
	import { formatDoseNumberLabel, getVaccineDueStatus } from '$lib/domain/vaccine/vaccine.js';
	import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadVaccines, loadVaccineDoseTypes, loadVaccineValidityOptions, removeVaccination, saveNewVaccinations, setVaccinationValidity } from '$lib/services/vaccine.service.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		petId,
		vaccinations = [],
		vaccines = [],
		onChange
	}: { petId: number; vaccinations?: PetVaccination[]; vaccines?: Vaccine[]; onChange?: (vaccinations: PetVaccination[]) => void } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentVaccinations = $state<PetVaccination[]>([]);
	let currentVaccines = $state<Vaccine[]>([]);
	let currentDoseTypes = $state<VaccineDoseType[]>([]);
	let currentValidityOptions = $state<VaccineValidityOption[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let vaccineName = $state('');
	let doseType = $state('');
	let doseNumberText = $state('1');
	let validityOptionId = $state(0);
	let observation = $state('');
	let pendingApplications = $state<PetVaccinationInput[]>([]);
	let vaccinationPendingRemoval = $state<PetVaccination | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedVaccinations = $derived([...currentVaccinations].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visibleVaccines = $derived(currentVaccines.filter((vaccine) => !vaccine.hiddenAt));
	const visibleDoseTypes = $derived(currentDoseTypes.filter((dose) => !dose.hiddenAt));
	const visibleValidityOptions = $derived(currentValidityOptions.filter((option) => !option.hiddenAt));
	const knownVaccineNames = $derived([...new Set(visibleVaccines.map((vaccine) => vaccine.name))].sort((first, second) => first.localeCompare(second)));
	const knownDoseTypeNames = $derived(visibleDoseTypes.map((item) => item.name));
	const selectedDoseType = $derived(visibleDoseTypes.find((item) => item.name === doseType) ?? null);
	const selectedValidityOption = $derived(visibleValidityOptions.find((option) => option.id === validityOptionId) ?? null);
	const doseNumberRequired = $derived(selectedDoseType?.requiresDoseNumber ?? true);

	$effect(() => {
		if (loadedPetId === petId) return;
		currentVaccinations = [...vaccinations];
		currentVaccines = [...vaccines];
		loadedPetId = petId;
	});

	function vaccineNameOptions() {
		return [{ value: '', label: t('vaccine.namePlaceholder') }, ...knownVaccineNames.map((name) => ({ value: name, label: name }))];
	}

	function doseTypeOptions() {
		return [{ value: '', label: t('vaccine.doseType.placeholder') }, ...visibleDoseTypes.map((item) => ({ value: item.name, label: item.name }))];
	}

	function validityOptionOptions() {
		return [{ value: 0, label: t('vaccine.validityOption.placeholder') }, ...visibleValidityOptions.map((option) => ({ value: option.id, label: validityLabel(option.validityValue, option.validityUnit) }))];
	}

	function doseLabel(type: string, doseNumber: number | null): string {
		return doseNumber ? `${type} · ${formatDoseNumberLabel(doseNumber, t('vaccine.dose').toLocaleLowerCase(i18n.locale))}` : type;
	}

	function validityLabel(value: number, unit: VaccineValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural';
		return `${value} ${t(unitKey)}`;
	}

	function pendingLabel(input: PetVaccinationInput): string {
		const baseLabel = `${input.vaccineName} · ${doseLabel(input.doseType, input.doseNumber)} · ${validityLabel(input.validityValue, input.validityUnit)}`;
		const observationSummary = input.observation?.replace(/\s+/g, ' ').trim();
		return observationSummary ? `${baseLabel} · ${observationSummary}` : baseLabel;
	}

	function requiresDoseNumberFor(type: string): boolean {
		return visibleDoseTypes.find((item) => item.name === type)?.requiresDoseNumber ?? true;
	}

	function defaultDoseType(): string {
		return visibleDoseTypes[0]?.name ?? '';
	}

	function defaultValidityOptionId(): number {
		return visibleValidityOptions[0]?.id ?? 0;
	}

	function normalizeDoseNumberInput(value: string): string {
		const digits = value.replace(/\D/g, '').replace(/^0+/, '');
		if (!digits) return '';
		const number = Number(digits);
		return String(Math.min(number, FIELD_LIMITS.vaccineDoseNumber));
	}

	function currentDoseNumber(): number {
		const number = Number(doseNumberText.trim());
		return Number.isInteger(number) && number > 0 ? number : 0;
	}

	function setDoseNumberValue(value: number) {
		if (!doseNumberRequired) return;
		doseNumberText = String(Math.min(Math.max(value, 1), FIELD_LIMITS.vaccineDoseNumber));
	}

	function changeDoseNumber(delta: number) {
		setDoseNumberValue(currentDoseNumber() + delta);
	}

	function resetDoseFields() {
		doseType = defaultDoseType();
		doseNumberText = requiresDoseNumberFor(doseType) ? '1' : '';
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

		const validityOption = selectedValidityOption;
		if (!validityOption) {
			errorKey = 'vaccine.validityRequired';
			return null;
		}

		const trimmedDoseType = doseType.trim();
		if (!trimmedDoseType || !knownDoseTypeNames.includes(trimmedDoseType)) {
			errorKey = 'vaccine.doseTypeRequired';
			return null;
		}

		let doseNumber: number | null = null;
		if (requiresDoseNumberFor(trimmedDoseType)) {
			const normalizedDoseNumber = Number(doseNumberText.trim());
			if (!Number.isInteger(normalizedDoseNumber) || normalizedDoseNumber <= 0 || normalizedDoseNumber > FIELD_LIMITS.vaccineDoseNumber) {
				errorKey = 'vaccine.doseNumberRequired';
				return null;
			}
			doseNumber = normalizedDoseNumber;
		}

		const normalizedObservation = observation.trim() ? observation : null;
		if (textLength(normalizedObservation) > FIELD_LIMITS.vaccinationObservation) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		return {
			appliedAt: normalizedAppliedAt,
			vaccineName: trimmedName,
			doseType: trimmedDoseType,
			doseNumber,
			validityValue: validityOption.validityValue,
			validityUnit: validityOption.validityUnit,
			observation: normalizedObservation
		};
	}

	function resetVaccineFields() {
		vaccineName = '';
		resetDoseFields();
		validityOptionId = defaultValidityOptionId();
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
		const [loadedVaccines, loadedDoseTypes, loadedValidityOptions] = await Promise.all([loadVaccines(), loadVaccineDoseTypes(), loadVaccineValidityOptions()]);
		currentVaccines = loadedVaccines;
		currentDoseTypes = loadedDoseTypes;
		currentValidityOptions = loadedValidityOptions;
		if (!doseType || !loadedDoseTypes.some((item) => !item.hiddenAt && item.name === doseType)) resetDoseFields();
		else if (!requiresDoseNumberFor(doseType)) doseNumberText = '';
		else if (!doseNumberText.trim()) doseNumberText = '1';
		if (!validityOptionId || !loadedValidityOptions.some((option) => !option.hiddenAt && option.id === validityOptionId)) validityOptionId = loadedValidityOptions.find((option) => !option.hiddenAt)?.id ?? 0;
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

	function dueLabel(vaccination: PetVaccination): string {
		const status = getVaccineDueStatus(vaccination);
		if (status.validityIgnored) return t('vaccine.validityIgnored');
		if (!status.dueAt || status.daysUntilDue === null) return t('vaccine.validityUnknown');

		const formattedDueAt = formatDateForDisplay(status.dueAt, i18n.locale);
		if (status.expired) return `${t('vaccine.expiredOn')} ${formattedDueAt}`;
		if (status.daysUntilDue === 0) return `${t('vaccine.expiresToday')} ${formattedDueAt}`;
		return `${t('vaccine.validUntil')} ${formattedDueAt} · ${t('vaccine.expiresIn')} ${status.daysUntilDue} ${t(status.daysUntilDue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural')}`;
	}

	function dueBadgeClass(vaccination: PetVaccination): string {
		const status = getVaccineDueStatus(vaccination);
		if (status.validityIgnored) return 'border-border bg-muted text-muted-foreground';
		if (status.expired) return 'border-destructive/30 bg-destructive/10 text-destructive';
		if (status.daysUntilDue !== null && status.daysUntilDue <= 30) return 'border-amber-300 bg-amber-50 text-amber-800';
		return 'border-primary/20 bg-primary/10 text-primary';
	}

	function vaccinationName(vaccination: PetVaccination): string {
		return `${vaccination.vaccineName} · ${doseLabel(vaccination.doseType, vaccination.doseNumber)}`;
	}

	$effect(() => {
		if (!doseNumberRequired && doseNumberText) doseNumberText = '';
	});

	onMount(() => {
		void reloadCatalogs();
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-base font-semibold">{t('vaccine.sectionTitle')}</h3>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('vaccine.sectionDescription')}</p>
		</div>
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
				<Select id={`vaccine-name-${petId}`} bind:value={vaccineName} options={vaccineNameOptions()} disabled={knownVaccineNames.length === 0} />
			</div>

			<div class="grid gap-3 sm:grid-cols-2">
				<div class="flex flex-col gap-1 text-sm font-medium">
					<label for={`vaccine-dose-type-${petId}`}>{t('vaccine.doseType.label')}</label>
					<Select id={`vaccine-dose-type-${petId}`} bind:value={doseType} options={doseTypeOptions()} disabled={knownDoseTypeNames.length === 0} />
				</div>
				<div class="flex flex-col gap-1 text-sm font-medium">
					<label for={`vaccine-dose-number-${petId}`}>{t('vaccine.doseNumber.label')}</label>
					<div class="flex items-center gap-1">
						<button
							type="button"
							class="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={t('vaccine.doseNumber.decrease')}
							title={t('vaccine.doseNumber.decrease')}
							disabled={!doseNumberRequired || currentDoseNumber() <= 1}
							onclick={() => changeDoseNumber(-1)}
						>
							<Minus class="size-4" />
						</button>
						<input
							id={`vaccine-dose-number-${petId}`}
							class="h-10 w-12 rounded-md border border-input bg-background px-2 text-center text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							maxlength={String(FIELD_LIMITS.vaccineDoseNumber).length}
							value={doseNumberText}
							disabled={!doseNumberRequired}
							oninput={(event) => (doseNumberText = normalizeDoseNumberInput(event.currentTarget.value))}
						/>
						<button
							type="button"
							class="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
							aria-label={t('vaccine.doseNumber.increase')}
							title={t('vaccine.doseNumber.increase')}
							disabled={!doseNumberRequired || currentDoseNumber() >= FIELD_LIMITS.vaccineDoseNumber}
							onclick={() => changeDoseNumber(1)}
						>
							<Plus class="size-4" />
						</button>
					</div>
				</div>
			</div>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`vaccine-validity-${petId}`}>{t('vaccine.step.validity')}</label>
				<Select id={`vaccine-validity-${petId}`} bind:value={validityOptionId} options={validityOptionOptions()} disabled={visibleValidityOptions.length === 0} />
			</div>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`vaccine-observation-${petId}`}>{t('vaccine.observation')}</label>
				<Textarea id={`vaccine-observation-${petId}`} bind:value={observation} ariaLabel={t('vaccine.observation')} maxLength={FIELD_LIMITS.vaccinationObservation} class="min-h-24" />
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
					<span class="mt-2 inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-5 shadow-sm {dueBadgeClass(vaccination)}">
						<span class="truncate">{dueLabel(vaccination)}</span>
					</span>
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