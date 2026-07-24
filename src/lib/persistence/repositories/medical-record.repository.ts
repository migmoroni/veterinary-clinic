import type {
	CurrentRecordSummary,
	MedicalRecord,
	MedicalRecordDetails,
	MedicalRecordInput
} from '$lib/domain/medical-record/medical-record.js';
import { FIELD_LIMITS, nullableLimitedText, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { loadMediaData } from '$lib/persistence/repositories/media.repository.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';
import { normalizeMediaHash } from '$lib/persistence/sqlite/media.js';
import { listOwnerAssociatedContactsByOwnerIds, listOwnersByPet } from './owner.repository.js';

interface MedicalRecordRow {
	id: number;
	pet_id: number;
	title: string | null;
	description: string | null;
	admitted_at: string | null;
	discharged_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface MedicalRecordDetailsRow extends MedicalRecordRow {
	pet_name: string;
	pet_avatar_hash: unknown | null;
	owner_id: number | null;
	owner_name: string | null;
	owner_avatar_hash: unknown | null;
}

interface CurrentRecordRow {
	id: number;
	title: string | null;
	description: string | null;
	admitted_at: string | null;
	discharged_at: string | null;
	pet_id: number;
	pet_name: string;
	owner_id: number | null;
	owner_ids: string | null;
	owner_name: string | null;
}

const firstOwnerIdSql = `(SELECT owners.id
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const firstOwnerAvatarSql = `(SELECT owners.avatar_hash
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const ownerNamesSql = `(SELECT group_concat(name, ' · ')
	FROM (
		SELECT owners.name AS name
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

const ownerIdsSql = `(SELECT group_concat(owner_id, ',')
	FROM (
		SELECT owners.id AS owner_id
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

function fallbackTitle(id: number, title: string | null): string {
	return title ?? `Prontuario ${id}`;
}

function parseOwnerIds(value: string | null | undefined): number[] {
	return (value ?? '')
		.split(',')
		.map((item) => Number(item))
		.filter((id) => Number.isInteger(id) && id > 0);
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
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function mapCurrentRecord(row: CurrentRecordRow): Promise<CurrentRecordSummary> {
	const ownerIds = parseOwnerIds(row.owner_ids);
	const contactsByOwnerId = await listOwnerAssociatedContactsByOwnerIds(ownerIds);
	const ownerContacts = ownerIds.flatMap((ownerId) => contactsByOwnerId.get(ownerId) ?? []);

	return {
		id: row.id,
		title: fallbackTitle(row.id, row.title),
		description: row.description,
		admittedAt: row.admitted_at,
		dischargedAt: row.discharged_at,
		petId: row.pet_id,
		petName: row.pet_name,
		ownerId: row.owner_id ?? ownerIds[0] ?? 0,
		ownerName: row.owner_name ?? '',
		ownerContacts
	};
}

export async function listRecordsByPet(petId: number, includeDeleted = false): Promise<MedicalRecord[]> {
	const rows = await selectMany<MedicalRecordRow>(
		`SELECT id, pet_id, title, description, admitted_at, discharged_at, updated_at, deleted_at, purge_after
		 FROM medical_records
		 WHERE pet_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY COALESCE(admitted_at, updated_at) DESC, id DESC`,
		[petId]
	);

	return rows.map(mapMedicalRecord);
}

export async function getMedicalRecord(id: number, includeDeleted = false): Promise<MedicalRecord | null> {
	const rows = await selectMany<MedicalRecordRow>(
		`SELECT id, pet_id, title, description, admitted_at, discharged_at, updated_at, deleted_at, purge_after
		 FROM medical_records
		 WHERE id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	return rows[0] ? mapMedicalRecord(rows[0]) : null;
}

export async function getMedicalRecordDetails(id: number, includeDeleted = false): Promise<MedicalRecordDetails | null> {
	const rows = await selectMany<MedicalRecordDetailsRow>(
		`SELECT medical_records.id,
			medical_records.pet_id,
			medical_records.title,
			medical_records.description,
			medical_records.admitted_at,
			medical_records.discharged_at,
			medical_records.updated_at,
			medical_records.deleted_at,
			medical_records.purge_after,
			pets.name AS pet_name,
			pets.avatar_hash AS pet_avatar_hash,
			${firstOwnerIdSql} AS owner_id,
			${ownerNamesSql} AS owner_name,
			${firstOwnerAvatarSql} AS owner_avatar_hash
		 FROM medical_records
		 JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.id = $1
			${includeDeleted ? '' : 'AND medical_records.deleted_at IS NULL AND pets.deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	const row = rows[0];
	if (!row) return null;
	const owners = await listOwnersByPet(row.pet_id, includeDeleted);
	const primaryOwner = owners[0];

	return {
		record: mapMedicalRecord(row),
		petName: row.pet_name,
		petAvatarBytes: await loadMediaData('user', normalizeMediaHash(row.pet_avatar_hash)),
		owners,
		ownerId: primaryOwner?.id ?? row.owner_id ?? 0,
		ownerName: row.owner_name ?? primaryOwner?.name ?? '',
		ownerAvatarBytes: primaryOwner?.avatarBytes ?? (await loadMediaData('user', normalizeMediaHash(row.owner_avatar_hash)))
	};
}

export async function createMedicalRecord(petId: number, input: MedicalRecordInput): Promise<MedicalRecord> {
	const title = nullableLimitedText(input.title, FIELD_LIMITS.medicalRecordTitle);
	const admittedAt = nullableLimitedText(input.admittedAt, FIELD_LIMITS.isoDate);
	const dischargedAt = nullableLimitedText(input.dischargedAt, FIELD_LIMITS.isoDate);
	assertValidPeriod(admittedAt, dischargedAt);

	const result = await execute(
		`INSERT INTO medical_records (pet_id, title, description, admitted_at, discharged_at, updated_at)
		 VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, CURRENT_TIMESTAMP)`,
		[petId, title, nullableMultilineText(input.description, FIELD_LIMITS.medicalRecordDescription), admittedAt, dischargedAt]
	);

	const id = Number(result.lastInsertId);
	if (!title) {
		await execute('UPDATE medical_records SET title = $2 WHERE id = $1', [id, fallbackTitle(id, null)]);
	}

	const record = await getMedicalRecord(id);
	if (!record) throw new Error('record_create_failed');
	return record;
}

export async function updateMedicalRecord(id: number, input: MedicalRecordInput): Promise<MedicalRecord> {
	const admittedAt = nullableLimitedText(input.admittedAt, FIELD_LIMITS.isoDate);
	const dischargedAt = nullableLimitedText(input.dischargedAt, FIELD_LIMITS.isoDate);
	assertValidPeriod(admittedAt, dischargedAt);

	await execute(
		`UPDATE medical_records
		 SET title = $2,
			description = $3,
			admitted_at = COALESCE($4, admitted_at),
			discharged_at = $5,
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, nullableLimitedText(input.title, FIELD_LIMITS.medicalRecordTitle) ?? fallbackTitle(id, null), nullableMultilineText(input.description, FIELD_LIMITS.medicalRecordDescription), admittedAt, dischargedAt]
	);

	const record = await getMedicalRecord(id);
	if (!record) throw new Error('record_not_found');
	return record;
}

export async function softDeleteMedicalRecord(id: number): Promise<void> {
	const deletedAt = nowIso();
	await execute(
		`UPDATE medical_records
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, computePurgeAfter(deletedAt)]
	);
}

export async function restoreMedicalRecord(id: number): Promise<void> {
	await execute(
		`UPDATE medical_records
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);
}

export async function hardDeleteMedicalRecord(id: number): Promise<void> {
	await execute('DELETE FROM medical_records WHERE id = $1', [id]);
}

export async function getLastEditedRecord(): Promise<CurrentRecordSummary | null> {
	const row = await selectOne<CurrentRecordRow>(
		`SELECT
			medical_records.id,
			medical_records.title,
			medical_records.description,
			medical_records.admitted_at,
			medical_records.discharged_at,
			pets.id AS pet_id,
			pets.name AS pet_name,
			${firstOwnerIdSql} AS owner_id,
			${ownerIdsSql} AS owner_ids,
			${ownerNamesSql} AS owner_name
		 FROM medical_records
		 JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.deleted_at IS NULL
			AND pets.deleted_at IS NULL
		 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
		 LIMIT 1`
	);

	return row ? mapCurrentRecord(row) : null;
}
