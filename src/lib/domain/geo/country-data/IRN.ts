import type { Country } from './types.js';

export const IRN = {
	"code": "IRN",
	"labels": {
		"pt-BR": "Irã",
		"pt-PT": "Irão",
		"es-ES": "Irán",
		"es-419": "Irán",
		"es-AR": "Irán",
		"es-BO": "Irán",
		"es-BR": "Irán",
		"es-BZ": "Irán",
		"es-CL": "Irán",
		"es-CO": "Irán",
		"es-CR": "Irán",
		"es-CU": "Irán",
		"es-DO": "Irán",
		"es-EC": "Irán",
		"es-GT": "Irán",
		"es-HN": "Irán",
		"es-MX": "Irán",
		"es-NI": "Irán",
		"es-PA": "Irán",
		"es-PE": "Irán",
		"es-PR": "Irán",
		"es-PY": "Irán",
		"es-SV": "Irán",
		"es-US": "Irán",
		"es-UY": "Irán",
		"es-VE": "Irán",
		"en-US": "Iran",
		"fr-FR": "Iran",
		"fr-BE": "Iran",
		"fr-CA": "Iran",
		"fr-CH": "Iran",
		"fr-LU": "Iran",
		"fr-MC": "Iran",
		"it-IT": "Iran",
		"it-CH": "Iran",
		"it-SM": "Iran",
		"it-VA": "Iran",
		"de-DE": "Iran",
		"de-AT": "Iran",
		"de-CH": "Iran",
		"de-BE": "Iran",
		"de-LI": "Iran",
		"de-LU": "Iran"
	},
	"callingCode": "98",
	"phoneMasks": [
		{
			"mask": "####",
			"minLength": 4,
			"maxLength": 4
		},
		{
			"mask": "#####",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"96"
			]
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6
		},
		{
			"mask": "## #####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"(?:1[137]|2[13-68]|3[1458]|4[145]|5[1468]|6[16]|7[1467]|8[13467])[12689]"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[1-8]"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"9"
			]
		}
	]
} satisfies Country;
