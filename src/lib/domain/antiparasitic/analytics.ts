import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import { computeAntiparasiticTreatmentDueAt, type AntiparasiticValidityUnit } from './antiparasitic.js';

export type AntiparasiticTreatmentStatusKey = 'current' | 'dueSoon' | 'dueVerySoon' | 'expired' | 'overdue';
export type AntiparasiticTreatmentHistoryPeriod = 'week' | 'month' | 'quarter' | 'semester' | 'year';
export type AntiparasiticTreatmentDueFilterMode = 'status' | 'period';

export const antiparasiticTreatmentStatusKeys: AntiparasiticTreatmentStatusKey[] = ['current', 'dueSoon', 'dueVerySoon', 'expired', 'overdue'];
export const antiparasiticTreatmentHistoryPeriods: AntiparasiticTreatmentHistoryPeriod[] = ['week', 'month', 'quarter', 'semester', 'year'];
export const antiparasiticTreatmentDueFilterModes: AntiparasiticTreatmentDueFilterMode[] = ['status', 'period'];

export interface AntiparasiticTreatmentStatusSummary {
	current: number;
	dueSoon: number;
	dueVerySoon: number;
	expired: number;
	overdue: number;
}

export interface AntiparasiticTreatmentStatusItem {
	ownerId: number;
	ownerName: string;
	ownerContacts: OwnerAssociatedContact[];
	petId: number;
	petName: string;
	petAvatarBytes: Uint8Array | null;
	antiparasiticName: string;
	antiparasiticNormalizedName: string;
	appliedAt: string;
	dueAt: string;
	daysUntilDue: number;
	status: AntiparasiticTreatmentStatusKey;
}

export interface AntiparasiticTreatmentHistoryPoint {
	key: string;
	label: string;
	count: number;
}

export interface AntiparasiticTreatmentHistoryFilter {
	period: AntiparasiticTreatmentHistoryPeriod;
	antiparasiticNormalizedName: string | null;
}

export interface AntiparasiticTreatmentDueFilter {
	mode: AntiparasiticTreatmentDueFilterMode;
	status: AntiparasiticTreatmentStatusKey;
	startDate: string;
	endDate: string;
}

export interface AntiparasiticAnalyticsAntiparasitic {
	antiparasiticName: string;
	antiparasiticNormalizedName: string;
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

export function todayIsoDate(now = new Date()): string {
	return isoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function shiftIsoDate(value: string, days: number): string {
	const date = parseIsoDate(value) ?? parseIsoDate(todayIsoDate())!;
	date.setDate(date.getDate() + days);
	return isoDate(date);
}

function startOfIsoWeek(date: Date): Date {
	const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const day = copy.getDay() || 7;
	copy.setDate(copy.getDate() - day + 1);
	return copy;
}

export function emptyAntiparasiticTreatmentStatusSummary(): AntiparasiticTreatmentStatusSummary {
	return { current: 0, dueSoon: 0, dueVerySoon: 0, expired: 0, overdue: 0 };
}

export function getAntiparasiticTreatmentStatus(daysUntilDue: number): AntiparasiticTreatmentStatusKey {
	if (daysUntilDue <= -15) return 'overdue';
	if (daysUntilDue < 0) return 'expired';
	if (daysUntilDue <= 15) return 'dueVerySoon';
	if (daysUntilDue <= 30) return 'dueSoon';
	return 'current';
}

export function matchesAntiparasiticTreatmentDueFilter(item: AntiparasiticTreatmentStatusItem, filter: AntiparasiticTreatmentDueFilter): boolean {
	if (filter.mode === 'status') return item.status === filter.status;
	return item.dueAt >= filter.startDate && item.dueAt <= filter.endDate;
}

export function isPlausibleAntiparasiticTreatmentAppliedAt(value: string, now = new Date()): boolean {
	const date = parseIsoDate(value);
	if (!date) return false;

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	return date.getTime() <= today.getTime();
}

export function buildAntiparasiticTreatmentStatus(appliedAt: string, validityValue: number, validityUnit: AntiparasiticValidityUnit, now = new Date()): { dueAt: string; daysUntilDue: number; status: AntiparasiticTreatmentStatusKey } | null {
	if (!isPlausibleAntiparasiticTreatmentAppliedAt(appliedAt, now)) return null;

	const dueAt = computeAntiparasiticTreatmentDueAt(appliedAt, { validityValue, validityUnit });
	if (!dueAt) return null;

	const dueDate = parseIsoDate(dueAt);
	if (!dueDate) return null;

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);
	return { dueAt, daysUntilDue, status: getAntiparasiticTreatmentStatus(daysUntilDue) };
}

export function historyBucket(value: string, period: AntiparasiticTreatmentHistoryPeriod): AntiparasiticTreatmentHistoryPoint | null {
	if (!isPlausibleAntiparasiticTreatmentAppliedAt(value)) return null;

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