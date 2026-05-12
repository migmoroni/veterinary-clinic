import type { OwnerContact } from '$lib/domain/owner/owner.js';

export interface MedicalRecord {
	id: number;
	petId: number;
	title: string;
	description: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}



export interface CurrentRecordSummary {
	id: number;
	title: string;
	description: string | null;
	admittedAt: string | null;
	dischargedAt: string | null;
	petId: number;
	petName: string;
	ownerId: number;
	ownerName: string;
	ownerContacts: OwnerContact[];
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
	ownerId: number;
	ownerName: string;
	ownerAvatarBytes: Uint8Array | null;
}