<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import DateField from '$lib/components/forms/DateField.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import type { Dewormer, DewormingValidityUnit, PetDeworming, PetDewormingInput } from '$lib/domain/deworming/deworming.js';
	import { getDewormingDueStatus } from '$lib/domain/deworming/deworming.js';
	import type { PreventiveProtocol } from '$lib/domain/preventive/protocol.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { FIELD_LIMITS, textLength } from '$lib/domain/shared/field-limits.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadDewormers, removeDeworming, saveNewDewormings, setDewormingValidity } from '$lib/services/deworming.service.js';
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
		dewormings = [],
		dewormers = [],
		onChange
	}: { petId: number; dewormings?: PetDeworming[]; dewormers?: Dewormer[]; onChange?: (dewormings: PetDeworming[]) => void } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentDewormings = $state<PetDeworming[]>([]);
	let currentDewormers = $state<Dewormer[]>([]);
	let currentProtocols = $state<PreventiveProtocol[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let dewormerName = $state('');
	let protocolId = $state(0);
	let protocolDoseId = $state(0);
	let dose = $state('');
	let validityValue = $state(6);
	let validityUnit = $state<DewormingValidityUnit>('months');
	let observation = $state('');
	let pendingApplications = $state<PetDewormingInput[]>([]);
	let dewormingPendingRemoval = $state<PetDeworming | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedDewormings = $derived([...currentDewormings].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visibleDewormers = $derived(currentDewormers.filter((dewormer) => !dewormer.hiddenAt));
	const knownDewormerNames = $derived([...new Set(visibleDewormers.map((dewormer) => dewormer.name))].sort((first, second) => first.localeCompare(second)));
	const selectedDewormer = $derived(visibleDewormers.find((dewormer) => dewormer.name === dewormerName) ?? null);
	const visibleProtocols = $derived(selectedDewormer ? currentProtocols.filter((protocol) => !protocol.hiddenAt && protocol.items.some((item) => item.id === selectedDewormer.id)) : []);
	const selectedProtocol = $derived(visibleProtocols.find((protocol) => protocol.id === protocolId) ?? null);
	const visibleProtocolDoses = $derived(selectedProtocol ? selectedProtocol.doses : []);
	const selectedProtocolDose = $derived(visibleProtocolDoses.find((protocolDose) => protocolDose.id === protocolDoseId) ?? null);
	const protocolFieldsLocked = $derived(Boolean(selectedProtocolDose));

	$effect(() => {
		if (loadedPetId === petId) return;
		currentDewormings = [...dewormings];
		currentDewormers = [...dewormers];
		loadedPetId = petId;
	});

	function dewormerNameOptions() {
		return [{ value: '', label: t('deworming.namePlaceholder') }, ...knownDewormerNames.map((name) => ({ value: name, label: name }))];
	}

	function protocolOptions() {
		return [{ value: 0, label: t('protocol.none') }, ...visibleProtocols.map((protocol) => ({ value: protocol.id, label: protocol.name }))];
	}

	function protocolDoseOptions() {
		return [{ value: 0, label: t('protocol.dosePlaceholder') }, ...visibleProtocolDoses.map((protocolDose) => ({ value: protocolDose.id, label: protocolDoseLabel(protocolDose) }))];
	}

	function validityLabel(value: number, unit: DewormingValidityUnit): string {
		const unitKey = unit === 'days' ? (value === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : unit === 'months' ? (value === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural') : value === 1 ? 'pet.ageYearSingular' : 'pet.ageYearPlural';
		return `${value} ${t(unitKey)}`;
	}

	function protocolDoseLabel(protocolDose: { dose: string; validityValue: number; validityUnit: DewormingValidityUnit }): string {
		return `${protocolDose.dose} · ${validityLabel(protocolDose.validityValue, protocolDose.validityUnit)}`;
	}

	function pendingLabel(input: PetDewormingInput): string {
		const baseLabel = `${input.dewormerName} · ${input.dose} · ${validityLabel(input.validityValue, input.validityUnit)}`;
		const observationSummary = input.observation?.replace(/\s+/g, ' ').trim();
		return observationSummary ? `${baseLabel} · ${observationSummary}` : baseLabel;
	}

	function clearProtocolSelection() {
		protocolId = 0;
		protocolDoseId = 0;
	}

	function handleDewormerChange(value: string) {
		dewormerName = value;
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

	function validateCurrentInput(): PetDewormingInput | null {
		const normalizedAppliedAt = normalizeDateInput(appliedAt);
		if (!normalizedAppliedAt) {
			errorKey = 'date.invalid';
			return null;
		}

		const trimmedName = dewormerName.trim();
		if (!trimmedName || !knownDewormerNames.includes(trimmedName)) {
			errorKey = 'deworming.nameRequired';
			return null;
		}
		if (textLength(trimmedName) > FIELD_LIMITS.dewormerName) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		const trimmedDose = dose.trim();
		if (!trimmedDose) {
			errorKey = 'deworming.doseRequired';
			return null;
		}
		if (textLength(trimmedDose) > FIELD_LIMITS.dewormingDose) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		if (validityValue <= 0) {
			errorKey = 'deworming.validityRequired';
			return null;
		}

		const normalizedObservation = observation.trim() ? observation : null;
		if (textLength(normalizedObservation) > FIELD_LIMITS.dewormingObservation) {
			errorKey = 'form.limitExceeded';
			return null;
		}

		return {
			appliedAt: normalizedAppliedAt,
			dewormerName: trimmedName,
			dose: trimmedDose,
			validityValue,
			validityUnit,
			observation: normalizedObservation
		};
	}

	function resetDewormingFields() {
		dewormerName = '';
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
		resetDewormingFields();
	}

	function removePendingApplication(index: number) {
		pendingApplications = pendingApplications.filter((_, itemIndex) => itemIndex !== index);
	}

	function setCurrentDewormings(dewormings: PetDeworming[]) {
		currentDewormings = dewormings;
		onChange?.(dewormings);
	}

	async function reloadDewormers() {
		const [loadedDewormers, loadedProtocols] = await Promise.all([loadDewormers(), loadPreventiveProtocols('dewormer')]);
		currentDewormers = loadedDewormers;
		currentProtocols = loadedProtocols;
		if (protocolId && !visibleProtocols.some((protocol) => protocol.id === protocolId)) clearProtocolSelection();
	}

	async function submitDewormings(event: SubmitEvent) {
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

			const updated = await saveNewDewormings(petId, applications);
			setCurrentDewormings(updated);
			pendingApplications = [];
			resetDewormingFields();
			await reloadDewormers();
			statusKey = 'deworming.saved';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
			else if (exception instanceof Error && exception.message === 'deworming_name_required') errorKey = 'deworming.nameRequired';
			else if (exception instanceof Error && exception.message === 'deworming_dose_required') errorKey = 'deworming.doseRequired';
			else if (exception instanceof Error && exception.message === 'deworming_validity_required') errorKey = 'deworming.validityRequired';
			else errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function toggleDewormingValidity(deworming: PetDeworming, ignored: boolean) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const updated = await setDewormingValidity(deworming.id, ignored);
			setCurrentDewormings(currentDewormings.map((item) => (item.id === updated.id ? updated : item)));
			statusKey = ignored ? 'deworming.validityIgnoredSaved' : 'deworming.validityRestoredSaved';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	function requestDeleteDeworming(deworming: PetDeworming) {
		dewormingPendingRemoval = deworming;
	}

	async function confirmDeleteDeworming() {
		const deworming = dewormingPendingRemoval;
		if (!deworming) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeDeworming(deworming.id);
			setCurrentDewormings(currentDewormings.filter((item) => item.id !== deworming.id));
			dewormingPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'deworming.saveFailed';
		} finally {
			saving = false;
		}
	}

	function dueLabel(deworming: PetDeworming): string {
		const status = getDewormingDueStatus(deworming);
		if (status.validityIgnored) return t('deworming.validityIgnored');
		if (!status.dueAt || status.daysUntilDue === null) return t('deworming.validityUnknown');

		const formattedDueAt = formatDateForDisplay(status.dueAt, i18n.locale);
		if (status.expired) return `${t('deworming.expiredOn')} ${formattedDueAt}`;
		if (status.daysUntilDue === 0) return `${t('deworming.expiresToday')} ${formattedDueAt}`;
		return `${t('deworming.validUntil')} ${formattedDueAt} · ${t('deworming.expiresIn')} ${status.daysUntilDue} ${t(status.daysUntilDue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural')}`;
	}

	function dueBadgeClass(deworming: PetDeworming): string {
		const status = getDewormingDueStatus(deworming);
		if (status.validityIgnored) return 'border-border bg-muted text-muted-foreground';
		if (status.expired) return 'border-destructive/30 bg-destructive/10 text-destructive';
		if (status.daysUntilDue !== null && status.daysUntilDue <= 30) return 'border-amber-300 bg-amber-50 text-amber-800';
		return 'border-primary/20 bg-primary/10 text-primary';
	}

	function dewormingName(deworming: PetDeworming): string {
		return `${deworming.dewormerName} · ${deworming.dose}`;
	}

	onMount(() => {
		void reloadDewormers();
	});
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-base font-semibold">{t('deworming.sectionTitle')}</h3>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('deworming.sectionDescription')}</p>
		</div>
		<a href="/settings/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('deworming.manageDewormers')}>
			<Settings2 class="size-4" />
			{t('deworming.manageDewormers')}
		</a>
	</div>

	{#if errorKey}
		<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<form class="mt-4 flex flex-col gap-4" onsubmit={submitDewormings}>
		<div class="grid gap-3 md:grid-cols-2">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('deworming.step.appliedAt')}</span>
				<DateField bind:value={appliedAt} ariaLabel={t('deworming.step.appliedAt')} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`deworming-name-${petId}`}>{t('deworming.step.dewormer')}</label>
				<Select id={`deworming-name-${petId}`} bind:value={dewormerName} options={dewormerNameOptions()} disabled={knownDewormerNames.length === 0} onchange={handleDewormerChange} />
			</div>

			<div class="grid gap-3 md:col-span-2 sm:grid-cols-2">
				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`deworming-protocol-${petId}`}>{t('protocol.label')}</label>
					<Select id={`deworming-protocol-${petId}`} bind:value={protocolId} options={protocolOptions()} disabled={!selectedDewormer || visibleProtocols.length === 0} onchange={handleProtocolChange} />
				</div>

				<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
					<label for={`deworming-protocol-dose-${petId}`}>{t('protocol.dose')}</label>
					<Select id={`deworming-protocol-dose-${petId}`} bind:value={protocolDoseId} options={protocolDoseOptions()} disabled={!selectedProtocol || visibleProtocolDoses.length === 0} onchange={handleProtocolDoseChange} />
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
					<span>{t('deworming.step.dose')}</span>
					<CharacterLimitHint value={dose} max={FIELD_LIMITS.dewormingDose} />
				</span>
				<input id={`deworming-dose-${petId}`} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 read-only:opacity-70" bind:value={dose} maxlength={FIELD_LIMITS.dewormingDose} placeholder={t('deworming.dosePlaceholder')} readonly={protocolFieldsLocked} />
			</label>

			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('deworming.step.validity')}</span>
				<PeriodField bind:value={validityValue} bind:unit={validityUnit} ariaLabel={t('deworming.step.validity')} disabled={protocolFieldsLocked} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`deworming-observation-${petId}`}>{t('deworming.observation')}</label>
				<Textarea id={`deworming-observation-${petId}`} bind:value={observation} ariaLabel={t('deworming.observation')} maxLength={FIELD_LIMITS.dewormingObservation} readonly={protocolFieldsLocked} class="min-h-24" />
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button type="button" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addPendingApplication}>
				<Plus class="size-4" />
				{t('deworming.addToDay')}
			</button>
			<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
				<Save class="size-4" />
				{t('deworming.saveApplications')}
			</button>
		</div>

		{#if pendingApplications.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t('deworming.selectedForDay')}>
				{#each pendingApplications as application, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{pendingLabel(application)}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t('deworming.removeSelected')}: ${pendingLabel(application)}`} onclick={() => removePendingApplication(index)}>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}
	</form>

	<div class="mt-5 flex flex-col gap-2">
		{#each sortedDewormings as deworming}
			<div class="flex items-start gap-3 rounded-md border border-border bg-background p-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					<Pill class="size-5" />
				</span>
				<span class="min-w-0 flex-1">
					<span class="block truncate text-sm font-medium">{dewormingName(deworming)}</span>
					<span class="mt-0.5 block text-xs text-muted-foreground">{formatDateForDisplay(deworming.appliedAt, i18n.locale) || t('common.notInformed')}</span>
					<span class="mt-1 block text-xs text-muted-foreground">{validityLabel(deworming.validityValue, deworming.validityUnit)}</span>
					{#if deworming.observation}
						<span class="mt-1 block whitespace-pre-wrap wrap-break-word text-xs text-muted-foreground"><span class="font-medium text-foreground">{t('deworming.observation')}:</span> {deworming.observation}</span>
					{/if}
					<span class="mt-2 inline-flex max-w-full items-center rounded-md border px-2 py-1 text-xs font-semibold leading-5 shadow-sm {dueBadgeClass(deworming)}">
						<span class="truncate">{dueLabel(deworming)}</span>
					</span>
				</span>
				<span class="flex shrink-0 gap-1">
					{#if deworming.validityIgnoredAt}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('deworming.restoreValidity')}: ${dewormingName(deworming)}`} title={t('deworming.restoreValidity')} disabled={saving} onclick={() => void toggleDewormingValidity(deworming, false)}>
							<Bell class="size-4" />
						</button>
					{:else}
						<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50" aria-label={`${t('deworming.ignoreValidity')}: ${dewormingName(deworming)}`} title={t('deworming.ignoreValidity')} disabled={saving} onclick={() => void toggleDewormingValidity(deworming, true)}>
							<BellOff class="size-4" />
						</button>
					{/if}
					<button type="button" class="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50" aria-label={`${t('actions.delete')}: ${dewormingName(deworming)}`} title={t('actions.delete')} disabled={saving} onclick={() => requestDeleteDeworming(deworming)}>
						<Trash2 class="size-4" />
					</button>
				</span>
			</div>
		{:else}
			<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('deworming.empty')}</p>
		{/each}
	</div>
</section>

<TrashRemovalDialog open={dewormingPendingRemoval !== null} messageKey="deworming.deleteConfirm" confirming={saving} onConfirm={() => void confirmDeleteDeworming()} onCancel={() => (dewormingPendingRemoval = null)} />