import type {
	DashboardAgeBandKey,
	DashboardAnalytics,
	DashboardBreedKey,
	DashboardBucket,
	DashboardNamedBucket,
	DashboardOwnerStudyItem,
	DashboardOwnerStudyPet,
	DashboardPetStudyOwner,
	DashboardPetStudyItem,
	DashboardPetStudyVaccine,
	DashboardPetCountBandKey,
	DashboardSexKey,
	DashboardSpeciesKey,
	DashboardStudyAnalytics,
	DashboardVaccineStatusKey
} from '$lib/domain/dashboard/analytics.js';
import type { PetBreed, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import type { VaccineStatusKey } from '$lib/domain/vaccine/analytics.js';
import { buildVaccineStatus, isPlausibleVaccineAppliedAt } from '$lib/domain/vaccine/analytics.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';

interface PetAnalyticsRow {
	id: number;
	name: string;
	birth_date: string | null;
	species: PetSpecies | null;
	breed: PetBreed | null;
	sex: PetSex;
}

interface OwnerAnalyticsRow {
	id: number;
	name: string;
	city: string | null;
	state: string | null;
	country: string | null;
	pet_count: number;
}

interface PetOwnerAnalyticsRow {
	pet_id: number;
	owner_id: number;
}

interface LatestVaccinationAnalyticsRow {
	pet_id: number;
	vaccine_preset_id: number;
	vaccine_name: string;
	applied_at: string;
	validity_months: number;
}

const vaccineStatusWeight: Record<DashboardVaccineStatusKey, number> = {
	untracked: 0,
	current: 1,
	dueSoon: 2,
	dueVerySoon: 3,
	expired: 4,
	overdue: 5
};

function incrementBucket<Key extends string>(buckets: Map<Key, number>, key: Key, amount = 1): void {
	buckets.set(key, (buckets.get(key) ?? 0) + amount);
}

function toBuckets<Key extends string>(buckets: Map<Key, number>): DashboardBucket<Key>[] {
	return [...buckets.entries()]
		.map(([key, count]) => ({ key, count }))
		.sort((first, second) => second.count - first.count || first.key.localeCompare(second.key));
}

function toNamedBuckets(buckets: Map<string, { label: string | null; count: number }>): DashboardNamedBucket[] {
	return [...buckets.entries()]
		.map(([key, value]) => ({ key, label: value.label, count: value.count }))
		.sort((first, second) => second.count - first.count || (first.label ?? '').localeCompare(second.label ?? ''));
}

function incrementNamedBucket(buckets: Map<string, { label: string | null; count: number }>, key: string, label: string | null): void {
	const current = buckets.get(key) ?? { label, count: 0 };
	current.count += 1;
	buckets.set(key, current);
}

function parseIsoDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
	const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);
	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

	return { year, month, day };
}

function ageInYears(value: string | null | undefined, now = new Date()): number | null {
	const parsed = parseIsoDate(value);
	if (!parsed) return null;

	let years = now.getFullYear() - parsed.year;
	const birthdayPassed = now.getMonth() + 1 > parsed.month || (now.getMonth() + 1 === parsed.month && now.getDate() >= parsed.day);
	if (!birthdayPassed) years -= 1;

	return years >= 0 ? years : null;
}

function ageBand(value: string | null | undefined): DashboardAgeBandKey {
	const years = ageInYears(value);
	if (years === null) return 'unknown';
	if (years < 1) return 'underOne';
	if (years <= 3) return 'oneToThree';
	if (years <= 7) return 'fourToSeven';
	return 'eightPlus';
}

function petCountBand(value: number): DashboardPetCountBandKey {
	if (value <= 0) return 'none';
	if (value === 1) return 'one';
	if (value === 2) return 'two';
	return 'threePlus';
}

function worstVaccineStatus(first: DashboardVaccineStatusKey, second: DashboardVaccineStatusKey): DashboardVaccineStatusKey {
	return vaccineStatusWeight[second] > vaccineStatusWeight[first] ? second : first;
}

function locationLabel(owner: OwnerAnalyticsRow): string | null {
	const parts = [owner.city, owner.state, owner.country].map((part) => part?.trim()).filter((part): part is string => !!part);
	return parts.length > 0 ? parts.join(' / ') : null;
}

function locationKey(label: string | null): string {
	return label?.toLocaleLowerCase() ?? 'unknown';
}

function cityLabel(owner: OwnerAnalyticsRow): string | null {
	return owner.city?.trim() || null;
}

