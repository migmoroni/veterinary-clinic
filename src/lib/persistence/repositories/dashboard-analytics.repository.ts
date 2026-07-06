import type {
	DashboardAgeBandKey,
	DashboardAnalytics,
	DashboardAntiparasiticStatusKey,
	DashboardBreedKey,
	DashboardBucket,
	DashboardNamedBucket,
	DashboardOwnerStudyItem,
	DashboardOwnerStudyPet,
	DashboardPetStudyOwner,
	DashboardPetStudyItem,
	DashboardPetStudyTreatment,
	DashboardPetCountBandKey,
	DashboardSexKey,
	DashboardSpeciesKey,
	DashboardStudyAnalytics,
	DashboardVaccineStatusKey
} from '$lib/domain/dashboard/analytics.js';
import { dashboardAgeBand, dashboardAgeBandYear, dashboardAgeMonthBandKeys } from '$lib/domain/dashboard/age-bands.js';
import type { PetBreed, PetSex, PetSpecies } from '$lib/domain/pet/pet.js';
import type { TreatmentStatusKey } from '$lib/domain/treatment/analytics.js';
import { buildTreatmentStatus, isPlausibleTreatmentAppliedAt } from '$lib/domain/treatment/analytics.js';
import type { TreatmentKind, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';
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

interface LatestTreatmentAnalyticsRow {
	pet_id: number;
	name: string;
	normalized_name: string;
	dose: string;
	applied_at: string;
	validity_value: number;
	validity_unit: TreatmentValidityUnit;
}

const vaccineStatusWeight: Record<DashboardVaccineStatusKey, number> = {
	untracked: 0,
	current: 1,
	dueSoon: 2,
	dueVerySoon: 3,
	expired: 4,
	overdue: 5
};

const antiparasiticStatusWeight: Record<DashboardAntiparasiticStatusKey, number> = {
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

function petCountBand(value: number): DashboardPetCountBandKey {
	if (value <= 0) return 'none';
	if (value === 1) return 'one';
	if (value === 2) return 'two';
	return 'threePlus';
}

function completeAgeBuckets(buckets: Map<DashboardAgeBandKey, number>, maxYear: number | null): void {
	if (maxYear === null && !dashboardAgeMonthBandKeys.some((key) => buckets.has(key))) return;

	for (const key of dashboardAgeMonthBandKeys) buckets.set(key, buckets.get(key) ?? 0);
	if (maxYear === null) return;

	for (let year = 1; year <= maxYear; year += 1) {
		const key = `year:${year}` as DashboardAgeBandKey;
		buckets.set(key, buckets.get(key) ?? 0);
	}
}

function worstVaccineStatus(first: DashboardVaccineStatusKey, second: DashboardVaccineStatusKey): DashboardVaccineStatusKey {
	return vaccineStatusWeight[second] > vaccineStatusWeight[first] ? second : first;
}

function worstAntiparasiticStatus(first: DashboardAntiparasiticStatusKey, second: DashboardAntiparasiticStatusKey): DashboardAntiparasiticStatusKey {
	return antiparasiticStatusWeight[second] > antiparasiticStatusWeight[first] ? second : first;
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
		`SELECT owners.id, owners.name, owner_address.city, owner_address.state, owner_address.country, COUNT(DISTINCT pets.id) AS pet_count
		 FROM owners
		 LEFT JOIN addresses AS owner_address ON owner_address.owner_id = owners.id
		 LEFT JOIN pet_owners ON pet_owners.owner_id = owners.id
		 LEFT JOIN pets ON pets.id = pet_owners.pet_id AND pets.deleted_at IS NULL
		 WHERE owners.deleted_at IS NULL
		 GROUP BY owners.id, owners.name, owner_address.city, owner_address.state, owner_address.country`
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

async function listLatestTreatmentRows(kind: TreatmentKind): Promise<LatestTreatmentAnalyticsRow[]> {
	const rows = await selectMany<LatestTreatmentAnalyticsRow>(
		`SELECT pet_id,
			name,
			normalized_name,
			dose,
			applied_at,
			validity_value,
			validity_unit
		 FROM (
			SELECT pet_treatments.pet_id,
				pet_treatments.name,
				pet_treatments.normalized_name,
				pet_treatments.dose,
				pet_treatments.applied_at,
				pet_treatments.validity_value,
				pet_treatments.validity_unit,
				ROW_NUMBER() OVER (
					PARTITION BY pet_treatments.pet_id, pet_treatments.normalized_name
					ORDER BY pet_treatments.applied_at DESC, pet_treatments.id DESC
				) AS latest_rank
			 FROM pet_treatments
			 JOIN pets ON pets.id = pet_treatments.pet_id
			 WHERE pet_treatments.kind = $1
				AND pet_treatments.deleted_at IS NULL
				AND pet_treatments.validity_ignored_at IS NULL
				AND pets.deleted_at IS NULL
				AND date(pet_treatments.applied_at) IS NOT NULL
				AND pet_treatments.applied_at <= date('now', 'localtime')
		 )
		 WHERE latest_rank = 1
		 ORDER BY pet_id, normalized_name`,
		[kind]
	);

	return rows.filter((row) => isPlausibleTreatmentAppliedAt(row.applied_at));
}

function buildPetVaccineStatusMap(rows: LatestTreatmentAnalyticsRow[]): Map<number, DashboardVaccineStatusKey> {
	const statusByPetId = new Map<number, DashboardVaccineStatusKey>();

	for (const row of rows) {
		const status = buildTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit);
		if (!status) continue;

		const current = statusByPetId.get(row.pet_id) ?? 'untracked';
		statusByPetId.set(row.pet_id, worstVaccineStatus(current, status.status as TreatmentStatusKey));
	}

	return statusByPetId;
}

function buildPetAntiparasiticStatusMap(rows: LatestTreatmentAnalyticsRow[]): Map<number, DashboardAntiparasiticStatusKey> {
	const statusByPetId = new Map<number, DashboardAntiparasiticStatusKey>();

	for (const row of rows) {
		const status = buildTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit);
		if (!status) continue;

		const current = statusByPetId.get(row.pet_id) ?? 'untracked';
		statusByPetId.set(row.pet_id, worstAntiparasiticStatus(current, status.status as TreatmentStatusKey));
	}

	return statusByPetId;
}

function buildPetVaccinesMap(rows: LatestTreatmentAnalyticsRow[]): Map<number, DashboardPetStudyTreatment<DashboardVaccineStatusKey>[]> {
	const vaccinesByPetId = new Map<number, DashboardPetStudyTreatment<DashboardVaccineStatusKey>[]>();

	for (const row of rows) {
		const status = buildTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit);
		if (!status) continue;

		const vaccines = vaccinesByPetId.get(row.pet_id) ?? [];
		vaccines.push({
			normalizedName: row.normalized_name,
			name: row.name,
			dose: row.dose,
			appliedAt: row.applied_at,
			dueAt: status.dueAt,
			daysUntilDue: status.daysUntilDue,
			status: status.status
		});
		vaccinesByPetId.set(row.pet_id, vaccines);
	}

	return vaccinesByPetId;
}

