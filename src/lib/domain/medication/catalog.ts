import { assertTextLimit } from '$lib/domain/shared/field-limits.js';
import { defaultTreatmentSpecies, isTreatmentSpecies, normalizeTreatmentSpecies, parseTreatmentSpecies, stringifyTreatmentSpecies, type TreatmentSpecies } from '$lib/domain/treatment/species.js';

export type MedicationSpecies = TreatmentSpecies;
export type MedicationCatalogOrigin = 'system' | 'user';
export const medicationLeafletSectionIds = [
	'about',
	'presentations',
	'indications',
	'administration',
	'interactions',
	'pharmacology',
	'studies',
	'videos',
	'distributors',
	'references'
] as const;

export type MedicationLeafletSectionId = (typeof medicationLeafletSectionIds)[number];

export type MedicationLeafletSections = Partial<Record<MedicationLeafletSectionId, string>>;

export interface MedicationCatalogExtension {
	classification: string | null;
	commercialLine: string | null;
	sections: MedicationLeafletSections;
}

export const defaultMedicationSpecies = [...defaultTreatmentSpecies];
export const emptyMedicationCatalogExtension: MedicationCatalogExtension = {
	classification: null,
	commercialLine: null,
	sections: {}
};

export interface MedicationCatalogMetadata {
	aliases: string[];
	manufacturer: string | null;
	origin: MedicationCatalogOrigin;
	regions: string[];
	species: MedicationSpecies[];
	extension: MedicationCatalogExtension;
}

export function canEditMedicationCatalogItem(item: Pick<MedicationCatalogMetadata, 'origin'>): boolean {
	return item.origin === 'user';
}

export function canDeleteMedicationCatalogItem(item: Pick<MedicationCatalogMetadata, 'origin'>): boolean {
	return canEditMedicationCatalogItem(item);
}

export function normalizeMedicationSpecies(values: readonly string[] | null | undefined): MedicationSpecies[] {
	return normalizeTreatmentSpecies(values);
}

export function parseMedicationSpecies(value: string | null | undefined): MedicationSpecies[] {
	return parseTreatmentSpecies(value);
}

export function stringifyMedicationSpecies(values: readonly string[] | null | undefined): string {
	return stringifyTreatmentSpecies(values);
}

/**
 * Normalizes product markets as unique ISO 3166-1 alpha-3 country codes.
 */
export function normalizeMedicationRegions(values: readonly string[] | null | undefined): string[] {
	const regions: string[] = [];

	for (const value of values ?? []) {
		const candidate = value.trim().toUpperCase();
		if (!/^[A-Z]{3}$/.test(candidate) || regions.includes(candidate)) continue;
		regions.push(candidate);
	}

	return regions;
}

export function parseMedicationRegions(value: string | null | undefined): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeMedicationRegions(parsed.filter((item): item is string => typeof item === 'string')) : [];
	} catch {
		return [];
	}
}

export function stringifyMedicationRegions(values: readonly string[] | null | undefined): string {
	return JSON.stringify(normalizeMedicationRegions(values));
}

export function normalizeMedicationAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	const aliases: string[] = [];
	const seen = new Set<string>();

	for (const value of values ?? []) {
		const alias = value.trim();
		if (!alias) continue;
		assertTextLimit(alias, maxLength);

		const normalized = normalize(alias);
		if (!normalized || normalized === canonicalNormalizedName || seen.has(normalized)) continue;
		seen.add(normalized);
		aliases.push(alias);
	}

	return aliases;
}

export function parseMedicationAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeMedicationAliases(parsed.filter((item): item is string => typeof item === 'string'), maxLength, normalize, canonicalNormalizedName) : [];
	} catch {
		return [];
	}
}

export function stringifyMedicationAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return JSON.stringify(normalizeMedicationAliases(values, maxLength, normalize, canonicalNormalizedName));
}

export function medicationItemMatchesSpecies(species: readonly MedicationSpecies[], petSpecies: string | null | undefined): boolean {
	if (!isTreatmentSpecies(petSpecies)) return true;
	return species.includes(petSpecies);
}

export function medicationItemMatchesSearch(name: string, aliases: readonly string[], query: string, normalize: (value: string) => string): boolean {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return true;
	if (normalize(name).includes(normalizedQuery)) return true;
	return aliases.some((alias) => normalize(alias).includes(normalizedQuery));
}

function normalizedNullableText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizedLeafletSections(value: unknown): MedicationLeafletSections {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const source = value as Record<string, unknown>;
	const sections: MedicationLeafletSections = {};

	for (const sectionId of medicationLeafletSectionIds) {
		const text = normalizedNullableText(source[sectionId]);
		if (text) sections[sectionId] = text;
	}

	return sections;
}

export function normalizeMedicationCatalogExtension(value: unknown): MedicationCatalogExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyMedicationCatalogExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		classification: normalizedNullableText(source.classification),
		commercialLine: normalizedNullableText(source.commercialLine),
		sections: normalizedLeafletSections(source.sections)
	};
}

export function parseMedicationCatalogExtension(value: string | null | undefined): MedicationCatalogExtension {
	if (!value) return { ...emptyMedicationCatalogExtension, sections: {} };

	try {
		return normalizeMedicationCatalogExtension(JSON.parse(value));
	} catch {
		return { ...emptyMedicationCatalogExtension, sections: {} };
	}
}

export function stringifyMedicationCatalogExtension(value: unknown): string {
	return JSON.stringify(normalizeMedicationCatalogExtension(value));
}
