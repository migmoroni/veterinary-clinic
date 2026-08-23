import type { OwnerAssociatedContact } from '@vet/types/domain/owner/owner.js';
import { computeTreatmentDueAt, type TreatmentValidityUnit } from './treatment.js';

export type TreatmentStatusKey = 'current' | 'dueSoon' | 'dueVerySoon' | 'expired' | 'overdue';
export type TreatmentDuePeriodKey = 'dueAfter30Days' | 'dueWithin30Days' | 'expiredWithin30Days' | 'expiredAfter30Days';
export type TreatmentHistoryPeriod = 'week' | 'month' | 'quarter' | 'semester' | 'year';

export const treatmentStatusKeys: TreatmentStatusKey[] = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue'];
export const treatmentDuePeriodKeys: TreatmentDuePeriodKey[] = ['dueAfter30Days', 'dueWithin30Days', 'expiredWithin30Days', 'expiredAfter30Days'];
export const treatmentHistoryPeriods: TreatmentHistoryPeriod[] = ['week', 'month', 'quarter', 'semester', 'year'];

export interface TreatmentStatusSummary {
	current: number;
	dueSoon: number;
	dueVerySoon: number;
	expired: number;
	overdue: number;
}

export interface TreatmentDuePeriodSummary {
	dueAfter30Days: number;
	dueWithin30Days: number;
	expiredWithin30Days: number;
	expiredAfter30Days: number;
}

export interface TreatmentAnalyticsOverview {
	totalTracked: number;
	summary: TreatmentStatusSummary;
	duePeriodSummary: TreatmentDuePeriodSummary;
}

export interface TreatmentDueAnalytics {
	overview: TreatmentAnalyticsOverview;
	items: TreatmentDueItem[];
}

export interface TreatmentDueItem {
	ownerId: string;
	ownerName: string;
	ownerContacts: OwnerAssociatedContact[];
	petId: string;
	petName: string;
	petAvatarBytes: Uint8Array | null;
	name: string;
	normalizedName: string;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: TreatmentStatusKey;
}

export interface TreatmentHistoryPoint {
	key: string;
	label: string;
	count: number;
}

export interface TreatmentHistoryFilter {
	period: TreatmentHistoryPeriod;
	normalizedName: string | null;
}

export interface TreatmentDueFilter {
	duePeriod: TreatmentDuePeriodKey;
}

export interface TreatmentAnalyticsCatalogItem {
	name: string;
	normalizedName: string;
	count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIsoDate(value: string): Date | null {
	const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
	return date;
}

function isoDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfIsoWeek(date: Date): Date {
	const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const day = copy.getDay() || 7;
	copy.setDate(copy.getDate() - day + 1);
	return copy;
}

export function emptyTreatmentStatusSummary(): TreatmentStatusSummary {
	return { current: 0, dueSoon: 0, dueVerySoon: 0, expired: 0, overdue: 0 };
}

export function emptyTreatmentDuePeriodSummary(): TreatmentDuePeriodSummary {
	return { dueAfter30Days: 0, dueWithin30Days: 0, expiredWithin30Days: 0, expiredAfter30Days: 0 };
}

export function getTreatmentStatus(daysUntilDue: number): TreatmentStatusKey {
	if (daysUntilDue <= -15) return 'overdue';
	if (daysUntilDue < 0) return 'expired';
	if (daysUntilDue <= 15) return 'dueVerySoon';
	if (daysUntilDue <= 30) return 'dueSoon';
	return 'current';
}

export function getTreatmentDuePeriod(daysUntilDue: number): TreatmentDuePeriodKey {
	if (daysUntilDue > 30) return 'dueAfter30Days';
	if (daysUntilDue >= 0) return 'dueWithin30Days';
	if (daysUntilDue >= -30) return 'expiredWithin30Days';
	return 'expiredAfter30Days';
}

export function matchesTreatmentDueFilter(item: TreatmentDueItem, filter: TreatmentDueFilter): boolean {
	return getTreatmentDuePeriod(item.daysUntilDue) === filter.duePeriod;
}

export function isPlausibleTreatmentAppliedAt(value: string, now = new Date()): boolean {
	const date = parseIsoDate(value);
	if (!date) return false;

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return date.getTime() <= today.getTime();
}

export function buildTreatmentStatus(appliedAt: string, validityValue: number, validityUnit: TreatmentValidityUnit, now = new Date()): { dueAt: string; daysUntilDue: number; status: TreatmentStatusKey } | null {
	if (!isPlausibleTreatmentAppliedAt(appliedAt, now)) return null;

	const dueAt = computeTreatmentDueAt(appliedAt, { validityValue, validityUnit });
	if (!dueAt) return null;

	const dueDate = parseIsoDate(dueAt);
	if (!dueDate) return null;

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
	return { dueAt, daysUntilDue, status: getTreatmentStatus(daysUntilDue) };
}

export function historyBucket(value: string, period: TreatmentHistoryPeriod): TreatmentHistoryPoint | null {
	if (!isPlausibleTreatmentAppliedAt(value)) return null;

	const date = parseIsoDate(value);
	if (!date) return null;

	const year = date.getFullYear();
	const month = date.getMonth() + 1;

	if (period === 'week') {
		const start = startOfIsoWeek(date);
		return { key: isoDate(start), label: isoDate(start), count: 0 };
	}

	if (period === 'month') {
		const key = `${year}-${String(month).padStart(2, '0')}`;
		return { key, label: key, count: 0 };
	}

	if (period === 'quarter') {
		const quarter = Math.floor((month - 1) / 3) + 1;
		const key = `${year}-Q${quarter}`;
		return { key, label: key, count: 0 };
	}

	if (period === 'semester') {
		const semester = month <= 6 ? 1 : 2;
		const key = `${year}-S${semester}`;
		return { key, label: key, count: 0 };
	}

	const key = String(year);
	return { key, label: key, count: 0 };
}
