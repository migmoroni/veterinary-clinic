<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import PeriodField from '$lib/components/forms/PeriodField.svelte';
	import TrashRemovalDialog from '$lib/components/shared/TrashRemovalDialog.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import { petSpeciesOptions, type KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { canDeleteTreatmentProtocol, canEditTreatmentProtocol, type TreatmentProtocol, type TreatmentProtocolDose, type TreatmentProtocolId, type TreatmentProtocolKind, type TreatmentProtocolValidityUnit } from '$lib/domain/treatment/protocol.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { TREATMENT_KINDS, type TreatmentCatalogItem, type TreatmentCatalogItemId, type TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadTreatmentProtocols, removeProtocol, removeProtocolDose, saveProtocol, saveProtocolDose, setProtocolHidden } from '$lib/services/treatment-protocol.service.js';
	import { loadTreatmentCatalogItems } from '$lib/services/treatment.service.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import ScrollText from '@lucide/svelte/icons/scroll-text';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type CatalogItem = TreatmentCatalogItem;

	const treatmentKinds = TREATMENT_KINDS;

	let catalogItemsByKind = $state<Record<TreatmentKind, TreatmentCatalogItem[]>>({
		vaccine: [],
		antiparasitic: []
	});
	let protocols = $state<TreatmentProtocol[]>([]);
	let protocolDraftNames = $state<Record<TreatmentProtocolId, string>>({});
	let protocolDraftSpecies = $state<Record<TreatmentProtocolId, KnownPetSpecies[]>>({});
	let protocolDraftObservations = $state<Record<TreatmentProtocolId, string>>({});
	let protocolDraftItemIds = $state<Record<TreatmentProtocolId, TreatmentCatalogItemId[]>>({});
	let doseDraftDoses = $state<Record<number, string>>({});
	let doseDraftValidityValues = $state<Record<number, number>>({});
	let doseDraftValidityUnits = $state<Record<number, TreatmentProtocolValidityUnit>>({});
	let newDoseDoses = $state<Record<TreatmentProtocolId, string>>({});
	let newDoseValidityValues = $state<Record<TreatmentProtocolId, number>>({});
	let newDoseValidityUnits = $state<Record<TreatmentProtocolId, TreatmentProtocolValidityUnit>>({});
	let newProtocolKind = $state<TreatmentProtocolKind>('vaccine');
	let newProtocolName = $state('');
	let newProtocolSpecies = $state<KnownPetSpecies[]>(defaultSpeciesDraft());
	let newProtocolObservation = $state('');
	let newProtocolItemIds = $state<TreatmentCatalogItemId[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let protocolPendingRemoval = $state<TreatmentProtocol | null>(null);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);
	let newProtocolSelectableItems = $derived(visibleCatalogItemsForSpecies(newProtocolKind, newProtocolSpecies));

	function sortedTreatmentCatalogItems(source: TreatmentCatalogItem[]): TreatmentCatalogItem[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function sortedProtocols(source: TreatmentProtocol[]): TreatmentProtocol[] {
		return [...source].sort((first, second) => first.kind.localeCompare(second.kind) || first.sortOrder - second.sortOrder || first.name.localeCompare(second.name));
	}

	function sortedCatalogItems(source: CatalogItem[]): CatalogItem[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name) || first.id.localeCompare(second.id));
	}

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function defaultSpeciesDraft(): KnownPetSpecies[] {
		return petSpeciesOptions.map((option) => option.id);
	}

	function toggleSpeciesDraft(values: KnownPetSpecies[], species: KnownPetSpecies, allowEmpty = false): KnownPetSpecies[] {
		if (values.includes(species)) return values.length > 1 || allowEmpty ? values.filter((value) => value !== species) : [...values];
		return [...values, species];
	}

	function speciesLabel(species: KnownPetSpecies): string {
		const option = petSpeciesOptions.find((item) => item.id === species);
		return option ? t(option.labelKey) : species;
	}

	function speciesSummary(species: KnownPetSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function protocolDraftSpeciesValue(protocol: TreatmentProtocol): KnownPetSpecies[] {
		return protocolDraftSpecies[protocol.id] ?? protocol.species;
	}

	function treatmentCatalogItems(kind: TreatmentKind): CatalogItem[] {
		return catalogItemsByKind[kind];
	}

	function setTreatmentCatalogItems(kind: TreatmentKind, items: TreatmentCatalogItem[]) {
		catalogItemsByKind = { ...catalogItemsByKind, [kind]: sortedTreatmentCatalogItems(items) };
	}

	function itemMatchesSpecies(kind: TreatmentProtocolKind, itemId: TreatmentCatalogItemId, species: KnownPetSpecies[]): boolean {
		return catalogItems(kind).some((item) => item.id === itemId && speciesOverlap(item.species, species));
	}

	function setNewProtocolSpecies(species: KnownPetSpecies) {
		const nextSpecies = toggleSpeciesDraft(newProtocolSpecies, species, true);
		newProtocolSpecies = nextSpecies;
		newProtocolItemIds = newProtocolItemIds.filter((itemId) => itemMatchesSpecies(newProtocolKind, itemId, nextSpecies));
	}

	function setProtocolSpecies(protocol: TreatmentProtocol, species: KnownPetSpecies) {
		const nextSpecies = toggleSpeciesDraft(protocolDraftSpeciesValue(protocol), species, true);
		protocolDraftSpecies = { ...protocolDraftSpecies, [protocol.id]: nextSpecies };
		protocolDraftItemIds = { ...protocolDraftItemIds, [protocol.id]: selectedItemIds(protocol).filter((itemId) => itemMatchesSpecies(protocol.kind, itemId, nextSpecies)) };
	}

	function kindOptions() {
		return [
			{ value: 'vaccine' as const, label: t('protocol.kind.vaccine') },
			{ value: 'antiparasitic' as const, label: t('protocol.kind.antiparasitic') }
		];
	}

	function catalogItems(kind: TreatmentProtocolKind): CatalogItem[] {
		return treatmentCatalogItems(kind);
	}

	function visibleCatalogItems(kind: TreatmentProtocolKind): CatalogItem[] {
		return catalogItems(kind).filter((item) => !item.hiddenAt);
	}

	function speciesOverlap(left: KnownPetSpecies[], right: KnownPetSpecies[]): boolean {
		return left.some((species) => right.includes(species));
	}

	function visibleCatalogItemsForSpecies(kind: TreatmentProtocolKind, species: KnownPetSpecies[]): CatalogItem[] {
		if (species.length === 0) return [];
		return sortedCatalogItems(visibleCatalogItems(kind).filter((item) => speciesOverlap(item.species, species)));
	}

	function protocolCatalogItems(protocol: TreatmentProtocol): CatalogItem[] {
		if (!canEditTreatmentProtocol(protocol)) {
			const linkedItemIds = new Set(protocol.items.map((item) => item.id));
			return sortedCatalogItems(catalogItems(protocol.kind).filter((item) => linkedItemIds.has(item.id)));
		}

		const species = protocolDraftSpeciesValue(protocol);
		if (species.length === 0) return [];
		return sortedCatalogItems(catalogItems(protocol.kind).filter((item) => speciesOverlap(item.species, species)));
	}

	function visibleNewProtocolItemIds(): Set<TreatmentCatalogItemId> {
		return new Set(newProtocolSelectableItems.map((item) => item.id));
	}

	$effect(() => {
		const visibleIds = visibleNewProtocolItemIds();
		const nextItemIds = newProtocolItemIds.filter((itemId) => visibleIds.has(itemId));
		if (nextItemIds.length !== newProtocolItemIds.length) newProtocolItemIds = nextItemIds;
	});

	function kindLabel(kind: TreatmentProtocolKind): string {
		return kind === 'vaccine' ? t('protocol.kind.vaccine') : t('protocol.kind.antiparasitic');
	}

	function protocolDraftName(protocol: TreatmentProtocol): string {
		return protocolDraftNames[protocol.id] ?? protocol.name;
	}

	function protocolDraftObservation(protocol: TreatmentProtocol): string {
		return protocolDraftObservations[protocol.id] ?? protocol.observation ?? '';
	}

	function selectedItemIds(protocol: TreatmentProtocol): TreatmentCatalogItemId[] {
		return protocolDraftItemIds[protocol.id] ?? protocol.items.map((item) => item.id);
	}

	function syncProtocolDraft(protocol: TreatmentProtocol) {
		protocolDraftNames = { ...protocolDraftNames, [protocol.id]: protocol.name };
		protocolDraftSpecies = { ...protocolDraftSpecies, [protocol.id]: protocol.species };
		protocolDraftObservations = { ...protocolDraftObservations, [protocol.id]: protocol.observation ?? '' };
		protocolDraftItemIds = { ...protocolDraftItemIds, [protocol.id]: protocol.items.map((item) => item.id) };

		for (const dose of protocol.doses) syncDoseDraft(dose);
		newDoseValidityValues = { ...newDoseValidityValues, [protocol.id]: newDoseValidityValues[protocol.id] ?? 12 };
		newDoseValidityUnits = { ...newDoseValidityUnits, [protocol.id]: newDoseValidityUnits[protocol.id] ?? 'months' };
	}

	function syncDoseDraft(dose: TreatmentProtocolDose) {
		doseDraftDoses = { ...doseDraftDoses, [dose.id]: dose.dose };
		doseDraftValidityValues = { ...doseDraftValidityValues, [dose.id]: dose.validityValue };
		doseDraftValidityUnits = { ...doseDraftValidityUnits, [dose.id]: dose.validityUnit };
	}

	function upsertProtocol(protocol: TreatmentProtocol) {
		protocols = sortedProtocols([...protocols.filter((item) => item.id !== protocol.id), protocol]);
		syncProtocolDraft(protocol);
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'treatment_protocol_system_item') errorKey = 'medication.systemItemReadOnly';
		else if (exception instanceof Error && exception.message === 'protocol_name_required') errorKey = 'protocol.nameRequired';
		else if (exception instanceof Error && exception.message === 'protocol_item_required') errorKey = 'protocol.itemRequired';
		else if (exception instanceof Error && exception.message === 'protocol_dose_required') errorKey = 'protocol.doseRequired';
		else if (exception instanceof Error && exception.message === 'protocol_validity_required') errorKey = 'protocol.validityRequired';
		else errorKey = 'protocol.saveFailed';
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const [loadedCatalogItems, loadedProtocols] = await Promise.all([Promise.all(treatmentKinds.map((kind) => loadTreatmentCatalogItems(kind, true))), loadTreatmentProtocols(undefined, true)]);
			for (const [index, kind] of treatmentKinds.entries()) {
				const items = loadedCatalogItems[index] ?? [];
				setTreatmentCatalogItems(kind, items);
			}
			protocols = sortedProtocols(loadedProtocols);
			for (const protocol of protocols) syncProtocolDraft(protocol);
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNewProtocol(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocol({ kind: newProtocolKind, name: newProtocolName, species: newProtocolSpecies, catalogItemIds: newProtocolItemIds, observation: newProtocolObservation || null });
			upsertProtocol(saved);
			newProtocolName = '';
			newProtocolSpecies = defaultSpeciesDraft();
			newProtocolObservation = '';
			newProtocolItemIds = [];
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingProtocol(protocol: TreatmentProtocol) {
		if (!canEditTreatmentProtocol(protocol)) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocol(
				{
					kind: protocol.kind,
					name: protocolDraftName(protocol),
					species: protocolDraftSpeciesValue(protocol),
					catalogItemIds: selectedItemIds(protocol),
					observation: protocolDraftObservation(protocol) || null
				},
				protocol.id
			);
			upsertProtocol(saved);
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function toggleProtocolHidden(protocol: TreatmentProtocol) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setProtocolHidden(protocol.id, !protocol.hiddenAt);
			upsertProtocol(saved);
			statusKey = saved.hiddenAt ? 'protocol.hiddenSaved' : 'protocol.shownSaved';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	function deleteProtocol(protocol: TreatmentProtocol) {
		if (saving || !canDeleteTreatmentProtocol(protocol)) return;
		protocolPendingRemoval = protocol;
	}

	async function confirmProtocolRemoval() {
		const protocol = protocolPendingRemoval;
		if (!protocol || saving || !canDeleteTreatmentProtocol(protocol)) return;

		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeProtocol(protocol.id);
			protocols = protocols.filter((item) => item.id !== protocol.id);
			protocolPendingRemoval = null;
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	function cancelProtocolRemoval() {
		if (!saving) protocolPendingRemoval = null;
	}

	function toggleNewProtocolItem(itemId: TreatmentCatalogItemId) {
		if (!visibleNewProtocolItemIds().has(itemId)) return;
		newProtocolItemIds = newProtocolItemIds.includes(itemId) ? newProtocolItemIds.filter((id) => id !== itemId) : [...newProtocolItemIds, itemId];
	}

	function handleNewProtocolKindChange(kind: TreatmentProtocolKind) {
		newProtocolKind = kind;
		newProtocolItemIds = [];
	}

	function toggleProtocolItem(protocol: TreatmentProtocol, itemId: TreatmentCatalogItemId) {
		if (!canEditTreatmentProtocol(protocol)) return;
		const selected = selectedItemIds(protocol);
		if (!selected.includes(itemId) && !itemMatchesSpecies(protocol.kind, itemId, protocolDraftSpeciesValue(protocol))) return;
		protocolDraftItemIds = {
			...protocolDraftItemIds,
			[protocol.id]: selected.includes(itemId) ? selected.filter((id) => id !== itemId) : [...selected, itemId]
		};
	}

	function setProtocolObservation(protocol: TreatmentProtocol, value: string) {
		if (!canEditTreatmentProtocol(protocol)) return;
		protocolDraftObservations = { ...protocolDraftObservations, [protocol.id]: value };
	}

	function setNewDose(protocolId: TreatmentProtocolId, value: string) {
		newDoseDoses = { ...newDoseDoses, [protocolId]: value };
	}

	function setNewDoseValidity(protocolId: TreatmentProtocolId, value: number, unit: TreatmentProtocolValidityUnit) {
		newDoseValidityValues = { ...newDoseValidityValues, [protocolId]: value };
		newDoseValidityUnits = { ...newDoseValidityUnits, [protocolId]: unit };
	}

	function setDoseValidity(doseId: number, value: number, unit: TreatmentProtocolValidityUnit) {
		doseDraftValidityValues = { ...doseDraftValidityValues, [doseId]: value };
		doseDraftValidityUnits = { ...doseDraftValidityUnits, [doseId]: unit };
	}

	async function addProtocolDose(event: SubmitEvent, protocol: TreatmentProtocol) {
		event.preventDefault();
		if (!canEditTreatmentProtocol(protocol)) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocolDose(protocol.id, {
				dose: newDoseDoses[protocol.id] ?? '',
				validityValue: newDoseValidityValues[protocol.id] ?? 12,
				validityUnit: newDoseValidityUnits[protocol.id] ?? 'months'
			});
			upsertProtocol(saved);
			newDoseDoses = { ...newDoseDoses, [protocol.id]: '' };
			newDoseValidityValues = { ...newDoseValidityValues, [protocol.id]: 12 };
			newDoseValidityUnits = { ...newDoseValidityUnits, [protocol.id]: 'months' };
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingProtocolDose(event: SubmitEvent, protocol: TreatmentProtocol, dose: TreatmentProtocolDose) {
		event.preventDefault();
		if (!canEditTreatmentProtocol(protocol)) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveProtocolDose(
				protocol.id,
				{
					dose: doseDraftDoses[dose.id] ?? dose.dose,
					validityValue: doseDraftValidityValues[dose.id] ?? dose.validityValue,
					validityUnit: doseDraftValidityUnits[dose.id] ?? dose.validityUnit
				},
				dose.id
			);
			upsertProtocol(saved);
			statusKey = 'protocol.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function deleteProtocolDose(protocol: TreatmentProtocol, dose: TreatmentProtocolDose) {
		if (!canEditTreatmentProtocol(protocol)) return;
		if (!window.confirm(t('protocol.doseDeleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await removeProtocolDose(protocol.id, dose.id);
			upsertProtocol(saved);
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'protocol.saveFailed';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.protocols.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('settings.protocols.title')}</h2>
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
					<ScrollText class="size-5" />
				</span>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold">{t('protocol.title')}</h3>
					<form class="mt-4 grid gap-3 lg:grid-cols-[12rem_minmax(0,1fr)]" onsubmit={submitNewProtocol}>
						<div class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<label for="new-protocol-kind">{t('protocol.kind')}</label>
							<Select id="new-protocol-kind" bind:value={newProtocolKind} options={kindOptions()} onchange={handleNewProtocolKindChange} />
						</div>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('protocol.name')}</span>
								<CharacterLimitHint value={newProtocolName} max={FIELD_LIMITS.treatmentProtocolName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" bind:value={newProtocolName} maxlength={FIELD_LIMITS.treatmentProtocolName} required />
						</label>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('medication.species')}</span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={newProtocolSpecies.includes(option.id)} onchange={() => setNewProtocolSpecies(option.id)} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('protocol.items')}</span>
							<div class="flex flex-wrap gap-2">
								{#each newProtocolSelectableItems as item (item.id)}
									<button type="button" class="inline-flex h-8 max-w-full items-center rounded-md border px-3 text-sm transition-colors {newProtocolItemIds.includes(item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'}" aria-pressed={newProtocolItemIds.includes(item.id)} onclick={() => toggleNewProtocolItem(item.id)}>
										<span class="truncate">{item.name}</span>
									</button>
								{:else}
									<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.noItems')}</p>
								{/each}
							</div>
						</div>

						<div class="lg:col-span-2 flex min-w-0 flex-col gap-1 text-sm font-medium">
							<label for="new-protocol-observation">{t('protocol.observation')}</label>
							<Textarea id="new-protocol-observation" bind:value={newProtocolObservation} ariaLabel={t('protocol.observation')} maxLength={FIELD_LIMITS.treatmentObservation} class="min-h-24" />
						</div>

						<button type="submit" class="lg:col-span-2 inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
							<Plus class="size-4" />
							{t('protocol.add')}
						</button>
					</form>
				</div>
			</div>

			<div class="mt-5 flex flex-col gap-4">
				{#if loading}
					<div class="h-32 animate-pulse rounded-md bg-muted"></div>
				{:else}
					{#each protocols as protocol (protocol.id)}
						<div class="rounded-md border border-border bg-background p-3">
							<form class="grid gap-3 lg:grid-cols-[8rem_minmax(0,1fr)_auto_auto_auto] lg:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingProtocol(protocol); }}>
								<p class="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-medium text-muted-foreground">{kindLabel(protocol.kind)}</p>
								<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
									<span class="flex min-w-0 items-baseline justify-between gap-2">
										<span>{t('protocol.name')}</span>
										<CharacterLimitHint value={protocolDraftName(protocol)} max={FIELD_LIMITS.treatmentProtocolName} />
									</span>
									<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-70" value={protocolDraftName(protocol)} maxlength={FIELD_LIMITS.treatmentProtocolName} required disabled={!canEditTreatmentProtocol(protocol)} oninput={(event) => (protocolDraftNames = { ...protocolDraftNames, [protocol.id]: inputValue(event) })} />
								</label>
								{#if canEditTreatmentProtocol(protocol)}
									<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
										<Save class="size-4" />
										{t('actions.save')}
									</button>
								{/if}
								<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={protocol.hiddenAt ? t('protocol.show') : t('protocol.hide')} onclick={() => void toggleProtocolHidden(protocol)}>
									{#if protocol.hiddenAt}
										<Eye class="size-4" />
										{t('protocol.show')}
									{:else}
										<EyeOff class="size-4" />
										{t('protocol.hide')}
									{/if}
								</button>
								{#if canDeleteTreatmentProtocol(protocol)}
									<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteProtocol(protocol)}>
										<Trash2 class="size-4" />
										{t('actions.delete')}
									</button>
								{/if}

								<div class="lg:col-span-full flex min-w-0 flex-col gap-2 text-sm font-medium">
									<span>{t('medication.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(protocolDraftSpeciesValue(protocol))}</span></span>
									<div class="flex flex-wrap gap-2">
										{#each petSpeciesOptions as option}
											<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
												<input type="checkbox" class="size-4 accent-primary" checked={protocolDraftSpeciesValue(protocol).includes(option.id)} disabled={!canEditTreatmentProtocol(protocol)} onchange={() => setProtocolSpecies(protocol, option.id)} />
												<span>{t(option.labelKey)}</span>
											</label>
										{/each}
									</div>
								</div>

								<div class="lg:col-span-full flex min-w-0 flex-col gap-2 text-sm font-medium">
									<span>{t('protocol.items')}</span>
									<div class="flex flex-wrap gap-2">
										{#each protocolCatalogItems(protocol) as item (item.id)}
											{@const selected = selectedItemIds(protocol).includes(item.id)}
											<button type="button" class="inline-flex h-8 max-w-full items-center rounded-md border px-3 text-sm transition-colors disabled:cursor-default {selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-accent'} {item.hiddenAt ? 'opacity-60' : ''}" aria-pressed={selected} disabled={!canEditTreatmentProtocol(protocol)} onclick={() => toggleProtocolItem(protocol, item.id)}>
												<span class="truncate">{item.name}</span>
											</button>
										{:else}
											<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.noItems')}</p>
										{/each}
									</div>
								</div>

								<div class="lg:col-span-full flex min-w-0 flex-col gap-1 text-sm font-medium">
									<label for={`protocol-observation-${protocol.id}`}>{t('protocol.observation')}</label>
									<Textarea id={`protocol-observation-${protocol.id}`} value={protocolDraftObservation(protocol)} oninput={(value) => setProtocolObservation(protocol, value)} readonly={!canEditTreatmentProtocol(protocol)} ariaLabel={t('protocol.observation')} maxLength={FIELD_LIMITS.treatmentObservation} class="min-h-20" />
								</div>
							</form>

							<div class="mt-4 border-t border-border pt-4">
								<h4 class="text-sm font-semibold">{t('protocol.doseTitle')}</h4>
								{#if canEditTreatmentProtocol(protocol)}
									<form class="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto] lg:items-end" onsubmit={(event) => void addProtocolDose(event, protocol)}>
										<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
											<span>{t('protocol.doseText')}</span>
											<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newDoseDoses[protocol.id] ?? ''} maxlength={FIELD_LIMITS.treatmentDose} required oninput={(event) => setNewDose(protocol.id, inputValue(event))} />
										</label>
										<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
											<span>{t('protocol.doseValidity')}</span>
											<PeriodField value={newDoseValidityValues[protocol.id] ?? 12} unit={newDoseValidityUnits[protocol.id] ?? 'months'} ariaLabel={t('protocol.doseValidity')} onChange={(value, unit) => setNewDoseValidity(protocol.id, value, unit)} />
										</label>
										<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50" disabled={saving}>
											<Plus class="size-4" />
											{t('protocol.doseAdd')}
										</button>
									</form>
								{/if}

								<div class="mt-3 flex flex-col gap-3">
									{#each protocol.doses as protocolDose (protocolDose.id)}
										<form class="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto_auto] lg:items-end" onsubmit={(event) => void saveExistingProtocolDose(event, protocol, protocolDose)}>
											<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
												<span>{t('protocol.doseText')}</span>
												<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-70" value={doseDraftDoses[protocolDose.id] ?? protocolDose.dose} maxlength={FIELD_LIMITS.treatmentDose} required disabled={!canEditTreatmentProtocol(protocol)} oninput={(event) => (doseDraftDoses = { ...doseDraftDoses, [protocolDose.id]: inputValue(event) })} />
											</label>
											<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
												<span>{t('protocol.doseValidity')}</span>
												<PeriodField value={doseDraftValidityValues[protocolDose.id] ?? protocolDose.validityValue} unit={doseDraftValidityUnits[protocolDose.id] ?? protocolDose.validityUnit} disabled={!canEditTreatmentProtocol(protocol)} ariaLabel={t('protocol.doseValidity')} onChange={(value, unit) => setDoseValidity(protocolDose.id, value, unit)} />
											</label>
											{#if canEditTreatmentProtocol(protocol)}
												<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
													<Save class="size-4" />
													{t('actions.save')}
												</button>
												<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteProtocolDose(protocol, protocolDose)}>
													<Trash2 class="size-4" />
													{t('actions.delete')}
												</button>
											{/if}
										</form>
									{:else}
										<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.doseEmpty')}</p>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('protocol.empty')}</p>
					{/each}
				{/if}
			</div>
		</section>
</section>

<TrashRemovalDialog open={protocolPendingRemoval !== null} messageKey="protocol.deleteConfirm" confirming={saving} onConfirm={() => void confirmProtocolRemoval()} onCancel={cancelProtocolRemoval} />
