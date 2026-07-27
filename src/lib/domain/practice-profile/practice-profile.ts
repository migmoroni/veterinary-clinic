import type { OwnerContact, OwnerContactInput } from '$lib/domain/owner/owner.js';
import type { ImageCollectionItem, ImageCollectionItemInput } from '$lib/domain/image-collection/image-collection.js';

export interface VeterinarianProfile {
	id: string;
	name: string | null;
	professionalRegistration: string | null;
	avatarBytes: Uint8Array | null;
	contacts: OwnerContact[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface VeterinarianProfileInput {
	name: string;
	professionalRegistration: string;
	avatarBytes?: Uint8Array | null;
	contacts: OwnerContactInput[];
}

export interface Workplace {
	id: string;
	name: string | null;
	servicesDescription: string | null;
	street: string | null;
	streetNumber: string | null;
	addressComplement: string | null;
	neighborhood: string | null;
	city: string | null;
	state: string | null;
	country: string;
	postalCode: string | null;
	contacts: OwnerContact[];
	images: ImageCollectionItem[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface WorkplaceInput {
	name: string;
	servicesDescription: string;
	street: string;
	streetNumber: string;
	addressComplement: string;
	neighborhood: string;
	city: string;
	state: string;
	country: string;
	postalCode: string;
	contacts: OwnerContactInput[];
	images: ImageCollectionItemInput[];
}

export interface PracticeProfiles {
	veterinarian: VeterinarianProfile | null;
	workplace: Workplace | null;
}

export interface PracticeIdentity {
	workplaceName: string | null;
	veterinarianName: string | null;
}
