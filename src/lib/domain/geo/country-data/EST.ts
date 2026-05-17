import type { Country } from './types.js';

export const EST = {
	"code": "EST",
	"labels": {
		"pt-BR": "Estônia",
		"pt-PT": "Estónia",
		"es-ES": "Estonia",
		"es-419": "Estonia",
		"es-AR": "Estonia",
		"es-BO": "Estonia",
		"es-BR": "Estonia",
		"es-BZ": "Estonia",
		"es-CL": "Estonia",
		"es-CO": "Estonia",
		"es-CR": "Estonia",
		"es-CU": "Estonia",
		"es-DO": "Estonia",
		"es-EC": "Estonia",
		"es-GT": "Estonia",
		"es-HN": "Estonia",
		"es-MX": "Estonia",
		"es-NI": "Estonia",
		"es-PA": "Estonia",
		"es-PE": "Estonia",
		"es-PR": "Estonia",
		"es-PY": "Estonia",
		"es-SV": "Estonia",
		"es-US": "Estonia",
		"es-UY": "Estonia",
		"es-VE": "Estonia",
		"en-US": "Estonia",
		"fr-FR": "Estonie",
		"fr-BE": "Estonie",
		"fr-CA": "Estonie",
		"fr-CH": "Estonie",
		"fr-LU": "Estonie",
		"fr-MC": "Estonie",
		"it-IT": "Estonia",
		"it-CH": "Estonia",
		"it-SM": "Estonia",
		"it-VA": "Estonia",
		"de-DE": "Estland",
		"de-AT": "Estland",
		"de-CH": "Estland",
		"de-BE": "Estland",
		"de-LI": "Estland",
		"de-LU": "Estland"
	},
	"callingCode": "372",
	"phoneMasks": [
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[369]|4[3-8]|5(?:[0-2]|5[0-478]|6[45])|7[1-9]|88",
				"[369]|4[3-8]|5(?:[02]|1(?:[0-8]|95)|5[0-478]|6(?:4[0-4]|5[1-589]))|7[1-9]|88"
			]
		},
		{
			"mask": "## ## ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[45]|8(?:00|[1-49])",
				"[45]|8(?:00[1-9]|[1-49])"
			]
		},
		{
			"mask": "#### ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
