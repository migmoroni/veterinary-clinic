<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import SearchableSelect from '$lib/components/ui/SearchableSelect.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { Antiparasitic, AntiparasiticValidityUnit, PetAntiparasiticTreatment, PetAntiparasiticTreatmentInput } from '$lib/domain/antiparasitic/antiparasitic.js';
	import { getAntiparasiticTreatmentDueStatus } from '$lib/domain/antiparasitic/antiparasitic.js';
	import type { PetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { preventiveItemMatchesSpecies } from '$lib/domain/preventive/catalog.js';
	import type { PreventiveProtocol } from '$lib/domain/preventive/protocol.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadAntiparasitics, removeAntiparasiticTreatment, saveNewAntiparasiticTreatments, setAntiparasiticTreatmentValidity } from '$lib/services/antiparasitic.service.js';
	import { loadPreventiveProtocols } from '$lib/services/preventive-protocol.service.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	let {
		petId,
		petSpecies = null,
		antiparasiticTreatments = [],
		antiparasitics = [],
		onChange
	}: { petId: number; petSpecies?: PetSpecies | null; antiparasiticTreatments?: PetAntiparasiticTreatment[]; antiparasitics?: Antiparasitic[]; onChange?: (antiparasiticTreatments: PetAntiparasiticTreatment[]) => void } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentAntiparasiticTreatments = $state<PetAntiparasiticTreatment[]>([]);
	let currentAntiparasitics = $state<Antiparasitic[]>([]);
	let currentProtocols = $state<PreventiveProtocol[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let antiparasiticName = $state('');
	let protocolId = $state(0);
	let protocolDoseId = $state(0);
	let dose = $state('');
	let validityValue = $state(6);
	let validityUnit = $state<AntiparasiticValidityUnit>('months');
	let observation = $state('');
	let pendingApplications = $state<PetAntiparasiticTreatmentInput[]>([]);
	let antiparasiticTreatmentPendingRemoval = $state<PetAntiparasiticTreatment | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedAntiparasiticTreatments = $derived([...currentAntiparasiticTreatments].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visibleAntiparasitics = $derived(currentAntiparasitics.filter((antiparasitic) => !antiparasitic.hiddenAt && preventiveItemMatchesSpecies(antiparasitic.species, petSpecies)));
	const knownAntiparasiticNames = $derived([...new Set(visibleAntiparasitics.map((antiparasitic) => antiparasitic.name))].sort((first, second) => first.localeCompare(second)));
	const selectedAntiparasitic = $derived(visibleAntiparasitics.find((antiparasitic) => antiparasitic.name === antiparasiticName) ?? null);
	const visibleProtocols = $derived(selectedAntiparasitic ? currentProtocols.filter((protocol) => !protocol.hiddenAt && preventiveItemMatchesSpecies(protocol.species, petSpecies) && protocol.items.some((item) => item.id === selectedAntiparasitic.id)) : []);
	const selectedProtocol = $derived(visibleProtocols.find((protocol) => protocol.id === protocolId) ?? null);
	const visibleProtocolDoses = $derived(selectedProtocol ? selectedProtocol.doses : []);
	const selectedProtocolDose = $derived(visibleProtocolDoses.find((protocolDose) => protocolDose.id === protocolDoseId) ?? null);
	const protocolFieldsLocked = $derived(Boolean(selectedProtocolDose));

	$effect(() => {
		if (loadedPetId === petId) return;
		currentAntiparasiticTreatments = [...antiparasiticTreatments];
		currentAntiparasitics = [...antiparasitics];
		loadedPetId = petId;
	});

	function antiparasiticNameOptions() {
		return visibleAntiparasitics.map((antiparasitic) => ({
			value: antiparasitic.name,
			label: antiparasitic.name,
			description: [antiparasitic.manufacturer, ...antiparasitic.aliases].filter(Boolean).join(' · '),
			searchText: [antiparasitic.manufacturer, ...antiparasitic.aliases, ...antiparasitic.regions].filter(Boolean).join(' ')
		}));
	}

	function protocolOptions() {
		return [{ value: 0, label: t('protocol.none') }, ...visibleProtocols.map((protocol) => ({ value: protocol.id, label: protocol.name }))];
	}

	function protocolDoseOptions() {
		return [{ value: 0, label: t('protocol.dosePlaceholder') }, ...visibleProtocolDoses.map((protocolDose) => ({ value: protocolDose.id, label: protocolDoseLabel(protocolDose) }))];
	}

	function validityLabel(value: number, unit: AntiparasiticValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : unit === 'months' ? (value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural') : value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		return `${value} ${t(unitKey)}`;
	}

	function protocolDoseLabel(protocolDose: { dose: string; validityValue: number; validityUnit: AntiparasiticValidityUnit }): string {
		return `${protocolDose.dose} · ${validityLabel(protocolDose.validityValue, protocolDose.validityUnit)}`;
	}

	function pendingLabel(input: PetAntiparasiticTreatmentInput): string {
		const baseLabel = `${input.antiparasiticName} · ${input.dose} · ${validityLabel(input.validityValue, input.validityUnit)}`;
		const observationSummary = input.observation?.replace(/\s+/g, ' ').trim();
		return observationSummary ? `${baseLabel} · ${observationSummary}` : baseLabel;
	}

	function clearProtocolSelection() {
		protocolId = 0;
		protocolDoseId = 0;
	}

	function handleAntiparasiticChange(value: string) {
		antiparasiticName = value;
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

	function validateCurrentInput(): PetAntiparasiticTreatmentInput | null {
		const normalizedAppliedAt = normalizeDateInput(appliedAt);
		if (!normalizedAppliedAt) {
			errorKey = 'date.invalid';
			return null;
		}

		const trimmedName = antiparasiticName.trim();
		if (!trimmedName || !knownAntiparasiticNames.includes(trimmedName)) {
			errorKey = 'antiparasiticTreatment.nameRequired';
			return null;
		}
		if (textLength(trimmedName) > FIELD_LIMITS.antiparasiticName) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		const trimmedDose = dose.trim();
		if (!trimmedDose) {
			errorKey = 'antiparasiticTreatment.doseRequired';
			return null;
		}
		if (textLength(trimmedDose) > FIELD_LIMITS.antiparasiticTreatmentDose) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		if (validityValue <= 0) {
			errorKey = 'antiparasiticTreatment.validityRequired';
			return null;
		}

		const normalizedObservation = observation.trim() ? observation : null;
		if (textLength(normalizedObservation) > FIELD_LIMITS.antiparasiticTreatmentObservation) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		return {
			appliedAt: normalizedAppliedAt,
			antiparasiticName: trimmedName,
			dose: trimmedDose,
			validityValue,
			validityUnit,
			observation: normalizedObservation
		};
	}

	function resetAntiparasiticTreatmentFields() {
		antiparasiticName = '';
		clearProtocolSelection();
		dose = '';
		validityValue = 6;
		validityUnit = 'months';
		observation = '';
	}

	function addPendingApplication() {
		statusKey = null;
		errorKey = null;
		const input = validateCurrentInput();
		if (!input) return;

		pendingApplications = [...pendingApplications, input];
		resetAntiparasiticTreatmentFields();
	}

	function removePendingApplication(index: number) {
		pendingApplications = pendingApplications.filter((_, itemIndex) => itemIndex !== index);
	}

	function setCurrentAntiparasiticTreatments(antiparasiticTreatments: PetAntiparasiticTreatment[]) {
		currentAntiparasiticTreatments = antiparasiticTreatments;
		onChange?.(antiparasiticTreatments);
	}

	async function reloadAntiparasitics() {
		const [loadedAntiparasitics, loadedProtocols] = await Promise.all([loadAntiparasitics(), loadPreventiveProtocols('antiparasitic')]);
		currentAntiparasitics = loadedAntiparasitics;
		currentProtocols = loadedProtocols;
		if (protocolId && !visibleProtocols.some((protocol) => protocol.id === protocolId)) clearProtocolSelection();
	}

	async function submitAntiparasiticTreatments(event: SubmitEvent) {
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

			const updated = await saveNewAntiparasiticTreatments(petId, applications);
			setCurrentAntiparasiticTreatments(updated);
			pendingApplications = [];
			resetAntiparasiticTreatmentFields();
			await reloadAntiparasitics();
			statusKey = 'antiparasiticTreatment.saved';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
			else if (exception instanceof Error && exception.message === 'antiparasitic_name_required') errorKey = 'antiparasiticTreatment.nameRequired';
			else if (exception instanceof Error && exception.message === 'antiparasitic_treatment_dose_required') errorKey = 'antiparasiticTreatment.doseRequired';
			else if (exception instanceof Error && exception.message === 'antiparasitic_treatment_validity_required') errorKey = 'antiparasiticTreatment.validityRequired';
			else errorKey = 'antiparasiticTreatment.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleAntiparasiticTreatmentValidity(antiparasiticTreatment: PetAntiparasiticTreatment, ignored: boolean) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const updated = await setAntiparasiticTreatmentValidity(antiparasiticTreatment.id, ignored);
			setCurrentAntiparasiticTreatments(currentAntiparasiticTreatments.map((item) => (item.id === updated.id ? updated : item)));
			statusKey = ignored ? 'antiparasiticTreatment.validityIgnoredSaved' : 'antiparasiticTreatment.validityRestoredSaved';
		} catch {
			errorKey = 'antiparasiticTreatment.saveFailed';
		} finally {
			saving = false;
		}
	}

	function requestDeleteAntiparasiticTreatment(antiparasiticTreatment: PetAntiparasiticTreatment) {
		antiparasiticTreatmentPendingRemoval = antiparasiticTreatment;
	}

	async function confirmDeleteAntiparasiticTreatment() {
		const antiparasiticTreatment = antiparasiticTreatmentPendingRemoval;
		if (!antiparasiticTreatment) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeAntiparasiticTreatment(antiparasiticTreatment.id);
			setCurrentAntiparasiticTreatments(currentAntiparasiticTreatments.filter((item) => item.id !== antiparasiticTreatment.id));
			antiparasiticTreatmentPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'antiparasiticTreatment.saveFailed';
		} finally {
			saving = false;
		}
	}

	function dueLabel(antiparasiticTreatment: PetAntiparasiticTreatment): string {
		const status = getAntiparasiticTreatmentDueStatus(antiparasiticTreatment);
		if (status.validityIgnored) return t('antiparasiticTreatment.validityIgnored');
		if (!status.dueAt || status.daysUntilDue === null) return t('antiparasiticTreatment.validityUnknown');

		const formattedDueAt = formatDateForDisplay(status.dueAt, i18n.locale);
		if (status.expired) return `${t('antiparasiticTreatment.expiredOn')} ${formattedDueAt}`;
		if (status.daysUntilDue === 0) return `${t('antiparasiticTreatment.expiresToday')} ${formattedDueAt}`;
		return `${t('antiparasiticTreatment.validUntil')} ${formattedDueAt} · ${t('antiparasiticTreatment.expiresIn')} ${status.daysUntilDue} ${t(status.daysUntilDue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural')}`;
	}

	function dueBadgeClass(antiparasiticTreatment: PetAntiparasiticTreatment): string {
		const status = getAntiparasiticTreatmentDueStatus(antiparasiticTreatment);
		if (status.validityIgnored) return 'border-border bg-muted text-muted-foreground';
		if (status.expired) return 'border-destructive/30 bg-destructive/10 text-destructive';
		if (status.daysUntilDue !== null && status.daysUntilDue <= 30) return 'border-amber-300 bg-amber-50 text-amber-800';
		return 'border-primary/20 bg-primary/10 text-primary';
	}

	function antiparasiticTreatmentName(antiparasiticTreatment: PetAntiparasiticTreatment): string {
		return `${antiparasiticTreatment.antiparasiticName} · ${antiparasiticTreatment.dose}`;
	}

	onMount(() => {
		void reloadAntiparasitics();
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-base font-semibold">{t('antiparasiticTreatment.sectionTitle')}</h3>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('antiparasiticTreatment.sectionDescription')}</p>
		</div>
		<a href="/settings/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('antiparasiticTreatment.manageAntiparasitics')}>
			<Settings2 class="size-4" />
			{t('antiparasiticTreatment.manageAntiparasitics')}
		</a>
	</div>

	{#if errorKey}
		<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<form class="mt-4 flex flex-col gap-4" onsubmit={submitAntiparasiticTreatments}>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('antiparasiticTreatment.step.appliedAt')}</span>
				<DateField bind:value={appliedAt} ariaLabel={t('antiparasiticTreatment.step.appliedAt')} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`antiparasiticTreatment-name-${petId}`}>{t('antiparasiticTreatment.step.antiparasitic')}</label>
				<SearchableSelect id={`antiparasiticTreatment-name-${petId}`} bind:value={antiparasiticName} emptyValue="" options={antiparasiticNameOptions()} placeholder={t('antiparasiticTreatment.namePlaceholder')} emptyLabel={t('form.noOptions')} disabled={knownAntiparasiticNames.length === 0} onchange={handleAntiparasiticChange} />
			</div>

			<div class="grid gap-3 md:col-span-2 sm:grid-cols-2">
				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`antiparasiticTreatment-protocol-${petId}`}>{t('protocol.label')}</label>
					<Select id={`antiparasiticTreatment-protocol-${petId}`} bind:value={protocolId} options={protocolOptions()} disabled={!selectedAntiparasitic || visibleProtocols.length === 0} onchange={handleProtocolChange} />
				</div>

				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`antiparasiticTreatment-protocol-dose-${petId}`}>{t('protocol.dose')}</label>
					<Select id={`antiparasiticTreatment-protocol-dose-${petId}`} bind:value={protocolDoseId} options={protocolDoseOptions()} disabled={!selectedProtocol || visibleProtocolDoses.length === 0} onchange={handleProtocolDoseChange} />
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
					<span>{t('antiparasiticTreatment.step.dose')}</span>
					<CharacterLimitHint value={dose} max={FIELD_LIMITS.antiparasiticTreatmentDose} />
				</span>
				<input id={`antiparasiticTreatment-dose-${petId}`} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:opacity-70" bind:value={dose} maxlength={FIELD_LIMITS.antiparasiticTreatmentDose} placeholder={t('antiparasiticTreatment.dosePlaceholder')} readonly={protocolFieldsLocked} />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('antiparasiticTreatment.step.validity')}</span>
				<PeriodField bind:value={validityValue} bind:unit={validityUnit} ariaLabel={t('antiparasiticTreatment.step.validity')} disabled={protocolFieldsLocked} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`antiparasiticTreatment-observation-${petId}`}>{t('antiparasiticTreatment.observation')}</label>
				<Textarea id={`antiparasiticTreatment-observation-${petId}`} bind:value={observation} ariaLabel={t('antiparasiticTreatment.observation')} maxLength={FIELD_LIMITS.antiparasiticTreatmentObservation} readonly={protocolFieldsLocked} class="min-h-24" />
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addPendingApplication}>
				<Plus class="size-4" />
				{t('antiparasiticTreatment.addToDay')}
			</button>
			<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('antiparasiticTreatment.saveApplications')}
			</button>
		</div>

		{#if pendingApplications.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t('antiparasiticTreatment.selectedForDay')}>
				{#each pendingApplications as application, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{pendingLabel(application)}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t('antiparasiticTreatment.removeSelected')}: ${pendingLabel(application)}`} onclick={() => removePendingApplication(index)}>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}
	</form>

	<div class="mt-5 flex flex-col gap-2">
		{#each sortedAntiparasiticTreatments as antiparasiticTreatment}
			<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Pill class="size-5" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{antiparasiticTreatmentName(antiparasiticTreatment)}</span>
					<span class="mt-0.5 block text-xs text-muted-foreground">{formatDateForDisplay(antiparasiticTreatment.appliedAt, i18n.locale) || t('common.notInformed')}</span>
					<span class="mt-1 block text-xs text-muted-foreground">{validityLabel(antiparasiticTreatment.validityValue, antiparasiticTreatment.validityUnit)}</span>
					{#if antiparasiticTreatment.observation}
						<span class="mt-1 block whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground"><span class="font-medium text-foreground">{t('antiparasiticTreatment.observation')}:</span> {antiparasiticTreatment.observation}</span>
					{/if}
					<span class="mt-2 inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-5 shadow-sm {dueBadgeClass(antiparasiticTreatment)}">
						<span class="truncate">{dueLabel(antiparasiticTreatment)}</span>
					</span>
				</span>
				<span class="flex shrink-0 gap-1">
					{#if antiparasiticTreatment.validityIgnoredAt}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('antiparasiticTreatment.restoreValidity')}: ${antiparasiticTreatmentName(antiparasiticTreatment)}`} title={t('antiparasiticTreatment.restoreValidity')} disabled={saving} onclick={() => void toggleAntiparasiticTreatmentValidity(antiparasiticTreatment, false)}>
							<Bell class="size-4" />
						</button>
					{:else}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('antiparasiticTreatment.ignoreValidity')}: ${antiparasiticTreatmentName(antiparasiticTreatment)}`} title={t('antiparasiticTreatment.ignoreValidity')} disabled={saving} onclick={() => void toggleAntiparasiticTreatmentValidity(antiparasiticTreatment, true)}>
							<BellOff class="size-4" />
						</button>
					{/if}
					<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" aria-label={`${t('actions.delete')}: ${antiparasiticTreatmentName(antiparasiticTreatment)}`} title={t('actions.delete')} disabled={saving} onclick={() => requestDeleteAntiparasiticTreatment(antiparasiticTreatment)}>
						<Trash2 class="size-4" />
					</button>
				</span>
			</div>
		{:else}
			<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('antiparasiticTreatment.empty')}</p>
		{/each}
	</div>
</section>

<TrashRemovalDialog open={antiparasiticTreatmentPendingRemoval !== null} messageKey="antiparasiticTreatment.deleteConfirm" confirming={saving} onConfirm={() => void confirmDeleteAntiparasiticTreatment()} onCancel={() => (antiparasiticTreatmentPendingRemoval = null)} />
