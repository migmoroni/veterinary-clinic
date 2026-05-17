import type { Country } from './types.js';

export const NLD = {
	"code": "NLD",
	"labels": {
		"pt-BR": "Países Baixos",
		"pt-PT": "Países Baixos",
		"es-ES": "Países Bajos",
		"es-419": "Países Bajos",
		"es-AR": "Países Bajos",
		"es-BO": "Países Bajos",
		"es-BR": "Países Bajos",
		"es-BZ": "Países Bajos",
		"es-CL": "Países Bajos",
		"es-CO": "Países Bajos",
		"es-CR": "Países Bajos",
		"es-CU": "Países Bajos",
		"es-DO": "Países Bajos",
		"es-EC": "Países Bajos",
		"es-GT": "Países Bajos",
		"es-HN": "Países Bajos",
		"es-MX": "Países Bajos",
		"es-NI": "Países Bajos",
		"es-PA": "Países Bajos",
		"es-PE": "Países Bajos",
		"es-PR": "Países Bajos",
		"es-PY": "Países Bajos",
		"es-SV": "Países Bajos",
		"es-US": "Países Bajos",
		"es-UY": "Países Bajos",
		"es-VE": "Países Bajos",
		"en-US": "Netherlands",
		"fr-FR": "Pays-Bas",
		"fr-BE": "Pays-Bas",
		"fr-CA": "Pays-Bas",
		"fr-CH": "Pays-Bas",
		"fr-LU": "Pays-Bas",
		"fr-MC": "Pays-Bas",
		"it-IT": "Paesi Bassi",
		"it-CH": "Paesi Bassi",
		"it-SM": "Paesi Bassi",
		"it-VA": "Paesi Bassi",
		"de-DE": "Niederlande",
		"de-AT": "Niederlande",
		"de-CH": "Niederlande",
		"de-BE": "Niederlande",
		"de-LI": "Niederlande",
		"de-LU": "Niederlande"
	},
	"callingCode": "31",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "# ########",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[1-578]|91"
			]
		},
		{
			"mask": "## #######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"66"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1[16-8]|2[259]|3[124]|4[17-9]|5[124679]"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[89]0"
			]
		},
		{
			"mask": "### ### #####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"9"
			]
		}
	]
} satisfies Country;
