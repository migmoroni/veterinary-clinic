import { selectMany } from '$lib/persistence/sqlite/client.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { normalizeSearchText, searchTermsForLocale } from '$lib/domain/shared/search-terms.js';
import { CLINIC_SEARCH_RESULT_KINDS, isClinicSearchResultKind, type ClinicSearchResultKind, type SearchResult } from '$lib/domain/search/search.js';
import { DEFAULT_LOCALE, type Locale } from '$lib/i18n/locales.js';
import { listOwnerAssociatedContactsByOwnerIds } from './owner.repository.js';

interface SearchResultRow {
	kind: ClinicSearchResultKind;
	id: number;
	owner_id: number | null;
	pet_id: number | null;
	owner_avatar_blob: unknown | null;
	title: string;
	subtitle: string;
	pet_avatar_blob: unknown | null;
	search_primary: string;
	search_support: string;
}

interface ActiveSearchResultIdRow {
	id: number;
}

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

const ownerSearchSupportSql = `(SELECT group_concat(value, ' ')
	FROM (
		SELECT contacts.value || ' ' || COALESCE(contacts.label, '') AS value
		FROM contacts
		WHERE contacts.owner_id = owners.id

		UNION ALL

		SELECT owner_additional_responsibles.name AS value
		FROM owner_additional_responsibles
		WHERE owner_additional_responsibles.owner_id = owners.id

		UNION ALL

		SELECT contacts.value || ' ' || COALESCE(contacts.label, '') AS value
		FROM owner_additional_responsibles
		JOIN contacts ON contacts.responsible_id = owner_additional_responsibles.id
		WHERE owner_additional_responsibles.owner_id = owners.id
	))`;

const petOwnerSearchSupportSql = `(SELECT group_concat(value, ' ')
	FROM (
		SELECT owners.name AS value
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL

		UNION ALL

		SELECT contacts.value || ' ' || COALESCE(contacts.label, '') AS value
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		JOIN contacts ON contacts.owner_id = owners.id
		WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
	))`;

function resultHref(row: SearchResultRow): string {
	if (row.kind === 'owner') return `/owners/${row.id}`;
	return `/pets/${row.id}`;
}

function searchResultId(result: SearchResult): number {
	return Number(result.id);
}

function searchResultActiveKey(kind: ClinicSearchResultKind, id: number): string {
	return `${kind}:${id}`;
}

function idsForKind(results: SearchResult[], kind: ClinicSearchResultKind): number[] {
	const ids = results.map((result) => (result.kind === kind ? searchResultId(result) : 0)).filter((id) => Number.isInteger(id) && id > 0);
	return [...new Set(ids)];
}

function isClinicSearchResult(result: SearchResult): result is SearchResult & { kind: ClinicSearchResultKind } {
	return isClinicSearchResultKind(result.kind);
}

async function loadActiveIds(ids: number[], query: string): Promise<Set<number>> {
	if (ids.length === 0) return new Set<number>();

	const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<ActiveSearchResultIdRow>(query.replace('__IDS__', placeholders), ids);
	return new Set(rows.map((row) => row.id));
}

function scoreNormalizedField(value: string, term: string, exactScore: number, prefixScore: number, containsScore: number): number {
	const normalized = normalizeSearchText(value);
	if (!normalized) return 0;

	const words = normalized.split(/\s+/);
	if (words.includes(term)) return exactScore;
	if (words.some((word) => word.startsWith(term))) return prefixScore;
	if (normalized.includes(term)) return containsScore;

	return 0;
}

function scoreSearchRow(row: SearchResultRow, terms: readonly string[]): number {
	let score = 0;

	for (const term of terms) {
		const termScore = Math.max(scoreNormalizedField(row.search_primary, term, 100, 90, 75), scoreNormalizedField(row.search_support, term, 60, 50, 35));
		if (termScore === 0) return 0;
		score += termScore;
	}

	return score;
}

