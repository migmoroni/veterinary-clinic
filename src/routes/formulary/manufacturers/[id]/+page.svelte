<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { manufacturerProfileSectionIds, type ManufacturerCatalogItem, type ManufacturerProfileSectionId } from '$lib/domain/manufacturer/catalog.js';
	import { isUuidV4 } from '$lib/domain/shared/uuid.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadCatalogManufacturer } from '$lib/services/catalog.service.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import BriefcaseBusiness from '@lucide/svelte/icons/briefcase-business';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Quote from '@lucide/svelte/icons/quote';

	let item = $state<ManufacturerCatalogItem | null>(null);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);

	const sectionConfigs: CatalogEntityDetailSection<ManufacturerProfileSectionId>[] = [
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'portfolio', labelKey: 'catalog.section.portfolio', icon: BriefcaseBusiness },
		{ id: 'support', labelKey: 'catalog.section.support', icon: Headphones },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const localizedCountries = $derived(countryOptions(i18n.locale));
	const fields = $derived<CatalogEntityDetailField[]>(
		item
			? [
					{ label: t('formulary.originFilter'), value: item.origin === 'system' ? t('formulary.origin.system') : t('formulary.origin.user') },
					{ label: t('product.regions'), value: regionSummary(item.regions) }
				]
			: []
	);
	const sectionTexts = $derived(Object.fromEntries(manufacturerProfileSectionIds.map((sectionId) => [sectionId, item?.extension.sections[sectionId] ?? ''])));

	function regionLabel(region: string): string {
		return localizedCountries.find((country) => country.value === region)?.label ?? region;
	}

	function regionSummary(regions: readonly string[]): string {
		if (regions.length === 0) return t('common.notInformed');
		return regions.map(regionLabel).join(', ');
	}

	async function loadItem() {
		loading = true;
		errorKey = null;
		item = null;
		const id = page.params.id ?? '';
		if (!isUuidV4(id)) {
			errorKey = 'catalog.manufacturerNotFound';
			loading = false;
			return;
		}

		try {
			item = await loadCatalogManufacturer(id, true, true);
			if (!item) errorKey = 'catalog.manufacturerNotFound';
		} catch {
			errorKey = 'formulary.loadFailed';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadItem();
	});
</script>

<svelte:head>
	<title>{item?.name ?? t('catalog.manufacturers')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{item?.name ?? t('catalog.manufacturers')}</h2>
	</header>

	{#if loading}
		<div class="h-96 animate-pulse rounded-md bg-muted"></div>
	{:else if errorKey}
		<p class="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t(errorKey)}</p>
	{:else if item}
		<CatalogEntityDetail title={item.name} subtitle={t('catalog.manufacturer')} imageBytes={item.primaryImage?.imageBytes ?? null} imageAlt={item.name} fallbackIcon={Building2} {fields} sections={sectionConfigs} {sectionTexts} />
	{/if}
</section>
