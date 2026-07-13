import type { CurrentRecordSummary } from '$lib/domain/medical-record/medical-record.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import type { DashboardAnalytics } from '$lib/domain/dashboard/analytics.js';
import { activeIngredientTypeSubtype, type ActiveIngredientCatalogItem } from '$lib/domain/active-ingredient/catalog.js';
import type { ManufacturerCatalogItem } from '$lib/domain/manufacturer/catalog.js';
import type { BreedReferenceProfile } from '$lib/domain/pet/breed-reference.js';
import { productLeafletSectionIds, type ProductCatalogItem, type ProductLeafletSectionId, type ProductSpecies } from '$lib/domain/product/catalog.js';
import { productTypeLabel } from '$lib/domain/product/type-labels.js';
import { CLINIC_SEARCH_RESULT_KINDS, isClinicSearchResultKind, isReferenceSearchResultKind, type ClinicSearchResultKind, type SearchResult, type SearchResultKind } from '$lib/domain/search/search.js';
import { normalizeSearchText, searchTermsForLocale } from '$lib/domain/shared/search-terms.js';
import { hasDatabaseFile } from '$lib/native/database-file.js';
import { createEmptyDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { getLastEditedRecord } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnerAssociatedContactsByOwnerIds } from '$lib/persistence/repositories/owner.repository.js';
import { filterActiveSearchResults as filterActiveSearchResultsRepository, searchClinic } from '$lib/persistence/repositories/search.repository.js';
import { getClinicCounts } from '$lib/persistence/repositories/stats.repository.js';
import { countryOptions } from '$lib/domain/geo/location.js';
import type { TreatmentHistoryPoint } from '$lib/domain/treatment/analytics.js';
import type { TreatmentAnalyticsOverview } from '$lib/persistence/repositories/treatment-analytics.repository.js';
import { i18n, t, type TranslationKey } from '$lib/i18n/index.js';
import { loadBreedReferenceProfiles } from './breed-reference.service.js';
import { loadLocalePreference } from './preferences.service.js';
import { importDatabase } from './database-import.service.js';
import { shouldResetOverviewLastRecordOnce } from './client-state.service.js';
import { loadTreatmentAnalyticsOverview, loadTreatmentHistory } from './treatment-analytics.service.js';
import { loadDashboardAnalytics } from './dashboard-analytics.service.js';
import { requestPracticeIdentityRefresh } from './practice-profile.service.js';
import { loadCatalogActiveIngredients, loadCatalogManufacturers, loadCatalogProducts } from './catalog.service.js';

export { loadOwnerAvatarsByOwnerIds, loadPetAvatarsByPetIds } from './avatar.service.js';

export interface ClinicTreatmentDashboard extends TreatmentAnalyticsOverview {
	history: TreatmentHistoryPoint[];
}

export interface ClinicDashboard {
	record: CurrentRecordSummary | null;
	counts: {
		owners: number;
		pets: number;
		records: number;
	};
	vaccines: ClinicTreatmentDashboard;
	antiparasitics: ClinicTreatmentDashboard;
	analytics: DashboardAnalytics;
}

interface SearchScoreFields {
	primary: readonly string[];
	support?: readonly string[];
	metadata?: readonly string[];
	details?: readonly string[];
}

export async function initializeClinic(): Promise<void> {
	await getDatabase();
	await loadLocalePreference();
}

export async function hasClinicDatabase(): Promise<boolean> {
	return hasDatabaseFile();
}

export async function createNewClinicDatabase(): Promise<void> {
	await createEmptyDatabase();
	requestPracticeIdentityRefresh();
}

export async function importClinicDatabase(title: string): Promise<boolean> {
	const result = await importDatabase(title);
	if (result) requestPracticeIdentityRefresh();
	return result !== null;
}

