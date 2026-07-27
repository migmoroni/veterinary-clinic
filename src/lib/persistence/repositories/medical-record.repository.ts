import type {
	CurrentRecordSummary,
	MedicalRecord,
	MedicalRecordDetails,
	MedicalRecordInput
} from '$lib/domain/medical-record/medical-record.js';
import { FIELD_LIMITS, nullableLimitedText, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { nowIso } from '$lib/domain/shared/time.js';
import { createUuidV7 } from '$lib/domain/shared/uuid.js';
import { loadMediaData } from '$lib/persistence/repositories/media.repository.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';
import { normalizeMediaHash } from '$lib/persistence/sqlite/media.js';
import { listOwnerAssociatedContactsByOwnerIds, listOwnersByPet } from './owner.repository.js';

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

interface MedicalRecordDetailsRow extends MedicalRecordRow {
	pet_name: string;
	pet_avatar_hash: unknown | null;
	owner_id: string | null;
	owner_name: string | null;
	owner_avatar_hash: unknown | null;
}

interface CurrentRecordRow {
	id: string;
	title: string | null;
	description: string | null;
	admitted_at: string | null;
	discharged_at: string | null;
	pet_id: string;
	pet_name: string;
	owner_id: string | null;
	owner_ids: string | null;
	owner_name: string | null;
}

const firstOwnerIdSql = `(SELECT owners.id
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const firstOwnerAvatarSql = `(SELECT owners.avatar_hash
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const ownerNamesSql = `(SELECT group_concat(name, ' · ')
	FROM (
		SELECT owners.name AS name
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

const ownerIdsSql = `(SELECT group_concat(owner_id, ',')
	FROM (
		SELECT owners.id AS owner_id
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

function fallbackTitle(id: string, title: string | null): string {
	return title ?? `Prontuario ${id}`;
}

function parseOwnerIds(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter((id) => id.length > 0);
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
		ownerId: row.owner_id ?? ownerIds[0] ?? '',
		ownerName: row.owner_name ?? '',
		ownerContacts
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

export async function getMedicalRecordDetails(id: string, includeRemoved = false): Promise<MedicalRecordDetails | null> {
	const rows = await selectMany<MedicalRecordDetailsRow>(
		`SELECT medical_records.id,
			medical_records.pet_id,
			medical_records.title,
			medical_records.description,
			medical_records.admitted_at,
			medical_records.discharged_at,
			medical_records.created_at,
			medical_records.updated_at,
			medical_records.removed_at,
			pets.name AS pet_name,
			pets.avatar_hash AS pet_avatar_hash,
			${firstOwnerIdSql} AS owner_id,
			${ownerNamesSql} AS owner_name,
			${firstOwnerAvatarSql} AS owner_avatar_hash
		 FROM medical_records
		 JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.id = $1
			${includeRemoved ? '' : 'AND medical_records.removed_at IS NULL AND pets.removed_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	const row = rows[0];
	if (!row) return null;
	const owners = await listOwnersByPet(row.pet_id, includeRemoved);
	const primaryOwner = owners[0];

	return {
		record: mapMedicalRecord(row),
		petName: row.pet_name,
		petAvatarBytes: await loadMediaData('user', normalizeMediaHash(row.pet_avatar_hash)),
		owners,
		ownerId: primaryOwner?.id ?? row.owner_id ?? '',
		ownerName: row.owner_name ?? primaryOwner?.name ?? '',
		ownerAvatarBytes: primaryOwner?.avatarBytes ?? (await loadMediaData('user', normalizeMediaHash(row.owner_avatar_hash)))
	};
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
		 WHERE medical_records.removed_at IS NULL
			AND pets.removed_at IS NULL
		 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
		 LIMIT 1`
	);

	return row ? mapCurrentRecord(row) : null;
}
