import type { Country } from './types.js';

export const PRY = {
	"code": "PRY",
	"labels": {
		"pt-BR": "Paraguai",
		"pt-PT": "Paraguai",
		"gn-PY": "Paraguái",
		"es-ES": "Paraguay",
		"es-419": "Paraguay",
		"es-AR": "Paraguay",
		"es-BO": "Paraguay",
		"es-BR": "Paraguay",
		"es-BZ": "Paraguay",
		"es-CL": "Paraguay",
		"es-CO": "Paraguay",
		"es-CR": "Paraguay",
		"es-CU": "Paraguay",
		"es-DO": "Paraguay",
		"es-EC": "Paraguay",
		"es-GT": "Paraguay",
		"es-HN": "Paraguay",
		"es-MX": "Paraguay",
		"es-NI": "Paraguay",
		"es-PA": "Paraguay",
		"es-PE": "Paraguay",
		"es-PR": "Paraguay",
		"es-PY": "Paraguay",
		"es-SV": "Paraguay",
		"es-US": "Paraguay",
		"es-UY": "Paraguay",
		"es-VE": "Paraguay",
		"en-US": "Paraguay",
		"fr-FR": "Paraguay",
		"fr-BE": "Paraguay",
		"fr-CA": "Paraguay",
		"fr-CH": "Paraguay",
		"fr-LU": "Paraguay",
		"fr-MC": "Paraguay",
		"it-IT": "Paraguay",
		"it-CH": "Paraguay",
		"it-SM": "Paraguay",
		"it-VA": "Paraguay",
		"de-DE": "Paraguay",
		"de-AT": "Paraguay",
		"de-CH": "Paraguay",
		"de-BE": "Paraguay",
		"de-LI": "Paraguay",
		"de-LU": "Paraguay"
	},
	"callingCode": "595",
	"phoneMasks": [
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
				"[26]1|3[289]|4[1246-8]|7[1-3]|8[1-36]"
			]
		},
		{
			"mask": "### #####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"2[279]|3[13-5]|4[359]|5|6(?:[34]|7[1-46-8])|7[46-8]|85"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"2[14-68]|3[26-9]|4[1246-8]|6(?:1|75)|7[1-35]|8[1-36]"
			]
		},
		{
			"mask": "## ### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"87"
			]
		},
		{
			"mask": "### ### ###",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-8]"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"[2-9]0"
			]
		},
		{
			"mask": "### ######",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"9(?:[5-79]|8[1-7])"
			]
		},
		{
			"mask": "### ### ####",
			"minLength": 10,
			"maxLength": 10
		},
		{
			"mask": "#### ### ####",
			"minLength": 11,
			"maxLength": 11,
			"leadingDigits": [
				"9"
			]
		}
	]
} satisfies Country;
