<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { catalogRegionSummary, catalogSectionTexts } from '$lib/components/catalog/catalog-detail-utils.js';
	import { conditionClassificationGroups } from '$lib/domain/catalog/classification-labels.js';
	import { catalogPathTypeLabel } from '$lib/domain/catalog/type-labels.js';
	import { CONDITION_CLASSIFICATION_AXES, conditionProfileSectionIds, type ConditionCatalogItem, type ConditionProfileSectionId } from '$lib/domain/condition/catalog.js';
	import { t } from '$lib/i18n/index.js';
	import Activity from '@lucide/svelte/icons/activity';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import Quote from '@lucide/svelte/icons/quote';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	let { item }: { item: ConditionCatalogItem } = $props();

	type ConditionDetailSectionId = 'classification' | ConditionProfileSectionId;

	const sectionConfigs: CatalogEntityDetailSection<ConditionDetailSectionId>[] = [
		{ id: 'classification', labelKey: 'formulary.classification', icon: SlidersHorizontal },
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'clinicalSigns', labelKey: 'catalog.condition.section.clinicalSigns', icon: HeartPulse },
		{ id: 'diagnosis', labelKey: 'catalog.condition.section.diagnosis', icon: ClipboardCheck },
		{ id: 'management', labelKey: 'catalog.condition.section.management', icon: Stethoscope },
		{ id: 'prevention', labelKey: 'catalog.condition.section.prevention', icon: ShieldCheck },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const fields = $derived<CatalogEntityDetailField[]>([
		{ label: t('formulary.kind'), value: catalogPathTypeLabel('catalog.condition.type', item.type, t) },
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions) }
	]);
	const sectionFields = $derived<Record<string, CatalogEntityDetailField[]>>({
		classification: conditionClassificationFields(item)
	});
	const sectionTexts = $derived(catalogSectionTexts(conditionProfileSectionIds, item.extension.sections));

	function conditionClassificationFields(source: ConditionCatalogItem): CatalogEntityDetailField[] {
		return [
			{
				label: '',
				rowGroups: conditionClassificationGroups(source.extension.classification, CONDITION_CLASSIFICATION_AXES, t, t('common.notInformed'))
			}
		];
	}
</script>

<CatalogEntityDetail
	title={item.name}
	subtitle={t('catalog.condition')}
	imageBytes={item.primaryImage?.imageBytes ?? null}
	imageAlt={item.name}
	fallbackIcon={Activity}
	{fields}
	sections={sectionConfigs}
	{sectionTexts}
	{sectionFields}
/>
