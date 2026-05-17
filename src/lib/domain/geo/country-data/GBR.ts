import type { Country } from './types.js';

export const GBR = {
	"code": "GBR",
	"labels": {
		"pt-BR": "Reino Unido",
		"pt-PT": "Reino Unido",
		"es-ES": "Reino Unido",
		"es-419": "Reino Unido",
		"es-AR": "Reino Unido",
		"es-BO": "Reino Unido",
		"es-BR": "Reino Unido",
		"es-BZ": "Reino Unido",
		"es-CL": "Reino Unido",
		"es-CO": "Reino Unido",
		"es-CR": "Reino Unido",
		"es-CU": "Reino Unido",
		"es-DO": "Reino Unido",
		"es-EC": "Reino Unido",
		"es-GT": "Reino Unido",
		"es-HN": "Reino Unido",
		"es-MX": "Reino Unido",
		"es-NI": "Reino Unido",
		"es-PA": "Reino Unido",
		"es-PE": "Reino Unido",
		"es-PR": "Reino Unido",
		"es-PY": "Reino Unido",
		"es-SV": "Reino Unido",
		"es-US": "Reino Unido",
		"es-UY": "Reino Unido",
		"es-VE": "Reino Unido",
		"en-US": "United Kingdom",
		"fr-FR": "Royaume-Uni",
		"fr-BE": "Royaume-Uni",
		"fr-CA": "Royaume-Uni",
		"fr-CH": "Royaume-Uni",
		"fr-LU": "Royaume-Uni",
		"fr-MC": "Royaume-Uni",
		"it-IT": "Regno Unito",
		"it-CH": "Regno Unito",
		"it-SM": "Regno Unito",
		"it-VA": "Regno Unito",
		"de-DE": "Vereinigtes Königreich",
		"de-AT": "Vereinigtes Königreich",
		"de-CH": "Vereinigtes Königreich",
		"de-BE": "Vereinigtes Königreich",
		"de-LI": "Vereinigtes Königreich",
		"de-LU": "Vereinigtes Königreich"
	},
	"callingCode": "44",
	"phoneMasks": [
		{
			"mask": "### ## ##",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"845",
				"8454",
				"84546",
				"845464"
			]
		},
		{
			"mask": "### ####",
			"minLength": 7,
			"maxLength": 7,
			"leadingDigits": [
				"800",
				"8001",
				"80011",
				"800111",
				"8001111"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"800"
			]
		},
		{
			"mask": "## #### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[25]|7(?:0|6[02-9])",
				"[25]|7(?:0|6(?:[03-9]|2[356]))"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"[1389]"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1(?:[2-69][02-9]|[78])"
			]
		},
		{
			"mask": "#### ######",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"7"
			]
		},
		{
			"mask": "##### #####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1(?:38|5[23]|69|76|94)",
				"1(?:(?:38|69)7|5(?:24|39)|768|946)",
				"1(?:3873|5(?:242|39[4-6])|(?:697|768)[347]|9467)"
			]
		}
	]
} satisfies Country;
