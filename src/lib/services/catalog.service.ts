import type { ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
import type { ConditionCatalogItem } from '$lib/domain/condition/catalog.js';
import type { ManufacturerCatalogItem } from '$lib/domain/manufacturer/catalog.js';
import type { ProductCatalogItem } from '$lib/domain/product/catalog.js';
import { getActiveIngredientCatalogItemById, listActiveIngredientCatalogItems } from '$lib/persistence/repositories/active-ingredient-catalog.repository.js';
import { getConditionCatalogItemById, listConditionCatalogItems } from '$lib/persistence/repositories/condition-catalog.repository.js';
import { getManufacturerCatalogItemById, listManufacturerCatalogItems } from '$lib/persistence/repositories/manufacturer-catalog.repository.js';
import { getProductCatalogItemById, listProductCatalogItems } from '$lib/persistence/repositories/product-catalog.repository.js';

export type CatalogProductItem = ProductCatalogItem;
export type CatalogManufacturerItem = ManufacturerCatalogItem;
export type CatalogActiveIngredientItem = ActiveIngredientCatalogItem;
export type CatalogConditionItem = ConditionCatalogItem;
export type CatalogEntityKind = 'product' | 'manufacturer' | 'activeIngredient' | 'condition';

export async function loadCatalogProducts(includeHidden = false, includeImages = true): Promise<CatalogProductItem[]> {
	return listProductCatalogItems(includeHidden, includeImages);
}

export async function loadCatalogProduct(id: string, includeHidden = false, includeImages = true): Promise<CatalogProductItem | null> {
	return getProductCatalogItemById(id, includeHidden, includeImages);
}

export async function loadCatalogManufacturers(includeHidden = false, includeImages = true): Promise<CatalogManufacturerItem[]> {
	return listManufacturerCatalogItems(includeHidden, includeImages);
}

export async function loadCatalogManufacturer(id: string, includeHidden = false, includeImages = true): Promise<CatalogManufacturerItem | null> {
	return getManufacturerCatalogItemById(id, includeHidden, includeImages);
}

export async function loadCatalogActiveIngredients(includeHidden = false, includeImages = true): Promise<CatalogActiveIngredientItem[]> {
	return listActiveIngredientCatalogItems(includeHidden, includeImages);
}

export async function loadCatalogActiveIngredient(id: string, includeHidden = false, includeImages = true): Promise<CatalogActiveIngredientItem | null> {
	return getActiveIngredientCatalogItemById(id, includeHidden, includeImages);
}

export async function loadCatalogConditions(includeHidden = false, includeImages = true): Promise<CatalogConditionItem[]> {
	return listConditionCatalogItems(includeHidden, includeImages);
}

export async function loadCatalogCondition(id: string, includeHidden = false, includeImages = true): Promise<CatalogConditionItem | null> {
	return getConditionCatalogItemById(id, includeHidden, includeImages);
}