export async function loadDashboard(): Promise<ClinicDashboard> {
	const [record, counts, vaccineOverview, vaccineHistory, antiparasiticOverview, antiparasiticHistory, analytics] = await Promise.all([
		getLastEditedRecord(),
		getClinicCounts(),
		loadTreatmentAnalyticsOverview('vaccine'),
		loadTreatmentHistory('vaccine', { period: 'month', normalizedName: null }),
		loadTreatmentAnalyticsOverview('antiparasitic'),
		loadTreatmentHistory('antiparasitic', { period: 'month', normalizedName: null }),
		loadDashboardAnalytics()
	]);
	return {
		record: shouldResetOverviewLastRecordOnce() ? null : record,
		counts,
		vaccines: { ...vaccineOverview, history: vaccineHistory },
		antiparasitics: { ...antiparasiticOverview, history: antiparasiticHistory },
		analytics
	};
}

export async function searchEverywhere(query: string, kinds: readonly SearchResultKind[] = []): Promise<SearchResult[]> {
	if (searchTerms(query).length === 0) return [];

	const clinicKinds = CLINIC_SEARCH_RESULT_KINDS.filter((kind): kind is ClinicSearchResultKind => shouldSearchKind(kind, kinds));
	const [clinicResults, breedResults, productResults, manufacturerResults, activeIngredientResults] = await Promise.all([
		clinicKinds.length > 0 ? searchClinic(query, clinicKinds, i18n.locale) : Promise.resolve([]),
		shouldSearchKind('breed', kinds) ? searchBreedReferences(query) : Promise.resolve([]),
		shouldSearchKind('product', kinds) ? searchProducts(query) : Promise.resolve([]),
		shouldSearchKind('manufacturer', kinds) ? searchManufacturers(query) : Promise.resolve([]),
		shouldSearchKind('activeIngredient', kinds) ? searchActiveIngredients(query) : Promise.resolve([])
	]);
	return [...clinicResults, ...breedResults, ...productResults, ...manufacturerResults, ...activeIngredientResults].slice(0, 80);
}

export async function filterActiveSearchResults(results: SearchResult[]): Promise<SearchResult[]> {
	const [clinicResults, activeReferenceKeys] = await Promise.all([filterActiveSearchResultsRepository(results.filter(isClinicSearchResult)), activeReferenceResultKeys(results)]);
	const activeClinicKeys = new Set(clinicResults.map(searchResultKey));

	return results.filter((result) => (isClinicSearchResult(result) ? activeClinicKeys.has(searchResultKey(result)) : activeReferenceKeys.has(searchResultKey(result))));
}

export async function loadOwnerAssociatedContactsByOwnerIds(ownerIds: number[]): Promise<Map<number, OwnerAssociatedContact[]>> {
	const uniqueIds = [...new Set(ownerIds)].filter((id) => Number.isFinite(id));
	if (uniqueIds.length === 0) return new Map<number, OwnerAssociatedContact[]>();

	return listOwnerAssociatedContactsByOwnerIds(uniqueIds);
}

function searchTerms(query: string): string[] {
	return searchTermsForLocale(query, i18n.locale);
}

function scoreNormalizedField(value: string, term: string, exactScore: number, prefixScore: number, containsScore: number): number {
	const normalized = normalizeSearchText(value);
	if (!normalized) return 0;

	const words = normalized.split(/\s+/);
	if (words.includes(term)) return exactScore;
	if (words.some((word) => word.startsWith(term))) return prefixScore;
	if (normalized.includes(term)) return containsScore;

	return 0;
}

function maxFieldScore(values: readonly string[] | undefined, term: string, exactScore: number, prefixScore: number, containsScore: number): number {
	return Math.max(0, ...(values ?? []).map((value) => scoreNormalizedField(value, term, exactScore, prefixScore, containsScore)));
}

function scoreSearchFields(fields: SearchScoreFields, terms: readonly string[]): number {
	if (terms.length === 0) return 0;

	let score = 0;
	for (const term of terms) {
		const termScore = Math.max(
			maxFieldScore(fields.primary, term, 100, 90, 75),
			maxFieldScore(fields.support, term, 80, 70, 55),
			maxFieldScore(fields.metadata, term, 35, 30, 20),
			maxFieldScore(fields.details, term, 20, 15, 10)
		);

		if (termScore === 0) return 0;
		score += termScore;
	}

	return score;
}

