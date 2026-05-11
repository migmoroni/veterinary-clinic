import { selectMany } from '$lib/persistence/sqlite/client.js';
import type { OwnerContact } from '$lib/domain/owner/owner.js';
import { listOwnerContactsByOwnerIds } from './owner.repository.js';

export type SearchResultKind = 'owner' | 'pet' | 'record';

export interface SearchResult {
	kind: SearchResultKind;
	id: number;
	recordId: number | null;
	ownerId: number | null;
	petId: number | null;
	href: string;
	title: string;
	subtitle: string;
	ownerContacts?: OwnerContact[];
}

interface SearchResultRow {
	kind: SearchResultKind;
	id: number;
	record_id: number | null;
	owner_id: number | null;
	pet_id: number | null;
	title: string;
	subtitle: string;
}

function resultHref(row: SearchResultRow): string {
	if (row.kind === 'owner') return `/owners/${row.id}`;
	if (row.kind === 'pet' && row.owner_id) return `/owners/${row.owner_id}/pets/${row.id}`;
	return `/records/${row.record_id ?? row.id}`;
}

export async function searchClinic(query: string): Promise<SearchResult[]> {
	const normalized = query.trim();
	if (normalized.length < 2) return [];

	const term = `%${normalized}%`;
	const rows = await selectMany<SearchResultRow>(
		`SELECT 'owner' AS kind,
			owners.id,
			owners.id AS owner_id,
			NULL AS pet_id,
			(SELECT medical_records.id
			 FROM pets
			 JOIN medical_records ON medical_records.pet_id = pets.id
			 WHERE pets.owner_id = owners.id
				AND pets.deleted_at IS NULL
				AND medical_records.deleted_at IS NULL
			 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
			 LIMIT 1) AS record_id,
			owners.name AS title,
			COALESCE((
				SELECT owner_contacts.value
				FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id
				ORDER BY owner_contacts.sort_order, owner_contacts.id
				LIMIT 1
			), owners.city, '') AS subtitle
		 FROM owners
		 WHERE owners.deleted_at IS NULL
			AND (owners.name LIKE $1 OR EXISTS (
				SELECT 1 FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id AND owner_contacts.value LIKE $1
			))

		 UNION ALL

		 SELECT 'pet' AS kind,
			pets.id,
			owners.id AS owner_id,
			pets.id AS pet_id,
			(SELECT medical_records.id
			 FROM medical_records
			 WHERE medical_records.pet_id = pets.id
				AND medical_records.deleted_at IS NULL
			 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
			 LIMIT 1) AS record_id,
			pets.name AS title,
			owners.name AS subtitle
		 FROM pets
		 JOIN owners ON owners.id = pets.owner_id
		 WHERE pets.deleted_at IS NULL
			AND owners.deleted_at IS NULL
			AND (pets.name LIKE $1 OR pets.species LIKE $1 OR pets.breed LIKE $1)

		 UNION ALL

		 SELECT 'record' AS kind,
			medical_records.id,
			owners.id AS owner_id,
			pets.id AS pet_id,
			medical_records.id AS record_id,
			COALESCE(medical_records.title, 'Prontuario ' || medical_records.id) AS title,
			pets.name || ' · ' || owners.name AS subtitle
		 FROM medical_records
		 JOIN pets ON pets.id = medical_records.pet_id
		 JOIN owners ON owners.id = pets.owner_id
		 WHERE medical_records.deleted_at IS NULL
			AND pets.deleted_at IS NULL
			AND owners.deleted_at IS NULL
			AND (medical_records.title LIKE $1 OR medical_records.description LIKE $1)

		 ORDER BY kind, title
		 LIMIT 20`,
		[term]
	);

	const ownerIds = rows.filter((row) => row.kind === 'owner').map((row) => row.id);
	const contactsByOwnerId = await listOwnerContactsByOwnerIds(ownerIds);

	return rows.map((row) => ({
		kind: row.kind,
		id: row.id,
		recordId: row.record_id,
		ownerId: row.owner_id,
		petId: row.pet_id,
		href: resultHref(row),
		title: row.title,
		subtitle: row.subtitle,
		ownerContacts: row.kind === 'owner' ? (contactsByOwnerId.get(row.id) ?? []) : []
	}));
}