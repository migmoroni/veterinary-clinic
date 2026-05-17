import type { Country } from './types.js';

export const VNM = {
	"code": "VNM",
	"labels": {
		"pt-BR": "Vietnã",
		"pt-PT": "Vietname",
		"es-ES": "Vietnam",
		"es-419": "Vietnam",
		"es-AR": "Vietnam",
		"es-BO": "Vietnam",
		"es-BR": "Vietnam",
		"es-BZ": "Vietnam",
		"es-CL": "Vietnam",
		"es-CO": "Vietnam",
		"es-CR": "Vietnam",
		"es-CU": "Vietnam",
		"es-DO": "Vietnam",
		"es-EC": "Vietnam",
		"es-GT": "Vietnam",
		"es-HN": "Vietnam",
		"es-MX": "Vietnam",
		"es-NI": "Vietnam",
		"es-PA": "Vietnam",
		"es-PE": "Vietnam",
		"es-PR": "Vietnam",
		"es-PY": "Vietnam",
		"es-SV": "Vietnam",
		"es-US": "Vietnam",
		"es-UY": "Vietnam",
		"es-VE": "Vietnam",
		"en-US": "Vietnam",
		"fr-FR": "Viêt Nam",
		"fr-BE": "Viêt Nam",
		"fr-CA": "Vietnam",
		"fr-CH": "Viêt Nam",
		"fr-LU": "Viêt Nam",
		"fr-MC": "Viêt Nam",
		"it-IT": "Vietnam",
		"it-CH": "Vietnam",
		"it-SM": "Vietnam",
		"it-VA": "Vietnam",
		"de-DE": "Vietnam",
		"de-AT": "Vietnam",
		"de-CH": "Vietnam",
		"de-BE": "Vietnam",
		"de-LI": "Vietnam",
		"de-LU": "Vietnam"
	},
	"callingCode": "84",
	"phoneMasks": [
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"80"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"6"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[357-9]"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2[48]"
			]
		},
		{
			"mask": "### #### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		}
	]
} satisfies Country;
