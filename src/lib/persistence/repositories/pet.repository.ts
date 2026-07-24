import type { Pet, PetBreed, PetInput, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import { isPetBreed, isPetBreedForSpecies, isPetSpecies } from '$lib/domain/pet/taxonomy.js';
import { FIELD_LIMITS, assertTextLimit, nullableLimitedText, requireLimitedText } from '$lib/domain/shared/field-limits.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { loadMediaDataMap, mediaHashKey, saveMedia } from '$lib/persistence/repositories/media.repository.js';
import { execute, selectMany, selectOne } from '$lib/persistence/sqlite/client.js';
import { mediaHashToSqlLiteral, normalizeMediaHash } from '$lib/persistence/sqlite/media.js';

interface PetRow {
	id: number;
	name: string;
	birth_date: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	avatar_hash: unknown | null;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

interface PetOwnerRow {
	pet_id: number;
	owner_id: number;
}

async function avatarBytesToHashSqlLiteral(value: Uint8Array | null | undefined): Promise<string> {
	if (!value || value.length === 0) return 'NULL';
	const hash = await saveMedia('user', value);
	return hash ? mediaHashToSqlLiteral(hash) : 'NULL';
}

async function loadPetAvatarBytesByRows(rows: readonly PetRow[]): Promise<Map<string, Uint8Array>> {
	return loadMediaDataMap('user', rows.map((row) => normalizeMediaHash(row.avatar_hash)));
}

function mapPet(row: PetRow, ownerIds: number[] = [], avatarBytes: Uint8Array | null = null): Pet {
	return {
		id: row.id,
		ownerIds,
		name: row.name,
		birthDate: row.birth_date,
		species: row.species,
		breed: row.breed,
		sex: row.sex,
		avatarBytes,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

async function listPetOwnerIdsByPetIds(petIds: number[], includeDeleted = false): Promise<Map<number, number[]>> {
	const uniqueIds = [...new Set(petIds)].filter((id) => Number.isInteger(id) && id > 0);
	const ownerIdsByPetId = new Map<number, number[]>();
	if (uniqueIds.length === 0) return ownerIdsByPetId;

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<PetOwnerRow>(
		`SELECT pet_owners.pet_id, pet_owners.owner_id
		 FROM pet_owners
		 JOIN owners ON owners.id = pet_owners.owner_id
		 WHERE pet_owners.pet_id IN (${placeholders}) ${includeDeleted ? '' : 'AND owners.deleted_at IS NULL'}
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

async function mapPetsWithOwners(rows: PetRow[], includeDeleted = false): Promise<Pet[]> {
	const [ownerIdsByPetId, avatarBytesByHash] = await Promise.all([
		listPetOwnerIdsByPetIds(rows.map((row) => row.id), includeDeleted),
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

export async function listPetsByOwner(ownerId: number, includeDeleted = false): Promise<Pet[]> {
	const rows = await selectMany<PetRow>(
		`SELECT pets.id, pets.name, pets.birth_date, pets.species, pets.breed, pets.sex, pets.avatar_hash, pets.updated_at, pets.deleted_at, pets.purge_after
		 FROM pets
		 JOIN pet_owners ON pet_owners.pet_id = pets.id
		 WHERE pet_owners.owner_id = $1 ${includeDeleted ? '' : 'AND pets.deleted_at IS NULL'}
		 ORDER BY pets.name COLLATE NOCASE`,
		[ownerId]
	);

	return mapPetsWithOwners(rows, includeDeleted);
}

export async function getPet(id: number, includeDeleted = false): Promise<Pet | null> {
	const rows = await selectMany<PetRow>(
		`SELECT id, name, birth_date, species, breed, sex, avatar_hash, updated_at, deleted_at, purge_after
		 FROM pets
		 WHERE id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	if (!rows[0]) return null;
	const [ownerIdsByPetId, avatarBytesByHash] = await Promise.all([
		listPetOwnerIdsByPetIds([rows[0].id], includeDeleted),
		loadPetAvatarBytesByRows([rows[0]])
	]);
	return mapPet(rows[0], ownerIdsByPetId.get(rows[0].id) ?? [], avatarBytesByHash.get(mediaHashKey(rows[0].avatar_hash) ?? '') ?? null);
}

export async function listPetAvatarBytesByIds(petIds: number[]): Promise<Map<number, Uint8Array | null>> {
	const uniqueIds = [...new Set(petIds)].filter((id) => Number.isInteger(id) && id > 0);
	if (uniqueIds.length === 0) return new Map<number, Uint8Array | null>();

	const placeholders = uniqueIds.map((_, index) => `$${index + 1}`).join(', ');
	const rows = await selectMany<{ id: number; avatar_hash: unknown | null }>(
		`SELECT id, avatar_hash
		 FROM pets
		 WHERE id IN (${placeholders}) AND deleted_at IS NULL`,
		uniqueIds
	);

	const avatarBytesByHash = await loadMediaDataMap('user', rows.map((row) => normalizeMediaHash(row.avatar_hash)));
	return new Map(rows.map((row) => [row.id, avatarBytesByHash.get(mediaHashKey(row.avatar_hash) ?? '') ?? null]));
}

export async function searchPetsForOwnerLink(ownerId: number, query: string): Promise<Pet[]> {
	const normalized = query.trim();
	if (normalized.length < 2) return [];

	const term = `%${normalized}%`;
	const rows = await selectMany<PetRow>(
		`SELECT pets.id, pets.name, pets.birth_date, pets.species, pets.breed, pets.sex, pets.avatar_hash, pets.updated_at, pets.deleted_at, pets.purge_after
		 FROM pets
		 WHERE pets.deleted_at IS NULL
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

export async function linkPetToOwner(ownerId: number, petId: number): Promise<Pet> {
	const existing = await selectOne<{ id: number }>(
		`SELECT pets.id
		 FROM pets
		 JOIN owners ON owners.id = $1
		 WHERE pets.id = $2 AND pets.deleted_at IS NULL AND owners.deleted_at IS NULL
		 LIMIT 1`,
		[ownerId, petId]
	);

	if (!existing) throw new Error('pet_or_owner_not_found');

	await execute(
		`INSERT OR IGNORE INTO pet_owners (pet_id, owner_id, sort_order, updated_at)
		 VALUES ($1, $2, COALESCE((SELECT MAX(sort_order) + 1 FROM pet_owners WHERE pet_id = $1), 0), CURRENT_TIMESTAMP)`,
		[petId, ownerId]
	);

	const pet = await getPet(petId);
	if (!pet) throw new Error('pet_not_found');
	return pet;
}

export async function createPet(ownerId: number, input: PetInput): Promise<Pet> {
	const taxonomy = normalizeTaxonomy(input);
	const avatarSqlLiteral = await avatarBytesToHashSqlLiteral(input.avatarBytes);
	const result = await execute(
		`INSERT INTO pets (name, birth_date, species, breed, sex, avatar_hash, updated_at)
		 VALUES ($1, $2, $3, $4, $5, ${avatarSqlLiteral}, CURRENT_TIMESTAMP)`,
		[requireLimitedText(input.name, FIELD_LIMITS.petName), nullableLimitedText(input.birthDate, FIELD_LIMITS.petBirthDate), taxonomy.species, taxonomy.breed, input.sex]
	);

	return linkPetToOwner(ownerId, Number(result.lastInsertId));
}

export async function updatePet(id: number, input: PetInput): Promise<Pet> {
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
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, requireLimitedText(input.name, FIELD_LIMITS.petName), nullableLimitedText(input.birthDate, FIELD_LIMITS.petBirthDate), taxonomy.species, taxonomy.breed, input.sex]
	);

	const pet = await getPet(id);
	if (!pet) throw new Error('pet_not_found');
	return pet;
}

export async function softDeletePet(id: number): Promise<void> {
	const deletedAt = nowIso();
	const purgeAfter = computePurgeAfter(deletedAt);

	await execute(
		`UPDATE pet_treatments
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
	await execute(
		`UPDATE medical_records
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
	await execute(
		`UPDATE pets
		 SET deleted_at = $2, purge_after = $3, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, deletedAt, purgeAfter]
	);
}

export async function restorePet(id: number): Promise<void> {
	await execute(
		`UPDATE pets
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1`,
		[id]
	);
	await execute(
		`UPDATE medical_records
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id = $1`,
		[id]
	);
	await execute(
		`UPDATE pet_treatments
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id = $1`,
		[id]
	);
}

export async function hardDeletePet(id: number): Promise<void> {
	await execute('DELETE FROM pet_treatments WHERE pet_id = $1', [id]);
	await execute('DELETE FROM medical_records WHERE pet_id = $1', [id]);
	await execute('DELETE FROM pet_owners WHERE pet_id = $1', [id]);
	await execute('DELETE FROM pets WHERE id = $1', [id]);
}
