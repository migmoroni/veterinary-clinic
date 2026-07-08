<script lang="ts">
	import { onMount } from 'svelte';
	import MedicationImage from '$lib/components/medication/MedicationImage.svelte';
	import ReferenceExplorer from '$lib/components/reference/ReferenceExplorer.svelte';
	import { type ReferenceFilterBarSelect } from '$lib/components/reference/ReferenceFilterBar.svelte';
	import { type ReferenceGridCard } from '$lib/components/reference/ReferenceCardGrid.svelte';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { medicationLeafletSectionIds, type MedicationCatalogOrigin, type MedicationLeafletSectionId, type MedicationSpecies } from '$lib/domain/medication/catalog.js';
	import type { TreatmentCatalogItem, TreatmentKind } from '$lib/domain/treatment/treatment.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadAllTreatmentCatalogItems } from '$lib/services/treatment.service.js';
	import Info from '@lucide/svelte/icons/info';
	import Pill from '@lucide/svelte/icons/pill';
	import Star from '@lucide/svelte/icons/star';
	import Syringe from '@lucide/svelte/icons/syringe';

	type KindFilter = 'all' | TreatmentKind;
	type SpeciesFilter = 'all' | MedicationSpecies;
	type OriginFilter = 'all' | MedicationCatalogOrigin;

	let items = $state<TreatmentCatalogItem[]>([]);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);
	let searchTerm = $state('');
	let kindFilter = $state<KindFilter>('all');
	let speciesFilter = $state<SpeciesFilter>('all');
	let originFilter = $state<OriginFilter>('all');
	let manufacturerFilter = $state('');
	let regionFilter = $state('');
	let selectedItemKey = $state<string | null>(null);

	const localizedCountries = $derived(countryOptions(i18n.locale));
	const filteredItems = $derived.by(() => {
		const search = normalizeSearch(searchTerm);

		return items.filter((item) => {
			if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
			if (speciesFilter !== 'all' && !item.species.includes(speciesFilter)) return false;
			if (originFilter !== 'all' && item.origin !== originFilter) return false;
			if (manufacturerFilter && item.manufacturer !== manufacturerFilter) return false;
			if (regionFilter && !item.regions.includes(regionFilter)) return false;
			if (!search) return true;

			return normalizeSearch(searchableText(item)).includes(search);
		});
	});
	const selectedItem = $derived(filteredItems.find((item) => itemKey(item) === selectedItemKey) ?? filteredItems[0] ?? null);
	const cards = $derived<ReferenceGridCard[]>(
		filteredItems.map((item) => ({
			id: itemKey(item),
			title: item.name,
			subtitle: item.manufacturer ?? t('common.notInformed'),
			detail: speciesSummary(item.species),
			meta: `${kindLabel(item.kind)} · ${originLabel(item.origin)}`,
			imageBytes: item.primaryImage?.imageBytes ?? null,
			imageAlt: item.name,
			fallbackIcon: item.kind === 'vaccine' ? Syringe : Pill
		}))
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
			value: kindFilter,
			options: [
				{ value: 'all', label: t('formulary.allKinds') },
				{ value: 'vaccine', label: t('protocol.kind.vaccine') },
				{ value: 'antiparasitic', label: t('protocol.kind.antiparasitic') }
			],
			onchange: (value) => (kindFilter = value as KindFilter)
		},
		{
			id: 'formulary-species-filter',
			label: t('formulary.speciesFilter'),
			value: speciesFilter,
			options: [
				{ value: 'all', label: t('breedReference.allSpecies') },
				{ value: 'canine', label: t('pet.speciesCanine') },
				{ value: 'feline', label: t('pet.speciesFeline') }
			],
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
		return `${item.kind}:${item.id}`;
	}

	function itemDetailHref(item: TreatmentCatalogItem): string {
		return `/formulary/${item.kind}/${item.id}`;
	}

	function normalizeSearch(value: string): string {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	}

	function searchableText(item: TreatmentCatalogItem): string {
		return [
			item.name,
			item.manufacturer,
			kindLabel(item.kind),
			originLabel(item.origin),
			speciesSummary(item.species),
			regionSummary(item.regions),
			item.aliases.join(' '),
			item.extension.classification,
			item.extension.commercialLine,
			...medicationLeafletSectionIds.map((sectionId) => sectionText(item, sectionId))
		]
			.filter(Boolean)
			.join(' ');
	}

	function kindLabel(kind: TreatmentKind): string {
		return kind === 'vaccine' ? t('protocol.kind.vaccine') : t('protocol.kind.antiparasitic');
	}

	function originLabel(origin: MedicationCatalogOrigin): string {
		return origin === 'system' ? t('formulary.origin.system') : t('formulary.origin.user');
	}

	function speciesLabel(species: MedicationSpecies): string {
		return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
	}

	function speciesSummary(species: readonly MedicationSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function regionLabel(region: string): string {
		return localizedCountries.find((country) => country.value === region)?.label ?? region;
	}

	function regionSummary(regions: readonly string[]): string {
		if (regions.length === 0) return t('common.notInformed');
		return regions.map(regionLabel).join(', ');
	}

	function sectionText(item: TreatmentCatalogItem, sectionId: MedicationLeafletSectionId): string {
		return item.extension.sections[sectionId]?.trim() ?? '';
	}

	function ratingLabel(item: TreatmentCatalogItem): string {
		const rating = item.extension.rating;
		if (rating === null) return t('formulary.ratingUnavailable');
		return new Intl.NumberFormat(i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
	}

	function activeStars(item: TreatmentCatalogItem): number {
		return Math.max(0, Math.min(5, Math.round((item.extension.rating ?? 0) / 2)));
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
		if (filteredItems.length === 0) {
			selectedItemKey = null;
			return;
		}

		if (!selectedItemKey || !filteredItems.some((item) => itemKey(item) === selectedItemKey)) selectedItemKey = itemKey(filteredItems[0]);
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
		openLabel={t('formulary.openMedication')}
		listTitle={t('formulary.listTitle')}
		listIcon={Info}
		count={filteredItems.length}
		{loading}
		onselect={(id) => (selectedItemKey = id)}
	>
		{#snippet sidebar()}
			{#if selectedItem}
				<section class="rounded-md border border-border bg-card shadow-sm">
					<MedicationImage kind={selectedItem.kind} imageBytes={selectedItem.primaryImage?.imageBytes ?? null} alt={selectedItem.name} className="aspect-16/10 w-full rounded-b-none border-0 bg-muted/60" imageClass="h-full w-full object-contain p-4" iconClass="size-12 text-primary" />
					<div class="p-3 sm:p-4">
						<p class="text-xs font-medium uppercase text-muted-foreground">{t('formulary.summaryTitle')}</p>
						<h3 class="mt-1 wrap-break-word text-lg font-semibold">{selectedItem.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{selectedItem.manufacturer ?? t('common.notInformed')}</p>

						<div class="mt-3 flex items-center gap-2 text-sm text-amber-600">
							<span class="font-medium tabular-nums">{ratingLabel(selectedItem)}</span>
							<span class="inline-flex items-center gap-0.5" aria-hidden="true">
								{#each Array.from({ length: 5 }) as _, index}
									<Star class="size-3.5 {index < activeStars(selectedItem) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/35'}" />
								{/each}
							</span>
						</div>

						<div class="mt-3 grid gap-2 text-sm">
							<div class="rounded-md border border-border bg-background p-2.5">
								<p class="text-xs font-medium uppercase text-muted-foreground">{t('formulary.kind')}</p>
								<p class="mt-1 font-medium">{kindLabel(selectedItem.kind)}</p>
							</div>

							<div class="rounded-md border border-border bg-background p-2.5">
								<p class="text-xs font-medium uppercase text-muted-foreground">{t('formulary.classification')}</p>
								<p class="mt-1 font-medium">{selectedItem.extension.classification ?? t('common.notInformed')}</p>
							</div>

							<div class="rounded-md border border-border bg-background p-2.5">
								<p class="text-xs font-medium uppercase text-muted-foreground">{t('medication.species')}</p>
								<p class="mt-1 font-medium">{speciesSummary(selectedItem.species)}</p>
							</div>

							<div class="rounded-md border border-border bg-background p-2.5">
								<p class="text-xs font-medium uppercase text-muted-foreground">{t('medication.regions')}</p>
								<p class="mt-1 font-medium">{regionSummary(selectedItem.regions)}</p>
							</div>
						</div>

						<a href={itemDetailHref(selectedItem)} class="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95">
							{t('formulary.viewMore')}
						</a>
					</div>
				</section>
			{/if}
		{/snippet}
	</ReferenceExplorer>
</section>
