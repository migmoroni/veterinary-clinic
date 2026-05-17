export const countryLabelLocales = [
	"pt-BR",
	"pt-PT",
	"gn-PY",
	"es-ES",
	"es-419",
	"es-AR",
	"es-BO",
	"es-BR",
	"es-BZ",
	"es-CL",
	"es-CO",
	"es-CR",
	"es-CU",
	"es-DO",
	"es-EC",
	"es-GT",
	"es-HN",
	"es-MX",
	"es-NI",
	"es-PA",
	"es-PE",
	"es-PR",
	"es-PY",
	"es-SV",
	"es-US",
	"es-UY",
	"es-VE",
	"en-US",
	"fr-FR",
	"fr-BE",
	"fr-CA",
	"fr-CH",
	"fr-LU",
	"fr-MC",
	"it-IT",
	"it-CH",
	"it-SM",
	"it-VA",
	"de-DE",
	"de-AT",
	"de-CH",
	"de-BE",
	"de-LI",
	"de-LU"
] as const;

export type CountryLabelLocale = 'pt-BR' | 'pt-PT' | 'gn-PY' | 'es-ES' | 'es-419' | 'es-AR' | 'es-BO' | 'es-BR' | 'es-BZ' | 'es-CL' | 'es-CO' | 'es-CR' | 'es-CU' | 'es-DO' | 'es-EC' | 'es-GT' | 'es-HN' | 'es-MX' | 'es-NI' | 'es-PA' | 'es-PE' | 'es-PR' | 'es-PY' | 'es-SV' | 'es-US' | 'es-UY' | 'es-VE' | 'en-US' | 'fr-FR' | 'fr-BE' | 'fr-CA' | 'fr-CH' | 'fr-LU' | 'fr-MC' | 'it-IT' | 'it-CH' | 'it-SM' | 'it-VA' | 'de-DE' | 'de-AT' | 'de-CH' | 'de-BE' | 'de-LI' | 'de-LU';

export interface Country {
	code: string;
	labels: Partial<Record<CountryLabelLocale, string>>;
}
