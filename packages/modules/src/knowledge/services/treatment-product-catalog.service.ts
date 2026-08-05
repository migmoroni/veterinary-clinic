import type { ImageCollectionItemInput } from '@vet/types/domain/image-collection/image-collection.js';
import type { TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind } from '@vet/types/domain/treatment/treatment.js';
import {
	deleteProductCatalogItem,
	ensureTreatmentProductCatalogItem,
	getTreatmentProductCatalogItemById,
	listTreatmentProductCatalogItems,
	normalizeProductCatalogInput,
	saveProductCatalogItemImages,
	saveTreatmentProductCatalogItem,
	setProductCatalogItemHidden
} from '../repositories/product-catalog.repository.js';

export async function ensureTreatmentCatalogName(kind: TreatmentKind, value: string): Promise<TreatmentCatalogItem> {
	const { name, normalizedName } = normalizeProductCatalogInput(kind, value);
	return ensureTreatmentProductCatalogItem(kind, name, normalizedName);
}

export async function loadTreatmentCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	return listTreatmentProductCatalogItems(kind, includeHidden, includeImages);
}

export async function loadTreatmentCatalogItem(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem | null> {
	return getTreatmentProductCatalogItemById(id, includeHidden, includeImages);
}

export async function loadAllTreatmentCatalogItems(includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	return listTreatmentProductCatalogItems(null, includeHidden, includeImages);
}

export async function saveTreatmentCatalogName(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<TreatmentCatalogItem> {
	return saveTreatmentProductCatalogItem(kind, input, id);
}

export async function setTreatmentCatalogNameHidden(kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<TreatmentCatalogItem> {
	return setProductCatalogItemHidden(kind, id, hidden);
}

export async function saveTreatmentCatalogImages(kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	return saveProductCatalogItemImages(kind, id, images);
}

export async function removeTreatmentCatalogName(kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await deleteProductCatalogItem(kind, id);
}
