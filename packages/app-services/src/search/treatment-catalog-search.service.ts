import { productItemMatchesSpecies } from '@vet/types/domain/product/catalog.js';
import { productTypeLabel, productTypeMatchesFilter } from '@vet/types/domain/product/type-labels.js';
import type { TreatmentCatalogItem } from '@vet/types/domain/treatment/treatment.js';
import type { Locale } from '@vet/types/i18n/locales.js';
import { i18n, t } from '@vet/core-local/i18n/index.js';
import { loadAllTreatmentCatalogItems } from '@vet/modules/knowledge/products';
import { queryCollectionSearch, type CollectionSearchFilter, type SearchScoreFields } from './search-query.js';
import type { TreatmentCatalogSearchFilters, TreatmentCatalogSearchInput } from './search.types.js';

export async function searchTreatmentCatalog(input: Omit<TreatmentCatalogSearchInput, 'target'> = {}): Promise<TreatmentCatalogItem[]> {
	const includeHidden = input.filters?.includeHidden ?? false;
	const items = input.items ?? (await loadAllTreatmentCatalogItems(includeHidden, input.includeImages ?? true));
	return filterTreatmentCatalogItems({
		query: input.query,
		items,
		filters: input.filters,
		limit: input.limit,
		locale: input.locale
	});
}

export function filterTreatmentCatalogItems(input: { query?: string; items: readonly TreatmentCatalogItem[]; filters?: TreatmentCatalogSearchFilters; limit?: number; locale?: Locale }): TreatmentCatalogItem[] {
	const locale = input.locale ?? i18n.locale;
	return queryCollectionSearch({
		query: input.query,
		items: input.items,
		fields: treatmentCatalogSearchFields,
		filters: treatmentCatalogFilters(input.filters),
		limit: input.limit,
		locale,
		termMode: 'plain',
		compare: (first, second) => first.name.localeCompare(second.name, locale) || first.kind.localeCompare(second.kind, locale)
	}).items;
}

function treatmentCatalogFilters(filters: TreatmentCatalogSearchFilters = {}): CollectionSearchFilter<TreatmentCatalogItem>[] {
	return [
		{
			isActive: !(filters.includeHidden ?? false),
			matches: (item) => !item.hiddenAt
		},
		{
			isActive: !!filters.source && filters.source !== 'all',
			matches: (item) => item.source === filters.source
		},
		{
			isActive: !!filters.kind && filters.kind !== 'all',
			matches: (item) => item.kind === filters.kind
		},
		{
			isActive: !!filters.type && filters.type !== 'all',
			matches: (item) => productTypeMatchesFilter(item.type, filters.type ?? 'all')
		},
		{
			isActive: !!filters.species && filters.species !== 'all',
			matches: (item) => productItemMatchesSpecies(item.species, filters.species)
		}
	];
}

function treatmentCatalogSearchFields(item: TreatmentCatalogItem): SearchScoreFields {
	return {
		primary: [item.name, item.id, ...item.aliases],
		support: [item.manufacturerName, productTypeLabel(item.type, t), item.kind],
		metadata: [item.regions.join(' '), item.species.join(' ')],
		details: [item.extension.commercialLine, ...Object.values(item.extension.sections).map((text) => text?.trim() ?? '')]
	};
}
