import type {
	AntiparasiticAnalyticsAntiparasitic,
	AntiparasiticTreatmentHistoryFilter,
	AntiparasiticTreatmentHistoryPoint,
	AntiparasiticTreatmentHistoryPeriod,
	AntiparasiticTreatmentDueFilter,
	AntiparasiticTreatmentDueFilterMode,
	AntiparasiticTreatmentStatusItem,
	AntiparasiticTreatmentStatusKey,
	AntiparasiticTreatmentStatusSummary
} from '$lib/domain/antiparasitic/analytics.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import {
	buildAntiparasiticTreatmentStatus,
	emptyAntiparasiticTreatmentStatusSummary,
	historyBucket,
	isPlausibleAntiparasiticTreatmentAppliedAt,
	matchesAntiparasiticTreatmentDueFilter,
	antiparasiticTreatmentDueFilterModes,
	antiparasiticTreatmentHistoryPeriods,
	antiparasiticTreatmentStatusKeys,
	shiftIsoDate,
	todayIsoDate
} from '$lib/domain/antiparasitic/analytics.js';
import type { AntiparasiticValidityUnit } from '$lib/domain/antiparasitic/antiparasitic.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';
import { listOwnerAssociatedContactsByOwnerIds } from './owner.repository.js';

interface LatestAntiparasiticTreatmentRow {
	id: number;
	pet_id: number;
	pet_name: string;
	owner_id: number | null;
	owner_ids: string | null;
	owner_name: string | null;
	owner_contacts: OwnerAssociatedContact[];
	applied_at: string;
	antiparasitic_name: string;
	antiparasitic_normalized_name: string;
	validity_value: number;
	validity_unit: AntiparasiticValidityUnit;
}

interface AntiparasiticTreatmentHistoryRow {
	applied_at: string;
	antiparasitic_normalized_name: string;
}

interface AnalyticsAntiparasiticRow {
	antiparasitic_name: string;
	antiparasitic_normalized_name: string;
	count: number;
}

export interface AntiparasiticTreatmentAnalyticsOverview {
	totalTracked: number;
	summary: AntiparasiticTreatmentStatusSummary;
}

