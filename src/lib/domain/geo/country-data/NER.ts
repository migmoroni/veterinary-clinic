import type { Country } from './types.js';

export const NER = {
	"code": "NER",
	"labels": {
		"pt-BR": "Níger",
		"pt-PT": "Níger",
		"es-ES": "Níger",
		"es-419": "Níger",
		"es-AR": "Níger",
		"es-BO": "Níger",
		"es-BR": "Níger",
		"es-BZ": "Níger",
		"es-CL": "Níger",
		"es-CO": "Níger",
		"es-CR": "Níger",
		"es-CU": "Níger",
		"es-DO": "Níger",
		"es-EC": "Níger",
		"es-GT": "Níger",
		"es-HN": "Níger",
		"es-MX": "Níger",
		"es-NI": "Níger",
		"es-PA": "Níger",
		"es-PE": "Níger",
		"es-PR": "Níger",
		"es-PY": "Níger",
		"es-SV": "Níger",
		"es-US": "Níger",
		"es-UY": "Níger",
		"es-VE": "Níger",
		"en-US": "Niger",
		"fr-FR": "Niger",
		"fr-BE": "Niger",
		"fr-CA": "Niger",
		"fr-CH": "Niger",
		"fr-LU": "Niger",
		"fr-MC": "Niger",
		"it-IT": "Niger",
		"it-CH": "Niger",
		"it-SM": "Niger",
		"it-VA": "Niger",
		"de-DE": "Niger",
		"de-AT": "Niger",
		"de-CH": "Niger",
		"de-BE": "Niger",
		"de-LI": "Niger",
		"de-LU": "Niger"
	},
	"callingCode": "227",
	"phoneMasks": [
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[089]|2[013]|7[0467]"
			]
		},
		{
			"mask": "## ### ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"08"
			]
		}
	]
} satisfies Country;
