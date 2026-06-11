import { selectMany } from '$lib/persistence/sqlite/client.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { listOwnerAssociatedContactsByOwnerIds } from './owner.repository.js';

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
	ownerAvatarBytes?: Uint8Array | null;
	petAvatarBytes?: Uint8Array | null;
	ownerContacts?: OwnerAssociatedContact[];
}


interface SearchResultRow {
	kind: SearchResultKind;
	id: number;
	record_id: number | null;
	owner_id: number | null;
	pet_id: number | null;
	owner_avatar_blob: unknown | null;
	title: string;
	subtitle: string;
	pet_avatar_blob: unknown | null;
}

type SearchTermPredicate = (placeholder: string) => string;

const firstOwnerIdSql = `(SELECT owners.id
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const firstOwnerAvatarSql = `(SELECT owners.avatar_blob
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

function resultHref(row: SearchResultRow): string {
	if (row.kind === 'owner') return `/owners/${row.id}`;
	if (row.kind === 'pet') return `/pets/${row.id}`;
	return `/records/${row.record_id ?? row.id}`;
}

function searchTerms(query: string): string[] {
	const normalized = query.trim();
	if (normalized.length < 2) return [];
	return normalized.split(/\s+/).filter((term) => term.length > 0);
}

function buildSearchFilter(predicates: SearchTermPredicate[], termCount: number): string {
	return Array.from({ length: termCount }, (_, index) => {
		const placeholder = `$${index + 1}`;
		return `(${predicates.map((predicate) => predicate(placeholder)).join(' OR ')})`;
	}).join(' AND ');
}

const ownerSearchPredicates: SearchTermPredicate[] = [
	(placeholder) => `owners.name LIKE ${placeholder}`,
	(placeholder) => `owners.additional_information LIKE ${placeholder}`,
	(placeholder) => `owner_address.city LIKE ${placeholder}`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM owner_contacts
		WHERE owner_contacts.owner_id = owners.id AND (owner_contacts.value LIKE ${placeholder} OR owner_contacts.label LIKE ${placeholder})
	)`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM owner_additional_responsibles
		WHERE owner_additional_responsibles.owner_id = owners.id AND owner_additional_responsibles.name LIKE ${placeholder}
	)`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM owner_additional_responsibles
		JOIN owner_contacts ON owner_contacts.responsible_id = owner_additional_responsibles.id
		WHERE owner_additional_responsibles.owner_id = owners.id AND (owner_contacts.value LIKE ${placeholder} OR owner_contacts.label LIKE ${placeholder})
	)`
];

const petSearchPredicates: SearchTermPredicate[] = [
	(placeholder) => `pets.name LIKE ${placeholder}`,
	(placeholder) => `pets.species LIKE ${placeholder}`,
	(placeholder) => `pets.breed LIKE ${placeholder}`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		LEFT JOIN addresses AS pet_owner_address ON pet_owner_address.owner_id = owners.id
		WHERE pet_owners.pet_id = pets.id
			AND owners.deleted_at IS NULL
			AND (owners.name LIKE ${placeholder} OR pet_owner_address.city LIKE ${placeholder})
	)`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		JOIN owner_contacts ON owner_contacts.owner_id = owners.id
		WHERE pet_owners.pet_id = pets.id
			AND owners.deleted_at IS NULL
			AND (owner_contacts.value LIKE ${placeholder} OR owner_contacts.label LIKE ${placeholder})
	)`
];

const recordSearchPredicates: SearchTermPredicate[] = [
	(placeholder) => `medical_records.title LIKE ${placeholder}`,
	(placeholder) => `medical_records.description LIKE ${placeholder}`,
	(placeholder) => `pets.name LIKE ${placeholder}`,
	(placeholder) => `pets.species LIKE ${placeholder}`,
	(placeholder) => `pets.breed LIKE ${placeholder}`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		LEFT JOIN addresses AS record_owner_address ON record_owner_address.owner_id = owners.id
		WHERE pet_owners.pet_id = pets.id
			AND owners.deleted_at IS NULL
			AND (owners.name LIKE ${placeholder} OR record_owner_address.city LIKE ${placeholder})
	)`,
	(placeholder) => `EXISTS (
		SELECT 1 FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		JOIN owner_contacts ON owner_contacts.owner_id = owners.id
		WHERE pet_owners.pet_id = pets.id
			AND owners.deleted_at IS NULL
			AND (owner_contacts.value LIKE ${placeholder} OR owner_contacts.label LIKE ${placeholder})
	)`
];

