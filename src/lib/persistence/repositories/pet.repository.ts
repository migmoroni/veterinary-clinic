import type { Pet, PetBreed, PetInput, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import { isPetBreedForSpecies } from '$lib/domain/pet/taxonomy.js';
import { computePurgeAfter, nowIso } from '$lib/domain/shared/time.js';
import { execute, selectMany } from '$lib/persistence/sqlite/client.js';

interface PetRow {
	id: number;
	owner_id: number;
	name: string;
	birth_date: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
	updated_at: string | null;
	deleted_at: string | null;
	purge_after: string | null;
}

function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

function mapPet(row: PetRow): Pet {
	return {
		id: row.id,
		ownerId: row.owner_id,
		name: row.name,
		birthDate: row.birth_date,
		species: row.species,
		breed: row.breed,
		sex: row.sex,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		purgeAfter: row.purge_after
	};
}

function normalizeTaxonomy(input: PetInput): { species: PetSpecies | null; breed: PetBreed | null } {
	if (!input.species) return { species: null, breed: null };
	if (input.breed && !isPetBreedForSpecies(input.species, input.breed)) throw new Error('pet_taxonomy_invalid');

	return { species: input.species, breed: input.breed };
}

export async function listPetsByOwner(ownerId: number, includeDeleted = false): Promise<Pet[]> {
	const rows = await selectMany<PetRow>(
		`SELECT id, owner_id, name, birth_date, species, breed, sex, updated_at, deleted_at, purge_after
		 FROM pets
		 WHERE owner_id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 ORDER BY name COLLATE NOCASE`,
		[ownerId]
	);

	return rows.map(mapPet);
}

export async function getPet(id: number, includeDeleted = false): Promise<Pet | null> {
	const rows = await selectMany<PetRow>(
		`SELECT id, owner_id, name, birth_date, species, breed, sex, updated_at, deleted_at, purge_after
		 FROM pets
		 WHERE id = $1 ${includeDeleted ? '' : 'AND deleted_at IS NULL'}
		 LIMIT 1`,
		[id]
	);

	return rows[0] ? mapPet(rows[0]) : null;
}

export async function createPet(ownerId: number, input: PetInput): Promise<Pet> {
	const taxonomy = normalizeTaxonomy(input);
	const result = await execute(
		`INSERT INTO pets (owner_id, name, birth_date, species, breed, sex, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
		[ownerId, input.name.trim(), nullable(input.birthDate), taxonomy.species, taxonomy.breed, input.sex]
	);

	const pet = await getPet(Number(result.lastInsertId));
	if (!pet) throw new Error('pet_create_failed');
	return pet;
}

export async function updatePet(id: number, input: PetInput): Promise<Pet> {
	const taxonomy = normalizeTaxonomy(input);
	await execute(
		`UPDATE pets
		 SET name = $2,
			birth_date = $3,
			species = $4,
			breed = $5,
			sex = $6,
			updated_at = CURRENT_TIMESTAMP
		 WHERE id = $1 AND deleted_at IS NULL`,
		[id, input.name.trim(), nullable(input.birthDate), taxonomy.species, taxonomy.breed, input.sex]
	);

	const pet = await getPet(id);
	if (!pet) throw new Error('pet_not_found');
	return pet;
}

export async function softDeletePet(id: number): Promise<void> {
	const deletedAt = nowIso();
	const purgeAfter = computePurgeAfter(deletedAt);

	await execute(
		`UPDATE pet_vaccinations
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
		`UPDATE owners
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE id = (SELECT owner_id FROM pets WHERE id = $1)`,
		[id]
	);
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
		`UPDATE pet_vaccinations
		 SET deleted_at = NULL, purge_after = NULL, updated_at = CURRENT_TIMESTAMP
		 WHERE pet_id = $1`,
		[id]
	);
}

export async function hardDeletePet(id: number): Promise<void> {
	await execute('DELETE FROM pet_vaccinations WHERE pet_id = $1', [id]);
	await execute('DELETE FROM medical_records WHERE pet_id = $1', [id]);
	await execute('DELETE FROM pets WHERE id = $1', [id]);
}