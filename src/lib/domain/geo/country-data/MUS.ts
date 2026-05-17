import type { Country } from './types.js';

export const MUS = {
	"code": "MUS",
	"labels": {
		"pt-BR": "Maurício",
		"pt-PT": "Maurícia",
		"es-ES": "Mauricio",
		"es-419": "Mauricio",
		"es-AR": "Mauricio",
		"es-BO": "Mauricio",
		"es-BR": "Mauricio",
		"es-BZ": "Mauricio",
		"es-CL": "Mauricio",
		"es-CO": "Mauricio",
		"es-CR": "Mauricio",
		"es-CU": "Mauricio",
		"es-DO": "Mauricio",
		"es-EC": "Mauricio",
		"es-GT": "Mauricio",
		"es-HN": "Mauricio",
		"es-MX": "Mauricio",
		"es-NI": "Mauricio",
		"es-PA": "Mauricio",
		"es-PE": "Mauricio",
		"es-PR": "Mauricio",
		"es-PY": "Mauricio",
		"es-SV": "Mauricio",
		"es-US": "Mauricio",
		"es-UY": "Mauricio",
		"es-VE": "Mauricio",
		"en-US": "Mauritius",
		"fr-FR": "Maurice",
		"fr-BE": "Maurice",
		"fr-CA": "Maurice",
		"fr-CH": "Maurice",
		"fr-LU": "Maurice",
		"fr-MC": "Maurice",
		"it-IT": "Mauritius",
		"it-CH": "Mauritius",
		"it-SM": "Mauritius",
		"it-VA": "Mauritius",
		"de-DE": "Mauritius",
		"de-AT": "Mauritius",
		"de-CH": "Mauritius",
		"de-BE": "Mauritius",
		"de-LI": "Mauritius",
		"de-LU": "Mauritius"
	},
	"callingCode": "230",
	"phoneMasks": [
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[2-46]|8[013]"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[57]"
			]
		},
		{
			"mask": "##### #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
