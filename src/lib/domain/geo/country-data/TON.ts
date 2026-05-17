import type { Country } from './types.js';

export const TON = {
	"code": "TON",
	"labels": {
		"pt-BR": "Tonga",
		"pt-PT": "Tonga",
		"es-ES": "Tonga",
		"es-419": "Tonga",
		"es-AR": "Tonga",
		"es-BO": "Tonga",
		"es-BR": "Tonga",
		"es-BZ": "Tonga",
		"es-CL": "Tonga",
		"es-CO": "Tonga",
		"es-CR": "Tonga",
		"es-CU": "Tonga",
		"es-DO": "Tonga",
		"es-EC": "Tonga",
		"es-GT": "Tonga",
		"es-HN": "Tonga",
		"es-MX": "Tonga",
		"es-NI": "Tonga",
		"es-PA": "Tonga",
		"es-PE": "Tonga",
		"es-PR": "Tonga",
		"es-PY": "Tonga",
		"es-SV": "Tonga",
		"es-US": "Tonga",
		"es-UY": "Tonga",
		"es-VE": "Tonga",
		"en-US": "Tonga",
		"fr-FR": "Tonga",
		"fr-BE": "Tonga",
		"fr-CA": "Tonga",
		"fr-CH": "Tonga",
		"fr-LU": "Tonga",
		"fr-MC": "Tonga",
		"it-IT": "Tonga",
		"it-CH": "Tonga",
		"it-SM": "Tonga",
		"it-VA": "Tonga",
		"de-DE": "Tonga",
		"de-AT": "Tonga",
		"de-CH": "Tonga",
		"de-BE": "Tonga",
		"de-LI": "Tonga",
		"de-LU": "Tonga"
	},
	"callingCode": "676",
	"phoneMasks": [
		{
			"mask": "##-###",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"[2-4]|50|6[09]|7[0-24-69]|8[05]"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"[5-9]"
			]
		},
		{
			"mask": "#### ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"0"
			]
		}
	]
} satisfies Country;
