import { brazilCities, brazilStates, type BrazilCity } from './brazil-data.js';
import { countries, type Country, type CountryLabelLocale, type CountryPhoneMask } from './country-data/index.js';

export const BRAZIL_COUNTRY_VALUE = 'BRA';
export const BRAZIL_COUNTRY_CODE = 'BRA';
export const DEFAULT_BRAZIL_STATE_CODE = 'SP';

export interface LocationOption {
	value: string;
	label: string;
}

export interface CountryPhoneFormat {
	countryCode: string;
	callingCode: string;
	phoneMasks: readonly CountryPhoneMask[];
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

const countryList: readonly Country[] = countries;
const countryByCode = new Map<string, Country>(countryList.map((country) => [country.code, country]));
const callingCodes = [...new Set(countryList.map((country) => country.callingCode).filter((code): code is string => Boolean(code)))].sort((left, right) => right.length - left.length || left.localeCompare(right));
const phoneFormats: readonly CountryPhoneFormat[] = countryList
	.filter((country) => Boolean(country.callingCode))
	.map((country) => ({ countryCode: country.code, callingCode: country.callingCode as string, phoneMasks: country.phoneMasks ?? [] }));
const phoneFormatByCountryCode = new Map<string, CountryPhoneFormat>(phoneFormats.map((format) => [format.countryCode, format]));
const stateByCode = new Map(brazilStates.map((state) => [state.code, state]));
const citiesByState = new Map<string, BrazilCity[]>();
const cityByStateAndKey = new Map<string, BrazilCity>();
const citiesByKey = new Map<string, BrazilCity[]>();

const countryLabelFallbackLocales: Partial<Record<string, readonly CountryLabelLocale[]>> = {
	gn: ['es-PY', 'es-419', 'es-ES'],
	ay: ['es-419', 'es-ES'],
	qu: ['es-419', 'es-ES'],
	chr: ['en-US'],
	lkt: ['en-US'],
	kl: ['da-DK', 'en-GB', 'en-US'],
	hi: ['hi-IN'],
	bn: ['bn-IN', 'bn-BD'],
	ta: ['ta-IN', 'ta-LK', 'ta-SG', 'ta-MY'],
	te: ['te-IN'],
	mr: ['mr-IN'],
	gu: ['gu-IN'],
	kn: ['kn-IN'],
	ml: ['ml-IN'],
	pa: ['pa-IN'],
	ur: ['ur-IN', 'ur-PK'],
	or: ['or-IN'],
	as: ['as-IN'],
	ne: ['ne-IN', 'ne-NP'],
	si: ['si-LK'],
	kok: ['kok-IN'],
	sd: ['sd-IN'],
	ks: ['ks-IN'],
	doi: ['doi-IN'],
	mni: ['mni-IN'],
	brx: ['brx-IN'],
	sat: ['sat-IN'],
	mai: ['mai-IN'],
	sa: ['sa-IN'],
	dz: ['dz-BT'],
	ja: ['ja-JP'],
	ko: ['ko-KR', 'ko-KP'],
	zh: ['zh-CN', 'zh-Hans-CN', 'zh-Hant-TW', 'zh-TW', 'zh-HK', 'zh-MO', 'zh-SG'],
	yue: ['yue-Hant-HK', 'yue-Hans-CN', 'zh-Hant-TW', 'zh-HK', 'zh-CN'],
	mn: ['mn-MN'],
	bo: ['bo-CN', 'bo-IN'],
	ug: ['ug-CN'],
	ii: ['ii-CN'],
	th: ['th-TH'],
	lo: ['lo-LA'],
	km: ['km-KH'],
	my: ['my-MM'],
	vi: ['vi-VN'],
	id: ['id-ID'],
	ms: ['ms-MY', 'ms-SG', 'ms-BN'],
	jv: ['jv-ID'],
	su: ['su-ID'],
	fil: ['fil-PH'],
	ceb: ['ceb-PH'],
	ka: ['ka-GE'],
	hy: ['hy-AM'],
	az: ['az-AZ', 'az-Cyrl-AZ'],
	kk: ['kk-KZ'],
	ky: ['ky-KG'],
	uz: ['uz-UZ'],
	tg: ['tg-TJ'],
	tk: ['tk-TM'],
	fa: ['fa-IR', 'fa-AF'],
	ps: ['ps-AF', 'ps-PK'],
	he: ['he-IL'],
	ar: ['ar-SA', 'ar-AE', 'ar-QA', 'ar-BH', 'ar-KW', 'ar-OM', 'ar-YE', 'ar-IQ', 'ar-JO', 'ar-LB', 'ar-SY', 'ar-PS'],
	en: ['en-GB', 'en-US'],
	pt: ['pt-PT', 'pt-BR'],
	es: ['es-419', 'es-ES'],
	fr: ['fr-FR', 'fr-BE', 'fr-CH'],
	it: ['it-IT', 'it-CH'],
	de: ['de-DE', 'de-AT', 'de-CH'],
	nl: ['nl-NL', 'nl-BE'],
	sv: ['sv-SE', 'sv-FI'],
	da: ['da-DK'],
	no: ['nb-NO', 'nn-NO'],
	nb: ['nb-NO'],
	nn: ['nn-NO', 'nb-NO'],
	fi: ['fi-FI'],
	is: ['is-IS'],
	fo: ['fo-FO'],
	et: ['et-EE'],
	lv: ['lv-LV'],
	lt: ['lt-LT'],
	pl: ['pl-PL'],
	cs: ['cs-CZ'],
	sk: ['sk-SK'],
	sl: ['sl-SI'],
	hr: ['hr-HR'],
	bs: ['bs-BA'],
	sr: ['sr-RS', 'sr-BA', 'sr-ME'],
	mk: ['mk-MK'],
	bg: ['bg-BG'],
	be: ['be-BY'],
	uk: ['uk-UA'],
	ru: ['ru-RU'],
	el: ['el-GR', 'el-CY'],
	ro: ['ro-RO', 'ro-MD'],
	hu: ['hu-HU'],
	sq: ['sq-AL', 'sq-XK'],
	mt: ['mt-MT'],
	ga: ['ga-IE'],
	cy: ['cy-GB'],
	gd: ['gd-GB'],
	lb: ['lb-LU'],
	ca: ['ca-ES', 'ca-AD', 'ca-FR', 'ca-IT'],
	eu: ['eu-ES', 'eu-FR'],
	gl: ['gl-ES'],
	tr: ['tr-TR', 'tr-CY']
};

function countryLabelFallbacks(locale: string, language: string): readonly CountryLabelLocale[] {
	const normalizedLocale = locale.toLowerCase();
	if (normalizedLocale.startsWith('zh-hant')) return ['zh-Hant-TW', 'zh-TW', 'zh-HK', 'zh-MO', 'zh-CN', 'zh-Hans-CN', 'zh-SG'];
	if (normalizedLocale.startsWith('zh-hans')) return ['zh-Hans-CN', 'zh-CN', 'zh-SG', 'zh-Hant-TW', 'zh-TW'];
	if (normalizedLocale.startsWith('yue-hant')) return ['yue-Hant-HK', 'zh-Hant-TW', 'zh-HK', 'zh-TW', 'zh-CN'];
	if (normalizedLocale.startsWith('yue-hans')) return ['yue-Hans-CN', 'zh-Hans-CN', 'zh-CN', 'yue-Hant-HK'];

	return countryLabelFallbackLocales[language] ?? [];
}

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

	const language = locale.split('-')[0]?.toLowerCase() ?? '';
	const languageFallbacks = countryLabelFallbacks(locale, language);
	const fallbackLocales: CountryLabelLocale[] = [...languageFallbacks, 'pt-BR', 'en-GB', 'en-US'];
	for (const fallbackLocale of fallbackLocales) {
		if (labels[fallbackLocale]) return labels[fallbackLocale];
	}

	return country.code;
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

export function countryCallingCode(value: string | null | undefined): string | null {
	const country = normalizeOwnerCountry(value);
	if (!country) return null;

	return countryByCode.get(country)?.callingCode ?? null;
}

export function countryCallingCodes(): string[] {
	return [...callingCodes];
}

export function countryPhoneFormat(value: string | null | undefined): CountryPhoneFormat | null {
	const country = normalizeOwnerCountry(value);
	if (!country) return null;

	return phoneFormatByCountryCode.get(country) ?? null;
}

export function countryPhoneFormats(): CountryPhoneFormat[] {
	return [...phoneFormats];
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
