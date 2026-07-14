import { productType, productTypeMain, productTypeSubtype, stringifyProductType, type ProductType, type ProductTypeMain, type ProductTypeSubtype } from '$lib/domain/product/catalog.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;

const productTypeMainLabelKeys = {
	medication: 'product.type.medication',
	nutrition: 'product.type.nutrition',
	hygiene: 'product.type.hygiene',
	disinfectants: 'product.type.disinfectants'
} as const satisfies Record<ProductTypeMain, TranslationKey>;

const treatmentSubtypeLabelKeys = {
	vaccine: 'protocol.kind.vaccine',
	antiparasitic: 'protocol.kind.antiparasitic'
} as const satisfies Record<ProductTypeSubtype<'medication'>, TranslationKey>;

export function productTypeMainLabel(main: ProductTypeMain, translate: Translate): string {
	return translate(productTypeMainLabelKeys[main]);
}

export function productTypeSubtypeLabel(type: ProductType, translate: Translate): string | null {
	const main = productTypeMain(type);
	const subtype = productTypeSubtype(type);
	if (subtype === null) return null;
	if (main === 'medication') return translate(treatmentSubtypeLabelKeys[subtype]);
	return String(subtype);
}

export function productTypeLabel(type: ProductType, translate: Translate): string {
	const mainLabel = productTypeMainLabel(productTypeMain(type), translate);
	const subtypeLabel = productTypeSubtypeLabel(type, translate);
	return subtypeLabel ? `${mainLabel} / ${subtypeLabel}` : mainLabel;
}

export function treatmentProductType(kind: ProductTypeSubtype<'medication'>): ProductType {
	return productType('medication', kind);
}

export function treatmentProductTypeLabel(kind: ProductTypeSubtype<'medication'>, translate: Translate): string {
	return productTypeLabel(treatmentProductType(kind), translate);
}

export type ProductTypeFilterValue = 'all' | `main:${ProductTypeMain}` | string;
export interface ProductTypeFilterOption {
	value: ProductTypeFilterValue;
	label: string;
	level?: number;
}

export function productTypeFilterValue(type: ProductType): string {
	return stringifyProductType(type);
}

export function productTypeMainFilterValue(main: ProductTypeMain): `main:${ProductTypeMain}` {
	return `main:${main}`;
}

export function productTypeMatchesFilter(type: ProductType, filter: ProductTypeFilterValue): boolean {
	if (filter === 'all') return true;
	if (filter.startsWith('main:')) return productTypeMain(type) === filter.slice('main:'.length);
	return stringifyProductType(type) === filter;
}

export function productTypeHierarchicalFilterOptions(types: readonly ProductType[], translate: Translate, allLabel: string): ProductTypeFilterOption[] {
	const options: ProductTypeFilterOption[] = [{ value: 'all', label: allLabel }];
	const seenMains = new Set<ProductTypeMain>();

	for (const type of types) {
		const main = productTypeMain(type);
		if (!seenMains.has(main)) {
			seenMains.add(main);
			options.push({ value: productTypeMainFilterValue(main), label: productTypeMainLabel(main, translate) });
		}

		const subtypeLabel = productTypeSubtypeLabel(type, translate);
		if (subtypeLabel) options.push({ value: productTypeFilterValue(type), label: subtypeLabel, level: 0.85 });
	}

	return options;
}
