import type { Country } from './types.js';

export const OMN = {
	"code": "OMN",
	"labels": {
		"pt-BR": "Omã",
		"pt-PT": "Omã",
		"es-ES": "Omán",
		"es-419": "Omán",
		"es-AR": "Omán",
		"es-BO": "Omán",
		"es-BR": "Omán",
		"es-BZ": "Omán",
		"es-CL": "Omán",
		"es-CO": "Omán",
		"es-CR": "Omán",
		"es-CU": "Omán",
		"es-DO": "Omán",
		"es-EC": "Omán",
		"es-GT": "Omán",
		"es-HN": "Omán",
		"es-MX": "Omán",
		"es-NI": "Omán",
		"es-PA": "Omán",
		"es-PE": "Omán",
		"es-PR": "Omán",
		"es-PY": "Omán",
		"es-SV": "Omán",
		"es-US": "Omán",
		"es-UY": "Omán",
		"es-VE": "Omán",
		"en-US": "Oman",
		"fr-FR": "Oman",
		"fr-BE": "Oman",
		"fr-CA": "Oman",
		"fr-CH": "Oman",
		"fr-LU": "Oman",
		"fr-MC": "Oman",
		"it-IT": "Oman",
		"it-CH": "Oman",
		"it-SM": "Oman",
		"it-VA": "Oman",
		"de-DE": "Oman",
		"de-AT": "Oman",
		"de-CH": "Oman",
		"de-BE": "Oman",
		"de-LI": "Oman",
		"de-LU": "Oman"
	},
	"callingCode": "968",
	"phoneMasks": [
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7
		},
		{
			"mask": "## ######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2"
			]
		},
		{
			"mask": "#### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[179]"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[58]"
			]
		}
	]
} satisfies Country;
