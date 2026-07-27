import type {
	TreatmentAnalyticsCatalogItem,
	TreatmentDueFilter,
	TreatmentDueFilterMode,
	TreatmentHistoryFilter,
	TreatmentHistoryPeriod,
	TreatmentHistoryPoint,
	TreatmentStatusItem,
	TreatmentStatusKey,
	TreatmentStatusSummary
} from '$lib/domain/treatment/analytics.js';
import {
	buildTreatmentStatus,
	emptyTreatmentStatusSummary,
	historyBucket,
	isPlausibleTreatmentAppliedAt,
	matchesTreatmentDueFilter,
	shiftIsoDate,
	todayIsoDate,
	treatmentDueFilterModes,
	treatmentHistoryPeriods,
	treatmentStatusKeys
} from '$lib/domain/treatment/analytics.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import type { TreatmentKind, TreatmentValidityUnit } from '$lib/domain/treatment/treatment.js';
import { selectMany } from '$lib/persistence/sqlite/client.js';
import { listOwnerAssociatedContactsByOwnerIds } from './owner.repository.js';

interface LatestTreatmentRow {
	id: string;
	pet_id: string;
	pet_name: string;
	owner_id: string | null;
	owner_ids: string | null;
	owner_name: string | null;
	owner_contacts: OwnerAssociatedContact[];
	applied_at: string;
	name: string;
	normalized_name: string;
	validity_value: number;
	validity_unit: TreatmentValidityUnit;
}

interface TreatmentHistoryRow {
	applied_at: string;
	normalized_name: string;
}

interface AnalyticsTreatmentRow {
	name: string;
	normalized_name: string;
	count: number;
}

export interface TreatmentAnalyticsOverview {
	totalTracked: number;
	summary: TreatmentStatusSummary;
}

const statusOrder: Record<TreatmentStatusKey, number> = {
	current: 0,
	dueSoon: 1,
	dueVerySoon: 2,
	expired: 3,
	overdue: 4
};

const firstOwnerIdSql = `(SELECT owners.id
	FROM pet_owners
	JOIN owners ON owners.id = pet_owners.owner_id
	WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
	ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	LIMIT 1)`;

