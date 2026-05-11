export type OwnerContactKind = 'phone' | 'mobile';

export interface OwnerContact {
	id: number;
	kind: OwnerContactKind;
	value: string;
	createdAt: string | null;
	updatedAt: string | null;
}

export interface OwnerContactInput {
	kind: OwnerContactKind;
	value: string;
}

export interface Owner {
	id: number;
	name: string;
	address: string | null;
	neighborhood: string | null;
	city: string | null;
	postalCode: string | null;
	contacts: OwnerContact[];
	state: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface OwnerInput {
	name: string;
	address: string;
	neighborhood: string;
	city: string;
	postalCode: string;
	contacts: OwnerContactInput[];
	state: string;
}