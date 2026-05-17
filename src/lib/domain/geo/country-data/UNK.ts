import type { Country } from './types.js';

export const UNK = {
	"code": "UNK",
	"labels": {
		"pt-BR": "Kosovo",
		"pt-PT": "Kosovo",
		"es-ES": "Kosovo",
		"es-419": "Kosovo",
		"es-AR": "Kosovo",
		"es-BO": "Kosovo",
		"es-BR": "Kosovo",
		"es-BZ": "Kosovo",
		"es-CL": "Kosovo",
		"es-CO": "Kosovo",
		"es-CR": "Kosovo",
		"es-CU": "Kosovo",
		"es-DO": "Kosovo",
		"es-EC": "Kosovo",
		"es-GT": "Kosovo",
		"es-HN": "Kosovo",
		"es-MX": "Kosovo",
		"es-NI": "Kosovo",
		"es-PA": "Kosovo",
		"es-PE": "Kosovo",
		"es-PR": "Kosovo",
		"es-PY": "Kosovo",
		"es-SV": "Kosovo",
		"es-US": "Kosovo",
		"es-UY": "Kosovo",
		"es-VE": "Kosovo",
		"en-US": "Kosovo",
		"fr-FR": "Kosovo",
		"fr-BE": "Kosovo",
		"fr-CA": "Kosovo",
		"fr-CH": "Kosovo",
		"fr-LU": "Kosovo",
		"fr-MC": "Kosovo",
		"it-IT": "Kosovo",
		"it-CH": "Kosovo",
		"it-SM": "Kosovo",
		"it-VA": "Kosovo",
		"de-DE": "Kosovo",
		"de-AT": "Kosovo",
		"de-CH": "Kosovo",
		"de-BE": "Kosovo",
		"de-LI": "Kosovo",
		"de-LU": "Kosovo"
	},
	"callingCode": "383",
	"phoneMasks": [
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[2-4]"
			]
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[89]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2|39"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "## ##########",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"3"
			]
		}
	]
} satisfies Country;
