import type { Owner } from '@vet/types/domain/owner/owner.js';
import type { Pet } from '@vet/types/domain/pet/pet.js';
import type { ClinicSearchResultKind, SearchResult } from '@vet/types/domain/search/search.js';
import type { Locale } from '@vet/types/i18n/locales.js';
import { searchOwners as searchRegistryOwners } from '@vet/modules/registry/owners';
import { searchExistingPetsForOwner as searchRegistryPetsForOwnerLink } from '@vet/modules/registry/pets';
import { filterActiveSearchResults as filterActiveClinicSearchResults, searchClinic } from './search.read-model.js';

export { filterActiveClinicSearchResults, searchClinic };

export async function searchOwnersForSelection(query = '', limit = 100): Promise<Owner[]> {
	return (await searchRegistryOwners(query)).slice(0, Math.max(0, Math.trunc(limit)));
}

export async function searchPetsForOwnerLink(ownerId: string, query: string, limit = 20): Promise<Pet[]> {
	return (await searchRegistryPetsForOwnerLink(ownerId, query)).slice(0, Math.max(0, Math.trunc(limit)));
}

export async function searchClinicResults(query: string, kinds: readonly ClinicSearchResultKind[], locale: Locale): Promise<SearchResult[]> {
	return searchClinic(query, kinds, locale);
}
