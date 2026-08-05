import type { BreedReferenceProfile } from '@vet/types/domain/pet/breed-reference.js';
import { getBreedReferenceByBreedId, listBreedReferences } from '@vet/modules/knowledge/repositories/breed-reference.repository.js';

export async function loadBreedReferenceProfiles(includeImages = true): Promise<BreedReferenceProfile[]> {
	return listBreedReferences(includeImages);
}

export async function loadBreedReferenceProfile(breedId: string): Promise<BreedReferenceProfile | null> {
	return getBreedReferenceByBreedId(breedId);
}
