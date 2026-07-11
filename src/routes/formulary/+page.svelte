<script lang="ts">
	import { onMount } from 'svelte';
	import ProductImage from '$lib/components/product/ProductImage.svelte';
	import ReferenceExplorer from '$lib/components/reference/ReferenceExplorer.svelte';
	import { type ReferenceFilterBarSelect } from '$lib/components/reference/ReferenceFilterBar.svelte';
	import { type ReferenceGridCard } from '$lib/components/reference/ReferenceCardGrid.svelte';
	import ReferenceSummarySidebar, { type ReferenceSummaryField } from '$lib/components/reference/ReferenceSummarySidebar.svelte';
	import { normalizeReferenceSearch, referenceSpeciesLabel, referenceSpeciesOptions, resolveReferenceSelection } from '$lib/components/reference/reference-utils.js';
	import { productTypeLabel } from '$lib/domain/product/type-labels.js';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { PRODUCT_TYPES, productLeafletSectionIds, stringifyProductType, type ProductCatalogOrigin, type ProductLeafletSectionId, type ProductSpecies, type ProductType } from '$lib/domain/product/catalog.js';
	import type { TreatmentCatalogItem } from '$lib/domain/treatment/treatment.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadAllTreatmentCatalogItems } from '$lib/services/treatment.service.js';
	import Info from '@lucide/svelte/icons/info';
	import Pill from '@lucide/svelte/icons/pill';
	import Syringe from '@lucide/svelte/icons/syringe';

	type TypeFilter = 'all' | string;
	type SpeciesFilter = 'all' | ProductSpecies;
	type OriginFilter = 'all' | ProductCatalogOrigin;

	let items = $state<TreatmentCatalogItem[]>([]);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);
	let searchTerm = $state('');
	let typeFilter = $state<TypeFilter>('all');
	let speciesFilter = $state<SpeciesFilter>('all');
	let originFilter = $state<OriginFilter>('all');
	let manufacturerFilter = $state('');
	let regionFilter = $state('');
	let selectedItemKey = $state<string | null>(null);

	const localizedCountries = $derived(countryOptions(i18n.locale));
	const filteredItems = $derived.by(() => {
		const search = normalizeReferenceSearch(searchTerm);

		return items.filter((item) => {
			if (typeFilter !== 'all' && stringifyProductType(item.type) !== typeFilter) return false;
			if (speciesFilter !== 'all' && !item.species.includes(speciesFilter)) return false;
			if (originFilter !== 'all' && item.origin !== originFilter) return false;
			if (manufacturerFilter && item.manufacturer !== manufacturerFilter) return false;
			if (regionFilter && !item.regions.includes(regionFilter)) return false;
			if (!search) return true;

			return normalizeReferenceSearch(searchableText(item)).includes(search);
		});
	});
	const selectedItem = $derived(filteredItems.find((item) => itemKey(item) === selectedItemKey) ?? filteredItems[0] ?? null);
	const cards = $derived<ReferenceGridCard[]>(
		filteredItems.map((item) => ({
			id: itemKey(item),
			title: item.name,
			subtitle: item.manufacturer ?? t('common.notInformed'),
			detail: speciesSummary(item.species),
			meta: `${typeLabel(item)} · ${originLabel(item.origin)}`,
			imageBytes: item.primaryImage?.imageBytes ?? null,
			imageAlt: item.name,
			fallbackIcon: item.kind === 'vaccine' ? Syringe : Pill
		}))
	);
	const selectedSummaryFields = $derived<ReferenceSummaryField[]>(
		selectedItem
			? [
					{ label: t('formulary.kind'), value: typeLabel(selectedItem) },
					{ label: t('formulary.classification'), value: selectedItem.extension.classification ?? t('common.notInformed') },
					{ label: t('product.species'), value: speciesSummary(selectedItem.species) },
					{ label: t('product.regions'), value: regionSummary(selectedItem.regions) }
				]
			: []
	);
	const manufacturerOptions = $derived([
		{ value: '', label: t('formulary.allManufacturers') },
		...[...new Set(items.map((item) => item.manufacturer).filter((value): value is string => Boolean(value)))]
			.sort((left, right) => left.localeCompare(right, i18n.locale))
			.map((manufacturer) => ({ value: manufacturer, label: manufacturer }))
	]);
	const regionOptions = $derived([
		{ value: '', label: t('formulary.allRegions') },
		...[...new Set(items.flatMap((item) => item.regions))]
			.sort((left, right) => regionLabel(left).localeCompare(regionLabel(right), i18n.locale))
			.map((region) => ({ value: region, label: regionLabel(region) }))
	]);
	const filterControls = $derived.by<ReferenceFilterBarSelect[]>(() => [
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
			id: 'formulary-manufacturer-filter',
			label: t('formulary.manufacturerFilter'),
			value: manufacturerFilter,
			options: manufacturerOptions,
			onchange: (value) => (manufacturerFilter = value)
		},
		{
			id: 'formulary-region-filter',
			label: t('formulary.regionFilter'),
			value: regionFilter,
			options: regionOptions,
			onchange: (value) => (regionFilter = value)
		}
	]);

	function itemKey(item: TreatmentCatalogItem): string {
		return item.id;
	}

	function itemDetailHref(item: TreatmentCatalogItem): string {
		return `/formulary/${item.id}`;
	}

	function searchableText(item: TreatmentCatalogItem): string {
		return [
			item.name,
			item.manufacturer,
			typeLabel(item),
			originLabel(item.origin),
			speciesSummary(item.species),
			regionSummary(item.regions),
			item.aliases.join(' '),
			item.extension.classification,
			item.extension.commercialLine,
			...productLeafletSectionIds.map((sectionId) => sectionText(item, sectionId))
		]
			.filter(Boolean)
			.join(' ');
	}

	function typeLabel(item: TreatmentCatalogItem): string {
		return productTypeLabel(item.type, t);
	}

	function typeFilterValue(type: ProductType): string {
		return stringifyProductType(type);
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

	function sectionText(item: TreatmentCatalogItem, sectionId: ProductLeafletSectionId): string {
		return item.extension.sections[sectionId]?.trim() ?? '';
	}

	async function loadItems() {
		loading = true;
		errorKey = null;
		try {
			items = await loadAllTreatmentCatalogItems(true);
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
		selectedItemKey = resolveReferenceSelection(filteredItems, selectedItemKey, itemKey);
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
		selectedId={selectedItem ? itemKey(selectedItem) : null}
		emptyLabel={t('formulary.noResults')}
		openLabel={t('formulary.openProduct')}
		listTitle={t('formulary.listTitle')}
		listIcon={Info}
		count={filteredItems.length}
		{loading}
		onselect={(id) => (selectedItemKey = id)}
	>
		{#snippet sidebar()}
			{#if selectedItem}
				<ReferenceSummarySidebar
					eyebrow={t('formulary.summaryTitle')}
					title={selectedItem.name}
					subtitle={selectedItem.manufacturer ?? t('common.notInformed')}
					fields={selectedSummaryFields}
					actionHref={itemDetailHref(selectedItem)}
					actionLabel={t('formulary.viewMore')}
				>
					{#snippet image()}
						<ProductImage kind={selectedItem.kind} imageBytes={selectedItem.primaryImage?.imageBytes ?? null} alt={selectedItem.name} className="aspect-16/10 w-full rounded-b-none border-0 bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" />
					{/snippet}
				</ReferenceSummarySidebar>
			{/if}
		{/snippet}
	</ReferenceExplorer>
</section>
