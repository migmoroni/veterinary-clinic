import type { MedicalRecord, MedicalRecordDetails, MedicalRecordInput } from '$lib/domain/medical-record/medical-record.js';
import {
	createMedicalRecord,
	getMedicalRecordDetails,
	softDeleteMedicalRecord,
	updateMedicalRecord
} from '$lib/persistence/repositories/medical-record.repository.js';

export async function loadRecordDetails(recordId: number): Promise<MedicalRecordDetails> {
	const details = await getMedicalRecordDetails(recordId);
	if (!details) throw new Error('record_not_found');
	return details;
}

export async function saveNewRecord(petId: number, input: MedicalRecordInput): Promise<MedicalRecord> {
	return createMedicalRecord(petId, input);
}

export async function saveRecord(recordId: number, input: MedicalRecordInput): Promise<MedicalRecord> {
	return updateMedicalRecord(recordId, input);
}

export async function removeRecord(recordId: number): Promise<void> {
	await softDeleteMedicalRecord(recordId);
}