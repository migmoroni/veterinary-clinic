export type OwnerContactKind = 'phone' | 'mobile' | 'email' | 'other';

export const DEFAULT_OWNER_COUNTRY = 'Brazil';

export interface OwnerContact {
	id: number;
	kind: OwnerContactKind;
	label: string;
	value: string;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface OwnerContactInput {
	kind: OwnerContactKind;
	label?: string;
	value: string;
}

export interface OwnerAdditionalResponsible {
	id: number;
	name: string;
	contacts: OwnerContact[];
	createdAt: string | null;
	updatedAt: string | null;
}

export interface OwnerAdditionalResponsibleInput {
	name: string;
	contacts: OwnerContactInput[];
}

export interface Owner {
	id: number;
	name: string;
	avatarBytes: Uint8Array | null;
	street: string | null;
	streetNumber: string | null;
	addressComplement: string | null;
	neighborhood: string | null;
	city: string | null;
	country: string | null;
	postalCode: string | null;
	additionalInformation: string | null;
	contacts: OwnerContact[];
	additionalResponsibles: OwnerAdditionalResponsible[];
	state: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface OwnerInput {
	name: string;
	avatarBytes?: Uint8Array | null;
	street: string;
	streetNumber: string;
	addressComplement: string;
	neighborhood: string;
	city: string;
	country: string;
	postalCode: string;
	additionalInformation: string;
	contacts: OwnerContactInput[];
	additionalResponsibles: OwnerAdditionalResponsibleInput[];
	state: string;
}
