<script lang="ts">
	import CatalogEntityDetail, { type CatalogEntityDetailField, type CatalogEntityDetailFieldTable, type CatalogEntityDetailSection } from '@vet/modules/knowledge/components/catalog/CatalogEntityDetail.svelte';
	import { catalogRegionSummary, catalogSectionTexts } from '@vet/modules/knowledge/components/catalog/catalog-detail-utils.js';
	import { manufacturerClassificationGroups } from '@vet/types/domain/catalog/classification-labels.js';
	import { MANUFACTURER_CLASSIFICATION_AXES, manufacturerProfileSectionIds, type ManufacturerCatalogItem, type ManufacturerProfileSectionId } from '@vet/types/domain/manufacturer/catalog.js';
	import { productTypeLabel, productTypeSubtypeLabel, productTypeMainLabel } from '@vet/types/domain/product/type-labels.js';
	import { productTypeMain, type ProductCatalogItem, type ProductSpecies, type ProductType } from '@vet/types/domain/product/catalog.js';
	import { t, type TranslationKey } from '@vet/core-local/i18n/index.js';
	import { loadCatalogProducts } from '@vet/modules/knowledge/services/catalog.service.js';
	import BookOpenText from '@lucide/svelte/icons/book-open-text';
	import BriefcaseBusiness from '@lucide/svelte/icons/briefcase-business';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Headphones from '@lucide/svelte/icons/headphones';
	import Quote from '@lucide/svelte/icons/quote';
	import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
	import { onMount } from 'svelte';

	let { item }: { item: ManufacturerCatalogItem } = $props();
	let portfolioProducts = $state<ProductCatalogItem[]>([]);
	let portfolioLoading = $state(true);

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
		{ label: t('product.regions'), value: catalogRegionSummary(item.regions) }
	]);
	const sectionFields = $derived<Record<string, CatalogEntityDetailField[]>>({
		classification: manufacturerClassificationFields(item),
		portfolio: manufacturerPortfolioFields()
	});
	const sectionTexts = $derived(catalogSectionTexts(manufacturerProfileSectionIds, item.extension.sections));

	onMount(() => {
		void loadPortfolioProducts();
	});

	async function loadPortfolioProducts() {
		portfolioLoading = true;
		try {
			const products = await loadCatalogProducts(false, false);
			portfolioProducts = products.filter((product) => product.manufacturerId === item.id).sort((first, second) => first.name.localeCompare(second.name));
		} catch {
			portfolioProducts = [];
		} finally {
			portfolioLoading = false;
		}
	}

	function manufacturerClassificationFields(source: ManufacturerCatalogItem): CatalogEntityDetailField[] {
		return [
			{
				label: '',
				rowGroups: manufacturerClassificationGroups(source.extension.classification, MANUFACTURER_CLASSIFICATION_AXES, t, t('common.notInformed'))
			}
		];
	}

	function manufacturerPortfolioFields(): CatalogEntityDetailField[] {
		if (portfolioLoading) {
			return [{ label: '', value: t('common.loading') }];
		}

		if (portfolioProducts.length === 0) {
			return [{ label: '', value: t('catalog.manufacturer.portfolio.empty') }];
		}

		return [
			{
				label: '',
				value: item.extension.sections.portfolio?.trim() || t('catalog.manufacturer.portfolio.description')
			},
			{
				label: '',
				tables: portfolioTables()
			}
		];
	}

	function portfolioTables(): CatalogEntityDetailFieldTable[] {
		const groups = new Map<string, { label: string; products: ProductCatalogItem[] }>();
		for (const product of portfolioProducts) {
			const key = productTypeGroupKey(product.type);
			const group = groups.get(key) ?? { label: productTypeGroupLabel(product.type), products: [] };
			group.products.push(product);
			groups.set(key, group);
		}

		return [...groups.values()]
			.sort((first, second) => first.label.localeCompare(second.label))
			.map((group) => ({
				label: group.label,
				columns: [t('catalog.manufacturer.portfolio.product'), t('catalog.manufacturer.portfolio.category'), t('catalog.manufacturer.portfolio.activeIngredient'), t('product.species')],
				rows: group.products.map((product) => ({
					cells: [
						{ value: product.name, href: `/formulary/products/${product.id}` },
						{ value: productCategoryLabel(product) },
						{ value: productActiveIngredientsLabel(product) },
						{ value: productSpeciesLabel(product.species) }
					]
				}))
			}));
	}

	function productTypeGroupKey(type: ProductType): string {
		return productTypeLabel(type, t);
	}

	function productTypeGroupLabel(type: ProductType): string {
		return productTypeSubtypeLabel(type, t) ?? productTypeMainLabel(productTypeMain(type), t);
	}

	function productCategoryLabel(product: ProductCatalogItem): string {
		const compositionOrigin = product.extension.classification.commercialTherapeutic.compositionOrigin;
		return compositionOrigin ? t(`catalog.product.classification.origin.${compositionOrigin}` as TranslationKey) : productTypeLabel(product.type, t);
	}

	function productActiveIngredientsLabel(product: ProductCatalogItem): string {
		return product.activeIngredients.map((activeIngredient) => activeIngredient.name).join(', ') || t('common.notInformed');
	}

	function productSpeciesLabel(species: readonly ProductSpecies[]): string {
		return species.map((value) => (value === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline'))).join(', ') || t('common.notInformed');
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
