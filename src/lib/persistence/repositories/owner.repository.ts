import {
	DEFAULT_OWNER_COUNTRY,
	type Owner,
	type OwnerAdditionalResponsible,
	type OwnerAdditionalResponsibleInput,
	type OwnerAssociatedContact,
	type OwnerContact,
	type OwnerContactInput,
	type OwnerContactKind,
	type OwnerInput
} from '$lib/domain/owner/owner.js';
import { countryPhoneFormat, countryPhoneFormats, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '$lib/domain/geo/location.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { formatEmailForInput } from '$lib/domain/shared/email.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '$lib/domain/shared/field-limits.js';
import { formatPhoneForStorage } from '$lib/domain/shared/phone.js';
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
	additional_information: string | null;
	state: string | null;
	created_at: string | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface ContactRow {
	id: number;
	kind: OwnerContactKind;
	label: string;
	value: string;
	created_at: string | null;
	updated_at: string | null;
}

interface OwnerContactRow extends ContactRow {
	owner_id: number;
}

interface OwnerAssociatedContactRow extends ContactRow {
	owner_id: number;
	responsible_id: number | null;
	responsible_name: string | null;
}

interface OwnerAdditionalResponsibleRow {
	id: number;
	owner_id: number;
	name: string;
	avatar_blob: unknown | null;
	created_at: string | null;
	updated_at: string | null;
}

interface OwnerAdditionalResponsibleContactRow extends ContactRow {
	responsible_id: number;
}

const phoneFormats = countryPhoneFormats();

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
	if (value === 'other') return 'other';
	if (value === 'email') return 'email';
	return value === 'phone' ? 'phone' : 'mobile';
}

function normalizeContactLabel(kind: OwnerContactKind, value: string | null | undefined): string {
	if (kind !== 'other') return '';
	return nullableLimitedText(value, FIELD_LIMITS.ownerContactLabel) ?? '';
}

function normalizeContactValue(kind: OwnerContactKind, value: string | null | undefined, country: string): string | null {
	const trimmed = nullable(value);
	if (!trimmed) return null;

	if (kind === 'email') {
		const email = nullable(formatEmailForInput(trimmed));
		assertTextLimit(email, FIELD_LIMITS.ownerContactEmailValue);
		return email;
	}
	if (kind === 'phone' || kind === 'mobile') {
		const phoneFormat = countryPhoneFormat(country);
		const phone = formatPhoneForStorage(trimmed, phoneFormat, { country: phoneFormat, countries: phoneFormats });
		assertTextLimit(phone, FIELD_LIMITS.ownerContactPhoneValue);
		return phone;
	}

	assertTextLimit(trimmed, FIELD_LIMITS.ownerContactOtherValue);
	return trimmed;
}

interface NormalizedOwnerAddress {
	country: string;
	state: string | null;
	city: string | null;
}

function normalizeOwnerAddress(input: Pick<OwnerInput, 'country' | 'state' | 'city'>): NormalizedOwnerAddress {
	const country = normalizeOwnerCountry(input.country);
	if (!country) throw new Error('owner_location_invalid');

	const state = normalizeOwnerState(input.state, country, input.city);
	if (nullable(input.state) && !state) throw new Error('owner_location_invalid');

	const city = normalizeOwnerCity(input.city, country, state);
	if (nullable(input.city) && !city) throw new Error('owner_location_invalid');

	assertTextLimit(state, FIELD_LIMITS.ownerState);
	assertTextLimit(city, FIELD_LIMITS.ownerCity);

	return { country, state, city };
}

function normalizeContacts(contacts: OwnerContactInput[], country: string): OwnerContactInput[] {
	const unique = new Map<string, OwnerContactInput>();

	for (const contact of contacts) {
		const kind = normalizeContactKind(contact.kind);
		const label = normalizeContactLabel(kind, contact.label);
		const value = normalizeContactValue(kind, contact.value, country);
		if (!value) throw new Error('owner_contact_required');
		if (kind === 'other' && !label) throw new Error('owner_contact_required');

		const key = `${kind}:${label}:${value}`;
		if (!unique.has(key)) unique.set(key, { kind, label, value });
	}

	return [...unique.values()];
}

