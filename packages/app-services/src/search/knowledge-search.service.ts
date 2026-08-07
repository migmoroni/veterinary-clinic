import type { ActiveIngredientCatalogItem } from '@vet/types/domain/active-ingredient/catalog.js';
import { activeIngredientClassificationLabel, activeIngredientClassificationSearchText } from '@vet/types/domain/active-ingredient/classification.js';
import { CONDITION_CLASSIFICATION_AXES, type ConditionCatalogItem } from '@vet/types/domain/condition/catalog.js';
import { MANUFACTURER_CLASSIFICATION_AXES, type ManufacturerCatalogItem } from '@vet/types/domain/manufacturer/catalog.js';
import { conditionClassificationLabel, manufacturerClassificationLabel } from '@vet/types/domain/catalog/classification-labels.js';
import { catalogPathTypeLabel } from '@vet/types/domain/catalog/type-labels.js';
import type { BreedReferenceProfile, BreedSizeCategory } from '@vet/types/domain/pet/breed-reference.js';
import { productClassificationLabel, productClassificationSearchText } from '@vet/types/domain/product/classification.js';
import { productLeafletSectionIds, type ProductCatalogItem, type ProductLeafletSectionId, type ProductSpecies } from '@vet/types/domain/product/catalog.js';
import { productTypeLabel, productTypeMatchesFilter } from '@vet/types/domain/product/type-labels.js';
import { isReferenceSearchResultKind, type ReferenceSearchResultKind, type SearchResult } from '@vet/types/domain/search/search.js';
import type { Locale } from '@vet/types/i18n/locales.js';
import { countryOptions } from '@vet/types/domain/geo/location.js';
import { i18n, t, type TranslationKey } from '@vet/core-local/i18n/index.js';
import { loadBreedReferenceProfiles, loadCatalogActiveIngredients, loadCatalogConditions, loadCatalogManufacturers, loadCatalogProducts } from '@vet/modules/knowledge';
import { acceptsAverageScore, queryCollectionSearch, type CollectionSearchFilter, type SearchScoreFields } from './search-query.js';
import type { CatalogSearchFilters, CatalogSearchInput, CatalogSearchItem, SearchTypeFilter } from './search.types.js';

export async function searchCatalog(input: Omit<CatalogSearchInput, 'target'> = {}): Promise<CatalogSearchItem[]> {
	const items = input.items ?? (await loadCatalogSearchItems(input.includeHidden ?? false, input.includeImages ?? true));
	return filterCatalogSearchItems({
		query: input.query,
		items,
		filters: input.filters,
		limit: input.limit,
		locale: input.locale
	});
}

export function filterCatalogSearchItems(input: { query?: string; items: readonly CatalogSearchItem[]; filters?: CatalogSearchFilters; limit?: number; locale?: Locale }): CatalogSearchItem[] {
	return queryCollectionSearch({
		query: input.query,
		items: input.items,
		fields: catalogSearchFields,
		filters: catalogSearchFilters(input.filters),
		limit: input.limit,
		locale: input.locale ?? i18n.locale,
		termMode: 'plain',
		compare: (first, second) => first.name.localeCompare(second.name, input.locale ?? i18n.locale)
	}).items;
}

export async function searchBreedReferences(input: { query?: string; filters?: { species?: 'all' | ProductSpecies; size?: '' | BreedSizeCategory; origin?: string }; profiles?: readonly BreedReferenceProfile[]; includeImages?: boolean; limit?: number; locale?: Locale } = {}): Promise<BreedReferenceProfile[]> {
	const profiles = input.profiles ?? (await loadBreedReferenceProfiles(input.includeImages ?? true));
	return filterBreedReferenceProfiles({
		query: input.query,
		profiles,
		filters: input.filters,
		limit: input.limit,
		locale: input.locale
	});
}

export function filterBreedReferenceProfiles(input: { query?: string; profiles: readonly BreedReferenceProfile[]; filters?: { species?: 'all' | ProductSpecies; size?: '' | BreedSizeCategory; origin?: string }; limit?: number; locale?: Locale }): BreedReferenceProfile[] {
	const locale = input.locale ?? i18n.locale;
	return queryCollectionSearch({
		query: input.query,
		items: input.profiles,
		fields: breedSearchFields,
		filters: breedSearchFilters(input.filters),
		limit: input.limit,
		locale,
		termMode: 'plain',
		compare: (first, second) => breedName(first).localeCompare(breedName(second), locale)
	}).items;
}

