import type { ImageCollectionItem } from '@vet/types/domain/image-collection/image-collection.js';
import type { TranslationKey } from '@vet/types/i18n/index.js';
import { defaultBreedReferenceItems } from './default-breed-reference.js';
import type { KnownPetSpecies, PetBreedOption } from './taxonomy.js';

export type BreedSizeCategory = 'small' | 'medium' | 'large' | 'giant';
export type BreedReferenceSpecies = KnownPetSpecies;

export interface BreedSexRange {
	male: readonly [number, number];
	female: readonly [number, number];
}

export interface BreedReferenceOrigin {
	id: string;
	labelKey?: TranslationKey;
	countryCode?: string;
	latitude: number | null;
	longitude: number | null;
}

export const breedReferenceSectionIds = ['characteristics', 'morphology', 'behavior', 'diseases', 'references'] as const;

export type BreedReferenceSectionId = (typeof breedReferenceSectionIds)[number];
export type BreedReferenceSections = Partial<Record<BreedReferenceSectionId, string>>;

export interface BreedReferenceExtension {
	sections: BreedReferenceSections;
}

export const emptyBreedReferenceExtension: BreedReferenceExtension = {
	sections: {}
};

export interface BreedReferenceProfile {
	id: string | null;
	breedId: string;
	species: BreedReferenceSpecies;
	labelKey: TranslationKey;
	option: PetBreedOption;
	origin: BreedReferenceOrigin;
	sizeCategory: BreedSizeCategory;
	averageWeightKg: BreedSexRange;
	averageHeightCm: BreedSexRange;
	images: ImageCollectionItem[];
	primaryImage: ImageCollectionItem | null;
	extension: BreedReferenceExtension;
	updatedAt: string | null;
}

const equalEarth = {
	a1: 1.340264,
	a2: -0.081106,
	a3: 0.000893,
	a4: 0.003796,
	sqrt3: Math.sqrt(3),
	thetaMax: Math.asin(Math.sqrt(3) / 2)
} as const;

const equalEarthMaxX = projectEqualEarthX(0, Math.PI);
const equalEarthMaxY = projectEqualEarthY(equalEarth.thetaMax);

export const breedReferenceProfiles = defaultBreedReferenceItems.map((item) =>
	buildBreedReferenceProfile({
		id: null,
		breedId: item.id,
		species: item.species,
		labelKey: item.labelKey,
		origin: {
			id: item.origin.id,
			labelKey: item.origin.labelKey ?? undefined,
			countryCode: item.origin.countryCode ?? undefined,
			latitude: item.origin.latitude,
			longitude: item.origin.longitude
		},
		sizeCategory: item.sizeCategory,
		averageWeightKg: item.averageWeightKg,
		averageHeightCm: item.averageHeightCm,
		images: [],
		primaryImage: null,
		extension: normalizeBreedReferenceExtension(item.extension),
		updatedAt: null
	})
);

export function buildBreedReferenceProfile(input: Omit<BreedReferenceProfile, 'option'>): BreedReferenceProfile {
	return {
		...input,
		option: {
			id: input.breedId,
			species: input.species,
			labelKey: input.labelKey,
			imagePath: input.primaryImage ? '' : breedFallbackImagePath(input.species),
			fallbackImagePath: breedFallbackImagePath(input.species)
		}
	};
}

export function listBreedReferenceProfiles(): BreedReferenceProfile[] {
	return breedReferenceProfiles;
}

export function getBreedReferenceProfile(breedId: string | null | undefined): BreedReferenceProfile | null {
	if (!breedId) return null;
	return breedReferenceProfiles.find((profile) => profile.breedId === breedId) ?? null;
}

export function breedFallbackImagePath(species: BreedReferenceSpecies): string {
	return `/images/pet-taxonomy/breeds/${species}-placeholder.svg`;
}

