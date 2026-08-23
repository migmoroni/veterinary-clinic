import { CLINIC_SEARCH_RESULT_KINDS, REFERENCE_SEARCH_RESULT_KINDS, type ClinicSearchResultKind, type ReferenceSearchResultKind, type SearchResult, type SearchResultKind } from '@vet/types/domain/search/search.js';
import { i18n } from '@vet/core-local/i18n/index.js';
import { searchTerms } from './search-query.js';
import { searchReferenceResults } from './knowledge-search.service.js';
import { searchClinicResults } from './registry-search.read-model.js';
import type { GlobalSearchInput } from './search.types.js';

const defaultGlobalSearchLimit = 80;

export async function searchGlobal(input: Omit<GlobalSearchInput, 'target'>): Promise<SearchResult[]> {
	const locale = input.locale ?? i18n.locale;
	const query = input.query ?? '';
	if (searchTerms(query, locale, 'locale').length === 0) return [];

	const include = input.include ?? [];
	const clinicKinds = CLINIC_SEARCH_RESULT_KINDS.filter((kind): kind is ClinicSearchResultKind => shouldSearchKind(kind, include));
	const referenceKinds = REFERENCE_SEARCH_RESULT_KINDS.filter((kind): kind is ReferenceSearchResultKind => shouldSearchKind(kind, include));
	const [clinicResults, referenceResults] = await Promise.all([
		clinicKinds.length > 0 ? searchClinicResults(query, clinicKinds, locale) : Promise.resolve([]),
		referenceKinds.length > 0 ? searchReferenceResults(query, referenceKinds, locale) : Promise.resolve([])
	]);

	return [...clinicResults, ...referenceResults].slice(0, input.limit ?? defaultGlobalSearchLimit);
}

export async function searchEverywhere(query: string, kinds: readonly SearchResultKind[] = []): Promise<SearchResult[]> {
	return searchGlobal({ query, include: kinds });
}

function shouldSearchKind(kind: SearchResultKind, selectedKinds: readonly SearchResultKind[]): boolean {
	return selectedKinds.length === 0 || selectedKinds.includes(kind);
}
