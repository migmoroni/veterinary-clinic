import type { Pet, PetBreed, PetInput, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import { isPetBreed, isPetBreedForSpecies, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '$lib/domain/shared/field-limits.js';
import { nowIso } from '$lib/domain/shared/time.js';
import { createUuidV7 } from '$lib/domain/shared/uuid.js';
import { loadMediaDataMap, mediaHashKey, saveMedia } from '$lib/persistence/repositories/media.repository.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';
import { mediaHashToSqlLiteral, normalizeMediaHash } from '$lib/persistence/sqlite/media.js';

interface PetRow {
	id: string;
	name: string;
	birth_date: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatar_hash: unknown | null;
	created_at: string | null;
	updated_at: string | null;
	removed_at: string | null;
}

interface PetOwnerRow {
	pet_id: string;
	owner_id: string;
}

async function avatarBytesToHashSqlLiteral(value: Uint8Array | null | undefined): Promise<string> {
	if (!value || value.length === 0) return 'NULL';
	const hash = await saveMedia('user', value);
	return hash ? mediaHashToSqlLiteral(hash) : 'NULL';
}

async function loadPetAvatarBytesByRows(rows: readonly PetRow[]): Promise<Map<string, Uint8Array>> {
	return loadMediaDataMap('user', rows.map((row) => normalizeMediaHash(row.avatar_hash)));
}

function mapPet(row: PetRow, ownerIds: string[] = [], avatarBytes: Uint8Array | null = null): Pet {
	return {
		id: row.id,
		ownerIds,
		name: row.name,
		birthDate: row.birth_date,
		species: row.species,
		breed: row.breed,
		sex: row.sex,
		avatarBytes,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		removedAt: row.removed_at
	};
}

async function listPetOwnerIdsByPetIds(petIds: string[], includeRemoved = false): Promise<Map<string, string[]>> {
	const uniqueIds = [...new Set(petIds)].filter((id) => id.trim().length > 0);
	const ownerIdsByPetId = new Map<string, string[]>();
	if (uniqueIds.length === 0) return ownerIdsByPetId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<PetOwnerRow>(
		`SELECT pet_owners.pet_id, pet_owners.owner_id
		 FROM pet_owners
		 JOIN owners ON owners.id = pet_owners.owner_id
		 WHERE pet_owners.pet_id IN (${placeholders}) ${includeRemoved ? '' : 'AND owners.removed_at IS NULL'}
		 ORDER BY pet_owners.pet_id, pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id`,
		uniqueIds
	);

	for (const row of rows) {
		const ownerIds = ownerIdsByPetId.get(row.pet_id) ?? [];
		ownerIds.push(row.owner_id);
		ownerIdsByPetId.set(row.pet_id, ownerIds);
	}

	return ownerIdsByPetId;
}

async function mapPetsWithOwners(rows: PetRow[], includeRemoved = false): Promise<Pet[]> {
	const [ownerIdsByPetId, avatarBytesByHash] = await Promise.all([
		listPetOwnerIdsByPetIds(rows.map((row) => row.id), includeRemoved),
		loadPetAvatarBytesByRows(rows)
	]);
	return rows.map((row) => mapPet(row, ownerIdsByPetId.get(row.id) ?? [], avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null));
}

function normalizeTaxonomy(input: PetInput): { species: PetSpecies | null; breed: PetBreed | null } {
	const species = nullableLimitedText(input.species, FIELD_LIMITS.petSpecies) as PetSpecies | null;
	if (!species) return { species: null, breed: null };
	const breed = nullableLimitedText(input.breed, FIELD_LIMITS.petBreed) as PetBreed | null;
	if (breed && isPetBreed(breed) && isPetSpecies(species) && !isPetBreedForSpecies(species, breed)) throw new Error('pet_taxonomy_invalid');

	return { species, breed };
}

export async function listPetsByOwner(ownerId: string, includeRemoved = false): Promise<Pet[]> {
	const rows = await selectMany<PetRow>(
		`SELECT pets.id, pets.name, pets.birth_date, pets.species, pets.breed, pets.sex, pets.avatar_hash, pets.created_at, pets.updated_at, pets.removed_at
		 FROM pets
		 JOIN pet_owners ON pet_owners.pet_id = pets.id
		 WHERE pet_owners.owner_id = $1 ${includeRemoved ? '' : 'AND pets.removed_at IS NULL AND pet_owners.removed_at IS NULL'}
		 ORDER BY pets.name COLLATE NOCASE`,
		[ownerId]
	);

	return mapPetsWithOwners(rows, includeRemoved);
}

export async function getPet(id: string, includeRemoved = false): Promise<Pet | null> {
	const rows = await selectMany<PetRow>(
		`SELECT id, name, birth_date, species, breed, sex, avatar_hash, created_at, updated_at, removed_at
		 FROM pets
		 WHERE id = $1 ${includeRemoved ? '' : 'AND removed_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	if (!rows[0]) return null;
	const [ownerIdsByPetId, avatarBytesByHash] = await Promise.all([
		listPetOwnerIdsByPetIds([rows[0].id], includeRemoved),
		loadPetAvatarBytesByRows([rows[0]])
	]);
	return mapPet(rows[0], ownerIdsByPetId.get(rows[0].id) ?? [], avatarBytesByHash.get(mediaHashKey(rows[0].avatar_hash) ?? '') ?? null);
}

export async function listPetAvatarBytesByIds(petIds: string[]): Promise<Map<string, Uint8Array | null>> {
	const uniqueIds = [...new Set(petIds)].filter((id) => id.trim().length > 0);
	if (uniqueIds.length === 0) return new Map<string, Uint8Array | null>();

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<{ id: string; avatar_hash: unknown | null }>(
		`SELECT id, avatar_hash
		 FROM pets
		 WHERE id IN (${placeholders}) AND removed_at IS NULL`,
		uniqueIds
	);

	const avatarBytesByHash = await loadMediaDataMap('user', rows.map((row) => normalizeMediaHash(row.avatar_hash)));
	return new Map(rows.map((row) => [row.id, avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null]));
}

export async function searchPetsForOwnerLink(ownerId: string, query: string): Promise<Pet[]> {
	const normalized = query.trim();
	if (normalized.length < 2) return [];

	const term = `%${normalized}%`;
	const rows = await selectMany<PetRow>(
		`SELECT pets.id, pets.name, pets.birth_date, pets.species, pets.breed, pets.sex, pets.avatar_hash, pets.created_at, pets.updated_at, pets.removed_at
		 FROM pets
		 WHERE pets.removed_at IS NULL
			AND (pets.name LIKE $2 OR pets.species LIKE $2 OR pets.breed LIKE $2)
			AND NOT EXISTS (
				SELECT 1
				FROM pet_owners
				WHERE pet_owners.pet_id = pets.id AND pet_owners.owner_id = $1
			)
		 ORDER BY pets.name COLLATE NOCASE
		 LIMIT 20`,
		[ownerId, term]
	);

	return mapPetsWithOwners(rows);
}

export async function linkPetToOwner(ownerId: string, petId: string): Promise<Pet> {
	const existing = await selectOne<{ id: string }>(
		`SELECT pets.id
		 FROM pets
		 JOIN owners ON owners.id = $1
		 WHERE pets.id = $2 AND pets.removed_at IS NULL AND owners.removed_at IS NULL
		 LIMIT 1`,
		[ownerId, petId]
	);

	if (!existing) throw new Error('pet_or_owner_not_found');

	const id = createUuidV7();
	const createdAt = nowIso();
	await execute(
		`INSERT INTO pet_owners (id, pet_id, owner_id, sort_order, created_at, updated_at)
		 VALUES ($1, $2, $3, COALESCE((SELECT MAX(sort_order) + 1 FROM pet_owners WHERE pet_id = $2), 0), $4, $4)
		 ON CONFLICT(pet_id, owner_id) DO UPDATE SET removed_at = NULL, updated_at = excluded.updated_at`,
		[id, petId, ownerId, createdAt]
	);

	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');
	return pet;
}

export async function createPet(ownerId: string, input: PetInput): Promise<Pet> {
	const taxonomy = normalizeTaxonomy(input);
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	const petId = createUuidV7();
	const createdAt = nowIso();
	await execute(
		`INSERT INTO pets (id, name, birth_date, species, breed, sex, avatar_hash, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, ${avatarSqlLiteral}, $7, $7)`,
		[petId, requireLimitedText(input.name, FIELD_LIMITS.petName), nullableLimitedText(input.birthDate, FIELD_LIMITS.petBirthDate), taxonomy.species, taxonomy.breed, input.sex, createdAt]
	);

	return linkPetToOwner(ownerId, petId);
}

export async function updatePet(id: string, input: PetInput): Promise<Pet> {
	const taxonomy = normalizeTaxonomy(input);
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	await execute(
		`UPDATE pets
		 SET name = $2,
			birth_date = $3,
			species = $4,
			breed = $5,
			sex = $6,
			avatar_hash = ${avatarSqlLiteral},
			updated_at = $7
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, requireLimitedText(input.name, FIELD_LIMITS.petName), nullableLimitedText(input.birthDate, FIELD_LIMITS.petBirthDate), taxonomy.species, taxonomy.breed, input.sex, nowIso()]
	);

	const pet = await getPet(id);
	if (!pet) throw new Error('pet_not_found');
	return pet;
}

export async function softDeletePet(id: string): Promise<void> {
	const removedAt = nowIso();

	await execute(
		`UPDATE pet_treatments
		 SET removed_at = $2, updated_at = $2
		 WHERE pet_id = $1 AND removed_at IS NULL`,
		[id, removedAt]
	);
	await execute(
		`UPDATE medical_records
		 SET removed_at = $2, updated_at = $2
		 WHERE pet_id = $1 AND removed_at IS NULL`,
		[id, removedAt]
	);
	await execute(
		`UPDATE pets
		 SET removed_at = $2, updated_at = $2
		 WHERE id = $1 AND removed_at IS NULL`,
		[id, removedAt]
	);
}

export async function restorePet(id: string): Promise<void> {
	const updatedAt = nowIso();
	await execute(
		`UPDATE pets
		 SET removed_at = NULL, updated_at = $2
		 WHERE id = $1`,
		[id, updatedAt]
	);
	await execute(
		`UPDATE medical_records
		 SET removed_at = NULL, updated_at = $2
		 WHERE pet_id = $1`,
		[id, updatedAt]
	);
	await execute(
		`UPDATE pet_treatments
		 SET removed_at = NULL, updated_at = $2
		 WHERE pet_id = $1`,
		[id, updatedAt]
	);
}

export async function hardDeletePet(id: string): Promise<void> {
	await softDeletePet(id);
}
