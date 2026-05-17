import type { Country } from './types.js';

export const PAK = {
	"code": "PAK",
	"labels": {
		"pt-BR": "Paquistão",
		"pt-PT": "Paquistão",
		"es-ES": "Pakistán",
		"es-419": "Pakistán",
		"es-AR": "Pakistán",
		"es-BO": "Pakistán",
		"es-BR": "Pakistán",
		"es-BZ": "Pakistán",
		"es-CL": "Pakistán",
		"es-CO": "Pakistán",
		"es-CR": "Pakistán",
		"es-CU": "Pakistán",
		"es-DO": "Pakistán",
		"es-EC": "Pakistán",
		"es-GT": "Pakistán",
		"es-HN": "Pakistán",
		"es-MX": "Pakistán",
		"es-NI": "Pakistán",
		"es-PA": "Pakistán",
		"es-PE": "Pakistán",
		"es-PR": "Pakistán",
		"es-PY": "Pakistán",
		"es-SV": "Pakistán",
		"es-US": "Pakistán",
		"es-UY": "Pakistán",
		"es-VE": "Pakistán",
		"en-US": "Pakistan",
		"fr-FR": "Pakistan",
		"fr-BE": "Pakistan",
		"fr-CA": "Pakistan",
		"fr-CH": "Pakistan",
		"fr-LU": "Pakistan",
		"fr-MC": "Pakistan",
		"it-IT": "Pakistan",
		"it-CH": "Pakistan",
		"it-SM": "Pakistan",
		"it-VA": "Pakistan",
		"de-DE": "Pakistan",
		"de-AT": "Pakistan",
		"de-CH": "Pakistan",
		"de-BE": "Pakistan",
		"de-LI": "Pakistan",
		"de-LU": "Pakistan"
	},
	"callingCode": "92",
	"phoneMasks": [
		{
			"mask": "####-####",
			"minLength": 8,
			"maxLength": 8
		},
		{
			"mask": "#### #####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "## ########",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"(?:2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8])",
				"9(?:2[3-8]|98)|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:22|3[27-9]|4[2-6]|6[3569]|9[25-7]))[2-9]"
			]
		},
		{
			"mask": "### #######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"3"
			]
		},
		{
			"mask": "##### #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"58"
			]
		},
		{
			"mask": "## ### ### ###",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91"
			]
		},
		{
			"mask": "### ### ### ###",
			"minLength": 12,
			"maxLength": 12,
			"leadingDigits": [
				"[24-9]"
			]
		},
		{
			"mask": "### ### #######",
			"minLength": 13,
			"maxLength": 13,
			"leadingDigits": [
				"[89]0"
			]
		}
	]
} satisfies Country;
