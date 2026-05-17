import { brazilCities, brazilStates, type BrazilCity } from './brazil-data.js';
import { countries, type Country, type CountryLabelLocale } from './country-data/index.js';

export const BRAZIL_COUNTRY_VALUE = 'BRA';
export const BRAZIL_COUNTRY_CODE = 'BRA';
export const DEFAULT_BRAZIL_STATE_CODE = 'SP';

export interface LocationOption {
	value: string;
	label: string;
}

function nullable(value: string | null | undefined): string | null {
	const trimmed = value?.trim() ?? '';
	return trimmed.length > 0 ? trimmed : null;
}

export function normalizeLocationKey(value: string | null | undefined): string {
	return (value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

function cleanCityValue(value: string): string {
	return value.replace(/\s+-\s*[A-Z]{2}\s*$/i, '').replace(/\s+/g, ' ').trim();
}

const countryByCode = new Map(countries.map((country) => [country.code, country]));
const stateByCode = new Map(brazilStates.map((state) => [state.code, state]));
const citiesByState = new Map<string, BrazilCity[]>();
const cityByStateAndKey = new Map<string, BrazilCity>();
const citiesByKey = new Map<string, BrazilCity[]>();

for (const city of brazilCities) {
	const stateCities = citiesByState.get(city.stateCode) ?? [];
	stateCities.push(city);
	citiesByState.set(city.stateCode, stateCities);

	const key = normalizeLocationKey(city.name);
	cityByStateAndKey.set(`${city.stateCode}:${key}`, city);

	const matchingCities = citiesByKey.get(key) ?? [];
	matchingCities.push(city);
	citiesByKey.set(key, matchingCities);
}

function preferredCity(cities: BrazilCity[]): BrazilCity | null {
	return cities.find((city) => city.stateCode === DEFAULT_BRAZIL_STATE_CODE) ?? cities[0] ?? null;
}

function countryLabel(country: Country, locale: string = 'pt-BR'): string {
	const labelLocale = locale as CountryLabelLocale;
	const labels = country.labels;
	if (labels[labelLocale]) return labels[labelLocale];
	if (locale === 'gn-PY') return labels['es-PY'] ?? labels['es-419'] ?? labels['es-ES'] ?? labels['pt-BR'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('es')) return labels['es-419'] ?? labels['es-ES'] ?? labels['pt-BR'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('fr')) return labels['fr-FR'] ?? labels['pt-BR'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('it')) return labels['it-IT'] ?? labels['pt-BR'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('de')) return labels['de-DE'] ?? labels['pt-BR'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('pt')) return labels['pt-BR'] ?? labels['pt-PT'] ?? labels['en-US'] ?? country.code;
	if (locale.startsWith('en')) return labels['en-US'] ?? labels['pt-BR'] ?? country.code;

	return labels['pt-BR'] ?? labels['en-US'] ?? country.code;
}

export function countryOptions(locale = 'pt-BR'): LocationOption[] {
	return countries
		.map((country) => ({ value: country.code, label: countryLabel(country, locale) }))
		.sort((left, right) => left.label.localeCompare(right.label, locale) || left.value.localeCompare(right.value));
}

export function brazilStateOptions(): LocationOption[] {
	return brazilStates.map((state) => ({ value: state.code, label: `${state.code} - ${state.name}` }));
}

export function brazilCityOptions(stateCode: string | null | undefined): LocationOption[] {
	const state = normalizeBrazilStateCode(stateCode);
	if (!state) return [];

	return (citiesByState.get(state) ?? []).map((city) => ({ value: city.name, label: city.name }));
}

export function normalizeOwnerCountry(value: string | null | undefined): string | null {
	const raw = nullable(value);
	if (!raw) return BRAZIL_COUNTRY_VALUE;

	const code = raw.toUpperCase();
	return countryByCode.has(code) ? code : null;
}

export function isBrazilCountry(value: string | null | undefined): boolean {
	return normalizeOwnerCountry(value) === BRAZIL_COUNTRY_VALUE;
}

export function countryHasStructuredLocations(value: string | null | undefined): boolean {
	return isBrazilCountry(value);
}

export function normalizeBrazilStateCode(value: string | null | undefined): string | null {
	const raw = nullable(value);
	if (!raw) return null;

	const code = raw.toUpperCase();
	const stateByExactCode = stateByCode.get(code);
	if (stateByExactCode) return stateByExactCode.code;

	return null;
}

export function inferBrazilStateCodeFromCity(city: string | null | undefined): string | null {
	const raw = nullable(city);
	if (!raw) return null;

	const matchingCities = citiesByKey.get(normalizeLocationKey(cleanCityValue(raw))) ?? [];
	return preferredCity(matchingCities)?.stateCode ?? null;
}

export function normalizeOwnerState(value: string | null | undefined, country: string | null | undefined = BRAZIL_COUNTRY_VALUE, city: string | null | undefined = null): string | null {
	if (!isBrazilCountry(country)) return nullable(value);

	const state = normalizeBrazilStateCode(value);
	return state ?? inferBrazilStateCodeFromCity(city);
}

export function normalizeOwnerCity(value: string | null | undefined, country: string | null | undefined = BRAZIL_COUNTRY_VALUE, state: string | null | undefined = null): string | null {
	if (!isBrazilCountry(country)) return nullable(value);

	const raw = nullable(value);
	if (!raw) return null;

	const key = normalizeLocationKey(cleanCityValue(raw));
	const stateCode = normalizeBrazilStateCode(state);
	if (stateCode) return cityByStateAndKey.get(`${stateCode}:${key}`)?.name ?? null;

	return preferredCity(citiesByKey.get(key) ?? [])?.name ?? null;
}

export function isKnownOwnerCountry(value: string | null | undefined): boolean {
	return normalizeOwnerCountry(value) !== null;
}

export function isKnownOwnerState(value: string | null | undefined, country: string | null | undefined = BRAZIL_COUNTRY_VALUE): boolean {
	if (!isBrazilCountry(country)) return true;
	return nullable(value) === null || normalizeOwnerState(value, country) !== null;
}

export function isKnownOwnerCity(value: string | null | undefined, country: string | null | undefined = BRAZIL_COUNTRY_VALUE, state: string | null | undefined = null): boolean {
	if (!isBrazilCountry(country)) return true;
	return nullable(value) === null || normalizeOwnerCity(value, country, state) !== null;
}
