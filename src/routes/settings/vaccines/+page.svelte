<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import type { VaccinePreset, VaccinePresetDoseInput, VaccineProtocol, VaccineProtocolInput, VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadUsedDoseIds, loadUsedPresetIds, loadUsedProtocolIds, loadVaccinePresets, removePreset, savePreset, setPresetHidden } from '$lib/services/vaccine.service.js';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';

	type EditableDose = VaccinePresetDoseInput & { clientId: string };
	type EditableProtocol = Omit<VaccineProtocol, 'doses'> & { doses: EditableDose[]; clientId: string };
	type EditablePreset = Omit<VaccinePreset, 'protocols' | 'doses'> & { protocols: EditableProtocol[] };

	let presets = $state<EditablePreset[]>([]);
	let newName = $state('');
	let newProtocols = $state<EditableProtocol[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let usedPresetIds = $state<Set<number>>(new Set());
	let usedProtocolIds = $state<Set<number>>(new Set());
	let usedDoseIds = $state<Set<number>>(new Set());
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);
	let expandedPresetId = $state<number | null>(null);
	let activeNewProtocolClientId = $state<string | null>(null);
	let activePresetProtocolClientIds = $state<Record<number, string>>({});
	let nextDoseClientId = 0;
	let nextProtocolClientId = 0;

	function doseClientId(): string {
		nextDoseClientId += 1;
		return `dose-${nextDoseClientId}`;
	}

	function protocolClientId(): string {
		nextProtocolClientId += 1;
		return `protocol-${nextProtocolClientId}`;
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

	function createEditableProtocol(input: Omit<Partial<VaccineProtocolInput>, 'doses'> & Omit<Partial<VaccineProtocol>, 'doses'> & { doses?: Partial<VaccinePresetDoseInput>[] } = {}): EditableProtocol {
		return {
			id: input.id ?? 0,
			vaccinePresetId: input.vaccinePresetId ?? 0,
			name: input.name ?? t('vaccine.defaultProtocolName'),
			normalizedName: input.normalizedName ?? '',
			doses: input.doses?.map((dose) => createEditableDose(dose)) ?? [createEditableDose()],
			isDefault: input.isDefault ?? false,
			sortOrder: input.sortOrder ?? 0,
			updatedAt: input.updatedAt ?? null,
			clientId: protocolClientId()
		};
	}

	const initialNewProtocol = createEditableProtocol({ isDefault: true });
	newProtocols = [initialNewProtocol];
	activeNewProtocolClientId = initialNewProtocol.clientId;

	const activeNewProtocol = $derived(newProtocols.find((protocol) => protocol.clientId === activeNewProtocolClientId) ?? newProtocols.find((protocol) => protocol.isDefault) ?? newProtocols[0] ?? null);

	function toEditableProtocol(protocol: VaccineProtocol): EditableProtocol {
		return createEditableProtocol({
			...protocol,
			doses: protocol.doses.map((dose) => ({ id: dose.id, label: dose.label, validityValue: dose.validityValue, validityUnit: dose.validityUnit, sortOrder: dose.sortOrder }))
		});
	}

	function toEditablePreset(preset: VaccinePreset): EditablePreset {
		return {
			...preset,
			protocols: preset.protocols.map(toEditableProtocol)
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

	function protocolInput(protocol: EditableProtocol, index: number): VaccineProtocolInput {
		return {
			id: protocol.id > 0 ? protocol.id : undefined,
			name: protocol.name,
			doses: protocol.doses.map(doseInput),
			isDefault: protocol.isDefault,
			sortOrder: Number.isInteger(protocol.sortOrder) ? Number(protocol.sortOrder) : index
		};
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

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function numberInputValue(event: Event): number {
		return Number(inputValue(event));
	}

	function isPresetInUse(presetId: number): boolean {
		return usedPresetIds.has(presetId);
	}

	function isProtocolInUse(protocol: EditableProtocol): boolean {
		return protocol.id > 0 && usedProtocolIds.has(protocol.id);
	}

	function isDoseInUse(dose: EditableDose): boolean {
		return typeof dose.id === 'number' && usedDoseIds.has(dose.id);
	}

	function togglePresetExpanded(presetId: number) {
		expandedPresetId = expandedPresetId === presetId ? null : presetId;
	}

	function activeProtocolForPreset(preset: EditablePreset): EditableProtocol | null {
		const activeProtocolClientId = activePresetProtocolClientIds[preset.id];
		return preset.protocols.find((protocol) => protocol.clientId === activeProtocolClientId) ?? preset.protocols.find((protocol) => protocol.isDefault) ?? preset.protocols[0] ?? null;
	}

	function setActiveNewProtocol(clientId: string) {
		activeNewProtocolClientId = clientId;
	}

	function setActivePresetProtocol(presetId: number, clientId: string) {
		activePresetProtocolClientIds = { ...activePresetProtocolClientIds, [presetId]: clientId };
	}

	function upsertPreset(preset: VaccinePreset): EditablePreset {
		const editablePreset = toEditablePreset(preset);
		const next = presets.filter((item) => item.id !== editablePreset.id && item.normalizedName !== editablePreset.normalizedName);
		presets = [...next, editablePreset].sort((first, second) => first.name.localeCompare(second.name));
		return editablePreset;
	}

	function updatePresetHiddenState(preset: VaccinePreset) {
		presets = presets.map((item) => (item.id === preset.id ? { ...item, hiddenAt: preset.hiddenAt, updatedAt: preset.updatedAt } : item));
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_name_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_protocol_required') errorKey = 'vaccine.protocolRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_protocol_duplicate') errorKey = 'vaccine.protocolDuplicate';
		else if (exception instanceof Error && exception.message === 'vaccine_protocol_in_use') errorKey = 'vaccine.protocolInUse';
		else if (exception instanceof Error && exception.message === 'vaccine_validity_required') errorKey = 'vaccine.validityRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_required') errorKey = 'vaccine.doseRequired';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_duplicate') errorKey = 'vaccine.doseDuplicate';
		else if (exception instanceof Error && exception.message === 'vaccine_dose_in_use') errorKey = 'vaccine.doseInUse';
		else errorKey = 'vaccine.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const [loadedPresets, loadedUsedIds, loadedUsedProtocolIds, loadedUsedDoseIds] = await Promise.all([loadVaccinePresets(), loadUsedPresetIds(), loadUsedProtocolIds(), loadUsedDoseIds()]);
			presets = loadedPresets.map(toEditablePreset);
			if (expandedPresetId !== null && !loadedPresets.some((preset) => preset.id === expandedPresetId)) expandedPresetId = null;
			usedPresetIds = new Set(loadedUsedIds);
			usedProtocolIds = new Set(loadedUsedProtocolIds);
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
			const preset = await savePreset({ name: newName, protocols: newProtocols.map(protocolInput) });
			const editablePreset = upsertPreset(preset);
			expandedPresetId = preset.id;
			const defaultProtocol = editablePreset.protocols.find((protocol) => protocol.isDefault) ?? editablePreset.protocols[0];
			if (defaultProtocol) setActivePresetProtocol(preset.id, defaultProtocol.clientId);
			newName = '';
			const protocol = createEditableProtocol({ isDefault: true });
			newProtocols = [protocol];
			activeNewProtocolClientId = protocol.clientId;
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
			const previousActiveProtocol = activeProtocolForPreset(preset);
			const saved = await savePreset({ name: preset.name, protocols: preset.protocols.map(protocolInput) }, preset.id);
			const editablePreset = upsertPreset(saved);
			expandedPresetId = saved.id;
			const activeProtocol =
				(previousActiveProtocol?.id ? editablePreset.protocols.find((protocol) => protocol.id === previousActiveProtocol.id) : null) ??
				(previousActiveProtocol?.normalizedName ? editablePreset.protocols.find((protocol) => protocol.normalizedName === previousActiveProtocol.normalizedName) : null) ??
				editablePreset.protocols.find((protocol) => protocol.isDefault) ??
				editablePreset.protocols[0];
			if (activeProtocol) setActivePresetProtocol(saved.id, activeProtocol.clientId);
			statusKey = 'vaccine.presetSaved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function togglePresetHidden(preset: EditablePreset) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setPresetHidden(preset.id, !preset.hiddenAt);
			updatePresetHiddenState(saved);
			statusKey = saved.hiddenAt ? 'vaccine.presetHiddenSaved' : 'vaccine.presetShownSaved';
		} catch {
			errorKey = 'vaccine.saveFailed';
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
			if (expandedPresetId === preset.id) expandedPresetId = null;
			statusKey = 'status.deleted';
		} catch (exception) {
			errorKey = exception instanceof Error && exception.message === 'vaccine_preset_in_use' ? 'vaccine.presetInUse' : 'vaccine.saveFailed';
		} finally {
			saving = false;
		}
	}

	function addNewProtocol() {
		const protocol = createEditableProtocol({ name: '', sortOrder: newProtocols.length, isDefault: newProtocols.length === 0 });
		newProtocols = [...newProtocols, protocol];
		activeNewProtocolClientId = protocol.clientId;
	}

	function updateNewProtocol(clientId: string, patch: Partial<EditableProtocol>) {
		newProtocols = newProtocols.map((protocol) => (protocol.clientId === clientId ? { ...protocol, ...patch } : protocol));
	}

	function setNewDefaultProtocol(clientId: string) {
		newProtocols = newProtocols.map((protocol) => ({ ...protocol, isDefault: protocol.clientId === clientId }));
	}

	function removeNewProtocol(clientId: string) {
		if (newProtocols.length <= 1) return;
		const removed = newProtocols.find((protocol) => protocol.clientId === clientId);
		const remaining = newProtocols.filter((protocol) => protocol.clientId !== clientId);
		newProtocols = removed?.isDefault ? remaining.map((protocol, index) => ({ ...protocol, isDefault: index === 0 })) : remaining;
		if (activeNewProtocolClientId === clientId) activeNewProtocolClientId = newProtocols[0]?.clientId ?? null;
	}

	function addNewDose(protocolClientId: string) {
		newProtocols = newProtocols.map((protocol) => (protocol.clientId === protocolClientId ? { ...protocol, doses: [...protocol.doses, createEditableDose({ sortOrder: protocol.doses.length })] } : protocol));
	}

	function updateNewDose(protocolClientId: string, doseClientId: string, patch: Partial<EditableDose>) {
		newProtocols = newProtocols.map((protocol) => (protocol.clientId === protocolClientId ? { ...protocol, doses: protocol.doses.map((dose) => (dose.clientId === doseClientId ? { ...dose, ...patch } : dose)) } : protocol));
	}

	function removeNewDose(protocolClientId: string, doseClientId: string) {
		newProtocols = newProtocols.map((protocol) => (protocol.clientId === protocolClientId && protocol.doses.length > 1 ? { ...protocol, doses: protocol.doses.filter((dose) => dose.clientId !== doseClientId) } : protocol));
	}

	function updatePresetName(presetId: number, name: string) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, name } : preset));
	}

	function addPresetProtocol(presetId: number) {
		const targetPreset = presets.find((preset) => preset.id === presetId);
		if (!targetPreset) return;
		const protocol = createEditableProtocol({ vaccinePresetId: targetPreset.id, name: '', sortOrder: targetPreset.protocols.length });
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, protocols: [...preset.protocols, protocol] } : preset));
		setActivePresetProtocol(presetId, protocol.clientId);
	}

	function updatePresetProtocol(presetId: number, protocolClientId: string, patch: Partial<EditableProtocol>) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, protocols: preset.protocols.map((protocol) => (protocol.clientId === protocolClientId ? { ...protocol, ...patch } : protocol)) } : preset));
	}

	function setPresetDefaultProtocol(presetId: number, protocolClientId: string) {
		presets = presets.map((preset) => (preset.id === presetId ? { ...preset, protocols: preset.protocols.map((protocol) => ({ ...protocol, isDefault: protocol.clientId === protocolClientId })) } : preset));
	}

	function removePresetProtocol(presetId: number, protocolClientId: string) {
		const preset = presets.find((item) => item.id === presetId);
		const protocol = preset?.protocols.find((item) => item.clientId === protocolClientId);
		if (protocol && isProtocolInUse(protocol)) {
			errorKey = 'vaccine.protocolInUse';
			statusKey = null;
			return;
		}
		if (!preset || preset.protocols.length <= 1) return;

		const remaining = preset.protocols.filter((item) => item.clientId !== protocolClientId);
		const normalized = protocol?.isDefault ? remaining.map((item, index) => ({ ...item, isDefault: index === 0 })) : remaining;
		presets = presets.map((item) => (item.id === presetId ? { ...item, protocols: normalized } : item));
		if (activePresetProtocolClientIds[presetId] === protocolClientId) setActivePresetProtocol(presetId, normalized[0]?.clientId ?? '');
	}

	function addPresetDose(presetId: number, protocolClientId: string) {
		presets = presets.map((preset) =>
			preset.id === presetId
				? { ...preset, protocols: preset.protocols.map((protocol) => (protocol.clientId === protocolClientId ? { ...protocol, doses: [...protocol.doses, createEditableDose({ sortOrder: protocol.doses.length })] } : protocol)) }
				: preset
		);
	}

	function updatePresetDose(presetId: number, protocolClientId: string, doseClientId: string, patch: Partial<EditableDose>) {
		presets = presets.map((preset) =>
			preset.id === presetId
				? { ...preset, protocols: preset.protocols.map((protocol) => (protocol.clientId === protocolClientId ? { ...protocol, doses: protocol.doses.map((dose) => (dose.clientId === doseClientId ? { ...dose, ...patch } : dose)) } : protocol)) }
				: preset
		);
	}

	function removePresetDose(presetId: number, protocolClientId: string, doseClientId: string) {
		const preset = presets.find((item) => item.id === presetId);
		const protocol = preset?.protocols.find((item) => item.clientId === protocolClientId);
		const dose = protocol?.doses.find((item) => item.clientId === doseClientId);
		if (dose && isDoseInUse(dose)) {
			errorKey = 'vaccine.doseInUse';
			statusKey = null;
			return;
		}

		presets = presets.map((preset) =>
			preset.id === presetId
				? { ...preset, protocols: preset.protocols.map((protocol) => (protocol.clientId === protocolClientId && protocol.doses.length > 1 ? { ...protocol, doses: protocol.doses.filter((dose) => dose.clientId !== doseClientId) } : protocol)) }
				: preset
		);
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
					<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('vaccine.name')}</span>
								<CharacterLimitHint value={newName} max={FIELD_LIMITS.vaccinePresetName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newName} maxlength={FIELD_LIMITS.vaccinePresetName} required />
						</label>
						<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('vaccine.savePreset')}
						</button>
					</div>

					<div class="space-y-3 border-t border-border pt-4">
						<div class="flex items-center justify-between gap-3">
							<p class="text-sm font-semibold">{t('vaccine.protocolsTitle')}</p>
							<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={addNewProtocol}>
								<Plus class="size-4" />
								{t('vaccine.addProtocol')}
							</button>
						</div>

						<div class="overflow-x-auto">
							<div class="flex min-w-full gap-2 border-b border-border pb-2" role="tablist" aria-label={t('vaccine.protocolsTitle')}>
								{#each newProtocols as protocol (protocol.clientId)}
									{@const isActive = activeNewProtocol?.clientId === protocol.clientId}
									<button type="button" role="tab" aria-selected={isActive} aria-controls={`new-protocol-panel-${protocol.clientId}`} class={`inline-flex h-9 max-w-56 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-accent'}`} onclick={() => setActiveNewProtocol(protocol.clientId)}>
										<span class="truncate">{protocol.name || t('vaccine.protocol')}</span>
										{#if protocol.isDefault}
											<span class={`rounded px-1.5 py-0.5 text-xs ${isActive ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t('vaccine.defaultProtocol')}</span>
										{/if}
									</button>
								{/each}
							</div>
						</div>

						{#if activeNewProtocol}
							<div id={`new-protocol-panel-${activeNewProtocol.clientId}`} class="space-y-3 pt-3" role="tabpanel">
								<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
									<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
										<span class="flex min-w-0 items-baseline justify-between gap-2">
											<span>{t('vaccine.protocol')}</span>
											<CharacterLimitHint value={activeNewProtocol.name} max={FIELD_LIMITS.vaccineProtocolName} />
										</span>
										<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={activeNewProtocol.name} maxlength={FIELD_LIMITS.vaccineProtocolName} placeholder={t('vaccine.protocolNamePlaceholder')} required oninput={(event) => updateNewProtocol(activeNewProtocol.clientId, { name: inputValue(event) })} />
									</label>
									<label class="inline-flex h-10 items-center gap-2 text-sm font-medium">
										<input type="radio" class="size-4 accent-primary" name="new-default-protocol" checked={activeNewProtocol.isDefault} onchange={() => setNewDefaultProtocol(activeNewProtocol.clientId)} />
										{t('vaccine.defaultProtocol')}
									</label>
									<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || newProtocols.length <= 1} aria-label={`${t('vaccine.removeProtocol')}: ${activeNewProtocol.name || t('vaccine.protocol')}`} title={t('vaccine.removeProtocol')} onclick={() => removeNewProtocol(activeNewProtocol.clientId)}>
										<X class="size-4" />
									</button>
								</div>

								<div class="space-y-3 border-t border-border pt-3">
									<div class="flex items-center justify-between gap-3">
										<p class="text-sm font-semibold">{t('vaccine.dosesTitle')}</p>
										<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => addNewDose(activeNewProtocol.clientId)}>
											<Plus class="size-4" />
											{t('vaccine.addDose')}
										</button>
									</div>

									{#each activeNewProtocol.doses as dose (dose.clientId)}
										<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] md:items-start">
											<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
												<span class="flex min-w-0 items-baseline justify-between gap-2">
													<span>{t('vaccine.dose')}</span>
													<CharacterLimitHint value={dose.label} max={FIELD_LIMITS.vaccineDoseLabel} />
												</span>
												<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.label} maxlength={FIELD_LIMITS.vaccineDoseLabel} placeholder={t('vaccine.dosePlaceholder')} required oninput={(event) => updateNewDose(activeNewProtocol.clientId, dose.clientId, { label: inputValue(event) })} />
											</label>
											<label class="flex flex-col gap-1 text-sm font-medium">
												<span>{t('vaccine.validityValue')}</span>
												<input type="number" min="1" max={validityValueLimit(dose.validityUnit)} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.validityValue} oninput={(event) => updateNewDose(activeNewProtocol.clientId, dose.clientId, { validityValue: numberInputValue(event) })} />
											</label>
											<div class="flex flex-col gap-1 text-sm font-medium">
												<label for={`new-dose-unit-${activeNewProtocol.clientId}-${dose.clientId}`}>{t('vaccine.validityUnit')}</label>
												<Select id={`new-dose-unit-${activeNewProtocol.clientId}-${dose.clientId}`} value={dose.validityUnit} options={validityUnitOptions()} onchange={(value) => updateNewDose(activeNewProtocol.clientId, dose.clientId, { validityUnit: value as VaccineValidityUnit })} />
											</div>
											<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || activeNewProtocol.doses.length <= 1} aria-label={`${t('vaccine.removeDose')}: ${dose.label || t('vaccine.dose')}`} title={t('vaccine.removeDose')} onclick={() => removeNewDose(activeNewProtocol.clientId, dose.clientId)}>
												<X class="size-4" />
											</button>
										</div>
									{/each}
								</div>
							</div>
						{/if}
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
					<article class="overflow-hidden rounded-md border border-border bg-background">
						<button type="button" class="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent" aria-expanded={expandedPresetId === preset.id} aria-controls={`preset-details-${preset.id}`} onclick={() => togglePresetExpanded(preset.id)}>
							<span class="flex min-w-0 items-center gap-2">
								{#if expandedPresetId === preset.id}
									<ChevronDown class="size-4 shrink-0 text-muted-foreground" />
								{:else}
									<ChevronRight class="size-4 shrink-0 text-muted-foreground" />
								{/if}
								<span class="truncate text-sm font-medium">{preset.name}</span>
								{#if preset.hiddenAt}
									<span class="inline-flex h-5 shrink-0 items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground">{t('vaccine.hidden')}</span>
								{/if}
							</span>
						</button>

						{#if expandedPresetId === preset.id}
							<form id={`preset-details-${preset.id}`} class="space-y-4 border-t border-border p-3" onsubmit={(event) => submitExisting(event, preset)}>
								<div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-start">
									<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
										<span class="flex min-w-0 items-baseline justify-between gap-2">
											<span>{t('vaccine.name')}</span>
											<CharacterLimitHint value={preset.name} max={FIELD_LIMITS.vaccinePresetName} />
										</span>
										<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={preset.name} maxlength={FIELD_LIMITS.vaccinePresetName} required oninput={(event) => updatePresetName(preset.id, inputValue(event))} />
									</label>
									<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
										<Save class="size-4" />
										{t('actions.save')}
									</button>
									<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={preset.hiddenAt ? t('vaccine.showPreset') : t('vaccine.hidePreset')} onclick={() => void togglePresetHidden(preset)}>
										{#if preset.hiddenAt}
											<Eye class="size-4" />
											{t('vaccine.showPreset')}
										{:else}
											<EyeOff class="size-4" />
											{t('vaccine.hidePreset')}
										{/if}
									</button>
									<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving || isPresetInUse(preset.id)} title={isPresetInUse(preset.id) ? t('vaccine.presetInUse') : t('actions.delete')} onclick={() => void deletePreset(preset)}>
										<Trash2 class="size-4" />
										{t('actions.delete')}
									</button>
								</div>

								<div class="space-y-3 border-t border-border pt-4">
									<div class="flex items-center justify-between gap-3">
										<p class="text-sm font-semibold">{t('vaccine.protocolsTitle')}</p>
										<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => addPresetProtocol(preset.id)}>
											<Plus class="size-4" />
											{t('vaccine.addProtocol')}
										</button>
									</div>

									{#each [activeProtocolForPreset(preset)] as activeProtocol}
									<div class="overflow-x-auto">
										<div class="flex min-w-full gap-2 border-b border-border pb-2" role="tablist" aria-label={t('vaccine.protocolsTitle')}>
											{#each preset.protocols as protocol (protocol.clientId)}
												{@const isActive = activeProtocol?.clientId === protocol.clientId}
												<button type="button" role="tab" aria-selected={isActive} aria-controls={`preset-${preset.id}-protocol-panel-${protocol.clientId}`} class={`inline-flex h-9 max-w-56 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-medium ${isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:bg-accent'}`} onclick={() => setActivePresetProtocol(preset.id, protocol.clientId)}>
													<span class="truncate">{protocol.name || t('vaccine.protocol')}</span>
													{#if protocol.isDefault}
														<span class={`rounded px-1.5 py-0.5 text-xs ${isActive ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{t('vaccine.defaultProtocol')}</span>
													{/if}
												</button>
											{/each}
										</div>
									</div>

									{#if activeProtocol}
										<div id={`preset-${preset.id}-protocol-panel-${activeProtocol.clientId}`} class="space-y-3 pt-3" role="tabpanel">
											<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
												<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
													<span class="flex min-w-0 items-baseline justify-between gap-2">
														<span>{t('vaccine.protocol')}</span>
														<CharacterLimitHint value={activeProtocol.name} max={FIELD_LIMITS.vaccineProtocolName} />
													</span>
													<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={activeProtocol.name} maxlength={FIELD_LIMITS.vaccineProtocolName} placeholder={t('vaccine.protocolNamePlaceholder')} required oninput={(event) => updatePresetProtocol(preset.id, activeProtocol.clientId, { name: inputValue(event) })} />
												</label>
												<label class="inline-flex h-10 items-center gap-2 text-sm font-medium">
													<input type="radio" class="size-4 accent-primary" name={`preset-default-protocol-${preset.id}`} checked={activeProtocol.isDefault} onchange={() => setPresetDefaultProtocol(preset.id, activeProtocol.clientId)} />
													{t('vaccine.defaultProtocol')}
												</label>
												<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || preset.protocols.length <= 1 || isProtocolInUse(activeProtocol)} aria-label={`${t('vaccine.removeProtocol')}: ${activeProtocol.name || t('vaccine.protocol')}`} title={isProtocolInUse(activeProtocol) ? t('vaccine.protocolInUse') : t('vaccine.removeProtocol')} onclick={() => removePresetProtocol(preset.id, activeProtocol.clientId)}>
													<X class="size-4" />
												</button>
											</div>

											<div class="space-y-3 border-t border-border pt-3">
												<div class="flex items-center justify-between gap-3">
													<p class="text-sm font-semibold">{t('vaccine.dosesTitle')}</p>
													<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => addPresetDose(preset.id, activeProtocol.clientId)}>
														<Plus class="size-4" />
														{t('vaccine.addDose')}
													</button>
												</div>

												{#each activeProtocol.doses as dose (dose.clientId)}
													<div class="grid gap-2 md:grid-cols-[minmax(0,1fr)_8rem_9rem_auto] md:items-start">
														<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
															<span class="flex min-w-0 items-baseline justify-between gap-2">
																<span>{t('vaccine.dose')}</span>
																<CharacterLimitHint value={dose.label} max={FIELD_LIMITS.vaccineDoseLabel} />
															</span>
															<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.label} maxlength={FIELD_LIMITS.vaccineDoseLabel} placeholder={t('vaccine.dosePlaceholder')} required oninput={(event) => updatePresetDose(preset.id, activeProtocol.clientId, dose.clientId, { label: inputValue(event) })} />
														</label>
														<label class="flex flex-col gap-1 text-sm font-medium">
															<span>{t('vaccine.validityValue')}</span>
															<input type="number" min="1" max={validityValueLimit(dose.validityUnit)} class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={dose.validityValue} oninput={(event) => updatePresetDose(preset.id, activeProtocol.clientId, dose.clientId, { validityValue: numberInputValue(event) })} />
														</label>
														<div class="flex flex-col gap-1 text-sm font-medium">
															<label for={`preset-dose-unit-${preset.id}-${activeProtocol.clientId}-${dose.clientId}`}>{t('vaccine.validityUnit')}</label>
															<Select id={`preset-dose-unit-${preset.id}-${activeProtocol.clientId}-${dose.clientId}`} value={dose.validityUnit} options={validityUnitOptions()} onchange={(value) => updatePresetDose(preset.id, activeProtocol.clientId, dose.clientId, { validityUnit: value as VaccineValidityUnit })} />
														</div>
														<button type="button" class="inline-flex size-10 items-center justify-center rounded-md border border-border bg-background hover:bg-accent disabled:opacity-50" disabled={saving || activeProtocol.doses.length <= 1 || isDoseInUse(dose)} aria-label={`${t('vaccine.removeDose')}: ${dose.label || t('vaccine.dose')}`} title={isDoseInUse(dose) ? t('vaccine.doseInUse') : t('vaccine.removeDose')} onclick={() => removePresetDose(preset.id, activeProtocol.clientId, dose.clientId)}>
															<X class="size-4" />
														</button>
													</div>
												{/each}
											</div>
										</div>
									{/if}
									{/each}
								</div>
							</form>
						{/if}
					</article>
				{:else}
					<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('vaccine.emptyPresets')}</p>
				{/each}
			{/if}
		</div>
	</section>
</section>
