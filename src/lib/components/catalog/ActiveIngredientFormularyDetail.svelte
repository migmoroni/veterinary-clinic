<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailSection } from '$lib/components/catalog/CatalogEntityDetail.svelte';
	import { activeIngredientClassificationGroups } from '$lib/components/catalog/active-ingredient-detail-utils.js';
	import { catalogOriginLabel, catalogRegionSummary, catalogSectionTexts } from '$lib/components/catalog/catalog-detail-utils.js';
	import { activeIngredientProfileSectionIds, activeIngredientTypeSubtype, type ActiveIngredientCatalogItem, type ActiveIngredientProfileSectionId } from '$lib/domain/active-ingredient/catalog.js';
	import { i18n, t } from '$lib/i18n/index.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import Quote from '@lucide/svelte/icons/quote';
	import ShieldAlert from '@lucide/svelte/icons/shield-alert';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import Stethoscope from '@lucide/svelte/icons/stethoscope';

	let { item }: { item: ActiveIngredientCatalogItem } = $props();

	type ActiveIngredientDetailSectionId = 'classification' | ActiveIngredientProfileSectionId;

	const sectionConfigs: CatalogEntityDetailSection<ActiveIngredientDetailSectionId>[] = [
		{ id: 'classification', labelKey: 'formulary.classification', icon: SlidersHorizontal },
		{ id: 'about', labelKey: 'catalog.section.about', icon: BookOpenText },
		{ id: 'uses', labelKey: 'catalog.section.uses', icon: Stethoscope },
		{ id: 'safety', labelKey: 'catalog.section.safety', icon: ShieldAlert },
		{ id: 'references', labelKey: 'catalog.section.references', icon: Quote }
	];
	const fields = $derived<CatalogEntityDetailField[]>([
		{ label: t('formulary.kind'), value: subtypeLabel(item) },
		{ label: t('formulary.originFilter'), value: catalogOriginLabel(item.origin) },
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions) }
	]);
	const sectionFields = $derived<Record<string, CatalogEntityDetailField[]>>({
		classification: [
			{
				label: '',
				rowGroups: activeIngredientClassificationGroups(item, t, i18n.locale, t('common.notInformed'))
			}
		]
	});
	const sectionTexts = $derived(catalogSectionTexts(activeIngredientProfileSectionIds, item.extension.sections));

	function subtypeLabel(source: ActiveIngredientCatalogItem): string {
		const subtype = activeIngredientTypeSubtype(source.type);
		if (subtype === 'combination') return t('catalog.activeIngredient.type.combination');
		return t('catalog.activeIngredient.type.substance');
	}
</script>

<CatalogEntityDetail
	title={item.name}
	subtitle={t('catalog.activeIngredient')}
	imageBytes={item.primaryImage?.imageBytes ?? null}
	imageAlt={item.name}
	fallbackIcon={FlaskConical}
	{fields}
	sections={sectionConfigs}
	{sectionTexts}
	{sectionFields}
/>
