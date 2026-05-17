import type { Country } from './types.js';

export const SGP = {
	"code": "SGP",
	"labels": {
		"pt-BR": "Singapura",
		"pt-PT": "Singapura",
		"es-ES": "Singapur",
		"es-419": "Singapur",
		"es-AR": "Singapur",
		"es-BO": "Singapur",
		"es-BR": "Singapur",
		"es-BZ": "Singapur",
		"es-CL": "Singapur",
		"es-CO": "Singapur",
		"es-CR": "Singapur",
		"es-CU": "Singapur",
		"es-DO": "Singapur",
		"es-EC": "Singapur",
		"es-GT": "Singapur",
		"es-HN": "Singapur",
		"es-MX": "Singapur",
		"es-NI": "Singapur",
		"es-PA": "Singapur",
		"es-PE": "Singapur",
		"es-PR": "Singapur",
		"es-PY": "Singapur",
		"es-SV": "Singapur",
		"es-US": "Singapur",
		"es-UY": "Singapur",
		"es-VE": "Singapur",
		"en-US": "Singapore",
		"fr-FR": "Singapour",
		"fr-BE": "Singapour",
		"fr-CA": "Singapour",
		"fr-CH": "Singapour",
		"fr-LU": "Singapour",
		"fr-MC": "Singapour",
		"it-IT": "Singapore",
		"it-CH": "Singapore",
		"it-SM": "Singapore",
		"it-VA": "Singapore",
		"de-DE": "Singapur",
		"de-AT": "Singapur",
		"de-CH": "Singapur",
		"de-BE": "Singapur",
		"de-LI": "Singapur",
		"de-LU": "Singapur"
	},
	"callingCode": "65",
	"phoneMasks": [
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[369]|8(?:0[1-9]|[1-9])"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "#### #### ###",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"7"
			]
		}
	]
} satisfies Country;
