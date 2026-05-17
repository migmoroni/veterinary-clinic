import type { Country } from './types.js';

export const RUS = {
	"code": "RUS",
	"labels": {
		"pt-BR": "Rússia",
		"pt-PT": "Rússia",
		"es-ES": "Rusia",
		"es-419": "Rusia",
		"es-AR": "Rusia",
		"es-BO": "Rusia",
		"es-BR": "Rusia",
		"es-BZ": "Rusia",
		"es-CL": "Rusia",
		"es-CO": "Rusia",
		"es-CR": "Rusia",
		"es-CU": "Rusia",
		"es-DO": "Rusia",
		"es-EC": "Rusia",
		"es-GT": "Rusia",
		"es-HN": "Rusia",
		"es-MX": "Rusia",
		"es-NI": "Rusia",
		"es-PA": "Rusia",
		"es-PE": "Rusia",
		"es-PR": "Rusia",
		"es-PY": "Rusia",
		"es-SV": "Rusia",
		"es-US": "Rusia",
		"es-UY": "Rusia",
		"es-VE": "Rusia",
		"en-US": "Russia",
		"fr-FR": "Russie",
		"fr-BE": "Russie",
		"fr-CA": "Russie",
		"fr-CH": "Russie",
		"fr-LU": "Russie",
		"fr-MC": "Russie",
		"it-IT": "Russia",
		"it-CH": "Russia",
		"it-SM": "Russia",
		"it-VA": "Russia",
		"de-DE": "Russland",
		"de-AT": "Russland",
		"de-CH": "Russland",
		"de-BE": "Russland",
		"de-LI": "Russland",
		"de-LU": "Russland"
	},
	"callingCode": "7",
	"phoneMasks": [
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "### ###-##-##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[349]|8(?:[02-7]|1[1-8])"
			]
		},
		{
			"mask": "#### ## ## ##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"7(?:1[0-8]|2[1-9])",
				"7(?:1(?:[0-356]2|4[29]|7|8[27])|2(?:1[23]|[2-9]2))",
				"7(?:1(?:[0-356]2|4[29]|7|8[27])|2(?:13[03-69]|62[013-9]))|72[1-57-9]2"
			]
		},
		{
			"mask": "##### # ## ##",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"7(?:1[0-68]|2[1-9])",
				"7(?:1(?:[06][3-6]|[18]|2[35]|[3-5][3-5])|2(?:[13][3-5]|[24-689]|7[457]))",
				"7(?:1(?:0(?:[356]|4[023])|[18]|2(?:3[013-9]|5)|3[45]|43[013-79]|5(?:3[1-8]|4[1-7]|5)|6(?:3[0-35-9]|[4-6]))|2(?:1(?:3[178]|[45])|[24-689]|3[35]|7[457]))|7(?:14|23)4[0-8]|71(?:33|45)[1-79]"
			]
		},
		{
			"mask": "#### #### ### ###",
			"minLength": 14,
			"maxLength": 14,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
