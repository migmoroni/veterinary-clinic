import { invoke } from '@tauri-apps/api/core';
import type { TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { nowIso } from '$lib/domain/shared/time.js';
import { execute, executeUserMedia, selectMany, selectUserMediaMany } from '$lib/persistence/sqlite/client.js';
import { hexToMediaHash, mediaHashToSqlLiteral } from '$lib/persistence/sqlite/media.js';

export type TrashKind = 'owner' | 'pet' | 'record' | 'treatment' | 'protocol' | 'media';
export type TrashItemId = string;

export interface DeletionAuditLog {
	id: string;
	domain: 'user_data' | 'user_media';
	targetTable: string;
	targetId: string;
	deletedBy: string | null;
	snapshotJson: string | null;
	createdAt: string;
}

export interface TrashItem {
	kind: TrashKind;
	treatmentKind: TreatmentKind | null;
	id: TrashItemId;
	title: string;
	subtitle: string;
	removedAt: string | null;
}

interface TrashRow {
	kind: TrashKind;
	treatment_kind: TreatmentKind | null;
	id: TrashItemId;
	title: string;
	subtitle: string | null;
	removed_at: string | null;
}

interface MediaTrashRow {
	kind: 'media';
	treatment_kind: null;
	id: string;
	title: string;
	subtitle: string | null;
	removed_at: string | null;
}

const ownerNamesForPetSql = `(SELECT group_concat(name, ' · ')
	FROM (
		SELECT owners.name AS name
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

function mapTrashItem(row: TrashRow): TrashItem {
	return {
		kind: row.kind,
		treatmentKind: row.treatment_kind,
		id: row.id,
		title: row.title,
		subtitle: row.subtitle ?? '',
		removedAt: row.removed_at
	};
}

export async function listTrashItems(): Promise<TrashItem[]> {
	const rows = await selectMany<TrashRow>(
		`SELECT 'owner' AS kind,
			NULL AS treatment_kind,
			owners.id,
			owners.name AS title,
			COALESCE((
				SELECT CASE
					WHEN contacts.kind = 'other' AND contacts.label <> '' THEN contacts.label || ': ' || contacts.value
					ELSE contacts.value
				END
				FROM contacts
				WHERE contacts.owner_id = owners.id AND contacts.responsible_id IS NULL
				ORDER BY contacts.sort_order, contacts.id
				LIMIT 1
			), owner_address.city, '') AS subtitle,
			owners.removed_at AS removed_at
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.removed_at IS NOT NULL

		 UNION ALL

		 SELECT 'pet' AS kind,
			NULL AS treatment_kind,
			pets.id,
			pets.name AS title,
			COALESCE(${ownerNamesForPetSql}, '') AS subtitle,
			pets.removed_at
		 FROM pets
		 WHERE pets.removed_at IS NOT NULL

		 UNION ALL

		 SELECT 'treatment' AS kind,
			pet_treatments.kind AS treatment_kind,
			pet_treatments.id,
			pet_treatments.name AS title,
			COALESCE(
				pets.name || ' · ' || ${ownerNamesForPetSql} || ' · ' || pet_treatments.applied_at,
				pets.name || ' · ' || pet_treatments.applied_at,
				pet_treatments.applied_at,
				''
			) AS subtitle,
			pet_treatments.removed_at
		 FROM pet_treatments
		 LEFT JOIN pets ON pets.id = pet_treatments.pet_id
		 WHERE pet_treatments.removed_at IS NOT NULL

		 UNION ALL

		 SELECT 'protocol' AS kind,
			NULL AS treatment_kind,
			treatment_protocols.id,
			treatment_protocols.name AS title,
			COALESCE(treatment_protocols.observation, '') AS subtitle,
			treatment_protocols.removed_at
		 FROM treatment_protocols
		 WHERE treatment_protocols.removed_at IS NOT NULL

		 UNION ALL

		 SELECT 'record' AS kind,
			NULL AS treatment_kind,
			medical_records.id,
			COALESCE(medical_records.title, 'Prontuario ' || medical_records.id) AS title,
			COALESCE(pets.name || ' · ' || ${ownerNamesForPetSql}, pets.name, '') AS subtitle,
			medical_records.removed_at
		 FROM medical_records
		 LEFT JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.removed_at IS NOT NULL

		 ORDER BY removed_at DESC`
	);

	const mediaRows = await selectUserMediaMany<MediaTrashRow>(
		`SELECT 'media' AS kind,
			NULL AS treatment_kind,
			lower(hex(hash)) AS id,
			lower(hex(hash)) AS title,
			COALESCE(mime_type || ' · ' || size_bytes || ' bytes', '') AS subtitle,
			removed_at
		 FROM blobs
		 WHERE removed_at IS NOT NULL
		 ORDER BY removed_at DESC`
	);

	return [...rows, ...mediaRows]
		.sort((left, right) => String(right.removed_at ?? '').localeCompare(String(left.removed_at ?? '')))
		.map(mapTrashItem);
}

export async function restoreTrashItem(kind: TrashKind, id: TrashItemId): Promise<void> {
	const updatedAt = nowIso();
	if (kind === 'owner') {
		await execute('UPDATE owners SET removed_at = NULL, updated_at = $2 WHERE id = $1', [id, updatedAt]);
		return;
	}

	if (kind === 'pet') {
		await execute('UPDATE pets SET removed_at = NULL, updated_at = $2 WHERE id = $1', [id, updatedAt]);
		await execute('UPDATE medical_records SET removed_at = NULL, updated_at = $2 WHERE pet_id = $1', [id, updatedAt]);
		await execute('UPDATE pet_treatments SET removed_at = NULL, updated_at = $2 WHERE pet_id = $1', [id, updatedAt]);
		return;
	}

	if (kind === 'record') {
		await execute(
			`UPDATE pets
			 SET removed_at = NULL, updated_at = $2
			 WHERE id = (SELECT pet_id FROM medical_records WHERE id = $1)`,
			[id, updatedAt]
		);
		await execute('UPDATE medical_records SET removed_at = NULL, updated_at = $2 WHERE id = $1', [id, updatedAt]);
		return;
	}

	if (kind === 'treatment') {
		await execute(
			`UPDATE pets
			 SET removed_at = NULL, updated_at = $2
			 WHERE id = (SELECT pet_id FROM pet_treatments WHERE id = $1)`,
			[id, updatedAt]
		);
		await execute('UPDATE pet_treatments SET removed_at = NULL, updated_at = $2 WHERE id = $1', [id, updatedAt]);
		return;
	}

	if (kind === 'protocol') {
		await execute('UPDATE treatment_protocols SET removed_at = NULL, updated_at = $2 WHERE id = $1', [id, updatedAt]);
		return;
	}

	if (kind === 'media') {
		const hash = hexToMediaHash(id);
		if (!hash) throw new Error('media_hash_invalid');
		await executeUserMedia(`UPDATE blobs SET removed_at = NULL, updated_at = $1 WHERE hash = ${mediaHashToSqlLiteral(hash)} AND removed_at IS NOT NULL`, [
			updatedAt
		]);
		return;
	}
}

export async function hardDeleteTrashItem(kind: TrashKind, id: TrashItemId): Promise<void> {
	await invoke('hard_delete_trash_item', { request: { kind, id } });
}

export async function emptyTrash(): Promise<void> {
	for (const item of await listTrashItems()) {
		await hardDeleteTrashItem(item.kind, item.id);
	}
}

export async function getDeletionAuditLogs(limit = 100): Promise<DeletionAuditLog[]> {
	return invoke<DeletionAuditLog[]>('get_deletion_audit_logs', { request: { limit } });
}
