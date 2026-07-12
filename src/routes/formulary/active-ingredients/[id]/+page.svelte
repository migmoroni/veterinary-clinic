<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { countryOptions } from '$lib/domain/geo/location.js';
	import { activeIngredientProfileSectionIds, activeIngredientTypeSubtype, type ActiveIngredientCatalogItem, type ActiveIngredientProfileSectionId } from '$lib/domain/active-ingredient/catalog.js';
	import { isUuidV4 } from '$lib/domain/shared/uuid.js';
	import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
	import { loadCatalogActiveIngredient } from '$lib/services/catalog.service.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Quote from '@lucide/svelte/icons/quote';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	let item = $state<ActiveIngredientCatalogItem | null>(null);
	let loading = $state(true);
	let errorKey = $state<TranslationKey | null>(null);

	const sectionConfigs: CatalogEntityDetailSection<ActiveIngredientProfileSectionId>[] = [
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'uses', labelKey: 'catalog.section.uses', icon: Stethoscope },
		{ id: 'safety', labelKey: 'catalog.section.safety', icon: ShieldAlert },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const localizedCountries = $derived(countryOptions(i18n.locale));
	const fields = $derived<CatalogEntityDetailField[]>(
		item
			? [
					{ label: t('product.kind'), value: subtypeLabel(item) },
					{ label: t('formulary.classification'), value: item.extension.classification ?? t('common.notInformed') },
					{ label: t('formulary.originFilter'), value: item.origin === 'system' ? t('formulary.origin.system') : t('formulary.origin.user') },
					{ label: t('product.regions'), value: regionSummary(item.regions) }
				]
			: []
	);
	const sectionTexts = $derived(Object.fromEntries(activeIngredientProfileSectionIds.map((sectionId) => [sectionId, item?.extension.sections[sectionId] ?? ''])));

	function subtypeLabel(source: ActiveIngredientCatalogItem): string {
		const subtype = activeIngredientTypeSubtype(source.type);
		if (subtype === 'combination') return t('catalog.activeIngredient.type.combination');
		return t('catalog.activeIngredient.type.substance');
	}

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
			errorKey = 'catalog.activeIngredientNotFound';
			loading = false;
			return;
		}

		try {
			item = await loadCatalogActiveIngredient(id, true, true);
			if (!item) errorKey = 'catalog.activeIngredientNotFound';
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
	<title>{item?.name ?? t('catalog.activeIngredients')} | {t('app.name')}</title>
</svelte:head>

<section class="mx-auto flex w-full max-w-360 flex-col gap-4 px-4 py-4 sm:px-5 lg:px-6">
	<header class="border-b border-border pb-4">
		<h2 class="mt-1 text-2xl font-semibold tracking-normal text-foreground">{item?.name ?? t('catalog.activeIngredients')}</h2>
	</header>

	{#if loading}
		<div class="h-96 animate-pulse rounded-md bg-muted"></div>
	{:else if errorKey}
		<p class="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">{t(errorKey)}</p>
	{:else if item}
		<CatalogEntityDetail title={item.name} subtitle={t('catalog.activeIngredient')} imageBytes={item.primaryImage?.imageBytes ?? null} imageAlt={item.name} fallbackIcon={FlaskConical} {fields} sections={sectionConfigs} {sectionTexts} />
	{/if}
</section>
