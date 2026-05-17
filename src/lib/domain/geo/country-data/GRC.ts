import type { Country } from './types.js';

export const GRC = {
	"code": "GRC",
	"labels": {
		"pt-BR": "Grécia",
		"pt-PT": "Grécia",
		"es-ES": "Grecia",
		"es-419": "Grecia",
		"es-AR": "Grecia",
		"es-BO": "Grecia",
		"es-BR": "Grecia",
		"es-BZ": "Grecia",
		"es-CL": "Grecia",
		"es-CO": "Grecia",
		"es-CR": "Grecia",
		"es-CU": "Grecia",
		"es-DO": "Grecia",
		"es-EC": "Grecia",
		"es-GT": "Grecia",
		"es-HN": "Grecia",
		"es-MX": "Grecia",
		"es-NI": "Grecia",
		"es-PA": "Grecia",
		"es-PE": "Grecia",
		"es-PR": "Grecia",
		"es-PY": "Grecia",
		"es-SV": "Grecia",
		"es-US": "Grecia",
		"es-UY": "Grecia",
		"es-VE": "Grecia",
		"en-US": "Greece",
		"fr-FR": "Grèce",
		"fr-BE": "Grèce",
		"fr-CA": "Grèce",
		"fr-CH": "Grèce",
		"fr-LU": "Grèce",
		"fr-MC": "Grèce",
		"it-IT": "Grecia",
		"it-CH": "Grecia",
		"it-SM": "Grecia",
		"it-VA": "Grecia",
		"de-DE": "Griechenland",
		"de-AT": "Griechenland",
		"de-CH": "Griechenland",
		"de-BE": "Griechenland",
		"de-LI": "Griechenland",
		"de-LU": "Griechenland"
	},
	"callingCode": "30",
	"phoneMasks": [
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"21|7"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[2689]"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:2|3[2-57-9]|4[2-469]|5[2-59]|6[2-9]|7[2-69]|8[2-49])|5"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "### #### #####",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
