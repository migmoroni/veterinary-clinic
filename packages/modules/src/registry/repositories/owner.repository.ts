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
} from '@vet/types/domain/owner/owner.js';
import { countryPhoneFormat, countryPhoneFormats, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '@vet/types/domain/geo/location.js';
import { formatEmailForInput } from '@vet/types/domain/shared/email.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '@vet/types/domain/shared/field-limits.js';
import { formatPhoneForStorage } from '@vet/types/domain/shared/phone.js';
import { nowIso } from '@vet/types/domain/shared/time.js';
import { createUuidV7 } from '@vet/types/domain/shared/uuid.js';
import { loadMediaDataMap, mediaHashKey, saveMedia } from '@vet/modules/core_repositories/media.repository.js';
import { execute, selectMany, selectOne } from '@vet/core-local/sqlite/client.js';
import { mediaHashToSqlLiteral, normalizeMediaHash } from '@vet/core-local/sqlite/media.js';

interface OwnerRow {
	id: string;
	name: string;
	avatar_hash: unknown | null;
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
	removed_at: string | null;
}

interface ContactRow {
	id: string;
	kind: OwnerContactKind;
	label: string;
	value: string;
	created_at: string | null;
	updated_at: string | null;
}

interface OwnerContactRow extends ContactRow {
	owner_id: string;
}

interface OwnerAssociatedContactRow extends ContactRow {
	owner_id: string;
	responsible_id: string | null;
	responsible_name: string | null;
}

interface OwnerAdditionalResponsibleRow {
	id: string;
	owner_id: string;
	name: string;
	avatar_hash: unknown | null;
	created_at: string | null;
	updated_at: string | null;
}

interface OwnerAdditionalResponsibleContactRow extends ContactRow {
	responsible_id: string;
}

const phoneFormats = countryPhoneFormats();

function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

async function avatarBytesToHashSqlLiteral(value: Uint8Array | null | undefined): Promise<string> {
	if (!value || value.length === 0) return 'NULL';
	const hash = await saveMedia('user', value);
	return hash ? mediaHashToSqlLiteral(hash) : 'NULL';
}

async function loadAvatarBytesByRows<T extends { avatar_hash: unknown | null }>(rows: readonly T[]): Promise<Map<string, Uint8Array>> {
	return loadMediaDataMap('user', rows.map((row) => normalizeMediaHash(row.avatar_hash)));
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

function mapAdditionalResponsible(row: OwnerAdditionalResponsibleRow, contacts: OwnerContact[] = [], avatarBytes: Uint8Array | null = null): OwnerAdditionalResponsible {
	return {
		id: row.id,
		name: row.name,
		avatarBytes,
		contacts,
		createdAt: row.created_at,
		updatedAt: row.updated_at
	};
}

function mapOwner(row: OwnerRow, contacts: OwnerContact[] = [], additionalResponsibles: OwnerAdditionalResponsible[] = [], avatarBytes: Uint8Array | null = null): Owner {
	return {
		id: row.id,
		name: row.name,
		avatarBytes,
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
		removedAt: row.removed_at
	};
}

export async function listOwnerContacts(ownerId: string): Promise<OwnerContact[]> {
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at
		 FROM contacts
		 WHERE owner_id = $1 AND responsible_id IS NULL AND removed_at IS NULL
		 ORDER BY sort_order, id`,
		[ownerId]
	);

	return rows.map(mapContact);
}

export async function listOwnerContactsByOwnerIds(ownerIds: string[]): Promise<Map<string, OwnerContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => id.trim().length > 0);
	const contactsByOwnerId = new Map<string, OwnerContact[]>();
	if (uniqueIds.length === 0) return contactsByOwnerId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at
		 FROM contacts
		 WHERE owner_id IN (${placeholders}) AND responsible_id IS NULL AND removed_at IS NULL
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

export async function listOwnerAssociatedContactsByOwnerIds(ownerIds: string[]): Promise<Map<string, OwnerAssociatedContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => id.trim().length > 0);
	const contactsByOwnerId = new Map<string, OwnerAssociatedContact[]>();
	if (uniqueIds.length === 0) return contactsByOwnerId;

	const ownerContactPlaceholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const responsibleContactPlaceholders = uniqueIds.map((_, index) => `$${uniqueIds.length + index + 1}`).join(', ');
	const rows = await selectMany<OwnerAssociatedContactRow>(
		`SELECT id, owner_id, kind, label, value, created_at, updated_at, NULL AS responsible_id, NULL AS responsible_name, 0 AS source_order, sort_order AS owner_sort_order, sort_order AS contact_sort_order
		 FROM contacts
		 WHERE owner_id IN (${ownerContactPlaceholders}) AND responsible_id IS NULL AND removed_at IS NULL

		 UNION ALL

		 SELECT contacts.id,
			owner_additional_responsibles.owner_id,
			contacts.kind,
			contacts.label,
			contacts.value,
			contacts.created_at,
			contacts.updated_at,
			owner_additional_responsibles.id AS responsible_id,
			owner_additional_responsibles.name AS responsible_name,
			1 AS source_order,
			owner_additional_responsibles.sort_order AS owner_sort_order,
			contacts.sort_order AS contact_sort_order
		 FROM owner_additional_responsibles
		 JOIN contacts ON contacts.responsible_id = owner_additional_responsibles.id
		 WHERE owner_additional_responsibles.owner_id IN (${responsibleContactPlaceholders})
			AND owner_additional_responsibles.removed_at IS NULL
			AND contacts.removed_at IS NULL
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
	const [contactsByOwnerId, additionalResponsiblesByOwnerId, avatarBytesByHash] = await Promise.all([
		listOwnerContactsByOwnerIds(rows.map((row) => row.id)),
		listOwnerAdditionalResponsiblesByOwnerIds(rows.map((row) => row.id)),
		loadAvatarBytesByRows(rows)
	]);
	return rows.map((row) =>
		mapOwner(
			row,
			contactsByOwnerId.get(row.id) ?? [],
			additionalResponsiblesByOwnerId.get(row.id) ?? [],
			avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null
		)
	);
}

export async function listOwnerAdditionalResponsibleContactsByResponsibleIds(responsibleIds: string[]): Promise<Map<string, OwnerContact[]>> {
	const uniqueIds = [...new Set(responsibleIds)].filter((id) => id.trim().length > 0);
	const contactsByResponsibleId = new Map<string, OwnerContact[]>();
	if (uniqueIds.length === 0) return contactsByResponsibleId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerAdditionalResponsibleContactRow>(
		`SELECT id, responsible_id, kind, label, value, created_at, updated_at
		 FROM contacts
		 WHERE responsible_id IN (${placeholders}) AND owner_id IS NULL AND removed_at IS NULL
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

export async function listOwnerAdditionalResponsibles(ownerId: string): Promise<OwnerAdditionalResponsible[]> {
	const rows = await selectMany<OwnerAdditionalResponsibleRow>(
		`SELECT id, owner_id, name, avatar_hash, created_at, updated_at
		 FROM owner_additional_responsibles
		 WHERE owner_id = $1 AND removed_at IS NULL
		 ORDER BY sort_order, id`,
		[ownerId]
	);

	const [contactsByResponsibleId, avatarBytesByHash] = await Promise.all([
		listOwnerAdditionalResponsibleContactsByResponsibleIds(rows.map((row) => row.id)),
		loadAvatarBytesByRows(rows)
	]);
	return rows.map((row) => mapAdditionalResponsible(row, contactsByResponsibleId.get(row.id) ?? [], avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null));
}

async function listOwnerAdditionalResponsiblesByOwnerIds(ownerIds: string[]): Promise<Map<string, OwnerAdditionalResponsible[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => id.trim().length > 0);
	const responsiblesByOwnerId = new Map<string, OwnerAdditionalResponsible[]>();
	if (uniqueIds.length === 0) return responsiblesByOwnerId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<OwnerAdditionalResponsibleRow>(
		`SELECT id, owner_id, name, avatar_hash, created_at, updated_at
		 FROM owner_additional_responsibles
		 WHERE owner_id IN (${placeholders}) AND removed_at IS NULL
		 ORDER BY owner_id, sort_order, id`,
		uniqueIds
	);

	const [contactsByResponsibleId, avatarBytesByHash] = await Promise.all([
		listOwnerAdditionalResponsibleContactsByResponsibleIds(rows.map((row) => row.id)),
		loadAvatarBytesByRows(rows)
	]);
	for (const row of rows) {
		const responsibles = responsiblesByOwnerId.get(row.owner_id) ?? [];
		responsibles.push(mapAdditionalResponsible(row, contactsByResponsibleId.get(row.id) ?? [], avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null));
		responsiblesByOwnerId.set(row.owner_id, responsibles);
	}

	return responsiblesByOwnerId;
}

async function replaceOwnerContacts(ownerId: string, contacts: OwnerContactInput[] = [], country: string = DEFAULT_OWNER_COUNTRY): Promise<void> {
	const updatedAt = nowIso();
	await execute('UPDATE contacts SET removed_at = $2, updated_at = $2 WHERE owner_id = $1 AND responsible_id IS NULL AND removed_at IS NULL', [ownerId, updatedAt]);

	const normalizedContacts = normalizeContacts(contacts, country);
	for (const [index, contact] of normalizedContacts.entries()) {
		await execute(
			`INSERT INTO contacts (id, owner_id, kind, label, value, sort_order, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
			[createUuidV7(), ownerId, contact.kind, contact.label ?? '', contact.value, index, nowIso()]
		);
	}
}

async function replaceOwnerAdditionalResponsibles(ownerId: string, responsibles: OwnerAdditionalResponsibleInput[] = [], country: string = DEFAULT_OWNER_COUNTRY): Promise<void> {
	const removedAt = nowIso();
	await execute(
		`UPDATE contacts
		 SET removed_at = $2, updated_at = $2
		 WHERE responsible_id IN (SELECT id FROM owner_additional_responsibles WHERE owner_id = $1)
			AND owner_id IS NULL
			AND removed_at IS NULL`,
		[ownerId, removedAt]
	);
	await execute('UPDATE owner_additional_responsibles SET removed_at = $2, updated_at = $2 WHERE owner_id = $1 AND removed_at IS NULL', [ownerId, removedAt]);

	const normalizedResponsibles = normalizeAdditionalResponsibles(responsibles, country);
	for (const [responsibleIndex, responsible] of normalizedResponsibles.entries()) {
		const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(responsible.avatarBytes);
		const responsibleId = createUuidV7();
		const createdAt = nowIso();
		await execute(
			`INSERT INTO owner_additional_responsibles (id, owner_id, name, avatar_hash, sort_order, created_at, updated_at)
			 VALUES ($1, $2, $3, ${avatarSqlLiteral}, $4, $5, $5)`,
			[responsibleId, ownerId, responsible.name, responsibleIndex, createdAt]
		);

		for (const [contactIndex, contact] of responsible.contacts.entries()) {
			await execute(
				`INSERT OR IGNORE INTO contacts (id, responsible_id, kind, label, value, sort_order, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
				[createUuidV7(), responsibleId, contact.kind, contact.label ?? '', contact.value, contactIndex, nowIso()]
			);
		}
	}
}

async function upsertOwnerAddress(ownerId: string, input: OwnerInput, address: NormalizedOwnerAddress): Promise<void> {
	const updatedAt = nowIso();
	await execute(
		`INSERT INTO addresses (
			id,
			owner_id,
			street,
			street_number,
			address_complement,
			neighborhood,
			city,
			state,
			country,
			postal_code,
			created_at,
			updated_at
		)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
		 ON CONFLICT(owner_id) DO UPDATE SET
			street = excluded.street,
			street_number = excluded.street_number,
			address_complement = excluded.address_complement,
			neighborhood = excluded.neighborhood,
			city = excluded.city,
			state = excluded.state,
			country = excluded.country,
			postal_code = excluded.postal_code,
			updated_at = excluded.updated_at,
			removed_at = NULL`,
		[
			createUuidV7(),
			ownerId,
			nullableLimitedText(input.street, FIELD_LIMITS.ownerStreet),
			nullableLimitedText(input.streetNumber, FIELD_LIMITS.ownerStreetNumber),
			nullableLimitedText(input.addressComplement, FIELD_LIMITS.ownerAddressComplement),
			nullableLimitedText(input.neighborhood, FIELD_LIMITS.ownerNeighborhood),
			address.city,
			address.state,
			address.country,
			nullableLimitedText(input.postalCode, FIELD_LIMITS.ownerPostalCode),
			updatedAt
		]
	);
}

export async function listOwners(query = ''): Promise<Owner[]> {
	const normalized = query.trim();
	const values = normalized.length > 0 ? [`%${normalized}%`] : [];
	const filter =
		normalized.length > 0
			? `AND (owners.name LIKE $1 OR owner_address.city LIKE $1 OR owners.additional_information LIKE $1 OR EXISTS (
				SELECT 1 FROM contacts
				WHERE contacts.owner_id = owners.id AND (contacts.value LIKE $1 OR contacts.label LIKE $1)
			) OR EXISTS (
				SELECT 1 FROM owner_additional_responsibles
				WHERE owner_additional_responsibles.owner_id = owners.id AND owner_additional_responsibles.name LIKE $1
			) OR EXISTS (
				SELECT 1 FROM owner_additional_responsibles
				JOIN contacts ON contacts.responsible_id = owner_additional_responsibles.id
				WHERE owner_additional_responsibles.owner_id = owners.id AND (contacts.value LIKE $1 OR contacts.label LIKE $1)
			))`
			: '';

	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_hash, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.removed_at
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.removed_at IS NULL ${filter}
		 ORDER BY owners.name COLLATE NOCASE
		 LIMIT 100`,
		values
	);

	return mapOwnersWithContacts(rows);
}

export async function getOwner(id: string, includeRemoved = false): Promise<Owner | null> {
	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_hash, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.removed_at
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 WHERE owners.id = $1 ${includeRemoved ? '' : 'AND owners.removed_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	if (!rows[0]) return null;
	const [contacts, additionalResponsibles, avatarBytesByHash] = await Promise.all([
		listOwnerContacts(rows[0].id),
		listOwnerAdditionalResponsibles(rows[0].id),
		loadAvatarBytesByRows([rows[0]])
	]);
	return mapOwner(rows[0], contacts, additionalResponsibles, avatarBytesByHash.get(mediaHashKey(rows[0].avatar_hash) ?? '') ?? null);
}

export async function createOwner(input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	const address = normalizeOwnerAddress(input);
	const ownerId = createUuidV7();
	const createdAt = nowIso();
	await execute(
		`INSERT INTO owners (
			id,
			name,
			avatar_hash,
			additional_information,
			created_at,
			updated_at
		)
		 VALUES ($1, $2, ${avatarSqlLiteral}, $3, $4, $4)`,
		[
			ownerId,
			requireLimitedText(input.name, FIELD_LIMITS.ownerName),
			nullableLimitedText(input.additionalInformation, FIELD_LIMITS.ownerAdditionalInformation),
			createdAt
		]
	);

	await upsertOwnerAddress(ownerId, input, address);
	await replaceOwnerContacts(ownerId, input.contacts, address.country);
	await replaceOwnerAdditionalResponsibles(ownerId, input.additionalResponsibles ?? [], address.country);

	const owner = await getOwner(ownerId);
	if (!owner) throw new Error('owner_create_failed');
	return owner;
}

export async function updateOwner(id: string, input: OwnerInput): Promise<Owner> {
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	const address = normalizeOwnerAddress(input);
	const existing = await selectOne<{ id: string }>('SELECT id FROM owners WHERE id = $1 AND removed_at IS NULL', [id]);
	if (!existing) throw new Error('owner_not_found');

	await execute(
		`UPDATE owners
		 SET name = $2,
			avatar_hash = ${avatarSqlLiteral},
			additional_information = $3,
			updated_at = $4
		 WHERE id = $1 AND removed_at IS NULL`,
		[
			id,
			requireLimitedText(input.name, FIELD_LIMITS.ownerName),
			nullableLimitedText(input.additionalInformation, FIELD_LIMITS.ownerAdditionalInformation),
			nowIso()
		]
	);

	await upsertOwnerAddress(id, input, address);
	await replaceOwnerContacts(id, input.contacts, address.country);
	await replaceOwnerAdditionalResponsibles(id, input.additionalResponsibles ?? [], address.country);

	const owner = await getOwner(id);
	if (!owner) throw new Error('owner_not_found');
	return owner;
}

export async function listOwnerAvatarBytesByIds(ownerIds: string[]): Promise<Map<string, Uint8Array | null>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => id.trim().length > 0);
	if (uniqueIds.length === 0) return new Map<string, Uint8Array | null>();

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<{ id: string; avatar_hash: unknown | null }>(
		`SELECT id, avatar_hash
		 FROM owners
		 WHERE id IN (${placeholders}) AND removed_at IS NULL`,
		uniqueIds
	);

	const avatarBytesByHash = await loadAvatarBytesByRows(rows);
	return new Map(rows.map((row) => [row.id, avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null]));
}

export async function listOwnersByPet(petId: string, includeRemoved = false): Promise<Owner[]> {
	const rows = await selectMany<OwnerRow>(
		`SELECT owners.id, owners.name, owners.avatar_hash, owner_address.street, owner_address.street_number, owner_address.address_complement, owner_address.neighborhood, owner_address.city, owner_address.country, owner_address.postal_code, owners.additional_information, owner_address.state,
			owners.created_at, owners.updated_at, owners.removed_at
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 JOIN pet_owners ON pet_owners.owner_id = owners.id
		 WHERE pet_owners.pet_id = $1 ${includeRemoved ? '' : 'AND owners.removed_at IS NULL'}
		 ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id`,
		[petId]
	);

	return mapOwnersWithContacts(rows);
}

export async function softDeleteOwner(id: string): Promise<void> {
	const removedAt = nowIso();
	await execute(
		`UPDATE owners
		 SET removed_at = $2, updated_at = $2
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, removedAt]
	);
}

export async function restoreOwner(id: string): Promise<void> {
	await execute(
		`UPDATE owners
		 SET removed_at = NULL, updated_at = $2
		 WHERE id = $1`,
		[id, nowIso()]
	);
}

export async function hardDeleteOwner(id: string): Promise<void> {
	await softDeleteOwner(id);
}