const ownerNamesSql = `(SELECT group_concat(name, ' · ')
	FROM (
		SELECT owners.name AS name
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

const ownerIdsSql = `(SELECT group_concat(owner_id, ',')
	FROM (
		SELECT owners.id AS owner_id
		FROM pet_owners
		JOIN owners ON owners.id = pet_owners.owner_id
		WHERE pet_owners.pet_id = pets.id AND owners.removed_at IS NULL
		ORDER BY pet_owners.sort_order, owners.name COLLATE NOCASE, owners.id
	))`;

function parseOwnerIds(value: string | null | undefined): string[] {
	return (value ?? '')
		.split(',')
		.map((item) => item.trim())
		.filter((id) => id.length > 0);
}

function normalizeStatus(value: string | null | undefined): TreatmentStatusKey {
	return treatmentStatusKeys.includes(value as TreatmentStatusKey) ? (value as TreatmentStatusKey) : 'expired';
}

function normalizeDueFilterMode(value: string | null | undefined): TreatmentDueFilterMode {
	return treatmentDueFilterModes.includes(value as TreatmentDueFilterMode) ? (value as TreatmentDueFilterMode) : 'status';
}

function normalizeDueDate(value: string | null | undefined, fallback: string): string {
	return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function normalizeDueFilter(filter: Partial<TreatmentDueFilter> | string | null | undefined): TreatmentDueFilter {
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

function normalizePeriod(value: string | null | undefined): TreatmentHistoryPeriod {
	return treatmentHistoryPeriods.includes(value as TreatmentHistoryPeriod) ? (value as TreatmentHistoryPeriod) : 'month';
}

function normalizeTreatmentFilter(value: string | null | undefined): string | null {
	const normalized = value?.trim() ?? '';
	return normalized ? normalized : null;
}

async function listLatestTreatmentRows(kind: TreatmentKind): Promise<LatestTreatmentRow[]> {
	const rows = await selectMany<LatestTreatmentRow>(
		`SELECT id,
			pet_id,
			pet_name,
			owner_id,
			owner_ids,
			owner_name,
			applied_at,
			name,
			normalized_name,
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
				pet_treatments.name,
				pet_treatments.normalized_name,
				pet_treatments.validity_value,
				pet_treatments.validity_unit,
				ROW_NUMBER() OVER (
					PARTITION BY pet_treatments.pet_id, pet_treatments.normalized_name
					ORDER BY pet_treatments.applied_at DESC, pet_treatments.id DESC
				) AS latest_rank
			 FROM pet_treatments
			 JOIN pets ON pets.id = pet_treatments.pet_id
			 WHERE pet_treatments.kind = $1
				AND pet_treatments.removed_at IS NULL
				AND pet_treatments.validity_ignored_at IS NULL
				AND pets.removed_at IS NULL
				AND date(pet_treatments.applied_at) IS NOT NULL
				AND pet_treatments.applied_at <= date('now', 'localtime')
		 )
		 WHERE latest_rank = 1
		 ORDER BY pet_id, normalized_name`,
		[kind]
	);

	const latestRows = rows.filter((row) => isPlausibleTreatmentAppliedAt(row.applied_at));
	const ownerIdsByRow = new Map<LatestTreatmentRow, string[]>();
	const allOwnerIds: string[] = [];
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

function mapStatusItem(row: LatestTreatmentRow, now = new Date()): TreatmentStatusItem | null {
	const status = buildTreatmentStatus(row.applied_at, row.validity_value, row.validity_unit, now);
	if (!status) return null;

	return {
		ownerId: row.owner_id ?? parseOwnerIds(row.owner_ids)[0] ?? '',
		ownerName: row.owner_name ?? '',
		ownerContacts: row.owner_contacts,
		petId: row.pet_id,
		petName: row.pet_name,
		petAvatarBytes: null,
		name: row.name,
		normalizedName: row.normalized_name,
		appliedAt: row.applied_at,
		dueAt: status.dueAt,
		daysUntilDue: status.daysUntilDue,
		status: status.status
	};
}

function sortStatusItems(items: TreatmentStatusItem[]): TreatmentStatusItem[] {
	return [...items].sort((first, second) => {
		if (first.status !== second.status) return statusOrder[first.status] - statusOrder[second.status];
		if (first.dueAt !== second.dueAt) return first.dueAt.localeCompare(second.dueAt);
		return first.ownerName.localeCompare(second.ownerName) || first.petName.localeCompare(second.petName) || first.name.localeCompare(second.name);
	});
}

export async function getTreatmentAnalyticsOverview(kind: TreatmentKind): Promise<TreatmentAnalyticsOverview> {
	const rows = await listLatestTreatmentRows(kind);
	const summary = emptyTreatmentStatusSummary();
	let totalTracked = 0;

	for (const row of rows) {
		const item = mapStatusItem(row);
		if (!item) continue;
		summary[item.status] += 1;
		totalTracked += 1;
	}

	return { totalTracked, summary };
}

export async function listTreatmentStatusItems(kind: TreatmentKind, filter: Partial<TreatmentDueFilter> | string | null | undefined): Promise<TreatmentStatusItem[]> {
	const normalizedFilter = normalizeDueFilter(filter);
	const rows = await listLatestTreatmentRows(kind);
	return sortStatusItems(rows.map((row) => mapStatusItem(row)).filter((item): item is TreatmentStatusItem => !!item && matchesTreatmentDueFilter(item, normalizedFilter)));
}

export async function listTreatmentHistory(kind: TreatmentKind, filter: Partial<TreatmentHistoryFilter>): Promise<TreatmentHistoryPoint[]> {
	const period = normalizePeriod(filter.period);
	const normalizedName = normalizeTreatmentFilter(filter.normalizedName);
	const values = normalizedName ? [kind, normalizedName] : [kind];
	const rows = await selectMany<TreatmentHistoryRow>(
		`SELECT pet_treatments.applied_at, pet_treatments.normalized_name
		 FROM pet_treatments
		 JOIN pets ON pets.id = pet_treatments.pet_id
		 WHERE pet_treatments.kind = $1
			AND pet_treatments.removed_at IS NULL
			AND pets.removed_at IS NULL
			${normalizedName ? 'AND pet_treatments.normalized_name = $2' : ''}
		 ORDER BY pet_treatments.applied_at ASC`,
		values
	);

	const buckets = new Map<string, TreatmentHistoryPoint>();
	for (const row of rows) {
		const bucket = historyBucket(row.applied_at, period);
		if (!bucket) continue;
		const current = buckets.get(bucket.key) ?? bucket;
		current.count += 1;
		buckets.set(bucket.key, current);
	}

	return [...buckets.values()].sort((first, second) => first.key.localeCompare(second.key));
}

export async function listAnalyticsTreatments(kind: TreatmentKind): Promise<TreatmentAnalyticsCatalogItem[]> {
	const rows = await selectMany<AnalyticsTreatmentRow>(
		`SELECT name, normalized_name, COUNT(*) AS count
		 FROM (
			SELECT name, normalized_name, applied_at, id
			FROM pet_treatments
			WHERE kind = $1 AND removed_at IS NULL
			ORDER BY normalized_name, applied_at DESC, id DESC
		 )
		 GROUP BY normalized_name
		 ORDER BY name COLLATE NOCASE`,
		[kind]
	);

	return rows.map((row) => ({ name: row.name, normalizedName: row.normalized_name, count: row.count }));
}
