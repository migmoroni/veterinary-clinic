<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterLimitHint from '$lib/components/forms/CharacterLimitHint.svelte';
	import ProductImage from '$lib/components/product/ProductImage.svelte';
	import ProductImageCaptureDialog from '$lib/components/product/ProductImageCaptureDialog.svelte';
	import ProductRegionsField from '$lib/components/product/ProductRegionsField.svelte';
	import { medicationProductTypeLabel, productTypeLabel } from '$lib/domain/product/type-labels.js';
	import ImageCollectionOrganizer from '$lib/components/shared/ImageCollectionOrganizer.svelte';
	import Select, { type SelectOption } from '$lib/components/ui/Select.svelte';
	import type { ImageCollectionItem, ImageCollectionItemInput } from '$lib/domain/image-collection/image-collection.js';
	import { canDeleteProductCatalogItem, canEditProductCatalogItem, PRODUCT_TYPES, productItemMatchesSearch, stringifyProductType, type ProductType } from '$lib/domain/product/catalog.js';
	import { petSpeciesOptions, type KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
	import { FIELD_LIMITS } from '$lib/domain/shared/field-limits.js';
	import { TREATMENT_KINDS, normalizeTreatmentName, type TreatmentCatalogItem, type TreatmentCatalogItemId, type TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadAllTreatmentCatalogItems, removeTreatmentCatalogName, saveTreatmentCatalogImages, saveTreatmentCatalogName, setTreatmentCatalogNameHidden } from '$lib/services/treatment.service.js';
	import Eye from '@lucide/svelte/icons/eye';
	import EyeOff from '@lucide/svelte/icons/eye-off';
	import Images from '@lucide/svelte/icons/images';
	import Plus from '@lucide/svelte/icons/plus';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	type TypeFilter = 'all' | string;
	type CatalogItem = TreatmentCatalogItem;
	type ImageManagerTarget = { kind: TreatmentKind; itemId: TreatmentCatalogItemId | null };

	interface CatalogDrafts {
		kinds: Record<TreatmentCatalogItemId, TreatmentKind>;
		names: Record<TreatmentCatalogItemId, string>;
		aliases: Record<TreatmentCatalogItemId, string>;
		manufacturers: Record<TreatmentCatalogItemId, string>;
		regions: Record<TreatmentCatalogItemId, string[]>;
		species: Record<TreatmentCatalogItemId, KnownPetSpecies[]>;
		images: Record<TreatmentCatalogItemId, ImageCollectionItemInput[]>;
	}

	interface CatalogDraftInput {
		kind: TreatmentKind;
		name: string;
		aliases: string;
		manufacturer: string;
		regions: string[];
		species: KnownPetSpecies[];
		images: ImageCollectionItemInput[];
	}

	const treatmentKinds = TREATMENT_KINDS;

	let catalogItems = $state<CatalogItem[]>([]);
	let catalogDrafts = $state<CatalogDrafts>(emptyCatalogDrafts());
	let newCatalogDraft = $state<CatalogDraftInput>(createNewCatalogDraft());
	let typeFilter = $state<TypeFilter>('all');
	let searchQuery = $state('');
	let loading = $state(true);
	let saving = $state(false);
	let statusKey = $state<TranslationKey | null>(null);
	let errorKey = $state<TranslationKey | null>(null);
	let imageManagerTarget = $state<ImageManagerTarget | null>(null);
	let managedImages = $state<ImageCollectionItemInput[]>([]);
	let imageEditIndex = $state<number | null>(null);
	let imageDialogOpen = $state(false);

	const medicationKindOptions = $derived<SelectOption<TreatmentKind>[]>(treatmentKinds.map((kind) => ({ value: kind, label: medicationKindLabel(kind) })));
	const productTypeFilterOptions = $derived<SelectOption<TypeFilter>[]>([
		{ value: 'all', label: `${t('product.allKinds')} (${filterCount('all')})` },
		...PRODUCT_TYPES.map((type) => ({ value: typeFilterValue(type), label: `${productTypeLabel(type, t)} (${filterCount(typeFilterValue(type))})` }))
	]);
	const filteredCatalogItems = $derived(
		catalogItems.filter((item) => {
			if (typeFilter !== 'all' && stringifyProductType(item.type) !== typeFilter) return false;
			return productItemMatchesSearch(item.name, item.aliases, searchQuery, normalizeTreatmentName) || normalizeTreatmentName(item.manufacturer ?? '').includes(normalizeTreatmentName(searchQuery));
		})
	);
	const newPrimaryImage = $derived(primaryDraftImage(newCatalogDraft.images));

	function inputValue(event: Event): string {
		return (event.currentTarget as HTMLInputElement).value;
	}

	function sortedCatalogItems(source: CatalogItem[]): CatalogItem[] {
		return [...source].sort((first, second) => first.name.localeCompare(second.name) || first.kind.localeCompare(second.kind));
	}

	function medicationKindLabel(kind: TreatmentKind): string {
		return medicationProductTypeLabel(kind, t);
	}

	function typeFilterValue(type: ProductType): string {
		return stringifyProductType(type);
	}

	function filterCount(type: TypeFilter): number {
		if (type === 'all') return catalogItems.length;
		return catalogItems.filter((item) => stringifyProductType(item.type) === type).length;
	}

	function defaultSpeciesDraft(): KnownPetSpecies[] {
		return petSpeciesOptions.map((option) => option.id);
	}

	function emptyCatalogDrafts(): CatalogDrafts {
		return {
			kinds: {},
			names: {},
			aliases: {},
			manufacturers: {},
			regions: {},
			species: {},
			images: {}
		};
	}

	function createNewCatalogDraft(): CatalogDraftInput {
		return {
			kind: 'vaccine',
			name: '',
			aliases: '',
			manufacturer: '',
			regions: ['BRA'],
			species: defaultSpeciesDraft(),
			images: []
		};
	}

	function imageInputs(images: ImageCollectionItem[] = []): ImageCollectionItemInput[] {
		return images.map((image) => ({
			clientId: `saved-${image.id}`,
			imageBytes: image.imageBytes,
			originalImageBytes: image.originalImageBytes,
			description: image.description ?? '',
			isPrimary: image.isPrimary
		}));
	}

	function newImageClientId(): string {
		return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `image-${Date.now()}-${Math.random()}`;
	}

	function primaryDraftImage(images: ImageCollectionItemInput[]): ImageCollectionItemInput | null {
		return images.find((image) => image.isPrimary) ?? images[0] ?? null;
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

	function buildCatalogDrafts(items: CatalogItem[]): CatalogDrafts {
		return {
			kinds: Object.fromEntries(items.map((item) => [item.id, item.kind])),
			names: Object.fromEntries(items.map((item) => [item.id, item.name])),
			aliases: Object.fromEntries(items.map((item) => [item.id, aliasDraft(item.aliases)])),
			manufacturers: Object.fromEntries(items.map((item) => [item.id, item.manufacturer ?? ''])),
			regions: Object.fromEntries(items.map((item) => [item.id, item.regions])),
			species: Object.fromEntries(items.map((item) => [item.id, item.species])),
			images: Object.fromEntries(items.map((item) => [item.id, imageInputs(item.images)]))
		};
	}

	function syncCatalogDraft(item: CatalogItem) {
		catalogDrafts = {
			kinds: { ...catalogDrafts.kinds, [item.id]: item.kind },
			names: { ...catalogDrafts.names, [item.id]: item.name },
			aliases: { ...catalogDrafts.aliases, [item.id]: aliasDraft(item.aliases) },
			manufacturers: { ...catalogDrafts.manufacturers, [item.id]: item.manufacturer ?? '' },
			regions: { ...catalogDrafts.regions, [item.id]: item.regions },
			species: { ...catalogDrafts.species, [item.id]: item.species },
			images: { ...catalogDrafts.images, [item.id]: imageInputs(item.images) }
		};
	}

	function removeCatalogDraft(itemId: TreatmentCatalogItemId) {
		const { [itemId]: _removedKind, ...kinds } = catalogDrafts.kinds;
		const { [itemId]: _removedName, ...names } = catalogDrafts.names;
		const { [itemId]: _removedAliases, ...aliases } = catalogDrafts.aliases;
		const { [itemId]: _removedManufacturer, ...manufacturers } = catalogDrafts.manufacturers;
		const { [itemId]: _removedRegions, ...regions } = catalogDrafts.regions;
		const { [itemId]: _removedSpecies, ...species } = catalogDrafts.species;
		const { [itemId]: _removedImages, ...images } = catalogDrafts.images;
		catalogDrafts = { kinds, names, aliases, manufacturers, regions, species, images };
	}

	function catalogDraftKind(item: CatalogItem): TreatmentKind {
		return catalogDrafts.kinds[item.id] ?? item.kind;
	}

	function catalogDraftName(item: CatalogItem): string {
		return catalogDrafts.names[item.id] ?? item.name;
	}

	function catalogDraftAliases(item: CatalogItem): string {
		return catalogDrafts.aliases[item.id] ?? aliasDraft(item.aliases);
	}

	function catalogDraftManufacturer(item: CatalogItem): string {
		return catalogDrafts.manufacturers[item.id] ?? item.manufacturer ?? '';
	}

	function catalogDraftRegions(item: CatalogItem): string[] {
		return catalogDrafts.regions[item.id] ?? item.regions;
	}

	function catalogDraftSpecies(item: CatalogItem): KnownPetSpecies[] {
		return catalogDrafts.species[item.id] ?? item.species;
	}

	function catalogDraftImages(item: CatalogItem): ImageCollectionItemInput[] {
		return catalogDrafts.images[item.id] ?? imageInputs(item.images);
	}

	function catalogPrimaryImage(item: CatalogItem): ImageCollectionItemInput | null {
		return primaryDraftImage(catalogDraftImages(item));
	}

	function setCatalogDraftKind(itemId: TreatmentCatalogItemId, kind: TreatmentKind) {
		catalogDrafts = { ...catalogDrafts, kinds: { ...catalogDrafts.kinds, [itemId]: kind } };
	}

	function setCatalogDraftText(itemId: TreatmentCatalogItemId, field: 'names' | 'aliases' | 'manufacturers', value: string) {
		catalogDrafts = {
			...catalogDrafts,
			[field]: { ...catalogDrafts[field], [itemId]: value }
		};
	}

	function setCatalogDraftRegions(itemId: TreatmentCatalogItemId, regions: string[]) {
		catalogDrafts = {
			...catalogDrafts,
			regions: { ...catalogDrafts.regions, [itemId]: regions }
		};
	}

	function setCatalogDraftSpecies(item: CatalogItem, species: KnownPetSpecies) {
		catalogDrafts = {
			...catalogDrafts,
			species: { ...catalogDrafts.species, [item.id]: toggleSpeciesDraft(catalogDraftSpecies(item), species) }
		};
	}

	function setNewCatalogDraftText(field: 'name' | 'aliases' | 'manufacturer', value: string) {
		newCatalogDraft = { ...newCatalogDraft, [field]: value };
	}

	function setNewCatalogDraftKind(kind: TreatmentKind) {
		newCatalogDraft = { ...newCatalogDraft, kind };
	}

	function setNewCatalogDraftRegions(regions: string[]) {
		newCatalogDraft = { ...newCatalogDraft, regions };
	}

	function toggleNewCatalogDraftSpecies(species: KnownPetSpecies) {
		newCatalogDraft = { ...newCatalogDraft, species: toggleSpeciesDraft(newCatalogDraft.species, species) };
	}

	function upsertCatalogItem(item: CatalogItem) {
		catalogItems = sortedCatalogItems([...catalogItems.filter((current) => current.id !== item.id && current.normalizedName !== item.normalizedName), item]);
		syncCatalogDraft(item);
	}

	function setFailure(exception: unknown) {
		if (exception instanceof Error && exception.message === 'field_limit_exceeded') errorKey = 'form.limitExceeded';
		else if (exception instanceof Error && exception.message === 'field_required') errorKey = 'form.fieldRequired';
		else if (exception instanceof Error && exception.message === 'image_collection_limit_exceeded') errorKey = 'practiceProfile.imageLimitExceeded';
		else if (exception instanceof Error && exception.message === 'image_collection_primary_required') errorKey = 'practiceProfile.primaryImageRequiredError';
		else if (exception instanceof Error && exception.message === 'product_catalog_system_item') errorKey = 'product.systemItemReadOnly';
		else if (exception instanceof Error && exception.message === 'treatment_name_required') errorKey = 'form.fieldRequired';
		else errorKey = 'product.saveFailed';
	}

	function openNewCatalogImageManager() {
		imageManagerTarget = { kind: newCatalogDraft.kind, itemId: null };
		managedImages = [...newCatalogDraft.images];
		imageEditIndex = null;
		imageDialogOpen = false;
	}

	function openCatalogImageManager(item: CatalogItem) {
		if (!canEditProductCatalogItem(item)) return;

		imageManagerTarget = { kind: catalogDraftKind(item), itemId: item.id };
		managedImages = [...catalogDraftImages(item)];
		imageEditIndex = null;
		imageDialogOpen = false;
	}

	function openManagedImageCapture(index: number | null) {
		imageEditIndex = index;
		imageDialogOpen = true;
	}

	function closeManagedImageCapture() {
		imageDialogOpen = false;
		imageEditIndex = null;
	}

	function applyManagedImage(bytes: Uint8Array, originalBytes: Uint8Array) {
		if (imageEditIndex === null) {
			managedImages = [
				...managedImages,
				{
					clientId: newImageClientId(),
					imageBytes: bytes,
					originalImageBytes: originalBytes,
					description: '',
					isPrimary: managedImages.length === 0
				}
			];
		} else {
			managedImages = managedImages.map((image, index) => (index === imageEditIndex ? { ...image, imageBytes: bytes, originalImageBytes: originalBytes } : image));
		}
		closeManagedImageCapture();
	}

	async function finishImageManager() {
		const target = imageManagerTarget;
		if (!target) return;

		statusKey = null;
		errorKey = null;

		if (target.itemId === null) {
			newCatalogDraft = { ...newCatalogDraft, images: managedImages };
			imageManagerTarget = null;
			managedImages = [];
			return;
		}

		saving = true;
		try {
			const saved = await saveTreatmentCatalogImages(target.kind, target.itemId, managedImages);
			upsertCatalogItem(saved);
			statusKey = 'status.saved';
			imageManagerTarget = null;
			managedImages = [];
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function load() {
		loading = true;
		errorKey = null;

		try {
			const loadedCatalogItems = sortedCatalogItems(await loadAllTreatmentCatalogItems(true, true));
			catalogItems = loadedCatalogItems;
			catalogDrafts = buildCatalogDrafts(loadedCatalogItems);
		} catch {
			errorKey = 'product.saveFailed';
		} finally {
			loading = false;
		}
	}

	async function submitNewCatalogItem(event: SubmitEvent) {
		event.preventDefault();
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			let saved = await saveTreatmentCatalogName(newCatalogDraft.kind, {
				name: newCatalogDraft.name,
				species: newCatalogDraft.species,
				aliases: parseAliases(newCatalogDraft.aliases),
				manufacturer: newCatalogDraft.manufacturer,
				regions: newCatalogDraft.regions
			});
			if (newCatalogDraft.images.length > 0) saved = await saveTreatmentCatalogImages(saved.kind, saved.id, newCatalogDraft.images);
			upsertCatalogItem(saved);
			newCatalogDraft = createNewCatalogDraft();
			statusKey = 'status.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function saveExistingCatalogItem(item: CatalogItem) {
		if (!canEditProductCatalogItem(item)) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await saveTreatmentCatalogName(
				catalogDraftKind(item),
				{
					name: catalogDraftName(item),
					species: catalogDraftSpecies(item),
					aliases: parseAliases(catalogDraftAliases(item)),
					manufacturer: catalogDraftManufacturer(item),
					regions: catalogDraftRegions(item)
				},
				item.id
			);
			upsertCatalogItem(saved);
			statusKey = 'status.saved';
		} catch (exception) {
			setFailure(exception);
		} finally {
			saving = false;
		}
	}

	async function toggleCatalogItemHidden(item: CatalogItem) {
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			const saved = await setTreatmentCatalogNameHidden(item.kind, item.id, !item.hiddenAt);
			upsertCatalogItem(saved);
			statusKey = saved.hiddenAt ? 'product.hiddenSaved' : 'product.shownSaved';
		} catch {
			errorKey = 'product.saveFailed';
		} finally {
			saving = false;
		}
	}

	async function deleteCatalogItem(item: CatalogItem) {
		if (!canDeleteProductCatalogItem(item)) return;
		if (!window.confirm(t('product.list.deleteConfirm'))) return;
		saving = true;
		statusKey = null;
		errorKey = null;

		try {
			await removeTreatmentCatalogName(item.kind, item.id);
			catalogItems = catalogItems.filter((current) => current.id !== item.id);
			removeCatalogDraft(item.id);
			statusKey = 'status.deleted';
		} catch {
			errorKey = 'product.saveFailed';
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		void load();
	});
</script>

<svelte:head>
	<title>{t('settings.products.title')} · {t('app.name')}</title>
</svelte:head>

<section class="flex w-full flex-col gap-5">
	<header class="border-b border-border pb-5">
		<h2 class="text-2xl font-semibold sm:text-3xl">{t('settings.products.title')}</h2>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	{#if statusKey}
		<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t(statusKey)}</p>
	{/if}

	<div class="grid gap-3 rounded-md border border-border bg-card p-3 shadow-sm lg:grid-cols-[minmax(0,1fr)_16rem]">
		<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
			<span>{t('formulary.searchLabel')}</span>
			<span class="relative">
				<Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
				<input class="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={searchQuery} maxlength={FIELD_LIMITS.searchQuery} placeholder={t('formulary.searchPlaceholder')} oninput={(event) => (searchQuery = inputValue(event))} />
			</span>
		</label>
		<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
			<span>{t('product.kindFilter')}</span>
			<Select id="product-type-filter" bind:value={typeFilter} options={productTypeFilterOptions} />
		</label>
	</div>

	<section class="rounded-md border border-border bg-card p-4 shadow-sm sm:p-5">
			<div class="grid gap-4 lg:grid-cols-[9rem_minmax(0,1fr)]">
				<div class="flex min-w-0 flex-col gap-2">
					<ProductImage kind={newCatalogDraft.kind} imageBytes={newPrimaryImage?.imageBytes ?? null} alt={t('product.imageAlt')} className="h-32 w-full bg-muted/60" imageClass="h-full w-full object-contain" iconClass="size-9 text-primary" />
				<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={openNewCatalogImageManager}>
					<Images class="size-4" />
					{t('practiceProfile.manageImages')}
				</button>
			</div>
			<div class="min-w-0 flex-1">
				<h3 class="text-base font-semibold">{t('product.list.add')}</h3>
				<form class="mt-4 grid gap-3 lg:grid-cols-2 lg:items-start" onsubmit={(event) => void submitNewCatalogItem(event)}>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span>{t('product.kind')}</span>
						<Select id="new-product-type" value={newCatalogDraft.kind} options={medicationKindOptions} onchange={setNewCatalogDraftKind} />
					</label>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('product.name')}</span>
							<CharacterLimitHint value={newCatalogDraft.name} max={FIELD_LIMITS.productName} />
						</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newCatalogDraft.name} maxlength={FIELD_LIMITS.productName} required oninput={(event) => setNewCatalogDraftText('name', inputValue(event))} />
					</label>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('product.manufacturer')}</span>
							<CharacterLimitHint value={newCatalogDraft.manufacturer} max={FIELD_LIMITS.productManufacturer} />
						</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newCatalogDraft.manufacturer} maxlength={FIELD_LIMITS.productManufacturer} oninput={(event) => setNewCatalogDraftText('manufacturer', inputValue(event))} />
					</label>
					<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
						<span class="flex min-w-0 items-baseline justify-between gap-2">
							<span>{t('product.aliases')}</span>
							<CharacterLimitHint value={newCatalogDraft.aliases} max={FIELD_LIMITS.productAliasesJson} />
						</span>
						<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30" value={newCatalogDraft.aliases} maxlength={FIELD_LIMITS.productAliasesJson} placeholder={t('product.aliasesPlaceholder')} oninput={(event) => setNewCatalogDraftText('aliases', inputValue(event))} />
					</label>
					<div class="flex min-w-0 flex-col gap-2 text-sm font-medium">
						<span>{t('product.species')}</span>
						<div class="flex flex-wrap gap-2">
							{#each petSpeciesOptions as option}
								<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
									<input type="checkbox" class="size-4 accent-primary" checked={newCatalogDraft.species.includes(option.id)} onchange={() => toggleNewCatalogDraftSpecies(option.id)} />
									<span>{t(option.labelKey)}</span>
								</label>
							{/each}
						</div>
					</div>
					<div class="flex min-w-0 flex-col gap-2 text-sm font-medium">
						<span>{t('product.regions')}</span>
						<ProductRegionsField id="new-product-regions" value={newCatalogDraft.regions} disabled={saving} onchange={setNewCatalogDraftRegions} />
					</div>
					<button type="submit" class="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50 lg:col-span-2" disabled={saving}>
						<Plus class="size-4" />
						{t('product.list.add')}
					</button>
				</form>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-3">
		<div class="flex items-center justify-between gap-3">
			<h3 class="text-base font-semibold">{t('product.list.title')}</h3>
			<span class="text-sm text-muted-foreground">{filteredCatalogItems.length} / {catalogItems.length}</span>
		</div>
		{#if loading}
			<div class="h-28 animate-pulse rounded-md bg-muted"></div>
		{:else}
			{#each filteredCatalogItems as item (item.id)}
				{@const itemKind = catalogDraftKind(item)}
				{@const itemPrimaryImage = catalogPrimaryImage(item)}
				<form class="grid gap-4 rounded-md border border-border bg-card p-3 shadow-sm lg:grid-cols-[9rem_minmax(0,1fr)]" onsubmit={(event) => { event.preventDefault(); void saveExistingCatalogItem(item); }}>
					<div class="flex min-w-0 flex-col gap-2">
						<ProductImage kind={itemKind} imageBytes={itemPrimaryImage?.imageBytes ?? null} alt={item.name} className="h-32 w-full bg-muted/60" imageClass="h-full w-full object-contain" iconClass="size-9 text-primary" />
						{#if canEditProductCatalogItem(item)}
							<button type="button" class="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} onclick={() => openCatalogImageManager(item)}>
								<Images class="size-4" />
								{t('practiceProfile.manageImages')}
							</button>
						{/if}
					</div>
					<div class="grid min-w-0 gap-3 xl:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_auto] xl:items-start">
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span>{t('product.kind')}</span>
							<Select id={`product-type-${item.id}`} value={itemKind} options={medicationKindOptions} disabled={!canEditProductCatalogItem(item)} onchange={(value) => setCatalogDraftKind(item.id, value)} />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('product.name')}</span>
								<CharacterLimitHint value={catalogDraftName(item)} max={FIELD_LIMITS.productName} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftName(item)} maxlength={FIELD_LIMITS.productName} disabled={!canEditProductCatalogItem(item)} required oninput={(event) => setCatalogDraftText(item.id, 'names', inputValue(event))} />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('product.manufacturer')}</span>
								<CharacterLimitHint value={catalogDraftManufacturer(item)} max={FIELD_LIMITS.productManufacturer} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftManufacturer(item)} maxlength={FIELD_LIMITS.productManufacturer} disabled={!canEditProductCatalogItem(item)} oninput={(event) => setCatalogDraftText(item.id, 'manufacturers', inputValue(event))} />
						</label>
						<label class="flex min-w-0 flex-col gap-1 text-sm font-medium">
							<span class="flex min-w-0 items-baseline justify-between gap-2">
								<span>{t('product.aliases')}</span>
								<CharacterLimitHint value={catalogDraftAliases(item)} max={FIELD_LIMITS.productAliasesJson} />
							</span>
							<input class="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:bg-muted/40 disabled:text-muted-foreground" value={catalogDraftAliases(item)} maxlength={FIELD_LIMITS.productAliasesJson} placeholder={t('product.aliasesPlaceholder')} disabled={!canEditProductCatalogItem(item)} oninput={(event) => setCatalogDraftText(item.id, 'aliases', inputValue(event))} />
						</label>
						{#if canEditProductCatalogItem(item)}
							<button type="submit" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving}>
								<Save class="size-4" />
								{t('actions.save')}
							</button>
						{/if}
						<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50" disabled={saving} title={item.hiddenAt ? t('product.list.show') : t('product.list.hide')} onclick={() => void toggleCatalogItemHidden(item)}>
							{#if item.hiddenAt}
								<Eye class="size-4" />
								{t('product.list.show')}
							{:else}
								<EyeOff class="size-4" />
								{t('product.list.hide')}
							{/if}
						</button>
						{#if canDeleteProductCatalogItem(item)}
							<button type="button" class="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-destructive/40 bg-background px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50" disabled={saving} onclick={() => void deleteCatalogItem(item)}>
								<Trash2 class="size-4" />
								{t('actions.delete')}
							</button>
						{/if}
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-4">
							<span>{t('product.species')}: <span class="font-normal text-muted-foreground">{speciesSummary(catalogDraftSpecies(item))}</span></span>
							<div class="flex flex-wrap gap-2">
								{#each petSpeciesOptions as option}
									<label class="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-accent">
										<input type="checkbox" class="size-4 accent-primary" checked={catalogDraftSpecies(item).includes(option.id)} disabled={!canEditProductCatalogItem(item)} onchange={() => setCatalogDraftSpecies(item, option.id)} />
										<span>{t(option.labelKey)}</span>
									</label>
								{/each}
							</div>
						</div>
						<div class="flex min-w-0 flex-col gap-2 text-sm font-medium xl:col-span-3">
							<span>{t('product.regions')}</span>
							<ProductRegionsField id={`product-regions-${item.id}`} value={catalogDraftRegions(item)} disabled={saving || !canEditProductCatalogItem(item)} onchange={(regions) => setCatalogDraftRegions(item.id, regions)} />
						</div>
					</div>
				</form>
			{:else}
				<p class="rounded-md bg-muted p-3 text-sm text-muted-foreground">{t('product.empty')}</p>
			{/each}
		{/if}
	</section>
</section>

{#if imageManagerTarget}
	<ImageCollectionOrganizer
		bind:images={managedImages}
		maxItems={9}
		primaryRequired
		disabled={saving}
		titleKey="product.imageManagerTitle"
		descriptionKey="product.imageManagerDescription"
		imageAltKey="product.imageAlt"
		radioGroupName={`product-primary-image-${imageManagerTarget.itemId ?? 'new'}`}
		onAdd={() => openManagedImageCapture(null)}
		onEdit={(index) => openManagedImageCapture(index)}
		onClose={() => void finishImageManager()}
	/>
{/if}

{#if imageDialogOpen}
	{@const editingImage = imageEditIndex === null ? null : managedImages[imageEditIndex]}
	<ProductImageCaptureDialog
		initialImageBytes={editingImage?.imageBytes ?? null}
		initialOriginalImageBytes={editingImage?.originalImageBytes ?? null}
		onApply={applyManagedImage}
		onClose={closeManagedImageCapture}
	/>
{/if}
