<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import MedicationRegionsField from '$lib/components/medication/MedicationRegionsField.svelte';
	import { petSpeciesOptions, type KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { canDeleteMedicationCatalogItem, canEditMedicationCatalogItem } from '$lib/domain/medication/catalog.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { TREATMENT_KINDS, type TreatmentCatalogItem, type TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadTreatmentCatalogItems, removeTreatmentCatalogName, saveTreatmentCatalogName, setTreatmentCatalogNameHidden } from '$lib/services/treatment.service.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Pill from '@lucide/svelte/icons/pill';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type TreatmentSettingsTab = 'vaccines' | 'antiparasitics';
	type CatalogItem = TreatmentCatalogItem;

	interface CatalogSectionConfig {
		tab: TreatmentSettingsTab;
		tabLabel: TranslationKey;
		title: TranslationKey;
		nameLabel: TranslationKey;
		addLabel: TranslationKey;
		showLabel: TranslationKey;
		hideLabel: TranslationKey;
		emptyLabel: TranslationKey;
		deleteConfirm: TranslationKey;
		savedStatus: TranslationKey;
		hiddenStatus: TranslationKey;
		shownStatus: TranslationKey;
		saveFailed: TranslationKey;
	}

	interface CatalogDrafts {
		names: Record<number, string>;
		aliases: Record<number, string>;
		manufacturers: Record<number, string>;
		regions: Record<number, string[]>;
		species: Record<number, KnownPetSpecies[]>;
	}

	interface NewCatalogDraft {
		name: string;
		aliases: string;
		manufacturer: string;
		regions: string[];
		species: KnownPetSpecies[];
	}

	const treatmentKinds = TREATMENT_KINDS;

	const catalogSectionConfigs: Record<TreatmentKind, CatalogSectionConfig> = {
		vaccine: {
			tab: 'vaccines',
			tabLabel: 'vaccine.catalog.tab.vaccines',
			title: 'vaccine.list.title',
			nameLabel: 'vaccine.name',
			addLabel: 'vaccine.list.add',
			showLabel: 'vaccine.list.show',
			hideLabel: 'vaccine.list.hide',
			emptyLabel: 'vaccine.emptyVaccines',
			deleteConfirm: 'vaccine.list.deleteConfirm',
			savedStatus: 'vaccine.saved',
			hiddenStatus: 'vaccine.hiddenSaved',
			shownStatus: 'vaccine.shownSaved',
			saveFailed: 'vaccine.saveFailed'
		},
		antiparasitic: {
			tab: 'antiparasitics',
			tabLabel: 'antiparasiticTreatment.catalog.tab.antiparasitics',
			title: 'antiparasiticTreatment.list.title',
			nameLabel: 'antiparasiticTreatment.name',
			addLabel: 'antiparasiticTreatment.list.add',
			showLabel: 'antiparasiticTreatment.list.show',
			hideLabel: 'antiparasiticTreatment.list.hide',
			emptyLabel: 'antiparasiticTreatment.emptyAntiparasitics',
			deleteConfirm: 'antiparasiticTreatment.list.deleteConfirm',
			savedStatus: 'antiparasiticTreatment.saved',
			hiddenStatus: 'antiparasiticTreatment.hiddenSaved',
			shownStatus: 'antiparasiticTreatment.shownSaved',
			saveFailed: 'antiparasiticTreatment.saveFailed'
		}
	};

	const tabs: { id: TreatmentSettingsTab; labelKey: TranslationKey }[] = [
		...treatmentKinds.map((kind) => ({ id: catalogSectionConfigs[kind].tab, labelKey: catalogSectionConfigs[kind].tabLabel }))
	];

	let catalogItemsByKind = $state<Record<TreatmentKind, TreatmentCatalogItem[]>>({
		vaccine: [],
		antiparasitic: []
	});
	let catalogDrafts = $state<Record<TreatmentKind, CatalogDrafts>>({
		vaccine: emptyCatalogDrafts(),
		antiparasitic: emptyCatalogDrafts()
	});
	let newCatalogDrafts = $state<Record<TreatmentKind, NewCatalogDraft>>({
		vaccine: createNewCatalogDraft(),
		antiparasitic: createNewCatalogDraft()
	});
	let activeTab = $state<TreatmentSettingsTab>('vaccines');
	let loading = $state(true);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);
	let selectedCatalogKind = $derived(catalogKindForTab(activeTab));

	function sortedTreatmentCatalogItems(source: TreatmentCatalogItem[]): TreatmentCatalogItem[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name));
	}

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function defaultSpeciesDraft(): KnownPetSpecies[] {
		return petSpeciesOptions.map((option) => option.id);
	}

	function emptyCatalogDrafts(): CatalogDrafts {
		return {
			names: {},
			aliases: {},
			manufacturers: {},
			regions: {},
			species: {}
		};
	}

	function createNewCatalogDraft(): NewCatalogDraft {
		return {
			name: '',
			aliases: '',
			manufacturer: '',
			regions: ['BRA'],
			species: defaultSpeciesDraft()
		};
	}

	function parseAliases(value: string): string[] {
		return value
			.split(',')
			.map((alias) => alias.trim())
			.filter(Boolean);
	}

	function aliasDraft(aliases: string[]): string {
		return aliases.join(', ');
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

	function catalogSectionConfig(kind: TreatmentKind): CatalogSectionConfig {
		return catalogSectionConfigs[kind];
	}

	function catalogKindForTab(tab: TreatmentSettingsTab): TreatmentKind {
		if (tab === 'vaccines') return 'vaccine';
		return 'antiparasitic';
	}

	function activeCatalogKind(): TreatmentKind {
		return catalogKindForTab(activeTab);
	}

	function treatmentCatalogItems(kind: TreatmentKind): CatalogItem[] {
		return catalogItemsByKind[kind];
	}

	function setTreatmentCatalogItems(kind: TreatmentKind, items: TreatmentCatalogItem[]) {
		catalogItemsByKind = { ...catalogItemsByKind, [kind]: sortedTreatmentCatalogItems(items) };
	}

	function buildCatalogDrafts(items: TreatmentCatalogItem[]): CatalogDrafts {
		return {
			names: Object.fromEntries(items.map((item) => [item.id, item.name])),
			aliases: Object.fromEntries(items.map((item) => [item.id, aliasDraft(item.aliases)])),
			manufacturers: Object.fromEntries(items.map((item) => [item.id, item.manufacturer ?? ''])),
			regions: Object.fromEntries(items.map((item) => [item.id, item.regions])),
			species: Object.fromEntries(items.map((item) => [item.id, item.species]))
		};
	}

	function setCatalogDrafts(kind: TreatmentKind, drafts: CatalogDrafts) {
		catalogDrafts = { ...catalogDrafts, [kind]: drafts };
	}

	function syncCatalogDraft(kind: TreatmentKind, item: TreatmentCatalogItem) {
		const drafts = catalogDrafts[kind];
		setCatalogDrafts(kind, {
			names: { ...drafts.names, [item.id]: item.name },
			aliases: { ...drafts.aliases, [item.id]: aliasDraft(item.aliases) },
			manufacturers: { ...drafts.manufacturers, [item.id]: item.manufacturer ?? '' },
			regions: { ...drafts.regions, [item.id]: item.regions },
			species: { ...drafts.species, [item.id]: item.species }
		});
	}

	function removeCatalogDraft(kind: TreatmentKind, itemId: number) {
		const drafts = catalogDrafts[kind];
		const { [itemId]: _removedName, ...names } = drafts.names;
		const { [itemId]: _removedAliases, ...aliases } = drafts.aliases;
		const { [itemId]: _removedManufacturer, ...manufacturers } = drafts.manufacturers;
		const { [itemId]: _removedRegions, ...regions } = drafts.regions;
		const { [itemId]: _removedSpecies, ...species } = drafts.species;
		setCatalogDrafts(kind, { names, aliases, manufacturers, regions, species });
	}

	function catalogDraftName(kind: TreatmentKind, item: TreatmentCatalogItem): string {
		return catalogDrafts[kind].names[item.id] ?? item.name;
	}

	function catalogDraftAliases(kind: TreatmentKind, item: TreatmentCatalogItem): string {
		return catalogDrafts[kind].aliases[item.id] ?? aliasDraft(item.aliases);
	}

	function catalogDraftManufacturer(kind: TreatmentKind, item: TreatmentCatalogItem): string {
		return catalogDrafts[kind].manufacturers[item.id] ?? item.manufacturer ?? '';
	}

	function catalogDraftRegions(kind: TreatmentKind, item: TreatmentCatalogItem): string[] {
		return catalogDrafts[kind].regions[item.id] ?? item.regions;
	}

	function catalogDraftSpecies(kind: TreatmentKind, item: TreatmentCatalogItem): KnownPetSpecies[] {
		return catalogDrafts[kind].species[item.id] ?? item.species;
	}

	function setCatalogDraftText(kind: TreatmentKind, itemId: number, field: 'names' | 'aliases' | 'manufacturers', value: string) {
		const drafts = catalogDrafts[kind];
		setCatalogDrafts(kind, {
			...drafts,
			[field]: { ...drafts[field], [itemId]: value }
		});
	}

	function setCatalogDraftRegions(kind: TreatmentKind, itemId: number, regions: string[]) {
		const drafts = catalogDrafts[kind];
		setCatalogDrafts(kind, {
			...drafts,
			regions: { ...drafts.regions, [itemId]: regions }
		});
	}

	function setCatalogDraftSpecies(kind: TreatmentKind, item: TreatmentCatalogItem, species: KnownPetSpecies) {
		const drafts = catalogDrafts[kind];
		setCatalogDrafts(kind, {
			...drafts,
			species: { ...drafts.species, [item.id]: toggleSpeciesDraft(catalogDraftSpecies(kind, item), species) }
		});
	}

	function setNewCatalogDraft(kind: TreatmentKind, draft: NewCatalogDraft) {
		newCatalogDrafts = { ...newCatalogDrafts, [kind]: draft };
	}

	function setNewCatalogDraftText(kind: TreatmentKind, field: 'name' | 'aliases' | 'manufacturer', value: string) {
		setNewCatalogDraft(kind, { ...newCatalogDrafts[kind], [field]: value });
	}

	function setNewCatalogDraftRegions(kind: TreatmentKind, regions: string[]) {
		setNewCatalogDraft(kind, { ...newCatalogDrafts[kind], regions });
	}

	function toggleNewCatalogDraftSpecies(kind: TreatmentKind, species: KnownPetSpecies) {
		const draft = newCatalogDrafts[kind];
		setNewCatalogDraft(kind, { ...draft, species: toggleSpeciesDraft(draft.species, species) });
	}

	function itemCount(tab: TreatmentSettingsTab): number {
		return treatmentCatalogItems(catalogKindForTab(tab)).length;
	}

	function upsertCatalogItem(kind: TreatmentKind, item: TreatmentCatalogItem) {
		setTreatmentCatalogItems(kind, [...treatmentCatalogItems(kind).filter((current) => current.id !== item.id && current.normalizedName !== item.normalizedName), item]);
		syncCatalogDraft(kind, item);
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'medication_catalog_system_item') errorKey = 'medication.systemItemReadOnly';
		else if (exception instanceof Error && exception.message === 'treatment_name_required') errorKey = activeCatalogKind() === 'antiparasitic' ? 'antiparasiticTreatment.nameRequired' : 'vaccine.nameRequired';
		else errorKey = catalogSectionConfig(activeCatalogKind()).saveFailed;
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const loadedCatalogItems = await Promise.all(treatmentKinds.map((kind) => loadTreatmentCatalogItems(kind, true)));
			for (const [index, kind] of treatmentKinds.entries()) {
				const items = loadedCatalogItems[index] ?? [];
				setTreatmentCatalogItems(kind, items);
				setCatalogDrafts(kind, buildCatalogDrafts(items));
			}
		} catch {
			errorKey = catalogSectionConfig(activeCatalogKind()).saveFailed;
		} finally {
			loading = false;
		}
	}

	async function submitNewCatalogItem(event: SubmitEvent, kind: TreatmentKind) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const draft = newCatalogDrafts[kind];
			const saved = await saveTreatmentCatalogName(kind, {
				name: draft.name,
				species: draft.species,
				aliases: parseAliases(draft.aliases),
				manufacturer: draft.manufacturer,
				regions: draft.regions
			});
			upsertCatalogItem(kind, saved);
			setNewCatalogDraft(kind, createNewCatalogDraft());
			statusKey = catalogSectionConfig(kind).savedStatus;
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingCatalogItem(kind: TreatmentKind, item: TreatmentCatalogItem) {
		if (!canEditMedicationCatalogItem(item)) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveTreatmentCatalogName(
				kind,
				{
					name: catalogDraftName(kind, item),
					species: catalogDraftSpecies(kind, item),
					aliases: parseAliases(catalogDraftAliases(kind, item)),
					manufacturer: catalogDraftManufacturer(kind, item),
					regions: catalogDraftRegions(kind, item)
				},
				item.id
			);
			upsertCatalogItem(kind, saved);
			statusKey = catalogSectionConfig(kind).savedStatus;
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function toggleCatalogItemHidden(kind: TreatmentKind, item: TreatmentCatalogItem) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setTreatmentCatalogNameHidden(kind, item.id, !item.hiddenAt);
			upsertCatalogItem(kind, saved);
			const config = catalogSectionConfig(kind);
			statusKey = saved.hiddenAt ? config.hiddenStatus : config.shownStatus;
		} catch {
			errorKey = catalogSectionConfig(kind).saveFailed;
		} finally {
			saving = false;
		}
	}

	async function deleteCatalogItem(kind: TreatmentKind, item: TreatmentCatalogItem) {
		if (!canDeleteMedicationCatalogItem(item)) return;
		const config = catalogSectionConfig(kind);
		if (!window.confirm(t(config.deleteConfirm))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeTreatmentCatalogName(kind, item.id);
			setTreatmentCatalogItems(kind, treatmentCatalogItems(kind).filter((current) => current.id !== item.id));
			removeCatalogDraft(kind, item.id);
			statusKey = 'status.deleted';
		} catch {
			errorKey = config.saveFailed;
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.medications.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('settings.medications.title')}</h2>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<div class="grid grid-cols-1 gap-1 rounded-md border border-border bg-muted p-1 sm:grid-cols-2" role="tablist" aria-label={t('vaccine.catalog.tabs')}>
		{#each tabs as tab}
			{@const count = itemCount(tab.id)}
			<button class="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-sm px-3 text-sm font-medium transition-colors {activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'}" type="button" role="tab" aria-selected={activeTab === tab.id} onclick={() => (activeTab = tab.id)}>
				<span class="truncate">{t(tab.labelKey)}</span>
				<span class="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold {count > 0 ? (activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary') : 'bg-background/70 text-muted-foreground'}">{count}</span>
			</button>
		{/each}
	</div>

	{#if selectedCatalogKind}
		{@const activeKind = selectedCatalogKind}
		{@const config = catalogSectionConfig(activeKind)}
		{@const newDraft = newCatalogDrafts[activeKind]}
		<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="flex items-start gap-3">
				<span class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
					{#if activeKind === 'vaccine'}
						<Syringe class="size-5" />
					{:else}
						<Pill class="size-5" />
					{/if}
				</span>
				<div class="min-w-0 flex-1">
					<h3 class="text-base font-semibold">{t(config.title)}</h3>
					<form class="mt-4 grid gap-3 lg:grid-cols-2 lg:items-start" onsubmit={(event) => void submitNewCatalogItem(event, activeKind)}>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t(config.nameLabel)}</span>
								<CharacterLimitHint value={newDraft.name} max={FIELD_LIMITS.treatmentName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newDraft.name} maxlength={FIELD_LIMITS.treatmentName} required oninput={(event) => setNewCatalogDraftText(activeKind, 'name', inputValue(event))} />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('medication.manufacturer')}</span>
								<CharacterLimitHint value={newDraft.manufacturer} max={FIELD_LIMITS.medicationManufacturer} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newDraft.manufacturer} maxlength={FIELD_LIMITS.medicationManufacturer} oninput={(event) => setNewCatalogDraftText(activeKind, 'manufacturer', inputValue(event))} />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('medication.aliases')}</span>
								<CharacterLimitHint value={newDraft.aliases} max={FIELD_LIMITS.medicationAliasesJson} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newDraft.aliases} maxlength={FIELD_LIMITS.medicationAliasesJson} placeholder={t('medication.aliasesPlaceholder')} oninput={(event) => setNewCatalogDraftText(activeKind, 'aliases', inputValue(event))} />
						</label>
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('medication.species')}</span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={newDraft.species.includes(option.id)} onchange={() => toggleNewCatalogDraftSpecies(activeKind, option.id)} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium">
							<span>{t('medication.regions')}</span>
							<MedicationRegionsField id={`new-${activeKind}-regions`} value={newDraft.regions} disabled={saving} onchange={(regions) => setNewCatalogDraftRegions(activeKind, regions)} />
						</div>
						<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 lg:col-span-2" disabled={saving}>
							<Plus class="size-4" />
							{t(config.addLabel)}
						</button>
					</form>
				</div>
			</div>

			<div class="mt-4 flex flex-col gap-3">
				{#if loading}
					<div class="h-28 animate-pulse rounded-md bg-muted"></div>
				{:else}
					{#each treatmentCatalogItems(activeKind) as item (item.id)}
						<form class="grid gap-3 rounded-md border border-border bg-background p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] xl:items-start" onsubmit={(event) => { event.preventDefault(); void saveExistingCatalogItem(activeKind, item); }}>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t(config.nameLabel)}</span>
									<CharacterLimitHint value={catalogDraftName(activeKind, item)} max={FIELD_LIMITS.treatmentName} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftName(activeKind, item)} maxlength={FIELD_LIMITS.treatmentName} disabled={!canEditMedicationCatalogItem(item)} required oninput={(event) => setCatalogDraftText(activeKind, item.id, 'names', inputValue(event))} />
							</label>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('medication.manufacturer')}</span>
									<CharacterLimitHint value={catalogDraftManufacturer(activeKind, item)} max={FIELD_LIMITS.medicationManufacturer} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftManufacturer(activeKind, item)} maxlength={FIELD_LIMITS.medicationManufacturer} disabled={!canEditMedicationCatalogItem(item)} oninput={(event) => setCatalogDraftText(activeKind, item.id, 'manufacturers', inputValue(event))} />
							</label>
							<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
								<span class="flex min-w-0 items-baseline justify-between gap-2">
									<span>{t('medication.aliases')}</span>
									<CharacterLimitHint value={catalogDraftAliases(activeKind, item)} max={FIELD_LIMITS.medicationAliasesJson} />
								</span>
								<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftAliases(activeKind, item)} maxlength={FIELD_LIMITS.medicationAliasesJson} placeholder={t('medication.aliasesPlaceholder')} disabled={!canEditMedicationCatalogItem(item)} oninput={(event) => setCatalogDraftText(activeKind, item.id, 'aliases', inputValue(event))} />
							</label>
							{#if canEditMedicationCatalogItem(item)}
								<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
									<Save class="size-4" />
									{t('actions.save')}
								</button>
							{/if}
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={item.hiddenAt ? t(config.showLabel) : t(config.hideLabel)} onclick={() => void toggleCatalogItemHidden(activeKind, item)}>
								{#if item.hiddenAt}
									<Eye class="size-4" />
									{t(config.showLabel)}
								{:else}
									<EyeOff class="size-4" />
									{t(config.hideLabel)}
								{/if}
							</button>
							{#if canDeleteMedicationCatalogItem(item)}
								<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteCatalogItem(activeKind, item)}>
									<Trash2 class="size-4" />
									{t('actions.delete')}
								</button>
							{/if}
							<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-3">
								<span>{t('medication.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(catalogDraftSpecies(activeKind, item))}</span></span>
								<div class="flex flex-wrap gap-2">
									{#each petSpeciesOptions as option}
										<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
											<input type="checkbox" class="size-4 accent-primary" checked={catalogDraftSpecies(activeKind, item).includes(option.id)} disabled={!canEditMedicationCatalogItem(item)} onchange={() => setCatalogDraftSpecies(activeKind, item, option.id)} />
											<span>{t(option.labelKey)}</span>
										</label>
									{/each}
								</div>
							</div>
							<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-3">
								<span>{t('medication.regions')}</span>
								<MedicationRegionsField id={`${activeKind}-regions-${item.id}`} value={catalogDraftRegions(activeKind, item)} disabled={saving || !canEditMedicationCatalogItem(item)} onchange={(regions) => setCatalogDraftRegions(activeKind, item.id, regions)} />
							</div>
						</form>
					{:else}
						<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(config.emptyLabel)}</p>
					{/each}
				{/if}
			</div>
		</section>
	{/if}
</section>
