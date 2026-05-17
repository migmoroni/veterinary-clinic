import type { Country } from './types.js';

export const KEN = {
	"code": "KEN",
	"labels": {
		"pt-BR": "Quênia",
		"pt-PT": "Quénia",
		"es-ES": "Kenia",
		"es-419": "Kenia",
		"es-AR": "Kenia",
		"es-BO": "Kenia",
		"es-BR": "Kenia",
		"es-BZ": "Kenia",
		"es-CL": "Kenia",
		"es-CO": "Kenia",
		"es-CR": "Kenia",
		"es-CU": "Kenia",
		"es-DO": "Kenia",
		"es-EC": "Kenia",
		"es-GT": "Kenia",
		"es-HN": "Kenia",
		"es-MX": "Kenia",
		"es-NI": "Kenia",
		"es-PA": "Kenia",
		"es-PE": "Kenia",
		"es-PR": "Kenia",
		"es-PY": "Kenia",
		"es-SV": "Kenia",
		"es-US": "Kenia",
		"es-UY": "Kenia",
		"es-VE": "Kenia",
		"en-US": "Kenya",
		"fr-FR": "Kenya",
		"fr-BE": "Kenya",
		"fr-CA": "Kenya",
		"fr-CH": "Kenya",
		"fr-LU": "Kenya",
		"fr-MC": "Kenya",
		"it-IT": "Kenya",
		"it-CH": "Kenya",
		"it-SM": "Kenya",
		"it-VA": "Kenya",
		"de-DE": "Kenia",
		"de-AT": "Kenia",
		"de-CH": "Kenia",
		"de-BE": "Kenia",
		"de-LI": "Kenia",
		"de-LU": "Kenia"
	},
	"callingCode": "254",
	"phoneMasks": [
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
			"mask": "## #######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[24-6]"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[17]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[89]"
			]
		}
	]
} satisfies Country;
