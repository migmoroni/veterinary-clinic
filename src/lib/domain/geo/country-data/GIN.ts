import type { Country } from './types.js';

export const GIN = {
	"code": "GIN",
	"labels": {
		"pt-BR": "Guiné",
		"pt-PT": "Guiné",
		"es-ES": "Guinea",
		"es-419": "Guinea",
		"es-AR": "Guinea",
		"es-BO": "Guinea",
		"es-BR": "Guinea",
		"es-BZ": "Guinea",
		"es-CL": "Guinea",
		"es-CO": "Guinea",
		"es-CR": "Guinea",
		"es-CU": "Guinea",
		"es-DO": "Guinea",
		"es-EC": "Guinea",
		"es-GT": "Guinea",
		"es-HN": "Guinea",
		"es-MX": "Guinea",
		"es-NI": "Guinea",
		"es-PA": "Guinea",
		"es-PE": "Guinea",
		"es-PR": "Guinea",
		"es-PY": "Guinea",
		"es-SV": "Guinea",
		"es-US": "Guinea",
		"es-UY": "Guinea",
		"es-VE": "Guinea",
		"en-US": "Guinea",
		"fr-FR": "Guinée",
		"fr-BE": "Guinée",
		"fr-CA": "Guinée",
		"fr-CH": "Guinée",
		"fr-LU": "Guinée",
		"fr-MC": "Guinée",
		"it-IT": "Guinea",
		"it-CH": "Guinea",
		"it-SM": "Guinea",
		"it-VA": "Guinea",
		"de-DE": "Guinea",
		"de-AT": "Guinea",
		"de-CH": "Guinea",
		"de-BE": "Guinea",
		"de-LI": "Guinea",
		"de-LU": "Guinea"
	},
	"callingCode": "224",
	"phoneMasks": [
		{
			"mask": "## ## ## ##",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"3"
			]
		},
		{
			"mask": "### ## ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[67]"
			]
		}
	]
} satisfies Country;
