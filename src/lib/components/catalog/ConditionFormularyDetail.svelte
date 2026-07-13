<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { catalogOriginLabel, catalogRegionSummary, catalogSectionTexts } from '$lib/components/catalog/catalog-detail-utils.js';
	import { conditionProfileSectionIds, conditionTypeSubtype, type ConditionCatalogItem, type ConditionProfileSectionId } from '$lib/domain/condition/catalog.js';
	import { t } from '$lib/i18n/index.js';
	import Activity from '@lucide/svelte/icons/activity';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import HeartPulse from '@lucide/svelte/icons/heart-pulse';
	import Quote from '@lucide/svelte/icons/quote';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	let { item }: { item: ConditionCatalogItem } = $props();

	const sectionConfigs: CatalogEntityDetailSection<ConditionProfileSectionId>[] = [
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'clinicalSigns', labelKey: 'catalog.condition.section.clinicalSigns', icon: HeartPulse },
		{ id: 'diagnosis', labelKey: 'catalog.condition.section.diagnosis', icon: ClipboardCheck },
		{ id: 'management', labelKey: 'catalog.condition.section.management', icon: Stethoscope },
		{ id: 'prevention', labelKey: 'catalog.condition.section.prevention', icon: ShieldCheck },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const fields = $derived<CatalogEntityDetailField[]>([
		{ label: t('product.kind'), value: conditionTypeLabel(item) },
		{ label: t('formulary.classification'), value: item.extension.classification ?? t('common.notInformed') },
		{ label: t('formulary.originFilter'), value: catalogOriginLabel(item.origin) },
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions) }
	]);
	const sectionTexts = $derived(catalogSectionTexts(conditionProfileSectionIds, item.extension.sections));

	function conditionTypeLabel(source: ConditionCatalogItem): string {
		const subtype = conditionTypeSubtype(source.type);
		if (subtype === 'syndrome') return t('catalog.condition.type.syndrome');
		if (subtype === 'disorder') return t('catalog.condition.type.disorder');
		if (subtype === 'injury') return t('catalog.condition.type.injury');
		return t('catalog.condition.type.disease');
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
/>
