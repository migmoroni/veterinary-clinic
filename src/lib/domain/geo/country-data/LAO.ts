import type { Country } from './types.js';

export const LAO = {
	"code": "LAO",
	"labels": {
		"pt-BR": "Laos",
		"pt-PT": "Laos",
		"es-ES": "Laos",
		"es-419": "Laos",
		"es-AR": "Laos",
		"es-BO": "Laos",
		"es-BR": "Laos",
		"es-BZ": "Laos",
		"es-CL": "Laos",
		"es-CO": "Laos",
		"es-CR": "Laos",
		"es-CU": "Laos",
		"es-DO": "Laos",
		"es-EC": "Laos",
		"es-GT": "Laos",
		"es-HN": "Laos",
		"es-MX": "Laos",
		"es-NI": "Laos",
		"es-PA": "Laos",
		"es-PE": "Laos",
		"es-PR": "Laos",
		"es-PY": "Laos",
		"es-SV": "Laos",
		"es-US": "Laos",
		"es-UY": "Laos",
		"es-VE": "Laos",
		"en-US": "Laos",
		"fr-FR": "Laos",
		"fr-BE": "Laos",
		"fr-CA": "Laos",
		"fr-CH": "Laos",
		"fr-LU": "Laos",
		"fr-MC": "Laos",
		"it-IT": "Laos",
		"it-CH": "Laos",
		"it-SM": "Laos",
		"it-VA": "Laos",
		"de-DE": "Laos",
		"de-AT": "Laos",
		"de-CH": "Laos",
		"de-BE": "Laos",
		"de-LI": "Laos",
		"de-LU": "Laos"
	},
	"callingCode": "856",
	"phoneMasks": [
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2[13]|3[14]|[4-8]"
			]
		},
		{
			"mask": "## ## ## ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"30[0135-9]"
			]
		},
		{
			"mask": "## ## ### ###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[23]"
			]
		}
	]
} satisfies Country;
