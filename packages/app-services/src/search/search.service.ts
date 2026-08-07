import { i18n } from '@vet/core-local/i18n/index.js';
import { searchBreedReferences, searchCatalog } from './knowledge-search.service.js';
import { searchGlobal, searchEverywhere } from './global-search.service.js';
import { searchOwnersForSelection, searchPetsForOwnerLink } from './registry-search.read-model.js';
import { searchTreatmentCatalog } from './treatment-catalog-search.service.js';
import type {
	BreedReferenceSearchInput,
	CatalogSearchInput,
	GlobalSearchInput,
	OwnersSearchInput,
	PetsForOwnerLinkSearchInput,
	QuerySearchInput,
	QuerySearchResult,
	TreatmentCatalogSearchInput
} from './search.types.js';

export { searchEverywhere };
export { filterActiveSearchResults } from './recent-search.service.js';

export function querySearch(input: GlobalSearchInput): Promise<QuerySearchResult<GlobalSearchInput>>;
export function querySearch(input: CatalogSearchInput): Promise<QuerySearchResult<CatalogSearchInput>>;
export function querySearch(input: BreedReferenceSearchInput): Promise<QuerySearchResult<BreedReferenceSearchInput>>;
export function querySearch(input: OwnersSearchInput): Promise<QuerySearchResult<OwnersSearchInput>>;
export function querySearch(input: PetsForOwnerLinkSearchInput): Promise<QuerySearchResult<PetsForOwnerLinkSearchInput>>;
export function querySearch(input: TreatmentCatalogSearchInput): Promise<QuerySearchResult<TreatmentCatalogSearchInput>>;
export async function querySearch(input: QuerySearchInput): Promise<QuerySearchResult<QuerySearchInput>> {
	const locale = input.locale ?? i18n.locale;

	if (input.target === 'global') return searchGlobal({ ...input, locale }) as Promise<QuerySearchResult<QuerySearchInput>>;
	if (input.target === 'catalog') return searchCatalog({ ...input, locale }) as Promise<QuerySearchResult<QuerySearchInput>>;
	if (input.target === 'breed_reference') return searchBreedReferences({ ...input, locale }) as Promise<QuerySearchResult<QuerySearchInput>>;
	if (input.target === 'owners') return searchOwnersForSelection(input.query ?? '', input.limit) as Promise<QuerySearchResult<QuerySearchInput>>;
	if (input.target === 'pets_for_owner_link') return searchPetsForOwnerLink(input.ownerId, input.query ?? '', input.limit) as Promise<QuerySearchResult<QuerySearchInput>>;

	return searchTreatmentCatalog({ ...input, locale }) as Promise<QuerySearchResult<QuerySearchInput>>;
}
