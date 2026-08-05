<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from './CatalogEntityDetail.svelte';
	import { catalogRegionSummary, catalogSectionTexts } from './catalog-detail-utils.js';
	import { productClassificationGroups } from '@vet/types/domain/product/classification.js';
	import { productLeafletSectionIds, productTreatmentKind, productTypeMain, type ProductCatalogItem, type ProductLeafletSectionId, type ProductSpecies } from '@vet/types/domain/product/catalog.js';
	import { productTypeLabel } from '@vet/types/domain/product/type-labels.js';
	import { t } from '@vet/core-local/i18n/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import Building2 from '@lucide/svelte/icons/building-2';
	import ClipboardList from '@lucide/svelte/icons/clipboard-list';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Package from '@lucide/svelte/icons/package';
	import Pill from '@lucide/svelte/icons/pill';
	import Quote from '@lucide/svelte/icons/quote';
	import Share2 from '@lucide/svelte/icons/share-2';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Syringe from '@lucide/svelte/icons/syringe';
	import Video from '@lucide/svelte/icons/video';

	let { item }: { item: ProductCatalogItem } = $props();

	type ProductDetailSectionId = 'classification' | ProductLeafletSectionId;

	const sectionConfigs: CatalogEntityDetailSection<ProductDetailSectionId>[] = [
		{ id: 'classification', labelKey: 'formulary.classification', icon: SlidersHorizontal },
		{ id: 'about', labelKey: 'formulary.section.about', icon: BookOpenText },
		{ id: 'presentations', labelKey: 'formulary.section.presentations', icon: Package },
		{ id: 'indications', labelKey: 'formulary.section.indications', icon: ClipboardList },
		{ id: 'administration', labelKey: 'formulary.section.administration', icon: Syringe },
		{ id: 'interactions', labelKey: 'formulary.section.interactions', icon: Share2 },
		{ id: 'pharmacology', labelKey: 'formulary.section.pharmacology', icon: FlaskConical },
		{ id: 'studies', labelKey: 'formulary.section.studies', icon: GraduationCap },
		{ id: 'videos', labelKey: 'formulary.section.videos', icon: Video },
		{ id: 'distributors', labelKey: 'formulary.section.distributors', icon: Building2 },
		{ id: 'references', labelKey: 'formulary.section.references', icon: Quote }
	];
	const fields = $derived<CatalogEntityDetailField[]>([
		{ label: t('formulary.kind'), value: productTypeLabel(item.type, t) },
		{ label: t('product.species'), value: speciesSummary(item.species) },
		{
			label: t('catalog.activeIngredients'),
			items: item.activeIngredients.map((ingredient) => ({
				label: ingredient.name,
				href: `/formulary/active-ingredients/${ingredient.id}`
			})),
			fullWidth: true
		},
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions), fullWidth: true }
	]);
	const sectionFields = $derived<Record<string, CatalogEntityDetailField[]>>({
		classification: productClassificationFields(item)
	});
	const sectionTexts = $derived(catalogSectionTexts(productLeafletSectionIds, item.extension.sections));

	function speciesLabel(species: ProductSpecies): string {
		return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
	}

	function speciesSummary(species: readonly ProductSpecies[]): string {
		return species.map(speciesLabel).join(', ');
	}

	function productClassificationFields(source: ProductCatalogItem): CatalogEntityDetailField[] {
		return [
			{
				label: '',
				rowGroups: productClassificationGroups(source, t, t('common.notInformed'))
			}
		];
	}

	function productFallbackIcon(source: ProductCatalogItem) {
		if (productTypeMain(source.type) !== 'medication') return Package;
		return productTreatmentKind(source.type) === 'vaccine' ? Syringe : Pill;
	}
</script>

<CatalogEntityDetail
	title={item.name}
	imageBytes={item.primaryImage?.imageBytes ?? null}
	imageAlt={item.name}
	fallbackIcon={productFallbackIcon(item)}
	{fields}
	sections={sectionConfigs}
	{sectionTexts}
	{sectionFields}
	sectionsLabelKey="formulary.sectionsLabel"
>
	{#snippet subtitleContent()}
		{t('formulary.byManufacturer')}
		{#if item.manufacturerId && item.manufacturerName}
			<a class="font-medium text-primary hover:underline" href={`/formulary/manufacturers/${item.manufacturerId}`}>{item.manufacturerName}</a>
		{:else}
			<span class="font-medium text-primary">{item.manufacturerName ?? t('common.notInformed')}</span>
		{/if}
		{#if item.extension.commercialLine}
			<span class="mx-2 text-border">|</span>{item.extension.commercialLine}
		{/if}
	{/snippet}
</CatalogEntityDetail>
