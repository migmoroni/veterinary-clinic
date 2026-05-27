import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

export type TrashKind = 'owner' | 'pet' | 'record' | 'vaccination' | 'deworming';

export interface TrashItem {
	kind: TrashKind;
	id: number;
	title: string;
	subtitle: string;
	deletedAt: string | null;
	purgeAfter: string | null;
}

interface TrashRow {
	kind: TrashKind;
	id: number;
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
			owners.id,
			owners.name AS title,
			COALESCE((
				SELECT CASE
					WHEN owner_contacts.kind = 'other' AND owner_contacts.label <> '' THEN owner_contacts.label || ': ' || owner_contacts.value
					ELSE owner_contacts.value
				END
				FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id AND owner_contacts.responsible_id IS NULL
				ORDER BY owner_contacts.sort_order, owner_contacts.id
				LIMIT 1
			), owner_addresses.city, '') AS subtitle,
			owners.deleted_at AS deleted_at,
			owners.purge_after AS purge_after
		 FROM owners
		 LEFT JOIN owner_addresses ON owner_addresses.owner_id = owners.id
		 WHERE owners.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'pet' AS kind,
			pets.id,
			pets.name AS title,
			COALESCE(${ownerNamesForPetSql}, '') AS subtitle,
			pets.deleted_at,
			pets.purge_after
		 FROM pets
		 WHERE pets.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'vaccination' AS kind,
			pet_vaccinations.id,
			pet_vaccinations.vaccine_name AS title,
			COALESCE(
				pets.name || ' · ' || ${ownerNamesForPetSql} || ' · ' || pet_vaccinations.applied_at,
				pets.name || ' · ' || pet_vaccinations.applied_at,
				pet_vaccinations.applied_at,
				''
			) AS subtitle,
			pet_vaccinations.deleted_at,
			pet_vaccinations.purge_after
		 FROM pet_vaccinations
		 LEFT JOIN pets ON pets.id = pet_vaccinations.pet_id
		 WHERE pet_vaccinations.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'deworming' AS kind,
			pet_dewormings.id,
			pet_dewormings.dewormer_name AS title,
			COALESCE(
				pets.name || ' · ' || ${ownerNamesForPetSql} || ' · ' || pet_dewormings.applied_at,
				pets.name || ' · ' || pet_dewormings.applied_at,
				pet_dewormings.applied_at,
				''
			) AS subtitle,
			pet_dewormings.deleted_at,
			pet_dewormings.purge_after
		 FROM pet_dewormings
		 LEFT JOIN pets ON pets.id = pet_dewormings.pet_id
		 WHERE pet_dewormings.deleted_at IS NOT NULL

		 UNION ALL

		 SELECT 'record' AS kind,
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

export async function restoreTrashItem(kind: TrashKind, id: number): Promise<void> {
	if (kind === 'owner') {
		await execute('UPDATE owners SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}

	if (kind === 'pet') {
		await execute('UPDATE pets SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		await execute('UPDATE medical_records SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE pet_id = $1', [id]);
		await execute('UPDATE pet_vaccinations SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE pet_id = $1', [id]);
		await execute('UPDATE pet_dewormings SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE pet_id = $1', [id]);
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

	if (kind === 'vaccination') {
		await execute(
			`UPDATE pets
			 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
			 WHERE id = (SELECT pet_id FROM pet_vaccinations WHERE id = $1)`,
			[id]
		);
		await execute('UPDATE pet_vaccinations SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
		return;
	}

	await execute(
		`UPDATE pets
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = (SELECT pet_id FROM pet_dewormings WHERE id = $1)`,
		[id]
	);
	await execute('UPDATE pet_dewormings SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
}

export async function hardDeleteTrashItem(kind: TrashKind, id: number): Promise<void> {
	if (kind === 'owner') {
		await execute('DELETE FROM pet_owners WHERE owner_id = $1', [id]);
		await execute('DELETE FROM owner_contacts WHERE owner_id = $1 OR responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = $1)', [id]);
		await execute('DELETE FROM owner_additional_responsibles WHERE owner_id = $1', [id]);
		await execute('DELETE FROM owner_addresses WHERE owner_id = $1', [id]);
		await execute('DELETE FROM owners WHERE id = $1', [id]);
		return;
	}

	if (kind === 'pet') {
		await execute('DELETE FROM pet_vaccinations WHERE pet_id = $1', [id]);
		await execute('DELETE FROM pet_dewormings WHERE pet_id = $1', [id]);
		await execute('DELETE FROM medical_records WHERE pet_id = $1', [id]);
		await execute('DELETE FROM pet_owners WHERE pet_id = $1', [id]);
		await execute('DELETE FROM pets WHERE id = $1', [id]);
		return;
	}

	if (kind === 'record') {
		await execute('DELETE FROM medical_records WHERE id = $1', [id]);
		return;
	}

	if (kind === 'vaccination') {
		await execute('DELETE FROM pet_vaccinations WHERE id = $1', [id]);
		return;
	}

	await execute('DELETE FROM pet_dewormings WHERE id = $1', [id]);
}

export async function purgeExpiredTrash(now = new Date().toISOString()): Promise<void> {
	await execute(
		`DELETE FROM pet_vaccinations
		 WHERE deleted_at IS NOT NULL
			AND (
				purge_after <= $1
				OR pet_id IN (SELECT id FROM pets WHERE deleted_at IS NOT NULL AND purge_after <= $1)
			)`,
		[now]
	);
	await execute(
		`DELETE FROM pet_dewormings
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
		'DELETE FROM owner_contacts WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1) OR responsible_id IN (SELECT owner_additional_responsibles.id FROM owner_additional_responsibles JOIN owners ON owners.id = owner_additional_responsibles.owner_id WHERE owners.deleted_at IS NOT NULL AND owners.purge_after <= $1)',
		[now]
	);
	await execute('DELETE FROM owner_additional_responsibles WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1)', [now]);
	await execute('DELETE FROM owner_addresses WHERE owner_id IN (SELECT id FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1)', [now]);
	await execute('DELETE FROM owners WHERE deleted_at IS NOT NULL AND purge_after <= $1', [now]);
}
