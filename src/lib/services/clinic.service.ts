import type { CurrentRecordSummary } from '$lib/domain/medical-record/medical-record.js';
import type { OwnerAssociatedContact } from '$lib/domain/owner/owner.js';
import type { DashboardAnalytics } from '$lib/domain/dashboard/analytics.js';
import type { BreedReferenceProfile } from '$lib/domain/pet/breed-reference.js';
import { medicationLeafletSectionIds, type MedicationLeafletSectionId, type MedicationSpecies } from '$lib/domain/medication/catalog.js';
import type { TreatmentCatalogItem, TreatmentKind } from '$lib/domain/treatment/treatment.js';
import { hasDatabaseFile } from '$lib/native/database-file.js';
import { createEmptyDatabase, getDatabase } from '$lib/persistence/sqlite/client.js';
import { getLastEditedRecord } from '$lib/persistence/repositories/medical-record.repository.js';
import { listOwnerAssociatedContactsByOwnerIds } from '$lib/persistence/repositories/owner.repository.js';
import { filterActiveSearchResults as filterActiveSearchResultsRepository, searchClinic, type ClinicSearchResultKind, type SearchResult, type SearchResultKind } from '$lib/persistence/repositories/search.repository.js';
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
import { loadAllTreatmentCatalogItems } from './treatment.service.js';

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

	const clinicKinds = (['owner', 'pet'] as const).filter((kind): kind is ClinicSearchResultKind => shouldSearchKind(kind, kinds));
	const [clinicResults, breedResults, medicationResults] = await Promise.all([
		clinicKinds.length > 0 ? searchClinic(query, clinicKinds) : Promise.resolve([]),
		shouldSearchKind('breed', kinds) ? searchBreedReferences(query) : Promise.resolve([]),
		shouldSearchKind('medication', kinds) ? searchMedications(query) : Promise.resolve([])
	]);
	return [...clinicResults, ...breedResults, ...medicationResults].slice(0, 80);
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

function normalizeSearchText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function searchTerms(query: string): string[] {
	const normalized = normalizeSearchText(query);
	if (normalized.length < 2) return [];
	return normalized.split(/\s+/).filter((term) => term.length > 0);
}

function matchesSearch(text: string, query: string): boolean {
	const normalizedText = normalizeSearchText(text);
	return searchTerms(query).every((term) => normalizedText.includes(term));
}

function searchResultKey(result: SearchResult): string {
	return `${result.kind}:${result.id}:${result.href}`;
}

function isClinicSearchResult(result: SearchResult): boolean {
	return result.kind === 'owner' || result.kind === 'pet';
}

function shouldSearchKind(kind: SearchResultKind, selectedKinds: readonly SearchResultKind[]): boolean {
	return selectedKinds.length === 0 || selectedKinds.includes(kind);
}

function speciesLabel(species: MedicationSpecies): string {
	return species === 'canine' ? t('pet.speciesCanine') : t('pet.speciesFeline');
}

function speciesSummary(species: readonly MedicationSpecies[]): string {
	return species.map(speciesLabel).join(', ');
}

function medicationTypeLabel(kind: TreatmentKind): string {
	return kind === 'vaccine' ? t('protocol.kind.vaccine') : t('protocol.kind.antiparasitic');
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

function medicationSectionText(item: TreatmentCatalogItem, sectionId: MedicationLeafletSectionId): string {
	return item.extension.sections[sectionId]?.trim() ?? '';
}

function breedSearchText(profile: BreedReferenceProfile): string {
	return [
		t(profile.labelKey),
		profile.breedId,
		speciesLabel(profile.species),
		breedSizeLabel(profile.sizeCategory),
		breedOriginLabel(profile),
		...Object.values(profile.extension.sections)
	]
		.filter(Boolean)
		.join(' ');
}

function medicationSearchText(item: TreatmentCatalogItem): string {
	return [
		item.name,
		item.manufacturer,
		medicationTypeLabel(item.kind),
		speciesSummary(item.species),
		item.regions.map(regionLabel).join(' '),
		item.aliases.join(' '),
		item.extension.classification,
		item.extension.commercialLine,
		...medicationLeafletSectionIds.map((sectionId) => medicationSectionText(item, sectionId))
	]
		.filter(Boolean)
		.join(' ');
}

async function searchBreedReferences(query: string): Promise<SearchResult[]> {
	const profiles = await loadBreedReferenceProfiles(false);
	return profiles
		.filter((profile) => matchesSearch(breedSearchText(profile), query))
		.map((profile) => ({
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

async function searchMedications(query: string): Promise<SearchResult[]> {
	const items = await loadAllTreatmentCatalogItems(true, false);
	return items
		.filter((item) => matchesSearch(medicationSearchText(item), query))
		.map((item) => ({
			kind: 'medication',
			id: item.id,
			ownerId: null,
			petId: null,
			href: `/formulary/${item.id}`,
			title: item.name,
			subtitle: [medicationTypeLabel(item.kind), item.manufacturer].filter(Boolean).join(' · '),
			referenceImageBytes: null
		}));
}

async function activeReferenceResultKeys(results: SearchResult[]): Promise<Set<string>> {
	const referenceResults = results.filter((result) => result.kind === 'breed' || result.kind === 'medication');
	if (referenceResults.length === 0) return new Set<string>();

	const [profiles, medications] = await Promise.all([loadBreedReferenceProfiles(false), loadAllTreatmentCatalogItems(true, false)]);
	const breedIds = new Set(profiles.map((profile) => profile.breedId));
	const medicationIds = new Set(medications.map((item) => item.id));
	const activeKeys = new Set<string>();

	for (const result of referenceResults) {
		if (result.kind === 'breed' && breedIds.has(String(result.id))) activeKeys.add(searchResultKey(result));
		if (result.kind === 'medication' && typeof result.id === 'number' && medicationIds.has(result.id)) activeKeys.add(searchResultKey(result));
	}

	return activeKeys;
}
