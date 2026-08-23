export type ReferenceSpecies = 'canine' | 'feline';

export interface ReferenceRangeRowsLabels {
	male: string;
	female: string;
	unit: string;
}

export function referenceSpeciesLabel(species: ReferenceSpecies, canineLabel: string, felineLabel: string): string {
	return species === 'canine' ? canineLabel : felineLabel;
}

export function referenceSpeciesOptions(allLabel: string, canineLabel: string, felineLabel: string) {
	return [
		{ value: 'all', label: allLabel },
		{ value: 'canine', label: canineLabel },
		{ value: 'feline', label: felineLabel }
	];
}

export function resolveReferenceSelection<T>(items: readonly T[], selectedId: string | null, itemId: (item: T) => string, options: { fallbackToFirst?: boolean } = {}): string | null {
	if (selectedId && items.some((item) => itemId(item) === selectedId)) return selectedId;
	if (options.fallbackToFirst && items[0]) return itemId(items[0]);
	return null;
}

export function referenceRangeRows(
	range: { male: readonly [number, number]; female: readonly [number, number] },
	labels: ReferenceRangeRowsLabels,
	formatNumber: (value: number) => string
) {
	return [
		{ label: labels.male, value: referenceRangeLabel(range.male, labels.unit, formatNumber) },
		{ label: labels.female, value: referenceRangeLabel(range.female, labels.unit, formatNumber) }
	];
}

function referenceRangeLabel(range: readonly [number, number], unitLabel: string, formatNumber: (value: number) => string): string {
	return `${formatNumber(range[0])}-${formatNumber(range[1])} ${unitLabel}`;
}
