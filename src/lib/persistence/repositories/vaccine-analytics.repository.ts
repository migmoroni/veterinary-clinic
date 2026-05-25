import type {
	VaccineAnalyticsVaccine,
	VaccineHistoryFilter,
	VaccineHistoryPoint,
	VaccineHistoryPeriod,
	VaccineDueFilter,
	VaccineDueFilterMode,
	VaccineStatusItem,
	VaccineStatusKey,
	VaccineStatusSummary
} from '$lib/domain/vaccine/analytics.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import {
	buildVaccineStatus,
	emptyVaccineStatusSummary,
	historyBucket,
	isPlausibleVaccineAppliedAt,
	matchesVaccineDueFilter,
	vaccineDueFilterModes,
	vaccineHistoryPeriods,
	vaccineStatusKeys,
	shiftIsoDate,
	todayIsoDate
} from '$lib/domain/vaccine/analytics.js';
import type { VaccineValidityUnit } from '$lib/domain/vaccine/vaccine.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';
import { listOwnerAssociatedContactsByOwnerIds } from './owner.repository.js';

interface LatestVaccinationRow {
	id: number;
	pet_id: number;
	pet_name: string;
	owner_id: number | null;
	owner_ids: string | null;
	owner_name: string | null;
	owner_contacts: OwnerAssociatedContact[];
	applied_at: string;
	vaccine_name: string;
	vaccine_normalized_name: string;
	validity_value: number;
	validity_unit: VaccineValidityUnit;
}

interface VaccinationHistoryRow {
	applied_at: string;
	vaccine_normalized_name: string;
}

interface AnalyticsVaccineRow {
	vaccine_name: string;
	vaccine_normalized_name: string;
	count: number;
}

export interface VaccineAnalyticsOverview {
	totalTracked: number;
	summary: VaccineStatusSummary;
}

const statusOrder: Record<VaccineStatusKey, number> = {
	current: 0,
	dueSoon: 1,
	dueVerySoon: 2,
	expired: 3,
	overdue: 4
};

