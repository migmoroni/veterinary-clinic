import type { BreedReferenceProfile } from '$lib/domain/pet/breed-reference.js';
import { getBreedReferenceByBreedId, listBreedReferences } from '$lib/persistence/repositories/breed-reference.repository.js';

export async function loadBreedReferenceProfiles(): Promise<BreedReferenceProfile[]> {
	return listBreedReferences();
}

export async function loadBreedReferenceProfile(breedId: string): Promise<BreedReferenceProfile | null> {
	return getBreedReferenceByBreedId(breedId);
}
