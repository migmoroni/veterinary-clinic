import type { CurrentRecordSummary, MedicalRecordDetails } from '@vet/types/domain/medical-record/medical-record.js';
import { loadMediaData } from '@vet/core-local/repositories/media.repository.js';
import { selectMany, selectOne } from '@vet/core-local/sqlite/client.js';
import { normalizeMediaHash } from '@vet/core-local/sqlite/media.js';
import { getMedicalRecord } from '@vet/modules/medical_records/records';
import { listOwnerAssociatedContactsByOwnerIds, listOwnersByPet } from '@vet/modules/registry/owners';

interface MedicalRecordDetailsRow {
	id: string;
	pet_id: string;
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

export async function loadRecordDetails(recordId: string): Promise<MedicalRecordDetails> {
	const details = await getMedicalRecordDetails(recordId);
	if (!details) throw new Error('record_not_found');
	return details;
}

export async function getMedicalRecordDetails(id: string, includeRemoved = false): Promise<MedicalRecordDetails | null> {
	const rows = await selectMany<MedicalRecordDetailsRow>(
		`SELECT medical_records.id,
			medical_records.pet_id,
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
	const [record, owners] = await Promise.all([getMedicalRecord(row.id, includeRemoved), listOwnersByPet(row.pet_id, includeRemoved)]);
	if (!record) return null;
	const primaryOwner = owners[0];

	return {
		record,
		petName: row.pet_name,
		petAvatarBytes: await loadMediaData('user', normalizeMediaHash(row.pet_avatar_hash)),
		owners,
		ownerId: primaryOwner?.id ?? row.owner_id ?? '',
		ownerName: row.owner_name ?? primaryOwner?.name ?? '',
		ownerAvatarBytes: primaryOwner?.avatarBytes ?? (await loadMediaData('user', normalizeMediaHash(row.owner_avatar_hash)))
	};
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
