import type { Country } from './types.js';

export const SVK = {
	"code": "SVK",
	"labels": {
		"pt-BR": "Eslováquia",
		"pt-PT": "Eslováquia",
		"es-ES": "Eslovaquia",
		"es-419": "Eslovaquia",
		"es-AR": "Eslovaquia",
		"es-BO": "Eslovaquia",
		"es-BR": "Eslovaquia",
		"es-BZ": "Eslovaquia",
		"es-CL": "Eslovaquia",
		"es-CO": "Eslovaquia",
		"es-CR": "Eslovaquia",
		"es-CU": "Eslovaquia",
		"es-DO": "Eslovaquia",
		"es-EC": "Eslovaquia",
		"es-GT": "Eslovaquia",
		"es-HN": "Eslovaquia",
		"es-MX": "Eslovaquia",
		"es-NI": "Eslovaquia",
		"es-PA": "Eslovaquia",
		"es-PE": "Eslovaquia",
		"es-PR": "Eslovaquia",
		"es-PY": "Eslovaquia",
		"es-SV": "Eslovaquia",
		"es-US": "Eslovaquia",
		"es-UY": "Eslovaquia",
		"es-VE": "Eslovaquia",
		"en-US": "Slovakia",
		"fr-FR": "Slovaquie",
		"fr-BE": "Slovaquie",
		"fr-CA": "Slovaquie",
		"fr-CH": "Slovaquie",
		"fr-LU": "Slovaquie",
		"fr-MC": "Slovaquie",
		"it-IT": "Slovacchia",
		"it-CH": "Slovacchia",
		"it-SM": "Slovacchia",
		"it-VA": "Slovacchia",
		"de-DE": "Slowakei",
		"de-AT": "Slowakei",
		"de-CH": "Slowakei",
		"de-BE": "Slowakei",
		"de-LI": "Slowakei",
		"de-LU": "Slowakei"
	},
	"callingCode": "421",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "# ## ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"21"
			]
		},
		{
			"mask": "## ## ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[3-5][1-8]1",
				"[3-5][1-8]1[67]"
			]
		},
		{
			"mask": "#/### ### ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "##/### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[3-5]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[689]"
			]
		}
	]
} satisfies Country;
