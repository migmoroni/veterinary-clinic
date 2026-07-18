export type CatalogClassification = readonly (string | null)[];
export type CatalogClassificationAxis<TValue extends string = string> = {
	id: string;
	values: readonly TValue[];
};

export const emptyCatalogClassification: CatalogClassification = [null, null, null];

export function normalizeCatalogClassification(value: unknown, axes: readonly CatalogClassificationAxis[]): CatalogClassification {
	const source = Array.isArray(value) ? value : [];
	return axes.map((axis, index) => normalizeCatalogClassificationValue(source[index], axis.values));
}

function normalizeCatalogClassificationValue(value: unknown, allowedValues: readonly string[]): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'string') return null;
	return allowedValues.includes(value) ? value : null;
}

export function catalogClassificationHasValue(classification: CatalogClassification): boolean {
	return classification.some((value) => value !== null);
}
