<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { catalogOriginLabel, catalogRegionSummary, catalogSectionTexts } from '$lib/components/catalog/catalog-detail-utils.js';
	import { manufacturerClassificationGroups } from '$lib/domain/catalog/classification-labels.js';
	import { MANUFACTURER_CLASSIFICATION_AXES, manufacturerProfileSectionIds, type ManufacturerCatalogItem, type ManufacturerProfileSectionId } from '$lib/domain/manufacturer/catalog.js';
	import { t } from '$lib/i18n/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import BriefcaseBusiness from '@lucide/svelte/icons/briefcase-business';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Quote from '@lucide/svelte/icons/quote';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';

	let { item }: { item: ManufacturerCatalogItem } = $props();

	type ManufacturerDetailSectionId = 'classification' | ManufacturerProfileSectionId;

	const sectionConfigs: CatalogEntityDetailSection<ManufacturerDetailSectionId>[] = [
		{ id: 'classification', labelKey: 'formulary.classification', icon: SlidersHorizontal },
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'portfolio', labelKey: 'catalog.section.portfolio', icon: BriefcaseBusiness },
		{ id: 'support', labelKey: 'catalog.section.support', icon: Headphones },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const fields = $derived<CatalogEntityDetailField[]>([
		{ label: t('formulary.kind'), value: t('catalog.manufacturer') },
		{ label: t('formulary.originFilter'), value: catalogOriginLabel(item.origin) },
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions) }
	]);
	const sectionFields = $derived<Record<string, CatalogEntityDetailField[]>>({
		classification: manufacturerClassificationFields(item)
	});
	const sectionTexts = $derived(catalogSectionTexts(manufacturerProfileSectionIds, item.extension.sections));

	function manufacturerClassificationFields(source: ManufacturerCatalogItem): CatalogEntityDetailField[] {
		return [
			{
				label: '',
				rowGroups: manufacturerClassificationGroups(source.extension.classification, MANUFACTURER_CLASSIFICATION_AXES, t, t('common.notInformed'))
			}
		];
	}
</script>

<CatalogEntityDetail
	title={item.name}
	subtitle={t('catalog.manufacturer')}
	imageBytes={item.primaryImage?.imageBytes ?? null}
	imageAlt={item.name}
	fallbackIcon={Building2}
	{fields}
	sections={sectionConfigs}
	{sectionTexts}
	{sectionFields}
/>
