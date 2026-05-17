import type { Country } from './types.js';

export const AUT = {
	"code": "AUT",
	"labels": {
		"pt-BR": "Áustria",
		"pt-PT": "Áustria",
		"es-ES": "Austria",
		"es-419": "Austria",
		"es-AR": "Austria",
		"es-BO": "Austria",
		"es-BR": "Austria",
		"es-BZ": "Austria",
		"es-CL": "Austria",
		"es-CO": "Austria",
		"es-CR": "Austria",
		"es-CU": "Austria",
		"es-DO": "Austria",
		"es-EC": "Austria",
		"es-GT": "Austria",
		"es-HN": "Austria",
		"es-MX": "Austria",
		"es-NI": "Austria",
		"es-PA": "Austria",
		"es-PE": "Austria",
		"es-PR": "Austria",
		"es-PY": "Austria",
		"es-SV": "Austria",
		"es-US": "Austria",
		"es-UY": "Austria",
		"es-VE": "Austria",
		"en-US": "Austria",
		"fr-FR": "Autriche",
		"fr-BE": "Autriche",
		"fr-CA": "Autriche",
		"fr-CH": "Autriche",
		"fr-LU": "Autriche",
		"fr-MC": "Autriche",
		"it-IT": "Austria",
		"it-CH": "Austria",
		"it-SM": "Austria",
		"it-VA": "Austria",
		"de-DE": "Österreich",
		"de-AT": "Österreich",
		"de-CH": "Österreich",
		"de-BE": "Österreich",
		"de-LI": "Österreich",
		"de-LU": "Österreich"
	},
	"callingCode": "43",
	"phoneMasks": [
		{
			"mask": "####",
			"minLength": 4,
			"maxLength": 4
		},
		{
			"mask": "### ##",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"517"
			]
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"5[079]"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"5"
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
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12
		},
		{
			"mask": "# ############",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"1(?:11|[2-9])"
			]
		},
		{
			"mask": "## #### #######",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"5"
			]
		},
		{
			"mask": "### ##########",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"(?:31|4)6|51|6(?:5[0-3579]|[6-9])|7(?:20|32|8)|[89]"
			]
		},
		{
			"mask": "#### #########",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"[2-467]|5[2-6]"
			]
		}
	]
} satisfies Country;
