import type { PetBreed, PetSpecies } from './taxonomy.js';

export type { PetBreed, PetSpecies } from './taxonomy.js';

export type PetSex = 'M' | 'F' | null;

export interface Pet {
	id: string;
	ownerIds: string[];
	name: string;
	birthDate: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatarBytes: Uint8Array | null;
	createdAt: string | null;
	updatedAt: string | null;
	removedAt: string | null;
}

export interface PetInput {
	name: string;
	birthDate: string;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatarBytes?: Uint8Array | null;
}
