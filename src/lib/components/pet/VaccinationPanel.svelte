<script lang="ts">
	import DateField from '$lib/components/forms/DateField.svelte';
	import type { PetVaccination, VaccinePreset, VaccinePresetDose, VaccineProtocol } from '$lib/domain/vaccine/vaccine.js';
	import { getVaccinationDisplayName, getVaccineDueStatus } from '$lib/domain/vaccine/vaccine.js';
	import { formatDateForDisplay, normalizeDateInput } from '$lib/domain/shared/date-input.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { removeVaccination, saveNewVaccinations, setVaccinationValidity } from '$lib/services/vaccine.service.js';
	import Bell from '@lucide/svelte/icons/bell';
	import BellOff from '@lucide/svelte/icons/bell-off';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Settings2 from '@lucide/svelte/icons/settings-2';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Select from '$lib/components/ui/Select.svelte';

	type SelectedVaccinationDose = { preset: VaccinePreset; protocol: VaccineProtocol; dose: VaccinePresetDose };

	let { petId, vaccinations = [], presets = [] }: { petId: number; vaccinations?: PetVaccination[]; presets?: VaccinePreset[] } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentVaccinations = $state<PetVaccination[]>([]);
	let currentPresets = $state<VaccinePreset[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let vaccinePresetId = $state('');
	let vaccineProtocolId = $state('');
	let vaccineDoseId = $state('');
	let selectedVaccines = $state<SelectedVaccinationDose[]>([]);
	let vaccinationPendingRemoval = $state<PetVaccination | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedVaccinations = $derived([...currentVaccinations].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));
	const visiblePresets = $derived(currentPresets.filter((preset) => !preset.hiddenAt));
	const selectedPreset = $derived(visiblePresets.find((preset) => String(preset.id) === vaccinePresetId) ?? null);
	const selectedProtocol = $derived(selectedPreset?.protocols.find((protocol) => String(protocol.id) === vaccineProtocolId) ?? null);
	const selectedDose = $derived(selectedProtocol?.doses.find((dose) => String(dose.id) === vaccineDoseId) ?? null);

	$effect(() => {
		if (loadedPetId === petId) return;
		currentVaccinations = [...vaccinations];
		currentPresets = [...presets];
		loadedPetId = petId;
	});

	$effect(() => {
		if (!selectedPreset) {
			if (vaccineProtocolId) vaccineProtocolId = '';
			if (vaccineDoseId) vaccineDoseId = '';
			return;
		}

		if (!selectedPreset.protocols.some((protocol) => String(protocol.id) === vaccineProtocolId)) {
			const defaultProtocol = selectedPreset.protocols.find((protocol) => protocol.id === selectedPreset.defaultProtocolId) ?? selectedPreset.protocols.find((protocol) => protocol.isDefault) ?? selectedPreset.protocols[0];
			vaccineProtocolId = defaultProtocol ? String(defaultProtocol.id) : '';
		}
	});

	$effect(() => {
		if (!selectedProtocol) {
			if (vaccineDoseId) vaccineDoseId = '';
			return;
		}

		if (!selectedProtocol.doses.some((dose) => String(dose.id) === vaccineDoseId)) {
			vaccineDoseId = selectedProtocol.doses[0] ? String(selectedProtocol.doses[0].id) : '';
		}
	});

	function selectedKey(vaccine: SelectedVaccinationDose): string {
		return `preset:${vaccine.preset.id}:protocol:${vaccine.protocol.id}:dose:${vaccine.dose.id}`;
	}

	function resolveSelectedVaccine(): SelectedVaccinationDose | null {
		if (!selectedPreset || !selectedProtocol || !selectedDose) return null;
		return { preset: selectedPreset, protocol: selectedProtocol, dose: selectedDose };
	}

	function canAddVaccineName(): boolean {
		const vaccine = resolveSelectedVaccine();
		return !!vaccine && !hasSelectedVaccine(vaccine);
	}

	function hasSelectedVaccine(vaccine: SelectedVaccinationDose): boolean {
		const key = selectedKey(vaccine);
		return selectedVaccines.some((selected) => selectedKey(selected) === key);
	}

	function addVaccineName() {
		const vaccine = resolveSelectedVaccine();
		if (!vaccine || hasSelectedVaccine(vaccine)) return;
		selectedVaccines = [...selectedVaccines, vaccine];
		vaccinePresetId = '';
		vaccineProtocolId = '';
		vaccineDoseId = '';
	}

	function removeSelectedVaccine(index: number) {
		selectedVaccines = selectedVaccines.filter((_, itemIndex) => itemIndex !== index);
	}

	function collectVaccines(): SelectedVaccinationDose[] {
		const vaccines = [...selectedVaccines];
		const typed = resolveSelectedVaccine();
		if (typed) vaccines.push(typed);

		const unique = new Map<string, SelectedVaccinationDose>();
		for (const vaccine of vaccines) {
			unique.set(selectedKey(vaccine), vaccine);
		}

		return [...unique.values()];
	}

	async function submitVaccinations(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			if (vaccinePresetId && !selectedPreset) {
				errorKey = 'vaccine.presetRequired';
				return;
			}

			if (vaccinePresetId && !selectedDose) {
				errorKey = selectedProtocol ? 'vaccine.doseRequired' : 'vaccine.protocolRequired';
				return;
			}

			const vaccines = collectVaccines();
			if (vaccines.length === 0) {
				errorKey = vaccinePresetId ? 'vaccine.doseRequired' : 'vaccine.selectAtLeastOne';
				return;
			}

			const normalizedAppliedAt = normalizeDateInput(appliedAt);
			const updated = await saveNewVaccinations(
				petId,
				vaccines.map((vaccine) => ({ appliedAt: normalizedAppliedAt, vaccinePresetId: vaccine.preset.id, vaccineProtocolId: vaccine.protocol.id, vaccinePresetDoseId: vaccine.dose.id }))
			);

			currentVaccinations = updated;
			selectedVaccines = [];
			vaccinePresetId = '';
			vaccineProtocolId = '';
			vaccineDoseId = '';
			statusKey = 'vaccine.saved';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'vaccine_preset_required') errorKey = 'vaccine.presetRequired';
			else if (exception instanceof Error && exception.message === 'vaccine_protocol_required') errorKey = 'vaccine.protocolRequired';
			else if (exception instanceof Error && exception.message === 'vaccine_preset_hidden') errorKey = 'vaccine.presetHidden';
			else if (exception instanceof Error && exception.message === 'vaccine_dose_required') errorKey = 'vaccine.doseRequired';
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
			currentVaccinations = currentVaccinations.map((item) => (item.id === updated.id ? updated : item));
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
			currentVaccinations = currentVaccinations.filter((item) => item.id !== vaccination.id);
			vaccinationPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	function validityLabel(dose: VaccinePresetDose): string {
		const unitKey = dose.validityUnit === 'days' ? (dose.validityValue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural') : dose.validityValue === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural';
		return `${dose.validityValue} ${t(unitKey)}`;
	}

	function selectedLabel(vaccine: SelectedVaccinationDose): string {
		return `${vaccine.preset.name} · ${vaccine.protocol.name} · ${vaccine.dose.label}`;
	}

	function dueLabel(vaccination: PetVaccination): string {
		const status = getVaccineDueStatus(vaccination, currentPresets);
		if (status.validityIgnored) return t('vaccine.validityIgnored');
		if (!status.dueAt || status.daysUntilDue === null) return t('vaccine.validityUnknown');

		const formattedDueAt = formatDateForDisplay(status.dueAt, i18n.locale);
		if (status.expired) return `${t('vaccine.expiredOn')} ${formattedDueAt}`;
		if (status.daysUntilDue === 0) return `${t('vaccine.expiresToday')} ${formattedDueAt}`;
		return `${t('vaccine.validUntil')} ${formattedDueAt} · ${t('vaccine.expiresIn')} ${status.daysUntilDue} ${t(status.daysUntilDue === 1 ? 'pet.ageDaySingular' : 'pet.ageDayPlural')}`;
	}

	function dueClass(vaccination: PetVaccination): string {
		const status = getVaccineDueStatus(vaccination, currentPresets);
		if (status.validityIgnored) return 'text-muted-foreground';
		if (status.expired) return 'text-destructive';
		if (status.daysUntilDue !== null && status.daysUntilDue <= 30) return 'text-amber-700';
		return 'text-muted-foreground';
	}

	function vaccinationName(vaccination: PetVaccination): string {
		return getVaccinationDisplayName(vaccination, currentPresets);
	}
</script>

<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<div class="min-w-0">
			<h3 class="text-base font-semibold">{t('vaccine.sectionTitle')}</h3>
			<p class="mt-1 text-sm leading-6 text-muted-foreground">{t('vaccine.sectionDescription')}</p>
		</div>
		<a href="/settings/vaccines" class="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent" aria-label={t('vaccine.managePresets')}>
			<Settings2 class="size-4" />
			{t('vaccine.managePresets')}
		</a>
	</div>

	{#if errorKey}
		<p class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="mt-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<form class="mt-4 flex flex-col gap-3" onsubmit={submitVaccinations}>
		<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.appliedAt')}</span>
				<DateField bind:value={appliedAt} ariaLabel={t('vaccine.appliedAt')} />
			</label>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium md:col-span-2">
				<label for={`vaccine-preset-${petId}`}>{t('vaccine.name')}</label>
				<Select
					id={`vaccine-preset-${petId}`}
					bind:value={vaccinePresetId}
					options={[
						{ value: '', label: t('vaccine.namePlaceholder') },
						...visiblePresets.map((preset) => ({ value: String(preset.id), label: preset.name }))
					]}
				/>
			</div>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`vaccine-protocol-${petId}`}>{t('vaccine.protocol')}</label>
				<Select
					id={`vaccine-protocol-${petId}`}
					bind:value={vaccineProtocolId}
					disabled={!selectedPreset}
					options={[
						{ value: '', label: t('vaccine.protocolPlaceholder') },
						...(selectedPreset?.protocols ?? []).map((protocol) => ({ value: String(protocol.id), label: protocol.name }))
					]}
				/>
			</div>

			<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<label for={`vaccine-dose-${petId}`}>{t('vaccine.dose')}</label>
				<Select
					id={`vaccine-dose-${petId}`}
					bind:value={vaccineDoseId}
					disabled={!selectedProtocol}
					options={[
						{ value: '', label: t('vaccine.dosePlaceholder') },
						...(selectedProtocol?.doses ?? []).map((dose) => ({ value: String(dose.id), label: `${dose.label} (${validityLabel(dose)})` }))
					]}
				/>
			</div>

			<button type="button" class="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" aria-label={t('vaccine.addToDay')} title={t('vaccine.addToDay')} disabled={saving || !canAddVaccineName()} onclick={addVaccineName}>
				<Plus class="size-4" />
			</button>
		</div>

		{#if selectedVaccines.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t('vaccine.selectedForDay')}>
				{#each selectedVaccines as selected, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{selectedLabel(selected)}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t('vaccine.removeSelected')}: ${selectedLabel(selected)}`} onclick={() => removeSelectedVaccine(index)}>
							<X class="size-3" />
						</button>
					</span>
				{/each}
			</div>
		{/if}

		<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
			<Save class="size-4" />
			{t('vaccine.saveApplications')}
		</button>
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
					<span class="mt-1 block text-xs font-medium {dueClass(vaccination)}">{dueLabel(vaccination)}</span>
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