const statusOrder: Record<AntiparasiticTreatmentStatusKey, number> = {
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

function normalizeStatus(value: string | null | undefined): AntiparasiticTreatmentStatusKey {
	return antiparasiticTreatmentStatusKeys.includes(value as AntiparasiticTreatmentStatusKey) ? (value as AntiparasiticTreatmentStatusKey) : 'expired';
}

function normalizeDueFilterMode(value: string | null | undefined): AntiparasiticTreatmentDueFilterMode {
	return antiparasiticTreatmentDueFilterModes.includes(value as AntiparasiticTreatmentDueFilterMode) ? (value as AntiparasiticTreatmentDueFilterMode) : 'status';
}

function normalizeDueDate(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeDueFilter(filter: Partial<AntiparasiticTreatmentDueFilter> | string | null | undefined): AntiparasiticTreatmentDueFilter {
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

function normalizePeriod(value: string | null | undefined): AntiparasiticTreatmentHistoryPeriod {
	return antiparasiticTreatmentHistoryPeriods.includes(value as AntiparasiticTreatmentHistoryPeriod) ? (value as AntiparasiticTreatmentHistoryPeriod) : 'month';
}

function normalizeAntiparasiticFilter(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized ? normalized : null;
}

async function listLatestAntiparasiticTreatmentRows(): Promise<LatestAntiparasiticTreatmentRow[]> {
	const rows = await selectMany<LatestAntiparasiticTreatmentRow>(
		`SELECT id,
			pet_id,
			pet_name,
			owner_id,
			owner_ids,
			owner_name,
			applied_at,
			antiparasitic_name,
			antiparasitic_normalized_name,
			validity_value,
			validity_unit
		 FROM (
			SELECT
				pet_treatments.id,
				pet_treatments.pet_id,
				pets.name AS pet_name,
				${firstOwnerIdSql} AS owner_id,
				${ownerIdsSql} AS owner_ids,
				${ownerNamesSql} AS owner_name,
				pet_treatments.applied_at,
				pet_treatments.name AS antiparasitic_name,
				pet_treatments.normalized_name AS antiparasitic_normalized_name,
				pet_treatments.validity_value,
				pet_treatments.validity_unit,
				ROW_NUMBER() OVER (
					PARTITION BY pet_treatments.pet_id, pet_treatments.normalized_name
					ORDER BY pet_treatments.applied_at DESC, pet_treatments.id DESC
				) AS latest_rank
			 FROM pet_treatments
			 JOIN pets ON pets.id = pet_treatments.pet_id
			 WHERE pet_treatments.kind = 'antiparasitic'
				AND pet_treatments.deleted_at IS NULL
				AND pet_treatments.validity_ignored_at IS NULL
				AND pets.deleted_at IS NULL
				AND date(pet_treatments.applied_at) IS NOT NULL
				AND pet_treatments.applied_at <= date('now', 'localtime')
		 )
		 WHERE latest_rank = 1
		 ORDER BY pet_id, antiparasitic_normalized_name`
	);

	const latestRows = rows.filter((row) => isPlausibleAntiparasiticTreatmentAppliedAt(row.applied_at));
	const ownerIdsByRow = new Map<LatestAntiparasiticTreatmentRow, number[]>();
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

function mapStatusItem(row: LatestAntiparasiticTreatmentRow, now = new Date()): AntiparasiticTreatmentStatusItem | null {
	const status = buildAntiparasiticTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit, now);
	if (!status) return null;

	return {
		ownerId: row.owner_id ?? parseOwnerIds(row.owner_ids)[0] ?? 0,
		ownerName: row.owner_name ?? '',
		ownerContacts: row.owner_contacts,
		petId: row.pet_id,
		petName: row.pet_name,
		petAvatarBytes: null,
		antiparasiticName: row.antiparasitic_name,
		antiparasiticNormalizedName: row.antiparasitic_normalized_name,
		appliedAt: row.applied_at,
		dueAt: status.dueAt,
		daysUntilDue: status.daysUntilDue,
		status: status.status
	};
}

function sortStatusItems(items: AntiparasiticTreatmentStatusItem[]): AntiparasiticTreatmentStatusItem[] {
	return [...items].sort((first, second) => {
		if (first.status !== second.status) return statusOrder[first.status] - statusOrder[second.status];
		if (first.dueAt !== second.dueAt) return first.dueAt.localeCompare(second.dueAt);
		return first.ownerName.localeCompare(second.ownerName) || first.petName.localeCompare(second.petName) || first.antiparasiticName.localeCompare(second.antiparasiticName);
	});
}

export async function getAntiparasiticTreatmentAnalyticsOverview(): Promise<AntiparasiticTreatmentAnalyticsOverview> {
	const rows = await listLatestAntiparasiticTreatmentRows();
	const summary = emptyAntiparasiticTreatmentStatusSummary();
	let totalTracked = 0;

	for (const row of rows) {
		const item = mapStatusItem(row);
		if (!item) continue;
		summary[item.status] += 1;
		totalTracked += 1;
	}

	return { totalTracked, summary };
}

export async function listAntiparasiticTreatmentStatusItems(filter: Partial<AntiparasiticTreatmentDueFilter> | string | null | undefined): Promise<AntiparasiticTreatmentStatusItem[]> {
	const normalizedFilter = normalizeDueFilter(filter);
	const rows = await listLatestAntiparasiticTreatmentRows();
	return sortStatusItems(rows.map((row) => mapStatusItem(row)).filter((item): item is AntiparasiticTreatmentStatusItem => !!item && matchesAntiparasiticTreatmentDueFilter(item, normalizedFilter)));
}

export async function listAntiparasiticTreatmentHistory(filter: Partial<AntiparasiticTreatmentHistoryFilter>): Promise<AntiparasiticTreatmentHistoryPoint[]> {
	const period = normalizePeriod(filter.period);
	const antiparasiticNormalizedName = normalizeAntiparasiticFilter(filter.antiparasiticNormalizedName);
	const values = antiparasiticNormalizedName ? [antiparasiticNormalizedName] : [];
	const rows = await selectMany<AntiparasiticTreatmentHistoryRow>(
		`SELECT pet_treatments.applied_at, pet_treatments.normalized_name AS antiparasitic_normalized_name
		 FROM pet_treatments
		 JOIN pets ON pets.id = pet_treatments.pet_id
		 WHERE pet_treatments.kind = 'antiparasitic'
			AND pet_treatments.deleted_at IS NULL
			AND pets.deleted_at IS NULL
			${antiparasiticNormalizedName ? 'AND pet_treatments.normalized_name = $1' : ''}
		 ORDER BY pet_treatments.applied_at ASC`,
		values
	);

	const buckets = new Map<string, AntiparasiticTreatmentHistoryPoint>();
	for (const row of rows) {
		const bucket = historyBucket(row.applied_at, period);
		if (!bucket) continue;
		const current = buckets.get(bucket.key) ?? bucket;
		current.count += 1;
		buckets.set(bucket.key, current);
	}

	return [...buckets.values()].sort((first, second) => first.key.localeCompare(second.key));
}

export async function listAnalyticsAntiparasitics(): Promise<AntiparasiticAnalyticsAntiparasitic[]> {
	const rows = await selectMany<AnalyticsAntiparasiticRow>(
		`SELECT antiparasitic_name, antiparasitic_normalized_name, COUNT(*) AS count
		 FROM (
			SELECT name AS antiparasitic_name, normalized_name AS antiparasitic_normalized_name, applied_at, id
			FROM pet_treatments
			WHERE kind = 'antiparasitic' AND deleted_at IS NULL
			ORDER BY normalized_name, applied_at DESC, id DESC
		 )
		 GROUP BY antiparasitic_normalized_name
		 ORDER BY antiparasitic_name COLLATE NOCASE`
	);

	return rows.map((row) => ({ antiparasiticName: row.antiparasitic_name, antiparasiticNormalizedName: row.antiparasitic_normalized_name, count: row.count }));
}
