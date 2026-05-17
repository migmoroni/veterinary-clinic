import type { Country } from './types.js';

export const ITA = {
	"code": "ITA",
	"labels": {
		"pt-BR": "Itália",
		"pt-PT": "Itália",
		"es-ES": "Italia",
		"es-419": "Italia",
		"es-AR": "Italia",
		"es-BO": "Italia",
		"es-BR": "Italia",
		"es-BZ": "Italia",
		"es-CL": "Italia",
		"es-CO": "Italia",
		"es-CR": "Italia",
		"es-CU": "Italia",
		"es-DO": "Italia",
		"es-EC": "Italia",
		"es-GT": "Italia",
		"es-HN": "Italia",
		"es-MX": "Italia",
		"es-NI": "Italia",
		"es-PA": "Italia",
		"es-PE": "Italia",
		"es-PR": "Italia",
		"es-PY": "Italia",
		"es-SV": "Italia",
		"es-US": "Italia",
		"es-UY": "Italia",
		"es-VE": "Italia",
		"en-US": "Italy",
		"fr-FR": "Italie",
		"fr-BE": "Italie",
		"fr-CA": "Italie",
		"fr-CH": "Italie",
		"fr-LU": "Italie",
		"fr-MC": "Italie",
		"it-IT": "Italia",
		"it-CH": "Italia",
		"it-SM": "Italia",
		"it-VA": "Italia",
		"de-DE": "Italien",
		"de-AT": "Italien",
		"de-CH": "Italien",
		"de-BE": "Italien",
		"de-LI": "Italien",
		"de-LU": "Italien"
	},
	"callingCode": "39",
	"phoneMasks": [
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
			"mask": "## ######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"0[26]"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"894"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"0[13-57-9][0159]|8(?:03|4[17]|9[2-5])",
				"0[13-57-9][0159]|8(?:03|4[17]|9(?:2|3[04]|[45][0-4]))"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"0[26]|5"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1(?:44|[679])|[378]|43"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"0(?:[13-579][2-46-8]|8[236-8])"
			]
		},
		{
			"mask": "## #### #####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"0[26]"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"0[13-57-9][0159]|14"
			]
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"0"
			]
		},
		{
			"mask": "### #### #####",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"3"
			]
		}
	]
} satisfies Country;