const firstOwnerIdSql = `(SELECT owners.id
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

const ownerIdsSql = `(SELECT group_concat(owner_id, ',')
	FROM (
		SELECT owners.id AS owner_id
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.deleted_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

function parseOwnerIds(value: string | null | undefined): number[] {
	return (value ?? '')
		.split(',')
		.map((item) => Number(item))
		.filter((id) => Number.isInteger(id) && id > 0);
}

function normalizeStatus(value: string | null | undefined): VaccineStatusKey {
	return vaccineStatusKeys.includes(value as VaccineStatusKey) ? (value as VaccineStatusKey) : 'expired';
}

function normalizeDueFilterMode(value: string | null | undefined): VaccineDueFilterMode {
	return vaccineDueFilterModes.includes(value as VaccineDueFilterMode) ? (value as VaccineDueFilterMode) : 'status';
}

function normalizeDueDate(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeDueFilter(filter: Partial<VaccineDueFilter> | string | null | undefined): VaccineDueFilter {
	const today = todayIsoDate();
	const defaultStartDate = shiftIsoDate(today, -30);
	const defaultEndDate = shiftIsoDate(today, 30);

	if (typeof filter === 'string') {
		return { mode: 'status', status: normalizeStatus(filter), startDate: defaultStartDate, endDate: defaultEndDate };
	}

	const startDate = normalizeDueDate(filter?.startDate, defaultStartDate);
	const endDate = normalizeDueDate(filter?.endDate, defaultEndDate);

	return {
		mode: normalizeDueFilterMode(filter?.mode),
		status: normalizeStatus(filter?.status),
		startDate: startDate <= endDate ? startDate : endDate,
		endDate: endDate >= startDate ? endDate : startDate
	};
}

function normalizePeriod(value: string | null | undefined): VaccineHistoryPeriod {
	return vaccineHistoryPeriods.includes(value as VaccineHistoryPeriod) ? (value as VaccineHistoryPeriod) : 'month';
}

function normalizeVaccineFilter(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized ? normalized : null;
}

async function listLatestVaccinationRows(): Promise<LatestVaccinationRow[]> {
	const rows = await selectMany<LatestVaccinationRow>(
		`SELECT id,
			pet_id,
			pet_name,
			owner_id,
			owner_ids,
			owner_name,
			applied_at,
			vaccine_name,
			vaccine_normalized_name,
			validity_value,
			validity_unit
		 FROM (
			SELECT
				pet_vaccinations.id,
				pet_vaccinations.pet_id,
				pets.name AS pet_name,
				${firstOwnerIdSql} AS owner_id,
				${ownerIdsSql} AS owner_ids,
				${ownerNamesSql} AS owner_name,
				pet_vaccinations.applied_at,
				pet_vaccinations.vaccine_name,
				pet_vaccinations.vaccine_normalized_name,
				pet_vaccinations.validity_value,
				pet_vaccinations.validity_unit,
				ROW_NUMBER() OVER (
					PARTITION BY pet_vaccinations.pet_id, pet_vaccinations.vaccine_normalized_name
					ORDER BY pet_vaccinations.applied_at DESC, pet_vaccinations.id DESC
				) AS latest_rank
			 FROM pet_vaccinations
			 JOIN pets ON pets.id = pet_vaccinations.pet_id
			 WHERE pet_vaccinations.deleted_at IS NULL
				AND pet_vaccinations.validity_ignored_at IS NULL
				AND pets.deleted_at IS NULL
				AND date(pet_vaccinations.applied_at) IS NOT NULL
				AND pet_vaccinations.applied_at <= date('now', 'localtime')
		 )
		 WHERE latest_rank = 1
		 ORDER BY pet_id, vaccine_normalized_name`
	);

	const latestRows = rows.filter((row) => isPlausibleVaccineAppliedAt(row.applied_at));
	const ownerIdsByRow = new Map<LatestVaccinationRow, number[]>();
	const allOwnerIds: number[] = [];
	for (const row of latestRows) {
		const ownerIds = parseOwnerIds(row.owner_ids);
		ownerIdsByRow.set(row, ownerIds);
		allOwnerIds.push(...ownerIds);
	}

	const contactsByOwnerId = await listOwnerAssociatedContactsByOwnerIds(allOwnerIds);
	return latestRows.map((row) => ({
		...row,
		owner_contacts: (ownerIdsByRow.get(row) ?? []).flatMap((ownerId) => contactsByOwnerId.get(ownerId) ?? [])
	}));
}

function mapStatusItem(row: LatestVaccinationRow, now = new Date()): VaccineStatusItem | null {
	const status = buildVaccineStatus(row.applied_at, row.validity_value, row.validity_unit, now);
	if (!status) return null;

	return {
		ownerId: row.owner_id ?? parseOwnerIds(row.owner_ids)[0] ?? 0,
		ownerName: row.owner_name ?? '',
		ownerContacts: row.owner_contacts,
		petId: row.pet_id,
		petName: row.pet_name,
		petAvatarBytes: null,
		vaccineName: row.vaccine_name,
		vaccineNormalizedName: row.vaccine_normalized_name,
		appliedAt: row.applied_at,
		dueAt: status.dueAt,
		daysUntilDue: status.daysUntilDue,
		status: status.status
	};
}

function sortStatusItems(items: VaccineStatusItem[]): VaccineStatusItem[] {
	return [...items].sort((first, second) => {
		if (first.status !== second.status) return statusOrder[first.status] - statusOrder[second.status];
		if (first.dueAt !== second.dueAt) return first.dueAt.localeCompare(second.dueAt);
		return first.ownerName.localeCompare(second.ownerName) || first.petName.localeCompare(second.petName) || first.vaccineName.localeCompare(second.vaccineName);
	});
}

export async function getVaccineAnalyticsOverview(): Promise<VaccineAnalyticsOverview> {
	const rows = await listLatestVaccinationRows();
	const summary = emptyVaccineStatusSummary();
	let totalTracked = 0;

	for (const row of rows) {
		const item = mapStatusItem(row);
		if (!item) continue;
		summary[item.status] += 1;
		totalTracked += 1;
	}

	return { totalTracked, summary };
}

export async function listVaccineStatusItems(filter: Partial<VaccineDueFilter> | string | null | undefined): Promise<VaccineStatusItem[]> {
	const normalizedFilter = normalizeDueFilter(filter);
	const rows = await listLatestVaccinationRows();
	return sortStatusItems(rows.map((row) => mapStatusItem(row)).filter((item): item is VaccineStatusItem => !!item && matchesVaccineDueFilter(item, normalizedFilter)));
}

export async function listVaccineHistory(filter: Partial<VaccineHistoryFilter>): Promise<VaccineHistoryPoint[]> {
	const period = normalizePeriod(filter.period);
	const vaccineNormalizedName = normalizeVaccineFilter(filter.vaccineNormalizedName);
	const values = vaccineNormalizedName ? [vaccineNormalizedName] : [];
	const rows = await selectMany<VaccinationHistoryRow>(
		`SELECT pet_vaccinations.applied_at, pet_vaccinations.vaccine_normalized_name
		 FROM pet_vaccinations
		 JOIN pets ON pets.id = pet_vaccinations.pet_id
		 WHERE pet_vaccinations.deleted_at IS NULL
			AND pets.deleted_at IS NULL
			${vaccineNormalizedName ? 'AND pet_vaccinations.vaccine_normalized_name = $1' : ''}
		 ORDER BY pet_vaccinations.applied_at ASC`,
		values
	);

	const buckets = new Map<string, VaccineHistoryPoint>();
	for (const row of rows) {
		const bucket = historyBucket(row.applied_at, period);
		if (!bucket) continue;
		const current = buckets.get(bucket.key) ?? bucket;
		current.count += 1;
		buckets.set(bucket.key, current);
	}

	return [...buckets.values()].sort((first, second) => first.key.localeCompare(second.key));
}

export async function listAnalyticsVaccines(): Promise<VaccineAnalyticsVaccine[]> {
	const rows = await selectMany<AnalyticsVaccineRow>(
		`SELECT vaccine_name, vaccine_normalized_name, COUNT(*) AS count
		 FROM (
			SELECT vaccine_name, vaccine_normalized_name, applied_at, id
			FROM pet_vaccinations
			WHERE deleted_at IS NULL
			ORDER BY vaccine_normalized_name, applied_at DESC, id DESC
		 )
		 GROUP BY vaccine_normalized_name
		 ORDER BY vaccine_name COLLATE NOCASE`
	);

	return rows.map((row) => ({ vaccineName: row.vaccine_name, vaccineNormalizedName: row.vaccine_normalized_name, count: row.count }));
}