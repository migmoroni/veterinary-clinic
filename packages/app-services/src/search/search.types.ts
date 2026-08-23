import type { ActiveIngredientCatalogItem } from '@vet/types/domain/active-ingredient/catalog.js';
import type { ConditionCatalogItem } from '@vet/types/domain/condition/catalog.js';
import type { ManufacturerCatalogItem } from '@vet/types/domain/manufacturer/catalog.js';
import type { Owner } from '@vet/types/domain/owner/owner.js';
import type { BreedReferenceProfile, BreedSizeCategory } from '@vet/types/domain/pet/breed-reference.js';
import type { Pet } from '@vet/types/domain/pet/pet.js';
import type { ProductCatalogItem, ProductCatalogSource, ProductSpecies } from '@vet/types/domain/product/catalog.js';
import type { SearchResult, SearchResultKind } from '@vet/types/domain/search/search.js';
import type { TreatmentCatalogItem, TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import type { Locale } from '@vet/types/i18n/locales.js';

export type SearchTarget = 'global' | 'catalog' | 'breed_reference' | 'owners' | 'pets_for_owner_link' | 'treatment_catalog';
export type CatalogSearchKind = 'product' | 'manufacturer' | 'activeIngredient' | 'condition';
export type CatalogSearchKindFilter = 'all' | CatalogSearchKind;
export type ProductSpeciesFilter = 'all' | ProductSpecies;
export type SearchTypeFilter = 'all' | string;
export type SearchSourceFilter = 'all' | ProductCatalogSource;
export type TreatmentKindFilter = 'all' | TreatmentKind;

export type CatalogSearchItem =
	| (ProductCatalogItem & { kind: 'product' })
	| (ManufacturerCatalogItem & { kind: 'manufacturer' })
	| (ActiveIngredientCatalogItem & { kind: 'activeIngredient' })
	| (ConditionCatalogItem & { kind: 'condition' });

export interface BaseSearchInput<Target extends SearchTarget> {
	target: Target;
	query?: string;
	limit?: number;
	locale?: Locale;
}

export interface GlobalSearchInput extends BaseSearchInput<'global'> {
	include?: readonly SearchResultKind[];
}

export interface CatalogSearchFilters {
	kind?: CatalogSearchKindFilter;
	type?: SearchTypeFilter;
	species?: ProductSpeciesFilter;
	manufacturer?: string;
	region?: string;
}

export interface CatalogSearchInput extends BaseSearchInput<'catalog'> {
	filters?: CatalogSearchFilters;
	items?: readonly CatalogSearchItem[];
	includeHidden?: boolean;
	includeImages?: boolean;
}

export interface BreedReferenceSearchFilters {
	species?: ProductSpeciesFilter;
	size?: '' | BreedSizeCategory;
	origin?: string;
}

export interface BreedReferenceSearchInput extends BaseSearchInput<'breed_reference'> {
	filters?: BreedReferenceSearchFilters;
	profiles?: readonly BreedReferenceProfile[];
	includeImages?: boolean;
}

export interface OwnersSearchInput extends BaseSearchInput<'owners'> {}

export interface PetsForOwnerLinkSearchInput extends BaseSearchInput<'pets_for_owner_link'> {
	ownerId: string;
}

export interface TreatmentCatalogSearchFilters {
	source?: SearchSourceFilter;
	type?: SearchTypeFilter;
	kind?: TreatmentKindFilter;
	species?: ProductSpeciesFilter;
	includeHidden?: boolean;
}

export interface TreatmentCatalogSearchInput extends BaseSearchInput<'treatment_catalog'> {
	filters?: TreatmentCatalogSearchFilters;
	items?: readonly TreatmentCatalogItem[];
	includeImages?: boolean;
}

export type QuerySearchInput = GlobalSearchInput | CatalogSearchInput | BreedReferenceSearchInput | OwnersSearchInput | PetsForOwnerLinkSearchInput | TreatmentCatalogSearchInput;

export type QuerySearchResult<Input extends QuerySearchInput> = Input extends GlobalSearchInput
	? SearchResult[]
	: Input extends CatalogSearchInput
		? CatalogSearchItem[]
		: Input extends BreedReferenceSearchInput
			? BreedReferenceProfile[]
			: Input extends OwnersSearchInput
				? Owner[]
				: Input extends PetsForOwnerLinkSearchInput
					? Pet[]
					: Input extends TreatmentCatalogSearchInput
						? TreatmentCatalogItem[]
						: never;
