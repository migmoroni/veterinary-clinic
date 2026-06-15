import type { KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
import type { PreventiveCatalogOrigin } from '$lib/domain/preventive/catalog.js';

export type AntiparasiticValidityUnit = 'days' | 'months' | 'years';

export interface Antiparasitic {
	id: number;
	name: string;
	normalizedName: string;
	species: KnownPetSpecies[];
	aliases: string[];
	manufacturer: string | null;
	origin: PreventiveCatalogOrigin;
	regions: string[];
	hiddenAt: string | null;
	updatedAt: string | null;
}

export interface AntiparasiticInput {
	name: string;
	species?: KnownPetSpecies[];
	aliases?: string[];
	manufacturer?: string | null;
	regions?: string[];
}

export interface PetAntiparasiticTreatment {
	id: number;
	petId: number;
	appliedAt: string;
	antiparasiticName: string;
	antiparasiticNormalizedName: string;
	dose: string;
	validityValue: number;
	validityUnit: AntiparasiticValidityUnit;
	observation: string | null;
	validityIgnoredAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface PetAntiparasiticTreatmentInput {
	appliedAt: string;
	antiparasiticName: string;
	dose: string;
	validityValue: number;
	validityUnit: AntiparasiticValidityUnit;
	observation: string | null;
}

export interface AntiparasiticTreatmentDueStatus {
	dueAt: string | null;
	daysUntilDue: number | null;
	expired: boolean;
	validityIgnored: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeAntiparasiticName(value: string): string {
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

export function computeAntiparasiticTreatmentDueAt(appliedAt: string, validity: Pick<PetAntiparasiticTreatment, 'validityValue' | 'validityUnit'> | null): string | null {
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

export function getAntiparasiticTreatmentDueStatus(antiparasiticTreatment: PetAntiparasiticTreatment, now = new Date()): AntiparasiticTreatmentDueStatus {
	if (antiparasiticTreatment.validityIgnoredAt) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true };

	const dueAt = computeAntiparasiticTreatmentDueAt(antiparasiticTreatment.appliedAt, antiparasiticTreatment);
	if (!dueAt) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const due = parseIsoDate(dueAt);
	if (!due) return { dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dueDate = new Date(due.year, due.month - 1, due.day);
	const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);

	return { dueAt, daysUntilDue, expired: daysUntilDue < 0, validityIgnored: false };
}
