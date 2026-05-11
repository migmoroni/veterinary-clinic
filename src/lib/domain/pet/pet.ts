import type { PetBreed, PetSpecies } from './taxonomy.js';

export type { PetBreed, PetSpecies } from './taxonomy.js';

export type PetSex = 'M' | 'F' | null;

export interface Pet {
	id: number;
	ownerId: number;
	name: string;
	birthDate: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatarBytes: Uint8Array | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface PetInput {
	name: string;
	birthDate: string;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatarBytes?: Uint8Array | null;
}