import type { Country } from './types.js';

export const ISR = {
	"code": "ISR",
	"labels": {
		"pt-BR": "Israel",
		"pt-PT": "Israel",
		"es-ES": "Israel",
		"es-419": "Israel",
		"es-AR": "Israel",
		"es-BO": "Israel",
		"es-BR": "Israel",
		"es-BZ": "Israel",
		"es-CL": "Israel",
		"es-CO": "Israel",
		"es-CR": "Israel",
		"es-CU": "Israel",
		"es-DO": "Israel",
		"es-EC": "Israel",
		"es-GT": "Israel",
		"es-HN": "Israel",
		"es-MX": "Israel",
		"es-NI": "Israel",
		"es-PA": "Israel",
		"es-PE": "Israel",
		"es-PR": "Israel",
		"es-PY": "Israel",
		"es-SV": "Israel",
		"es-US": "Israel",
		"es-UY": "Israel",
		"es-VE": "Israel",
		"en-US": "Israel",
		"fr-FR": "Israël",
		"fr-BE": "Israël",
		"fr-CA": "Israël",
		"fr-CH": "Israël",
		"fr-LU": "Israël",
		"fr-MC": "Israël",
		"it-IT": "Israele",
		"it-CH": "Israele",
		"it-SM": "Israele",
		"it-VA": "Israele",
		"de-DE": "Israel",
		"de-AT": "Israel",
		"de-CH": "Israel",
		"de-BE": "Israel",
		"de-LI": "Israel",
		"de-LU": "Israel"
	},
	"callingCode": "972",
	"phoneMasks": [
		{
			"mask": "####-###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"125"
			]
		},
		{
			"mask": "#-###-####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[2-489]"
			]
		},
		{
			"mask": "####-##-##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"121"
			]
		},
		{
			"mask": "##-###-####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[57]"
			]
		},
		{
			"mask": "#-###-###-###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1[7-9]"
			]
		},
		{
			"mask": "####-###-###",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"12"
			]
		},
		{
			"mask": "####-######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"159"
			]
		},
		{
			"mask": "### #### ####",
			"minLength": 11,
			"maxLength": 11
		},
		{
			"mask": "###-## ###-####",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"15"
			]
		}
	]
} satisfies Country;
