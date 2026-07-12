<script lang="ts">
	import { onMount } from 'svelte';
	import BinaryImage from '$lib/components/shared/BinaryImage.svelte';
	import ReferenceExplorer from '$lib/components/reference/ReferenceExplorer.svelte';
	import { type ReferenceFilterBarSelect } from '$lib/components/reference/ReferenceFilterBar.svelte';
	import { type ReferenceGridCard } from '$lib/components/reference/ReferenceCardGrid.svelte';
	import ReferenceSummarySidebar, { type ReferenceSummaryField } from '$lib/components/reference/ReferenceSummarySidebar.svelte';
	import { normalizeReferenceSearch, referenceSpeciesLabel, referenceSpeciesOptions, resolveReferenceSelection } from '$lib/components/reference/reference-utils.js';
	import { ACTIVE_INGREDIENT_TYPES, activeIngredientTypeSubtype, type ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { type ManufacturerCatalogItem } from '$lib/domain/manufacturer/catalog.js';
	import { PRODUCT_TYPES, productLeafletSectionIds, productTypeMain, productTypeSubtype, stringifyProductType, type ProductCatalogItem, type ProductCatalogOrigin, type ProductSpecies, type ProductType } from '$lib/domain/product/catalog.js';
	import { productTypeLabel } from '$lib/domain/product/type-labels.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadCatalogActiveIngredients, loadCatalogManufacturers, loadCatalogProducts, type CatalogEntityKind } from '$lib/services/catalog.service.js';
	import Building2 from '@lucide/svelte/icons/building-2';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Info from '@lucide/svelte/icons/info';
	import Pill from '@lucide/svelte/icons/pill';
	import Syringe from '@lucide/svelte/icons/syringe';

	type TypeFilter = 'all' | string;
	type SpeciesFilter = 'all' | ProductSpecies;
	type OriginFilter = 'all' | ProductCatalogOrigin;
	type CatalogItem = (ProductCatalogItem & { kind: 'product' }) | (ManufacturerCatalogItem & { kind: 'manufacturer' }) | (ActiveIngredientCatalogItem & { kind: 'activeIngredient' });

	let products = $state<(ProductCatalogItem & { kind: 'product' })[]>([]);
	let manufacturers = $state<(ManufacturerCatalogItem & { kind: 'manufacturer' })[]>([]);
	let activeIngredients = $state<(ActiveIngredientCatalogItem & { kind: 'activeIngredient' })[]>([]);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);
	let searchTerm = $state('');
	type CatalogKind = 'all' | CatalogEntityKind;
	let catalogKind = $state<CatalogKind>('all');
	let typeFilter = $state<TypeFilter>('all');
	let speciesFilter = $state<SpeciesFilter>('all');
	let originFilter = $state<OriginFilter>('all');
	let manufacturerFilter = $state('');
	let regionFilter = $state('');
	let selectedItemKey = $state<string | null>(null);

	const catalogKinds: CatalogEntityKind[] = ['product', 'manufacturer', 'activeIngredient'];
	const localizedCountries = $derived(countryOptions(i18n.locale));
	const currentItems = $derived.by<CatalogItem[]>(() => {
		const items = catalogKind === 'all'
			? [...products, ...manufacturers, ...activeIngredients]
			: catalogKind === 'product'
				? products
				: catalogKind === 'manufacturer'
					? manufacturers
					: activeIngredients;
		return [...items].sort((a, b) => a.name.localeCompare(b.name, i18n.locale));
	});
	const filteredItems = $derived.by<CatalogItem[]>(() => {
		const search = normalizeReferenceSearch(searchTerm);

		return currentItems.filter((item) => {
			if (originFilter !== 'all' && item.origin !== originFilter) return false;
			if (regionFilter && !item.regions.includes(regionFilter)) return false;

			if (item.kind === 'product') {
				const product = item as ProductCatalogItem;
				if (typeFilter !== 'all' && stringifyProductType(product.type) !== typeFilter) return false;
				if (speciesFilter !== 'all' && !product.species.includes(speciesFilter)) return false;
				if (manufacturerFilter && product.manufacturerName !== manufacturerFilter) return false;
			}

			if (item.kind === 'activeIngredient' && typeFilter !== 'all') {
				const activeIngredient = item as ActiveIngredientCatalogItem;
				if (JSON.stringify(activeIngredient.type) !== typeFilter) return false;
			}

			if (!search) return true;
			return normalizeReferenceSearch(searchableText(item)).includes(search);
		});
	});
	const selectedItem = $derived(filteredItems.find((item) => item.id === selectedItemKey) ?? filteredItems[0] ?? null);
	const cards = $derived<ReferenceGridCard[]>(filteredItems.map(cardForItem));
	const selectedSummaryFields = $derived<ReferenceSummaryField[]>(selectedItem ? summaryFields(selectedItem) : []);
	const manufacturerOptions = $derived([
		{ value: '', label: t('formulary.allManufacturers') },
		...[...new Set(products.map((item) => item.manufacturerName).filter((value): value is string => Boolean(value)))]
			.sort((left, right) => left.localeCompare(right, i18n.locale))
			.map((manufacturer) => ({ value: manufacturer, label: manufacturer }))
	]);
	const regionOptions = $derived([
		{ value: '', label: t('formulary.allRegions') },
		...[...new Set(currentItems.flatMap((item) => item.regions))]
			.sort((left, right) => regionLabel(left).localeCompare(regionLabel(right), i18n.locale))
			.map((region) => ({ value: region, label: regionLabel(region) }))
	]);
	const filterControls = $derived.by<ReferenceFilterBarSelect[]>(() => {
		const controls: ReferenceFilterBarSelect[] = [
			{
				id: 'formulary-origin-filter',
				label: t('formulary.originFilter'),
				value: originFilter,
				options: [
					{ value: 'all', label: t('formulary.allOrigins') },
					{ value: 'system', label: t('formulary.origin.system') },
					{ value: 'user', label: t('formulary.origin.user') }
				],
				onchange: (value) => (originFilter = value as OriginFilter)
			},
			{
				id: 'formulary-region-filter',
				label: t('formulary.regionFilter'),
				value: regionFilter,
				options: regionOptions,
				onchange: (value) => (regionFilter = value)
			}
		];

		if (catalogKind === 'product') {
			return [
				{
					id: 'formulary-kind-filter',
					label: t('formulary.kindFilter'),
					value: typeFilter,
					options: [
						{ value: 'all', label: t('formulary.allKinds') },
						...PRODUCT_TYPES.map((type) => ({ value: typeFilterValue(type), label: productTypeLabel(type, t) }))
					],
					onchange: (value) => (typeFilter = value as TypeFilter)
				},
				{
					id: 'formulary-species-filter',
					label: t('formulary.speciesFilter'),
					value: speciesFilter,
					options: referenceSpeciesOptions(t('breedReference.allSpecies'), t('pet.speciesCanine'), t('pet.speciesFeline')),
					onchange: (value) => (speciesFilter = value as SpeciesFilter)
				},
				{
					id: 'formulary-manufacturer-filter',
					label: t('formulary.manufacturerFilter'),
					value: manufacturerFilter,
					options: manufacturerOptions,
					onchange: (value) => (manufacturerFilter = value)
				},
				...controls
			];
		}

		if (catalogKind === 'activeIngredient') {
			return [
				{
					id: 'formulary-active-ingredient-type-filter',
					label: t('formulary.kindFilter'),
					value: typeFilter,
					options: [
						{ value: 'all', label: t('formulary.allKinds') },
						...ACTIVE_INGREDIENT_TYPES.map((type) => ({ value: JSON.stringify(type), label: activeIngredientTypeLabel(type as ActiveIngredientCatalogItem['type']) }))
					],
					onchange: (value) => (typeFilter = value as TypeFilter)
				},
				...controls
			];
		}

		return controls;
	});

	function itemKindLabel(kind: CatalogEntityKind): string {
		if (kind === 'manufacturer') return t('catalog.manufacturers');
		if (kind === 'activeIngredient') return t('catalog.activeIngredients');
		return t('catalog.products');
	}

	function asProduct(item: CatalogItem): ProductCatalogItem {
		return item as ProductCatalogItem;
	}

	function cardForItem(item: CatalogItem): ReferenceGridCard {
		if (item.kind === 'product') {
			const product = item as ProductCatalogItem;
			const metaParts = [productTypeLabel(product.type, t)];
			if (product.origin === 'user') {
				metaParts.push(originLabel(product.origin));
			}
			return {
				id: product.id,
				title: product.name,
				subtitle: product.manufacturerName ?? t('common.notInformed'),
				detail: speciesSummary(product.species),
				meta: metaParts.join(' · '),
				imageBytes: product.primaryImage?.imageBytes ?? null,
				imageAlt: product.name,
				fallbackIcon: productFallbackIcon(product)
			};
		}

		if (item.kind === 'manufacturer') {
			return {
				id: item.id,
				title: item.name,
				subtitle: t('catalog.manufacturer'),
				detail: regionSummary(item.regions),
				meta: item.origin === 'user' ? originLabel(item.origin) : '',
				imageBytes: item.primaryImage?.imageBytes ?? null,
				imageAlt: item.name,
				fallbackIcon: Building2
			};
		}

		const activeIngredient = item as ActiveIngredientCatalogItem;
		return {
			id: activeIngredient.id,
			title: activeIngredient.name,
			subtitle: activeIngredientTypeLabel(activeIngredient.type),
			detail: activeIngredient.extension.classification ?? null,
			meta: activeIngredient.origin === 'user' ? originLabel(activeIngredient.origin) : '',
			imageBytes: activeIngredient.primaryImage?.imageBytes ?? null,
			imageAlt: activeIngredient.name,
			fallbackIcon: FlaskConical
		};
	}

	function summaryFields(item: CatalogItem): ReferenceSummaryField[] {
		if (item.kind === 'product') {
			const product = item as ProductCatalogItem;
			return [
				{ label: t('formulary.kind'), value: productTypeLabel(product.type, t) },
				{ label: t('formulary.classification'), value: product.extension.classification ?? t('common.notInformed') },
				{ label: t('product.species'), value: speciesSummary(product.species) },
				{ label: t('catalog.activeIngredients'), value: activeIngredientSummary(product) },
				{ label: t('product.regions'), value: regionSummary(product.regions) }
			];
		}

		if (item.kind === 'activeIngredient') {
			const activeIngredient = item as ActiveIngredientCatalogItem;
			return [
				{ label: t('formulary.kind'), value: activeIngredientTypeLabel(activeIngredient.type) },
				{ label: t('formulary.classification'), value: activeIngredient.extension.classification ?? t('common.notInformed') },
				{ label: t('product.regions'), value: regionSummary(activeIngredient.regions) }
			];
		}

		return [
			{ label: t('formulary.originFilter'), value: originLabel(item.origin) },
			{ label: t('product.regions'), value: regionSummary(item.regions) }
		];
	}

	function itemDetailHref(item: CatalogItem): string {
		if (item.kind === 'manufacturer') return `/formulary/manufacturers/${item.id}`;
		if (item.kind === 'activeIngredient') return `/formulary/active-ingredients/${item.id}`;
		return `/formulary/${item.id}`;
	}

	function searchableText(item: CatalogItem): string {
		if (item.kind === 'product') {
			const product = item as ProductCatalogItem;
			return [
				product.name,
				product.manufacturerName,
				activeIngredientSummary(product),
				productTypeLabel(product.type, t),
				originLabel(product.origin),
				speciesSummary(product.species),
				regionSummary(product.regions),
				product.aliases.join(' '),
				product.extension.classification,
				product.extension.commercialLine,
				...productLeafletSectionIds.map((sectionId) => product.extension.sections[sectionId]?.trim() ?? '')
			]
				.filter(Boolean)
				.join(' ');
		}

		return [item.name, item.aliases.join(' '), originLabel(item.origin), regionSummary(item.regions), ...Object.values(item.extension.sections ?? {})]
			.filter(Boolean)
			.join(' ');
	}

	function typeFilterValue(type: ProductType): string {
		return stringifyProductType(type);
	}

	function activeIngredientTypeLabel(type: ActiveIngredientCatalogItem['type']): string {
		return activeIngredientTypeSubtype(type) === 'combination' ? t('catalog.activeIngredient.type.combination') : t('catalog.activeIngredient.type.substance');
	}

	function originLabel(origin: ProductCatalogOrigin): string {
		return origin === 'system' ? t('formulary.origin.system') : t('formulary.origin.user');
	}

	function speciesLabel(species: ProductSpecies): string {
		return referenceSpeciesLabel(species, t('pet.speciesCanine'), t('pet.speciesFeline'));
	}

	function speciesSummary(species: readonly ProductSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function regionLabel(region: string): string {
		return localizedCountries.find((country) => country.value === region)?.label ?? region;
	}

	function regionSummary(regions: readonly string[]): string {
		if (regions.length === 0) return t('common.notInformed');
		return regions.map(regionLabel).join(', ');
	}

	function activeIngredientSummary(item: ProductCatalogItem): string {
		if (item.activeIngredients.length > 0) return item.activeIngredients.map((ingredient) => ingredient.name).join(', ');
		return t('common.notInformed');
	}

	function productFallbackIcon(item: ProductCatalogItem) {
		if (productTypeMain(item.type) !== 'medication') return Info;
		return productTypeSubtype(item.type) === 'vaccine' ? Syringe : Pill;
	}

	function getKindIcon(kind: CatalogEntityKind) {
		if (kind === 'manufacturer') return Building2;
		if (kind === 'activeIngredient') return FlaskConical;
		return Pill;
	}

	function selectCatalogKind(kind: CatalogEntityKind) {
		if (catalogKind === kind) {
			catalogKind = 'all';
		} else {
			catalogKind = kind;
		}
		typeFilter = 'all';
		speciesFilter = 'all';
		manufacturerFilter = '';
		regionFilter = '';
		selectedItemKey = null;
	}

	async function loadItems() {
		loading = true;
		errorKey = null;
		try {
			const [loadedProducts, loadedManufacturers, loadedActiveIngredients] = await Promise.all([
				loadCatalogProducts(true, true),
				loadCatalogManufacturers(true, true),
				loadCatalogActiveIngredients(true, true)
			]);
			products = loadedProducts.map((p) => ({ ...p, kind: 'product' as const }));
			manufacturers = loadedManufacturers.map((m) => ({ ...m, kind: 'manufacturer' as const }));
			activeIngredients = loadedActiveIngredients.map((a) => ({ ...a, kind: 'activeIngredient' as const }));
		} catch {
			errorKey = 'formulary.loadFailed';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadItems();
	});

	$effect(() => {
		selectedItemKey = resolveReferenceSelection(filteredItems, selectedItemKey, (item) => item.id);
	});
</script>

<svelte:head>
	<title>{t('formulary.title')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<p class="text-sm font-medium text-muted-foreground">{t('formulary.kicker')}</p>
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{t('formulary.title')}</h2>
		<p class="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{t('formulary.description')}</p>
	</header>

	{#if errorKey}
		<p class="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">{t(errorKey)}</p>
	{/if}

	<ReferenceExplorer
		bind:searchTerm
		searchLabel={t('formulary.searchLabel')}
		searchPlaceholder={t('formulary.searchPlaceholder')}
		filters={filterControls}
		{cards}
		selectedId={selectedItem?.id ?? null}
		emptyLabel={t('formulary.noResults')}
		openLabel={t('formulary.viewMore')}
		listTitle={catalogKind === 'all' ? t('catalog.all') : itemKindLabel(catalogKind)}
		listIcon={Info}
		count={filteredItems.length}
		{loading}
		onselect={(id) => (selectedItemKey = id)}
	>
		{#snippet beforeSearch()}
			<div class="flex flex-col gap-1">
				<span class="text-sm font-medium">{t('catalog.view')}</span>
				<div class="flex gap-1.5 rounded-md border border-border bg-muted/30 p-1 shrink-0 h-10 items-center">
					{#each catalogKinds as kind}
						{@const Icon = getKindIcon(kind)}
						<button
							type="button"
							title={itemKindLabel(kind)}
							aria-label={itemKindLabel(kind)}
							class="inline-flex h-8 w-10 items-center justify-center rounded-sm transition-all select-none {catalogKind === kind ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}"
							onclick={() => selectCatalogKind(kind)}
						>
							<Icon class="size-4" />
						</button>
					{/each}
				</div>
			</div>
		{/snippet}

		{#snippet sidebar()}
			{#if selectedItem}
				<ReferenceSummarySidebar
					eyebrow={selectedItem.kind === 'product' ? t('formulary.summaryTitle') : itemKindLabel(selectedItem.kind)}
					title={selectedItem.name}
					subtitle={selectedItem.kind === 'product' ? (asProduct(selectedItem).manufacturerName ?? t('common.notInformed')) : originLabel(selectedItem.origin)}
					fields={selectedSummaryFields}
					actionHref={itemDetailHref(selectedItem)}
					actionLabel={t('formulary.viewMore')}
				>
					{#snippet image()}
						{#if selectedItem.kind === 'product'}
							<BinaryImage imageBytes={asProduct(selectedItem).primaryImage?.imageBytes ?? null} alt={selectedItem.name} className="aspect-16/10 w-full rounded-b-none border-0 bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" fallbackIcon={productFallbackIcon(asProduct(selectedItem))} />
						{:else}
							<BinaryImage imageBytes={selectedItem.primaryImage?.imageBytes ?? null} alt={selectedItem.name} className="aspect-16/10 w-full rounded-b-none border-0 bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" fallbackIcon={selectedItem.kind === 'manufacturer' ? Building2 : FlaskConical} />
						{/if}
					{/snippet}
				</ReferenceSummarySidebar>
			{/if}
		{/snippet}
	</ReferenceExplorer>
</section>
