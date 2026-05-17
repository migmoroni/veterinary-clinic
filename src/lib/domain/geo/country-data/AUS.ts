import type { Country } from './types.js';

export const AUS = {
	"code": "AUS",
	"labels": {
		"pt-BR": "Austrália",
		"pt-PT": "Austrália",
		"es-ES": "Australia",
		"es-419": "Australia",
		"es-AR": "Australia",
		"es-BO": "Australia",
		"es-BR": "Australia",
		"es-BZ": "Australia",
		"es-CL": "Australia",
		"es-CO": "Australia",
		"es-CR": "Australia",
		"es-CU": "Australia",
		"es-DO": "Australia",
		"es-EC": "Australia",
		"es-GT": "Australia",
		"es-HN": "Australia",
		"es-MX": "Australia",
		"es-NI": "Australia",
		"es-PA": "Australia",
		"es-PE": "Australia",
		"es-PR": "Australia",
		"es-PY": "Australia",
		"es-SV": "Australia",
		"es-US": "Australia",
		"es-UY": "Australia",
		"es-VE": "Australia",
		"en-US": "Australia",
		"fr-FR": "Australie",
		"fr-BE": "Australie",
		"fr-CA": "Australie",
		"fr-CH": "Australie",
		"fr-LU": "Australie",
		"fr-MC": "Australie",
		"it-IT": "Australia",
		"it-CH": "Australia",
		"it-SM": "Australia",
		"it-VA": "Australia",
		"de-DE": "Australien",
		"de-AT": "Australien",
		"de-CH": "Australien",
		"de-BE": "Australien",
		"de-LI": "Australien",
		"de-LU": "Australien"
	},
	"callingCode": "61",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
		{
			"mask": "## ####",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"16"
			]
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
			"mask": "# #### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2378]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"16"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"14|4"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1(?:30|[89])"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		}
	]
} satisfies Country;