export function getBreedOriginMapPosition(origin: BreedReferenceOrigin): { left: number; top: number } | null {
	if (origin.latitude === null || origin.longitude === null) return null;

	const projected = projectEqualEarth(origin.latitude, origin.longitude);

	return {
		left: clamp(((projected.x + equalEarthMaxX) / (equalEarthMaxX * 2)) * 100, 3, 97),
		top: clamp(((equalEarthMaxY - projected.y) / (equalEarthMaxY * 2)) * 100, 6, 94)
	};
}

export function parseBreedSexRange(value: string | null | undefined): BreedSexRange {
	if (!value) throw new Error('breed_reference_range_required');

	try {
		return normalizeBreedSexRange(JSON.parse(value));
	} catch {
		throw new Error('breed_reference_range_invalid');
	}
}

export function stringifyBreedSexRange(value: unknown): string {
	return JSON.stringify(normalizeBreedSexRange(value));
}

export function parseBreedReferenceExtension(value: string | null | undefined): BreedReferenceExtension {
	if (!value) return { ...emptyBreedReferenceExtension, sections: {} };

	try {
		return normalizeBreedReferenceExtension(JSON.parse(value));
	} catch {
		return { ...emptyBreedReferenceExtension, sections: {} };
	}
}

export function stringifyBreedReferenceExtension(value: unknown): string {
	return JSON.stringify(normalizeBreedReferenceExtension(value));
}

export function normalizeBreedReferenceExtension(value: unknown): BreedReferenceExtension {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...emptyBreedReferenceExtension, sections: {} };

	const source = value as Record<string, unknown>;
	return {
		sections: normalizedReferenceSections(source.sections)
	};
}

function normalizeBreedSexRange(value: unknown): BreedSexRange {
	if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('breed_reference_range_invalid');

	const source = value as Record<string, unknown>;
	return {
		male: normalizeNumericTuple(source.male),
		female: normalizeNumericTuple(source.female)
	};
}

function normalizeNumericTuple(value: unknown): readonly [number, number] {
	if (!Array.isArray(value) || value.length !== 2) throw new Error('breed_reference_range_invalid');
	const first = normalizePositiveNumber(value[0]);
	const second = normalizePositiveNumber(value[1]);
	if (first > second) throw new Error('breed_reference_range_invalid');
	return [first, second];
}

function normalizePositiveNumber(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('breed_reference_range_invalid');
	return value;
}

function normalizedNullableText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed ? trimmed : null;
}

function normalizedReferenceSections(value: unknown): BreedReferenceSections {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

	const source = value as Record<string, unknown>;
	const sections: BreedReferenceSections = {};

	for (const sectionId of breedReferenceSectionIds) {
		const text = normalizedNullableText(source[sectionId]);
		if (text) sections[sectionId] = text;
	}

	return sections;
}

function projectEqualEarth(latitude: number, longitude: number): { x: number; y: number } {
	const latitudeRadians = degreesToRadians(latitude);
	const longitudeRadians = degreesToRadians(longitude);
	const theta = Math.asin((equalEarth.sqrt3 / 2) * Math.sin(latitudeRadians));

	return {
		x: projectEqualEarthX(theta, longitudeRadians),
		y: projectEqualEarthY(theta)
	};
}

function projectEqualEarthX(theta: number, longitudeRadians: number): number {
	const thetaSquared = theta ** 2;
	const denominator = equalEarth.a1 + 3 * equalEarth.a2 * thetaSquared + 7 * equalEarth.a3 * theta ** 6 + 9 * equalEarth.a4 * theta ** 8;

	return (2 * equalEarth.sqrt3 * longitudeRadians * Math.cos(theta)) / (3 * denominator);
}

function projectEqualEarthY(theta: number): number {
	return equalEarth.a1 * theta + equalEarth.a2 * theta ** 3 + equalEarth.a3 * theta ** 7 + equalEarth.a4 * theta ** 9;
}

function degreesToRadians(value: number): number {
	return (value * Math.PI) / 180;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
