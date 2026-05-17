import type { Country } from './types.js';

export const MYS = {
	"code": "MYS",
	"labels": {
		"pt-BR": "Malásia",
		"pt-PT": "Malásia",
		"es-ES": "Malasia",
		"es-419": "Malasia",
		"es-AR": "Malasia",
		"es-BO": "Malasia",
		"es-BR": "Malasia",
		"es-BZ": "Malasia",
		"es-CL": "Malasia",
		"es-CO": "Malasia",
		"es-CR": "Malasia",
		"es-CU": "Malasia",
		"es-DO": "Malasia",
		"es-EC": "Malasia",
		"es-GT": "Malasia",
		"es-HN": "Malasia",
		"es-MX": "Malasia",
		"es-NI": "Malasia",
		"es-PA": "Malasia",
		"es-PE": "Malasia",
		"es-PR": "Malasia",
		"es-PY": "Malasia",
		"es-SV": "Malasia",
		"es-US": "Malasia",
		"es-UY": "Malasia",
		"es-VE": "Malasia",
		"en-US": "Malaysia",
		"fr-FR": "Malaisie",
		"fr-BE": "Malaisie",
		"fr-CA": "Malaisie",
		"fr-CH": "Malaisie",
		"fr-LU": "Malaisie",
		"fr-MC": "Malaisie",
		"it-IT": "Malaysia",
		"it-CH": "Malaysia",
		"it-SM": "Malaysia",
		"it-VA": "Malaysia",
		"de-DE": "Malaysia",
		"de-AT": "Malaysia",
		"de-CH": "Malaysia",
		"de-BE": "Malaysia",
		"de-LI": "Malaysia",
		"de-LU": "Malaysia"
	},
	"callingCode": "60",
	"phoneMasks": [
		{
			"mask": "#-### ####",
			"minLength": 8,
			"maxLength": 8,
			"leadingDigits": [
				"[4-79]"
			]
		},
		{
			"mask": "#-#### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"3"
			]
		},
		{
			"mask": "##-### ####",
			"minLength": 9,
			"maxLength": 9,
			"leadingDigits": [
				"1(?:[02469]|[378][1-9]|53)|8",
				"1(?:[02469]|[37][1-9]|53|8(?:[1-46-9]|5[7-9]))|8"
			]
		},
		{
			"mask": "#-###-##-####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1(?:[367]|80)"
			]
		},
		{
			"mask": "##-#### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"1"
			]
		},
		{
			"mask": "###-### ####",
			"minLength": 10,
			"maxLength": 10,
			"leadingDigits": [
				"15"
			]
		}
	]
} satisfies Country;
