import { productType, productTypeMain, productTypeSubtype, type ProductType, type ProductTypeMain, type ProductTypeSubtype } from '$lib/domain/product/catalog.js';
import type { TranslationKey } from '$lib/i18n/index.js';

type Translate = (key: TranslationKey) => string;

const productTypeMainLabelKeys = {
	medication: 'product.type.medication',
	nutrition: 'product.type.nutrition',
	hygiene: 'product.type.hygiene',
	disinfectants: 'product.type.disinfectants'
} as const satisfies Record<ProductTypeMain, TranslationKey>;

const medicationTypeSubtypeLabelKeys = {
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
	if (main === 'medication') return translate(medicationTypeSubtypeLabelKeys[subtype]);
	return String(subtype);
}

export function productTypeLabel(type: ProductType, translate: Translate): string {
	const mainLabel = productTypeMainLabel(productTypeMain(type), translate);
	const subtypeLabel = productTypeSubtypeLabel(type, translate);
	return subtypeLabel ? `${mainLabel} / ${subtypeLabel}` : mainLabel;
}

export function medicationProductType(kind: ProductTypeSubtype<'medication'>): ProductType {
	return productType('medication', kind);
}

export function medicationProductTypeLabel(kind: ProductTypeSubtype<'medication'>, translate: Translate): string {
	return productTypeLabel(medicationProductType(kind), translate);
}
