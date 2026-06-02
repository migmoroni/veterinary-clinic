import { isPetSpecies, petSpeciesOptions, type KnownPetSpecies } from '$lib/domain/pet/taxonomy.js';
import { assertTextLimit } from '$lib/domain/shared/field-limits.js';

export type PreventiveSpecies = KnownPetSpecies;

export const defaultPreventiveSpecies = petSpeciesOptions.map((option) => option.id) as PreventiveSpecies[];

export interface PreventiveCatalogMetadata {
	aliases: string[];
	species: PreventiveSpecies[];
}

export function normalizePreventiveSpecies(values: readonly string[] | null | undefined): PreventiveSpecies[] {
	const normalized: PreventiveSpecies[] = [];
	for (const value of values ?? []) {
		if (isPetSpecies(value) && !normalized.includes(value)) normalized.push(value);
	}

	return normalized.length > 0 ? normalized : [...defaultPreventiveSpecies];
}

export function parsePreventiveSpecies(value: string | null | undefined): PreventiveSpecies[] {
	if (!value) return [...defaultPreventiveSpecies];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizePreventiveSpecies(parsed.filter((item): item is string => typeof item === 'string')) : [...defaultPreventiveSpecies];
	} catch {
		return [...defaultPreventiveSpecies];
	}
}

export function stringifyPreventiveSpecies(values: readonly string[] | null | undefined): string {
	return JSON.stringify(normalizePreventiveSpecies(values));
}

export function normalizePreventiveAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
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

export function parsePreventiveAliases(value: string | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string[] {
	if (!value) return [];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizePreventiveAliases(parsed.filter((item): item is string => typeof item === 'string'), maxLength, normalize, canonicalNormalizedName) : [];
	} catch {
		return [];
	}
}

export function stringifyPreventiveAliases(values: readonly string[] | null | undefined, maxLength: number, normalize: (value: string) => string, canonicalNormalizedName = ''): string {
	return JSON.stringify(normalizePreventiveAliases(values, maxLength, normalize, canonicalNormalizedName));
}

export function preventiveItemMatchesSpecies(species: readonly PreventiveSpecies[], petSpecies: string | null | undefined): boolean {
	if (!isPetSpecies(petSpecies)) return true;
	return species.includes(petSpecies);
}

export function preventiveItemMatchesSearch(name: string, aliases: readonly string[], query: string, normalize: (value: string) => string): boolean {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) return true;
	if (normalize(name).includes(normalizedQuery)) return true;
	return aliases.some((alias) => normalize(alias).includes(normalizedQuery));
}