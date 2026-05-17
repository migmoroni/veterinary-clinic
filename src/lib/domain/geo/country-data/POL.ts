import type { Country } from './types.js';

export const POL = {
	"code": "POL",
	"labels": {
		"pt-BR": "Polônia",
		"pt-PT": "Polónia",
		"es-ES": "Polonia",
		"es-419": "Polonia",
		"es-AR": "Polonia",
		"es-BO": "Polonia",
		"es-BR": "Polonia",
		"es-BZ": "Polonia",
		"es-CL": "Polonia",
		"es-CO": "Polonia",
		"es-CR": "Polonia",
		"es-CU": "Polonia",
		"es-DO": "Polonia",
		"es-EC": "Polonia",
		"es-GT": "Polonia",
		"es-HN": "Polonia",
		"es-MX": "Polonia",
		"es-NI": "Polonia",
		"es-PA": "Polonia",
		"es-PE": "Polonia",
		"es-PR": "Polonia",
		"es-PY": "Polonia",
		"es-SV": "Polonia",
		"es-US": "Polonia",
		"es-UY": "Polonia",
		"es-VE": "Polonia",
		"en-US": "Poland",
		"fr-FR": "Pologne",
		"fr-BE": "Pologne",
		"fr-CA": "Pologne",
		"fr-CH": "Pologne",
		"fr-LU": "Pologne",
		"fr-MC": "Pologne",
		"it-IT": "Polonia",
		"it-CH": "Polonia",
		"it-SM": "Polonia",
		"it-VA": "Polonia",
		"de-DE": "Polen",
		"de-AT": "Polen",
		"de-CH": "Polen",
		"de-BE": "Polen",
		"de-LI": "Polen",
		"de-LU": "Polen"
	},
	"callingCode": "48",
	"phoneMasks": [
		{
			"mask": "#####",
			"minLength": 5,
			"maxLength": 5,
			"leadingDigits": [
				"19"
			]
		},
		{
			"mask": "### ###",
			"minLength": 6,
			"maxLength": 6,
			"leadingDigits": [
				"11|20|64"
			]
		},
		{
			"mask": "## ## ###",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])1",
				"(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])19"
			]
		},
		{
			"mask": "### ## ###",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"64"
			]
		},
		{
			"mask": "## ### ## ##",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1[2-8]|[2-7]|8[1-79]|9[145]"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"21|39|45|5[0137]|6[0469]|7[02389]|8(?:0[14]|8)"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"8"
			]
		}
	]
} satisfies Country;
