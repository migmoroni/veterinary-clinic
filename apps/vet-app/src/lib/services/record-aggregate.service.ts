import type { MedicalRecordDetails } from '@vet/types/domain/medical-record/medical-record.js';
import { getMedicalRecordDetails } from '../read-models/current-record.read-model.js';

export async function loadRecordDetails(recordId: string): Promise<MedicalRecordDetails> {
	const details = await getMedicalRecordDetails(recordId);
	if (!details) throw new Error('record_not_found');
	return details;
}
