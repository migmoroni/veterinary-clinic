import type { Country } from './types.js';

export const PAN = {
	"code": "PAN",
	"labels": {
		"pt-BR": "Panamá",
		"pt-PT": "Panamá",
		"es-ES": "Panamá",
		"es-419": "Panamá",
		"es-AR": "Panamá",
		"es-BO": "Panamá",
		"es-BR": "Panamá",
		"es-BZ": "Panamá",
		"es-CL": "Panamá",
		"es-CO": "Panamá",
		"es-CR": "Panamá",
		"es-CU": "Panamá",
		"es-DO": "Panamá",
		"es-EC": "Panamá",
		"es-GT": "Panamá",
		"es-HN": "Panamá",
		"es-MX": "Panamá",
		"es-NI": "Panamá",
		"es-PA": "Panamá",
		"es-PE": "Panamá",
		"es-PR": "Panamá",
		"es-PY": "Panamá",
		"es-SV": "Panamá",
		"es-US": "Panamá",
		"es-UY": "Panamá",
		"es-VE": "Panamá",
		"en-US": "Panama",
		"fr-FR": "Panama",
		"fr-BE": "Panama",
		"fr-CA": "Panama",
		"fr-CH": "Panama",
		"fr-LU": "Panama",
		"fr-MC": "Panama",
		"it-IT": "Panama",
		"it-CH": "Panama",
		"it-SM": "Panama",
		"it-VA": "Panama",
		"de-DE": "Panama",
		"de-AT": "Panama",
		"de-CH": "Panama",
		"de-BE": "Panama",
		"de-LI": "Panama",
		"de-LU": "Panama"
	},
	"callingCode": "507",
	"phoneMasks": [
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[1-57-9]"
			]
		},
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[68]"
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
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		}
	]
} satisfies Country;