export async function searchReferenceResults(query: string, kinds: readonly ReferenceSearchResultKind[], locale: Locale = i18n.locale): Promise<SearchResult[]> {
	const [breedResults, productResults, manufacturerResults, activeIngredientResults, conditionResults] = await Promise.all([
		kinds.includes('breed') ? searchBreedReferenceResults(query, locale) : Promise.resolve([]),
		kinds.includes('product') ? searchProductResults(query, locale) : Promise.resolve([]),
		kinds.includes('manufacturer') ? searchManufacturerResults(query, locale) : Promise.resolve([]),
		kinds.includes('activeIngredient') ? searchActiveIngredientResults(query, locale) : Promise.resolve([]),
		kinds.includes('condition') ? searchConditionResults(query, locale) : Promise.resolve([])
	]);

	return [...breedResults, ...productResults, ...manufacturerResults, ...activeIngredientResults, ...conditionResults];
}

export async function activeReferenceResultKeys(results: readonly SearchResult[]): Promise<Set<string>> {
	const referenceResults = results.filter((result) => isReferenceSearchResultKind(result.kind));
	if (referenceResults.length === 0) return new Set<string>();

	const [profiles, products, manufacturers, activeIngredients, conditions] = await Promise.all([
		loadBreedReferenceProfiles(false),
		loadCatalogProducts(true, false),
		loadCatalogManufacturers(true, false),
		loadCatalogActiveIngredients(true, false),
		loadCatalogConditions(true, false)
	]);
	const breedIds = new Set(profiles.map((profile) => profile.breedId));
	const productIds = new Set(products.map((item) => item.id));
	const manufacturerIds = new Set(manufacturers.map((item) => item.id));
	const activeIngredientIds = new Set(activeIngredients.map((item) => item.id));
	const conditionIds = new Set(conditions.map((item) => item.id));
	const activeKeys = new Set<string>();

	for (const result of referenceResults) {
		if (result.kind === 'breed' && breedIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'product' && productIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'manufacturer' && manufacturerIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'activeIngredient' && activeIngredientIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'condition' && conditionIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
	}

	return activeKeys;
}

export async function loadCatalogSearchItems(includeHidden = false, includeImages = true): Promise<CatalogSearchItem[]> {
	const [products, manufacturers, activeIngredients, conditions] = await Promise.all([
		loadCatalogProducts(includeHidden, includeImages),
		loadCatalogManufacturers(includeHidden, includeImages),
		loadCatalogActiveIngredients(includeHidden, includeImages),
		loadCatalogConditions(includeHidden, includeImages)
	]);

	return [
		...products.map((item) => ({ ...item, kind: 'product' as const })),
		...manufacturers.map((item) => ({ ...item, kind: 'manufacturer' as const })),
		...activeIngredients.map((item) => ({ ...item, kind: 'activeIngredient' as const })),
		...conditions.map((item) => ({ ...item, kind: 'condition' as const }))
	];
}

function catalogSearchFilters(filters: CatalogSearchFilters = {}): CollectionSearchFilter<CatalogSearchItem>[] {
	return [
		{
			isActive: !!filters.kind && filters.kind !== 'all',
			matches: (item) => item.kind === filters.kind
		},
		{
			isActive: !!filters.region,
			matches: (item) => item.regions.includes(filters.region ?? '')
		},
		{
			isActive: !!filters.type && filters.type !== 'all',
			matches: (item) => catalogItemTypeMatchesFilter(item, filters.type ?? 'all')
		},
		{
			isActive: !!filters.species && filters.species !== 'all',
			matches: (item) => item.kind === 'product' && item.species.includes(filters.species as ProductSpecies)
		},
		{
			isActive: !!filters.manufacturer,
			matches: (item) => item.kind === 'product' && item.manufacturerName === filters.manufacturer
		}
	];
}

function breedSearchFilters(filters: { species?: 'all' | ProductSpecies; size?: '' | BreedSizeCategory; origin?: string } = {}): CollectionSearchFilter<BreedReferenceProfile>[] {
	return [
		{
			isActive: !!filters.species && filters.species !== 'all',
			matches: (profile) => profile.species === filters.species
		},
		{
			isActive: !!filters.size,
			matches: (profile) => profile.sizeCategory === filters.size
		},
		{
			isActive: !!filters.origin,
			matches: (profile) => profile.origin.id === filters.origin
		}
	];
}

function catalogItemTypeMatchesFilter(item: CatalogSearchItem, filter: SearchTypeFilter): boolean {
	if (filter === 'all') return true;
	if (item.kind === 'product') return productTypeMatchesFilter(item.type, filter);
	if (item.kind === 'activeIngredient') return catalogTypeMatchesFilter(item.type, filter);
	if (item.kind === 'condition') return catalogTypeMatchesFilter(item.type, filter);
	return false;
}

function catalogTypeMatchesFilter(type: readonly (string | null)[], filter: string): boolean {
	try {
		const parsed = JSON.parse(filter);
		if (!Array.isArray(parsed)) return false;
		return parsed.every((segment, index) => segment === null || type[index] === segment);
	} catch {
		return false;
	}
}

function catalogSearchFields(item: CatalogSearchItem): SearchScoreFields {
	if (item.kind === 'product') return productSearchFields(item);
	if (item.kind === 'manufacturer') return manufacturerSearchFields(item);
	if (item.kind === 'activeIngredient') return activeIngredientSearchFields(item);
	return conditionSearchFields(item);
}

function breedSearchFields(profile: BreedReferenceProfile): SearchScoreFields {
	return {
		primary: [breedName(profile), profile.breedId],
		support: [breedOriginLabel(profile)],
		metadata: [speciesLabel(profile.species), breedSizeLabel(profile.sizeCategory)],
		details: Object.values(profile.extension.sections)
	};
}

function productSearchFields(item: ProductCatalogItem): SearchScoreFields {
	return {
		primary: [item.name, String(item.id), ...item.aliases],
		support: [item.manufacturerName, ...item.activeIngredients.map((ingredient) => ingredient.name), productCatalogTypeLabel(item), productCatalogClassificationLabel(item), productClassificationSearchText(item, t), item.extension.commercialLine],
		metadata: [speciesSummary(item.species), item.regions.map(regionLabel).join(' ')],
		details: productLeafletSectionIds.map((sectionId) => productSectionText(item, sectionId))
	};
}

function manufacturerSearchFields(item: ManufacturerCatalogItem): SearchScoreFields {
	return {
		primary: [item.name, String(item.id), ...item.aliases],
		support: [t('catalog.manufacturer'), manufacturerCatalogClassificationLabel(item), item.extension.website],
		metadata: [item.regions.map(regionLabel).join(' ')],
		details: manufacturerSectionText(item)
	};
}

function activeIngredientSearchFields(item: ActiveIngredientCatalogItem): SearchScoreFields {
	return {
		primary: [item.name, String(item.id), ...item.aliases],
		support: [t('catalog.activeIngredient'), activeIngredientTypeLabel(item), activeIngredientCatalogClassificationLabel(item), activeIngredientCatalogClassificationSearchText(item)],
		metadata: [item.regions.map(regionLabel).join(' ')],
		details: activeIngredientSectionText(item)
	};
}

function conditionSearchFields(item: ConditionCatalogItem): SearchScoreFields {
	return {
		primary: [item.name, String(item.id), ...item.aliases],
		support: [t('catalog.condition'), conditionTypeLabel(item), conditionCatalogClassificationLabel(item)],
		metadata: [item.regions.map(regionLabel).join(' ')],
		details: conditionSectionText(item)
	};
}

async function searchBreedReferenceResults(query: string, locale: Locale): Promise<SearchResult[]> {
	const profiles = await loadBreedReferenceProfiles(false);
	return queryCollectionSearch({
		query,
		items: profiles,
		fields: breedSearchFields,
		locale,
		termMode: 'locale',
		requireQueryMatch: true,
		acceptsScore: acceptsAverageScore,
		compare: (first, second) => breedName(first).localeCompare(breedName(second), locale)
	}).items.map((profile) => ({
		kind: 'breed',
		id: profile.breedId,
		ownerId: null,
		petId: null,
		title: breedName(profile),
		subtitle: `${speciesLabel(profile.species)} · ${breedSizeLabel(profile.sizeCategory)}`,
		referenceImageBytes: null
	}));
}

async function searchProductResults(query: string, locale: Locale): Promise<SearchResult[]> {
	const items = await loadCatalogProducts(true, false);
	return referenceResultItems(query, items, productSearchFields, locale).map((item) => ({
		kind: 'product',
		id: item.id,
		ownerId: null,
		petId: null,
		title: item.name,
		subtitle: [productCatalogTypeLabel(item), item.manufacturerName].filter(Boolean).join(' · '),
		referenceImageBytes: null
	}));
}

async function searchManufacturerResults(query: string, locale: Locale): Promise<SearchResult[]> {
	const items = await loadCatalogManufacturers(true, false);
	return referenceResultItems(query, items, manufacturerSearchFields, locale).map((item) => ({
		kind: 'manufacturer',
		id: item.id,
		ownerId: null,
		petId: null,
		title: item.name,
		subtitle: t('catalog.manufacturer'),
		referenceImageBytes: null
	}));
}

async function searchActiveIngredientResults(query: string, locale: Locale): Promise<SearchResult[]> {
	const items = await loadCatalogActiveIngredients(true, false);
	return referenceResultItems(query, items, activeIngredientSearchFields, locale).map((item) => ({
		kind: 'activeIngredient',
		id: item.id,
		ownerId: null,
		petId: null,
		title: item.name,
		subtitle: [t('catalog.activeIngredient'), activeIngredientTypeLabel(item)].join(' · '),
		referenceImageBytes: null
	}));
}

async function searchConditionResults(query: string, locale: Locale): Promise<SearchResult[]> {
	const items = await loadCatalogConditions(true, false);
	return referenceResultItems(query, items, conditionSearchFields, locale).map((item) => ({
		kind: 'condition',
		id: item.id,
		ownerId: null,
		petId: null,
		title: item.name,
		subtitle: [t('catalog.condition'), conditionTypeLabel(item)].join(' · '),
		referenceImageBytes: null
	}));
}

function referenceResultItems<Item>(query: string, items: readonly Item[], fields: (item: Item) => SearchScoreFields, locale: Locale): Item[] {
	return queryCollectionSearch({
		query,
		items,
		fields,
		locale,
		termMode: 'locale',
		requireQueryMatch: true,
		acceptsScore: acceptsAverageScore,
		compare: (first, second) => itemName(first).localeCompare(itemName(second), locale)
	}).items;
}

function itemName(item: unknown): string {
	return typeof item === 'object' && item !== null && 'name' in item && typeof item.name === 'string' ? item.name : '';
}

function breedName(profile: BreedReferenceProfile): string {
	return t(profile.labelKey);
}

function speciesLabel(species: ProductSpecies): string {
	return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
}

function speciesSummary(species: readonly ProductSpecies[]): string {
	return species.map(speciesLabel).join(', ');
}

function productCatalogTypeLabel(item: ProductCatalogItem): string {
	return productTypeLabel(item.type, t);
}

function productCatalogClassificationLabel(item: ProductCatalogItem): string {
	return productClassificationLabel(item, t) ?? '';
}

function manufacturerCatalogClassificationLabel(item: ManufacturerCatalogItem): string {
	return manufacturerClassificationLabel(item.extension.classification, MANUFACTURER_CLASSIFICATION_AXES, t) ?? '';
}

function activeIngredientCatalogClassificationLabel(item: ActiveIngredientCatalogItem): string {
	return activeIngredientClassificationLabel(item.extension.classification, t, i18n.locale) ?? '';
}

function activeIngredientCatalogClassificationSearchText(item: ActiveIngredientCatalogItem): string {
	return activeIngredientClassificationSearchText(item.extension.classification, t, i18n.locale);
}

function conditionCatalogClassificationLabel(item: ConditionCatalogItem): string {
	return conditionClassificationLabel(item.extension.classification, CONDITION_CLASSIFICATION_AXES, t) ?? '';
}

function breedSizeLabel(size: BreedSizeCategory): string {
	return t(`breedReference.size.${size}` as TranslationKey);
}

function breedOriginLabel(profile: BreedReferenceProfile): string {
	if (profile.origin.labelKey) return t(profile.origin.labelKey);
	return profile.origin.id;
}

function regionLabel(region: string): string {
	return countryOptions(i18n.locale).find((country) => country.value === region)?.label ?? region;
}

function productSectionText(item: ProductCatalogItem, sectionId: ProductLeafletSectionId): string {
	return item.extension.sections[sectionId]?.trim() ?? '';
}

function manufacturerSectionText(item: ManufacturerCatalogItem): string[] {
	return Object.values(item.extension.sections).map((text) => text?.trim() ?? '');
}

function activeIngredientSectionText(item: ActiveIngredientCatalogItem): string[] {
	return Object.values(item.extension.sections).map((text) => text?.trim() ?? '');
}

function conditionSectionText(item: ConditionCatalogItem): string[] {
	return Object.values(item.extension.sections).map((text) => text?.trim() ?? '');
}

function activeIngredientTypeLabel(item: ActiveIngredientCatalogItem): string {
	return catalogPathTypeLabel('catalog.activeIngredient.type', item.type, t);
}

function conditionTypeLabel(item: ConditionCatalogItem): string {
	return catalogPathTypeLabel('catalog.condition.type', item.type, t);
}

function searchResultKey(result: SearchResult): string {
	return `${result.kind}:${result.id}`;
}
