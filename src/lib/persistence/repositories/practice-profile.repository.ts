import { countryPhoneFormat, countryPhoneFormats, normalizeOwnerCity, normalizeOwnerCountry, normalizeOwnerState } from '$lib/domain/geo/location.js';
import { DEFAULT_OWNER_COUNTRY, type OwnerContact, type OwnerContactInput, type OwnerContactKind } from '$lib/domain/owner/owner.js';
import { validateImageCollectionItems } from '$lib/domain/image-collection/image-collection.js';
import type {
	PracticeIdentity,
	PracticeProfiles,
	VeterinarianProfile,
	VeterinarianProfileInput,
	Workplace,
	WorkplaceInput
} from '$lib/domain/practice-profile/practice-profile.js';
import { formatEmailForInput } from '$lib/domain/shared/email.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, nullableMultilineText } from '$lib/domain/shared/field-limits.js';
import { formatPhoneForStorage } from '$lib/domain/shared/phone.js';
import { nowIso } from '$lib/domain/shared/time.js';
import { createUuidV7 } from '$lib/domain/shared/uuid.js';
import { getImageCollection, replaceImageCollection } from '$lib/persistence/repositories/image-collection.repository.js';
import { loadMediaData, saveMedia } from '$lib/persistence/repositories/media.repository.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';
import { mediaHashToSqlLiteral, normalizeMediaHash } from '$lib/persistence/sqlite/media.js';

interface VeterinarianProfileRow {
	id: string;
	name: string | null;
	professional_registration: string | null;
	avatar_hash: unknown | null;
	created_at: string | null;
	updated_at: string | null;
}

interface WorkplaceRow {
	id: string;
	name: string | null;
	services_description: string | null;
	street: string | null;
	street_number: string | null;
	address_complement: string | null;
	neighborhood: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	postal_code: string | null;
	created_at: string | null;
	updated_at: string | null;
}

interface ContactRow {
	id: string;
	kind: OwnerContactKind;
	label: string;
	value: string;
	created_at: string | null;
	updated_at: string | null;
}

const phoneFormats = countryPhoneFormats();
const WORKPLACE_IMAGE_COLLECTION_TYPE = 'workplace';
const WORKPLACE_IMAGE_POLICY = { primaryRequired: true, maxItems: 9 } as const;

function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

async function avatarBytesToHashSqlLiteral(value: Uint8Array | null | undefined): Promise<string> {
	if (!value || value.length === 0) return 'NULL';
	const hash = await saveMedia('user', value);
	return hash ? mediaHashToSqlLiteral(hash) : 'NULL';
}

