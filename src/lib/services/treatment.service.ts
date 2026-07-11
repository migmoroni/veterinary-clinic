import type { ImageCollectionItemInput } from '$lib/domain/image-collection/image-collection.js';
import type { PetTreatment, PetTreatmentInput, TreatmentCatalogItem, TreatmentCatalogItemId, TreatmentCatalogItemInput, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { createTreatments, deleteTreatmentCatalogItem, getTreatmentCatalogItem, listTreatmentCatalogItems, saveTreatmentCatalogItem, saveTreatmentCatalogItemImages, setTreatmentCatalogItemHidden, setTreatmentValidityIgnored, softDeleteTreatment } from '$lib/persistence/repositories/treatment.repository.js';

export async function saveNewTreatments(kind: TreatmentKind, petId: number, inputs: PetTreatmentInput[]): Promise<PetTreatment[]> {
	return createTreatments(kind, petId, inputs);
}

export async function removeTreatment(kind: TreatmentKind, id: number): Promise<void> {
	await softDeleteTreatment(kind, id);
}

export async function setTreatmentValidity(kind: TreatmentKind, treatmentId: number, ignored: boolean): Promise<PetTreatment> {
	return setTreatmentValidityIgnored(kind, treatmentId, ignored);
}

export async function loadTreatmentCatalogItems(kind: TreatmentKind | null = null, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	return listTreatmentCatalogItems(kind, includeHidden, includeImages);
}

export async function loadTreatmentCatalogItem(id: TreatmentCatalogItemId, includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem | null> {
	return getTreatmentCatalogItem(id, includeHidden, includeImages);
}

export async function loadAllTreatmentCatalogItems(includeHidden = false, includeImages = true): Promise<TreatmentCatalogItem[]> {
	return listTreatmentCatalogItems(null, includeHidden, includeImages);
}

export async function saveTreatmentCatalogName(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: TreatmentCatalogItemId): Promise<TreatmentCatalogItem> {
	return saveTreatmentCatalogItem(kind, input, id);
}

export async function setTreatmentCatalogNameHidden(kind: TreatmentKind, id: TreatmentCatalogItemId, hidden: boolean): Promise<TreatmentCatalogItem> {
	return setTreatmentCatalogItemHidden(kind, id, hidden);
}

export async function saveTreatmentCatalogImages(kind: TreatmentKind, id: TreatmentCatalogItemId, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	return saveTreatmentCatalogItemImages(kind, id, images);
}

export async function removeTreatmentCatalogName(kind: TreatmentKind, id: TreatmentCatalogItemId): Promise<void> {
	await deleteTreatmentCatalogItem(kind, id);
}
