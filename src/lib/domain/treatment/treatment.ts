import type { MedicationCatalogOrigin, MedicationSpecies } from '$lib/domain/medication/catalog.js';

export type TreatmentKind = 'vaccine' | 'antiparasitic';
export type TreatmentValidityUnit = 'days' | 'months' | 'years';

export interface TreatmentCatalogItem {
	id: number;
	kind: TreatmentKind;
	name: string;
	normalizedName: string;
	species: MedicationSpecies[];
	aliases: string[];
	manufacturer: string | null;
	origin: MedicationCatalogOrigin;
	regions: string[];
	hiddenAt: string | null;
	updatedAt: string | null;
}

export interface TreatmentCatalogItemInput {
	name: string;
	species?: MedicationSpecies[];
	aliases?: string[];
	manufacturer?: string | null;
	regions?: string[];
}

export interface PetTreatment {
	id: number;
	petId: number;
	kind: TreatmentKind;
	appliedAt: string;
	name: string;
	normalizedName: string;
	dose: string;
	validityValue: number;
	validityUnit: TreatmentValidityUnit;
	observation: string | null;
	validityIgnoredAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface PetTreatmentInput {
	appliedAt: string;
	name: string;
	dose: string;
	validityValue: number;
	validityUnit: TreatmentValidityUnit;
	observation: string | null;
}

export interface TreatmentDueStatus {
	dueAt: string | null;
	daysUntilDue: number | null;
	expired: boolean;
	validityIgnored: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeTreatmentName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
	const match = value.match(ISO_DATE);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(year, month - 1, day);

	if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

	return { year, month, day };
}

function formatIsoDate(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
	return new Date(year, month, 0).getDate();
}

export function computeTreatmentDueAt(appliedAt: string, validity: Pick<PetTreatment, 'validityValue' | 'validityUnit'> | null): string | null {
	if (!validity) return null;
	if (validity.validityValue <= 0) return null;
	const applied = parseIsoDate(appliedAt);
	if (!applied) return null;
	if (validity.validityUnit === 'days') {
		const date = new Date(applied.year, applied.month - 1, applied.day);
		date.setDate(date.getDate() + validity.validityValue);
		return formatIsoDate(date);
	}

	const totalMonths = applied.year * 12 + applied.month - 1 + (validity.validityUnit === 'years' ? validity.validityValue * 12 : validity.validityValue);
	const year = Math.floor(totalMonths / 12);
	const month = (totalMonths % 12) + 1;
	const day = Math.min(applied.day, daysInMonth(year, month));

	return formatIsoDate(new Date(year, month - 1, day));
}

export function getTreatmentDueStatus(treatment: PetTreatment, now = new Date()): TreatmentDueStatus {
	if (treatment.validityIgnoredAt) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true };

	const dueAt = computeTreatmentDueAt(treatment.appliedAt, treatment);
	if (!dueAt) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const due = parseIsoDate(dueAt);
	if (!due) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dueDate = new Date(due.year, due.month - 1, due.day);
	const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);

	return { dueAt, daysUntilDue, expired: daysUntilDue < 0, validityIgnored: false };
}
