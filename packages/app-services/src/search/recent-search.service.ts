import type { OwnerAssociatedContact } from '@vet/types/domain/owner/owner.js';
import { isClinicSearchResultKind, type ClinicSearchResultKind, type SearchResult } from '@vet/types/domain/search/search.js';
import { loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds } from '@vet/modules/registry';
import { listOwnerAssociatedContactsByOwnerIds } from '@vet/modules/registry/owners';
import { activeReferenceResultKeys } from './knowledge-search.service.js';
import { filterActiveClinicSearchResults } from './registry-search.read-model.js';

export const DEFAULT_RECENT_SEARCH_LIMIT = 50;

export function searchResultKey(result: Pick<SearchResult, 'kind' | 'id'>): string {
	return `${result.kind}:${result.id}`;
}

export function persistableSearchResult(result: SearchResult): SearchResult {
	return {
		kind: result.kind,
		id: result.id,
		ownerId: result.ownerId,
		petId: result.petId,
		title: result.title,
		subtitle: result.subtitle,
		ownerContacts: result.ownerContacts
	};
}

export function normalizeSearchResult(result: SearchResult): SearchResult {
	return {
		kind: result.kind,
		id: result.id,
		ownerId: result.ownerId,
		petId: result.petId,
		title: result.title,
		subtitle: result.subtitle,
		referenceImageBytes: result.referenceImageBytes,
		ownerAvatarBytes: result.ownerAvatarBytes,
		petAvatarBytes: result.petAvatarBytes,
		ownerContacts: result.ownerContacts
	};
}

export async function filterActiveSearchResults(results: readonly SearchResult[]): Promise<SearchResult[]> {
	const [clinicResults, activeReferenceKeys] = await Promise.all([filterActiveClinicSearchResults(results.filter(isClinicSearchResult)), activeReferenceResultKeys(results)]);
	const activeClinicKeys = new Set(clinicResults.map(searchResultKey));

	return results.filter((result) => (isClinicSearchResult(result) ? activeClinicKeys.has(searchResultKey(result)) : activeReferenceKeys.has(searchResultKey(result))));
}

export async function hydrateSearchResults(baseResults: readonly SearchResult[]): Promise<SearchResult[]> {
	const normalizedBaseResults = baseResults.map(normalizeSearchResult);
	const ownerIds = normalizedBaseResults.filter((result) => result.kind === 'owner').map(textResultId).filter((id): id is string => id !== null);
	const petIds = normalizedBaseResults.filter((result) => result.kind === 'pet').map(textResultId).filter((id): id is string => id !== null);
	if (ownerIds.length === 0 && petIds.length === 0) return normalizedBaseResults;

	const [contactsResult, ownerAvatarsResult, petAvatarsResult] = await Promise.allSettled([listOwnerAssociatedContactsByOwnerIds(ownerIds), loadOwnerAvatarsByOwnerIds(ownerIds), loadPetAvatarsByPetIds(petIds)]);
	const contactsByOwnerId = contactsResult.status === 'fulfilled' ? contactsResult.value : new Map<string, OwnerAssociatedContact[]>();
	const avatarBytesByOwnerId = ownerAvatarsResult.status === 'fulfilled' ? ownerAvatarsResult.value : new Map<string, Uint8Array | null>();
	const avatarBytesByPetId = petAvatarsResult.status === 'fulfilled' ? petAvatarsResult.value : new Map<string, Uint8Array | null>();

	return normalizedBaseResults.map((result) => {
		const id = textResultId(result);
		if (result.kind === 'owner' && id !== null) return { ...result, ownerAvatarBytes: avatarBytesByOwnerId.get(id) ?? null, ownerContacts: contactsByOwnerId.get(id) ?? result.ownerContacts ?? [] };
		if (result.kind === 'pet' && id !== null) return { ...result, petAvatarBytes: avatarBytesByPetId.get(id) ?? null };
		return result;
	});
}

export function rememberSearchResult(currentResults: readonly SearchResult[], result: SearchResult, limit = DEFAULT_RECENT_SEARCH_LIMIT): SearchResult[] {
	const storedResult = persistableSearchResult(result);
	const key = searchResultKey(storedResult);
	return [storedResult, ...currentResults.filter((item) => searchResultKey(item) !== key)].slice(0, limit);
}

export function ownerContactsForSearchResult(result: SearchResult): OwnerAssociatedContact[] {
	if (result.kind !== 'owner') return [];
	return (result.ownerContacts ?? []).filter((contact) => contact.value.trim().length > 0);
}

function textResultId(result: SearchResult): string | null {
	return result.id.trim().length > 0 ? result.id : null;
}

function isClinicSearchResult(result: SearchResult): result is SearchResult & { kind: ClinicSearchResultKind } {
	return isClinicSearchResultKind(result.kind);
}
