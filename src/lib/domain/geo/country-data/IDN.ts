import type { Country } from './types.js';

export const IDN = {
	"code": "IDN",
	"labels": {
		"pt-BR": "Indonésia",
		"pt-PT": "Indonésia",
		"es-ES": "Indonesia",
		"es-419": "Indonesia",
		"es-AR": "Indonesia",
		"es-BO": "Indonesia",
		"es-BR": "Indonesia",
		"es-BZ": "Indonesia",
		"es-CL": "Indonesia",
		"es-CO": "Indonesia",
		"es-CR": "Indonesia",
		"es-CU": "Indonesia",
		"es-DO": "Indonesia",
		"es-EC": "Indonesia",
		"es-GT": "Indonesia",
		"es-HN": "Indonesia",
		"es-MX": "Indonesia",
		"es-NI": "Indonesia",
		"es-PA": "Indonesia",
		"es-PE": "Indonesia",
		"es-PR": "Indonesia",
		"es-PY": "Indonesia",
		"es-SV": "Indonesia",
		"es-US": "Indonesia",
		"es-UY": "Indonesia",
		"es-VE": "Indonesia",
		"en-US": "Indonesia",
		"fr-FR": "Indonésie",
		"fr-BE": "Indonésie",
		"fr-CA": "Indonésie",
		"fr-CH": "Indonésie",
		"fr-LU": "Indonésie",
		"fr-MC": "Indonésie",
		"it-IT": "Indonesia",
		"it-CH": "Indonesia",
		"it-SM": "Indonesia",
		"it-VA": "Indonesia",
		"de-DE": "Indonesien",
		"de-AT": "Indonesien",
		"de-CH": "Indonesien",
		"de-BE": "Indonesien",
		"de-LI": "Indonesien",
		"de-LU": "Indonesien"
	},
	"callingCode": "62",
	"phoneMasks": [
		{
			"mask": "# ### ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"15"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "### # ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"80"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"804"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"800"
			]
		},
		{
			"mask": "###-####-###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8[1-35-9]"
			]
		},
		{
			"mask": "## #########",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"2[124]|[36]1"
			]
		},
		{
			"mask": "### ########",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"[2-79]"
			]
		},
		{
			"mask": "### ########",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "###-####-#####",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"8"
			]
		},
		{
			"mask": "# ### ### ### ###",
			"minLength": 13,
			"maxLength": 13
		},
		{
			"mask": "## ### ### ### ###",
			"minLength": 14,
			"maxLength": 14
		},
		{
			"mask": "### ### ### ### ###",
			"minLength": 15,
			"maxLength": 15
		},
		{
			"mask": "# ### ### ### ### ###",
			"minLength": 16,
			"maxLength": 16
		},
		{
			"mask": "## ### ### ### ### ###",
			"minLength": 17,
			"maxLength": 17
		}
	]
} satisfies Country;
