import type { Owner, OwnerAssociatedContact } from '$lib/domain/owner/owner.js';

export interface MedicalRecord {
	id: string;
	petId: string;
	title: string;
	description: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	createdAt: string | null;
	updatedAt: string | null;
	removedAt: string | null;
}



export interface CurrentRecordSummary {
	id: string;
	title: string;
	description: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	petId: string;
	petName: string;
	ownerId: string;
	ownerName: string;
	ownerContacts: OwnerAssociatedContact[];
}

export interface MedicalRecordInput {
	title: string;
	description: string;
	admittedAt: string;
	dischargedAt: string;
}

export interface MedicalRecordDetails {
	record: MedicalRecord;
	petName: string;
	petAvatarBytes: Uint8Array | null;
	owners: Owner[];
	ownerId: string;
	ownerName: string;
	ownerAvatarBytes: Uint8Array | null;
}
