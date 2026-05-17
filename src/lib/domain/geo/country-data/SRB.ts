import type { Country } from './types.js';

export const SRB = {
	"code": "SRB",
	"labels": {
		"pt-BR": "Sérvia",
		"pt-PT": "Sérvia",
		"es-ES": "Serbia",
		"es-419": "Serbia",
		"es-AR": "Serbia",
		"es-BO": "Serbia",
		"es-BR": "Serbia",
		"es-BZ": "Serbia",
		"es-CL": "Serbia",
		"es-CO": "Serbia",
		"es-CR": "Serbia",
		"es-CU": "Serbia",
		"es-DO": "Serbia",
		"es-EC": "Serbia",
		"es-GT": "Serbia",
		"es-HN": "Serbia",
		"es-MX": "Serbia",
		"es-NI": "Serbia",
		"es-PA": "Serbia",
		"es-PE": "Serbia",
		"es-PR": "Serbia",
		"es-PY": "Serbia",
		"es-SV": "Serbia",
		"es-US": "Serbia",
		"es-UY": "Serbia",
		"es-VE": "Serbia",
		"en-US": "Serbia",
		"fr-FR": "Serbie",
		"fr-BE": "Serbie",
		"fr-CA": "Serbie",
		"fr-CH": "Serbie",
		"fr-LU": "Serbie",
		"fr-MC": "Serbie",
		"it-IT": "Serbia",
		"it-CH": "Serbia",
		"it-SM": "Serbia",
		"it-VA": "Serbia",
		"de-DE": "Serbien",
		"de-AT": "Serbien",
		"de-CH": "Serbien",
		"de-BE": "Serbien",
		"de-LI": "Serbien",
		"de-LU": "Serbien"
	},
	"callingCode": "381",
	"phoneMasks": [
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
			"mask": "## ##########",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"[1-36]"
			]
		},
		{
			"mask": "### #########",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"(?:2[389]|39)0|[7-9]"
			]
		}
	]
} satisfies Country;
