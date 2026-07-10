const treatmentSpeciesIds = ['canine', 'feline'] as const;

export type TreatmentSpecies = (typeof treatmentSpeciesIds)[number];

export const defaultTreatmentSpecies = [...treatmentSpeciesIds];

export function isTreatmentSpecies(value: string | null | undefined): value is TreatmentSpecies {
	return value === 'canine' || value === 'feline';
}

export function normalizeTreatmentSpecies(values: readonly string[] | null | undefined): TreatmentSpecies[] {
	const normalized: TreatmentSpecies[] = [];
	for (const value of values ?? []) {
		if (isTreatmentSpecies(value) && !normalized.includes(value)) normalized.push(value);
	}

	return normalized.length > 0 ? normalized : [...defaultTreatmentSpecies];
}

export function parseTreatmentSpecies(value: string | null | undefined): TreatmentSpecies[] {
	if (!value) return [...defaultTreatmentSpecies];

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? normalizeTreatmentSpecies(parsed.filter((item): item is string => typeof item === 'string')) : [...defaultTreatmentSpecies];
	} catch {
		return [...defaultTreatmentSpecies];
	}
}

export function stringifyTreatmentSpecies(values: readonly string[] | null | undefined): string {
	return JSON.stringify(normalizeTreatmentSpecies(values));
}
