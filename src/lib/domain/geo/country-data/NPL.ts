import type { Country } from './types.js';

export const NPL = {
	"code": "NPL",
	"labels": {
		"pt-BR": "Nepal",
		"pt-PT": "Nepal",
		"es-ES": "Nepal",
		"es-419": "Nepal",
		"es-AR": "Nepal",
		"es-BO": "Nepal",
		"es-BR": "Nepal",
		"es-BZ": "Nepal",
		"es-CL": "Nepal",
		"es-CO": "Nepal",
		"es-CR": "Nepal",
		"es-CU": "Nepal",
		"es-DO": "Nepal",
		"es-EC": "Nepal",
		"es-GT": "Nepal",
		"es-HN": "Nepal",
		"es-MX": "Nepal",
		"es-NI": "Nepal",
		"es-PA": "Nepal",
		"es-PE": "Nepal",
		"es-PR": "Nepal",
		"es-PY": "Nepal",
		"es-SV": "Nepal",
		"es-US": "Nepal",
		"es-UY": "Nepal",
		"es-VE": "Nepal",
		"en-US": "Nepal",
		"fr-FR": "Népal",
		"fr-BE": "Népal",
		"fr-CA": "Népal",
		"fr-CH": "Népal",
		"fr-LU": "Népal",
		"fr-MC": "Népal",
		"it-IT": "Nepal",
		"it-CH": "Nepal",
		"it-SM": "Nepal",
		"it-VA": "Nepal",
		"de-DE": "Nepal",
		"de-AT": "Nepal",
		"de-CH": "Nepal",
		"de-BE": "Nepal",
		"de-LI": "Nepal",
		"de-LU": "Nepal"
	},
	"callingCode": "977",
	"phoneMasks": [
		{
			"mask": "#-#######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1[2-6]"
			]
		},
		{
			"mask": "##-######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1[01]|[2-8]|9(?:[1-59]|[67][2-6])"
			]
		},
		{
			"mask": "###-#######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		}
	]
} satisfies Country;
