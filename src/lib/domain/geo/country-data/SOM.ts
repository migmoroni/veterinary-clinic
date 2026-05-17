import type { Country } from './types.js';

export const SOM = {
	"code": "SOM",
	"labels": {
		"pt-BR": "Somália",
		"pt-PT": "Somália",
		"es-ES": "Somalia",
		"es-419": "Somalia",
		"es-AR": "Somalia",
		"es-BO": "Somalia",
		"es-BR": "Somalia",
		"es-BZ": "Somalia",
		"es-CL": "Somalia",
		"es-CO": "Somalia",
		"es-CR": "Somalia",
		"es-CU": "Somalia",
		"es-DO": "Somalia",
		"es-EC": "Somalia",
		"es-GT": "Somalia",
		"es-HN": "Somalia",
		"es-MX": "Somalia",
		"es-NI": "Somalia",
		"es-PA": "Somalia",
		"es-PE": "Somalia",
		"es-PR": "Somalia",
		"es-PY": "Somalia",
		"es-SV": "Somalia",
		"es-US": "Somalia",
		"es-UY": "Somalia",
		"es-VE": "Somalia",
		"en-US": "Somalia",
		"fr-FR": "Somalie",
		"fr-BE": "Somalie",
		"fr-CA": "Somalie",
		"fr-CH": "Somalie",
		"fr-LU": "Somalie",
		"fr-MC": "Somalie",
		"it-IT": "Somalia",
		"it-CH": "Somalia",
		"it-SM": "Somalia",
		"it-VA": "Somalia",
		"de-DE": "Somalia",
		"de-AT": "Somalia",
		"de-CH": "Somalia",
		"de-BE": "Somalia",
		"de-LI": "Somalia",
		"de-LU": "Somalia"
	},
	"callingCode": "252",
	"phoneMasks": [
		{
			"mask": "## ####",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"8[125]"
			]
		},
		{
			"mask": "######",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"[134]"
			]
		},
		{
			"mask": "# ######",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[15]|2[0-79]|3[0-46-8]|4[0-7]"
			]
		},
		{
			"mask": "# #######",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"(?:2|90)4|[67]"
			]
		},
		{
			"mask": "## #######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1|28|6[0-35-9]|7[67]|9[2-9]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[348]|64|79|90"
			]
		}
	]
} satisfies Country;