async function listPetRows(): Promise<PetAnalyticsRow[]> {
	return selectMany<PetAnalyticsRow>(
		`SELECT id, name, birth_date, species, breed, sex
		 FROM pets
		 WHERE deleted_at IS NULL`
	);
}

async function listOwnerRows(): Promise<OwnerAnalyticsRow[]> {
	return selectMany<OwnerAnalyticsRow>(
		`SELECT owners.id, owners.name, owners.city, owners.state, owners.country, COUNT(DISTINCT pets.id) AS pet_count
		 FROM owners
		 LEFT JOIN pet_owners ON pet_owners.owner_id = owners.id
		 LEFT JOIN pets ON pets.id = pet_owners.pet_id AND pets.deleted_at IS NULL
		 WHERE owners.deleted_at IS NULL
		 GROUP BY owners.id, owners.name, owners.city, owners.state, owners.country`
	);
}

async function listPetOwnerRows(): Promise<PetOwnerAnalyticsRow[]> {
	return selectMany<PetOwnerAnalyticsRow>(
		`SELECT pet_owners.pet_id, pet_owners.owner_id
		 FROM pet_owners
		 JOIN pets ON pets.id = pet_owners.pet_id
		 JOIN owners ON owners.id = pet_owners.owner_id
		 WHERE pets.deleted_at IS NULL AND owners.deleted_at IS NULL`
	);
}

async function listLatestVaccinationRows(): Promise<LatestVaccinationAnalyticsRow[]> {
	const rows = await selectMany<LatestVaccinationAnalyticsRow>(
		`SELECT pet_vaccinations.pet_id, pet_vaccinations.vaccine_preset_id, vaccine_presets.name AS vaccine_name, pet_vaccinations.applied_at, vaccine_presets.validity_months
		 FROM pet_vaccinations
		 JOIN pets ON pets.id = pet_vaccinations.pet_id
		 JOIN vaccine_presets ON vaccine_presets.id = pet_vaccinations.vaccine_preset_id
		 WHERE pet_vaccinations.deleted_at IS NULL
			AND pet_vaccinations.validity_ignored_at IS NULL
			AND pets.deleted_at IS NULL
		 ORDER BY pet_vaccinations.pet_id, pet_vaccinations.vaccine_preset_id, pet_vaccinations.applied_at DESC, pet_vaccinations.id DESC`
	);

	const latest = new Map<string, LatestVaccinationAnalyticsRow>();
	for (const row of rows) {
		if (!isPlausibleVaccineAppliedAt(row.applied_at)) continue;

		const key = `${row.pet_id}:${row.vaccine_preset_id}`;
		if (!latest.has(key)) latest.set(key, row);
	}

	return [...latest.values()];
}

function buildPetVaccineStatusMap(rows: LatestVaccinationAnalyticsRow[]): Map<number, DashboardVaccineStatusKey> {
	const statusByPetId = new Map<number, DashboardVaccineStatusKey>();

	for (const row of rows) {
		const status = buildVaccineStatus(row.applied_at, row.validity_months);
		if (!status) continue;

		const current = statusByPetId.get(row.pet_id) ?? 'untracked';
		statusByPetId.set(row.pet_id, worstVaccineStatus(current, status.status as VaccineStatusKey));
	}

	return statusByPetId;
}

function buildPetVaccinesMap(rows: LatestVaccinationAnalyticsRow[]): Map<number, DashboardPetStudyVaccine[]> {
	const vaccinesByPetId = new Map<number, DashboardPetStudyVaccine[]>();

	for (const row of rows) {
		const status = buildVaccineStatus(row.applied_at, row.validity_months);
		if (!status) continue;

		const vaccines = vaccinesByPetId.get(row.pet_id) ?? [];
		vaccines.push({ presetId: row.vaccine_preset_id, presetName: row.vaccine_name, appliedAt: row.applied_at, dueAt: status.dueAt, daysUntilDue: status.daysUntilDue, status: status.status });
		vaccinesByPetId.set(row.pet_id, vaccines);
	}

	return vaccinesByPetId;
}

