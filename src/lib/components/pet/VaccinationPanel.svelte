<script lang="ts">
	import DateField from '$lib/components/forms/DateField.svelte';
	import type { PetVaccination, VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
	import { findVaccinePreset, getVaccinationDisplayName, getVaccineDueStatus } from '$lib/domain/vaccine/vaccine.js';
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

	type SelectedVaccine = VaccinePreset;

	let { petId, vaccinations = [], presets = [] }: { petId: number; vaccinations?: PetVaccination[]; presets?: VaccinePreset[] } = $props();

	const today = new Date();
	const todayInput = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	let currentVaccinations = $state<PetVaccination[]>([]);
	let currentPresets = $state<VaccinePreset[]>([]);
	let loadedPetId = $state<number | null>(null);
	let appliedAt = $state(todayInput);
	let vaccineName = $state('');
	let selectedVaccines = $state<SelectedVaccine[]>([]);
	let vaccinationPendingRemoval = $state<PetVaccination | null>(null);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);

	const sortedVaccinations = $derived([...currentVaccinations].sort((first, second) => second.appliedAt.localeCompare(first.appliedAt) || second.id - first.id));

	$effect(() => {
		if (loadedPetId === petId) return;
		currentVaccinations = [...vaccinations];
		currentPresets = [...presets];
		loadedPetId = petId;
	});

	function selectedKey(vaccine: SelectedVaccine): string {
		return `preset:${vaccine.id}`;
	}

	function findPresetByName(name: string): VaccinePreset | null {
		return findVaccinePreset(name, currentPresets);
	}

	function resolveVaccine(name: string): SelectedVaccine | null {
		const trimmed = name.trim();
		if (!trimmed) return null;
		return findPresetByName(trimmed);
	}

	function canAddVaccineName(): boolean {
		const vaccine = resolveVaccine(vaccineName);
		return !!vaccine && !hasSelectedVaccine(vaccine);
	}

	function hasSelectedVaccine(vaccine: SelectedVaccine): boolean {
		const key = selectedKey(vaccine);
		return selectedVaccines.some((selected) => selectedKey(selected) === key);
	}

	function addVaccineName() {
		const vaccine = resolveVaccine(vaccineName);
		if (!vaccine || hasSelectedVaccine(vaccine)) return;
		selectedVaccines = [...selectedVaccines, vaccine];
		vaccineName = '';
	}

	function removeSelectedVaccine(index: number) {
		selectedVaccines = selectedVaccines.filter((_, itemIndex) => itemIndex !== index);
	}

	function collectVaccines(): SelectedVaccine[] {
		const vaccines = [...selectedVaccines];
		const typed = resolveVaccine(vaccineName);
		if (typed) vaccines.push(typed);

		const unique = new Map<string, SelectedVaccine>();
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
			if (vaccineName.trim() && !resolveVaccine(vaccineName)) {
				errorKey = 'vaccine.presetRequired';
				return;
			}

			const vaccines = collectVaccines();
			if (vaccines.length === 0) {
				errorKey = vaccineName.trim() ? 'vaccine.presetRequired' : 'vaccine.selectAtLeastOne';
				return;
			}

			const normalizedAppliedAt = normalizeDateInput(appliedAt);
			const updated = await saveNewVaccinations(
				petId,
				vaccines.map((vaccine) => ({ appliedAt: normalizedAppliedAt, vaccinePresetId: vaccine.id }))
			);

			currentVaccinations = updated;
			selectedVaccines = [];
			vaccineName = '';
			statusKey = 'vaccine.saved';
		} catch (exception) {
			if (exception instanceof Error && exception.message === 'date_invalid') errorKey = 'date.invalid';
			else if (exception instanceof Error && exception.message === 'vaccine_preset_required') errorKey = 'vaccine.presetRequired';
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

	function validityLabel(preset: VaccinePreset): string {
		return `${preset.validityMonths} ${t(preset.validityMonths === 1 ? 'pet.ageMonthSingular' : 'pet.ageMonthPlural')}`;
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
		<div class="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)]">
			<label class="flex flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.appliedAt')}</span>
				<DateField bind:value={appliedAt} ariaLabel={t('vaccine.appliedAt')} />
			</label>

			<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
				<span>{t('vaccine.name')}</span>
				<div class="flex min-w-0 gap-2">
					<input class="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" list={`vaccine-presets-${petId}`} bind:value={vaccineName} placeholder={t('vaccine.namePlaceholder')} />
					<datalist id={`vaccine-presets-${petId}`}>
						{#each currentPresets as preset}
							<option value={preset.name}>{validityLabel(preset)}</option>
						{/each}
					</datalist>
					<button type="button" class="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" aria-label={t('vaccine.addToDay')} title={t('vaccine.addToDay')} disabled={saving || !canAddVaccineName()} onclick={addVaccineName}>
						<Plus class="size-4" />
					</button>
				</div>
			</label>
		</div>

		{#if selectedVaccines.length > 0}
			<div class="flex flex-wrap gap-2" aria-label={t('vaccine.selectedForDay')}>
				{#each selectedVaccines as selected, index}
					<span class="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-border bg-muted px-2 text-sm">
						<span class="truncate">{selected.name}</span>
						<button type="button" class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground" aria-label={`${t('vaccine.removeSelected')}: ${selected.name}`} onclick={() => removeSelectedVaccine(index)}>
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