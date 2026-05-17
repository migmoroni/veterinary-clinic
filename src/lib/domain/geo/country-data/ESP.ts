import type { Country } from './types.js';

export const ESP = {
	"code": "ESP",
	"labels": {
		"pt-BR": "Espanha",
		"pt-PT": "Espanha",
		"es-ES": "España",
		"es-419": "España",
		"es-AR": "España",
		"es-BO": "España",
		"es-BR": "España",
		"es-BZ": "España",
		"es-CL": "España",
		"es-CO": "España",
		"es-CR": "España",
		"es-CU": "España",
		"es-DO": "España",
		"es-EC": "España",
		"es-GT": "España",
		"es-HN": "España",
		"es-MX": "España",
		"es-NI": "España",
		"es-PA": "España",
		"es-PE": "España",
		"es-PR": "España",
		"es-PY": "España",
		"es-SV": "España",
		"es-US": "España",
		"es-UY": "España",
		"es-VE": "España",
		"en-US": "Spain",
		"fr-FR": "Espagne",
		"fr-BE": "Espagne",
		"fr-CA": "Espagne",
		"fr-CH": "Espagne",
		"fr-LU": "Espagne",
		"fr-MC": "Espagne",
		"it-IT": "Spagna",
		"it-CH": "Spagna",
		"it-SM": "Spagna",
		"it-VA": "Spagna",
		"de-DE": "Spanien",
		"de-AT": "Spanien",
		"de-CH": "Spanien",
		"de-BE": "Spanien",
		"de-LI": "Spanien",
		"de-LU": "Spanien"
	},
	"callingCode": "34",
	"phoneMasks": [
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[5-9]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[89]00"
			]
		}
	]
} satisfies Country;