function buildPetAnalytics(pets: PetAnalyticsRow[], statusByPetId: Map<number, DashboardVaccineStatusKey>) {
	const bySpecies = new Map<DashboardSpeciesKey, number>();
	const byBreed = new Map<DashboardBreedKey, number>();
	const bySex = new Map<DashboardSexKey, number>();
	const byAge = new Map<DashboardAgeBandKey, number>();
	const byVaccineStatus = new Map<DashboardVaccineStatusKey, number>();

	for (const pet of pets) {
		incrementBucket(bySpecies, pet.species ?? 'unknown');
		incrementBucket(byBreed, pet.breed ?? 'unknown');
		incrementBucket(bySex, pet.sex ?? 'unknown');
		incrementBucket(byAge, ageBand(pet.birth_date));
		incrementBucket(byVaccineStatus, statusByPetId.get(pet.id) ?? 'untracked');
	}

	return {
		total: pets.length,
		bySpecies: toBuckets(bySpecies),
		byBreed: toBuckets(byBreed),
		bySex: toBuckets(bySex),
		byAge: toBuckets(byAge),
		byVaccineStatus: toBuckets(byVaccineStatus)
	};
}

function buildOwnerPetMap(rows: PetOwnerAnalyticsRow[]): Map<number, number[]> {
	const petIdsByOwnerId = new Map<number, number[]>();
	for (const row of rows) {
		const petIds = petIdsByOwnerId.get(row.owner_id) ?? [];
		petIds.push(row.pet_id);
		petIdsByOwnerId.set(row.owner_id, petIds);
	}

	return petIdsByOwnerId;
}

function buildOwnerAnalytics(owners: OwnerAnalyticsRow[], petOwnerRows: PetOwnerAnalyticsRow[], statusByPetId: Map<number, DashboardVaccineStatusKey>) {
	const byLocation = new Map<string, { label: string | null; count: number }>();
	const byPetCount = new Map<DashboardPetCountBandKey, number>();
	const byPetVaccineStatus = new Map<DashboardVaccineStatusKey, number>();
	const petIdsByOwnerId = buildOwnerPetMap(petOwnerRows);
	const totalPetsLinked = owners.reduce((total, owner) => total + owner.pet_count, 0);

	for (const owner of owners) {
		const label = locationLabel(owner);
		incrementNamedBucket(byLocation, label?.toLocaleLowerCase() ?? 'unknown', label);
		incrementBucket(byPetCount, petCountBand(owner.pet_count));

		let ownerStatus: DashboardVaccineStatusKey = 'untracked';
		for (const petId of petIdsByOwnerId.get(owner.id) ?? []) {
			const petStatus = statusByPetId.get(petId) ?? 'untracked';
			ownerStatus = worstVaccineStatus(ownerStatus, petStatus);
		}
		incrementBucket(byPetVaccineStatus, ownerStatus);
	}

	return {
		total: owners.length,
		averagePetsPerOwner: owners.length > 0 ? Math.round((totalPetsLinked / owners.length) * 10) / 10 : 0,
		byLocation: toNamedBuckets(byLocation),
		byPetCount: toBuckets(byPetCount),
		byPetVaccineStatus: toBuckets(byPetVaccineStatus)
	};
}

function buildPetOwnerMap(rows: PetOwnerAnalyticsRow[]): Map<number, number[]> {
	const ownerIdsByPetId = new Map<number, number[]>();
	for (const row of rows) {
		const ownerIds = ownerIdsByPetId.get(row.pet_id) ?? [];
		ownerIds.push(row.owner_id);
		ownerIdsByPetId.set(row.pet_id, ownerIds);
	}

	return ownerIdsByPetId;
}

function toOwnerStudyPet(pet: DashboardPetStudyItem): DashboardOwnerStudyPet {
	return {
		id: pet.id,
		name: pet.name,
		species: pet.species,
		breed: pet.breed,
		sex: pet.sex,
		age: pet.age,
		vaccineStatus: pet.vaccineStatus,
		vaccinePresetIds: pet.vaccinePresetIds,
		vaccinePresetNames: pet.vaccinePresetNames,
		vaccines: pet.vaccines
	};
}

function addUnique(values: string[], value: string): void {
	if (!values.includes(value)) values.push(value);
}

