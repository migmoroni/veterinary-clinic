import {
	productTypeDetail,
	productTypeForTreatmentKind,
	productTypeMain,
	productTypeSubtype,
	stringifyProductType,
	type ProductTreatmentKind,
	type ProductType,
	type ProductTypeMain
} from '$lib/domain/product/catalog.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;

function humanizeTypeSegment(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/^./, (char) => char.toUpperCase());
}

function translatedProductTypeSegment(path: readonly string[], translate: Translate): string {
	const key = `product.type.${path.join('.')}`;
	const translated = translate(key as TranslationKey);
	return !translated || translated === key ? humanizeTypeSegment(path.at(-1) ?? '') : translated;
}

export function productTypeMainLabel(main: ProductTypeMain, translate: Translate): string {
	return translatedProductTypeSegment([main], translate);
}

export function productTypeSubtypeLabel(type: ProductType, translate: Translate): string | null {
	const main = productTypeMain(type);
	const subtype = productTypeSubtype(type);
	return subtype ? translatedProductTypeSegment([main, subtype], translate) : null;
}

export function productTypeDetailLabel(type: ProductType, translate: Translate): string | null {
	const main = productTypeMain(type);
	const subtype = productTypeSubtype(type);
	const detail = productTypeDetail(type);
	return subtype && detail ? translatedProductTypeSegment([main, subtype, detail], translate) : null;
}

export function productTypeLabel(type: ProductType, translate: Translate): string {
	const main = productTypeMain(type);
	const subtype = productTypeSubtype(type);
	const detail = productTypeDetail(type);
	const labels = [
		productTypeMainLabel(main, translate),
		subtype ? translatedProductTypeSegment([main, subtype], translate) : null,
		subtype && detail ? translatedProductTypeSegment([main, subtype, detail], translate) : null
	];
	return labels.filter((label): label is string => Boolean(label)).join(' / ');
}

export function treatmentProductType(kind: ProductTreatmentKind): ProductType {
	return productTypeForTreatmentKind(kind);
}

export function treatmentProductTypeLabel(kind: ProductTreatmentKind, translate: Translate): string {
	return productTypeLabel(treatmentProductType(kind), translate);
}

export type ProductTypeFilterValue = 'all' | `main:${ProductTypeMain}` | `sub:${ProductTypeMain}:${string}` | string;
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

function productTypeSubtypeFilterValue(main: ProductTypeMain, subtype: string): `sub:${ProductTypeMain}:${string}` {
	return `sub:${main}:${subtype}`;
}

export function productTypeMatchesFilter(type: ProductType, filter: ProductTypeFilterValue): boolean {
	if (filter === 'all') return true;
	if (filter.startsWith('main:')) return productTypeMain(type) === filter.slice('main:'.length);
	if (filter.startsWith('sub:')) {
		const [, main, subtype] = filter.split(':');
		return productTypeMain(type) === main && productTypeSubtype(type) === subtype;
	}
	return stringifyProductType(type) === filter;
}

export function productTypeHierarchicalFilterOptions(types: readonly ProductType[], translate: Translate, allLabel: string): ProductTypeFilterOption[] {
	const options: ProductTypeFilterOption[] = [{ value: 'all', label: allLabel }];
	const seenMains = new Set<ProductTypeMain>();
	const seenSubtypes = new Set<string>();
	const seenExactTypes = new Set<string>();

	for (const type of types) {
		const main = productTypeMain(type);
		const subtype = productTypeSubtype(type);
		const detail = productTypeDetail(type);

		if (!seenMains.has(main)) {
			seenMains.add(main);
			options.push({ value: productTypeMainFilterValue(main), label: productTypeMainLabel(main, translate) });
		}

		if (subtype) {
			const subtypeValue = productTypeSubtypeFilterValue(main, subtype);
			if (!seenSubtypes.has(subtypeValue)) {
				seenSubtypes.add(subtypeValue);
				options.push({ value: subtypeValue, label: translatedProductTypeSegment([main, subtype], translate), level: 0.75 });
			}
		}

		if (!subtype || !detail) continue;
		const exactValue = productTypeFilterValue(type);
		if (seenExactTypes.has(exactValue)) continue;
		seenExactTypes.add(exactValue);
		options.push({ value: exactValue, label: translatedProductTypeSegment([main, subtype, detail], translate), level: 0.6 });
	}

	return options;
}