function normalizeContactKind(value: string | null | undefined): OwnerContactKind {
	if (value === 'other') return 'other';
	if (value === 'email') return 'email';
	return value === 'phone' ? 'phone' : 'mobile';
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

function normalizeContacts(contacts: OwnerContactInput[], country: string): OwnerContactInput[] {
	const unique = new Map<string, OwnerContactInput>();

	for (const contact of contacts) {
		const kind = normalizeContactKind(contact.kind);
		const label = kind === 'other' ? nullableLimitedText(contact.label, FIELD_LIMITS.ownerContactLabel) ?? '' : '';
		const value = normalizeContactValue(kind, contact.value, country);
		if (!value || (kind === 'other' && !label)) throw new Error('owner_contact_required');

		const key = `${kind}:${label}:${value}`;
		if (!unique.has(key)) unique.set(key, { kind, label, value });
	}

	return [...unique.values()];
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

async function listVeterinarianContacts(profileId: string | null): Promise<OwnerContact[]> {
	if (!profileId) return [];
	const rows = await selectMany<ContactRow>(
		`SELECT id, kind, label, value, created_at, updated_at
		 FROM contacts
		 WHERE veterinarian_profile_id = $1 AND removed_at IS NULL
		 ORDER BY sort_order, id`,
		[profileId]
	);
	return rows.map(mapContact);
}

async function listWorkplaceContacts(workplaceId: string | null): Promise<OwnerContact[]> {
	if (!workplaceId) return [];
	const rows = await selectMany<ContactRow>(
		`SELECT id, kind, label, value, created_at, updated_at
		 FROM contacts
		 WHERE workplace_id = $1 AND removed_at IS NULL
		 ORDER BY sort_order, id`,
		[workplaceId]
	);
	return rows.map(mapContact);
}

async function replaceContacts(
	target: 'veterinarian_profile_id' | 'workplace_id',
	targetId: string,
	contacts: OwnerContactInput[],
	country: string
): Promise<void> {
	const removedAt = nowIso();
	await execute(`UPDATE contacts SET removed_at = $2, updated_at = $2 WHERE ${target} = $1 AND removed_at IS NULL`, [targetId, removedAt]);
	for (const [index, contact] of normalizeContacts(contacts, country).entries()) {
		const createdAt = nowIso();
		await execute(
			`INSERT INTO contacts (id, ${target}, kind, label, value, sort_order, created_at, updated_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
			[createUuidV7(), targetId, contact.kind, contact.label ?? '', contact.value, index, createdAt]
		);
	}
}

function normalizeWorkplaceAddress(input: WorkplaceInput): { country: string; state: string | null; city: string | null } {
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

export async function getPracticeProfiles(): Promise<PracticeProfiles> {
	const [veterinarianRow, workplaceRow] = await Promise.all([
		selectOne<VeterinarianProfileRow>(
			`SELECT id, name, professional_registration, avatar_hash, created_at, updated_at
			 FROM veterinarian_profiles
			 WHERE removed_at IS NULL
			 ORDER BY created_at ASC, id ASC
			 LIMIT 1`
		),
		selectOne<WorkplaceRow>(
			`SELECT workplaces.id, workplaces.name, workplaces.services_description,
				workplace_address.street, workplace_address.street_number, workplace_address.address_complement,
				workplace_address.neighborhood, workplace_address.city, workplace_address.state,
				workplace_address.country, workplace_address.postal_code,
				workplaces.created_at, workplaces.updated_at
			 FROM workplaces
			 LEFT JOIN addresses AS workplace_address ON workplace_address.workplace_id = workplaces.id
			 WHERE workplaces.removed_at IS NULL
			 ORDER BY workplaces.created_at ASC, workplaces.id ASC
			 LIMIT 1`
		)
	]);
	const [veterinarianContacts, workplaceContacts, workplaceImages] = await Promise.all([
		listVeterinarianContacts(veterinarianRow?.id ?? null),
		listWorkplaceContacts(workplaceRow?.id ?? null),
		workplaceRow ? getImageCollection(WORKPLACE_IMAGE_COLLECTION_TYPE, workplaceRow.id) : null
	]);

	const veterinarian: VeterinarianProfile | null = veterinarianRow
		? {
				id: veterinarianRow.id,
				name: veterinarianRow.name,
				professionalRegistration: veterinarianRow.professional_registration,
				avatarBytes: await loadMediaData('user', normalizeMediaHash(veterinarianRow.avatar_hash)),
				contacts: veterinarianContacts,
				createdAt: veterinarianRow.created_at,
				updatedAt: veterinarianRow.updated_at
			}
		: null;

	const workplace: Workplace | null = workplaceRow
		? {
				id: workplaceRow.id,
				name: workplaceRow.name,
				servicesDescription: workplaceRow.services_description,
				street: workplaceRow.street,
				streetNumber: workplaceRow.street_number,
				addressComplement: workplaceRow.address_complement,
				neighborhood: workplaceRow.neighborhood,
				city: workplaceRow.city,
				state: workplaceRow.state,
				country: workplaceRow.country ?? DEFAULT_OWNER_COUNTRY,
				postalCode: workplaceRow.postal_code,
				contacts: workplaceContacts,
				images: workplaceImages?.items ?? [],
				createdAt: workplaceRow.created_at,
				updatedAt: workplaceRow.updated_at
			}
		: null;

	return { veterinarian, workplace };
}

export async function getPracticeIdentity(): Promise<PracticeIdentity> {
	const row = await selectOne<{ workplace_name: string | null; veterinarian_name: string | null }>(
		`SELECT
			(SELECT name FROM workplaces WHERE removed_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1) AS workplace_name,
			(SELECT name FROM veterinarian_profiles WHERE removed_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1) AS veterinarian_name`
	);
	return {
		workplaceName: nullable(row?.workplace_name),
		veterinarianName: nullable(row?.veterinarian_name)
	};
}

export async function saveVeterinarianProfile(input: VeterinarianProfileInput): Promise<VeterinarianProfile> {
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	const existing = await selectOne<{ id: string }>('SELECT id FROM veterinarian_profiles WHERE removed_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1');
	const id = existing?.id ?? createUuidV7();
	const updatedAt = nowIso();
	await execute(
		`INSERT INTO veterinarian_profiles (id, name, professional_registration, avatar_hash, created_at, updated_at)
		 VALUES ($1, $2, $3, ${avatarSqlLiteral}, $4, $4)
		 ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			professional_registration = excluded.professional_registration,
			avatar_hash = excluded.avatar_hash,
			updated_at = excluded.updated_at,
			removed_at = NULL`,
		[
			id,
			nullableLimitedText(input.name, FIELD_LIMITS.veterinarianName),
			nullableLimitedText(input.professionalRegistration, FIELD_LIMITS.veterinarianProfessionalRegistration),
			updatedAt
		]
	);
	await replaceContacts('veterinarian_profile_id', id, input.contacts, DEFAULT_OWNER_COUNTRY);

	const profiles = await getPracticeProfiles();
	if (!profiles.veterinarian) throw new Error('veterinarian_profile_save_failed');
	return profiles.veterinarian;
}

export async function saveWorkplace(input: WorkplaceInput): Promise<Workplace> {
	validateImageCollectionItems(input.images, WORKPLACE_IMAGE_POLICY);
	const address = normalizeWorkplaceAddress(input);
	const existing = await selectOne<{ id: string }>('SELECT id FROM workplaces WHERE removed_at IS NULL ORDER BY created_at ASC, id ASC LIMIT 1');
	const workplaceId = existing?.id ?? createUuidV7();
	const updatedAt = nowIso();
	await execute(
		`INSERT INTO workplaces (id, name, services_description, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $4)
		 ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			services_description = excluded.services_description,
			updated_at = excluded.updated_at,
			removed_at = NULL`,
		[
			workplaceId,
			nullableLimitedText(input.name, FIELD_LIMITS.workplaceName),
			nullableMultilineText(input.servicesDescription, FIELD_LIMITS.workplaceServicesDescription),
			updatedAt
		]
	);
	await execute(
		`INSERT INTO addresses (
			id, workplace_id, street, street_number, address_complement, neighborhood, city, state, country, postal_code, created_at, updated_at
		)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
		 ON CONFLICT(workplace_id) DO UPDATE SET
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
			workplaceId,
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
	await replaceContacts('workplace_id', workplaceId, input.contacts, address.country);
	await replaceImageCollection(WORKPLACE_IMAGE_COLLECTION_TYPE, workplaceId, input.images, WORKPLACE_IMAGE_POLICY);

	const profiles = await getPracticeProfiles();
	if (!profiles.workplace) throw new Error('workplace_save_failed');
	return profiles.workplace;
}