function buildStudyAnalytics(
	pets: PetAnalyticsRow[],
	owners: OwnerAnalyticsRow[],
	petOwnerRows: PetOwnerAnalyticsRow[],
	statusByPetId: Map<number, DashboardVaccineStatusKey>,
	vaccinesByPetId: Map<number, DashboardPetStudyVaccine[]>
): DashboardStudyAnalytics {
	const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
	const ownerIdsByPetId = buildPetOwnerMap(petOwnerRows);
	const petIdsByOwnerId = buildOwnerPetMap(petOwnerRows);
	const vaccinePresets = new Map<string, { label: string | null; count: number }>();
	const ownerCities = new Map<string, { label: string | null; count: number }>();
	const ownerLocations = new Map<string, { label: string | null; count: number }>();
	const studyPets: DashboardPetStudyItem[] = [];
	const studyOwners: DashboardOwnerStudyItem[] = [];

	for (const owner of owners) {
		const city = cityLabel(owner);
		const location = locationLabel(owner);
		incrementNamedBucket(ownerCities, locationKey(city), city);
		incrementNamedBucket(ownerLocations, locationKey(location), location);
	}

	for (const pet of pets) {
		const owners: DashboardPetStudyOwner[] = [];
		const ownerCityKeys: string[] = [];
		const ownerCityLabels: string[] = [];
		const ownerLocationKeys: string[] = [];
		const ownerLocationLabels: string[] = [];
		const vaccines = vaccinesByPetId.get(pet.id) ?? [];
		const vaccinePresetIds: number[] = [];
		const vaccinePresetNames: string[] = [];

		for (const vaccine of vaccines) {
			const presetKey = String(vaccine.presetId);
			if (!vaccinePresetIds.includes(vaccine.presetId)) vaccinePresetIds.push(vaccine.presetId);
			addUnique(vaccinePresetNames, vaccine.presetName);
			incrementNamedBucket(vaccinePresets, presetKey, vaccine.presetName);
		}

		for (const ownerId of ownerIdsByPetId.get(pet.id) ?? []) {
			const owner = ownersById.get(ownerId);
			if (!owner) continue;

			const city = cityLabel(owner);
			const cityKey = locationKey(city);
			addUnique(ownerCityKeys, cityKey);
			if (city) addUnique(ownerCityLabels, city);

			const location = locationLabel(owner);
			const fullLocationKey = locationKey(location);
			addUnique(ownerLocationKeys, fullLocationKey);
			if (location) addUnique(ownerLocationLabels, location);

			owners.push({
				id: owner.id,
				name: owner.name,
				cityKey,
				cityLabel: city,
				locationKey: fullLocationKey,
				locationLabel: location
			});
		}

		if (ownerCityKeys.length === 0) ownerCityKeys.push('unknown');
		if (ownerLocationKeys.length === 0) ownerLocationKeys.push('unknown');

		studyPets.push({
			id: pet.id,
			name: pet.name,
			species: pet.species ?? 'unknown',
			breed: pet.breed ?? 'unknown',
			sex: pet.sex ?? 'unknown',
			age: ageBand(pet.birth_date),
			vaccineStatus: statusByPetId.get(pet.id) ?? 'untracked',
			vaccinePresetIds,
			vaccinePresetNames,
			vaccines,
			owners,
			ownerCityKeys,
			ownerCityLabels,
			ownerLocationKeys,
			ownerLocationLabels
		});
	}

	const studyPetsById = new Map(studyPets.map((pet) => [pet.id, pet]));
	for (const owner of owners) {
		const city = cityLabel(owner);
		const location = locationLabel(owner);
		const pets = (petIdsByOwnerId.get(owner.id) ?? [])
			.map((petId) => studyPetsById.get(petId))
			.filter((pet): pet is DashboardPetStudyItem => !!pet)
			.map(toOwnerStudyPet);

		studyOwners.push({
			id: owner.id,
			name: owner.name,
			cityKey: locationKey(city),
			cityLabel: city,
			locationKey: locationKey(location),
			locationLabel: location,
			petCount: pets.length,
			petNames: pets.map((pet) => pet.name),
			pets
		});
	}

	return {
		pets: studyPets,
		owners: studyOwners,
		vaccinePresets: toNamedBuckets(vaccinePresets),
		ownerCities: toNamedBuckets(ownerCities),
		ownerLocations: toNamedBuckets(ownerLocations)
	};
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
	const [pets, owners, petOwnerRows, latestVaccinationRows] = await Promise.all([listPetRows(), listOwnerRows(), listPetOwnerRows(), listLatestVaccinationRows()]);
	const statusByPetId = buildPetVaccineStatusMap(latestVaccinationRows);
	const vaccinesByPetId = buildPetVaccinesMap(latestVaccinationRows);

	return {
		pets: buildPetAnalytics(pets, statusByPetId),
		owners: buildOwnerAnalytics(owners, petOwnerRows, statusByPetId),
		study: buildStudyAnalytics(pets, owners, petOwnerRows, statusByPetId, vaccinesByPetId)
	};
}