function acceptsReferenceScore(score: number, terms: readonly string[]): boolean {
	if (score <= 0 || terms.length === 0) return false;
	const averageScore = score / terms.length;
	return terms.length === 1 ? averageScore >= 55 : averageScore >= 25;
}

function searchResultKey(result: SearchResult): string {
	return `${result.kind}:${result.id}:${result.href}`;
}

function isClinicSearchResult(result: SearchResult): result is SearchResult & { kind: ClinicSearchResultKind } {
	return isClinicSearchResultKind(result.kind);
}

function shouldSearchKind(kind: SearchResultKind, selectedKinds: readonly SearchResultKind[]): boolean {
	return selectedKinds.length === 0 || selectedKinds.includes(kind);
}

function speciesLabel(species: ProductSpecies): string {
	return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
}

function speciesSummary(species: readonly ProductSpecies[]): string {
	return species.map(speciesLabel).join(', ');
}

function productCatalogTypeLabel(item: ProductCatalogItem): string {
	return productTypeLabel(item.type, t);
}

function breedSizeLabel(size: BreedReferenceProfile['sizeCategory']): string {
	return t(`breedReference.size.${size}` as TranslationKey);
}

function breedOriginLabel(profile: BreedReferenceProfile): string {
	if (profile.origin.labelKey) return t(profile.origin.labelKey);
	return profile.origin.id;
}

function regionLabel(region: string): string {
	return countryOptions(i18n.locale).find((country) => country.value === region)?.label ?? region;
}

function productSectionText(item: ProductCatalogItem, sectionId: ProductLeafletSectionId): string {
	return item.extension.sections[sectionId]?.trim() ?? '';
}

function manufacturerSectionText(item: ManufacturerCatalogItem): string[] {
	return Object.values(item.extension.sections).map((text) => text?.trim() ?? '');
}

function activeIngredientSectionText(item: ActiveIngredientCatalogItem): string[] {
	return Object.values(item.extension.sections).map((text) => text?.trim() ?? '');
}

function breedSearchScore(profile: BreedReferenceProfile, terms: readonly string[]): number {
	return scoreSearchFields(
		{
			primary: [t(profile.labelKey), profile.breedId],
			support: [breedOriginLabel(profile)],
			metadata: [speciesLabel(profile.species), breedSizeLabel(profile.sizeCategory)],
			details: Object.values(profile.extension.sections)
		},
		terms
	);
}

function productSearchScore(item: ProductCatalogItem, terms: readonly string[]): number {
	return scoreSearchFields(
		{
			primary: [item.name, String(item.id), ...item.aliases],
			support: [item.manufacturerName ?? '', ...item.activeIngredients.map((ingredient) => ingredient.name), productCatalogTypeLabel(item), item.extension.classification ?? '', item.extension.commercialLine ?? ''],
			metadata: [speciesSummary(item.species), item.regions.map(regionLabel).join(' ')],
			details: productLeafletSectionIds.map((sectionId) => productSectionText(item, sectionId))
		},
		terms
	);
}

function manufacturerSearchScore(item: ManufacturerCatalogItem, terms: readonly string[]): number {
	return scoreSearchFields(
		{
			primary: [item.name, String(item.id), ...item.aliases],
			support: [t('catalog.manufacturer'), item.extension.website ?? ''],
			metadata: [item.regions.map(regionLabel).join(' ')],
			details: manufacturerSectionText(item)
		},
		terms
	);
}

function activeIngredientTypeLabel(item: ActiveIngredientCatalogItem): string {
	return activeIngredientTypeSubtype(item.type) === 'combination' ? t('catalog.activeIngredient.type.combination') : t('catalog.activeIngredient.type.substance');
}

function activeIngredientSearchScore(item: ActiveIngredientCatalogItem, terms: readonly string[]): number {
	return scoreSearchFields(
		{
			primary: [item.name, String(item.id), ...item.aliases],
			support: [t('catalog.activeIngredient'), activeIngredientTypeLabel(item), item.extension.classification ?? ''],
			metadata: [item.regions.map(regionLabel).join(' ')],
			details: activeIngredientSectionText(item)
		},
		terms
	);
}

