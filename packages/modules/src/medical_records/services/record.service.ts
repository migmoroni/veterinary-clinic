import type { MedicalRecord, MedicalRecordInput } from '@vet/types/domain/medical-record/medical-record.js';
import {
	createMedicalRecord,
	softDeleteMedicalRecord,
	updateMedicalRecord
} from '../repositories/medical-record.repository.js';

export async function saveNewRecord(petId: string, input: MedicalRecordInput): Promise<MedicalRecord> {
	return createMedicalRecord(petId, input);
}

export async function saveRecord(recordId: string, input: MedicalRecordInput): Promise<MedicalRecord> {
	return updateMedicalRecord(recordId, input);
}

export async function removeRecord(recordId: string): Promise<void> {
	await softDeleteMedicalRecord(recordId);
}
