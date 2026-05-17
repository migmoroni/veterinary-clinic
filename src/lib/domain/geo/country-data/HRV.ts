import type { Country } from './types.js';

export const HRV = {
	"code": "HRV",
	"labels": {
		"pt-BR": "Croácia",
		"pt-PT": "Croácia",
		"es-ES": "Croacia",
		"es-419": "Croacia",
		"es-AR": "Croacia",
		"es-BO": "Croacia",
		"es-BR": "Croacia",
		"es-BZ": "Croacia",
		"es-CL": "Croacia",
		"es-CO": "Croacia",
		"es-CR": "Croacia",
		"es-CU": "Croacia",
		"es-DO": "Croacia",
		"es-EC": "Croacia",
		"es-GT": "Croacia",
		"es-HN": "Croacia",
		"es-MX": "Croacia",
		"es-NI": "Croacia",
		"es-PA": "Croacia",
		"es-PE": "Croacia",
		"es-PR": "Croacia",
		"es-PY": "Croacia",
		"es-SV": "Croacia",
		"es-US": "Croacia",
		"es-UY": "Croacia",
		"es-VE": "Croacia",
		"en-US": "Croatia",
		"fr-FR": "Croatie",
		"fr-BE": "Croatie",
		"fr-CA": "Croatie",
		"fr-CH": "Croatie",
		"fr-LU": "Croatie",
		"fr-MC": "Croatie",
		"it-IT": "Croazia",
		"it-CH": "Croazia",
		"it-SM": "Croazia",
		"it-VA": "Croazia",
		"de-DE": "Kroatien",
		"de-AT": "Kroatien",
		"de-CH": "Kroatien",
		"de-BE": "Kroatien",
		"de-LI": "Kroatien",
		"de-LU": "Kroatien"
	},
	"callingCode": "385",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "## ## ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"6[01]"
			]
		},
		{
			"mask": "# #### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6|7[245]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-57]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
