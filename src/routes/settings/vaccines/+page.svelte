<script lang="ts">
	import { onMount } from 'svelte';
	import type { VaccinePreset, VaccinePresetDoseInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadUsedDoseIds, loadUsedPresetIds, loadVaccinePresets, removePreset, savePreset } from '$lib/services/vaccine.service.js';
	import Select from '$lib/components/ui/Select.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	type EditableDose = VaccinePresetDoseInput & { clientId: string };
	type EditablePreset = Omit<VaccinePreset, 'doses'> & { doses: EditableDose[] };

	let presets = $state<EditablePreset[]>([]);
	let newName = $state('');
	let newDoses = $state<EditableDose[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let usedPresetIds = $state<Set<number>>(new Set());
	let usedDoseIds = $state<Set<number>>(new Set());
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);
	let nextDoseClientId = 0;

	function doseClientId(): string {
		nextDoseClientId += 1;
		return `dose-${nextDoseClientId}`;
	}

	function createEditableDose(input: Partial<VaccinePresetDoseInput> = {}): EditableDose {
		return {
			id: input.id,
			label: input.label ?? '',
			validityValue: input.validityValue ?? 12,
			validityUnit: input.validityUnit ?? 'months',
			sortOrder: input.sortOrder ?? 0,
			clientId: doseClientId()
		};
	}

	newDoses = [createEditableDose()];

	function toEditablePreset(preset: VaccinePreset): EditablePreset {
		return {
			...preset,
			doses: preset.doses.map((dose) => createEditableDose({ id: dose.id, label: dose.label, validityValue: dose.validityValue, validityUnit: dose.validityUnit, sortOrder: dose.sortOrder }))
		};
	}

	function doseInput(dose: EditableDose, index: number): VaccinePresetDoseInput {
		return {
			id: dose.id,
			label: dose.label,
			validityValue: Number(dose.validityValue),
			validityUnit: dose.validityUnit,
			sortOrder: Number.isInteger(dose.sortOrder) ? Number(dose.sortOrder) : index
		};
	}

	function validityUnitOptions() {
		return [
			{ value: 'days' as const, label: t('vaccine.validityUnit.days') },
			{ value: 'months' as const, label: t('vaccine.validityUnit.months') }
		];
	}

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function numberInputValue(event: Event): number {
		return Number(inputValue(event));
	}

	function isPresetInUse(presetId: number): boolean {
		return usedPresetIds.has(presetId);
	}

	function isDoseInUse(dose: EditableDose): boolean {
		return typeof dose.id === 'number' && usedDoseIds.has(dose.id);
	}

	function upsertPreset(preset: VaccinePreset) {
		const editablePreset = toEditablePreset(preset);
		const next = presets.filter((item) => item.id !== editablePreset.id && item.normalizedName !== editablePreset.normalizedName);
		presets = [...next, editablePreset].sort((first, second) => first.name.localeCompare(second.name));
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'vaccine_validity_required') errorKey = 'vaccine.validityRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_required') errorKey = 'vaccine.doseRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_duplicate') errorKey = 'vaccine.doseDuplicate';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_in_use') errorKey = 'vaccine.doseInUse';
		else errorKey = 'vaccine.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
				const [loadedPresets, loadedUsedIds, loadedUsedDoseIds] = await Promise.all([loadVaccinePresets(), loadUsedPresetIds(), loadUsedDoseIds()]);
			presets = loadedPresets.map(toEditablePreset);
			usedPresetIds = new Set(loadedUsedIds);
				usedDoseIds = new Set(loadedUsedDoseIds);
		} catch (exception) {
			errorKey = exception instanceof Error && exception.message === 'vaccine_preset_in_use' ? 'vaccine.presetInUse' : 'vaccine.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNew(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const preset = await savePreset({ name: newName, doses: newDoses.map(doseInput) });
			upsertPreset(preset);
			newName = '';
			newDoses = [createEditableDose()];
			statusKey = 'vaccine.presetSaved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function submitExisting(event: SubmitEvent, preset: EditablePreset) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await savePreset({ name: preset.name, doses: preset.doses.map(doseInput) }, preset.id);
			upsertPreset(saved);
			statusKey = 'vaccine.presetSaved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function deletePreset(preset: EditablePreset) {
		if (isPresetInUse(preset.id)) {
			errorKey = 'vaccine.presetInUse';
			statusKey = null;
			return;
		}

		if (!window.confirm(t('vaccine.presetDeleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removePreset(preset.id);
			presets = presets.filter((item) => item.id !== preset.id);
			usedPresetIds = new Set([...usedPresetIds].filter((presetId) => presetId !== preset.id));
			statusKey = 'status.deleted';
		} catch (exception) {
			errorKey = exception instanceof Error && exception.message === 'vaccine_preset_in_use' ? 'vaccine.presetInUse' : 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	function addNewDose() {
		newDoses = [...newDoses, createEditableDose({ sortOrder: newDoses.length })];
	}

	function updateNewDose(clientId: string, patch: Partial<EditableDose>) {
		newDoses = newDoses.map((dose) => (dose.clientId === clientId ? { ...dose, ...patch } : dose));
	}

	function removeNewDose(clientId: string) {
		if (newDoses.length <= 1) return;
		newDoses = newDoses.filter((dose) => dose.clientId !== clientId);
	}

	function updatePresetName(presetId: number, name: string) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, name } : preset));
	}

	function addPresetDose(presetId: number) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, doses: [...preset.doses, createEditableDose({ sortOrder: preset.doses.length })] } : preset));
	}

	function updatePresetDose(presetId: number, clientId: string, patch: Partial<EditableDose>) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, doses: preset.doses.map((dose) => (dose.clientId === clientId ? { ...dose, ...patch } : dose)) } : preset));
	}

	function removePresetDose(presetId: number, clientId: string) {
		const preset = presets.find((item) => item.id === presetId);
		const dose = preset?.doses.find((item) => item.clientId === clientId);
		if (dose && isDoseInUse(dose)) {
			errorKey = 'vaccine.doseInUse';
			statusKey = null;
			return;
		}

		presets = presets.map((preset) => (preset.id === presetId && preset.doses.length > 1 ? { ...preset, doses: preset.doses.filter((dose) => dose.clientId !== clientId) } : preset));
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.vaccines.title')} · {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
	<header class="border-b border-border pb-5">
		<p class="text-sm font-medium text-muted-foreground">{t('settings.title')}</p>
		<h2 class="mt-1 text-2xl font-semibold sm:text-3xl">{t('settings.vaccines.title')}</h2>
		<p class="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('settings.vaccines.description')}</p>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<div class="flex items-start gap-3">
			<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
				<Syringe class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('vaccine.newPresetTitle')}</h3>
				<form class="mt-4 space-y-4" onsubmit={submitNew}>
					<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span>{t('vaccine.name')}</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newName} required />
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('vaccine.savePreset')}
						</button>
					</div>

					<div class="space-y-3 border-t border-border pt-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-semibold">{t('vaccine.dosesTitle')}</p>
							<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addNewDose}>
								<Plus class="size-4" />
								{t('vaccine.addDose')}
							</button>
						</div>

						{#each newDoses as dose (dose.clientId)}
							<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] md:items-end">
								<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
									<span>{t('vaccine.dose')}</span>
									<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.label} placeholder={t('vaccine.dosePlaceholder')} required oninput={(event) => updateNewDose(dose.clientId, { label: inputValue(event) })} />
								</label>
								<label class="flex flex-col gap-1 text-sm font-medium">
									<span>{t('vaccine.validityValue')}</span>
									<input type="number" min="1" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.validityValue} oninput={(event) => updateNewDose(dose.clientId, { validityValue: numberInputValue(event) })} />
								</label>
								<div class="flex flex-col gap-1 text-sm font-medium">
									<label for={`new-dose-unit-${dose.clientId}`}>{t('vaccine.validityUnit')}</label>
									<Select id={`new-dose-unit-${dose.clientId}`} value={dose.validityUnit} options={validityUnitOptions()} onchange={(value) => updateNewDose(dose.clientId, { validityUnit: value as VaccineValidityUnit })} />
								</div>
								<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || newDoses.length <= 1} aria-label={`${t('vaccine.removeDose')}: ${dose.label || t('vaccine.dose')}`} title={t('vaccine.removeDose')} onclick={() => removeNewDose(dose.clientId)}>
									<X class="size-4" />
								</button>
							</div>
						{/each}
					</div>
				</form>
			</div>
		</div>
	</section>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
		<h3 class="text-base font-semibold">{t('vaccine.presetsTitle')}</h3>
		<div class="mt-4 flex flex-col gap-3">
			{#if loading}
				<div class="h-28 animate-pulse rounded-md bg-muted"></div>
			{:else}
				{#each presets as preset (preset.id)}
					<form class="space-y-4 rounded-md border border-border bg-background p-3" onsubmit={(event) => submitExisting(event, preset)}>
						<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span>{t('vaccine.name')}</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={preset.name} required oninput={(event) => updatePresetName(preset.id, inputValue(event))} />
							</label>
							<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
								<Save class="size-4" />
								{t('actions.save')}
							</button>
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving || isPresetInUse(preset.id)} title={isPresetInUse(preset.id) ? t('vaccine.presetInUse') : t('actions.delete')} onclick={() => void deletePreset(preset)}>
								<Trash2 class="size-4" />
								{t('actions.delete')}
							</button>
						</div>

						<div class="space-y-3 border-t border-border pt-4">
							<div class="flex items-center justify-between gap-3">
								<p class="text-sm font-semibold">{t('vaccine.dosesTitle')}</p>
								<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => addPresetDose(preset.id)}>
									<Plus class="size-4" />
									{t('vaccine.addDose')}
								</button>
							</div>

							{#each preset.doses as dose (dose.clientId)}
								<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] md:items-end">
									<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
										<span>{t('vaccine.dose')}</span>
										<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.label} placeholder={t('vaccine.dosePlaceholder')} required oninput={(event) => updatePresetDose(preset.id, dose.clientId, { label: inputValue(event) })} />
									</label>
									<label class="flex flex-col gap-1 text-sm font-medium">
										<span>{t('vaccine.validityValue')}</span>
										<input type="number" min="1" class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.validityValue} oninput={(event) => updatePresetDose(preset.id, dose.clientId, { validityValue: numberInputValue(event) })} />
									</label>
									<div class="flex flex-col gap-1 text-sm font-medium">
										<label for={`preset-dose-unit-${preset.id}-${dose.clientId}`}>{t('vaccine.validityUnit')}</label>
										<Select id={`preset-dose-unit-${preset.id}-${dose.clientId}`} value={dose.validityUnit} options={validityUnitOptions()} onchange={(value) => updatePresetDose(preset.id, dose.clientId, { validityUnit: value as VaccineValidityUnit })} />
									</div>
									<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || preset.doses.length <= 1 || isDoseInUse(dose)} aria-label={`${t('vaccine.removeDose')}: ${dose.label || t('vaccine.dose')}`} title={isDoseInUse(dose) ? t('vaccine.doseInUse') : t('vaccine.removeDose')} onclick={() => removePresetDose(preset.id, dose.clientId)}>
										<X class="size-4" />
									</button>
								</div>
							{/each}
						</div>
					</form>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.emptyPresets')}</p>
				{/each}
			{/if}
		</div>
	</section>
</section>