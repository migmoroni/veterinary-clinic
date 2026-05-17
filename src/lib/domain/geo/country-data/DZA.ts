import type { Country } from './types.js';

export const DZA = {
	"code": "DZA",
	"labels": {
		"pt-BR": "Argélia",
		"pt-PT": "Argélia",
		"es-ES": "Argelia",
		"es-419": "Argelia",
		"es-AR": "Argelia",
		"es-BO": "Argelia",
		"es-BR": "Argelia",
		"es-BZ": "Argelia",
		"es-CL": "Argelia",
		"es-CO": "Argelia",
		"es-CR": "Argelia",
		"es-CU": "Argelia",
		"es-DO": "Argelia",
		"es-EC": "Argelia",
		"es-GT": "Argelia",
		"es-HN": "Argelia",
		"es-MX": "Argelia",
		"es-NI": "Argelia",
		"es-PA": "Argelia",
		"es-PE": "Argelia",
		"es-PR": "Argelia",
		"es-PY": "Argelia",
		"es-SV": "Argelia",
		"es-US": "Argelia",
		"es-UY": "Argelia",
		"es-VE": "Argelia",
		"en-US": "Algeria",
		"fr-FR": "Algérie",
		"fr-BE": "Algérie",
		"fr-CA": "Algérie",
		"fr-CH": "Algérie",
		"fr-LU": "Algérie",
		"fr-MC": "Algérie",
		"it-IT": "Algeria",
		"it-CH": "Algeria",
		"it-SM": "Algeria",
		"it-VA": "Algeria",
		"de-DE": "Algerien",
		"de-AT": "Algerien",
		"de-CH": "Algerien",
		"de-BE": "Algerien",
		"de-LI": "Algerien",
		"de-LU": "Algerien"
	},
	"callingCode": "213",
	"phoneMasks": [
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[1-4]"
			]
		},
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[5-8]"
			]
		}
	]
} satisfies Country;
