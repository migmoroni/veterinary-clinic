export type CatalogClassification = readonly [string | null, string | null, string | null];
export type CatalogClassificationAxis<TValue extends string = string> = {
	id: string;
	values: readonly TValue[];
};

export const emptyCatalogClassification: CatalogClassification = [null, null, null];

export function normalizeCatalogClassification(value: unknown, axes: readonly [CatalogClassificationAxis, CatalogClassificationAxis, CatalogClassificationAxis]): CatalogClassification {
	if (!Array.isArray(value) || value.length !== 3) return emptyCatalogClassification;
	return [normalizeCatalogClassificationValue(value[0], axes[0].values), normalizeCatalogClassificationValue(value[1], axes[1].values), normalizeCatalogClassificationValue(value[2], axes[2].values)];
}

function normalizeCatalogClassificationValue(value: unknown, allowedValues: readonly string[]): string | null {
	if (value === null || value === undefined || value === '') return null;
	if (typeof value !== 'string') return null;
	return allowedValues.includes(value) ? value : null;
}

export function catalogClassificationHasValue(classification: CatalogClassification): boolean {
	return classification.some((value) => value !== null);
}
