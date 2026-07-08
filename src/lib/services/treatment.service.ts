import type { ImageCollectionItemInput } from '$lib/domain/image-collection/image-collection.js';
import { TREATMENT_KINDS, type PetTreatment, type PetTreatmentInput, type TreatmentCatalogItem, type TreatmentCatalogItemInput, type TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { createTreatments, deleteTreatmentCatalogItem, listTreatmentCatalogItems, saveTreatmentCatalogItem, saveTreatmentCatalogItemImages, setTreatmentCatalogItemHidden, setTreatmentValidityIgnored, softDeleteTreatment } from '$lib/persistence/repositories/treatment.repository.js';

export async function saveNewTreatments(kind: TreatmentKind, petId: number, inputs: PetTreatmentInput[]): Promise<PetTreatment[]> {
	return createTreatments(kind, petId, inputs);
}

export async function removeTreatment(kind: TreatmentKind, id: number): Promise<void> {
	await softDeleteTreatment(kind, id);
}

export async function setTreatmentValidity(kind: TreatmentKind, treatmentId: number, ignored: boolean): Promise<PetTreatment> {
	return setTreatmentValidityIgnored(kind, treatmentId, ignored);
}

export async function loadTreatmentCatalogItems(kind: TreatmentKind, includeHidden = false): Promise<TreatmentCatalogItem[]> {
	return listTreatmentCatalogItems(kind, includeHidden);
}

export async function loadAllTreatmentCatalogItems(includeHidden = false): Promise<TreatmentCatalogItem[]> {
	const itemsByKind = await Promise.all(TREATMENT_KINDS.map((kind) => listTreatmentCatalogItems(kind, includeHidden)));
	return itemsByKind.flat().sort((first, second) => first.name.localeCompare(second.name));
}

export async function saveTreatmentCatalogName(kind: TreatmentKind, input: TreatmentCatalogItemInput, id?: number): Promise<TreatmentCatalogItem> {
	return saveTreatmentCatalogItem(kind, input, id);
}

export async function setTreatmentCatalogNameHidden(kind: TreatmentKind, id: number, hidden: boolean): Promise<TreatmentCatalogItem> {
	return setTreatmentCatalogItemHidden(kind, id, hidden);
}

export async function saveTreatmentCatalogImages(kind: TreatmentKind, id: number, images: ImageCollectionItemInput[]): Promise<TreatmentCatalogItem> {
	return saveTreatmentCatalogItemImages(kind, id, images);
}

export async function removeTreatmentCatalogName(kind: TreatmentKind, id: number): Promise<void> {
	await deleteTreatmentCatalogItem(kind, id);
}
