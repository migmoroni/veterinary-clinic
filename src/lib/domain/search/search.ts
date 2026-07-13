import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';

export const SEARCH_RESULT_KINDS = ['owner', 'pet', 'product', 'manufacturer', 'activeIngredient', 'condition', 'breed'] as const;
export type SearchResultKind = (typeof SEARCH_RESULT_KINDS)[number];

export const CLINIC_SEARCH_RESULT_KINDS = ['owner', 'pet'] as const satisfies readonly SearchResultKind[];
export type ClinicSearchResultKind = (typeof CLINIC_SEARCH_RESULT_KINDS)[number];

export const REFERENCE_SEARCH_RESULT_KINDS = ['product', 'manufacturer', 'activeIngredient', 'condition', 'breed'] as const satisfies readonly SearchResultKind[];
export type ReferenceSearchResultKind = (typeof REFERENCE_SEARCH_RESULT_KINDS)[number];

export interface SearchResult {
	kind: SearchResultKind;
	id: number | string;
	ownerId: number | null;
	petId: number | null;
	href: string;
	title: string;
	subtitle: string;
	referenceImageBytes?: Uint8Array | null;
	ownerAvatarBytes?: Uint8Array | null;
	petAvatarBytes?: Uint8Array | null;
	ownerContacts?: OwnerAssociatedContact[];
}

export function isClinicSearchResultKind(kind: SearchResultKind): kind is ClinicSearchResultKind {
	return CLINIC_SEARCH_RESULT_KINDS.includes(kind as ClinicSearchResultKind);
}

export function isReferenceSearchResultKind(kind: SearchResultKind): kind is ReferenceSearchResultKind {
	return REFERENCE_SEARCH_RESULT_KINDS.includes(kind as ReferenceSearchResultKind);
}
