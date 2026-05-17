import type { Country } from './types.js';

export const SYR = {
	"code": "SYR",
	"labels": {
		"pt-BR": "Síria",
		"pt-PT": "Síria",
		"es-ES": "Siria",
		"es-419": "Siria",
		"es-AR": "Siria",
		"es-BO": "Siria",
		"es-BR": "Siria",
		"es-BZ": "Siria",
		"es-CL": "Siria",
		"es-CO": "Siria",
		"es-CR": "Siria",
		"es-CU": "Siria",
		"es-DO": "Siria",
		"es-EC": "Siria",
		"es-GT": "Siria",
		"es-HN": "Siria",
		"es-MX": "Siria",
		"es-NI": "Siria",
		"es-PA": "Siria",
		"es-PE": "Siria",
		"es-PR": "Siria",
		"es-PY": "Siria",
		"es-SV": "Siria",
		"es-US": "Siria",
		"es-UY": "Siria",
		"es-VE": "Siria",
		"en-US": "Syria",
		"fr-FR": "Syrie",
		"fr-BE": "Syrie",
		"fr-CA": "Syrie",
		"fr-CH": "Syrie",
		"fr-LU": "Syrie",
		"fr-MC": "Syrie",
		"it-IT": "Siria",
		"it-CH": "Siria",
		"it-SM": "Siria",
		"it-VA": "Siria",
		"de-DE": "Syrien",
		"de-AT": "Syrien",
		"de-CH": "Syrien",
		"de-BE": "Syrien",
		"de-LI": "Syrien",
		"de-LU": "Syrien"
	},
	"callingCode": "963",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[1-4]|5[1-3]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[59]"
			]
		}
	]
} satisfies Country;
