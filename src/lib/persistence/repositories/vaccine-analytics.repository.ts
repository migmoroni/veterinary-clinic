import type {
	VaccineHistoryFilter,
	VaccineHistoryPoint,
	VaccineHistoryPeriod,
	VaccineDueFilter,
	VaccineDueFilterMode,
	VaccineStatusItem,
	VaccineStatusKey,
	VaccineStatusSummary
} from '$lib/domain/vaccine/analytics.js';
import type { OwnerContact } from '$lib/domain/owner/owner.js';
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
import type { VaccinePreset } from '$lib/domain/vaccine/vaccine.js';
import { normalizeByteArray } from '$lib/domain/shared/binary.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';
import { listOwnerContactsByOwnerIds } from './owner.repository.js';

interface LatestVaccinationRow {
	id: number;
	pet_id: number;
	pet_name: string;
	pet_avatar_blob: unknown | null;
	owner_id: number | null;
	owner_ids: string | null;
	owner_name: string | null;
	owner_contacts: OwnerContact[];
	applied_at: string;
	vaccine_preset_id: number;
	vaccine_name: string;
	validity_months: number;
}

interface VaccinationHistoryRow {
	applied_at: string;
	vaccine_preset_id: number;
}

interface VaccinePresetRow {
	id: number;
	name: string;
	normalized_name: string;
	validity_months: number;
	updated_at: string | null;
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

function mapPreset(row: VaccinePresetRow): VaccinePreset {
	return {
		id: row.id,
		name: row.name,
		normalizedName: row.normalized_name,
		validityMonths: row.validity_months,
		updatedAt: row.updated_at
	};
}

function normalizeStatus(value: string | null | undefined): VaccineStatusKey {
	return vaccineStatusKeys.includes(value as VaccineStatusKey) ? (value as VaccineStatusKey) : 'expired';
}

function normalizeDueFilterMode(value: string | null | undefined): VaccineDueFilterMode {
	return vaccineDueFilterModes.includes(value as VaccineDueFilterMode) ? (value as VaccineDueFilterMode) : 'preset';
}

function normalizeDueDate(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeDueFilter(filter: Partial<VaccineDueFilter> | string | null | undefined): VaccineDueFilter {
	const today = todayIsoDate();
	const defaultStartDate = shiftIsoDate(today, -30);
	const defaultEndDate = shiftIsoDate(today, 30);

	if (typeof filter === 'string') {
		return { mode: 'preset', status: normalizeStatus(filter), startDate: defaultStartDate, endDate: defaultEndDate };
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

async function listLatestVaccinationRows(): Promise<LatestVaccinationRow[]> {
	const rows = await selectMany<LatestVaccinationRow>(
		`SELECT
			pet_vaccinations.id,
			pet_vaccinations.pet_id,
			pets.name AS pet_name,
			pets.avatar_blob AS pet_avatar_blob,
			${firstOwnerIdSql} AS owner_id,
			${ownerIdsSql} AS owner_ids,
			${ownerNamesSql} AS owner_name,
			pet_vaccinations.applied_at,
			pet_vaccinations.vaccine_preset_id,
			vaccine_presets.name AS vaccine_name,
			vaccine_presets.validity_months
		 FROM pet_vaccinations
		 JOIN pets ON pets.id = pet_vaccinations.pet_id
		 JOIN vaccine_presets ON vaccine_presets.id = pet_vaccinations.vaccine_preset_id
		 WHERE pet_vaccinations.deleted_at IS NULL
			AND pet_vaccinations.validity_ignored_at IS NULL
			AND pets.deleted_at IS NULL
		 ORDER BY pet_vaccinations.pet_id, pet_vaccinations.vaccine_preset_id, pet_vaccinations.applied_at DESC, pet_vaccinations.id DESC`
	);

	const latest = new Map<string, LatestVaccinationRow>();
	for (const row of rows) {
		if (!isPlausibleVaccineAppliedAt(row.applied_at)) continue;
		const key = `${row.pet_id}:${row.vaccine_preset_id}`;
		if (!latest.has(key)) latest.set(key, row);
	}

	const latestRows = [...latest.values()];
	const ownerIdsByRow = new Map<LatestVaccinationRow, number[]>();
	const allOwnerIds: number[] = [];
	for (const row of latestRows) {
		const ownerIds = parseOwnerIds(row.owner_ids);
		ownerIdsByRow.set(row, ownerIds);
		allOwnerIds.push(...ownerIds);
	}

	const contactsByOwnerId = await listOwnerContactsByOwnerIds(allOwnerIds);
	return latestRows.map((row) => ({
		...row,
		owner_contacts: (ownerIdsByRow.get(row) ?? []).flatMap((ownerId) => contactsByOwnerId.get(ownerId) ?? [])
	}));
}

function mapStatusItem(row: LatestVaccinationRow, now = new Date()): VaccineStatusItem | null {
	const status = buildVaccineStatus(row.applied_at, row.validity_months, now);
	if (!status) return null;

	return {
		ownerId: row.owner_id ?? parseOwnerIds(row.owner_ids)[0] ?? 0,
		ownerName: row.owner_name ?? '',
		ownerContacts: row.owner_contacts,
		petId: row.pet_id,
		petName: row.pet_name,
		petAvatarBytes: normalizeByteArray(row.pet_avatar_blob),
		vaccinePresetId: row.vaccine_preset_id,
		vaccineName: row.vaccine_name,
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
	const vaccinePresetId = Number(filter.vaccinePresetId) > 0 ? Number(filter.vaccinePresetId) : null;
	const values = vaccinePresetId ? [vaccinePresetId] : [];
	const rows = await selectMany<VaccinationHistoryRow>(
		`SELECT pet_vaccinations.applied_at, pet_vaccinations.vaccine_preset_id
		 FROM pet_vaccinations
		 JOIN pets ON pets.id = pet_vaccinations.pet_id
		 WHERE pet_vaccinations.deleted_at IS NULL
			AND pets.deleted_at IS NULL
			${vaccinePresetId ? 'AND pet_vaccinations.vaccine_preset_id = $1' : ''}
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

export async function listAnalyticsVaccinePresets(): Promise<VaccinePreset[]> {
	const rows = await selectMany<VaccinePresetRow>(
		`SELECT id, name, normalized_name, validity_months, updated_at
		 FROM vaccine_presets
		 ORDER BY name COLLATE NOCASE`
	);

	return rows.map(mapPreset);
}