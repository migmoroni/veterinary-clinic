import type { MedicalRecord, MedicalRecordInput } from '@vet/types/domain/medical-record/medical-record.js';
import { FIELD_LIMITS, nullableLimitedText, nullableMultilineText } from '@vet/types/domain/shared/field-limits.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { execute, selectMany } from '@vet/core-local/sqlite/client.js';

interface MedicalRecordRow {
	id: string;
	pet_id: string;
	title: string | null;
	description: string | null;
	admitted_at: string | null;
	discharged_at: string | null;
	created_at: string | null;
	updated_at: string | null;
	removed_at: string | null;
}

function fallbackTitle(id: string, title: string | null): string {
	return title ?? `Prontuario ${id}`;
}

function assertValidPeriod(admittedAt: string | null, dischargedAt: string | null): void {
	if (admittedAt && dischargedAt && dischargedAt < admittedAt) throw new Error('record_period_invalid');
}

function mapMedicalRecord(row: MedicalRecordRow): MedicalRecord {
	return {
		id: row.id,
		petId: row.pet_id,
		title: fallbackTitle(row.id, row.title),
		description: row.description,
		admittedAt: row.admitted_at,
		dischargedAt: row.discharged_at,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		removedAt: row.removed_at
	};
}

export async function listRecordsByPet(petId: string, includeRemoved = false): Promise<MedicalRecord[]> {
	const rows = await selectMany<MedicalRecordRow>(
		`SELECT id, pet_id, title, description, admitted_at, discharged_at, created_at, updated_at, removed_at
		 FROM medical_records
		 WHERE pet_id = $1 ${includeRemoved ? '' : 'AND removed_at IS NULL'}
		 ORDER BY COALESCE(admitted_at, updated_at) DESC, id DESC`,
		[petId]
	);

	return rows.map(mapMedicalRecord);
}

export async function getMedicalRecord(id: string, includeRemoved = false): Promise<MedicalRecord | null> {
	const rows = await selectMany<MedicalRecordRow>(
		`SELECT id, pet_id, title, description, admitted_at, discharged_at, created_at, updated_at, removed_at
		 FROM medical_records
		 WHERE id = $1 ${includeRemoved ? '' : 'AND removed_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	return rows[0] ? mapMedicalRecord(rows[0]) : null;
}

export async function createMedicalRecord(petId: string, input: MedicalRecordInput): Promise<MedicalRecord> {
	const title = nullableLimitedText(input.title, FIELD_LIMITS.medicalRecordTitle);
	const admittedAt = nullableLimitedText(input.admittedAt, FIELD_LIMITS.isoDate);
	const dischargedAt = nullableLimitedText(input.dischargedAt, FIELD_LIMITS.isoDate);
	assertValidPeriod(admittedAt, dischargedAt);

	const id = createUuidV7();
	const createdAt = nowIso();
	await execute(
		`INSERT INTO medical_records (id, pet_id, title, description, admitted_at, discharged_at, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7, $7)`,
		[id, petId, title ?? fallbackTitle(id, null), nullableMultilineText(input.description, FIELD_LIMITS.medicalRecordDescription), admittedAt, dischargedAt, createdAt]
	);

	const record = await getMedicalRecord(id);
	if (!record) throw new Error('record_create_failed');
	return record;
}

export async function updateMedicalRecord(id: string, input: MedicalRecordInput): Promise<MedicalRecord> {
	const admittedAt = nullableLimitedText(input.admittedAt, FIELD_LIMITS.isoDate);
	const dischargedAt = nullableLimitedText(input.dischargedAt, FIELD_LIMITS.isoDate);
	assertValidPeriod(admittedAt, dischargedAt);

	await execute(
		`UPDATE medical_records
		 SET title = $2,
			description = $3,
			admitted_at = COALESCE($4, admitted_at),
			discharged_at = $5,
			updated_at = $6
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, nullableLimitedText(input.title, FIELD_LIMITS.medicalRecordTitle) ?? fallbackTitle(id, null), nullableMultilineText(input.description, FIELD_LIMITS.medicalRecordDescription), admittedAt, dischargedAt, nowIso()]
	);

	const record = await getMedicalRecord(id);
	if (!record) throw new Error('record_not_found');
	return record;
}

export async function softDeleteMedicalRecord(id: string): Promise<void> {
	const removedAt = nowIso();
	await execute(
		`UPDATE medical_records
		 SET removed_at = $2, updated_at = $2
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, removedAt]
	);
}

export async function restoreMedicalRecord(id: string): Promise<void> {
	await execute(
		`UPDATE medical_records
		 SET removed_at = NULL, updated_at = $2
		 WHERE id = $1`,
		[id, nowIso()]
	);
}

export async function hardDeleteMedicalRecord(id: string): Promise<void> {
	await softDeleteMedicalRecord(id);
}
