export interface PetVaccination {
	id: number;
	petId: number;
	appliedAt: string;
	vaccinePresetId: number;
	vaccinePresetDoseId: number;
	vaccineName: string;
	vaccineDoseLabel: string;
	validityIgnoredAt: string | null;
	updatedAt: string | null;
	deletedAt: string | null;
	purgeAfter: string | null;
}

export interface PetVaccinationInput {
	appliedAt: string;
	vaccinePresetId: number;
	vaccinePresetDoseId: number;
}

export type VaccineValidityUnit = 'days' | 'months';

export interface VaccinePresetDose {
	id: number;
	vaccinePresetId: number;
	label: string;
	normalizedLabel: string;
	validityValue: number;
	validityUnit: VaccineValidityUnit;
	sortOrder: number;
	updatedAt: string | null;
}

export interface VaccinePresetDoseInput {
	id?: number;
	label: string;
	validityValue: number;
	validityUnit: VaccineValidityUnit;
	sortOrder?: number;
}

export interface VaccinePreset {
	id: number;
	name: string;
	normalizedName: string;
	doses: VaccinePresetDose[];
	hiddenAt: string | null;
	updatedAt: string | null;
}

export interface VaccinePresetInput {
	name: string;
	doses: VaccinePresetDoseInput[];
}

export interface VaccineDueStatus {
	preset: VaccinePreset | null;
	dose: VaccinePresetDose | null;
	dueAt: string | null;
	daysUntilDue: number | null;
	expired: boolean;
	validityIgnored: boolean;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeVaccineName(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export function normalizeVaccineDoseLabel(value: string): string {
	return normalizeVaccineName(value);
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

export function findVaccinePreset(vaccine: string, presets: VaccinePreset[]): VaccinePreset | null {
	const normalized = normalizeVaccineName(vaccine);
	return presets.find((preset) => normalizeVaccineName(preset.normalizedName) === normalized) ?? null;
}

export function getVaccinationPreset(vaccination: PetVaccination, presets: VaccinePreset[]): VaccinePreset | null {
	return presets.find((item) => item.id === vaccination.vaccinePresetId) ?? null;
}

export function getVaccinationDose(vaccination: PetVaccination, presets: VaccinePreset[]): VaccinePresetDose | null {
	return getVaccinationPreset(vaccination, presets)?.doses.find((item) => item.id === vaccination.vaccinePresetDoseId) ?? null;
}

export function getVaccinationDisplayName(vaccination: PetVaccination, presets: VaccinePreset[]): string {
	const presetName = getVaccinationPreset(vaccination, presets)?.name ?? vaccination.vaccineName;
	const doseLabel = getVaccinationDose(vaccination, presets)?.label ?? vaccination.vaccineDoseLabel;
	return doseLabel ? `${presetName} · ${doseLabel}` : presetName;
}

export function computeVaccineDueAt(appliedAt: string, dose: Pick<VaccinePresetDose, 'validityValue' | 'validityUnit'> | null): string | null {
	if (!dose) return null;
	if (dose.validityValue <= 0) return null;
	const applied = parseIsoDate(appliedAt);
	if (!applied) return null;
	if (dose.validityUnit === 'days') {
		const date = new Date(applied.year, applied.month - 1, applied.day);
		date.setDate(date.getDate() + dose.validityValue);
		return formatIsoDate(date);
	}

	const totalMonths = applied.year * 12 + applied.month - 1 + dose.validityValue;
	const year = Math.floor(totalMonths / 12);
	const month = (totalMonths % 12) + 1;
	const day = Math.min(applied.day, daysInMonth(year, month));

	return formatIsoDate(new Date(year, month - 1, day));
}

export function getVaccineDueStatus(vaccination: PetVaccination, presets: VaccinePreset[], now = new Date()): VaccineDueStatus {
	const preset = getVaccinationPreset(vaccination, presets);
	const dose = getVaccinationDose(vaccination, presets);
	if (vaccination.validityIgnoredAt) return { preset, dose, dueAt: null, daysUntilDue: null, expired: false, validityIgnored: true };

	const dueAt = computeVaccineDueAt(vaccination.appliedAt, dose);
	if (!dueAt) return { preset, dose, dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const due = parseIsoDate(dueAt);
	if (!due) return { preset, dose, dueAt: null, daysUntilDue: null, expired: false, validityIgnored: false };

	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dueDate = new Date(due.year, due.month - 1, due.day);
	const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / DAY_MS);

	return { preset, dose, dueAt, daysUntilDue, expired: daysUntilDue < 0, validityIgnored: false };
}