export async function filterActiveSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
	if (results.length === 0) return [];

	const [ownerIds, petIds] = [idsForKind(results, 'owner'), idsForKind(results, 'pet')];
	const [activeOwnerIds, activePetIds] = await Promise.all([
		loadActiveIds(ownerIds, 'SELECT id FROM owners WHERE id IN (__IDS__) AND deleted_at IS NULL'),
		loadActiveIds(petIds, 'SELECT id FROM pets WHERE id IN (__IDS__) AND deleted_at IS NULL')
	]);
	const activeKeys = new Set<string>();

	for (const id of activeOwnerIds) activeKeys.add(searchResultActiveKey('owner', id));
	for (const id of activePetIds) activeKeys.add(searchResultActiveKey('pet', id));

	return results.filter((result) => !isClinicSearchResult(result) || activeKeys.has(searchResultActiveKey(result.kind, searchResultId(result))));
}

export async function searchClinic(query: string, kinds: readonly ClinicSearchResultKind[] = CLINIC_SEARCH_RESULT_KINDS, locale: Locale = DEFAULT_LOCALE): Promise<SearchResult[]> {
	const terms = searchTermsForLocale(query, locale);
	if (terms.length === 0) return [];

	const activeKinds = new Set(kinds);
	const selectStatements: string[] = [];

	if (activeKinds.has('owner')) {
		selectStatements.push(`SELECT 'owner' AS kind,
			owners.id,
			owners.id AS owner_id,
			NULL AS pet_id,
			owners.avatar_blob AS owner_avatar_blob,
			NULL AS pet_avatar_blob,
			owners.name AS title,
			COALESCE((
				SELECT CASE
					WHEN contacts.kind = 'other' AND contacts.label <> '' THEN contacts.label || ': ' || contacts.value
					ELSE contacts.value
				END
				FROM contacts
				WHERE contacts.owner_id = owners.id
					AND contacts.responsible_id IS NULL
				ORDER BY contacts.sort_order, contacts.id
				LIMIT 1
			), (
				SELECT owner_additional_responsibles.name
				FROM owner_additional_responsibles
				WHERE owner_additional_responsibles.owner_id = owners.id
				ORDER BY owner_additional_responsibles.sort_order, owner_additional_responsibles.id
				LIMIT 1
			), owners.additional_information, owner_address.city, '') AS subtitle,
			owners.name AS search_primary,
			COALESCE(${ownerSearchSupportSql}, '') AS search_support
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.deleted_at IS NULL`);
	}

	if (activeKinds.has('pet')) {
		selectStatements.push(`SELECT 'pet' AS kind,
			pets.id,
			${firstOwnerIdSql} AS owner_id,
			pets.id AS pet_id,
			${firstOwnerAvatarSql} AS owner_avatar_blob,
			pets.avatar_blob AS pet_avatar_blob,
			pets.name AS title,
			COALESCE(${ownerNamesSql}, '') AS subtitle,
			pets.name AS search_primary,
			COALESCE(pets.breed, '') || ' ' || COALESCE(${petOwnerSearchSupportSql}, '') AS search_support
		 FROM pets
		 WHERE pets.deleted_at IS NULL`);
	}

	if (selectStatements.length === 0) return [];

	const rows = await selectMany<SearchResultRow>(
		selectStatements.join('\n\nUNION ALL\n\n'),
		[]
	);

	const scoredRows = rows
		.map((row) => ({ row, score: scoreSearchRow(row, terms) }))
		.filter(({ score }) => score > 0)
		.sort((first, second) => second.score - first.score || first.row.kind.localeCompare(second.row.kind) || first.row.title.localeCompare(second.row.title))
		.slice(0, 40);

	const ownerIds = scoredRows.filter(({ row }) => row.kind === 'owner').map(({ row }) => row.id);
	const contactsByOwnerId = await listOwnerAssociatedContactsByOwnerIds(ownerIds);

	return scoredRows.map(({ row }) => ({
		kind: row.kind,
		id: row.id,
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
