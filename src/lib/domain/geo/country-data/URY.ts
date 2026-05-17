import type { Country } from './types.js';

export const URY = {
	"code": "URY",
	"labels": {
		"pt-BR": "Uruguai",
		"pt-PT": "Uruguai",
		"es-ES": "Uruguay",
		"es-419": "Uruguay",
		"es-AR": "Uruguay",
		"es-BO": "Uruguay",
		"es-BR": "Uruguay",
		"es-BZ": "Uruguay",
		"es-CL": "Uruguay",
		"es-CO": "Uruguay",
		"es-CR": "Uruguay",
		"es-CU": "Uruguay",
		"es-DO": "Uruguay",
		"es-EC": "Uruguay",
		"es-GT": "Uruguay",
		"es-HN": "Uruguay",
		"es-MX": "Uruguay",
		"es-NI": "Uruguay",
		"es-PA": "Uruguay",
		"es-PE": "Uruguay",
		"es-PR": "Uruguay",
		"es-PY": "Uruguay",
		"es-SV": "Uruguay",
		"es-US": "Uruguay",
		"es-UY": "Uruguay",
		"es-VE": "Uruguay",
		"en-US": "Uruguay",
		"fr-FR": "Uruguay",
		"fr-BE": "Uruguay",
		"fr-CA": "Uruguay",
		"fr-CH": "Uruguay",
		"fr-LU": "Uruguay",
		"fr-MC": "Uruguay",
		"it-IT": "Uruguay",
		"it-CH": "Uruguay",
		"it-SM": "Uruguay",
		"it-VA": "Uruguay",
		"de-DE": "Uruguay",
		"de-AT": "Uruguay",
		"de-CH": "Uruguay",
		"de-BE": "Uruguay",
		"de-LI": "Uruguay",
		"de-LU": "Uruguay"
	},
	"callingCode": "598",
	"phoneMasks": [
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"0"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[49]0|8"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"9"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[124]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"0"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "### ### ### ####",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"0"
			]
		}
	]
} satisfies Country;
