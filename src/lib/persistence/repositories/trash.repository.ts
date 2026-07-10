import type { TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type TrashKind = 'owner' | 'pet' | 'record' | 'treatment' | 'protocol';
export type TrashItemId = number | string;

export interface TrashItem {
	kind: TrashKind;
	treatmentKind: TreatmentKind | null;
	id: TrashItemId;
	title: string;
	subtitle: string;
	deletedAt: string | null;
	purgeAfter: string | null;
}

interface TrashRow {
	kind: TrashKind;
	treatment_kind: TreatmentKind | null;
	id: TrashItemId;
	title: string;
	subtitle: string | null;
	deleted_at: string | null;
	purge_after: string | null;
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
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
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
			owners.deleted_at AS deleted_at,
			owners.purge_after AS purge_after
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'pet' AS kind,
			NULL AS treatment_kind,
			pets.id,
			pets.name AS title,
			COALESCE(${ownerNamesForPetSql}, '') AS subtitle,
			pets.deleted_at,
			pets.purge_after
		 FROM pets
		 WHERE pets.deleted_at IS NOT NULL

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
			pet_treatments.deleted_at,
			pet_treatments.purge_after
		 FROM pet_treatments
		 LEFT JOIN pets ON pets.id = pet_treatments.pet_id
		 WHERE pet_treatments.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'protocol' AS kind,
			NULL AS treatment_kind,
			treatment_protocols.id,
			treatment_protocols.name AS title,
			COALESCE(treatment_protocols.observation, '') AS subtitle,
			treatment_protocols.deleted_at,
			treatment_protocols.purge_after
		 FROM treatment_protocols
		 WHERE treatment_protocols.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'record' AS kind,
			NULL AS treatment_kind,
			medical_records.id,
			COALESCE(medical_records.title, 'Prontuario ' || medical_records.id) AS title,
			COALESCE(pets.name || ' · ' || ${ownerNamesForPetSql}, pets.name, '') AS subtitle,
			medical_records.deleted_at,
			medical_records.purge_after
		 FROM medical_records
		 LEFT JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.deleted_at IS NOT NULL

		 ORDER BY deleted_at DESC`
	);

	return rows.map(mapTrashItem);
}

export async function restoreTrashItem(kind: TrashKind, id: TrashItemId): Promise<void> {
	if (kind === 'owner') {
		await execute('UPDATE owners SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}

	if (kind === 'pet') {
		await execute('UPDATE pets SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		await execute('UPDATE medical_records SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE pet_id = $1', [id]);
		await execute('UPDATE pet_treatments SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE pet_id = $1', [id]);
		return;
	}

	if (kind === 'record') {
		await execute(
			`UPDATE pets
			 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
			 WHERE id = (SELECT pet_id FROM medical_records WHERE id = $1)`,
			[id]
		);
		await execute('UPDATE medical_records SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}

	if (kind === 'treatment') {
		await execute(
			`UPDATE pets
			 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
			 WHERE id = (SELECT pet_id FROM pet_treatments WHERE id = $1)`,
			[id]
		);
		await execute('UPDATE pet_treatments SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}

	if (kind === 'protocol') {
		await execute('UPDATE treatment_protocols SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}
}

export async function hardDeleteTrashItem(kind: TrashKind, id: TrashItemId): Promise<void> {
	if (kind === 'owner') {
		await execute('DELETE FROM pet_owners WHERE owner_id = $1', [id]);
		await execute('DELETE FROM contacts WHERE owner_id = $1 OR responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = $1)', [id]);
		await execute('DELETE FROM owner_additional_responsibles WHERE owner_id = $1', [id]);
		await execute('DELETE FROM addresses WHERE owner_id = $1', [id]);
		await execute('DELETE FROM owners WHERE id = $1', [id]);
		return;
	}

	if (kind === 'pet') {
		await execute('DELETE FROM pet_treatments WHERE pet_id = $1', [id]);
		await execute('DELETE FROM medical_records WHERE pet_id = $1', [id]);
		await execute('DELETE FROM pet_owners WHERE pet_id = $1', [id]);
		await execute('DELETE FROM pets WHERE id = $1', [id]);
		return;
	}

	if (kind === 'record') {
		await execute('DELETE FROM medical_records WHERE id = $1', [id]);
		return;
	}

	if (kind === 'treatment') {
		await execute('DELETE FROM pet_treatments WHERE id = $1', [id]);
		return;
	}

	if (kind === 'protocol') {
		await execute('DELETE FROM treatment_protocols WHERE id = $1', [id]);
		return;
	}
}

export async function purgeExpiredTrash(now = new Date().toISOString()): Promise<void> {
	await execute(
		`DELETE FROM treatment_protocols
		 WHERE deleted_at IS NOT NULL
			AND purge_after <= $1`,
		[now]
	);
	await execute(
		`DELETE FROM pet_treatments
		 WHERE deleted_at IS NOT NULL
			AND (
				purge_after <= $1
				OR pet_id IN (SELECT id FROM pets WHERE deleted_at IS NOT NULL AND purge_after <= $1)
			)`,
		[now]
	);
	await execute(
		`DELETE FROM medical_records
		 WHERE deleted_at IS NOT NULL
			AND (
				purge_after <= $1
				OR pet_id IN (SELECT id FROM pets WHERE deleted_at IS NOT NULL AND purge_after <= $1)
			)`,
		[now]
	);
	await execute(
		`DELETE FROM pets
		 WHERE deleted_at IS NOT NULL
			AND purge_after <= $1`,
		[now]
	);
	await execute('DELETE FROM pet_owners WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1)', [now]);
	await execute(
		'DELETE FROM contacts WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1) OR responsible_id IN (SELECT owner_additional_responsibles.id FROM owner_additional_responsibles JOIN owners ON owners.id = owner_additional_responsibles.owner_id WHERE owners.deleted_at IS NOT NULL AND owners.purge_after <= $1)',
		[now]
	);
	await execute('DELETE FROM owner_additional_responsibles WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1)', [now]);
	await execute('DELETE FROM addresses WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1)', [now]);
	await execute('DELETE FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1', [now]);
}
