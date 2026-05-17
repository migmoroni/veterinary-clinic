import type { Country } from './types.js';

export const USA = {
	"code": "USA",
	"labels": {
		"pt-BR": "Estados Unidos",
		"pt-PT": "Estados Unidos",
		"es-ES": "Estados Unidos",
		"es-419": "Estados Unidos",
		"es-AR": "Estados Unidos",
		"es-BO": "Estados Unidos",
		"es-BR": "Estados Unidos",
		"es-BZ": "Estados Unidos",
		"es-CL": "Estados Unidos",
		"es-CO": "Estados Unidos",
		"es-CR": "Estados Unidos",
		"es-CU": "Estados Unidos",
		"es-DO": "Estados Unidos",
		"es-EC": "Estados Unidos",
		"es-GT": "Estados Unidos",
		"es-HN": "Estados Unidos",
		"es-MX": "Estados Unidos",
		"es-NI": "Estados Unidos",
		"es-PA": "Estados Unidos",
		"es-PE": "Estados Unidos",
		"es-PR": "Estados Unidos",
		"es-PY": "Estados Unidos",
		"es-SV": "Estados Unidos",
		"es-US": "Estados Unidos",
		"es-UY": "Estados Unidos",
		"es-VE": "Estados Unidos",
		"en-US": "United States",
		"fr-FR": "États-Unis",
		"fr-BE": "États-Unis",
		"fr-CA": "États-Unis",
		"fr-CH": "États-Unis",
		"fr-LU": "États-Unis",
		"fr-MC": "États-Unis",
		"it-IT": "Stati Uniti",
		"it-CH": "Stati Uniti",
		"it-SM": "Stati Uniti",
		"it-VA": "Stati Uniti",
		"de-DE": "Vereinigte Staaten",
		"de-AT": "Vereinigte Staaten",
		"de-CH": "Vereinigte Staaten",
		"de-BE": "Vereinigte Staaten",
		"de-LI": "Vereinigte Staaten",
		"de-LU": "Vereinigte Staaten"
	},
	"callingCode": "1",
	"phoneMasks": [
		{
			"mask": "###-####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"310"
			]
		},
		{
			"mask": "(###) ###-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[2-9]"
			]
		}
	]
} satisfies Country;