function normalizeAdditionalResponsibles(responsibles: OwnerAdditionalResponsibleInput[] = [], country: string = DEFAULT_OWNER_COUNTRY): OwnerAdditionalResponsibleInput[] {
	return responsibles
		.map((responsible) => ({
			name: nullableLimitedText(responsible.name, FIELD_LIMITS.ownerAdditionalResponsibleName) ?? '',
			avatarBytes: responsible.avatarBytes ?? null,
			contacts: normalizeContacts(responsible.contacts ?? [], country)
		}))
		.filter((responsible) => responsible.name.length > 0);
}

function mapContact(row: ContactRow): OwnerContact {
	return {
		id: row.id,
		kind: normalizeContactKind(row.kind),
		label: row.label ?? '',
		value: row.value,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function mapAssociatedContact(row: OwnerAssociatedContactRow): OwnerAssociatedContact {
	return {
		...mapContact(row),
		responsibleId: row.responsible_id,
		responsibleName: row.responsible_name
	};
}

function mapAdditionalResponsible(row: OwnerAdditionalResponsibleRow, contacts: OwnerContact[] = []): OwnerAdditionalResponsible {
	return {
		id: row.id,
		name: row.name,
		avatarBytes: normalizeByteArray(row.avatar_blob),
		contacts,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function mapOwner(row: OwnerRow, contacts: OwnerContact[] = [], additionalResponsibles: OwnerAdditionalResponsible[] = []): Owner {
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
		additionalInformation: row.additional_information,
		contacts,
		additionalResponsibles,
		state: row.state,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

export async function listOwnerContacts(ownerId: number): Promise<OwnerContact[]> {
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at
		 FROM owner_contacts
		 WHERE owner_id = $1 AND responsible_id IS NULL
		 ORDER BY sort_order, id`,
		[ownerId]
	);

	return rows.map(mapContact);
}

export async function listOwnerContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	const contactsByOwnerId = new Map<number, OwnerContact[]>();
	if (uniqueIds.length === 0) return contactsByOwnerId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at
		 FROM owner_contacts
		 WHERE owner_id IN (${placeholders}) AND responsible_id IS NULL
		 ORDER BY owner_id, sort_order, id`,
		uniqueIds
	);

	for (const row of rows) {
		const contacts = contactsByOwnerId.get(row.owner_id) ?? [];
		contacts.push(mapContact(row));
		contactsByOwnerId.set(row.owner_id, contacts);
	}

	return contactsByOwnerId;
}

export async function listOwnerAssociatedContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerAssociatedContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	const contactsByOwnerId = new Map<number, OwnerAssociatedContact[]>();
	if (uniqueIds.length === 0) return contactsByOwnerId;

	const ownerContactPlaceholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const responsibleContactPlaceholders = uniqueIds.map((_, index) => `$${uniqueIds.length + index + 1}`).join(', ');
	const rows = await selectMany<OwnerAssociatedContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at, NULL AS responsible_id, NULL AS responsible_name, 0 AS source_order, sort_order AS owner_sort_order, sort_order AS contact_sort_order
		 FROM owner_contacts
		 WHERE owner_id IN (${ownerContactPlaceholders}) AND responsible_id IS NULL

		 UNION ALL

		 SELECT owner_contacts.id,
			owner_additional_responsibles.owner_id,
			owner_contacts.kind,
			owner_contacts.label,
			owner_contacts.value,
			owner_contacts.created_at,
			owner_contacts.updated_at,
			owner_additional_responsibles.id AS responsible_id,
			owner_additional_responsibles.name AS responsible_name,
			1 AS source_order,
			owner_additional_responsibles.sort_order AS owner_sort_order,
			owner_contacts.sort_order AS contact_sort_order
		 FROM owner_additional_responsibles
		 JOIN owner_contacts ON owner_contacts.responsible_id = owner_additional_responsibles.id
		 WHERE owner_additional_responsibles.owner_id IN (${responsibleContactPlaceholders})
		 ORDER BY owner_id, source_order, owner_sort_order, contact_sort_order, id`,
		[...uniqueIds, ...uniqueIds]
	);

	for (const row of rows) {
		const contacts = contactsByOwnerId.get(row.owner_id) ?? [];
		contacts.push(mapAssociatedContact(row));
		contactsByOwnerId.set(row.owner_id, contacts);
	}

	return contactsByOwnerId;
}

async function mapOwnersWithContacts(rows: OwnerRow[]): Promise<Owner[]> {
	const contactsByOwnerId = await listOwnerContactsByOwnerIds(rows.map((row) => row.id));
	const additionalResponsiblesByOwnerId = await listOwnerAdditionalResponsiblesByOwnerIds(rows.map((row) => row.id));
	return rows.map((row) => mapOwner(row, contactsByOwnerId.get(row.id) ?? [], additionalResponsiblesByOwnerId.get(row.id) ?? []));
}

export async function listOwnerAdditionalResponsibleContactsByResponsibleIds(responsibleIds: number[]): Promise<Map<number, OwnerContact[]>> {
	const uniqueIds = [...new Set(responsibleIds)].filter((id) => Number.isFinite(id));
	const contactsByResponsibleId = new Map<number, OwnerContact[]>();
	if (uniqueIds.length === 0) return contactsByResponsibleId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerAdditionalResponsibleContactRow>(
		`SELECT id, responsible_id, kind, label, value, created_at, updated_at
		 FROM owner_contacts
		 WHERE responsible_id IN (${placeholders}) AND owner_id IS NULL
		 ORDER BY responsible_id, sort_order, id`,
		uniqueIds
	);

	for (const row of rows) {
		const contacts = contactsByResponsibleId.get(row.responsible_id) ?? [];
		contacts.push(mapContact(row));
		contactsByResponsibleId.set(row.responsible_id, contacts);
	}

	return contactsByResponsibleId;
}

export async function listOwnerAdditionalResponsibles(ownerId: number): Promise<OwnerAdditionalResponsible[]> {
	const rows = await selectMany<OwnerAdditionalResponsibleRow>(
		`SELECT id, owner_id, name, avatar_blob, created_at, updated_at
		 FROM owner_additional_responsibles
		 WHERE owner_id = $1
		 ORDER BY sort_order, id`,
		[ownerId]
	);

	const contactsByResponsibleId = await listOwnerAdditionalResponsibleContactsByResponsibleIds(rows.map((row) => row.id));
	return rows.map((row) => mapAdditionalResponsible(row, contactsByResponsibleId.get(row.id) ?? []));
}

async function listOwnerAdditionalResponsiblesByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerAdditionalResponsible[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	const responsiblesByOwnerId = new Map<number, OwnerAdditionalResponsible[]>();
	if (uniqueIds.length === 0) return responsiblesByOwnerId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerAdditionalResponsibleRow>(
		`SELECT id, owner_id, name, avatar_blob, created_at, updated_at
		 FROM owner_additional_responsibles
		 WHERE owner_id IN (${placeholders})
		 ORDER BY owner_id, sort_order, id`,
		uniqueIds
	);

	const contactsByResponsibleId = await listOwnerAdditionalResponsibleContactsByResponsibleIds(rows.map((row) => row.id));
	for (const row of rows) {
		const responsibles = responsiblesByOwnerId.get(row.owner_id) ?? [];
		responsibles.push(mapAdditionalResponsible(row, contactsByResponsibleId.get(row.id) ?? []));
		responsiblesByOwnerId.set(row.owner_id, responsibles);
	}

	return responsiblesByOwnerId;
}

async function replaceOwnerContacts(ownerId: number, contacts: OwnerContactInput[] = [], country: string = DEFAULT_OWNER_COUNTRY): Promise<void> {
	await execute('DELETE FROM owner_contacts WHERE owner_id = $1 AND responsible_id IS NULL', [ownerId]);

	const normalizedContacts = normalizeContacts(contacts, country);
	for (const [index, contact] of normalizedContacts.entries()) {
		await execute(
			`INSERT INTO owner_contacts (owner_id, kind, label, value, sort_order, updated_at)
			 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
			[ownerId, contact.kind, contact.label ?? '', contact.value, index]
		);
	}
}

async function replaceOwnerAdditionalResponsibles(ownerId: number, responsibles: OwnerAdditionalResponsibleInput[] = [], country: string = DEFAULT_OWNER_COUNTRY): Promise<void> {
	await execute('DELETE FROM owner_contacts WHERE responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = $1) AND owner_id IS NULL', [ownerId]);
	await execute('DELETE FROM owner_additional_responsibles WHERE owner_id = $1', [ownerId]);

	const normalizedResponsibles = normalizeAdditionalResponsibles(responsibles, country);
	for (const [responsibleIndex, responsible] of normalizedResponsibles.entries()) {
		const avatarSqlLiteral = avatarBytesToSqlLiteral(responsible.avatarBytes);
		const result = await execute(
			`INSERT INTO owner_additional_responsibles (owner_id, name, avatar_blob, sort_order, updated_at)
			 VALUES ($1, $2, ${avatarSqlLiteral}, $3, CURRENT_TIMESTAMP)`,
			[ownerId, responsible.name, responsibleIndex]
		);
		const responsibleId = Number(result.lastInsertId);

		for (const [contactIndex, contact] of responsible.contacts.entries()) {
			await execute(
				`INSERT OR IGNORE INTO owner_contacts (responsible_id, kind, label, value, sort_order, updated_at)
				 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
				[responsibleId, contact.kind, contact.label ?? '', contact.value, contactIndex]
			);
		}
	}
}

async function upsertOwnerAddress(ownerId: number, input: OwnerInput, address: NormalizedOwnerAddress): Promise<void> {
	await execute(
		`INSERT INTO addresses (
			owner_id,
			street,
			street_number,
			address_complement,
			neighborhood,
			city,
			state,
			country,
			postal_code,
			updated_at
		)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
		 ON CONFLICT(owner_id) DO UPDATE SET
			street = excluded.street,
			street_number = excluded.street_number,
			address_complement = excluded.address_complement,
			neighborhood = excluded.neighborhood,
			city = excluded.city,
			state = excluded.state,
			country = excluded.country,
			postal_code = excluded.postal_code,
			updated_at = CURRENT_TIMESTAMP`,
		[
			ownerId,
			nullableLimitedText(input.street, FIELD_LIMITS.ownerStreet),
			nullableLimitedText(input.streetNumber, FIELD_LIMITS.ownerStreetNumber),
			nullableLimitedText(input.addressComplement, FIELD_LIMITS.ownerAddressComplement),
			nullableLimitedText(input.neighborhood, FIELD_LIMITS.ownerNeighborhood),
			address.city,
			address.state,
			address.country,
			nullableLimitedText(input.postalCode, FIELD_LIMITS.ownerPostalCode)
		]
	);
}

export async function listOwners(query = ''): Promise<Owner[]> {
	const normalized = query.trim();
	const values = normalized.length > 0 ? [`%${normalized}%`] : [];
	const filter =
		normalized.length > 0
			? `AND (owners.name LIKE $1 OR owner_address.city LIKE $1 OR owners.additional_information LIKE $1 OR EXISTS (
				SELECT 1 FROM owner_contacts
				WHERE owner_contacts.owner_id = owners.id AND (owner_contacts.value LIKE $1 OR owner_contacts.label LIKE $1)
			) OR EXISTS (
				SELECT 1 FROM owner_additional_responsibles
				WHERE owner_additional_responsibles.owner_id = owners.id AND owner_additional_responsibles.name LIKE $1
			) OR EXISTS (
				SELECT 1 FROM owner_additional_responsibles
				JOIN owner_contacts ON owner_contacts.responsible_id = owner_additional_responsibles.id
				WHERE owner_additional_responsibles.owner_id = owners.id AND (owner_contacts.value LIKE $1 OR owner_contacts.label LIKE $1)
			))`
			: '';

	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_blob, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.deleted_at, owners.purge_after
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.deleted_at IS NULL ${filter}
		 ORDER BY owners.name COLLATE NOCASE
		 LIMIT 100`,
		values
	);

	return mapOwnersWithContacts(rows);
}

export async function getOwner(id: number, includeDeleted = false): Promise<Owner | null> {
	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_blob, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.deleted_at, owners.purge_after
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.id = $1 ${includeDeleted ? '' : 'AND owners.deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	if (!rows[0]) return null;
	const [contacts, additionalResponsibles] = await Promise.all([listOwnerContacts(rows[0].id), listOwnerAdditionalResponsibles(rows[0].id)]);
	return mapOwner(rows[0], contacts, additionalResponsibles);
}

export async function createOwner(input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = avatarBytesToSqlLiteral(input.avatarBytes);
	const address = normalizeOwnerAddress(input);
	const result = await execute(
		`INSERT INTO owners (
			name,
			avatar_blob,
			additional_information,
			updated_at
		)
		 VALUES ($1, ${avatarSqlLiteral}, $2, CURRENT_TIMESTAMP)`,
		[
			requireLimitedText(input.name, FIELD_LIMITS.ownerName),
			nullableLimitedText(input.additionalInformation, FIELD_LIMITS.ownerAdditionalInformation)
		]
	);

	const ownerId = Number(result.lastInsertId);
	await upsertOwnerAddress(ownerId, input, address);
	await replaceOwnerContacts(ownerId, input.contacts, address.country);
	await replaceOwnerAdditionalResponsibles(ownerId, input.additionalResponsibles ?? [], address.country);

	const owner = await getOwner(ownerId);
	if (!owner) throw new Error('owner_create_failed');
	return owner;
}

export async function updateOwner(id: number, input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = avatarBytesToSqlLiteral(input.avatarBytes);
	const address = normalizeOwnerAddress(input);
	const existing = await selectOne<{ id: number }>('SELECT id FROM owners WHERE id = $1 AND deleted_at IS NULL', [id]);
	if (!existing) throw new Error('owner_not_found');

	await execute(
		`UPDATE owners
		 SET name = $2,
			avatar_blob = ${avatarSqlLiteral},
			additional_information = $3,
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[
			id,
			requireLimitedText(input.name, FIELD_LIMITS.ownerName),
			nullableLimitedText(input.additionalInformation, FIELD_LIMITS.ownerAdditionalInformation)
		]
	);

	await upsertOwnerAddress(id, input, address);
	await replaceOwnerContacts(id, input.contacts, address.country);
	await replaceOwnerAdditionalResponsibles(id, input.additionalResponsibles ?? [], address.country);

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

export async function listOwnersByPet(petId: number, includeDeleted = false): Promise<Owner[]> {
	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_blob, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.deleted_at, owners.purge_after
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 JOIN pet_owners ON pet_owners.owner_id = owners.id
		 WHERE pet_owners.pet_id = $1 ${includeDeleted ? '' : 'AND owners.deleted_at IS NULL'}
		 ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id`,
		[petId]
	);

	return mapOwnersWithContacts(rows);
}

export async function softDeleteOwner(id: number): Promise<void> {
	const deletedAt = nowIso();
	const purgeAfter = computePurgeAfter(deletedAt);

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
}

export async function hardDeleteOwner(id: number): Promise<void> {
	await execute('DELETE FROM pet_owners WHERE owner_id = $1', [id]);
	await execute('DELETE FROM owner_contacts WHERE owner_id = $1 OR responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = $1)', [id]);
	await execute('DELETE FROM owner_additional_responsibles WHERE owner_id = $1', [id]);
	await execute('DELETE FROM addresses WHERE owner_id = $1', [id]);
	await execute('DELETE FROM owners WHERE id = $1', [id]);
}