export async function searchClinic(query: string): Promise<SearchResult[]> {
	const terms = searchTerms(query);
	if (terms.length === 0) return [];

	const ownerSearchFilter = buildSearchFilter(ownerSearchPredicates, terms.length);
	const petSearchFilter = buildSearchFilter(petSearchPredicates, terms.length);
	const recordSearchFilter = buildSearchFilter(recordSearchPredicates, terms.length);
	const values = terms.map((term) => `%${term}%`);
	const rows = await selectMany<SearchResultRow>(
		`SELECT 'owner' AS kind,
			owners.id,
			owners.id AS owner_id,
			NULL AS pet_id,
			owners.avatar_blob AS owner_avatar_blob,
			NULL AS pet_avatar_blob,
			(SELECT medical_records.id
			 FROM pets
			 JOIN pet_owners ON pet_owners.pet_id = pets.id
			 JOIN medical_records ON medical_records.pet_id = pets.id
			 WHERE pet_owners.owner_id = owners.id
				AND pets.deleted_at IS NULL
				AND medical_records.deleted_at IS NULL
			 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
			 LIMIT 1) AS record_id,
			owners.name AS title,
			COALESCE((
				SELECT CASE
					WHEN owner_contacts.kind = 'other' AND owner_contacts.label <> '' THEN owner_contacts.label || ': ' || owner_contacts.value
					ELSE owner_contacts.value
				END
				FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id
					AND owner_contacts.responsible_id IS NULL
				ORDER BY owner_contacts.sort_order, owner_contacts.id
				LIMIT 1
			), (
				SELECT owner_additional_responsibles.name
				FROM owner_additional_responsibles
				WHERE owner_additional_responsibles.owner_id = owners.id
				ORDER BY owner_additional_responsibles.sort_order, owner_additional_responsibles.id
				LIMIT 1
			), owners.additional_information, owner_address.city, '') AS subtitle
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.deleted_at IS NULL
			AND ${ownerSearchFilter}

		 UNION ALL

		 SELECT 'pet' AS kind,
			pets.id,
			${firstOwnerIdSql} AS owner_id,
			pets.id AS pet_id,
			${firstOwnerAvatarSql} AS owner_avatar_blob,
			pets.avatar_blob AS pet_avatar_blob,
			(SELECT medical_records.id
			 FROM medical_records
			 WHERE medical_records.pet_id = pets.id
				AND medical_records.deleted_at IS NULL
			 ORDER BY medical_records.updated_at DESC, medical_records.id DESC
			 LIMIT 1) AS record_id,
			pets.name AS title,
			COALESCE(${ownerNamesSql}, '') AS subtitle
		 FROM pets
		 WHERE pets.deleted_at IS NULL
			AND ${petSearchFilter}

		 UNION ALL

		 SELECT 'record' AS kind,
			medical_records.id,
			${firstOwnerIdSql} AS owner_id,
			pets.id AS pet_id,
			${firstOwnerAvatarSql} AS owner_avatar_blob,
			pets.avatar_blob AS pet_avatar_blob,
			medical_records.id AS record_id,
			COALESCE(medical_records.title, 'Prontuario ' || medical_records.id) AS title,
			COALESCE(pets.name || ' · ' || ${ownerNamesSql}, pets.name) AS subtitle
		 FROM medical_records
		 JOIN pets ON pets.id = medical_records.pet_id
		 WHERE medical_records.deleted_at IS NULL
			AND pets.deleted_at IS NULL
			AND ${recordSearchFilter}

		 ORDER BY kind, title
		 LIMIT 40`,
		values
	);

	const ownerIds = rows.filter((row) => row.kind === 'owner').map((row) => row.id);
	const contactsByOwnerId = await listOwnerAssociatedContactsByOwnerIds(ownerIds);

	return rows.map((row) => ({
		kind: row.kind,
		id: row.id,
		recordId: row.record_id,
		ownerId: row.owner_id,
		petId: row.pet_id,
		href: resultHref(row),
		title: row.title,
		subtitle: row.subtitle,
		ownerAvatarBytes: row.kind === 'owner' ? normalizeByteArray(row.owner_avatar_blob) : null,
		petAvatarBytes: row.kind === 'pet' ? normalizeByteArray(row.pet_avatar_blob) : null,
		ownerContacts: row.kind === 'owner' ? (contactsByOwnerId.get(row.id) ?? []) : []
	}));
}
