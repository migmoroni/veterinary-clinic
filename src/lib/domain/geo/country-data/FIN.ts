import type { Country } from './types.js';

export const FIN = {
	"code": "FIN",
	"labels": {
		"pt-BR": "Finlândia",
		"pt-PT": "Finlândia",
		"es-ES": "Finlandia",
		"es-419": "Finlandia",
		"es-AR": "Finlandia",
		"es-BO": "Finlandia",
		"es-BR": "Finlandia",
		"es-BZ": "Finlandia",
		"es-CL": "Finlandia",
		"es-CO": "Finlandia",
		"es-CR": "Finlandia",
		"es-CU": "Finlandia",
		"es-DO": "Finlandia",
		"es-EC": "Finlandia",
		"es-GT": "Finlandia",
		"es-HN": "Finlandia",
		"es-MX": "Finlandia",
		"es-NI": "Finlandia",
		"es-PA": "Finlandia",
		"es-PE": "Finlandia",
		"es-PR": "Finlandia",
		"es-PY": "Finlandia",
		"es-SV": "Finlandia",
		"es-US": "Finlandia",
		"es-UY": "Finlandia",
		"es-VE": "Finlandia",
		"en-US": "Finland",
		"fr-FR": "Finlande",
		"fr-BE": "Finlande",
		"fr-CA": "Finlande",
		"fr-CH": "Finlande",
		"fr-LU": "Finlande",
		"fr-MC": "Finlande",
		"it-IT": "Finlandia",
		"it-CH": "Finlandia",
		"it-SM": "Finlandia",
		"it-VA": "Finlandia",
		"de-DE": "Finnland",
		"de-AT": "Finnland",
		"de-CH": "Finnland",
		"de-BE": "Finnland",
		"de-LI": "Finnland",
		"de-LU": "Finnland"
	},
	"callingCode": "358",
	"phoneMasks": [
		{
			"mask": "#####",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"20[2-59]"
			]
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
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9
		},
		{
			"mask": "# #########",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"(?:19|[2568])[1-8]|3(?:0[1-9]|[1-9])|9"
			]
		},
		{
			"mask": "## ########",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[14]|2[09]|50|7[135]"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"(?:[1-3]0|[68])0|70[07-9]"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "## ##########",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"7"
			]
		}
	]
} satisfies Country;
