import type { Country } from './types.js';

export const VUT = {
	"code": "VUT",
	"labels": {
		"pt-BR": "Vanuatu",
		"pt-PT": "Vanuatu",
		"es-ES": "Vanuatu",
		"es-419": "Vanuatu",
		"es-AR": "Vanuatu",
		"es-BO": "Vanuatu",
		"es-BR": "Vanuatu",
		"es-BZ": "Vanuatu",
		"es-CL": "Vanuatu",
		"es-CO": "Vanuatu",
		"es-CR": "Vanuatu",
		"es-CU": "Vanuatu",
		"es-DO": "Vanuatu",
		"es-EC": "Vanuatu",
		"es-GT": "Vanuatu",
		"es-HN": "Vanuatu",
		"es-MX": "Vanuatu",
		"es-NI": "Vanuatu",
		"es-PA": "Vanuatu",
		"es-PE": "Vanuatu",
		"es-PR": "Vanuatu",
		"es-PY": "Vanuatu",
		"es-SV": "Vanuatu",
		"es-US": "Vanuatu",
		"es-UY": "Vanuatu",
		"es-VE": "Vanuatu",
		"en-US": "Vanuatu",
		"fr-FR": "Vanuatu",
		"fr-BE": "Vanuatu",
		"fr-CA": "Vanuatu",
		"fr-CH": "Vanuatu",
		"fr-LU": "Vanuatu",
		"fr-MC": "Vanuatu",
		"it-IT": "Vanuatu",
		"it-CH": "Vanuatu",
		"it-SM": "Vanuatu",
		"it-VA": "Vanuatu",
		"de-DE": "Vanuatu",
		"de-AT": "Vanuatu",
		"de-CH": "Vanuatu",
		"de-BE": "Vanuatu",
		"de-LI": "Vanuatu",
		"de-LU": "Vanuatu"
	},
	"callingCode": "678",
	"phoneMasks": [
		{
			"mask": "## ###",
			"minLength": 5,
			"maxLength": 5
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[57-9]"
			]
		}
	]
} satisfies Country;