function buildPetAntiparasiticsMap(rows: LatestTreatmentAnalyticsRow[]): Map<number, DashboardPetStudyTreatment<DashboardAntiparasiticStatusKey>[]> {
	const antiparasiticsByPetId = new Map<number, DashboardPetStudyTreatment<DashboardAntiparasiticStatusKey>[]>();

	for (const row of rows) {
		const status = buildTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit);
		if (!status) continue;

		const antiparasitics = antiparasiticsByPetId.get(row.pet_id) ?? [];
		antiparasitics.push({
			normalizedName: row.normalized_name,
			name: row.name,
			dose: row.dose,
			appliedAt: row.applied_at,
			dueAt: status.dueAt,
			daysUntilDue: status.daysUntilDue,
			status: status.status
		});
		antiparasiticsByPetId.set(row.pet_id, antiparasitics);
	}

	return antiparasiticsByPetId;
}

function buildPetAnalytics(pets: PetAnalyticsRow[], statusByPetId: Map<number, DashboardVaccineStatusKey>, antiparasiticStatusByPetId: Map<number, DashboardAntiparasiticStatusKey>) {
	const bySpecies = new Map<DashboardSpeciesKey, number>();
	const byBreed = new Map<DashboardBreedKey, number>();
	const bySex = new Map<DashboardSexKey, number>();
	const byAge = new Map<DashboardAgeBandKey, number>();
	const byVaccineStatus = new Map<DashboardVaccineStatusKey, number>();
	const byAntiparasiticStatus = new Map<DashboardAntiparasiticStatusKey, number>();
	let maxYear: number | null = null;

	for (const pet of pets) {
		const age = dashboardAgeBand(pet.birth_date);
		const ageYear = dashboardAgeBandYear(age);
		if (ageYear !== null) maxYear = Math.max(maxYear ?? ageYear, ageYear);

		incrementBucket(bySpecies, pet.species ?? 'unknown');
		incrementBucket(byBreed, pet.breed ?? 'unknown');
		incrementBucket(bySex, pet.sex ?? 'unknown');
		incrementBucket(byAge, age);
		incrementBucket(byVaccineStatus, statusByPetId.get(pet.id) ?? 'untracked');
		incrementBucket(byAntiparasiticStatus, antiparasiticStatusByPetId.get(pet.id) ?? 'untracked');
	}
	completeAgeBuckets(byAge, maxYear);

	return {
		total: pets.length,
		bySpecies: toBuckets(bySpecies),
		byBreed: toBuckets(byBreed),
		bySex: toBuckets(bySex),
		byAge: toBuckets(byAge),
		byVaccineStatus: toBuckets(byVaccineStatus),
		byAntiparasiticStatus: toBuckets(byAntiparasiticStatus)
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

function buildOwnerAnalytics(
	owners: OwnerAnalyticsRow[],
	petOwnerRows: PetOwnerAnalyticsRow[],
	statusByPetId: Map<number, DashboardVaccineStatusKey>,
	antiparasiticStatusByPetId: Map<number, DashboardAntiparasiticStatusKey>
) {
	const byLocation = new Map<string, { label: string | null; count: number }>();
	const byPetCount = new Map<DashboardPetCountBandKey, number>();
	const byPetVaccineStatus = new Map<DashboardVaccineStatusKey, number>();
	const byPetAntiparasiticStatus = new Map<DashboardAntiparasiticStatusKey, number>();
	const petIdsByOwnerId = buildOwnerPetMap(petOwnerRows);
	const totalPetsLinked = owners.reduce((total, owner) => total + owner.pet_count, 0);

	for (const owner of owners) {
		const label = locationLabel(owner);
		incrementNamedBucket(byLocation, label?.toLocaleLowerCase() ?? 'unknown', label);
		incrementBucket(byPetCount, petCountBand(owner.pet_count));

		let ownerStatus: DashboardVaccineStatusKey = 'untracked';
		let ownerAntiparasiticStatus: DashboardAntiparasiticStatusKey = 'untracked';
		for (const petId of petIdsByOwnerId.get(owner.id) ?? []) {
			const petStatus = statusByPetId.get(petId) ?? 'untracked';
			ownerStatus = worstVaccineStatus(ownerStatus, petStatus);

			const petAntiparasiticStatus = antiparasiticStatusByPetId.get(petId) ?? 'untracked';
			ownerAntiparasiticStatus = worstAntiparasiticStatus(ownerAntiparasiticStatus, petAntiparasiticStatus);
		}
		incrementBucket(byPetVaccineStatus, ownerStatus);
		incrementBucket(byPetAntiparasiticStatus, ownerAntiparasiticStatus);
	}

	return {
		total: owners.length,
		averagePetsPerOwner: owners.length > 0 ? Math.round((totalPetsLinked / owners.length) * 10) / 10 : 0,
		byLocation: toNamedBuckets(byLocation),
		byPetCount: toBuckets(byPetCount),
		byPetVaccineStatus: toBuckets(byPetVaccineStatus),
		byPetAntiparasiticStatus: toBuckets(byPetAntiparasiticStatus)
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
		avatarBytes: pet.avatarBytes,
		species: pet.species,
		breed: pet.breed,
		sex: pet.sex,
		age: pet.age,
		vaccineStatus: pet.vaccineStatus,
		antiparasiticStatus: pet.antiparasiticStatus,
		vaccineNormalizedNames: pet.vaccineNormalizedNames,
		vaccineNames: pet.vaccineNames,
		vaccines: pet.vaccines,
		antiparasiticNormalizedNames: pet.antiparasiticNormalizedNames,
		antiparasiticNames: pet.antiparasiticNames,
		antiparasitics: pet.antiparasitics
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
	vaccinesByPetId: Map<number, DashboardPetStudyTreatment<DashboardVaccineStatusKey>[]>,
	antiparasiticStatusByPetId: Map<number, DashboardAntiparasiticStatusKey>,
	antiparasiticsByPetId: Map<number, DashboardPetStudyTreatment<DashboardAntiparasiticStatusKey>[]>
): DashboardStudyAnalytics {
	const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
	const ownerIdsByPetId = buildPetOwnerMap(petOwnerRows);
	const petIdsByOwnerId = buildOwnerPetMap(petOwnerRows);
	const vaccinesBucket = new Map<string, { label: string | null; count: number }>();
	const antiparasiticsBucket = new Map<string, { label: string | null; count: number }>();
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
		const antiparasitics = antiparasiticsByPetId.get(pet.id) ?? [];
		const vaccineNormalizedNames: string[] = [];
		const vaccineNames: string[] = [];
		const antiparasiticNormalizedNames: string[] = [];
		const antiparasiticNames: string[] = [];

		for (const vaccine of vaccines) {
			if (!vaccineNormalizedNames.includes(vaccine.normalizedName)) vaccineNormalizedNames.push(vaccine.normalizedName);
			addUnique(vaccineNames, vaccine.name);
			incrementNamedBucket(vaccinesBucket, vaccine.normalizedName, vaccine.name);
		}

		for (const antiparasitic of antiparasitics) {
			if (!antiparasiticNormalizedNames.includes(antiparasitic.normalizedName)) antiparasiticNormalizedNames.push(antiparasitic.normalizedName);
			addUnique(antiparasiticNames, antiparasitic.name);
			incrementNamedBucket(antiparasiticsBucket, antiparasitic.normalizedName, antiparasitic.name);
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
			avatarBytes: null,
			species: pet.species ?? 'unknown',
			breed: pet.breed ?? 'unknown',
			sex: pet.sex ?? 'unknown',
			age: dashboardAgeBand(pet.birth_date),
			vaccineStatus: statusByPetId.get(pet.id) ?? 'untracked',
			antiparasiticStatus: antiparasiticStatusByPetId.get(pet.id) ?? 'untracked',
			vaccineNormalizedNames,
			vaccineNames,
			vaccines,
			antiparasiticNormalizedNames,
			antiparasiticNames,
			antiparasitics,
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
		vaccines: toNamedBuckets(vaccinesBucket),
		antiparasitics: toNamedBuckets(antiparasiticsBucket),
		ownerCities: toNamedBuckets(ownerCities),
		ownerLocations: toNamedBuckets(ownerLocations)
	};
}

export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
	const [pets, owners, petOwnerRows, latestVaccinationRows, latestAntiparasiticRows] = await Promise.all([listPetRows(), listOwnerRows(), listPetOwnerRows(), listLatestTreatmentRows('vaccine'), listLatestTreatmentRows('antiparasitic')]);
	const statusByPetId = buildPetVaccineStatusMap(latestVaccinationRows);
	const vaccinesByPetId = buildPetVaccinesMap(latestVaccinationRows);
	const antiparasiticStatusByPetId = buildPetAntiparasiticStatusMap(latestAntiparasiticRows);
	const antiparasiticsByPetId = buildPetAntiparasiticsMap(latestAntiparasiticRows);

	return {
		pets: buildPetAnalytics(pets, statusByPetId, antiparasiticStatusByPetId),
		owners: buildOwnerAnalytics(owners, petOwnerRows, statusByPetId, antiparasiticStatusByPetId),
		study: buildStudyAnalytics(pets, owners, petOwnerRows, statusByPetId, vaccinesByPetId, antiparasiticStatusByPetId, antiparasiticsByPetId)
	};
}
