import { DEFAULT_OWNER_COUNTRY, type Owner, type OwnerContact, type OwnerContactInput, type OwnerContactKind, type OwnerInput } from '$lib/domain/owner/owner.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';

interface OwnerRow {
	id: number;
	name: string;
	avatar_blob: unknown | null;
	street: string | null;
	street_number: string | null;
	address_complement: string | null;
	neighborhood: string | null;
	city: string | null;
	country: string | null;
	postal_code: string | null;
	state: string | null;
	created_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface OwnerContactRow {
	id: number;
	owner_id: number;
	kind: OwnerContactKind;
	value: string;
	created_at: string | null;
	updated_at: string | null;
}

function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

function avatarBytesToSqlLiteral(value: Uint8Array | null | undefined): string {
	if (!value || value.length === 0) return 'NULL';

	const hex = Array.from(value, (byte) => byte.toString(16).padStart(2, '0')).join('');
	return `X'${hex}'`;
}

function normalizeContactKind(value: string | null | undefined): OwnerContactKind {
	return value === 'phone' ? 'phone' : 'mobile';
}

function normalizeCountry(value: string | null | undefined): string {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : DEFAULT_OWNER_COUNTRY;
}

function normalizeContacts(contacts: OwnerContactInput[]): OwnerContactInput[] {
	const unique = new Map<string, OwnerContactInput>();

	for (const contact of contacts) {
		const value = nullable(contact.value);
		if (!value) continue;

		const kind = normalizeContactKind(contact.kind);
		const key = `${kind}:${value}`;
		if (!unique.has(key)) unique.set(key, { kind, value });
	}

	return [...unique.values()];
}

function mapOwnerContact(row: OwnerContactRow): OwnerContact {
	return {
		id: row.id,
		kind: normalizeContactKind(row.kind),
		value: row.value,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function mapOwner(row: OwnerRow, contacts: OwnerContact[] = []): Owner {
	return {
		id: row.id,
		name: row.name,
		avatarBytes: normalizeByteArray(row.avatar_blob),
		street: row.street,
		streetNumber: row.street_number,
		addressComplement: row.address_complement,
		neighborhood: row.neighborhood,
		city: row.city,
		country: row.country,
		postalCode: row.postal_code,
		contacts,
		state: row.state,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

export async function listOwnerContacts(ownerId: number): Promise<OwnerContact[]> {
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, value, created_at, updated_at
		 FROM owner_contacts
		 WHERE owner_id = $1
		 ORDER BY sort_order, id`,
		[ownerId]
	);

	return rows.map(mapOwnerContact);
}

export async function listOwnerContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	const contactsByOwnerId = new Map<number, OwnerContact[]>();
	if (uniqueIds.length === 0) return contactsByOwnerId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, value, created_at, updated_at
		 FROM owner_contacts
		 WHERE owner_id IN (${placeholders})
		 ORDER BY owner_id, sort_order, id`,
		uniqueIds
	);

	for (const row of rows) {
		const contacts = contactsByOwnerId.get(row.owner_id) ?? [];
		contacts.push(mapOwnerContact(row));
		contactsByOwnerId.set(row.owner_id, contacts);
	}

	return contactsByOwnerId;
}

async function mapOwnersWithContacts(rows: OwnerRow[]): Promise<Owner[]> {
	const contactsByOwnerId = await listOwnerContactsByOwnerIds(rows.map((row) => row.id));
	return rows.map((row) => mapOwner(row, contactsByOwnerId.get(row.id) ?? []));
}

async function replaceOwnerContacts(ownerId: number, contacts: OwnerContactInput[]): Promise<void> {
	await execute('DELETE FROM owner_contacts WHERE owner_id = $1', [ownerId]);

	const normalizedContacts = normalizeContacts(contacts);
	for (const [index, contact] of normalizedContacts.entries()) {
		await execute(
			`INSERT INTO owner_contacts (owner_id, kind, value, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
			[ownerId, contact.kind, contact.value, index]
		);
	}
}

export async function listOwners(query = ''): Promise<Owner[]> {
	const normalized = query.trim();
	const values = normalized.length > 0 ? [`%${normalized}%`] : [];
	const filter =
		normalized.length > 0
			? `AND (name LIKE $1 OR city LIKE $1 OR EXISTS (
				SELECT 1 FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id AND owner_contacts.value LIKE $1
			))`
			: '';

	const rows = await selectMany<OwnerRow>(
		`SELECT id, name, avatar_blob, street, street_number, address_complement, neighborhood, city, country, postal_code, state,
			created_at, updated_at, deleted_at, purge_after
		 FROM owners
		 WHERE deleted_at IS NULL ${filter}
		 ORDER BY name COLLATE NOCASE
		 LIMIT 100`,
		values
	);

	return mapOwnersWithContacts(rows);
}

export async function getOwner(id: number, includeDeleted = false): Promise<Owner | null> {
	const rows = await selectMany<OwnerRow>(
		`SELECT id, name, avatar_blob, street, street_number, address_complement, neighborhood, city, country, postal_code, state,
			created_at, updated_at, deleted_at, purge_after
		 FROM owners
		 WHERE id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	if (!rows[0]) return null;
	return mapOwner(rows[0], await listOwnerContacts(rows[0].id));
}

export async function createOwner(input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = avatarBytesToSqlLiteral(input.avatarBytes);
	const result = await execute(
		`INSERT INTO owners (
			name,
			avatar_blob,
			street,
			street_number,
			address_complement,
			neighborhood,
			city,
			country,
			postal_code,
			state,
			updated_at
		)
		 VALUES ($1, ${avatarSqlLiteral}, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
		[
			input.name.trim(),
			nullable(input.street),
			nullable(input.streetNumber),
			nullable(input.addressComplement),
			nullable(input.neighborhood),
			nullable(input.city),
			normalizeCountry(input.country),
			nullable(input.postalCode),
			nullable(input.state)?.toUpperCase() ?? null
		]
	);

	const ownerId = Number(result.lastInsertId);
	await replaceOwnerContacts(ownerId, input.contacts);

	const owner = await getOwner(ownerId);
	if (!owner) throw new Error('owner_create_failed');
	return owner;
}

export async function updateOwner(id: number, input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = avatarBytesToSqlLiteral(input.avatarBytes);
	await execute(
		`UPDATE owners
		 SET name = $2,
			avatar_blob = ${avatarSqlLiteral},
			street = $3,
			street_number = $4,
			address_complement = $5,
			neighborhood = $6,
			city = $7,
			country = $8,
			postal_code = $9,
			state = $10,
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[
			id,
			input.name.trim(),
			nullable(input.street),
			nullable(input.streetNumber),
			nullable(input.addressComplement),
			nullable(input.neighborhood),
			nullable(input.city),
			normalizeCountry(input.country),
			nullable(input.postalCode),
			nullable(input.state)?.toUpperCase() ?? null
		]
	);

	const existing = await selectOne<{ id: number }>('SELECT id FROM owners WHERE id = $1 AND deleted_at IS NULL', [id]);
	if (!existing) throw new Error('owner_not_found');

	await replaceOwnerContacts(id, input.contacts);

	const owner = await getOwner(id);
	if (!owner) throw new Error('owner_not_found');
	return owner;
}

export async function listOwnerAvatarBytesByIds(ownerIds: number[]): Promise<Map<number, Uint8Array | null>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isInteger(id) && id > 0);
	if (uniqueIds.length === 0) return new Map<number, Uint8Array | null>();

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<{ id: number; avatar_blob: unknown | null }>(
		`SELECT id, avatar_blob
		 FROM owners
		 WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
		uniqueIds
	);

	return new Map(rows.map((row) => [row.id, normalizeByteArray(row.avatar_blob)]));
}

export async function softDeleteOwner(id: number): Promise<void> {
	const deletedAt = nowIso();
	const purgeAfter = computePurgeAfter(deletedAt);

	await execute(
		`UPDATE pet_vaccinations
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1) AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
	await execute(
		`UPDATE medical_records
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1) AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
	await execute(
		`UPDATE pets
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE owner_id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
	await execute(
		`UPDATE owners
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
}

export async function restoreOwner(id: number): Promise<void> {
	await execute(
		`UPDATE owners
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);
	await execute(
		`UPDATE pets
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE owner_id = $1`,
		[id]
	);
	await execute(
		`UPDATE medical_records
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1)`,
		[id]
	);
	await execute(
		`UPDATE pet_vaccinations
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1)`,
		[id]
	);
}

export async function hardDeleteOwner(id: number): Promise<void> {
	await execute('DELETE FROM pet_vaccinations WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1)', [id]);
	await execute('DELETE FROM medical_records WHERE pet_id IN (SELECT id FROM pets WHERE owner_id = $1)', [id]);
	await execute('DELETE FROM pets WHERE owner_id = $1', [id]);
	await execute('DELETE FROM owners WHERE id = $1', [id]);
}