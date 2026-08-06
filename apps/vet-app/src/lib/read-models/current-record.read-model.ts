import type { MedicalRecordDetails } from '@vet/types/domain/medical-record/medical-record.js';
import { loadMediaData } from '@vet/core-local/repositories/media.repository.js';
import { selectMany } from '@vet/core-local/sqlite/client.js';
import { normalizeMediaHash } from '@vet/core-local/sqlite/media.js';
import { loadRecordById } from '@vet/modules/medical_records/records';
import { listOwnersByPet } from '@vet/modules/registry/owners';

interface MedicalRecordDetailsRow {
	id: string;
	pet_id: string;
	pet_name: string;
	pet_avatar_hash: unknown | null;
	owner_id: string | null;
	owner_name: string | null;
	owner_avatar_hash: unknown | null;
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

function fallbackTitle(id: string, title: string | null): string {
	return title ?? `Prontuario ${id}`;
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
	const [record, owners] = await Promise.all([loadRecordById(row.id, includeRemoved), listOwnersByPet(row.pet_id, includeRemoved)]);
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