async function searchBreedReferences(query: string): Promise<SearchResult[]> {
	const terms = searchTerms(query);
	const profiles = await loadBreedReferenceProfiles(false);
	return profiles
		.map((profile) => ({ profile, score: breedSearchScore(profile, terms) }))
		.filter(({ score }) => acceptsReferenceScore(score, terms))
		.sort((first, second) => second.score - first.score || t(first.profile.labelKey).localeCompare(t(second.profile.labelKey)))
		.map(({ profile }) => ({
			kind: 'breed',
			id: profile.breedId,
			ownerId: null,
			petId: null,
			href: `/breeds/${profile.breedId}`,
			title: t(profile.labelKey),
			subtitle: `${speciesLabel(profile.species)} · ${breedSizeLabel(profile.sizeCategory)}`,
			referenceImageBytes: null
		}));
}

async function searchProducts(query: string): Promise<SearchResult[]> {
	const terms = searchTerms(query);
	const items = await loadCatalogProducts(true, false);
	return items
		.map((item) => ({ item, score: productSearchScore(item, terms) }))
		.filter(({ score }) => acceptsReferenceScore(score, terms))
		.sort((first, second) => second.score - first.score || first.item.name.localeCompare(second.item.name))
		.map(({ item }) => ({
			kind: 'product',
			id: item.id,
			ownerId: null,
			petId: null,
			href: `/formulary/products/${item.id}`,
			title: item.name,
			subtitle: [productCatalogTypeLabel(item), item.manufacturerName].filter(Boolean).join(' · '),
			referenceImageBytes: null
		}));
}

async function searchManufacturers(query: string): Promise<SearchResult[]> {
	const terms = searchTerms(query);
	const items = await loadCatalogManufacturers(true, false);
	return items
		.map((item) => ({ item, score: manufacturerSearchScore(item, terms) }))
		.filter(({ score }) => acceptsReferenceScore(score, terms))
		.sort((first, second) => second.score - first.score || first.item.name.localeCompare(second.item.name))
		.map(({ item }) => ({
			kind: 'manufacturer',
			id: item.id,
			ownerId: null,
			petId: null,
			href: `/formulary/manufacturers/${item.id}`,
			title: item.name,
			subtitle: t('catalog.manufacturer'),
			referenceImageBytes: null
		}));
}

async function searchActiveIngredients(query: string): Promise<SearchResult[]> {
	const terms = searchTerms(query);
	const items = await loadCatalogActiveIngredients(true, false);
	return items
		.map((item) => ({ item, score: activeIngredientSearchScore(item, terms) }))
		.filter(({ score }) => acceptsReferenceScore(score, terms))
		.sort((first, second) => second.score - first.score || first.item.name.localeCompare(second.item.name))
		.map(({ item }) => ({
			kind: 'activeIngredient',
			id: item.id,
			ownerId: null,
			petId: null,
			href: `/formulary/active-ingredients/${item.id}`,
			title: item.name,
			subtitle: [t('catalog.activeIngredient'), activeIngredientTypeLabel(item)].join(' · '),
			referenceImageBytes: null
		}));
}

async function activeReferenceResultKeys(results: SearchResult[]): Promise<Set<string>> {
	const referenceResults = results.filter((result) => isReferenceSearchResultKind(result.kind));
	if (referenceResults.length === 0) return new Set<string>();

	const [profiles, products, manufacturers, activeIngredients] = await Promise.all([
		loadBreedReferenceProfiles(false),
		loadCatalogProducts(true, false),
		loadCatalogManufacturers(true, false),
		loadCatalogActiveIngredients(true, false)
	]);
	const breedIds = new Set(profiles.map((profile) => profile.breedId));
	const productIds = new Set(products.map((item) => item.id));
	const manufacturerIds = new Set(manufacturers.map((item) => item.id));
	const activeIngredientIds = new Set(activeIngredients.map((item) => item.id));
	const activeKeys = new Set<string>();

	for (const result of referenceResults) {
		if (result.kind === 'breed' && breedIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'product' && productIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'manufacturer' && manufacturerIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'activeIngredient' && activeIngredientIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
	}

	return activeKeys;
}
