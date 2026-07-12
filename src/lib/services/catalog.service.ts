import type { ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
import type { ManufacturerCatalogItem } from '$lib/domain/manufacturer/catalog.js';
import type { ProductCatalogItem } from '$lib/domain/product/catalog.js';
import { getActiveIngredientCatalogItemById, listActiveIngredientCatalogItems } from '$lib/persistence/repositories/active-ingredient-catalog.repository.js';
import { getManufacturerCatalogItemById, listManufacturerCatalogItems } from '$lib/persistence/repositories/manufacturer-catalog.repository.js';
import { getProductCatalogItemById, listProductCatalogItems } from '$lib/persistence/repositories/product-catalog.repository.js';

export type CatalogProductItem = ProductCatalogItem;
export type CatalogManufacturerItem = ManufacturerCatalogItem;
export type CatalogActiveIngredientItem = ActiveIngredientCatalogItem;
export type CatalogEntityKind = 'product' | 'manufacturer' | 'activeIngredient';

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
