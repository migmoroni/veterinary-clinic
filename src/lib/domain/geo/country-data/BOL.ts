import type { Country } from './types.js';

export const BOL = {
	"code": "BOL",
	"labels": {
		"pt-BR": "Bolívia",
		"pt-PT": "Bolívia",
		"gn-PY": "Volívia",
		"es-ES": "Bolivia",
		"es-419": "Bolivia",
		"es-AR": "Bolivia",
		"es-BO": "Bolivia",
		"es-BR": "Bolivia",
		"es-BZ": "Bolivia",
		"es-CL": "Bolivia",
		"es-CO": "Bolivia",
		"es-CR": "Bolivia",
		"es-CU": "Bolivia",
		"es-DO": "Bolivia",
		"es-EC": "Bolivia",
		"es-GT": "Bolivia",
		"es-HN": "Bolivia",
		"es-MX": "Bolivia",
		"es-NI": "Bolivia",
		"es-PA": "Bolivia",
		"es-PE": "Bolivia",
		"es-PR": "Bolivia",
		"es-PY": "Bolivia",
		"es-SV": "Bolivia",
		"es-US": "Bolivia",
		"es-UY": "Bolivia",
		"es-VE": "Bolivia",
		"en-US": "Bolivia",
		"fr-FR": "Bolivie",
		"fr-BE": "Bolivie",
		"fr-CA": "Bolivie",
		"fr-CH": "Bolivie",
		"fr-LU": "Bolivie",
		"fr-MC": "Bolivie",
		"it-IT": "Bolivia",
		"it-CH": "Bolivia",
		"it-SM": "Bolivia",
		"it-VA": "Bolivia",
		"de-DE": "Bolivien",
		"de-AT": "Bolivien",
		"de-CH": "Bolivien",
		"de-BE": "Bolivien",
		"de-LI": "Bolivien",
		"de-LU": "Bolivien"
	},
	"callingCode": "591",
	"phoneMasks": [
		{
			"mask": "# #######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[235]|4[46]"
			]
		},
		{
			"mask": "########",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[67]"
			]
		},
		{
			"mask": "### ## ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
