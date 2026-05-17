import type { Country } from './types.js';

export const MNG = {
	"code": "MNG",
	"labels": {
		"pt-BR": "Mongólia",
		"pt-PT": "Mongólia",
		"es-ES": "Mongolia",
		"es-419": "Mongolia",
		"es-AR": "Mongolia",
		"es-BO": "Mongolia",
		"es-BR": "Mongolia",
		"es-BZ": "Mongolia",
		"es-CL": "Mongolia",
		"es-CO": "Mongolia",
		"es-CR": "Mongolia",
		"es-CU": "Mongolia",
		"es-DO": "Mongolia",
		"es-EC": "Mongolia",
		"es-GT": "Mongolia",
		"es-HN": "Mongolia",
		"es-MX": "Mongolia",
		"es-NI": "Mongolia",
		"es-PA": "Mongolia",
		"es-PE": "Mongolia",
		"es-PR": "Mongolia",
		"es-PY": "Mongolia",
		"es-SV": "Mongolia",
		"es-US": "Mongolia",
		"es-UY": "Mongolia",
		"es-VE": "Mongolia",
		"en-US": "Mongolia",
		"fr-FR": "Mongolie",
		"fr-BE": "Mongolie",
		"fr-CA": "Mongolie",
		"fr-CH": "Mongolie",
		"fr-LU": "Mongolie",
		"fr-MC": "Mongolie",
		"it-IT": "Mongolia",
		"it-CH": "Mongolia",
		"it-SM": "Mongolia",
		"it-VA": "Mongolia",
		"de-DE": "Mongolei",
		"de-AT": "Mongolei",
		"de-CH": "Mongolei",
		"de-BE": "Mongolei",
		"de-LI": "Mongolei",
		"de-LU": "Mongolei"
	},
	"callingCode": "976",
	"phoneMasks": [
		{
			"mask": "## ## ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[12]1"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[5-9]"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[12]2[1-3]"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[12](?:27|3[2-8]|4[2-68]|5[1-4689])",
				"[12](?:27|3[2-8]|4[2-68]|5[1-4689])[0-3]"
			]
		},
		{
			"mask": "##### #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[12]"
			]
		}
	]
} satisfies Country;
